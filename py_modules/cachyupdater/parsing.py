"""Pure parsers and decision helpers - no I/O, fully unit-tested.

pacman output formats (LC_ALL=C, pacman >= 6):
  pacman -Qu                     name old_version -> new_version [ignored]
  pacman -Sup --print-format     name|new_version|download_bytes|repo
  pacman -Syu --noprogressbar    see parse_upgrade_log for the markers
"""

import collections
import fnmatch
import hashlib
import re

from . import constants as C

_QU_RE = re.compile(r"^(\S+)\s+(\S+)\s+->\s+(\S+)(?:\s+\[ignored\])?\s*$")
_QU_IGNORED_RE = re.compile(r"\[ignored\]\s*$")


def parse_qu_output(text: str) -> list[dict]:
    """Parse `pacman -Qu` into [{name, old_version, new_version}], skipping
    IgnorePkg entries (they are listed with an [ignored] suffix and would not
    be upgraded by -Syu)."""
    updates = []
    for line in (text or "").splitlines():
        line = line.strip()
        if not line or line.startswith(("warning:", "error:")):
            continue
        if _QU_IGNORED_RE.search(line):
            continue
        m = _QU_RE.match(line)
        if not m:
            continue
        updates.append({
            "name": m.group(1),
            "old_version": m.group(2),
            "new_version": m.group(3),
        })
    return updates


def parse_sup_output(text: str) -> dict:
    """Parse `pacman -Sup --print-format '%n|%v|%s|%r'` into
    {name: {download_size, repo}}. Malformed lines are skipped."""
    info = {}
    for line in (text or "").splitlines():
        parts = line.strip().split("|")
        if len(parts) < 4:
            continue
        name, _version, size, repo = parts[0], parts[1], parts[2], parts[3]
        try:
            size_int = int(size)
        except ValueError:
            size_int = 0
        info[name] = {"download_size": size_int, "repo": repo}
    return info


def merge_update_info(updates: list[dict], extra: dict) -> list[dict]:
    """Attach download size/repo from parse_sup_output to the -Qu list."""
    merged = []
    for u in updates:
        e = extra.get(u["name"], {})
        merged.append({
            **u,
            "download_size": int(e.get("download_size", 0) or 0),
            "repo": e.get("repo", ""),
        })
    return merged


def updates_signature(updates: list[dict]) -> str:
    """Stable fingerprint of a pending set (name + target version)."""
    if not updates:
        return ""
    items = sorted(f"{u['name']}={u.get('new_version', '')}" for u in updates)
    return hashlib.sha1("\n".join(items).encode()).hexdigest()


# ---- classification ----

def split_patterns(text: str) -> list[str]:
    """Space/comma separated globs -> list (lowercased, deduplicated)."""
    seen = []
    for tok in (text or "").replace(",", " ").split():
        tok = tok.lower()
        if tok not in seen:
            seen.append(tok)
    return seen


def invalid_custom_patterns(text: str) -> list[str]:
    return [t for t in split_patterns(text) if len(t) < C.MIN_PATTERN_LEN]


def _matches_any(name: str, patterns) -> bool:
    return any(fnmatch.fnmatchcase(name, p) for p in patterns)


def classify_package(name: str, custom_patterns: str = "") -> str | None:
    """Return the gaming-relevance group of a package ("kernel", "graphics",
    ..., "custom") or None. Custom patterns win over the exclusion list so a
    user can deliberately track e.g. linux-cachyos-headers."""
    lname = (name or "").lower()
    if _matches_any(lname, split_patterns(custom_patterns)):
        return "custom"
    if _matches_any(lname, C.CLASSIFY_EXCLUDE_PATTERNS):
        return None
    for group, spec in C.GAMING_PACKAGE_GROUPS.items():
        if _matches_any(lname, spec["patterns"]):
            return group
    return None


def classify_updates(updates: list[dict], custom_patterns: str = "") -> list[dict]:
    """Annotate each update with category/relevant; relevant ones first,
    then alphabetical."""
    out = []
    for u in updates:
        cat = classify_package(u.get("name", ""), custom_patterns)
        out.append({**u, "category": cat, "relevant": cat is not None})
    out.sort(key=lambda u: (not u["relevant"], u.get("name", "")))
    return out


def reboot_recommended(upgraded_names: list[str], custom_patterns: str = "") -> bool:
    for name in upgraded_names:
        lname = name.lower()
        if _matches_any(lname, C.CLASSIFY_EXCLUDE_PATTERNS):
            continue
        if _matches_any(lname, C.REBOOT_RECOMMENDED_PATTERNS):
            return True
        for group in C.REBOOT_RECOMMENDED_GROUPS:
            if _matches_any(lname, C.GAMING_PACKAGE_GROUPS[group]["patterns"]):
                return True
    return False


# ---- upgrade log ----

# (marker, phase id, human label). Order matters only for readability; the
# parser tracks whichever marker appeared last.
UPGRADE_PHASES = [
    (":: Synchronizing package databases", "sync", "Synchronizing package databases"),
    (":: Starting full system upgrade", "resolve", "Resolving upgrade"),
    ("resolving dependencies", "resolve", "Resolving dependencies"),
    ("looking for conflicting packages", "resolve", "Checking for conflicts"),
    (":: Retrieving packages", "download", "Downloading packages"),
    ("checking keyring", "verify", "Verifying signatures"),
    ("checking package integrity", "verify", "Verifying package integrity"),
    ("loading package files", "verify", "Loading package files"),
    ("checking for file conflicts", "verify", "Checking for file conflicts"),
    ("checking available disk space", "verify", "Checking disk space"),
    (":: Running pre-transaction hooks", "prehooks", "Running pre-transaction hooks"),
    (":: Processing package changes", "install", "Installing updates"),
    (":: Running post-transaction hooks", "hooks", "Running post-transaction hooks"),
]

_PHASE_BASE = {
    "start": 0, "sync": 2, "resolve": 6, "download": 8, "verify": 50,
    "prehooks": 53, "install": 55, "hooks": 92, "done": 100,
}
_PKG_HEADER_RE = re.compile(r"^Packages? \((\d+)\)")
_DOWNLOAD_RE = re.compile(r"^ (\S+) downloading\.\.\.")
_CHANGE_RE = re.compile(r"^(upgrading|installing|reinstalling|downgrading|removing) (\S+)\.\.\.")
_HOOK_RE = re.compile(r"^\((\d+)/(\d+)\) ")
_PACNEW_RE = re.compile(r"installed as .*\.pacnew")
_ERROR_RE = re.compile(r"^error: (.*)$")
_EXIT_RE = re.compile(r"^== CachyOS Updater: pacman exited with (-?\d+)")


def parse_upgrade_log(text: str) -> dict:
    """Progress snapshot from a (possibly partial) `pacman -Syu
    --noprogressbar` log. Percent is a coarse estimate weighted by phase and
    by processed/total packages."""
    phase = "start"
    label = "Starting"
    total = 0
    downloaded = 0
    processed = 0
    hooks_done = 0
    hooks_total = 0
    pacnew = 0
    # Keep the LAST errors: pacman prints one line per failed mirror and the
    # useful summary ("failed to synchronize all databases ...") comes last.
    errors: collections.deque = collections.deque(maxlen=8)
    upgraded: list[str] = []
    nothing_to_do = False
    exit_code = None
    last_line = ""

    for raw in (text or "").splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue
        last_line = line.strip()
        for marker, pid, plabel in UPGRADE_PHASES:
            if line.startswith(marker):
                phase, label = pid, plabel
                break
        m = _PKG_HEADER_RE.match(line)
        if m:
            total = int(m.group(1))
            continue
        if phase == "download":
            if _DOWNLOAD_RE.match(line):
                downloaded += 1
                continue
        m = _CHANGE_RE.match(line)
        if m:
            processed += 1
            if m.group(1) != "removing":
                upgraded.append(m.group(2))
            label = f"{m.group(1).capitalize()} {m.group(2)}"
            continue
        m = _HOOK_RE.match(line)
        if m and phase in ("hooks", "prehooks"):
            hooks_done, hooks_total = int(m.group(1)), int(m.group(2))
            continue
        if _PACNEW_RE.search(line):
            pacnew += 1
            continue
        m = _ERROR_RE.match(line)
        if m:
            errors.append(m.group(1).strip())
            continue
        if line.strip() == "there is nothing to do":
            nothing_to_do = True
            continue
        m = _EXIT_RE.match(line)
        if m:
            exit_code = int(m.group(1))
            phase = "done"
            label = "Finished"

    percent = _PHASE_BASE.get(phase, 0)
    if total > 0:
        if phase == "download":
            percent = 8 + int(42 * min(downloaded, total) / total)
        elif phase == "install":
            percent = 55 + int(37 * min(processed, total) / total)
    if phase == "hooks" and hooks_total > 0:
        percent = 92 + int(8 * min(hooks_done, hooks_total) / hooks_total)
    if phase == "done":
        percent = 100

    return {
        "phase": phase,
        "label": label,
        "total": total,
        "downloaded": downloaded,
        "processed": processed,
        "hooks_done": hooks_done,
        "hooks_total": hooks_total,
        "percent": max(0, min(100, percent)),
        "pacnew": pacnew,
        "errors": list(errors),
        "upgraded": upgraded,
        "nothing_to_do": nothing_to_do,
        "exit_code": exit_code,
        "last_line": last_line[:200],
    }


# ---- failure classification ----

# Order matters: the first matching kind wins. The kind drives the advice the
# UI shows ("try again" vs. "this needs Desktop Mode").
FAILURE_KINDS = [
    ("lock", re.compile(r"unable to lock database|db\.lck", re.I)),
    ("space", re.compile(r"not enough free disk space|no space left", re.I)),
    ("keyring", re.compile(r"signature|keyring|PGP|marginal trust|unknown trust|invalid or corrupted", re.I)),
    ("conflict", re.compile(
        r"conflicting files|exists in filesystem|unresolvable package conflicts|breaks dependency|"
        r"could not satisfy dependencies|unresolvable|removing .* breaks", re.I)),
    ("network", re.compile(
        r"failed retrieving file|failed to synchronize all databases|download library error|"
        r"could not resolve host|connection timed out|failed to retrieve some files|"
        r"transfer closed|no address record|network is unreachable|temporary failure in name resolution", re.I)),
]


def classify_failure(lines) -> str:
    """Map pacman error lines to a failure kind (see FAILURE_KINDS); "" for
    no errors, "unknown" when none of the patterns match."""
    text = "\n".join(l for l in (lines or []) if l)
    if not text.strip():
        return ""
    for kind, pattern in FAILURE_KINDS:
        if pattern.search(text):
            return kind
    return "unknown"


# ---- versions (plugin self-update) ----

def version_tuple(v: str) -> tuple:
    """'1.2.3-beta' -> (1, 2, 3); non-numeric parts count as 0."""
    core = (v or "").strip().lstrip("v").split("-")[0]
    out = []
    for part in core.split("."):
        try:
            out.append(int(part))
        except ValueError:
            out.append(0)
    return tuple(out)


def is_newer_version(latest: str, current: str) -> bool:
    return version_tuple(latest) > version_tuple(current)


# ---- scheduling decisions ----

def should_run_interval_check(interval_hours: int, last_check_at: float, now: float) -> bool:
    """Wall-clock based so an interval that elapsed during suspend fires on
    the first tick after resume."""
    try:
        hours = int(interval_hours)
    except (TypeError, ValueError):
        return False
    if hours <= 0:
        return False
    return (now - float(last_check_at or 0)) >= hours * 3600


def detect_resume(prev_gap: float | None, gap: float | None, threshold: float) -> bool:
    """CLOCK_BOOTTIME keeps counting through suspend, CLOCK_MONOTONIC does
    not; a jump in their difference means the device slept in between."""
    if prev_gap is None or gap is None:
        return False
    return (gap - prev_gap) >= threshold


def decide_notification(
    updates_relevant_count: int,
    updates_total: int,
    notify_mode: str,
    signature: str,
    last_notified_signature: str,
    last_notified_at: float,
    now: float,
    remind_interval: float,
) -> bool:
    """Toast when there is something new to say: the pending set changed, or
    an unchanged set has not been mentioned for remind_interval. Mode "off"
    never notifies; "gaming" only when relevant packages are pending."""
    if updates_total <= 0:
        return False
    if notify_mode == "off":
        return False
    if notify_mode == "gaming" and updates_relevant_count <= 0:
        return False
    if signature != last_notified_signature:
        return True
    return (now - float(last_notified_at or 0)) >= remind_interval
