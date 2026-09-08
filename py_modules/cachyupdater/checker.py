"""The update check.

Works like pacman-contrib's `checkupdates`: sync the package databases into a
private, root-owned copy and diff that copy against the installed packages.
The system's own sync databases are never touched, so a later `pacman -S foo`
from Desktop Mode can never turn into an accidental partial upgrade, and the
check needs no pacman lock (it is skipped while another package manager holds
one only because the local database may be mid-transaction).
"""

import asyncio
import os
import shutil
import time

from . import constants as C
from . import settings as settings_store
from . import state as state_store
from .deckyshim import decky
from .parsing import (
    classify_failure,
    classify_updates,
    decide_notification,
    merge_update_info,
    parse_qu_output,
    parse_sup_output,
    updates_signature,
)

CHECK_EVENT = "cachyos_updater_check"


def _error_lines(text: str) -> list[str]:
    return [l.strip() for l in (text or "").splitlines() if l.strip().startswith("error:")]


class UpdateCheckMixin:
    def _ensure_check_state(self):
        """Lazy init so IPC calls work even if _main hasn't run yet."""
        if not hasattr(self, "_check_lock"):
            self._check_lock = asyncio.Lock()
            self._check_in_progress = False

    def _prepare_check_db(self) -> str:
        """Root-owned DB directory whose `local` entry is a symlink to the
        system's local package database (the checkupdates trick). 0755, not
        0700: pacman's sandboxed download user has to reach dbpath/sync."""
        state_store.ensure_dir(C.STATE_DIR, 0o755)
        state_store.ensure_dir(C.CHECK_DB_DIR, 0o755)
        local_link = os.path.join(C.CHECK_DB_DIR, "local")
        target = os.path.join(self._pacman_dbpath(), "local")
        current = None
        if os.path.islink(local_link):
            current = os.readlink(local_link)
        if current != target:
            if os.path.islink(local_link) or os.path.isfile(local_link):
                os.remove(local_link)
            elif os.path.isdir(local_link):
                shutil.rmtree(local_link)
            os.symlink(target, local_link)
        # A check killed mid-sync (plugin_loader restart) leaves pacman's lock
        # behind in the private copy; the check lock we hold makes any
        # db.lck here stale by definition.
        try:
            os.remove(os.path.join(C.CHECK_DB_DIR, "db.lck"))
        except FileNotFoundError:
            pass
        return C.CHECK_DB_DIR

    def _lock_message(self) -> tuple[bool, str]:
        stale = self._pacman_lock_is_stale()
        if stale:
            return True, (
                "A stale pacman lock is blocking package operations "
                "(left behind by an interrupted transaction)."
            )
        return False, "Another package manager is running (pacman database is locked)."

    def _check_updates_sync(self) -> dict:
        """Blocking worker: refresh the private DB copy, list pending
        upgrades, enrich them with download size and repo, and resolve the
        upgrade transaction once so a conflict shows up before Install."""
        db = self._prepare_check_db()
        r = self._run_cmd(
            [C.PACMAN, "-Sy", "--dbpath", db, "--logfile", "/dev/null"],
            timeout=C.PACMAN_SYNC_TIMEOUT,
        )
        if not r["success"]:
            lines = _error_lines(r["stderr"]) or [r["stderr"] or r["stdout"] or "pacman -Sy failed"]
            kind = classify_failure(lines) or "unknown"
            return {
                "success": False,
                "error": "sync_failed",
                "kind": kind,
                "message": (
                    "Couldn't reach the package mirrors."
                    if kind == "network"
                    else "Couldn't refresh the package databases."
                ),
                "detail": lines[-1][:300],
            }
        r = self._run_cmd([C.PACMAN, "-Qu", "--dbpath", db], timeout=C.PACMAN_QUERY_TIMEOUT)
        # -Qu exits 1 with empty output when nothing is pending; a real
        # failure carries an "error:" line on stderr.
        if r["returncode"] not in (0, 1) or (
            r["returncode"] == 1 and "error:" in (r["stderr"] or "").lower()
        ):
            lines = _error_lines(r["stderr"]) or [r["stderr"] or r["stdout"] or "pacman -Qu failed"]
            return {
                "success": False,
                "error": "query_failed",
                "kind": classify_failure(lines) or "unknown",
                "message": "Couldn't compare installed packages against the databases.",
                "detail": lines[-1][:300],
            }
        updates = parse_qu_output(r["stdout"])
        extra = {}
        resolve_error = ""
        if updates:
            r = self._run_cmd(
                [C.PACMAN, "-Sup", "--print-format", "%n|%v|%s|%r", "--dbpath", db],
                timeout=C.PACMAN_QUERY_TIMEOUT,
            )
            if r["success"]:
                extra = parse_sup_output(r["stdout"])
            else:
                # -Sup resolves the very transaction -Syu would run; if it
                # fails here, Install would fail the same way.
                lines = _error_lines(r["stderr"]) or [r["stderr"] or r["stdout"] or "pacman -Sup failed"]
                resolve_error = lines[-1][:300]
        return {"success": True, "updates": merge_update_info(updates, extra), "resolve_error": resolve_error}

    async def _emit_check_event(self, payload: dict):
        try:
            await decky.emit(CHECK_EVENT, payload)
        except Exception as e:
            decky.logger.error(f"emit {CHECK_EVENT} failed: {e}")

    async def _run_check(self, trigger: str, force: bool = False) -> dict:
        """One update check. Automatic triggers (boot/wake/interval) are
        deduplicated against a recent check; the manual button forces."""
        self._ensure_check_state()
        state = state_store.load_state()
        now = time.time()
        if not force and (now - float(state.get("last_check_at", 0) or 0)) < C.MIN_CHECK_SPACING:
            return {"success": True, "skipped": True, "message": "Checked a moment ago."}
        if self._check_lock.locked():
            return {"success": True, "skipped": True, "message": "A check is already running."}
        async with self._check_lock:
            state = state_store.load_state()
            if (state.get("upgrade") or {}).get("state") == "running":
                return {
                    "success": False,
                    "skipped": True,
                    "error": "upgrade_running",
                    "message": "A system upgrade is running.",
                }
            if not os.path.exists(C.PACMAN):
                return {"success": False, "error": "no_pacman", "message": "pacman not found - this plugin needs CachyOS/Arch."}
            # Offline: fail instantly instead of walking every mirror's
            # connect timeout; nothing is recorded so the last good result
            # stays valid and an overdue interval check fires once online.
            if not self._network_online():
                return {"success": False, "error": "offline", "message": "No network connection.", "trigger": trigger}
            if self._pacman_locked():
                stale, message = self._lock_message()
                return {"success": False, "error": "pacman_locked", "stale_lock": stale, "message": message}
            self._check_in_progress = True
            try:
                result = await asyncio.to_thread(self._check_updates_sync)
            finally:
                self._check_in_progress = False

            now = time.time()
            settings = settings_store.load_settings()
            notify_mode = settings.get("notify_mode", "all")
            if not result["success"]:
                state_store.update_state_fields(
                    last_check_at=now,
                    last_check_trigger=trigger,
                    last_check_ok=False,
                    last_check_error=result.get("message", "Update check failed."),
                    last_check_detail=result.get("detail", ""),
                    last_check_kind=result.get("kind", "unknown"),
                )
                decky.logger.error(
                    f"Update check ({trigger}) failed [{result.get('kind')}]: "
                    f"{result.get('message')} {result.get('detail', '')}"
                )
                await self._emit_check_event({
                    "trigger": trigger,
                    "success": False,
                    "updates_count": 0,
                    "relevant_count": 0,
                    "relevant_names": [],
                    "notify": False,
                    "notify_mode": notify_mode,
                    "message": result.get("message", ""),
                })
                return {**result, "trigger": trigger}

            updates = result["updates"]
            signature = updates_signature(updates)
            classified = classify_updates(updates, settings.get("custom_patterns", ""))
            relevant = [u for u in classified if u["relevant"]]
            notify = decide_notification(
                len(relevant),
                len(updates),
                notify_mode,
                signature,
                state.get("last_notified_signature", ""),
                state.get("last_notified_at", 0),
                now,
                C.NOTIFY_REMIND_INTERVAL,
            )
            fields = dict(
                last_check_at=now,
                last_check_trigger=trigger,
                last_check_ok=True,
                last_check_error="",
                last_check_detail="",
                last_check_kind="",
                resolve_error=result.get("resolve_error", ""),
                updates=updates,
                updates_signature=signature,
            )
            if notify:
                fields.update(last_notified_signature=signature, last_notified_at=now)
            elif not updates:
                # Nothing pending: forget what was announced so the next set
                # is announced again even if it happens to look the same.
                fields.update(last_notified_signature="", last_notified_at=0)
            state_store.update_state_fields(**fields)
            if result.get("resolve_error"):
                decky.logger.error(f"Update check ({trigger}): pacman -Sup failed: {result['resolve_error']}")
            decky.logger.info(
                f"Update check ({trigger}): {len(updates)} pending, "
                f"{len(relevant)} gaming-relevant, notify={notify}"
            )
            payload = {
                "trigger": trigger,
                "success": True,
                "updates_count": len(updates),
                "relevant_count": len(relevant),
                "relevant_names": [u["name"] for u in relevant[:6]],
                "notify": notify,
                "notify_mode": notify_mode,
                "message": "",
            }
            if notify:
                # The frontend may not be loaded yet (boot check, Desktop
                # Mode); it pulls the slot when it comes up.
                state_store.put_pending_toast("check", payload, now)
            await self._emit_check_event(payload)
            return {
                "success": True,
                "trigger": trigger,
                "updates": classified,
                "updates_count": len(updates),
                "relevant_count": len(relevant),
                "resolve_error": result.get("resolve_error", ""),
                "notify": notify,
            }

    async def check_for_updates(self) -> dict:
        """Manual check from the panel button: always runs."""
        try:
            return await self._run_check("manual", force=True)
        except Exception as e:
            decky.logger.error(f"check_for_updates error: {e}")
            return self._unexpected_response(e)
