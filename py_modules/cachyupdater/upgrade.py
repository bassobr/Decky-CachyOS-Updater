"""The system upgrade as a detached transient systemd unit.

`pacman -Syu` must survive anything the plugin process goes through
(plugin_loader restarts, Steam restarts, the QAM being closed), so it is not
a child of this process: systemd-run starts it as its own service with a
clean environment, its output appended to a root-owned log file, and a
sleep/shutdown inhibitor held for the duration of the transaction. The
wrapper leaves pacman's exit status in a file under /run; the plugin only
ever observes (log tail, unit state, status file) and never touches the
running transaction.
"""

import asyncio
import os
import time

from . import constants as C
from . import settings as settings_store
from . import state as state_store
from .deckyshim import decky
from .parsing import parse_upgrade_log, reboot_recommended

UPGRADE_EVENT = "cachyos_updater_upgrade"

# Fixed script text: every variable it needs arrives via the unit's
# environment (--setenv), never via interpolation into shell code, and it is
# passed to bash as an argument so there is no on-disk script an unprivileged
# user could pre-create or swap under root.
_UPGRADE_SCRIPT = r"""
printf '== CachyOS Updater: system upgrade started %s\n' "$(date -Is)"
if [ -x /usr/bin/systemd-inhibit ]; then
    /usr/bin/systemd-inhibit --what=sleep:shutdown:idle --mode=block \
        --who="CachyOS Updater" --why="System update in progress" \
        /usr/bin/pacman -Syu --noconfirm --noprogressbar
else
    /usr/bin/pacman -Syu --noconfirm --noprogressbar
fi
rc=$?
printf '== CachyOS Updater: pacman exited with %s at %s\n' "$rc" "$(date -Is)"
printf '%s\n' "$rc" > "$CACHYUPD_STATUS_FILE"
exit "$rc"
"""


class UpgradeMixin:
    def _ensure_upgrade_state(self):
        if not hasattr(self, "_upgrade_lock"):
            self._upgrade_lock = asyncio.Lock()

    def _unit_name(self) -> str:
        return C.UPGRADE_UNIT + ".service"

    def _unit_is_active(self) -> bool:
        r = self._run_cmd([C.SYSTEMCTL, "is-active", self._unit_name()], timeout=10)
        return r["stdout"].strip() in ("active", "activating", "deactivating", "reloading")

    def _unit_props(self) -> dict:
        r = self._run_cmd(
            [C.SYSTEMCTL, "show", "-p", "LoadState,ActiveState,Result,ExecMainStatus", self._unit_name()],
            timeout=10,
        )
        props = {}
        for line in r["stdout"].splitlines():
            key, _, value = line.partition("=")
            props[key.strip()] = value.strip()
        return props

    def _read_status_file(self) -> int | None:
        try:
            with open(C.UPGRADE_STATUS_FILE, "r") as f:
                return int(f.read().strip())
        except Exception:
            return None

    def _read_log_tail(self, path: str, max_bytes: int = C.UPGRADE_LOG_TAIL_BYTES) -> str:
        if not path:
            return ""
        try:
            size = os.path.getsize(path)
            with open(path, "rb") as f:
                if size > max_bytes:
                    f.seek(size - max_bytes)
                return f.read().decode("utf-8", "replace")
        except Exception:
            return ""

    def _rotate_upgrade_logs(self, keep: int = C.UPGRADE_LOG_KEEP):
        try:
            files = [
                os.path.join(C.LOG_DIR, f)
                for f in os.listdir(C.LOG_DIR)
                if f.startswith("upgrade-") and f.endswith(".log")
            ]
            files.sort(key=os.path.getmtime, reverse=True)
            for path in files[keep:]:
                try:
                    os.remove(path)
                except OSError:
                    pass
        except OSError:
            pass

    def _launch_upgrade_unit(self) -> dict:
        """Blocking worker: prepare dirs/log, start the transient unit."""
        state_store.ensure_dir(C.STATE_DIR, 0o755)
        state_store.ensure_dir(C.RUN_DIR, 0o700)
        state_store.ensure_dir(C.LOG_DIR, 0o755)
        try:
            os.remove(C.UPGRADE_STATUS_FILE)
        except FileNotFoundError:
            pass
        # A previous failed run stays loaded as "failed" until reset; a
        # lingering unit name would make systemd-run refuse to start.
        self._run_cmd([C.SYSTEMCTL, "reset-failed", self._unit_name()], timeout=10)
        if self._unit_is_active():
            return {
                "success": False,
                "error": "upgrade_running",
                "message": "A system upgrade is already running.",
            }
        self._rotate_upgrade_logs(keep=C.UPGRADE_LOG_KEEP - 1)
        log_path = os.path.join(C.LOG_DIR, time.strftime("upgrade-%Y%m%d-%H%M%S.log"))
        # Create the log root-owned first so systemd's append: never follows
        # anything pre-existing.
        fd = os.open(log_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644)
        os.close(fd)
        cmd = [
            C.SYSTEMD_RUN,
            f"--unit={C.UPGRADE_UNIT}",
            "--description=CachyOS Updater: system upgrade",
            "--quiet",
            "--no-ask-password",
            "--property=Type=exec",
            f"--property=StandardOutput=append:{log_path}",
            "--property=StandardError=inherit",
            "--setenv=LC_ALL=C",
            "--setenv=LANG=C",
            f"--setenv=CACHYUPD_STATUS_FILE={C.UPGRADE_STATUS_FILE}",
            C.BASH,
            "-c",
            _UPGRADE_SCRIPT,
        ]
        r = self._run_cmd(cmd, timeout=30)
        if not r["success"]:
            try:
                os.remove(log_path)
            except OSError:
                pass
            return {
                "success": False,
                "error": "systemd_run_failed",
                "message": "Couldn't start the upgrade service.",
                "detail": (r["stderr"] or r["stdout"])[-300:],
            }
        now = time.time()
        state_store.update_upgrade_state(
            state="running",
            started_at=now,
            finished_at=0,
            exit_code=None,
            log_path=log_path,
            upgraded=[],
            pacnew=0,
            errors=[],
            reboot_required=False,
            reboot_recommended=False,
            message="",
            acknowledged=False,
        )
        decky.logger.info(f"System upgrade started as {self._unit_name()} (log: {log_path})")
        return {"success": True, "message": "System upgrade started.", "log_path": log_path}

    async def start_upgrade(self) -> dict:
        """Start `pacman -Syu --noconfirm` detached. Refuses while a check,
        another upgrade, or a foreign pacman is running."""
        try:
            self._ensure_upgrade_state()
            if self._upgrade_lock.locked():
                return {"success": False, "error": "busy", "message": "Please wait a moment and try again."}
            async with self._upgrade_lock:
                current = await self._refresh_upgrade_state()
                if current.get("state") == "running":
                    return {
                        "success": False,
                        "error": "upgrade_running",
                        "message": "A system upgrade is already running.",
                    }
                if getattr(self, "_check_in_progress", False):
                    return {
                        "success": False,
                        "error": "check_running",
                        "message": "An update check is running - try again in a moment.",
                    }
                if not os.path.exists(C.PACMAN):
                    return {
                        "success": False,
                        "error": "no_pacman",
                        "message": "pacman not found - this plugin needs CachyOS/Arch.",
                    }
                if self._pacman_locked():
                    return {
                        "success": False,
                        "error": "pacman_locked",
                        "message": "Another package manager is running (pacman database is locked).",
                    }
                return await asyncio.to_thread(self._launch_upgrade_unit)
        except Exception as e:
            decky.logger.error(f"start_upgrade error: {e}")
            return self._unexpected_response(e)

    async def _refresh_upgrade_state(self) -> dict:
        """Observe a running upgrade; finalize it exactly once when the unit
        has ended. Called from status polls and the scheduler so the result
        (and its toast) lands even with the panel closed."""
        state = state_store.load_state()
        up = dict(state.get("upgrade") or {})
        if up.get("state") != "running":
            return up
        progress = parse_upgrade_log(self._read_log_tail(up.get("log_path", "")))
        if await asyncio.to_thread(self._unit_is_active):
            up["progress"] = progress
            return up

        # Finished. Exit status: the wrapper's status file, else the marker
        # line it wrote into the log (survives a reboot), else systemd.
        code = self._read_status_file()
        if code is None:
            code = progress.get("exit_code")
        if code is None:
            props = await asyncio.to_thread(self._unit_props)
            if props.get("ActiveState") == "failed" or props.get("Result", "success") not in ("", "success"):
                try:
                    code = int(props.get("ExecMainStatus") or 1)
                except ValueError:
                    code = 1
                if code == 0:
                    code = 1

        settings = settings_store.load_settings()
        upgraded = progress.get("upgraded", [])
        reboot_required = not self._running_kernel_modules_present()
        recommended = reboot_required or reboot_recommended(upgraded, settings.get("custom_patterns", ""))
        errors = progress.get("errors", [])
        if code == 0:
            new_state = "succeeded"
            if progress.get("nothing_to_do"):
                message = "The system was already up to date."
            else:
                message = f"{len(upgraded)} package{'s' if len(upgraded) != 1 else ''} upgraded."
        elif code is None:
            new_state = "interrupted"
            message = "The upgrade did not finish (the system restarted or the service was killed)."
        else:
            new_state = "failed"
            message = errors[-1] if errors else f"pacman exited with status {code}."
        fields = dict(
            state=new_state,
            finished_at=time.time(),
            exit_code=code,
            upgraded=upgraded,
            pacnew=progress.get("pacnew", 0),
            errors=errors,
            reboot_required=reboot_required,
            reboot_recommended=recommended,
            message=message,
            acknowledged=False,
        )
        state_store.update_upgrade_state(**fields)
        decky.logger.info(
            f"System upgrade finished: {new_state} (exit={code}, upgraded={len(upgraded)}, "
            f"pacnew={fields['pacnew']}, reboot_required={reboot_required}, recommended={recommended})"
        )
        try:
            await decky.emit(UPGRADE_EVENT, {
                "state": new_state,
                "message": message,
                "upgraded_count": len(upgraded),
                "reboot_required": reboot_required,
                "reboot_recommended": recommended,
                "exit_code": code,
            })
        except Exception as e:
            decky.logger.error(f"emit {UPGRADE_EVENT} failed: {e}")
        # Refresh the pending list now that the transaction is over.
        try:
            asyncio.get_running_loop().create_task(self._run_check("post-upgrade", force=True))
        except Exception as e:
            decky.logger.error(f"post-upgrade check scheduling failed: {e}")
        return {**up, **fields}

    async def get_upgrade_status(self) -> dict:
        try:
            up = await self._refresh_upgrade_state()
            if "progress" not in up:
                up["progress"] = parse_upgrade_log(self._read_log_tail(up.get("log_path", "")))
            return {"success": True, "upgrade": up}
        except Exception as e:
            decky.logger.error(f"get_upgrade_status error: {e}")
            return self._unexpected_response(e)

    async def get_upgrade_log(self, max_lines: int = 200) -> dict:
        try:
            state = state_store.load_state()
            path = (state.get("upgrade") or {}).get("log_path", "")
            text = self._read_log_tail(path)
            lines = text.splitlines()[-int(max_lines):] if text else []
            return {"success": True, "path": path, "lines": lines}
        except Exception as e:
            decky.logger.error(f"get_upgrade_log error: {e}")
            return self._unexpected_response(e)

    async def dismiss_upgrade_result(self) -> dict:
        try:
            state = state_store.load_state()
            if (state.get("upgrade") or {}).get("state") == "running":
                return {"success": False, "message": "An upgrade is still running."}
            state_store.update_upgrade_state(acknowledged=True)
            return {"success": True}
        except Exception as e:
            decky.logger.error(f"dismiss_upgrade_result error: {e}")
            return self._unexpected_response(e)

    async def reboot_system(self) -> dict:
        """Reboot after a kernel/driver upgrade. Refused while pacman runs."""
        try:
            current = await self._refresh_upgrade_state()
            if current.get("state") == "running" or self._pacman_locked():
                return {"success": False, "message": "A package transaction is still running - wait for it to finish."}
            decky.logger.info("Reboot requested from the CachyOS Updater panel")
            r = await asyncio.to_thread(self._run_cmd, [C.SYSTEMCTL, "reboot"], 20)
            if not r["success"]:
                return {"success": False, "message": "Reboot failed.", "detail": r["stderr"][-200:]}
            return {"success": True, "message": "Rebooting..."}
        except Exception as e:
            decky.logger.error(f"reboot_system error: {e}")
            return self._unexpected_response(e)
