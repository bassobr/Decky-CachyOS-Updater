"""The UI status snapshot (cheap: no network, no pacman), the pending-toast
pull, and diagnostics."""

import asyncio
import json
import os
import time

from . import constants as C
from . import settings as settings_store
from . import state as state_store
from .deckyshim import decky
from .parsing import classify_updates


class StatusMixin:
    async def get_status(self) -> dict:
        try:
            settings = settings_store.load_settings()
            state = state_store.load_state()
            upgrade = await self._refresh_upgrade_state()
            classified = classify_updates(state.get("updates", []), settings.get("custom_patterns", ""))
            relevant_count = sum(1 for u in classified if u["relevant"])
            total_download = sum(int(u.get("download_size", 0) or 0) for u in classified)
            upgrade_running = upgrade.get("state") == "running"
            locked = (not upgrade_running) and self._pacman_locked()
            return {
                "success": True,
                "version": decky.DECKY_PLUGIN_VERSION,
                "distro_name": settings.get("distro_name", "Unknown"),
                "distro_id": settings.get("distro_id", "unknown"),
                "kernel_running": self._running_kernel(),
                "pacman_available": os.path.exists(C.PACMAN),
                "boot_time": self._boot_time(),
                "network_online": self._network_online(),
                "power": self._power_state(),
                "settings": settings,
                "check": {
                    "last_check_at": state.get("last_check_at", 0),
                    "trigger": state.get("last_check_trigger", ""),
                    "ok": bool(state.get("last_check_ok", False)),
                    "error": state.get("last_check_error", ""),
                    "detail": state.get("last_check_detail", ""),
                    "kind": state.get("last_check_kind", ""),
                    "resolve_error": state.get("resolve_error", ""),
                    "in_progress": bool(getattr(self, "_check_in_progress", False)),
                    "updates": classified,
                    "relevant_count": relevant_count,
                    "total_download_size": total_download,
                },
                "upgrade": upgrade,
                "pacman_locked": locked,
                "pacman_lock_stale": locked and self._pacman_lock_is_stale(),
                "reboot_required": not self._running_kernel_modules_present(),
                "interval_choices": list(C.CHECK_INTERVAL_CHOICES),
                "notify_modes": list(C.NOTIFY_MODES),
                "gaming_groups": [
                    {"id": gid, "label": spec["label"], "patterns": spec["patterns"]}
                    for gid, spec in C.GAMING_PACKAGE_GROUPS.items()
                ],
            }
        except Exception as e:
            decky.logger.error(f"get_status error: {e}")
            return {"success": False, "error": "unexpected", "message": str(e)}

    async def pull_pending_notifications(self) -> dict:
        """Toasts emitted while no frontend was listening (boot check before
        Steam's UI loaded, finalization after a reboot). Returned once, then
        cleared. A "check" toast whose pending set is gone is dropped."""
        try:
            now = time.time()
            toasts = state_store.pull_pending_toasts(C.PENDING_TOAST_MAX_AGE, now)
            state = state_store.load_state()
            if not state.get("updates"):
                toasts = [t for t in toasts if t.get("kind") != "check"]
            return {"success": True, "notifications": toasts}
        except Exception as e:
            decky.logger.error(f"pull_pending_notifications error: {e}")
            return self._unexpected_response(e)

    def _collect_diagnostics(self) -> dict:
        """Blocking worker (subprocesses): everything needed for a bug
        report; package names only, nothing personal."""
        settings = settings_store.load_settings()
        state = state_store.load_state()
        up = state.get("upgrade") or {}
        pacman_version = self._run_cmd([C.PACMAN, "--version"], timeout=10)["stdout"].splitlines()
        uptime = self._system_uptime()
        return {
            "plugin_version": decky.DECKY_PLUGIN_VERSION,
            "collected_at": int(time.time()),
            "distro": {"id": settings.get("distro_id"), "name": settings.get("distro_name")},
            "kernel_running": self._running_kernel(),
            "kernel_modules_present": self._running_kernel_modules_present(),
            "uptime_seconds": int(uptime) if uptime != float("inf") else None,
            "network_online": self._network_online(),
            "power": self._power_state(),
            "pacman_version": pacman_version[1].strip() if len(pacman_version) > 1 else "",
            "pacman_dbpath": self._pacman_dbpath(),
            "pacman_locked": self._pacman_locked(),
            "pacman_lock_stale": self._pacman_lock_is_stale(),
            "settings": settings,
            "state": {k: v for k, v in state.items() if k not in ("updates", "pending_toasts")},
            "pending_updates": [
                f"{u['name']} {u['old_version']} -> {u['new_version']}" for u in state.get("updates", [])
            ],
            "upgrade_unit": self._unit_props(),
            "upgrade_log_tail": self._read_log_tail(up.get("log_path", ""), 8192).splitlines()[-40:],
        }

    async def get_diagnostic_info(self) -> dict:
        """Collect diagnostics and also write them next to the upgrade logs:
        in Game Mode there is rarely anywhere to paste a clipboard."""
        try:
            info = await asyncio.to_thread(self._collect_diagnostics)
            try:
                state_store.ensure_dir(C.LOG_DIR, 0o755)
                path = os.path.join(C.LOG_DIR, "diagnostics.json")
                fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o644)
                with os.fdopen(fd, "w") as f:
                    json.dump(info, f, indent=2)
                info["saved_to"] = path
            except Exception as e:
                decky.logger.error(f"diagnostics.json write failed: {e}")
            return info
        except Exception as e:
            decky.logger.error(f"get_diagnostic_info error: {e}")
            return self._unexpected_response(e)
