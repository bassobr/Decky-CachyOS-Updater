"""decky import with a local fallback.

Every module gets decky through this shim so the whole package shares one
object - tests monkeypatch attributes on it and see consistent state.
"""

try:
    import decky
except ImportError:
    # Local fallback when decky isn't importable (e.g., running outside
    # plugin_loader for static analysis or tests). All runtime paths on the
    # device have the real module.
    class decky:  # type: ignore
        DECKY_PLUGIN_SETTINGS_DIR = "/tmp/cachyos-updater"
        DECKY_PLUGIN_DIR = "/tmp/cachyos-updater"
        DECKY_PLUGIN_VERSION = "0.0.0"

        class logger:
            @staticmethod
            def info(msg):
                print(f"[INFO] {msg}")

            @staticmethod
            def warning(msg):
                print(f"[WARN] {msg}")

            @staticmethod
            def error(msg):
                print(f"[ERROR] {msg}")

        @staticmethod
        async def emit(event, *args):
            print(f"[EMIT] {event} {args}")
