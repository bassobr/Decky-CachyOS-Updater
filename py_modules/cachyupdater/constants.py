"""Paths, timings, package-classification tables, and defaults.

Single source of truth for everything the backend, the tests, and the
release tooling have to agree on.
"""

import re

# ---- Plugin self-update ----------------------------------------------------

# GitHub repo that hosts the releases the in-app updater installs from. An
# empty string disables self-update entirely.
UPDATE_REPO = "bassobr/Decky-CachyOS-Updater"
# plugin.json "name" == install directory name == top-level dir in the zip.
PLUGIN_DIR_NAME = "CachyOS Updater"
# Release asset: <ZIP_BASENAME>-<version>.zip (see .github/workflows/release.yml).
ZIP_BASENAME = "cachyos-updater"

# Version strings arriving from the GitHub API are embedded in download URLs
# and exported to a root shell via the environment; allow plain version
# characters only.
VERSION_RE = re.compile(r"^[0-9A-Za-z._-]{1,64}$")

# Release-signing public key (minisign format). CI signs each release's
# SHA256SUMS with the corresponding seed (GitHub secret MINISIGN_SEED); the
# updater refuses updates whose signature doesn't verify against this pinned
# key (trust-on-first-use: the first install trusts TLS+GitHub, every update
# after that trusts only this key). Must stay identical to the committed
# minisign.pub - a test asserts that.
MINISIGN_PUBKEY = """untrusted comment: minisign public key 28D4B2644BFD4216
RWQo1LJkS/1CFqBaM1o4CkH1wpy84SRy8P997iCagOJEQd9MrsWachDq
"""

# ---- System binaries (absolute paths; the backend runs as root) ------------

PACMAN = "/usr/bin/pacman"
PACMAN_CONF = "/usr/bin/pacman-conf"
SYSTEMCTL = "/usr/bin/systemctl"
SYSTEMD_RUN = "/usr/bin/systemd-run"
SYSTEMD_INHIBIT = "/usr/bin/systemd-inhibit"
BASH = "/bin/bash"
CURL = "/usr/bin/curl"

DEFAULT_PACMAN_DBPATH = "/var/lib/pacman"

# ---- Plugin-owned system paths ---------------------------------------------

# Root-owned state (0755, like /var/lib/pacman): the private copy of the
# sync databases used for update checks plus state.json. Everything under
# here is written by root and never lives in a user-writable directory; it
# stays world-traversable because pacman >= 7 downloads as the unprivileged
# DownloadUser into dbpath/sync.
STATE_DIR = "/var/lib/cachyos-updater"
CHECK_DB_DIR = STATE_DIR + "/db"
STATE_FILE = STATE_DIR + "/state.json"
# Upgrade logs (pacman output), readable by the user for troubleshooting.
LOG_DIR = "/var/log/cachyos-updater"
UPGRADE_LOG_KEEP = 5
# Volatile per-boot data: the exit status the upgrade wrapper leaves behind.
RUN_DIR = "/run/cachyos-updater"
UPGRADE_STATUS_FILE = RUN_DIR + "/upgrade.status"
# Transient systemd unit that runs pacman, detached from plugin_loader.
UPGRADE_UNIT = "cachyos-updater-upgrade"

# ---- Scheduling ------------------------------------------------------------

SCHEDULER_TICK = 30            # seconds between scheduler loop iterations
BOOT_CHECK_DELAY = 45          # let WiFi come up before the boot check
BOOT_UPTIME_MAX = 600          # _main within this uptime counts as a boot
WAKE_GAP_THRESHOLD = 20        # BOOTTIME-MONOTONIC jump that counts as a suspend
WAKE_CHECK_DELAY = 20          # let WiFi reconnect after resume
MIN_CHECK_SPACING = 120        # automatic triggers this close to the last check are skipped
NETWORK_RETRY_DELAY = 120      # boot/wake checks retry on network failure
NETWORK_RETRIES = 5
NOTIFY_REMIND_INTERVAL = 24 * 3600   # re-toast an unchanged pending set at most daily
CHECK_INTERVAL_CHOICES = (0, 1, 3, 6, 12, 24)  # hours; 0 = off
NOTIFY_MODES = ("all", "gaming", "off")
NETWORK_WAIT_MAX = 600         # boot/wake: how long to wait for a default route
NETWORK_POLL = 15              # ... polling this often (cheap /proc read)
PENDING_TOAST_MAX_AGE = 3 * 24 * 3600  # undelivered toasts older than this are dropped

PACMAN_SYNC_TIMEOUT = 240
PACMAN_QUERY_TIMEOUT = 90
UPGRADE_LOG_TAIL_BYTES = 128 * 1024        # progress polling reads the tail only
UPGRADE_LOG_FINAL_MAX_BYTES = 4 * 1024 * 1024  # finalization reads the whole log (bounded)

# A pacman transaction that dies with the battery is the one thing the sleep
# inhibitor can't prevent; refuse to start below this unless on AC.
LOW_BATTERY_PERCENT = 25
POWER_SUPPLY_DIR = "/sys/class/power_supply"
PROC_NET_ROUTE = "/proc/net/route"
PROC_NET_IPV6_ROUTE = "/proc/net/ipv6_route"
PROC_DIR = "/proc"
# Processes that legitimately hold pacman's database lock.
PACKAGE_MANAGER_COMMS = ("pacman", "pamac", "pamac-daemon", "paru", "yay", "pikaur", "pacman-key", "makepkg", "cachy-update")

# ---- Package classification ------------------------------------------------

# Gaming-relevant packages, matched as case-insensitive globs against package
# names. The "gaming-relevant only" mode notifies only when at least one
# pending update matches one of these (or the user's custom patterns).
GAMING_PACKAGE_GROUPS = {
    "kernel": {
        "label": "Kernel & firmware",
        "patterns": [
            "linux", "linux-lts", "linux-zen", "linux-hardened",
            "linux-cachyos*", "linux-firmware*", "amd-ucode", "intel-ucode",
            "sof-firmware", "steamdeck-firmware",
        ],
    },
    "graphics": {
        "label": "Graphics stack",
        "patterns": [
            "mesa*", "lib32-mesa*", "vulkan-*", "lib32-vulkan-*",
            "libdrm", "lib32-libdrm", "llvm-libs", "lib32-llvm-libs",
            "xorg-xwayland", "wayland", "lib32-wayland",
            "libglvnd", "lib32-libglvnd", "nvidia*", "lib32-nvidia*",
        ],
    },
    "gaming": {
        "label": "Steam & gaming tools",
        "patterns": [
            "steam", "steam-native-runtime", "gamescope*", "lib32-gamescope*",
            "proton*", "wine*", "lib32-wine*", "umu-launcher", "winetricks",
            "mangohud", "lib32-mangohud", "gamemode", "lib32-gamemode",
            "vkbasalt", "lib32-vkbasalt", "dxvk*", "vkd3d*",
            "sdl2*", "sdl3*", "lib32-sdl2*", "lib32-sdl3*",
        ],
    },
    "handheld": {
        "label": "Handheld integration",
        "patterns": [
            "hhd*", "inputplumber", "steamos-*", "steam-jupiter*", "jupiter-*",
            "cachyos-handheld*", "cachyos-deckify*", "powerbuttond",
            "steamdeck-dsp", "galileo-mura", "decky-loader",
        ],
    },
    "system": {
        "label": "Core system",
        "patterns": [
            "systemd", "systemd-libs", "glibc", "lib32-glibc",
            "pipewire*", "lib32-pipewire*", "wireplumber", "bluez*",
            "scx-scheds*", "cachyos-settings",
        ],
    },
}

# Never gaming-relevant even if a group glob matches (headers, docs, debug).
CLASSIFY_EXCLUDE_PATTERNS = ["*-headers", "*-docs", "*-debug", "*-dbg"]

# Custom user patterns shorter than this match half the repo ("li" matches
# everything with lib in the name) and would pin the notification mode open.
MIN_PATTERN_LEN = 3

# A successful upgrade of one of these recommends a reboot even when the
# running kernel is still installed (the running-kernel check below catches
# the hard "reboot required" case).
REBOOT_RECOMMENDED_GROUPS = ("kernel", "graphics", "system")
REBOOT_RECOMMENDED_PATTERNS = [
    "gamescope*", "lib32-gamescope*", "steam", "hhd*", "inputplumber",
    "steamos-*", "jupiter-hw-support", "powerbuttond",
]

# ---- Defaults --------------------------------------------------------------

DEFAULT_SETTINGS = {
    "check_on_boot_wake": True,
    "check_interval_hours": 6,
    "notify_mode": "all",           # "all" | "gaming" | "off"
    "custom_patterns": "",
    "list_filter": "all",           # "all" | "gaming" (UI list filter)
    "distro_id": "unknown",
    "distro_name": "Unknown",
    "last_applied": 0,
}

DEFAULT_UPGRADE_STATE = {
    "state": "idle",                # idle | running | succeeded | failed | interrupted
    "started_at": 0,
    "finished_at": 0,
    "exit_code": None,
    "log_path": "",
    "upgraded": [],
    "pacnew": 0,
    "errors": [],
    "reboot_required": False,
    "reboot_recommended": False,
    "message": "",
    "failure_kind": "",             # network | lock | conflict | keyring | space | unknown | ""
    "acknowledged": True,
}

DEFAULT_STATE = {
    "last_check_at": 0,
    "last_check_trigger": "",
    "last_check_ok": False,
    "last_check_error": "",
    "last_check_detail": "",
    "last_check_kind": "",
    "resolve_error": "",            # pacman -Sup failed: -Syu would fail the same way
    "updates": [],
    "updates_signature": "",
    "last_notified_signature": "",
    "last_notified_at": 0,
    # Toasts the frontend has not pulled yet (it may not have been loaded when
    # the backend emitted the event): one slot per kind.
    "pending_toasts": {},
    "upgrade": dict(DEFAULT_UPGRADE_STATE),
}
