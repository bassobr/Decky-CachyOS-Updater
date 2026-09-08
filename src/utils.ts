// Format a Unix-seconds timestamp as a relative-time string ("just now",
// "5 min ago", "2 hr ago", "3d ago"). Returns "never" for the sentinel 0.
export function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Rough "in 2 hr" / "in 25 min" for a future Unix-seconds timestamp; "soon"
// when it is already due.
export function timeUntil(ts: number): string {
  const diff = ts - Math.floor(Date.now() / 1000);
  if (diff <= 60) return "soon";
  if (diff < 3600) return `in ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `in ${Math.round(diff / 3600)} hr`;
  return `in ${Math.round(diff / 86400)}d`;
}

// Bytes -> "12.3 MiB" style string for download sizes.
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

// Human label for the check trigger stored by the backend.
export function triggerLabel(trigger: string): string {
  switch (trigger) {
    case "boot":
      return "after boot";
    case "wake":
      return "after wake";
    case "interval":
      return "scheduled";
    case "manual":
      return "manual";
    case "post-upgrade":
      return "after upgrade";
    default:
      return "";
  }
}

// Duration in seconds -> "3 min 12 s".
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "";
  const s = Math.floor(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return rest ? `${m} min ${rest} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

// Reject a backend call that never settles (Decky reconnect, killed
// backend) so UI locks are always released.
export function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      },
    );
  });
}

// pacman failures that need a human in Desktop Mode / a TTY, as opposed to
// transient network or mirror problems that "Try again" solves.
const MANUAL_INTERVENTION_RE =
  /conflict|exists in filesystem|unresolvable|invalid or corrupted|signature|keyring|marginal trust|not enough free disk|breaks dependency|could not satisfy/i;

export function needsManualIntervention(errors: string[], message: string): boolean {
  return [...errors, message].some((e) => MANUAL_INTERVENTION_RE.test(e));
}
