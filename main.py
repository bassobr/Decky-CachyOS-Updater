"""CachyOS Updater backend for Decky Loader - entry point.

Runs as root inside the plugin_loader process. Decky requires the Plugin
class to live in main.py; the implementation is modularized under
py_modules/cachyupdater (one module per domain - see that package's
__init__ docstring). This file only composes the Plugin class from those
mixins and owns the plugin lifecycle (_main/_unload/_uninstall).

Settings live in settings.json under DECKY_PLUGIN_SETTINGS_DIR; runtime
state (pending updates, upgrade bookkeeping) and the private pacman DB copy
live root-only under /var/lib/cachyos-updater. The system upgrade itself runs
as a transient systemd unit so it survives plugin_loader/Steam restarts.
"""

import os
import sys

_PLUGIN_ROOT = os.path.dirname(os.path.abspath(__file__))
_PY_MODULES = os.path.join(_PLUGIN_ROOT, "py_modules")
# Decky Loader puts py_modules/ on sys.path before loading main.py; insert it
# defensively anyway so tests and ad-hoc runs outside the loader work too.
if _PY_MODULES not in sys.path:
    sys.path.insert(0, _PY_MODULES)

import asyncio
import shutil

from cachyupdater import constants as C
from cachyupdater import settings as settings_store
from cachyupdater import state as state_store
from cachyupdater.checker import UpdateCheckMixin
from cachyupdater.deckyshim import decky
from cachyupdater.scheduler import SchedulerMixin
from cachyupdater.setters import SettersMixin
from cachyupdater.status import StatusMixin
from cachyupdater.system import SystemMixin
from cachyupdater.updates import PluginUpdatesMixin
from cachyupdater.upgrade import UpgradeMixin


class Plugin(
    SystemMixin,
    UpdateCheckMixin,
    UpgradeMixin,
    SchedulerMixin,
    StatusMixin,
    SettersMixin,
    PluginUpdatesMixin,
):
    """Root plugin instance. Decky exposes every async method (including the
    inherited mixin methods) as a callable from the React frontend.
    Synchronous helpers prefixed with `_` are for internal use only."""

    def _rotate_logs(self, keep: int = 10):
        """Prune old plugin log files on startup. Decky does not rotate plugin
        logs; each load creates a new timestamped file in DECKY_PLUGIN_LOG_DIR."""
        try:
            log_dir = getattr(decky, "DECKY_PLUGIN_LOG_DIR", None)
            if not log_dir or not os.path.isdir(log_dir):
                return
            files = [os.path.join(log_dir, f) for f in os.listdir(log_dir) if f.endswith(".log")]
            if len(files) <= keep:
                return
            files.sort(key=os.path.getmtime, reverse=True)
            current_log = getattr(decky, "DECKY_PLUGIN_LOG", None)
            removed = 0
            for path in files[keep:]:
                if current_log and os.path.realpath(path) == os.path.realpath(current_log):
                    continue
                try:
                    os.remove(path)
                    removed += 1
                except Exception:
                    pass
            if removed:
                decky.logger.info(f"Rotated logs: removed {removed} old file(s), kept {keep} newest")
        except Exception as e:
            decky.logger.error(f"Log rotation error: {e}")

    # ---- Lifecycle ----

    async def _main(self):
        try:
            decky.logger.info("CachyOS Updater starting")
            self._rotate_logs()
            self._ensure_check_state()
            self._ensure_upgrade_state()
            self._ensure_scheduler_state()

            distro = self._detect_distro()
            settings_store.update_settings_fields(distro_id=distro["id"], distro_name=distro["name"])
            if not os.path.exists(C.PACMAN):
                decky.logger.error(f"pacman not found at {C.PACMAN} - this plugin only works on CachyOS/Arch")

            # Warm the pacman-conf cache off the event loop and make sure the
            # root-only directories exist with tight modes.
            await asyncio.to_thread(self._pacman_dbpath)
            for path, mode in ((C.STATE_DIR, 0o700), (C.RUN_DIR, 0o700), (C.LOG_DIR, 0o755)):
                try:
                    state_store.ensure_private_dir(path, mode)
                except Exception as e:
                    decky.logger.error(f"could not create {path}: {e}")

            # An upgrade that ended while we were down (plugin restart, reboot)
            # is finalized here so its result shows up in the panel.
            await self._refresh_upgrade_state()

            self._scheduler_task = asyncio.create_task(self._scheduler_loop())
            decky.logger.info(
                f"CachyOS Updater ready: distro={distro['id']}, kernel={self._running_kernel()}, "
                f"uptime={int(self._system_uptime())}s"
            )
        except Exception as e:
            decky.logger.error(f"CachyOS Updater _main error: {e}")

    async def _unload(self):
        try:
            decky.logger.info("CachyOS Updater unloading")
            for name in ("_scheduler_task", "_pending_check_task"):
                task = getattr(self, name, None)
                if task and not task.done():
                    task.cancel()
        except Exception as e:
            decky.logger.error(f"_unload error: {e}")

    async def _uninstall(self):
        """Remove the plugin's own state. A running upgrade unit is left
        alone - killing pacman mid-transaction is never the right call."""
        try:
            decky.logger.info("CachyOS Updater uninstalling")
            for path in (C.STATE_DIR, C.RUN_DIR, C.LOG_DIR):
                shutil.rmtree(path, ignore_errors=True)
            settings_store.remove_private_file(settings_store.settings_dir(), "settings.json")
        except Exception as e:
            decky.logger.error(f"_uninstall error: {e}")

    async def _migration(self):
        pass
