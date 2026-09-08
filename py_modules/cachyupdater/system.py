"""Subprocess runner and small system probes shared by every other mixin."""

import os
import signal
import subprocess
import time

from . import constants as C


class SystemMixin:
    def _run_cmd(self, cmd: list[str], timeout: int = 10, env_extra: dict | None = None) -> dict:
        """Run a subprocess and return a result dict.

        The child always gets a clean environment: LD_LIBRARY_PATH is
        stripped so system binaries use system libraries instead of Decky's
        PyInstaller-bundled ones (curl/bash otherwise fail with symbol-lookup
        errors), and LC_ALL=C makes pacman's output parseable regardless of
        the device's locale. The child runs in its own session so a timeout
        kills its whole process group (pacman >= 7 forks a sandboxed
        download child that would otherwise be orphaned mid-write).
        """
        try:
            env = {k: v for k, v in os.environ.items() if k != "LD_LIBRARY_PATH"}
            env["LC_ALL"] = "C"
            env["LANG"] = "C"
            if env_extra:
                env.update(env_extra)
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                start_new_session=True,
            )
            try:
                stdout, stderr = proc.communicate(timeout=timeout)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except Exception:
                    proc.kill()
                proc.communicate()
                return {"success": False, "stdout": "", "stderr": "Command timed out", "returncode": -1}
            return {
                "success": proc.returncode == 0,
                "stdout": (stdout or "").strip(),
                "stderr": (stderr or "").strip(),
                "returncode": proc.returncode,
            }
        except FileNotFoundError:
            return {"success": False, "stdout": "", "stderr": f"Command not found: {cmd[0]}", "returncode": -1}
        except Exception as e:
            return {"success": False, "stdout": "", "stderr": str(e), "returncode": -1}

    def _unexpected_response(self, e: Exception) -> dict:
        """Standard error dict for the catch-all exception handler in every
        callable. Callers log the error separately with the method name."""
        return {"success": False, "error": "unexpected", "message": str(e)}

    # ---- probes ----

    def _detect_distro(self) -> dict:
        """Detect OS from /etc/os-release. Returns {id, name}."""
        info = {"id": "unknown", "name": "Unknown"}
        try:
            with open("/etc/os-release", "r") as f:
                for line in f:
                    if line.startswith("ID="):
                        info["id"] = line.split("=", 1)[1].strip().strip('"')
                    elif line.startswith("PRETTY_NAME="):
                        info["name"] = line.split("=", 1)[1].strip().strip('"')
        except Exception:
            pass
        return info

    def _running_kernel(self) -> str:
        try:
            return os.uname().release
        except Exception:
            return "unknown"

    def _running_kernel_modules_present(self) -> bool:
        """After a kernel upgrade the running kernel's module directory is
        gone (pacman removed the old version), which is the classic Arch
        signal that a reboot is required. Unknown -> assume present."""
        release = self._running_kernel()
        if release == "unknown":
            return True
        return os.path.isdir(f"/usr/lib/modules/{release}")

    def _pacman_dbpath(self) -> str:
        """DBPath from pacman.conf (via pacman-conf), cached; default if the
        tool is missing."""
        cached = getattr(self, "_dbpath_cache", None)
        if cached:
            return cached
        r = self._run_cmd([C.PACMAN_CONF, "DBPath"], timeout=10)
        path = r["stdout"].splitlines()[0].strip() if r["success"] and r["stdout"] else ""
        if not path or not os.path.isabs(path):
            path = C.DEFAULT_PACMAN_DBPATH
        self._dbpath_cache = path.rstrip("/") or C.DEFAULT_PACMAN_DBPATH
        return self._dbpath_cache

    def _pacman_lock_path(self) -> str:
        return os.path.join(self._pacman_dbpath(), "db.lck")

    def _pacman_locked(self) -> bool:
        return os.path.exists(self._pacman_lock_path())

    def _package_manager_running(self) -> bool:
        """Is any process that legitimately holds pacman's lock alive?"""
        try:
            pids = os.listdir(C.PROC_DIR)
        except Exception:
            return True  # can't tell: assume busy, never remove a lock blindly
        for pid in pids:
            if not pid.isdigit():
                continue
            try:
                with open(os.path.join(C.PROC_DIR, pid, "comm"), "r") as f:
                    comm = f.read().strip()
            except Exception:
                continue
            if comm in C.PACKAGE_MANAGER_COMMS:
                return True
        return False

    def _pacman_lock_is_stale(self) -> bool:
        """A db.lck with no package manager alive: left behind by a crash or
        power loss mid-transaction. pacman never cleans it up itself."""
        return self._pacman_locked() and not self._package_manager_running()

    def _system_uptime(self) -> float:
        try:
            with open("/proc/uptime", "r") as f:
                return float(f.read().split()[0])
        except Exception:
            return float("inf")

    def _boot_time(self) -> float:
        uptime = self._system_uptime()
        if uptime == float("inf"):
            return 0.0
        return time.time() - uptime

    def _network_online(self) -> bool:
        """A default route exists (IPv4 or IPv6). Pure /proc read: no
        subprocess, works with NetworkManager and iwd alike, and lets an
        offline check fail instantly instead of walking every mirror's
        connect timeout. Unknown (no /proc) -> assume online."""
        try:
            with open(C.PROC_NET_ROUTE, "r") as f:
                for line in f.readlines()[1:]:
                    parts = line.split()
                    # Iface Destination Gateway Flags ...; flags bit 1 = RTF_UP
                    if len(parts) >= 4 and parts[1] == "00000000" and int(parts[3], 16) & 1:
                        return True
        except FileNotFoundError:
            return True
        except Exception:
            pass
        try:
            with open(C.PROC_NET_IPV6_ROUTE, "r") as f:
                for line in f:
                    parts = line.split()
                    # dest prefix-len ... iface; a ::/0 route that isn't on lo
                    if len(parts) >= 10 and parts[1] == "00" and parts[0] == "0" * 32 and parts[-1] != "lo":
                        return True
        except Exception:
            pass
        return False

    def _power_state(self) -> dict:
        """Battery percentage and charger presence from sysfs (handhelds
        name their supplies BAT0/BAT1 and ACAD/ADP1/ucsi-source-psy-*; use
        the type attribute instead of names)."""
        percent = None
        on_ac = None
        charging = False
        try:
            entries = os.listdir(C.POWER_SUPPLY_DIR)
        except Exception:
            entries = []
        for name in entries:
            base = os.path.join(C.POWER_SUPPLY_DIR, name)
            try:
                with open(os.path.join(base, "type"), "r") as f:
                    kind = f.read().strip()
            except Exception:
                continue
            if kind == "Battery":
                try:
                    with open(os.path.join(base, "capacity"), "r") as f:
                        value = int(f.read().strip())
                    percent = value if percent is None else min(percent, value)
                except Exception:
                    pass
                try:
                    with open(os.path.join(base, "status"), "r") as f:
                        if f.read().strip() in ("Charging", "Full"):
                            charging = True
                except Exception:
                    pass
            elif kind in ("Mains", "USB", "USB_PD", "USB_C"):
                try:
                    with open(os.path.join(base, "online"), "r") as f:
                        online = f.read().strip() == "1"
                    on_ac = online or bool(on_ac)
                except Exception:
                    pass
        if on_ac is None and percent is not None:
            on_ac = charging
        elif charging:
            on_ac = True
        low = percent is not None and percent < C.LOW_BATTERY_PERCENT and not on_ac
        return {"battery_percent": percent, "on_ac": on_ac, "low_battery": low}
