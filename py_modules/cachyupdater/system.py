"""Subprocess runner and small system probes shared by every other mixin."""

import os
import subprocess

from . import constants as C


class SystemMixin:
    def _run_cmd(self, cmd: list[str], timeout: int = 10, env_extra: dict | None = None) -> dict:
        """Run a subprocess and return a result dict.

        The child always gets a clean environment: LD_LIBRARY_PATH is
        stripped so system binaries use system libraries instead of Decky's
        PyInstaller-bundled ones (curl/bash otherwise fail with symbol-lookup
        errors), and LC_ALL=C makes pacman's output parseable regardless of
        the device's locale.
        """
        try:
            env = {k: v for k, v in os.environ.items() if k != "LD_LIBRARY_PATH"}
            env["LC_ALL"] = "C"
            env["LANG"] = "C"
            if env_extra:
                env.update(env_extra)
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=timeout, env=env
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "returncode": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "stdout": "", "stderr": "Command timed out", "returncode": -1}
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

    def _pacman_locked(self) -> bool:
        return os.path.exists(os.path.join(self._pacman_dbpath(), "db.lck"))

    def _system_uptime(self) -> float:
        try:
            with open("/proc/uptime", "r") as f:
                return float(f.read().split()[0])
        except Exception:
            return float("inf")
