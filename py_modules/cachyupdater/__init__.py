"""CachyOS Updater backend package.

Decky Loader puts the plugin's py_modules/ directory on sys.path, which makes
this package importable from main.py. main.py stays the thin entry point that
composes the Plugin class from the mixins defined here; each module owns one
domain:

- deckyshim     decky import with a local fallback stub
- constants     paths, timings, package-classification tables, defaults
- settings      settings.json persistence (symlink-safe, thread-safe)
- state         root-owned runtime state (last check result, upgrade run)
- system        subprocess runner and small system probes
- parsing       pure parsers: pacman output, upgrade log, versions, globs
- checker       the update check (private sync DB copy + pacman -Qu)
- upgrade       the system upgrade as a detached transient systemd unit
- scheduler     boot / wake / interval triggers and notification decisions
- status        the UI status snapshot and diagnostics
- setters       settings setters
- updates       plugin self-update (signed release zip from GitHub)
- archives      checksum verification and traversal-safe extraction
- minisign      minisign-compatible signing/verification (pure Python)
- ed25519       vendored RFC 8032 Ed25519

Keep this file free of imports so `import cachyupdater` stays a cheap probe.
"""
