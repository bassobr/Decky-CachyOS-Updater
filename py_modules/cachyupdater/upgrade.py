"""The system upgrade as a detached transient systemd unit.

`pacman -Syu` must survive anything the plugin process goes through
(plugin_loader restarts, Steam restarts, the QAM being closed), so it is not
a child of this process: systemd-run starts it as its own service with a
clean environment, its output appended to a root-owned log file, and a
sleep/shutdown inhibitor held for the duration of the transaction. The
wrapper leaves pacman's exit status in a file under /run; the plugin only
ever observes (log, unit state, status file) and never touches the running
transaction.
"""

import asyncio
import os
import time

from . import constants as C
from . import settings as settings_store
from . import state as state_store
from .deckyshim import decky
from .parsing import classify_failure, parse_upgrade_log, reboot_recommended

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
            self._finalize_lock = asyncio.Lock()
            self._post_upgrade_task = None
            self._unit_probe_failures = 0

    def _unit_name(self) -> str:
        return C.UPGRADE_UNIT + ".service"

    def _unit_is_active(self) -> bool | None:
        """True while the unit runs, False once it ended, None when systemctl
        itself failed (timeout under heavy I/O, daemon-reload from a pacman
        hook) - a None must never be read as "ended"."""
        r = self._run_cmd([C.SYSTEMCTL, "is-active", self._unit_name()], timeout=10)
        state = (r["stdout"] or "").strip().splitlines()
        if r["returncode"] == -1 or not state:
            return None
        return state[0] in ("active", "activating", "deactivating", "reloading")

    def _unit_props(self) -> dict:
        r = self._run_cmd(
            [C.SYSTEMCTL, "show", "-p", "LoadState,ActiveState,Result,ExecMainStatus,ExecMainCode", self._unit_name()],
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
        now = time.time()
        # Record "running" BEFORE the unit exists: a plugin_loader restart in
        # the next few hundred ms must not leave a live upgrade untracked.
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
            failure_kind="",
            acknowledged=False,
        )
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
            state_store.update_upgrade_state(state="idle", log_path="", started_at=0, acknowledged=True)
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
        decky.logger.info(f"System upgrade started as {self._unit_name()} (log: {log_path})")
        return {"success": True, "message": "System upgrade started.", "log_path": log_path}

    async def start_upgrade(self) -> dict:
        """Start `pacman -Syu --noconfirm` detached. Refuses while a check,
        another upgrade, or a foreign pacman is running, when offline, and
        on a low battery without a charger."""
        try:
            self._ensure_upgrade_state()
            if self._upgrade_lock.locked():
                return {"success": False, "error": "busy", "message": "Please wait a moment and try again."}
            async with self._upgrade_lock:
                current = await self._refresh_upgrade_state()
                if current.get("state") == "running":
                    return {"success": False, "error": "upgrade_running", "message": "A system upgrade is already running."}
                if getattr(self, "_check_in_progress", False):
                    return {"success": False, "error": "check_running", "message": "An update check is running - try again in a moment."}
                if not os.path.exists(C.PACMAN):
                    return {"success": False, "error": "no_pacman", "message": "pacman not found - this plugin needs CachyOS/Arch."}
                if not self._network_online():
                    return {"success": False, "error": "offline", "message": "No network connection."}
                power = self._power_state()
                if power["low_battery"]:
                    return {
                        "success": False,
                        "error": "low_battery",
                        "message": f"Battery at {power['battery_percent']}% and not charging - plug in before updating.",
                    }
                if self._pacman_locked():
                    stale, message = self._lock_message()
                    return {"success": False, "error": "pacman_locked", "stale_lock": stale, "message": message}
                return await asyncio.to_thread(self._launch_upgrade_unit)
        except Exception as e:
            decky.logger.error(f"start_upgrade error: {e}")
            return self._unexpected_response(e)

    async def _refresh_upgrade_state(self) -> dict:
        """Observe a running upgrade; finalize it exactly once when the unit
        has ended. Called from status polls and the scheduler so the result
        (and its toast) lands even with the panel closed."""
        self._ensure_upgrade_state()
        state = state_store.load_state()
        up = dict(state.get("upgrade") or {})
        if up.get("state") != "running":
            return up
        progress = parse_upgrade_log(self._read_log_tail(up.get("log_path", "")))
        active = await asyncio.to_thread(self._unit_is_active)
        if active is None:
            self._unit_probe_failures += 1
            if self._unit_probe_failures in (1, 10, 100):
                decky.logger.error("systemctl is-active failed while an upgrade runs; keeping the running state")
            up["progress"] = progress
            return up
        self._unit_probe_failures = 0
        if active:
            up["progress"] = progress
            return up
        async with self._finalize_lock:
            # Re-read: a concurrent poll may have finalized while we waited.
            state = state_store.load_state()
            up = dict(state.get("upgrade") or {})
            if up.get("state") != "running":
                return up
            return await self._finalize_upgrade(up)

    async def _finalize_upgrade(self, up: dict) -> dict:
        # The unit is gone: read the WHOLE log now (bounded) - the tail
        # snapshot taken before the liveness probe can miss the last lines,
        # and a big first upgrade would lose its "Packages (N)" header.
        progress = parse_upgrade_log(self._read_log_tail(up.get("log_path", ""), C.UPGRADE_LOG_FINAL_MAX_BYTES))
        # Exit status: the wrapper's status file, else the marker line it
        # wrote into the log (survives a reboot), else systemd.
        code = self._read_status_file()
        if code is None:
            code = progress.get("exit_code")
        killed = False
        if code is None:
            props = await asyncio.to_thread(self._unit_props)
            if props.get("ExecMainCode") in ("2", "3"):
                killed = True
            elif props.get("ActiveState") == "failed" or props.get("Result", "success") not in ("", "success"):
                try:
                    code = int(props.get("ExecMainStatus") or 1)
                except ValueError:
                    code = 1
                if code == 0:
                    code = 1

        settings = settings_store.load_settings()
        upgraded = progress.get("upgraded", [])
        errors = progress.get("errors", [])
        # A run that completed before the current boot (finalized late, e.g.
        # the user rebooted straight from Steam) must not ask for a reboot.
        boot_time = self._boot_time()
        finished_before_boot = bool(up.get("started_at")) and bool(boot_time) and float(up["started_at"]) < boot_time
        reboot_required = (not finished_before_boot) and not self._running_kernel_modules_present()
        recommended = (not finished_before_boot) and (
            reboot_required or reboot_recommended(upgraded, settings.get("custom_patterns", ""))
        )
        failure_kind = ""
        if code == 0:
            new_state = "succeeded"
            if progress.get("nothing_to_do"):
                message = "The system was already up to date."
            else:
                message = f"{len(upgraded)} package{'s' if len(upgraded) != 1 else ''} upgraded."
            if finished_before_boot:
                message += " (Finished before the last restart.)"
        elif code is None or killed:
            new_state = "interrupted"
            message = "The upgrade did not finish (the system restarted or the service was killed)."
            if self._pacman_lock_is_stale():
                message += " A stale pacman lock was left behind - remove it, then install again."
        else:
            new_state = "failed"
            failure_kind = classify_failure(errors) or "unknown"
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
            failure_kind=failure_kind,
            acknowledged=False,
        )
        state_store.update_upgrade_state(**fields)
        if code == 0:
            # The pending list is obsolete the moment the transaction
            # succeeded; the post-upgrade check refreshes it.
            state_store.update_state_fields(
                updates=[], updates_signature="", resolve_error="",
                last_notified_signature="", last_notified_at=0,
            )
        decky.logger.info(
            f"System upgrade finished: {new_state} (exit={code}, kind={failure_kind or '-'}, "
            f"upgraded={len(upgraded)}, pacnew={fields['pacnew']}, reboot_required={reboot_required}, "
            f"recommended={recommended}, before_boot={finished_before_boot})"
        )
        payload = {
            "state": new_state,
            "message": message,
            "upgraded_count": len(upgraded),
            "reboot_required": reboot_required,
            "reboot_recommended": recommended,
            "exit_code": code,
        }
        state_store.put_pending_toast("upgrade", payload, time.time())
        try:
            await decky.emit(UPGRADE_EVENT, payload)
        except Exception as e:
            decky.logger.error(f"emit {UPGRADE_EVENT} failed: {e}")
        # Refresh the pending list now that the transaction is over.
        try:
            self._post_upgrade_task = asyncio.get_running_loop().create_task(
                self._run_check("post-upgrade", force=True)
            )
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
            text = await asyncio.to_thread(self._read_log_tail, path)
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

    async def clear_stale_pacman_lock(self) -> dict:
        """Remove /var/lib/pacman/db.lck, but only when no package manager
        is alive to own it (a crash or power loss mid-transaction leaves it
        behind and pacman never cleans it up)."""
        try:
            if not self._pacman_locked():
                return {"success": True, "message": "No lock present."}
            current = await self._refresh_upgrade_state()
            if current.get("state") == "running":
                return {"success": False, "error": "upgrade_running", "message": "A system upgrade is running - the lock is in use."}
            if not await asyncio.to_thread(self._pacman_lock_is_stale):
                return {"success": False, "error": "pacman_locked", "message": "A package manager is still running - the lock is in use."}
            os.remove(self._pacman_lock_path())
            decky.logger.info("Removed stale pacman lock (no package manager process alive)")
            return {"success": True, "message": "Stale lock removed."}
        except Exception as e:
            decky.logger.error(f"clear_stale_pacman_lock error: {e}")
            return self._unexpected_response(e)

    async def reboot_system(self) -> dict:
        """Reboot after a kernel/driver upgrade. Refused while pacman runs."""
        try:
            current = await self._refresh_upgrade_state()
            if current.get("state") == "running" or (self._pacman_locked() and not self._pacman_lock_is_stale()):
                return {"success": False, "message": "A package transaction is still running - wait for it to finish."}
            decky.logger.info("Reboot requested from the CachyOS Updater panel")
            r = await asyncio.to_thread(self._run_cmd, [C.SYSTEMCTL, "reboot"], 20)
            if not r["success"]:
                return {"success": False, "message": "Reboot failed.", "detail": r["stderr"][-200:]}
            return {"success": True, "message": "Rebooting..."}
        except Exception as e:
            decky.logger.error(f"reboot_system error: {e}")
            return self._unexpected_response(e)
