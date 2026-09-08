"""Root-owned runtime state: the last check result and the upgrade run.

Lives under STATE_DIR (root-owned, 0755 like /var/lib/pacman) rather than
the user-writable Decky settings directory: the update list and the upgrade
bookkeeping are produced by root and consumed by root, so nothing under the
user's home can influence them. Same atomic/symlink-safe writer as
settings.json.
"""

import copy
import json
import os
import threading

from . import constants as C
from .deckyshim import decky
from .settings import write_json_atomic

# Tests point this at a temp file.
STATE_FILE = C.STATE_FILE

_state_lock = threading.RLock()


def ensure_dir(path: str, mode: int = 0o755):
    """Create a root-owned directory (no-op if present) and pin its mode.

    Default 0755 like /var/lib/pacman: only root writes here, but the
    directories must stay traversable by others - pacman >= 7 downloads as
    the unprivileged DownloadUser (alpm) into a temp dir below dbpath/sync,
    and a 0700 parent makes every sync fail with "Permission denied".
    Pass 0o700 for directories nothing but root ever needs (RUN_DIR)."""
    os.makedirs(path, mode=mode, exist_ok=True)
    try:
        os.chmod(path, mode)
    except OSError:
        pass


def default_state() -> dict:
    return copy.deepcopy(C.DEFAULT_STATE)


def load_state() -> dict:
    with _state_lock:
        try:
            with open(STATE_FILE, "r") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                raise ValueError("state root is not a JSON object")
        except FileNotFoundError:
            return default_state()
        except Exception as e:
            decky.logger.error(f"state.json unreadable ({e}); starting from defaults")
            return default_state()
        merged = {**default_state(), **data}
        upgrade = {**copy.deepcopy(C.DEFAULT_UPGRADE_STATE), **(data.get("upgrade") or {})}
        merged["upgrade"] = {k: v for k, v in upgrade.items() if k in C.DEFAULT_UPGRADE_STATE}
        return {k: v for k, v in merged.items() if k in C.DEFAULT_STATE}


def save_state(data: dict):
    with _state_lock:
        ensure_dir(os.path.dirname(STATE_FILE))
        write_json_atomic(STATE_FILE, data)


def update_state_fields(**fields) -> dict:
    """Atomic load-set-save of top-level state fields."""
    with _state_lock:
        state = load_state()
        state.update(fields)
        save_state(state)
        return state


def update_upgrade_state(**fields) -> dict:
    """Atomic load-set-save of fields inside state["upgrade"]."""
    with _state_lock:
        state = load_state()
        upgrade = dict(state.get("upgrade") or {})
        upgrade.update(fields)
        state["upgrade"] = upgrade
        save_state(state)
        return state


def put_pending_toast(kind: str, payload: dict, created_at: float):
    """Remember a toast until the frontend pulls it (one slot per kind, the
    newest wins). decky.emit is fire-and-forget and the frontend is often not
    loaded yet when the boot check or a post-reboot finalization fires."""
    with _state_lock:
        state = load_state()
        toasts = dict(state.get("pending_toasts") or {})
        toasts[kind] = {"kind": kind, "payload": payload, "created_at": created_at}
        state["pending_toasts"] = toasts
        save_state(state)


def pull_pending_toasts(max_age: float, now: float) -> list:
    """Return and clear the pending toasts, dropping expired ones."""
    with _state_lock:
        state = load_state()
        toasts = state.get("pending_toasts") or {}
        if not toasts:
            return []
        state["pending_toasts"] = {}
        save_state(state)
        fresh = [t for t in toasts.values() if now - float(t.get("created_at", 0) or 0) <= max_age]
        fresh.sort(key=lambda t: t.get("created_at", 0))
        return fresh
