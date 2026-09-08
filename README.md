# CachyOS Updater (Decky plugin)

A [Decky Loader](https://decky.xyz/) plugin that checks for and installs **CachyOS Handheld Edition** system updates straight from Game Mode. No more switching to Desktop Mode just to run `sudo pacman -Syu`.

Steam's built-in "System Update" button does nothing on CachyOS (the `steamos-update` shim always reports "nothing to update"); this plugin fills that gap in the Quick Access Menu.

## Features

- **Check on boot and wake** (toggle, default on): looks for updates ~45 s after boot and ~20 s after the device resumes from sleep, waiting for a network route first and retrying while WiFi comes back. Resume is detected in the backend from the kernel clocks (`CLOCK_BOOTTIME` vs `CLOCK_MONOTONIC`), so it does not depend on Steam client internals; Steam's own resume hook is used as a fast path when available.
- **Manual check**: a *Check now* button in the panel.
- **Periodic check**: off / every 1, 3, 6 (default), 12 or 24 hours while the device stays on; the panel shows when the next one is due.
- **Notifications**: *All updates* (default), *Gaming-relevant only* or *Off*. Gaming-relevant means the pending set contains something that matters for gaming - kernel & firmware (`linux-cachyos*`, `linux-firmware`, microcode), the graphics stack (Mesa, Vulkan, libdrm, LLVM, Xwayland), Steam & tools (steam, gamescope, Proton/Wine, MangoHud, gamemode, DXVK/vkd3d), handheld integration (hhd, InputPlumber, steamos-*, jupiter-*, cachyos-handheld) and core system pieces (systemd, glibc, PipeWire, BlueZ, scx-scheds). Add your own globs (e.g. `heroic* lutris`). All updates are still listed and installed together - pacman never does partial upgrades.
- **Install from Game Mode**: runs `pacman -Syu --noconfirm` as its own transient systemd service with a sleep/shutdown inhibitor, so it survives Decky/Steam restarts and the device won't suspend mid-transaction. Live progress (download / install / hooks) in the panel, result toast when done. Refused while offline, below 25 % battery without a charger, or while another package manager holds the pacman lock.
- **Conflict preview**: the check also resolves the upgrade transaction (`pacman -Sup`); if pacman could not do it non-interactively, the panel says so instead of letting the install fail.
- **Reboot awareness**: detects a replaced running kernel (reboot required) and recommends a reboot after kernel/graphics/Steam updates, with a *Reboot now* button that stays until the device has actually rebooted.
- **Toast notifications** even while the panel is closed; toasts that fire before Steam's UI is loaded are delivered when it comes up, and an unchanged pending set is re-announced at most once a day.
- **Stale lock recovery**: a `db.lck` left behind by a crash or power loss is detected (no package manager running) and can be removed from the panel.
- **Self-update** from GitHub Releases with a pinned minisign key (see below).

## How the check works

Like `checkupdates` from pacman-contrib: the package databases are synced into a private, root-owned copy under `/var/lib/cachyos-updater/db` and diffed against the installed packages with `pacman -Qu`. pacman's download sandbox (`DownloadUser = alpm`) is kept, so the directory is 0755 like `/var/lib/pacman`. The system's own sync databases are never touched, so a later `pacman -S foo` from Desktop Mode cannot become an accidental partial upgrade, and no pacman lock is taken. `IgnorePkg` entries are respected.

## Install

[Decky Loader](https://decky.xyz/) must be installed first. Then open Desktop Mode > terminal (or a TTY with Ctrl+Alt+F3) once and run:

```bash
curl -sL https://github.com/bassobr/Decky-CachyOS-Updater/raw/main/install.sh -o /tmp/cachyos-updater-install.sh && sudo bash /tmp/cachyos-updater-install.sh
```

This downloads the latest release zip, verifies it against the release's `SHA256SUMS` (a release without checksums is refused), installs it to `~/homebrew/plugins/CachyOS Updater` and restarts Decky. Only if no release exists at all does it fall back to the (unverified) `main` branch tarball. Switch back to Game Mode and open the Quick Access Menu (**...** button) > Decky > CachyOS Updater.

**Updating the plugin:** the panel checks GitHub for a newer plugin release when opened (at most every 30 minutes). Tap *Update plugin to vX.Y.Z* and it downloads, verifies, stages and swaps the new version, then restarts Decky (all plugins reload for a few seconds; internet required). A failed download or copy leaves the installed version untouched. Running the install command again also works.

## Using it

1. Open the panel. It shows the distro, running kernel and when the last check ran.
2. *Check now*, or wait for the next automatic check. Pending updates are listed with the gaming-relevant ones first and tagged by category; the list can be filtered (*All packages* / *Gaming-relevant only*, remembered) and grows in pages so a large sync stays navigable with the D-pad.
3. *Install N updates* > confirm. The confirmation names the gaming-relevant packages, warns about kernel updates, a running game and a low battery. Progress shows in the panel; you can close the menu or keep playing (a game that gets its Mesa/Steam files swapped underneath may misbehave until restarted, so finish games first).
4. When it's done you get a toast. If the kernel, graphics stack or Steam components changed, reboot from the panel.

If pacman needs a decision `--noconfirm` can't make (a real package conflict), the run fails and the panel tells you to run `sudo pacman -Syu` from Desktop Mode or a TTY once; a network or mirror failure gets a *Try again* button instead. *Show log* opens the last 80 lines of pacman's output. `.pacnew` files are counted in the result; review them as you normally would.

While an upgrade runs the device will not suspend (a systemd inhibitor is held) and the screen stays on. Upgrade logs are kept in `/var/log/cachyos-updater/` (last 5 runs).

## Troubleshooting

- **Logs.** pacman output of the last five runs: `/var/log/cachyos-updater/upgrade-*.log`. Plugin log (backend errors, scheduler decisions): `~/homebrew/logs/CachyOS Updater/`. The upgrade runs as the systemd unit `cachyos-updater-upgrade.service` (`systemctl status cachyos-updater-upgrade`, `journalctl -u cachyos-updater-upgrade`). Runtime state lives in `/var/lib/cachyos-updater/state.json`.
- **Copy diagnostics** (panel footer) collects all of the above plus versions and pending packages, copies it to the clipboard and writes `/var/log/cachyos-updater/diagnostics.json`.
- **"A stale pacman lock is blocking..."** `/var/lib/pacman/db.lck` exists but no package manager is running - typically after a power loss mid-transaction. Tap *Remove stale lock*; if a package manager really is running (Desktop Mode terminal, pamac) wait for it instead.
- **"Couldn't reach the package mirrors."** The device is online but the mirrors did not answer. Wait a moment and *Check now* again; if it persists, refresh the mirror list from Desktop Mode (`cachyos-rate-mirrors`).
- **The check right after boot failed.** Boot and wake checks wait up to 10 minutes for a network route and retry five times two minutes apart, so a check that raced the WiFi reconnect resolves itself. Nothing is stored for an offline attempt.
- **"Reboot required" although you did not update from the panel.** The running kernel's module directory is gone, i.e. a kernel update was installed from Desktop Mode or by another tool. Reboot when convenient.
- **"These updates can't be installed automatically."** `pacman -Sup` could not resolve the transaction (dependency or file conflict). Run `sudo pacman -Syu` once from Desktop Mode or a TTY (Ctrl+Alt+F3) and answer pacman's questions there.
- **Install button greyed out.** One of: a check is running, the pacman lock is held, no network, battery below 25 % without a charger, the pending list is being refreshed after an upgrade, or the conflict preview failed.

## Security notes

- The plugin runs as root (Decky `root` flag) because pacman does. It executes only fixed absolute binaries (`/usr/bin/pacman`, `/usr/bin/systemd-run`, `/usr/bin/systemctl`, `/usr/bin/curl`) with argument lists - no shell interpolation of package names or anything read from the network.
- State that root produces and consumes (pending list, upgrade bookkeeping, the private DB copy) lives root-owned under `/var/lib/cachyos-updater`, not in the user-writable Decky settings directory. Writes into the settings directory are symlink-safe.
- The upgrade wrapper is fixed script text passed to bash as an argument; paths reach it through the unit's environment.
- **Signed, verified plugin updates:** releases ship a minisign signature (`SHA256SUMS.minisig`) created by CI. The self-updater verifies it against the public key pinned inside the plugin ([`minisign.pub`](minisign.pub)) before trusting the checksums, then checks the zip against `SHA256SUMS`. To verify manually: `minisign -Vm SHA256SUMS -p minisign.pub`. The installer relies on TLS + repo trust for the first install; signature pinning protects every update after that.

## Uninstall

Decky settings > CachyOS Updater > Uninstall (removes `/var/lib/cachyos-updater`, `/run/cachyos-updater`, `/var/log/cachyos-updater` and the plugin's settings), or manually:

```bash
rm -rf ~/homebrew/plugins/CachyOS\ Updater
sudo rm -rf /var/lib/cachyos-updater /var/log/cachyos-updater /run/cachyos-updater
sudo systemctl restart plugin_loader
```

A system upgrade that is still running is never killed by uninstalling.

## Building from source

Requires Node.js and pnpm (the exact version is pinned in `package.json`'s `packageManager` field).

```bash
git clone https://github.com/bassobr/Decky-CachyOS-Updater.git
cd Decky-CachyOS-Updater
pnpm i
pnpm run build
```

Backend tests run with `python3 -m pytest tests/ -q` (they stub pacman/systemd; nothing touches the host).

To deploy to your device, copy `.vscode/defsettings.json` to `.vscode/settings.json`, fill in its IP and password, then use the VS Code **builddeploy** task (Terminal > Run Task).

### Releasing

Bump `version` in `package.json`, commit, tag `vX.Y.Z` and push the tag. CI builds, tests, packages `cachyos-updater-X.Y.Z.zip`, signs `SHA256SUMS` with the `MINISIGN_SEED` repository secret and publishes the GitHub release the installer and self-updater consume.

## Project layout

```
main.py                      Decky entry point: composes the Plugin class, lifecycle
py_modules/cachyupdater/     backend (one module per domain, see __init__.py)
src/                         React/TypeScript frontend for the Quick Access Menu
tests/                       pytest suite for the backend
install.sh                   one-line installer (release zip + checksum)
.github/workflows/release.yml  build, test, package, sign, release
```

## License

BSD 3-Clause. See [LICENSE](LICENSE).

### Third-party licenses

The built `dist/index.js` bundles [@decky/ui](https://www.npmjs.com/package/@decky/ui) and [@decky/api](https://www.npmjs.com/package/@decky/api) (LGPL-2.1), [react-icons](https://www.npmjs.com/package/react-icons) (MIT), and [tslib](https://www.npmjs.com/package/tslib) (0BSD). This repository contains the full source and build instructions, satisfying the LGPL's relink/modify requirements. `py_modules/cachyupdater/ed25519.py` and `minisign.py` are shared with [Decky-Wifi-Streaming-Optimizer](https://github.com/bassobr/Decky-Wifi-Streaming-Optimizer) (BSD-3-Clause).
