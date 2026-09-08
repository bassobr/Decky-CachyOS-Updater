"""The UI status snapshot (cheap: no network, no pacman) and diagnostics."""

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
            return {
                "success": True,
                "version": decky.DECKY_PLUGIN_VERSION,
                "distro_name": settings.get("distro_name", "Unknown"),
                "distro_id": settings.get("distro_id", "unknown"),
                "kernel_running": self._running_kernel(),
                "pacman_available": os.path.exists(C.PACMAN),
                "settings": settings,
                "check": {
                    "last_check_at": state.get("last_check_at", 0),
                    "trigger": state.get("last_check_trigger", ""),
                    "ok": bool(state.get("last_check_ok", False)),
                    "error": state.get("last_check_error", ""),
                    "in_progress": bool(getattr(self, "_check_in_progress", False)),
                    "updates": classified,
                    "relevant_count": relevant_count,
                    "total_download_size": total_download,
                },
                "upgrade": upgrade,
                "pacman_locked": (not upgrade_running) and self._pacman_locked(),
                "reboot_required": not self._running_kernel_modules_present(),
                "interval_choices": list(C.CHECK_INTERVAL_CHOICES),
                "gaming_groups": [
                    {"id": gid, "label": spec["label"], "patterns": spec["patterns"]}
                    for gid, spec in C.GAMING_PACKAGE_GROUPS.items()
                ],
            }
        except Exception as e:
            decky.logger.error(f"get_status error: {e}")
            return {"success": False, "error": "unexpected", "message": str(e)}

    async def get_diagnostic_info(self) -> dict:
        """Everything needed for a bug report; package names only, nothing
        personal."""
        try:
            settings = settings_store.load_settings()
            state = state_store.load_state()
            up = state.get("upgrade") or {}
            props = self._unit_props()
            pacman_version = self._run_cmd([C.PACMAN, "--version"], timeout=10)["stdout"].splitlines()
            return {
                "plugin_version": decky.DECKY_PLUGIN_VERSION,
                "collected_at": int(time.time()),
                "distro": {"id": settings.get("distro_id"), "name": settings.get("distro_name")},
                "kernel_running": self._running_kernel(),
                "kernel_modules_present": self._running_kernel_modules_present(),
                "uptime_seconds": int(self._system_uptime()) if self._system_uptime() != float("inf") else None,
                "pacman_version": pacman_version[1].strip() if len(pacman_version) > 1 else "",
                "pacman_dbpath": self._pacman_dbpath(),
                "pacman_locked": self._pacman_locked(),
                "settings": settings,
                "state": {k: v for k, v in state.items() if k != "updates"},
                "pending_updates": [f"{u['name']} {u['old_version']} -> {u['new_version']}" for u in state.get("updates", [])],
                "upgrade_unit": props,
                "upgrade_log_tail": self._read_log_tail(up.get("log_path", ""), 8192).splitlines()[-40:],
            }
        except Exception as e:
            decky.logger.error(f"get_diagnostic_info error: {e}")
            return self._unexpected_response(e)
