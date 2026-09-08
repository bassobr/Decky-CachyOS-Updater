# Security Policy

This Decky Loader plugin runs with **root privileges** on end-user devices
and starts `pacman -Syu` as a system service. Security reports are taken
seriously.

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting**:

https://github.com/bassobr/Decky-CachyOS-Updater/security/advisories/new

Do **not** open public issues for security problems. This is a solo-maintained
project - reports are handled on a best-effort basis, typically within a week.

## Supported versions

Only the **latest release** receives security fixes. The in-app updater moves
installations forward; if you are on an old version, update via the plugin or
reinstall with `install.sh`.

## Release integrity

- Releases are built by CI and ship `SHA256SUMS` plus a minisign signature
  (`SHA256SUMS.minisig`).
- The self-updater verifies the signature against the public key pinned in
  the plugin ([`minisign.pub`](minisign.pub)) before trusting any checksum,
  and refuses unsigned releases.
- To verify a release manually: `minisign -Vm SHA256SUMS -p minisign.pub`

## Scope notes for researchers

Particularly interesting areas: the root-privileged backend
(`py_modules/cachyupdater/`, entry `main.py`), the transient-unit launcher and
its fixed wrapper script (`upgrade.py`), the update check's private database
copy (`checker.py`), the self-update pipeline (`updates.py`, `archives.py`,
`minisign.py`, `ed25519.py`), and file handling around the user-writable
settings directory (`settings.py`).
