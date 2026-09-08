"""Automatic triggers: boot, resume from suspend, and the periodic interval.

Resume detection needs no Steam client API and no D-Bus: CLOCK_BOOTTIME keeps
counting while the device sleeps, CLOCK_MONOTONIC does not, so a jump in
their difference between two scheduler ticks means a suspend happened in
between. The frontend additionally pokes the backend from Steam's own resume
hook when that API is available - both paths funnel into the same debounced
delayed check.
"""

import asyncio
import time

from . import constants as C
from . import settings as settings_store
from . import state as state_store
from .deckyshim import decky
from .parsing import detect_resume, should_run_interval_check


class SchedulerMixin:
    def _ensure_scheduler_state(self):
        if not hasattr(self, "_pending_check_task"):
            self._pending_check_task = None
            self._scheduler_task = None

    def _suspend_gap(self) -> float | None:
        clk = getattr(time, "CLOCK_BOOTTIME", None)
        if clk is None:
            return None
        try:
            return time.clock_gettime(clk) - time.monotonic()
        except Exception:
            return None

    def _schedule_check(self, trigger: str, delay: float) -> bool:
        """Run a delayed, retrying check as a background task. While one is
        pending (e.g. the frontend's resume hook and the clock-based detector
        both fired) further requests are dropped."""
        self._ensure_scheduler_state()
        pending = self._pending_check_task
        if pending is not None and not pending.done():
            return False
        self._pending_check_task = asyncio.get_running_loop().create_task(
            self._delayed_check(trigger, delay)
        )
        return True

    async def _delayed_check(self, trigger: str, delay: float):
        try:
            if delay > 0:
                await asyncio.sleep(delay)
            await self._run_check_with_retry(trigger)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            decky.logger.error(f"delayed check ({trigger}) error: {e}")

    async def _run_check_with_retry(self, trigger: str) -> dict:
        """Boot/wake checks usually race the WiFi reconnect: retry a failed
        sync a few times before giving up until the next trigger."""
        result: dict = {}
        for attempt in range(1, C.NETWORK_RETRIES + 1):
            # Only the first attempt is subject to the recent-check dedupe; a
            # retry exists precisely because the previous attempt just failed.
            result = await self._run_check(trigger, force=attempt > 1)
            if result.get("success") or result.get("skipped"):
                return result
            if attempt < C.NETWORK_RETRIES:
                decky.logger.info(
                    f"Update check ({trigger}) attempt {attempt} failed: "
                    f"{result.get('message')}; retrying in {C.NETWORK_RETRY_DELAY}s"
                )
                await asyncio.sleep(C.NETWORK_RETRY_DELAY)
        return result

    async def _scheduler_loop(self):
        """Background task started from _main."""
        self._ensure_scheduler_state()
        settings = settings_store.load_settings()
        # A fresh boot vs. a plugin_loader restart: only the former counts as
        # "start" for the boot-check toggle; a reload falls back to the
        # interval logic so a plugin update doesn't fire a redundant check.
        if self._system_uptime() < C.BOOT_UPTIME_MAX and settings.get("check_on_boot_wake", True):
            self._schedule_check("boot", C.BOOT_CHECK_DELAY)
        prev_gap = self._suspend_gap()
        last_error_logged = 0.0
        while True:
            await asyncio.sleep(C.SCHEDULER_TICK)
            try:
                gap = self._suspend_gap()
                resumed = detect_resume(prev_gap, gap, C.WAKE_GAP_THRESHOLD)
                prev_gap = gap
                await self._refresh_upgrade_state()
                settings = settings_store.load_settings()
                if resumed:
                    decky.logger.info("Resume from suspend detected")
                    if settings.get("check_on_boot_wake", True):
                        self._schedule_check("wake", C.WAKE_CHECK_DELAY)
                        continue
                state = state_store.load_state()
                if should_run_interval_check(
                    settings.get("check_interval_hours", 0),
                    state.get("last_check_at", 0),
                    time.time(),
                ):
                    self._schedule_check("interval", 0)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                now = time.monotonic()
                if now - last_error_logged > 300:
                    last_error_logged = now
                    decky.logger.error(f"scheduler error: {e}")

    async def poke_resume(self) -> dict:
        """Frontend fast path: Steam's resume hook fired. Debounced against
        the backend's own detector by _schedule_check."""
        try:
            settings = settings_store.load_settings()
            if not settings.get("check_on_boot_wake", True):
                return {"success": True, "scheduled": False}
            scheduled = self._schedule_check("wake", C.WAKE_CHECK_DELAY)
            return {"success": True, "scheduled": scheduled}
        except Exception as e:
            decky.logger.error(f"poke_resume error: {e}")
            return self._unexpected_response(e)
