"""Plugin self-update: version check plus verified download and install.

Installs the CI-built release zip from GitHub Releases. SHA256SUMS must carry
a valid minisign signature from the key pinned in constants.MINISIGN_PUBKEY
before its hashes are trusted, then the zip is checked against SHA256SUMS.
The final copy + plugin_loader restart is handed to a detached bash reading
fixed script text from stdin, so the swap survives this process being killed
by the restart it triggers.
"""

import asyncio
import json
import os
import shutil
import subprocess
import tempfile

from . import constants as C
from .archives import safe_extract_zip, verify_sha256
from .deckyshim import decky
from .minisign import verify_file as minisign_verify_file
from .parsing import is_newer_version


class PluginUpdatesMixin:
    async def check_for_plugin_update(self) -> dict:
        """Compare the installed version against the latest GitHub release."""
        try:
            current = decky.DECKY_PLUGIN_VERSION
            if not C.UPDATE_REPO:
                return {"success": True, "current_version": current, "update_available": False,
                        "message": "Plugin updates disabled"}
            result = await asyncio.to_thread(
                self._run_cmd,
                [
                    C.CURL, "-sL", "--connect-timeout", "3", "--max-time", "10",
                    "-H", "Accept: application/vnd.github.v3+json",
                    f"https://api.github.com/repos/{C.UPDATE_REPO}/releases/latest",
                ],
                15,
            )
            if not result["success"] or not result["stdout"]:
                decky.logger.error(
                    f"Plugin update check: curl failed rc={result.get('returncode')} {result.get('stderr', '')[:200]}"
                )
                return {"success": False, "current_version": current, "update_available": False,
                        "message": "Couldn't reach GitHub"}
            data = json.loads(result["stdout"])
            latest = str(data.get("tag_name", "")).lstrip("v")
            if not latest:
                msg = data.get("message", "couldn't parse version")
                decky.logger.error(f"Plugin update check: no version - {msg}")
                return {"success": False, "current_version": current, "update_available": False,
                        "message": msg}
            update_available = is_newer_version(latest, current)
            decky.logger.info(
                f"Plugin update check: current={current}, latest={latest}, update={update_available}"
            )
            return {
                "success": True,
                "current_version": current,
                "latest_version": latest,
                "update_available": update_available,
                "release_url": data.get("html_url", ""),
            }
        except Exception as e:
            decky.logger.error(f"check_for_plugin_update error: {e}")
            return {"success": False, "current_version": decky.DECKY_PLUGIN_VERSION,
                    "update_available": False, "message": str(e)}

    def _download_file(self, url: str, dest: str, timeout: int = 60) -> dict:
        """Download url to dest with curl. -f makes HTTP errors fail the
        command instead of saving an error page."""
        return self._run_cmd(
            [C.CURL, "-fsSL", "--connect-timeout", "5", "--max-time", str(timeout), "-o", dest, url],
            timeout=timeout + 5,
        )

    # Fixed text: every variable arrives via the environment, never via
    # interpolation into shell code, and it reaches bash through stdin so
    # there is no on-disk script an unprivileged user could pre-create. It
    # only copies from the root-owned staging dir.
    # Stage into a sibling directory and swap, so a half-copied update can
    # never leave a broken plugin behind; Decky is only restarted when the
    # swap succeeded. rm -rf removes a planted symlink itself (never its
    # target) and mkdir without -p refuses anything that reappears.
    _UPDATE_HANDOFF_SCRIPT = """#!/bin/bash
sleep 1
new="$CACHYUPD_PLUGIN_DIR.new"
old="$CACHYUPD_PLUGIN_DIR.old"
rm -rf "$new" "$old"
ok=1
mkdir "$new" || ok=0
if [ "$ok" = "1" ]; then
    for f in plugin.json package.json main.py decky.pyi; do
        cp "$CACHYUPD_SRC/$f" "$new/" || ok=0
    done
    for f in LICENSE README.md; do
        cp "$CACHYUPD_SRC/$f" "$new/" 2>/dev/null || true
    done
    mkdir -p "$new/dist" "$new/py_modules" || ok=0
    cp "$CACHYUPD_SRC/dist/index.js" "$new/dist/" || ok=0
    cp "$CACHYUPD_SRC/dist/index.js.map" "$new/dist/" 2>/dev/null || true
    cp -r "$CACHYUPD_SRC/py_modules/." "$new/py_modules/" || ok=0
fi
if [ "$ok" = "1" ]; then
    mv "$CACHYUPD_PLUGIN_DIR" "$old" && mv "$new" "$CACHYUPD_PLUGIN_DIR" || ok=0
fi
if [ "$ok" = "1" ]; then
    rm -rf "$old" "$CACHYUPD_STAGE"
    logger -t cachyos-updater "Plugin updated to $CACHYUPD_LABEL, restarting plugin_loader"
    systemctl restart plugin_loader 2>/dev/null || true
else
    logger -t cachyos-updater "Plugin update to $CACHYUPD_LABEL failed while staging files; keeping the installed version"
    if [ ! -d "$CACHYUPD_PLUGIN_DIR" ] && [ -d "$old" ]; then
        mv "$old" "$CACHYUPD_PLUGIN_DIR"
    fi
    rm -rf "$new" "$CACHYUPD_STAGE"
fi
"""

    async def apply_plugin_update(self) -> dict:
        """Download, verify, and install the latest release, then restart
        Decky."""
        try:
            if not C.UPDATE_REPO:
                return {"success": False, "message": "Plugin updates are disabled."}
            if getattr(self, "_plugin_update_in_progress", False):
                return {"success": False, "message": "A plugin update is already in progress."}
            self._plugin_update_in_progress = True
            try:
                return await self._apply_plugin_update_inner()
            finally:
                self._plugin_update_in_progress = False
        except Exception as e:
            decky.logger.error(f"apply_plugin_update error: {e}")
            return self._unexpected_response(e)

    async def _apply_plugin_update_inner(self) -> dict:
        info = await self.check_for_plugin_update()
        if not info.get("update_available"):
            return {"success": False, "message": "No plugin update available."}
        latest = str(info.get("latest_version", ""))
        if not C.VERSION_RE.match(latest):
            return {"success": False, "message": f"Refusing update: unexpected version string {latest!r}"}

        # Root-owned staging with an unpredictable name (mkdtemp = 0700):
        # nothing under it can be pre-created by an unprivileged user.
        stage_root = tempfile.mkdtemp(prefix="cachyos-updater-selfupdate-")
        handed_off = False
        try:
            tag = f"v{latest}"
            zip_name = f"{C.ZIP_BASENAME}-{latest}.zip"
            base = f"https://github.com/{C.UPDATE_REPO}/releases/download/{tag}"
            zip_path = os.path.join(stage_root, zip_name)
            sums_path = os.path.join(stage_root, "SHA256SUMS")
            sig_path = sums_path + ".minisig"

            r = await asyncio.to_thread(self._download_file, f"{base}/{zip_name}", zip_path)
            if not r["success"]:
                return {"success": False, "message": f"Couldn't download release asset {zip_name}.",
                        "detail": r.get("stderr", "")[:200]}
            r = await asyncio.to_thread(self._download_file, f"{base}/SHA256SUMS", sums_path, 15)
            if not r["success"]:
                return {"success": False, "message": "Couldn't download SHA256SUMS for verification.",
                        "detail": r.get("stderr", "")[:200]}
            r = await asyncio.to_thread(self._download_file, f"{base}/SHA256SUMS.minisig", sig_path, 15)
            if not r["success"]:
                return {"success": False,
                        "message": "This release is not signed (SHA256SUMS.minisig missing) - update aborted.",
                        "detail": r.get("stderr", "")[:200]}

            # Signature first: SHA256SUMS must carry a valid signature from
            # the pinned release key before its hashes are trusted.
            with open(sig_path, "r") as f:
                sig_text = f.read()
            ok, detail = await asyncio.to_thread(minisign_verify_file, sums_path, sig_text, C.MINISIGN_PUBKEY)
            if not ok:
                decky.logger.error(f"apply_plugin_update: signature verification failed: {detail}")
                return {"success": False, "message": "Release signature verification failed - update aborted.",
                        "detail": detail}
            with open(sums_path, "r") as f:
                sums_text = f.read()
            ok, detail = verify_sha256(sums_text, zip_name, zip_path)
            if not ok:
                decky.logger.error(f"apply_plugin_update: checksum verification failed: {detail}")
                return {"success": False, "message": "Checksum verification failed - update aborted.",
                        "detail": detail}

            extract_dir = os.path.join(stage_root, "src")
            await asyncio.to_thread(safe_extract_zip, zip_path, extract_dir)
            src = os.path.join(extract_dir, C.PLUGIN_DIR_NAME)
            if not os.path.isfile(os.path.join(src, "plugin.json")):
                return {"success": False, "message": "Update package has an unexpected layout - aborted."}

            env = {k: v for k, v in os.environ.items() if k != "LD_LIBRARY_PATH"}
            env.update({
                "CACHYUPD_SRC": src,
                "CACHYUPD_PLUGIN_DIR": decky.DECKY_PLUGIN_DIR,
                "CACHYUPD_STAGE": stage_root,
                "CACHYUPD_LABEL": tag,
            })
            proc = subprocess.Popen(
                [C.BASH, "-s"],
                stdin=subprocess.PIPE,
                start_new_session=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=env,
            )
            proc.stdin.write(self._UPDATE_HANDOFF_SCRIPT.encode())
            proc.stdin.close()
            handed_off = True
            decky.logger.info(f"Plugin update to {tag} initiated (verified: signature+checksum)")
            return {"success": True, "message": f"Updating plugin to {tag}..."}
        finally:
            if not handed_off:
                shutil.rmtree(stage_root, ignore_errors=True)
