"""Backend unit tests. Run with `python3 -m pytest tests/ -q` from the repo
root. The cachyupdater package falls back to a decky stub when the real
module is absent, so these tests run on any machine; everything that would
touch the system (pacman, systemd) goes through a stubbed _run_cmd."""

import asyncio
import base64
import io
import json
import os
import sys
import time
import zipfile

import pytest

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _ROOT)
sys.path.insert(0, os.path.join(_ROOT, "py_modules"))

import main  # noqa: E402
from cachyupdater import archives, constants as C, ed25519, parsing  # noqa: E402
from cachyupdater import minisign as minisign_mod  # noqa: E402
from cachyupdater import settings as settings_store  # noqa: E402
from cachyupdater import state as state_store  # noqa: E402
from cachyupdater import upgrade as upgrade_mod  # noqa: E402
from cachyupdater.deckyshim import decky  # noqa: E402


def run(coro):
    return asyncio.run(coro)


# ---- fixtures ----

@pytest.fixture
def env(tmp_path, monkeypatch):
    """Redirect every filesystem path the backend touches into tmp_path."""
    settings_file = tmp_path / "settings" / "settings.json"
    settings_file.parent.mkdir()
    monkeypatch.setattr(settings_store, "SETTINGS_FILE", str(settings_file))
    settings_store._settings_cache["stat"] = None
    settings_store._settings_cache["data"] = None

    state_dir = tmp_path / "var-lib"
    monkeypatch.setattr(C, "STATE_DIR", str(state_dir))
    monkeypatch.setattr(C, "CHECK_DB_DIR", str(state_dir / "db"))
    monkeypatch.setattr(state_store, "STATE_FILE", str(state_dir / "state.json"))
    monkeypatch.setattr(C, "LOG_DIR", str(tmp_path / "var-log"))
    monkeypatch.setattr(C, "RUN_DIR", str(tmp_path / "run"))
    monkeypatch.setattr(C, "UPGRADE_STATUS_FILE", str(tmp_path / "run" / "upgrade.status"))

    pacman_db = tmp_path / "pacman"
    (pacman_db / "local").mkdir(parents=True)
    # start_upgrade refuses without a pacman binary; point the constant at a
    # stand-in file so the refusal logic is testable on any host.
    fake_pacman = tmp_path / "bin" / "pacman"
    fake_pacman.parent.mkdir()
    fake_pacman.write_text("#!/bin/sh\nexit 0\n")
    monkeypatch.setattr(C, "PACMAN", str(fake_pacman))

    yield {
        "tmp": tmp_path,
        "settings_file": settings_file,
        "state_dir": state_dir,
        "pacman_db": pacman_db,
    }
    settings_store._settings_cache["stat"] = None
    settings_store._settings_cache["data"] = None


@pytest.fixture
def plugin(env, monkeypatch):
    p = main.Plugin()
    p._dbpath_cache = str(env["pacman_db"])
    monkeypatch.setattr(p, "_running_kernel_modules_present", lambda: True)
    monkeypatch.setattr(p, "_running_kernel", lambda: "6.17.4-2-cachyos-deckify")
    return p


class FakeRunner:
    """Stub for Plugin._run_cmd: match on a command prefix, record calls."""

    def __init__(self):
        self.rules = []
        self.calls = []

    def when(self, *prefix, stdout="", stderr="", rc=0):
        self.rules.append((tuple(prefix), {"success": rc == 0, "stdout": stdout, "stderr": stderr, "returncode": rc}))
        return self

    def __call__(self, cmd, timeout=10, env_extra=None):
        self.calls.append(list(cmd))
        for prefix, result in self.rules:
            if tuple(cmd[: len(prefix)]) == prefix:
                return dict(result)
        return {"success": False, "stdout": "", "stderr": f"unexpected command {cmd}", "returncode": 127}


@pytest.fixture
def emitted(monkeypatch):
    events = []

    async def fake_emit(event, *args):
        events.append((event, args))

    monkeypatch.setattr(decky, "emit", fake_emit)
    return events


QU_OUTPUT = """pacman-mirrorlist 20260213-1 -> 20260610-1
which 2.23-1 -> 2.25-1
linux-cachyos-deckify 6.17.3-1 -> 6.17.4-2
mesa 1:25.3.1-1 -> 1:25.3.2-1
linux-cachyos-deckify-headers 6.17.3-1 -> 6.17.4-2 [ignored]
"""

SUP_OUTPUT = """pacman-mirrorlist|20260610-1|6631|core
which|2.25-1|16798|core
linux-cachyos-deckify|6.17.4-2|152000000|cachyos
mesa|1:25.3.2-1|31000000|extra
"""

# Captured from a real `pacman -Syu --noconfirm --noprogressbar` (pacman 7.1).
REAL_UPGRADE_LOG = """== CachyOS Updater: system upgrade started 2026-09-08T18:00:00+00:00
:: Synchronizing package databases...
 cachyos downloading...
 core downloading...
 extra downloading...
 multilib downloading...
:: Starting full system upgrade...
warning: zstd: local (1.5.7-3) is newer than cachyos (1.5.7-2)
resolving dependencies...
looking for conflicting packages...

Package (2)             Old Version  New Version  Net Change  Download Size

core/pacman-mirrorlist  20260213-1   20260610-1     0.00 MiB       0.01 MiB
core/which              2.23-1       2.25-1         0.00 MiB       0.02 MiB

Total Download Size:   0.02 MiB
Total Installed Size:  0.06 MiB
Net Upgrade Size:      0.00 MiB

:: Proceed with installation? [Y/n] 
:: Retrieving packages...
 which-2.25-1-x86_64 downloading...
 pacman-mirrorlist-20260610-1-any downloading...
checking keyring...
checking package integrity...
loading package files...
checking for file conflicts...
:: Processing package changes...
upgrading pacman-mirrorlist...
warning: /etc/pacman.d/mirrorlist installed as /etc/pacman.d/mirrorlist.pacnew
upgrading which...
:: Running post-transaction hooks...
(1/2) Arming ConditionNeedsUpdate...
(2/2) Updating the info directory file...
== CachyOS Updater: pacman exited with 0 at 2026-09-08T18:00:40+00:00
"""


# ---- parsing: pacman output ----

def test_parse_qu_output_skips_ignored_and_noise():
    updates = parsing.parse_qu_output("warning: foo\n" + QU_OUTPUT)
    names = [u["name"] for u in updates]
    assert names == ["pacman-mirrorlist", "which", "linux-cachyos-deckify", "mesa"]
    assert updates[3] == {"name": "mesa", "old_version": "1:25.3.1-1", "new_version": "1:25.3.2-1"}


def test_parse_sup_and_merge():
    extra = parsing.parse_sup_output(SUP_OUTPUT + "garbage line\n")
    assert extra["mesa"] == {"download_size": 31000000, "repo": "extra"}
    merged = parsing.merge_update_info(parsing.parse_qu_output(QU_OUTPUT), extra)
    by_name = {u["name"]: u for u in merged}
    assert by_name["which"]["download_size"] == 16798
    assert by_name["which"]["repo"] == "core"
    assert by_name["linux-cachyos-deckify"]["repo"] == "cachyos"


def test_updates_signature_is_order_independent_and_version_sensitive():
    a = [{"name": "a", "new_version": "1"}, {"name": "b", "new_version": "2"}]
    b = list(reversed(a))
    assert parsing.updates_signature(a) == parsing.updates_signature(b)
    c = [{"name": "a", "new_version": "1"}, {"name": "b", "new_version": "3"}]
    assert parsing.updates_signature(a) != parsing.updates_signature(c)
    assert parsing.updates_signature([]) == ""


# ---- parsing: classification ----

@pytest.mark.parametrize("name,group", [
    ("linux-cachyos-deckify", "kernel"),
    ("linux-cachyos", "kernel"),
    ("linux-firmware", "kernel"),
    ("amd-ucode", "kernel"),
    ("mesa", "graphics"),
    ("lib32-mesa", "graphics"),
    ("vulkan-radeon", "graphics"),
    ("gamescope", "gaming"),
    ("steam", "gaming"),
    ("proton-cachyos", "gaming"),
    ("mangohud", "gaming"),
    ("hhd", "handheld"),
    ("inputplumber", "handheld"),
    ("steamos-manager", "handheld"),
    ("systemd", "system"),
    ("glibc", "system"),
    ("pipewire-pulse", "system"),
    ("which", None),
    ("pacman-mirrorlist", None),
    ("linux-cachyos-deckify-headers", None),  # excluded: headers
    ("linux-api-headers", None),
    ("mesa-docs", None),
])
def test_classify_package_groups(name, group):
    assert parsing.classify_package(name) == group


def test_classify_custom_patterns_win_over_exclusions():
    assert parsing.classify_package("heroic-games-launcher", "heroic* lutris") == "custom"
    assert parsing.classify_package("lutris", "heroic*, lutris") == "custom"
    assert parsing.classify_package("linux-cachyos-headers", "*-headers") == "custom"
    assert parsing.classify_package("which", "heroic*") is None


def test_classify_updates_orders_relevant_first():
    classified = parsing.classify_updates(parsing.parse_qu_output(QU_OUTPUT))
    assert [u["name"] for u in classified] == ["linux-cachyos-deckify", "mesa", "pacman-mirrorlist", "which"]
    assert classified[0]["relevant"] and classified[0]["category"] == "kernel"
    assert not classified[-1]["relevant"] and classified[-1]["category"] is None


def test_split_and_invalid_patterns():
    assert parsing.split_patterns("Heroic*, lutris  heroic*") == ["heroic*", "lutris"]
    assert parsing.invalid_custom_patterns("ab heroic* x") == ["ab", "x"]


def test_reboot_recommended():
    assert parsing.reboot_recommended(["which", "linux-cachyos-deckify"])
    assert parsing.reboot_recommended(["mesa"])
    assert parsing.reboot_recommended(["gamescope"])
    assert parsing.reboot_recommended(["hhd"])
    assert not parsing.reboot_recommended(["which", "pacman-mirrorlist", "mangohud"])
    assert not parsing.reboot_recommended(["linux-cachyos-headers"])


# ---- parsing: upgrade log ----

def test_parse_real_upgrade_log_complete():
    p = parsing.parse_upgrade_log(REAL_UPGRADE_LOG)
    assert p["total"] == 2
    assert p["downloaded"] == 2  # db downloads during sync are not counted
    assert p["processed"] == 2
    assert p["upgraded"] == ["pacman-mirrorlist", "which"]
    assert p["hooks_done"] == 2 and p["hooks_total"] == 2
    assert p["pacnew"] == 1
    assert p["errors"] == []
    assert p["exit_code"] == 0
    assert p["phase"] == "done" and p["percent"] == 100


def test_parse_partial_upgrade_log_progress():
    cut = REAL_UPGRADE_LOG.split(":: Processing package changes...")[0]
    p = parsing.parse_upgrade_log(cut)
    assert p["phase"] == "verify"
    assert 50 <= p["percent"] < 55
    assert p["exit_code"] is None

    cut = REAL_UPGRADE_LOG.split("upgrading which...")[0]
    p = parsing.parse_upgrade_log(cut)
    assert p["phase"] == "install"
    assert p["processed"] == 1
    assert p["label"] == "Upgrading pacman-mirrorlist"
    assert 55 < p["percent"] < 92

    p = parsing.parse_upgrade_log(":: Synchronizing package databases...\n core downloading...\n")
    assert p["phase"] == "sync" and p["downloaded"] == 0 and p["percent"] == 2


def test_parse_upgrade_log_errors_and_nothing_to_do():
    text = (
        ":: Synchronizing package databases...\n"
        "error: failed to synchronize all databases (unable to lock database)\n"
        "== CachyOS Updater: pacman exited with 1 at now\n"
    )
    p = parsing.parse_upgrade_log(text)
    assert p["errors"] == ["failed to synchronize all databases (unable to lock database)"]
    assert p["exit_code"] == 1
    p = parsing.parse_upgrade_log(":: Starting full system upgrade...\n there is nothing to do\n")
    assert p["nothing_to_do"]


def test_parse_upgrade_log_old_packages_header():
    p = parsing.parse_upgrade_log("Packages (3) a-1  b-2  c-3\n")
    assert p["total"] == 3


# ---- parsing: versions and scheduling ----

def test_version_compare():
    assert parsing.is_newer_version("0.2.0", "0.1.9")
    assert parsing.is_newer_version("v1.0.0", "0.9.12")
    assert not parsing.is_newer_version("0.1.0", "0.1.0")
    assert not parsing.is_newer_version("0.1.0-beta", "0.1.0")
    assert parsing.version_tuple("garbage") == (0,)


def test_should_run_interval_check():
    now = 1_000_000.0
    assert not parsing.should_run_interval_check(0, 0, now)
    assert parsing.should_run_interval_check(1, now - 3601, now)
    assert not parsing.should_run_interval_check(6, now - 3601, now)
    assert parsing.should_run_interval_check(6, 0, now)
    assert not parsing.should_run_interval_check("bogus", 0, now)


def test_detect_resume():
    assert not parsing.detect_resume(None, 5.0, 20)
    assert not parsing.detect_resume(5.0, 5.5, 20)   # normal tick jitter
    assert parsing.detect_resume(5.0, 900.0, 20)     # slept ~15 min


def test_decide_notification():
    kw = dict(signature="abc", last_notified_signature="", last_notified_at=0, now=1000.0, remind_interval=86400)
    assert parsing.decide_notification(1, 3, False, **kw)
    assert parsing.decide_notification(0, 3, False, **kw)
    assert not parsing.decide_notification(0, 3, True, **kw)          # gaming-only, nothing relevant
    assert parsing.decide_notification(1, 3, True, **kw)
    assert not parsing.decide_notification(1, 0, False, **kw)         # nothing pending
    # unchanged set: remind only after the interval
    assert not parsing.decide_notification(1, 3, False, "abc", "abc", 1000.0 - 100, 1000.0, 86400)
    assert parsing.decide_notification(1, 3, False, "abc", "abc", 1000.0 - 90000, 1000.0, 86400)


# ---- settings / state persistence ----

def test_load_settings_missing_returns_defaults(env):
    settings = settings_store.load_settings()
    assert settings == C.DEFAULT_SETTINGS
    assert settings is not C.DEFAULT_SETTINGS


def test_settings_roundtrip_merge_and_strip(env):
    env["settings_file"].write_text(json.dumps({"check_interval_hours": 12, "stale": 1}))
    settings = settings_store.load_settings()
    assert settings["check_interval_hours"] == 12
    assert "stale" not in settings
    assert settings["gaming_only_notify"] is False
    settings_store.update_settings_fields(gaming_only_notify=True)
    assert settings_store.load_settings()["gaming_only_notify"] is True


@pytest.mark.parametrize("content", ["{not json", json.dumps([1, 2, 3])])
def test_load_settings_corrupt_backs_up_file(env, content):
    env["settings_file"].write_text(content)
    assert settings_store.load_settings() == C.DEFAULT_SETTINGS
    assert (env["settings_file"].parent / "settings.json.corrupt").read_text() == content


def test_save_settings_ignores_planted_tmp_symlink(env, tmp_path):
    target = tmp_path / "victim.txt"
    target.write_text("precious")
    os.symlink(target, env["settings_file"].parent / "settings.json.tmp")
    settings_store.save_settings(dict(C.DEFAULT_SETTINGS))
    assert target.read_text() == "precious"
    assert json.loads(env["settings_file"].read_text())["check_interval_hours"] == 6


def test_state_roundtrip_and_upgrade_merge(env):
    state = state_store.load_state()
    assert state == C.DEFAULT_STATE
    state_store.update_state_fields(last_check_at=42, updates=[{"name": "x"}])
    state_store.update_upgrade_state(state="running", started_at=7, bogus=1)
    reloaded = state_store.load_state()
    assert reloaded["last_check_at"] == 42
    assert reloaded["updates"] == [{"name": "x"}]
    assert reloaded["upgrade"]["state"] == "running"
    assert reloaded["upgrade"]["started_at"] == 7
    assert "bogus" not in reloaded["upgrade"]
    assert reloaded["upgrade"]["acknowledged"] is True  # default filled in
    mode = oct(os.stat(env["state_dir"]).st_mode & 0o777)
    assert mode == "0o700"


def test_state_unreadable_falls_back_to_defaults(env):
    env["state_dir"].mkdir()
    (env["state_dir"] / "state.json").write_text("{nope")
    assert state_store.load_state() == C.DEFAULT_STATE


# ---- checker ----

def _install_check_runner(plugin, monkeypatch, qu=QU_OUTPUT, sup=SUP_OUTPUT, sync_rc=0, qu_rc=0, qu_stderr=""):
    runner = FakeRunner()
    runner.when(C.PACMAN, "-Sy", rc=sync_rc, stderr="error: failed retrieving file" if sync_rc else "")
    runner.when(C.PACMAN, "-Qu", stdout=qu, rc=qu_rc, stderr=qu_stderr)
    runner.when(C.PACMAN, "-Sup", stdout=sup)
    monkeypatch.setattr(plugin, "_run_cmd", runner)
    return runner


def test_prepare_check_db_symlinks_local(plugin, env):
    db = plugin._prepare_check_db()
    link = os.path.join(db, "local")
    assert os.path.islink(link)
    assert os.readlink(link) == str(env["pacman_db"] / "local")
    # a wrong pre-existing link is replaced
    os.remove(link)
    os.symlink("/nonexistent", link)
    plugin._prepare_check_db()
    assert os.readlink(link) == str(env["pacman_db"] / "local")
    assert oct(os.stat(db).st_mode & 0o777) == "0o700"


def test_check_updates_sync_success(plugin, env, monkeypatch):
    runner = _install_check_runner(plugin, monkeypatch)
    result = plugin._check_updates_sync()
    assert result["success"]
    names = [u["name"] for u in result["updates"]]
    assert names == ["pacman-mirrorlist", "which", "linux-cachyos-deckify", "mesa"]
    assert result["updates"][3]["download_size"] == 31000000
    sync_cmd = runner.calls[0]
    assert sync_cmd[:2] == [C.PACMAN, "-Sy"]
    assert "--dbpath" in sync_cmd and sync_cmd[sync_cmd.index("--dbpath") + 1] == C.CHECK_DB_DIR
    assert "--logfile" in sync_cmd and sync_cmd[sync_cmd.index("--logfile") + 1] == "/dev/null"
    assert runner.calls[1][:4] == [C.PACMAN, "-Qu", "--dbpath", C.CHECK_DB_DIR]


def test_prepare_check_db_removes_stale_lock(plugin, env):
    db = plugin._prepare_check_db()
    stale = os.path.join(db, "db.lck")
    open(stale, "w").close()
    plugin._prepare_check_db()
    assert not os.path.exists(stale)


def test_check_updates_sync_no_updates_exit_1(plugin, env, monkeypatch):
    runner = _install_check_runner(plugin, monkeypatch, qu="", qu_rc=1)
    result = plugin._check_updates_sync()
    assert result["success"] and result["updates"] == []
    assert not any(c[:2] == [C.PACMAN, "-Sup"] for c in runner.calls)


def test_check_updates_sync_failures(plugin, env, monkeypatch):
    _install_check_runner(plugin, monkeypatch, sync_rc=1)
    result = plugin._check_updates_sync()
    assert not result["success"] and result["error"] == "sync_failed"
    _install_check_runner(plugin, monkeypatch, qu="", qu_rc=1, qu_stderr="error: could not open database")
    result = plugin._check_updates_sync()
    assert not result["success"] and result["error"] == "query_failed"


def test_run_check_persists_state_and_notifies(plugin, env, monkeypatch, emitted):
    _install_check_runner(plugin, monkeypatch)
    result = run(plugin.check_for_updates())
    assert result["success"] and result["updates_count"] == 4 and result["relevant_count"] == 2
    assert result["notify"] is True
    state = state_store.load_state()
    assert state["last_check_ok"] and state["last_check_trigger"] == "manual"
    assert len(state["updates"]) == 4
    assert state["last_notified_signature"] == state["updates_signature"] != ""
    assert emitted and emitted[-1][0] == "cachyos_updater_check"
    payload = emitted[-1][1][0]
    assert payload["notify"] and payload["relevant_names"] == ["linux-cachyos-deckify", "mesa"]

    # Same set again: no second toast, state still updated.
    emitted.clear()
    result = run(plugin.check_for_updates())
    assert result["notify"] is False
    assert emitted[-1][1][0]["notify"] is False


def test_run_check_gaming_only_suppresses_irrelevant(plugin, env, monkeypatch, emitted):
    settings_store.update_settings_fields(gaming_only_notify=True)
    _install_check_runner(plugin, monkeypatch, qu="which 2.23-1 -> 2.25-1\n", sup="which|2.25-1|16798|core\n")
    result = run(plugin.check_for_updates())
    assert result["updates_count"] == 1 and result["relevant_count"] == 0
    assert result["notify"] is False
    assert state_store.load_state()["last_notified_signature"] == ""


def test_run_check_automatic_trigger_is_deduplicated(plugin, env, monkeypatch, emitted):
    runner = _install_check_runner(plugin, monkeypatch)
    state_store.update_state_fields(last_check_at=time.time())
    result = run(plugin._run_check("wake"))
    assert result["skipped"]
    assert runner.calls == []
    result = run(plugin._run_check("wake", force=True))
    assert result["success"] and not result.get("skipped")


def test_run_check_refuses_when_pacman_locked_or_upgrading(plugin, env, monkeypatch, emitted):
    runner = _install_check_runner(plugin, monkeypatch)
    (env["pacman_db"] / "db.lck").touch()
    result = run(plugin.check_for_updates())
    assert not result["success"] and result["error"] == "pacman_locked"
    assert runner.calls == []
    (env["pacman_db"] / "db.lck").unlink()
    state_store.update_upgrade_state(state="running")
    result = run(plugin.check_for_updates())
    assert result["error"] == "upgrade_running"


def test_run_check_failure_recorded(plugin, env, monkeypatch, emitted):
    _install_check_runner(plugin, monkeypatch, sync_rc=1)
    result = run(plugin.check_for_updates())
    assert not result["success"]
    state = state_store.load_state()
    assert state["last_check_ok"] is False
    assert "databases" in state["last_check_error"]
    assert emitted[-1][1][0]["success"] is False and emitted[-1][1][0]["notify"] is False


# ---- upgrade ----

def _install_upgrade_runner(plugin, monkeypatch, active="inactive", systemd_run_rc=0, props=""):
    runner = FakeRunner()
    runner.when(C.SYSTEMCTL, "is-active", stdout=active, rc=0 if active == "active" else 3)
    runner.when(C.SYSTEMCTL, "reset-failed")
    runner.when(C.SYSTEMCTL, "show", stdout=props)
    runner.when(C.SYSTEMD_RUN, rc=systemd_run_rc, stderr="boom" if systemd_run_rc else "")
    monkeypatch.setattr(plugin, "_run_cmd", runner)
    return runner


def test_start_upgrade_launches_transient_unit(plugin, env, monkeypatch, emitted):
    runner = _install_upgrade_runner(plugin, monkeypatch)
    result = run(plugin.start_upgrade())
    assert result["success"], result
    cmd = next(c for c in runner.calls if c[0] == C.SYSTEMD_RUN)
    assert f"--unit={C.UPGRADE_UNIT}" in cmd
    assert "--property=Type=exec" in cmd
    assert "--setenv=LC_ALL=C" in cmd
    assert f"--setenv=CACHYUPD_STATUS_FILE={C.UPGRADE_STATUS_FILE}" in cmd
    log_prop = next(a for a in cmd if a.startswith("--property=StandardOutput=append:"))
    log_path = log_prop.split("append:", 1)[1]
    assert log_path.startswith(C.LOG_DIR) and os.path.isfile(log_path)
    assert cmd[-3:-1] == [C.BASH, "-c"]
    script = cmd[-1]
    assert "/usr/bin/pacman -Syu --noconfirm --noprogressbar" in script
    assert "systemd-inhibit" in script and "$CACHYUPD_STATUS_FILE" in script
    # fixed text: nothing interpolated
    assert script == upgrade_mod._UPGRADE_SCRIPT
    # reset-failed ran before the launch
    assert [c[:2] for c in runner.calls if c[0] == C.SYSTEMCTL][0] == [C.SYSTEMCTL, "reset-failed"]
    up = state_store.load_state()["upgrade"]
    assert up["state"] == "running" and up["log_path"] == log_path and up["acknowledged"] is False


def test_start_upgrade_refusals(plugin, env, monkeypatch, emitted):
    runner = _install_upgrade_runner(plugin, monkeypatch)
    (env["pacman_db"] / "db.lck").touch()
    result = run(plugin.start_upgrade())
    assert result["error"] == "pacman_locked"
    assert not any(c[0] == C.SYSTEMD_RUN for c in runner.calls)
    (env["pacman_db"] / "db.lck").unlink()

    runner = _install_upgrade_runner(plugin, monkeypatch, active="active")
    state_store.update_upgrade_state(state="running", log_path="")
    result = run(plugin.start_upgrade())
    assert result["error"] == "upgrade_running"

    state_store.update_upgrade_state(state="idle")
    runner = _install_upgrade_runner(plugin, monkeypatch, systemd_run_rc=1)
    result = run(plugin.start_upgrade())
    assert result["error"] == "systemd_run_failed"
    assert state_store.load_state()["upgrade"]["state"] == "idle"
    assert not any(f.startswith("upgrade-") for f in os.listdir(C.LOG_DIR))


def test_start_upgrade_refuses_during_check(plugin, env, monkeypatch):
    _install_upgrade_runner(plugin, monkeypatch)
    plugin._ensure_check_state()
    plugin._check_in_progress = True
    assert run(plugin.start_upgrade())["error"] == "check_running"


def _seed_running_upgrade(env, log_text):
    os.makedirs(C.LOG_DIR, exist_ok=True)
    log_path = os.path.join(C.LOG_DIR, "upgrade-test.log")
    with open(log_path, "w") as f:
        f.write(log_text)
    state_store.update_upgrade_state(state="running", started_at=time.time() - 30, log_path=log_path, acknowledged=False)
    return log_path


def _silence_post_check(plugin, monkeypatch):
    calls = []

    async def fake_run_check(trigger, force=False):
        calls.append(trigger)
        return {"success": True}

    monkeypatch.setattr(plugin, "_run_check", fake_run_check)
    return calls


def test_refresh_upgrade_state_while_running_reports_progress(plugin, env, monkeypatch, emitted):
    _install_upgrade_runner(plugin, monkeypatch, active="active")
    _seed_running_upgrade(env, REAL_UPGRADE_LOG.split("upgrading which...")[0])
    up = run(plugin._refresh_upgrade_state())
    assert up["state"] == "running"
    assert up["progress"]["phase"] == "install" and up["progress"]["processed"] == 1
    assert emitted == []


def test_refresh_upgrade_state_finalizes_success_with_status_file(plugin, env, monkeypatch, emitted):
    _install_upgrade_runner(plugin, monkeypatch, active="inactive")
    post_checks = _silence_post_check(plugin, monkeypatch)
    _seed_running_upgrade(env, REAL_UPGRADE_LOG.replace("upgrading which...", "upgrading linux-cachyos-deckify..."))
    os.makedirs(C.RUN_DIR)
    with open(C.UPGRADE_STATUS_FILE, "w") as f:
        f.write("0\n")
    up = run(plugin._refresh_upgrade_state())
    assert up["state"] == "succeeded" and up["exit_code"] == 0
    assert up["upgraded"] == ["pacman-mirrorlist", "linux-cachyos-deckify"]
    assert up["pacnew"] == 1
    assert up["reboot_recommended"] is True and up["reboot_required"] is False
    assert up["acknowledged"] is False
    assert "2 packages upgraded" in up["message"]
    assert emitted[-1][0] == "cachyos_updater_upgrade"
    assert emitted[-1][1][0]["state"] == "succeeded" and emitted[-1][1][0]["reboot_recommended"]
    assert post_checks == ["post-upgrade"]
    # idempotent: a second refresh does not emit again
    emitted.clear()
    assert run(plugin._refresh_upgrade_state())["state"] == "succeeded"
    assert emitted == []


def test_refresh_upgrade_state_uses_log_marker_without_status_file(plugin, env, monkeypatch, emitted):
    _install_upgrade_runner(plugin, monkeypatch, active="inactive")
    _silence_post_check(plugin, monkeypatch)
    _seed_running_upgrade(env, REAL_UPGRADE_LOG)  # marker says exit 0, no status file (e.g. after reboot)
    up = run(plugin._refresh_upgrade_state())
    assert up["state"] == "succeeded" and up["exit_code"] == 0
    assert up["reboot_recommended"] is False


def test_refresh_upgrade_state_kernel_replaced_requires_reboot(plugin, env, monkeypatch, emitted):
    _install_upgrade_runner(plugin, monkeypatch, active="inactive")
    _silence_post_check(plugin, monkeypatch)
    monkeypatch.setattr(plugin, "_running_kernel_modules_present", lambda: False)
    _seed_running_upgrade(env, REAL_UPGRADE_LOG)
    up = run(plugin._refresh_upgrade_state())
    assert up["reboot_required"] is True and up["reboot_recommended"] is True


def test_refresh_upgrade_state_failed_run(plugin, env, monkeypatch, emitted):
    props = "LoadState=loaded\nActiveState=failed\nResult=exit-code\nExecMainStatus=1\n"
    _install_upgrade_runner(plugin, monkeypatch, active="failed", props=props)
    _silence_post_check(plugin, monkeypatch)
    log = (
        ":: Synchronizing package databases...\n"
        "error: failed to synchronize all databases (unable to lock database)\n"
    )
    _seed_running_upgrade(env, log)
    up = run(plugin._refresh_upgrade_state())
    assert up["state"] == "failed" and up["exit_code"] == 1
    assert "unable to lock database" in up["message"]
    assert emitted[-1][1][0]["state"] == "failed"


def test_refresh_upgrade_state_interrupted(plugin, env, monkeypatch, emitted):
    props = "LoadState=not-found\nActiveState=inactive\nResult=success\nExecMainStatus=0\n"
    _install_upgrade_runner(plugin, monkeypatch, active="inactive", props=props)
    _silence_post_check(plugin, monkeypatch)
    _seed_running_upgrade(env, ":: Retrieving packages...\n foo-1 downloading...\n")
    up = run(plugin._refresh_upgrade_state())
    assert up["state"] == "interrupted" and up["exit_code"] is None
    assert emitted[-1][1][0]["state"] == "interrupted"


def test_dismiss_and_reboot_guards(plugin, env, monkeypatch, emitted):
    runner = _install_upgrade_runner(plugin, monkeypatch, active="active")
    state_store.update_upgrade_state(state="running", log_path="")
    assert run(plugin.dismiss_upgrade_result())["success"] is False
    assert run(plugin.reboot_system())["success"] is False
    assert not any(c[:2] == [C.SYSTEMCTL, "reboot"] for c in runner.calls)

    state_store.update_upgrade_state(state="succeeded", acknowledged=False)
    runner = _install_upgrade_runner(plugin, monkeypatch, active="inactive")
    runner.when(C.SYSTEMCTL, "reboot")
    assert run(plugin.dismiss_upgrade_result())["success"]
    assert state_store.load_state()["upgrade"]["acknowledged"] is True
    assert run(plugin.reboot_system())["success"]
    assert [C.SYSTEMCTL, "reboot"] in runner.calls


def test_rotate_upgrade_logs_keeps_newest(plugin, env):
    os.makedirs(C.LOG_DIR)
    for i in range(8):
        path = os.path.join(C.LOG_DIR, f"upgrade-{i}.log")
        with open(path, "w") as f:
            f.write("x")
        os.utime(path, (1000 + i, 1000 + i))
    plugin._rotate_upgrade_logs(keep=3)
    assert sorted(os.listdir(C.LOG_DIR)) == ["upgrade-5.log", "upgrade-6.log", "upgrade-7.log"]


# ---- scheduler ----

def test_schedule_check_dedupes_pending(plugin, env, monkeypatch):
    calls = []

    async def fake_run_check_with_retry(trigger):
        calls.append(trigger)
        return {"success": True}

    monkeypatch.setattr(plugin, "_run_check_with_retry", fake_run_check_with_retry)

    async def scenario():
        assert plugin._schedule_check("wake", 0.05) is True
        assert plugin._schedule_check("wake", 0.05) is False  # frontend poke while pending
        await asyncio.sleep(0.15)
        assert plugin._schedule_check("interval", 0) is True
        await asyncio.sleep(0.05)

    run(scenario())
    assert calls == ["wake", "interval"]


def test_run_check_with_retry(plugin, env, monkeypatch):
    monkeypatch.setattr(C, "NETWORK_RETRY_DELAY", 0)
    monkeypatch.setattr(C, "NETWORK_RETRIES", 3)
    results = iter([
        {"success": False, "message": "offline"},
        {"success": False, "message": "offline"},
        {"success": True, "updates_count": 0},
    ])
    seen = []
    forced = []

    async def fake_run_check(trigger, force=False):
        seen.append(trigger)
        forced.append(force)
        return next(results)

    monkeypatch.setattr(plugin, "_run_check", fake_run_check)
    result = run(plugin._run_check_with_retry("boot"))
    assert result["success"] and seen == ["boot", "boot", "boot"]
    assert forced == [False, True, True]

    async def skipped(trigger, force=False):
        seen.append("s")
        return {"success": True, "skipped": True}

    seen.clear()
    monkeypatch.setattr(plugin, "_run_check", skipped)
    run(plugin._run_check_with_retry("wake"))
    assert seen == ["s"]


def test_poke_resume_respects_toggle(plugin, env, monkeypatch):
    scheduled = []
    monkeypatch.setattr(plugin, "_schedule_check", lambda trigger, delay: scheduled.append(trigger) or True)
    settings_store.update_settings_fields(check_on_boot_wake=False)
    assert run(plugin.poke_resume()) == {"success": True, "scheduled": False}
    settings_store.update_settings_fields(check_on_boot_wake=True)
    assert run(plugin.poke_resume())["scheduled"] is True
    assert scheduled == ["wake"]


# ---- setters / status ----

def test_setters_validate(plugin, env):
    assert run(plugin.set_check_interval(12))["success"]
    assert settings_store.load_settings()["check_interval_hours"] == 12
    assert run(plugin.set_check_interval(5))["error"] == "invalid_value"
    assert run(plugin.set_check_interval("x"))["error"] == "invalid_value"
    assert run(plugin.set_custom_patterns("Heroic*, lutris"))["custom_patterns"] == "heroic* lutris"
    assert run(plugin.set_custom_patterns("ab heroic*"))["error"] == "invalid_pattern"
    assert run(plugin.set_list_filter("gaming"))["success"]
    assert run(plugin.set_list_filter("weird"))["error"] == "invalid_value"
    assert run(plugin.set_gaming_only_notify(True))["gaming_only_notify"] is True
    assert run(plugin.set_check_on_boot_wake(False))["check_on_boot_wake"] is False


def test_reset_settings_keeps_distro(plugin, env):
    settings_store.update_settings_fields(distro_name="CachyOS", check_interval_hours=24)
    state_store.update_state_fields(last_notified_signature="abc", last_notified_at=5)
    assert run(plugin.reset_settings())["success"]
    settings = settings_store.load_settings()
    assert settings["distro_name"] == "CachyOS" and settings["check_interval_hours"] == 6
    assert state_store.load_state()["last_notified_signature"] == ""


def test_get_status_shape(plugin, env, monkeypatch, emitted):
    _install_check_runner(plugin, monkeypatch)
    run(plugin.check_for_updates())
    _install_upgrade_runner(plugin, monkeypatch)
    settings_store.update_settings_fields(custom_patterns="which")
    status = run(plugin.get_status())
    assert status["success"]
    assert status["kernel_running"] == "6.17.4-2-cachyos-deckify"
    assert status["check"]["relevant_count"] == 3  # kernel, mesa + custom "which"
    assert status["check"]["updates"][0]["relevant"]
    assert status["check"]["total_download_size"] == 6631 + 16798 + 152000000 + 31000000
    assert status["upgrade"]["state"] == "idle"
    assert status["pacman_locked"] is False and status["reboot_required"] is False
    assert status["interval_choices"] == list(C.CHECK_INTERVAL_CHOICES)
    assert {g["id"] for g in status["gaming_groups"]} == set(C.GAMING_PACKAGE_GROUPS)


# ---- plugin self-update ----

def test_check_for_plugin_update(plugin, monkeypatch):
    monkeypatch.setattr(decky, "DECKY_PLUGIN_VERSION", "0.1.0")
    runner = FakeRunner().when(C.CURL, stdout=json.dumps({"tag_name": "v0.2.0", "html_url": "u"}))
    monkeypatch.setattr(plugin, "_run_cmd", runner)
    info = run(plugin.check_for_plugin_update())
    assert info["update_available"] and info["latest_version"] == "0.2.0"
    runner = FakeRunner().when(C.CURL, stdout=json.dumps({"tag_name": "v0.1.0"}))
    monkeypatch.setattr(plugin, "_run_cmd", runner)
    assert run(plugin.check_for_plugin_update())["update_available"] is False
    runner = FakeRunner().when(C.CURL, rc=6)
    monkeypatch.setattr(plugin, "_run_cmd", runner)
    assert run(plugin.check_for_plugin_update())["success"] is False


def test_apply_plugin_update_refuses_without_update_or_bad_version(plugin, monkeypatch):
    async def none_available():
        return {"success": True, "update_available": False}

    monkeypatch.setattr(plugin, "check_for_plugin_update", none_available)
    assert run(plugin.apply_plugin_update())["success"] is False

    async def weird():
        return {"success": True, "update_available": True, "latest_version": "1.0;rm -rf /"}

    monkeypatch.setattr(plugin, "check_for_plugin_update", weird)
    result = run(plugin.apply_plugin_update())
    assert result["success"] is False and "unexpected version" in result["message"]


def test_handoff_script_is_fixed_text_using_env():
    script = main.Plugin._UPDATE_HANDOFF_SCRIPT
    for var in ("CACHYUPD_SRC", "CACHYUPD_PLUGIN_DIR", "CACHYUPD_STAGE", "CACHYUPD_LABEL"):
        assert f'"${var}' in script or f"${var}" in script
    assert "py_modules" in script and "systemctl restart plugin_loader" in script
    assert "{" not in script.replace("${", "")  # no leftover format placeholders


# ---- archives ----

def test_verify_sha256_and_safe_zip(tmp_path):
    payload = tmp_path / "file.zip"
    with zipfile.ZipFile(payload, "w") as z:
        z.writestr("CachyOS Updater/plugin.json", "{}")
    import hashlib
    digest = hashlib.sha256(payload.read_bytes()).hexdigest()
    ok, _ = archives.verify_sha256(f"{digest}  file.zip\n", "file.zip", str(payload))
    assert ok
    ok, detail = archives.verify_sha256("00 other.zip\n", "file.zip", str(payload))
    assert not ok and "no entry" in detail
    archives.safe_extract_zip(str(payload), str(tmp_path / "out"))
    assert (tmp_path / "out" / "CachyOS Updater" / "plugin.json").exists()
    evil = tmp_path / "evil.zip"
    with zipfile.ZipFile(evil, "w") as z:
        z.writestr("../escape.txt", "x")
    with pytest.raises(ValueError):
        archives.safe_extract_zip(str(evil), str(tmp_path / "out2"))


# ---- release signing (ed25519 + minisign) ----

RFC8032_VECTORS = [
    (
        "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
        "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
        "",
        "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b",
    ),
    (
        "4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb",
        "3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c",
        "72",
        "92a009a9f0d4cab8720e820b5f642540a2b27b5416503f8fb3762223ebdb69da085ac1e43e15996e458f3613d0f11d8c387b2eaeb4302aeeb00d291612bb0c00",
    ),
]


@pytest.mark.parametrize("seed,pub,msg,sig", RFC8032_VECTORS)
def test_ed25519_rfc8032_vectors(seed, pub, msg, sig):
    seed, pub, msg, sig = (bytes.fromhex(x) for x in (seed, pub, msg, sig))
    assert ed25519.secret_to_public(seed) == pub
    assert ed25519.sign(seed, msg) == sig
    assert ed25519.verify(pub, msg, sig)
    assert not ed25519.verify(pub, msg + b"x", sig)


TEST_SEED = bytes(range(32))
TEST_KEY_ID = b"\x01\x02\x03\x04\x05\x06\x07\x08"


def test_minisign_roundtrip_and_tamper(tmp_path):
    f = tmp_path / "SHA256SUMS"
    f.write_text("abc  cachyos-updater-0.1.0.zip\n")
    pub_text = minisign_mod.make_public_key_text(TEST_KEY_ID, ed25519.secret_to_public(TEST_SEED))
    sig_text = minisign_mod.sign_file(str(f), TEST_SEED, TEST_KEY_ID, "release v0.1.0")
    assert minisign_mod.verify_file(str(f), sig_text, pub_text) == (True, "")
    f.write_text("tampered\n")
    ok, detail = minisign_mod.verify_file(str(f), sig_text, pub_text)
    assert not ok and detail == "invalid signature"


def test_pinned_pubkey_matches_committed_file():
    with open(os.path.join(_ROOT, "minisign.pub")) as f:
        committed = f.read()
    assert committed.strip() == C.MINISIGN_PUBKEY.strip()
    key_id, pub = minisign_mod.parse_public_key(C.MINISIGN_PUBKEY)
    assert len(key_id) == 8 and len(pub) == 32
    assert "PLACEHOLDER" not in C.MINISIGN_PUBKEY


def test_minisign_cli_refuses_mismatched_seed(tmp_path, monkeypatch):
    f = tmp_path / "SHA256SUMS"
    f.write_text("x\n")
    pubkey_path = tmp_path / "minisign.pub"
    pubkey_path.write_text(minisign_mod.make_public_key_text(TEST_KEY_ID, ed25519.secret_to_public(TEST_SEED)))
    monkeypatch.setenv(minisign_mod.SEED_ENV, base64.standard_b64encode(b"\x42" * 32).decode())
    assert minisign_mod.main(["sign", str(f), str(pubkey_path)]) == 1
    monkeypatch.setenv(minisign_mod.SEED_ENV, base64.standard_b64encode(TEST_SEED).decode())
    assert minisign_mod.main(["sign", str(f), str(pubkey_path), "--trusted-comment", "t"]) == 0
    assert minisign_mod.main(["verify", str(f), str(f) + ".minisig", str(pubkey_path)]) == 0


def test_release_zip_layout_matches_updater_expectation(tmp_path):
    """The self-updater looks for <PLUGIN_DIR_NAME>/plugin.json inside the
    zip; the workflow packs exactly that directory name."""
    with open(os.path.join(_ROOT, ".github", "workflows", "release.yml")) as f:
        workflow = f.read()
    assert f'PLUGIN="{C.PLUGIN_DIR_NAME}"' in workflow
    assert f"{C.ZIP_BASENAME}-$VERSION.zip" in workflow
    with open(os.path.join(_ROOT, "plugin.json")) as f:
        assert json.load(f)["name"] == C.PLUGIN_DIR_NAME
    with open(os.path.join(_ROOT, "install.sh")) as f:
        installer = f.read()
    assert f'PLUGIN_NAME="{C.PLUGIN_DIR_NAME}"' in installer
    assert f'ZIP_BASENAME="{C.ZIP_BASENAME}"' in installer
    assert f'REPO="{C.UPDATE_REPO}"' in installer
