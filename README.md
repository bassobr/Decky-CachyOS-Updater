# CachyOS Updater (Decky plugin)

A [Decky Loader](https://decky.xyz/) plugin that checks for and installs **CachyOS Handheld Edition** system updates straight from Game Mode. No more switching to Desktop Mode just to run `sudo pacman -Syu`.

Steam's built-in "System Update" button does nothing on CachyOS (the `steamos-update` shim always reports "nothing to update"); this plugin fills that gap in the Quick Access Menu.

## Features

- **Check on boot and wake** (toggle): looks for updates ~45 s after boot and ~20 s after the device resumes from sleep, retrying while WiFi comes back. Resume is detected in the backend from the kernel clocks (`CLOCK_BOOTTIME` vs `CLOCK_MONOTONIC`), so it does not depend on Steam client internals; Steam's own resume hook is used as a fast path when available.
- **Manual check**: a *Check now* button in the panel.
- **Periodic check**: off / every 1, 3, 6, 12 or 24 hours while the device stays on.
- **Gaming-relevant only** (toggle): only notify when the pending set contains something that matters for gaming - kernel & firmware (`linux-cachyos*`, `linux-firmware`, microcode), the graphics stack (Mesa, Vulkan, libdrm, LLVM, Xwayland), Steam & tools (steam, gamescope, Proton/Wine, MangoHud, gamemode, DXVK/vkd3d), handheld integration (hhd, InputPlumber, steamos-*, jupiter-*, cachyos-handheld) and core system pieces (systemd, glibc, PipeWire, BlueZ, scx-scheds). Add your own globs (e.g. `heroic* lutris`). All updates are still listed and installed together - pacman never does partial upgrades.
- **Install from Game Mode**: runs `pacman -Syu --noconfirm` as its own transient systemd service with a sleep/shutdown inhibitor, so it survives Decky/Steam restarts and the device won't suspend mid-transaction. Live progress (download / install / hooks) in the panel, result toast when done.
- **Reboot awareness**: detects a replaced running kernel (reboot required) and recommends a reboot after kernel/graphics/Steam updates, with a *Reboot now* button.
- **Toast notifications** even while the panel is closed; an unchanged pending set is re-announced at most once a day.
- **Self-update** from GitHub Releases with a pinned minisign key (see below).

## How the check works

Like `checkupdates` from pacman-contrib: the package databases are synced into a private, root-owned copy under `/var/lib/cachyos-updater/db` and diffed against the installed packages with `pacman -Qu`. pacman's download sandbox (`DownloadUser = alpm`) is kept, so the directory is 0755 like `/var/lib/pacman`. The system's own sync databases are never touched, so a later `pacman -S foo` from Desktop Mode cannot become an accidental partial upgrade, and no pacman lock is taken. `IgnorePkg` entries are respected.

## Install

[Decky Loader](https://decky.xyz/) must be installed first. Then open Desktop Mode > terminal (or a TTY with Ctrl+Alt+F3) once and run:

```bash
curl -sL https://github.com/bassobr/Decky-CachyOS-Updater/raw/main/install.sh -o /tmp/cachyos-updater-install.sh && sudo bash /tmp/cachyos-updater-install.sh
```

This downloads the latest release zip, verifies it against the release's `SHA256SUMS`, installs it to `~/homebrew/plugins/CachyOS Updater` and restarts Decky. Switch back to Game Mode and open the Quick Access Menu (**...** button) > Decky > CachyOS Updater.

**Updating the plugin:** the panel checks GitHub for a newer plugin release when opened. Tap *Update plugin* and it installs and restarts itself. Running the install command again also works.

## Using it

1. Open the panel. It shows the distro, running kernel and when the last check ran.
2. *Check now*, or wait for the next automatic check. Pending updates are listed with the gaming-relevant ones first and tagged by category; the list can be filtered.
3. *Install N updates* > confirm. Progress shows in the panel; you can close the menu or keep playing (a game that gets its Mesa/Steam files swapped underneath may misbehave until restarted, so the confirmation asks you to finish games first).
4. When it's done you get a toast. If the kernel, graphics stack or Steam components changed, reboot from the panel.

If pacman needs a decision `--noconfirm` can't make (a real package conflict), the run fails and the panel tells you to run `sudo pacman -Syu` from Desktop Mode or a TTY once. `.pacnew` files are counted in the result; review them as you normally would.

Upgrade logs are kept in `/var/log/cachyos-updater/` (last 5 runs).

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
