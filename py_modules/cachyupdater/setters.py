"""Settings setters called from the panel toggles."""

from . import constants as C
from . import settings as settings_store
from . import state as state_store
from .deckyshim import decky
from .parsing import invalid_custom_patterns, split_patterns


class SettersMixin:
    async def set_check_on_boot_wake(self, enabled: bool) -> dict:
        try:
            settings_store.update_settings_fields(check_on_boot_wake=bool(enabled))
            decky.logger.info(f"check_on_boot_wake={bool(enabled)}")
            return {"success": True, "check_on_boot_wake": bool(enabled)}
        except Exception as e:
            decky.logger.error(f"set_check_on_boot_wake error: {e}")
            return self._unexpected_response(e)

    async def set_check_interval(self, hours: int) -> dict:
        try:
            try:
                hours = int(hours)
            except (TypeError, ValueError):
                return {"success": False, "error": "invalid_value", "message": "Interval must be a number of hours."}
            if hours not in C.CHECK_INTERVAL_CHOICES:
                return {
                    "success": False,
                    "error": "invalid_value",
                    "message": f"Interval must be one of {', '.join(str(h) for h in C.CHECK_INTERVAL_CHOICES)} hours.",
                }
            settings_store.update_settings_fields(check_interval_hours=hours)
            decky.logger.info(f"check_interval_hours={hours}")
            return {"success": True, "check_interval_hours": hours}
        except Exception as e:
            decky.logger.error(f"set_check_interval error: {e}")
            return self._unexpected_response(e)

    async def set_notify_mode(self, mode: str) -> dict:
        """all = toast for every new pending set, gaming = only when a
        gaming-relevant package is among them, off = never (panel only)."""
        try:
            if mode not in C.NOTIFY_MODES:
                return {
                    "success": False,
                    "error": "invalid_value",
                    "message": f"Notification mode must be one of {', '.join(C.NOTIFY_MODES)}.",
                }
            settings_store.update_settings_fields(notify_mode=mode)
            decky.logger.info(f"notify_mode={mode}")
            return {"success": True, "notify_mode": mode}
        except Exception as e:
            decky.logger.error(f"set_notify_mode error: {e}")
            return self._unexpected_response(e)

    async def set_custom_patterns(self, patterns: str) -> dict:
        """Extra package globs the user counts as gaming-relevant
        (space/comma separated). Very short tokens are rejected."""
        try:
            cleaned = " ".join(split_patterns(patterns or ""))
            too_short = invalid_custom_patterns(cleaned)
            if too_short:
                return {
                    "success": False,
                    "error": "invalid_pattern",
                    "message": f"Patterns need at least {C.MIN_PATTERN_LEN} characters: " + ", ".join(too_short),
                }
            settings_store.update_settings_fields(custom_patterns=cleaned)
            return {"success": True, "custom_patterns": cleaned}
        except Exception as e:
            decky.logger.error(f"set_custom_patterns error: {e}")
            return self._unexpected_response(e)

    async def set_list_filter(self, mode: str) -> dict:
        try:
            if mode not in ("all", "gaming"):
                return {"success": False, "error": "invalid_value", "message": "Filter must be 'all' or 'gaming'."}
            settings_store.update_settings_fields(list_filter=mode)
            return {"success": True, "list_filter": mode}
        except Exception as e:
            decky.logger.error(f"set_list_filter error: {e}")
            return self._unexpected_response(e)

    async def reset_settings(self) -> dict:
        """Back to defaults; distro detection and the pending-update list are
        kept, the notification memory is cleared."""
        try:
            current = settings_store.load_settings()
            fresh = dict(C.DEFAULT_SETTINGS)
            fresh["distro_id"] = current.get("distro_id", "unknown")
            fresh["distro_name"] = current.get("distro_name", "Unknown")
            settings_store.save_settings_with_timestamp(fresh)
            state_store.update_state_fields(last_notified_signature="", last_notified_at=0)
            decky.logger.info("Settings reset to defaults")
            return {"success": True}
        except Exception as e:
            decky.logger.error(f"reset_settings error: {e}")
            return self._unexpected_response(e)
