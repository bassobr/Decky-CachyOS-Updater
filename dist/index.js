const manifest = {"name":"CachyOS Updater"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const addEventListener = api.addEventListener;
const removeEventListener = api.removeEventListener;
const toaster = api.toaster;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaDownload (props) {
  return GenIcon({"attr":{"viewBox":"0 0 512 512"},"child":[{"tag":"path","attr":{"d":"M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"},"child":[]}]})(props);
}

const getStatus = callable("get_status");
const checkForUpdates = callable("check_for_updates");
const startUpgrade = callable("start_upgrade");
const getUpgradeLog = callable("get_upgrade_log");
const dismissUpgradeResult = callable("dismiss_upgrade_result");
const rebootSystem = callable("reboot_system");
const pokeResume = callable("poke_resume");
const pullPendingNotifications = callable("pull_pending_notifications");
const clearStaleLock = callable("clear_stale_pacman_lock");
const setCheckOnBootWake = callable("set_check_on_boot_wake");
const setCheckInterval = callable("set_check_interval");
const setNotifyMode = callable("set_notify_mode");
const setCustomPatterns = callable("set_custom_patterns");
const setListFilter = callable("set_list_filter");
const resetSettings = callable("reset_settings");
const checkForPluginUpdate = callable("check_for_plugin_update");
const applyPluginUpdate = callable("apply_plugin_update");
const getDiagnosticInfo = callable("get_diagnostic_info");

// Human labels for the backend's classification groups.
const CATEGORY_LABELS = {
    kernel: "Kernel",
    graphics: "Graphics",
    gaming: "Gaming",
    handheld: "Handheld",
    system: "System",
    custom: "Custom",
};
const DECKY_LOG_DIR = "~/homebrew/logs/CachyOS Updater/";
const UPGRADE_LOG_DIR = "/var/log/cachyos-updater/";

// Design tokens for the CachyOS Updater panel: the four semantic banner
// colors (success/warning/error/info) that Decky's Quick Access Menu renders
// well against its dark background, plus neutral text/surface scales.
const theme = {
    // Status colors - used for banners, badges, and text callouts.
    // Each family has text (solid), bg (panel background at ~8% alpha),
    // badgeBg (chip/pill background at ~15% alpha), and border (~20% alpha).
    success: {
        text: "#3fc56e",
        bg: "rgba(29,158,117,0.08)",
        badgeBg: "rgba(29,158,117,0.15)",
        border: "rgba(29,158,117,0.2)",
    },
    warning: {
        text: "#ffc669",
        bg: "rgba(223,138,0,0.08)",
        badgeBg: "rgba(223,138,0,0.15)",
        border: "rgba(223,138,0,0.2)",
    },
    error: {
        text: "#ff878c",
        bg: "rgba(211,36,43,0.08)",
        badgeBg: "rgba(211,36,43,0.15)",
        border: "rgba(211,36,43,0.2)",
    },
    info: {
        text: "#60baff",
        bg: "rgba(55,138,221,0.08)",
        border: "rgba(55,138,221,0.2)",
        accentBg: "rgba(55,138,221,0.2)",
    },
    // Neutral text scale, lightest to darkest.
    text: {
        primary: "#e0e0e0",
        secondary: "#9a9aaa",
        tertiary: "#8a8a9a",
        subtitle: "#7a7a8a",
        muted: "#6a6a7a",
        dim: "#4a4a5a",
    },
    // White-alpha surfaces used for layered backgrounds.
    surface: {
        xs: "rgba(255,255,255,0.02)",
        sm: "rgba(255,255,255,0.04)",
        md: "rgba(255,255,255,0.06)",
        lg: "rgba(255,255,255,0.08)",
    },
    // Consistent sizing tokens reused across the panel.
    radius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        pill: "10px",
    },
    fontSize: {
        label: "9px",
        tiny: "10px",
        small: "11px",
        body: "12px",
        heading: "13px",
        icon: "14px",
    },
};

// Shared banner styling for the panel's inline notifications (upgrade
// result, reboot hint, pacman lock, check errors). Banners are display-only:
// the gamepad cannot focus them, so every action they announce needs a
// ButtonItem next to them. Long unbreakable strings (mirror URLs, package
// paths) wrap instead of widening the ~300 px panel.
function Banner({ variant, icon, children }) {
    const palette = theme[variant];
    return (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    background: palette.bg,
                    border: `0.5px solid ${palette.border}`,
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSize.body,
                    color: palette.text,
                    width: "100%",
                    boxSizing: "border-box",
                }, children: [icon !== undefined && (SP_JSX.jsx("span", { style: { fontSize: theme.fontSize.icon, flexShrink: 0 }, children: icon })), SP_JSX.jsx("span", { style: { minWidth: 0, overflowWrap: "anywhere" }, children: children })] }) }) }));
}

// Format a Unix-seconds timestamp as a relative-time string ("just now",
// "5 min ago", "2 hr ago", "3d ago"). Returns "never" for the sentinel 0.
function timeAgo(ts) {
    if (!ts)
        return "never";
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60)
        return "just now";
    if (diff < 3600)
        return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400)
        return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
// Rough "in 2 hr" / "in 25 min" for a future Unix-seconds timestamp; "soon"
// when it is already due.
function timeUntil(ts) {
    const diff = ts - Math.floor(Date.now() / 1000);
    if (diff <= 60)
        return "soon";
    if (diff < 3600)
        return `in ${Math.round(diff / 60)} min`;
    if (diff < 86400)
        return `in ${Math.round(diff / 3600)} hr`;
    return `in ${Math.round(diff / 86400)}d`;
}
// Bytes -> "12.3 MiB" style string for download sizes.
function formatBytes(bytes) {
    if (!bytes || bytes <= 0)
        return "";
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
function triggerLabel(trigger) {
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
function formatDuration(seconds) {
    if (!seconds || seconds < 0)
        return "";
    const s = Math.floor(seconds);
    if (s < 60)
        return `${s} s`;
    const m = Math.floor(s / 60);
    const rest = s % 60;
    if (m < 60)
        return rest ? `${m} min ${rest} s` : `${m} min`;
    const h = Math.floor(m / 60);
    return `${h} h ${m % 60} min`;
}
// Reject a backend call that never settles (Decky reconnect, killed
// backend) so UI locks are always released.
function withTimeout(promise, ms, what) {
    return new Promise((resolve, reject) => {
        const id = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
        promise.then((value) => {
            clearTimeout(id);
            resolve(value);
        }, (err) => {
            clearTimeout(id);
            reject(err);
        });
    });
}
// pacman failures that need a human in Desktop Mode / a TTY, as opposed to
// transient network or mirror problems that "Try again" solves.
const MANUAL_INTERVENTION_RE = /conflict|exists in filesystem|unresolvable|invalid or corrupted|signature|keyring|marginal trust|not enough free disk|breaks dependency|could not satisfy/i;
function needsManualIntervention(errors, message) {
    return [...errors, message].some((e) => MANUAL_INTERVENTION_RE.test(e));
}

// Distro/kernel pill plus the single place that says when the last check
// ran and when the next automatic one is due.
function PanelHeader({ distroName, kernel, lastCheckAt, trigger, intervalHours, checking }) {
    const via = triggerLabel(trigger);
    const nextAt = intervalHours > 0 ? (lastCheckAt || Math.floor(Date.now() / 1000)) + intervalHours * 3600 : 0;
    return (SP_JSX.jsxs(DFL.PanelSection, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("span", { style: {
                        fontSize: theme.fontSize.tiny,
                        background: theme.surface.md,
                        padding: "2px 8px",
                        borderRadius: theme.radius.pill,
                        color: theme.text.tertiary,
                    }, children: [distroName && distroName !== "Unknown" ? distroName : "Unknown distro", kernel && kernel !== "unknown" ? ` · kernel ${kernel}` : ""] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.muted }, children: [checking
                            ? "Checking for updates now..."
                            : `Last check: ${timeAgo(lastCheckAt)}${lastCheckAt && via ? ` (${via})` : ""}`, nextAt ? ` · next ${timeUntil(nextAt)}` : ""] }) })] }));
}

function PanelFooter({ version }) {
    const [diagState, setDiagState] = SP_REACT.useState("idle");
    const rowStyle = {
        fontSize: theme.fontSize.small,
        color: theme.text.muted,
        overflowWrap: "anywhere",
    };
    // The backend also writes diagnostics.json next to the upgrade logs, so
    // the report is reachable even when the clipboard is useless in Game Mode.
    const handleCopyDiagnostics = async () => {
        setDiagState("copying");
        try {
            const info = await getDiagnosticInfo();
            try {
                await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
                setDiagState("done");
            }
            catch {
                setDiagState("saved");
            }
            setTimeout(() => setDiagState("idle"), 6000);
        }
        catch {
            setDiagState("error");
            setTimeout(() => setDiagState("idle"), 3000);
        }
    };
    const label = diagState === "done"
        ? `Copied - also saved to ${UPGRADE_LOG_DIR}diagnostics.json`
        : diagState === "saved"
            ? `Saved to ${UPGRADE_LOG_DIR}diagnostics.json`
            : diagState === "error"
                ? "Failed to collect diagnostics"
                : diagState === "copying"
                    ? "Collecting..."
                    : "Copy diagnostics";
    return (SP_JSX.jsxs(DFL.PanelSection, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: rowStyle, children: ["CachyOS Updater v", version, " - by bassobr"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: rowStyle, children: ["Upgrade logs: ", UPGRADE_LOG_DIR, SP_JSX.jsx("br", {}), "Plugin log: ", DECKY_LOG_DIR, SP_JSX.jsx("br", {}), "Bugs? github.com/bassobr/Decky-CachyOS-Updater"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: diagState === "copying", onClick: handleCopyDiagnostics, children: label }) })] }));
}

// Small category chip next to a gaming-relevant package.
function StatusBadge({ text }) {
    return (SP_JSX.jsx("span", { style: {
            fontSize: theme.fontSize.small,
            padding: "2px 6px",
            borderRadius: theme.radius.sm,
            whiteSpace: "nowrap",
            flexShrink: 0,
            background: theme.success.badgeBg,
            color: theme.success.text,
        }, children: text }));
}

const FILTER_OPTIONS = [
    { data: "all", label: "All packages" },
    { data: "gaming", label: "Gaming-relevant only" },
];
const INITIAL_COUNT = 10;
const PAGE_SIZE = 20;
// Pending updates, gaming-relevant ones first (the backend sorts them that
// way) with a category chip. Rows are Focusable so the D-pad walks the list
// and scrolls it; the list grows in pages so a 200-package sync never dumps
// everything into the QAM at once.
function UpdateList({ updates, filter, onFilterChange }) {
    const [visibleCount, setVisibleCount] = SP_REACT.useState(INITIAL_COUNT);
    const shown = filter === "gaming" ? updates.filter((u) => u.relevant) : updates;
    const visible = shown.slice(0, visibleCount);
    const hidden = shown.length - visible.length;
    return (SP_JSX.jsxs(DFL.PanelSection, { title: `Pending updates (${updates.length})`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Show", rgOptions: FILTER_OPTIONS, selectedOption: filter === "gaming" ? "gaming" : "all", onChange: (option) => onFilterChange(option.data) }) }), shown.length === 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.text.subtitle }, children: "No gaming-relevant packages in this batch." }) })), visible.map((u) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.Focusable, { style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        padding: "5px 8px",
                        borderRadius: theme.radius.md,
                        width: "100%",
                        boxSizing: "border-box",
                    }, children: [SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }, children: [SP_JSX.jsx("span", { style: {
                                        fontSize: theme.fontSize.body,
                                        color: u.relevant ? theme.text.primary : theme.text.secondary,
                                        fontWeight: u.relevant ? 600 : 400,
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }, children: u.name }), u.relevant && u.category && SP_JSX.jsx(StatusBadge, { text: CATEGORY_LABELS[u.category] ?? u.category })] }), SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.muted, overflowWrap: "anywhere" }, children: [u.old_version, " \u2192 ", u.new_version, u.download_size ? ` · ${formatBytes(u.download_size)}` : "", u.repo ? ` · ${u.repo}` : ""] })] }) }, u.name))), hidden > 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", onClick: () => setVisibleCount(visibleCount + PAGE_SIZE), children: ["Show ", Math.min(PAGE_SIZE, hidden), " more (", hidden, " hidden)"] }) })), hidden === 0 && shown.length > INITIAL_COUNT && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setVisibleCount(INITIAL_COUNT), children: "Show fewer" }) }))] }));
}

// Live view of the running pacman transaction, fed from the log tail the
// backend parses on every status poll.
function UpgradeProgress({ upgrade }) {
    const p = upgrade.progress;
    const percent = p?.percent ?? 0;
    const label = p?.label ?? "Starting";
    const counts = p && p.total > 0
        ? p.phase === "download"
            ? `${Math.min(p.downloaded, p.total)}/${p.total} downloaded`
            : p.phase === "install"
                ? `${Math.min(p.processed, p.total)}/${p.total} installed`
                : p.phase === "hooks" && p.hooks_total > 0
                    ? `hook ${p.hooks_done}/${p.hooks_total}`
                    : `${p.total} packages`
        : "";
    const elapsed = upgrade.started_at ? formatDuration(Math.floor(Date.now() / 1000) - upgrade.started_at) : "";
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "System update in progress", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ProgressBarWithInfo, { nProgress: percent, indeterminate: percent <= 2, sOperationText: label, sTimeRemaining: counts, bottomSeparator: "none" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.muted, wordBreak: "break-word" }, children: [p?.last_line ? p.last_line : "Waiting for pacman output...", elapsed ? SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx("br", {}), "Running for ", elapsed, ". Sleep is blocked until it finishes."] }) : null] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.dim }, children: "The update runs as its own system service - closing this menu, restarting Steam or Decky won't interrupt it." }) })] }));
}

// Everything the user sees after a run ended: the result banner with the
// right advice, the actions that follow from it, and - after the result has
// been dismissed - a persistent reboot reminder until the device actually
// rebooted (finished_at newer than the current boot).
function UpgradeResult({ upgrade, bootTime, isBusy, onDismiss, onReboot, onRetry, onShowLog }) {
    const [showPackages, setShowPackages] = SP_REACT.useState(false);
    if (upgrade.state === "idle" || upgrade.state === "running")
        return null;
    const rebootPending = (upgrade.reboot_required || upgrade.reboot_recommended) && upgrade.finished_at > 0 && upgrade.finished_at > bootTime;
    if (upgrade.acknowledged) {
        if (!rebootPending)
            return null;
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(Banner, { variant: "warning", icon: "\u26A0", children: upgrade.reboot_required
                        ? "Reboot required: the running kernel was replaced by the last update."
                        : "Reboot recommended since the last update (kernel, graphics or Steam components changed)." }), SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onReboot, children: "Reboot now" }) }) })] }));
    }
    const manual = needsManualIntervention(upgrade.errors, upgrade.message);
    const smallText = {
        fontSize: theme.fontSize.small,
        color: theme.text.secondary,
        overflowWrap: "anywhere",
    };
    if (upgrade.state === "succeeded") {
        const count = upgrade.upgraded.length;
        return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(Banner, { variant: rebootPending ? "warning" : "success", icon: "\u2713", children: ["Update finished: ", upgrade.message, upgrade.pacnew ? ` ${upgrade.pacnew} .pacnew file${upgrade.pacnew === 1 ? "" : "s"} to review.` : "", upgrade.reboot_required
                            ? " The running kernel was replaced - reboot required."
                            : upgrade.reboot_recommended
                                ? " Kernel, graphics or Steam components changed - reboot recommended."
                                : ""] }), SP_JSX.jsxs(DFL.PanelSection, { children: [count > 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setShowPackages(!showPackages), children: showPackages ? "Hide packages" : `Show ${count} upgraded package${count === 1 ? "" : "s"}` }) })), showPackages && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: smallText, children: upgrade.upgraded.join(", ") }) })), rebootPending && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onReboot, children: "Reboot now" }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onDismiss, children: "Dismiss" }) })] })] }));
    }
    const interrupted = upgrade.state === "interrupted";
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(Banner, { variant: interrupted ? "warning" : "error", icon: interrupted ? "⚠" : "✕", children: interrupted ? upgrade.message : `Update failed: ${upgrade.message}` }), SP_JSX.jsxs(DFL.PanelSection, { children: [upgrade.errors.length > 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { ...smallText, color: theme.error.text }, children: upgrade.errors.slice(-3).map((e, i) => (SP_JSX.jsxs("div", { children: ["\u2022 ", e] }, i))) }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: smallText, children: interrupted
                                ? "pacman did not finish (the system restarted or the service was killed). Run Check now, then install again."
                                : manual
                                    ? 'This needs a decision pacman cannot make on its own. Run "sudo pacman -Syu" once from Desktop Mode or a TTY (Ctrl+Alt+F3).'
                                    : "This looks like a network or mirror problem. Check the connection and try again." }) }), !interrupted && !manual && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onRetry, children: "Try again" }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onShowLog, children: "Show log" }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onDismiss, children: "Dismiss" }) })] })] }));
}

// A toggle with a one-line subtitle and a longer explanation behind a
// gamepad-focusable "What does this do?" row (a tap target inside the
// ToggleField label would be touch-only in the QAM).
function InfoRow({ label, subtitle, explanation, checked, disabled = false, error, onChange, children, }) {
    const [expanded, setExpanded] = SP_REACT.useState(false);
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: label, description: error ? (SP_JSX.jsx("span", { style: { color: theme.error.text, overflowWrap: "anywhere" }, children: error })) : (SP_JSX.jsx("span", { style: { color: theme.text.subtitle, fontSize: theme.fontSize.small }, children: subtitle })), checked: checked, disabled: disabled, bottomSeparator: "none", onChange: onChange }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.Focusable, { onActivate: () => setExpanded(!expanded), onClick: () => setExpanded(!expanded), style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        marginBottom: "6px",
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.tiny,
                        color: expanded ? theme.info.text : theme.text.tertiary,
                        background: expanded ? theme.info.bg : "transparent",
                    }, children: [SP_JSX.jsx("span", { style: {
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "14px",
                                height: "14px",
                                borderRadius: "50%",
                                background: expanded ? theme.info.accentBg : theme.surface.lg,
                                fontWeight: 700,
                                flexShrink: 0,
                            }, children: "i" }), SP_JSX.jsx("span", { children: expanded ? "Hide details" : "What does this do?" })] }) }), expanded && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: {
                        padding: "8px 12px",
                        marginBottom: "6px",
                        background: theme.surface.xs,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.small,
                        lineHeight: "1.5",
                        color: theme.text.secondary,
                        overflowWrap: "anywhere",
                    }, children: explanation }) })), children] }));
}

const NOTIFY_OPTIONS = [
    { data: "all", label: "All updates" },
    { data: "gaming", label: "Gaming-relevant only" },
    { data: "off", label: "Off" },
];
function intervalLabel(hours) {
    if (hours <= 0)
        return "Off";
    if (hours === 1)
        return "Every hour";
    if (hours === 24)
        return "Once a day";
    return `Every ${hours} hours`;
}
function SettingsSection({ settings, intervalChoices, gamingGroups, lastCheckAt, isBusy, errors, customPatternsInput, customPatternsDirty, onCustomPatternsInput, onToggleBootWake, onIntervalChange, onNotifyModeChange, onSaveCustomPatterns, onReset, }) {
    const intervalOptions = intervalChoices.map((h) => ({ data: h, label: intervalLabel(h) }));
    const groupSummary = gamingGroups
        .map((g) => `${g.label}: ${g.patterns.slice(0, 4).join(", ")}${g.patterns.length > 4 ? ", …" : ""}`)
        .join(" · ");
    const nextAt = settings.check_interval_hours > 0
        ? (lastCheckAt || Math.floor(Date.now() / 1000)) + settings.check_interval_hours * 3600
        : 0;
    const errorText = (key) => errors[key] ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.error.text, overflowWrap: "anywhere" }, children: errors[key] }) })) : null;
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Settings", children: [SP_JSX.jsx(InfoRow, { label: "Check after boot & wake", subtitle: "Looks for updates when the device starts or resumes", explanation: "Runs an update check about 45 seconds after boot and about 20 seconds after the device wakes from sleep, once WiFi is back. The check downloads the package databases into a private copy (like pacman-contrib's checkupdates) and never modifies the system; a failed check is retried a few times while the network comes up.", checked: settings.check_on_boot_wake, disabled: isBusy, error: errors.boot_wake, onChange: onToggleBootWake }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Periodic check", description: nextAt ? `Next automatic check ${timeUntil(nextAt)}` : "Only on boot, wake or manually", rgOptions: intervalOptions, selectedOption: settings.check_interval_hours, disabled: isBusy, onChange: (option) => onIntervalChange(option.data) }) }), errorText("interval"), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Notifications", description: settings.notify_mode === "off"
                        ? "No toasts; the panel still shows pending updates"
                        : settings.notify_mode === "gaming"
                            ? "Toast only for kernel, Mesa, Steam, gamescope, handheld drivers…"
                            : "Toast whenever new updates are found", rgOptions: NOTIFY_OPTIONS, selectedOption: NOTIFY_OPTIONS.some((o) => o.data === settings.notify_mode) ? settings.notify_mode : "all", disabled: isBusy, onChange: (option) => onNotifyModeChange(option.data) }) }), errorText("notify_mode"), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.muted, overflowWrap: "anywhere", paddingBottom: "4px" }, children: ["Gaming-relevant groups: ", groupSummary, ". All updates are still listed and installed together - pacman never does partial upgrades."] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "Extra gaming-relevant packages", description: "Space-separated globs, e.g. heroic* lutris", value: customPatternsInput, disabled: isBusy, onChange: (e) => onCustomPatternsInput(e.target.value), onBlur: onSaveCustomPatterns }) }), customPatternsDirty && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onSaveCustomPatterns, children: "Save patterns" }) })), errorText("custom_patterns"), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onReset, children: "Reset settings" }) })] }));
}

// Self-update of the plugin itself (signed GitHub release), separate from
// the system updates above. Applying it restarts Decky (all plugins reload).
function PluginUpdatesSection({ updating, checking, info, error, disabled, onApply, onCheck }) {
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Plugin update", children: [error && !updating && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.body, color: theme.warning.text, overflowWrap: "anywhere" }, children: ["\u26A0 ", error] }) })), updating ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.body, color: theme.info.text }, children: "Updating plugin... Decky restarts in a moment, all plugins reload briefly." }) })) : info?.update_available ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.body, color: theme.success.text }, children: ["Plugin v", info.latest_version, " available (you have v", info.current_version, ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: disabled, onClick: onApply, children: "Update plugin now" }) }), info.release_url && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => DFL.Navigation.NavigateToExternalWeb(info.release_url), children: "What's new" }) }))] })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [info && info.success === false && info.message && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.tiny, color: theme.error.text, overflowWrap: "anywhere" }, children: info.message }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: checking, onClick: onCheck, children: checking
                                ? "Checking..."
                                : info?.success && !info?.update_available
                                    ? "Plugin is up to date"
                                    : "Check for plugin update" }) })] }))] }));
}

// Read-only view of the pacman log tail for a failed or interrupted run.
// showModal() injects closeModal.
function LogModal({ title, path, lines, closeModal }) {
    return (SP_JSX.jsxs(DFL.ModalRoot, { onCancel: closeModal, closeModal: closeModal, children: [SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.heading, fontWeight: 600, marginBottom: "6px" }, children: title }), SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.muted, marginBottom: "8px", overflowWrap: "anywhere" }, children: path || "no log file" }), SP_JSX.jsx("pre", { style: {
                    margin: 0,
                    maxHeight: "60vh",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: theme.fontSize.small,
                    lineHeight: "1.4",
                    color: theme.text.primary,
                    background: theme.surface.sm,
                    padding: "8px",
                    borderRadius: theme.radius.md,
                }, children: lines.length ? lines.join("\n") : "The log is empty." })] }));
}

const CHECK_EVENT = "cachyos_updater_check";
const UPGRADE_EVENT = "cachyos_updater_upgrade";
const REFRESH_INTERVAL = 4000;
const REFRESH_INTERVAL_UPGRADING = 2000;
const CHECK_TIMEOUT_MS = 6 * 60 * 1000;
const ACTION_TIMEOUT_MS = 60 * 1000;
const STATUS_FAILURES_BEFORE_BANNER = 3;
const PLUGIN_UPDATE_CACHE_MS = 30 * 60 * 1000;
const PLUGIN_UPDATE_TIMEOUT_MS = 60 * 1000;
const STALE_CHECK_FOR_INSTALL_S = 3600;
const BATTERY_WARN_PERCENT = 40;
// Survives the QAM closing (the panel component unmounts every time): one
// GitHub API request per half hour, and the self-update lock keeps holding
// while Decky is about to restart us.
let pluginUpdateCache = { info: null, checkedAt: 0 };
let pluginUpdatingSince = 0;
function toastCheck(p) {
    if (!p || !p.notify)
        return;
    const names = p.relevant_names?.length ? p.relevant_names.join(", ") : "";
    const more = p.relevant_count > (p.relevant_names?.length ?? 0) ? ", …" : "";
    const body = p.relevant_count > 0
        ? `${p.updates_count} update${p.updates_count === 1 ? "" : "s"} available - ${names}${more}`
        : `${p.updates_count} system update${p.updates_count === 1 ? "" : "s"} available`;
    toaster.toast({
        title: "CachyOS Updater",
        body,
        icon: SP_JSX.jsx(FaDownload, {}),
        duration: 8000,
        onClick: () => DFL.Navigation.OpenQuickAccessMenu(DFL.QuickAccessTab.Decky),
    });
}
function toastUpgrade(p) {
    if (!p)
        return;
    const body = p.state === "succeeded"
        ? p.reboot_required
            ? "System update finished - reboot required."
            : p.reboot_recommended
                ? "System update finished - reboot recommended."
                : "System update finished."
        : p.state === "interrupted"
            ? "System update was interrupted - open the panel for details."
            : "System update failed - open the panel for details.";
    toaster.toast({
        title: "CachyOS Updater",
        body,
        icon: SP_JSX.jsx(FaDownload, {}),
        duration: 10000,
        critical: p.state !== "succeeded",
        onClick: () => DFL.Navigation.OpenQuickAccessMenu(DFL.QuickAccessTab.Decky),
    });
}
// Catches render-time exceptions in the panel tree so a bad status shape or
// other unexpected error surfaces a recoverable message instead of Decky
// blanking the panel.
class ErrorBoundary extends SP_REACT.Component {
    constructor() {
        super(...arguments);
        this.state = { err: null };
    }
    static getDerivedStateFromError(err) {
        return { err };
    }
    componentDidCatch(err, info) {
        console.error("CachyOS Updater render error:", err, info);
    }
    render() {
        if (this.state.err) {
            return (SP_JSX.jsx(Banner, { variant: "error", children: "CachyOS Updater hit an unexpected error. Close and reopen the panel to recover. If it keeps happening, please report at github.com/bassobr/Decky-CachyOS-Updater." }));
        }
        return this.props.children;
    }
}
const RENDERED_ERROR_KEYS = new Set([
    "check", "upgrade", "reboot", "boot_wake", "interval", "notify_mode", "custom_patterns", "lock",
]);
function Content() {
    const [status, setStatus] = SP_REACT.useState(null);
    const [statusError, setStatusError] = SP_REACT.useState(null);
    const [errors, setErrors] = SP_REACT.useState({});
    // isBusy locks the short setter-style actions; checking only the two
    // buttons that would conflict with a running check (30-60 s).
    const [isBusy, setIsBusy] = SP_REACT.useState(false);
    const [checking, setChecking] = SP_REACT.useState(false);
    const [checkMessage, setCheckMessage] = SP_REACT.useState(null);
    const [customPatternsInput, setCustomPatternsInput] = SP_REACT.useState("");
    const [pluginUpdateInfo, setPluginUpdateInfo] = SP_REACT.useState(pluginUpdateCache.info);
    const [checkingPluginUpdate, setCheckingPluginUpdate] = SP_REACT.useState(false);
    const [pluginUpdating, setPluginUpdating] = SP_REACT.useState(Date.now() - pluginUpdatingSince < PLUGIN_UPDATE_TIMEOUT_MS);
    const [pluginUpdateError, setPluginUpdateError] = SP_REACT.useState(null);
    const busyRef = SP_REACT.useRef(false);
    const patternsEditingRef = SP_REACT.useRef(false);
    const pollSeqRef = SP_REACT.useRef(0);
    const failedPollsRef = SP_REACT.useRef(0);
    const lastCheckAtRef = SP_REACT.useRef(null);
    const setBusy = SP_REACT.useCallback((val) => {
        busyRef.current = val;
        setIsBusy(val);
    }, []);
    const clearError = SP_REACT.useCallback((key) => {
        setErrors((prev) => {
            if (!(key in prev))
                return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);
    const refreshStatus = SP_REACT.useCallback(async (force = false) => {
        if (!force && busyRef.current)
            return;
        // Sequence number: a response that started before a newer request (or
        // before an optimistic update) is dropped instead of reverting the UI.
        const seq = ++pollSeqRef.current;
        try {
            const s = await getStatus();
            if (seq !== pollSeqRef.current)
                return;
            if (!s || !s.success) {
                failedPollsRef.current++;
                if (failedPollsRef.current >= STATUS_FAILURES_BEFORE_BANNER) {
                    setStatusError(s?.message ?? "The plugin backend returned an error.");
                }
                return;
            }
            failedPollsRef.current = 0;
            setStatusError(null);
            if (lastCheckAtRef.current !== null && s.check.last_check_at !== lastCheckAtRef.current) {
                // A newer check result arrived (manual, scheduled or after an
                // upgrade): stale frontend-side check messages must not contradict it.
                clearError("check");
                setCheckMessage(null);
            }
            lastCheckAtRef.current = s.check.last_check_at;
            setStatus(s);
            if (!patternsEditingRef.current) {
                setCustomPatternsInput(s.settings?.custom_patterns ?? "");
            }
        }
        catch (e) {
            failedPollsRef.current++;
            if (failedPollsRef.current >= STATUS_FAILURES_BEFORE_BANNER) {
                setStatusError("Couldn't reach the plugin backend.");
            }
            console.error("CachyOS Updater: failed to get status", e);
        }
    }, [clearError]);
    const runPluginUpdateCheck = SP_REACT.useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - pluginUpdateCache.checkedAt < PLUGIN_UPDATE_CACHE_MS) {
            setPluginUpdateInfo(pluginUpdateCache.info);
            return;
        }
        pluginUpdateCache.checkedAt = now;
        try {
            const info = await checkForPluginUpdate();
            pluginUpdateCache = { info, checkedAt: Date.now() };
            setPluginUpdateInfo(info);
        }
        catch {
            // offline or backend not ready; the button stays available
        }
    }, []);
    // Status poll, paused while the panel is hidden; faster while pacman runs.
    const upgradeRunning = status?.upgrade?.state === "running";
    SP_REACT.useEffect(() => {
        let id = null;
        const interval = upgradeRunning ? REFRESH_INTERVAL_UPGRADING : REFRESH_INTERVAL;
        const start = () => {
            if (id)
                return;
            void refreshStatus();
            id = setInterval(() => void refreshStatus(), interval);
        };
        const stop = () => {
            if (id) {
                clearInterval(id);
                id = null;
            }
        };
        const onVis = () => (document.hidden ? stop() : start());
        if (!document.hidden)
            start();
        document.addEventListener("visibilitychange", onVis);
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            stop();
        };
    }, [refreshStatus, upgradeRunning]);
    // Backend events refresh the panel immediately (toasts are handled in
    // definePlugin so they work with the panel closed).
    SP_REACT.useEffect(() => {
        const onEvent = () => {
            void refreshStatus(true);
        };
        addEventListener(CHECK_EVENT, onEvent);
        addEventListener(UPGRADE_EVENT, onEvent);
        return () => {
            removeEventListener(CHECK_EVENT, onEvent);
            removeEventListener(UPGRADE_EVENT, onEvent);
        };
    }, [refreshStatus]);
    SP_REACT.useEffect(() => {
        void runPluginUpdateCheck();
    }, [runPluginUpdateCheck]);
    // Safety timeout for the plugin self-update: if plugin_loader hasn't
    // restarted us within 60 s, the detached script probably failed (it never
    // restarts Decky on a failed copy, so the old version keeps running).
    SP_REACT.useEffect(() => {
        if (!pluginUpdating)
            return;
        const remaining = Math.max(1000, PLUGIN_UPDATE_TIMEOUT_MS - (Date.now() - pluginUpdatingSince));
        const id = setTimeout(() => {
            pluginUpdatingSince = 0;
            setPluginUpdating(false);
            setBusy(false);
            setPluginUpdateError("Plugin update didn't complete; the installed version is unchanged. Try again or reinstall with install.sh.");
        }, remaining);
        return () => clearTimeout(id);
    }, [pluginUpdating, setBusy]);
    // ---- handlers ----
    const runAction = async (key, fn, what = "The action") => {
        if (busyRef.current)
            return;
        setBusy(true);
        clearError(key);
        try {
            const result = await withTimeout(fn(), ACTION_TIMEOUT_MS, what);
            if (result && !result.success) {
                const detail = result.detail ? ` (${result.detail})` : "";
                setErrors((prev) => ({ ...prev, [key]: (result.message ?? "Something went wrong") + detail }));
            }
        }
        catch (e) {
            console.error(`CachyOS Updater: ${key} failed`, e);
            setErrors((prev) => ({ ...prev, [key]: `${what} failed - see ${DECKY_LOG_DIR}` }));
        }
        finally {
            await refreshStatus(true);
            setBusy(false);
        }
    };
    const handleCheckNow = async () => {
        if (checking || busyRef.current)
            return;
        setChecking(true);
        setCheckMessage(null);
        clearError("check");
        // Optimistic "Checking..." and invalidate in-flight polls so an older
        // response can't revert it; the backend flag takes over on the next poll.
        pollSeqRef.current++;
        setStatus((prev) => (prev ? { ...prev, check: { ...prev.check, in_progress: true } } : prev));
        let frontendError = null;
        let skippedMessage = null;
        try {
            const result = await withTimeout(checkForUpdates(), CHECK_TIMEOUT_MS, "The update check");
            if (!result.success) {
                // Persisted failures (mirror/lock) come back through status;
                // the ones the backend does not record are shown from here.
                if (result.error === "offline" || result.error === "pacman_locked" || result.error === "no_pacman" || result.error === "upgrade_running") {
                    frontendError = result.message ?? "Update check failed.";
                }
            }
            else if (result.skipped) {
                skippedMessage = result.message ?? "Check skipped.";
            }
        }
        catch (e) {
            console.error("CachyOS Updater: check failed", e);
            frontendError = `The update check did not finish in time - see ${DECKY_LOG_DIR}`;
        }
        finally {
            await refreshStatus(true);
            if (frontendError)
                setErrors((prev) => ({ ...prev, check: frontendError }));
            if (skippedMessage)
                setCheckMessage(skippedMessage);
            setChecking(false);
        }
    };
    const startUpgrade$1 = () => runAction("upgrade", () => startUpgrade(), "Starting the update");
    const confirmUpgrade = () => {
        if (busyRef.current || !status)
            return;
        const check = status.check;
        const updates = check.updates;
        const relevant = updates.filter((u) => u.relevant);
        const size = formatBytes(check.total_download_size);
        const hasKernel = updates.some((u) => u.category === "kernel");
        const stale = check.last_check_at > 0 && Math.floor(Date.now() / 1000) - check.last_check_at > STALE_CHECK_FOR_INSTALL_S;
        const power = status.power;
        const batteryWarn = power.battery_percent !== null && power.battery_percent < BATTERY_WARN_PERCENT && !power.on_ac;
        const shownRelevant = relevant.slice(0, 6);
        const running = DFL.Router.MainRunningApp?.display_name;
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { strTitle: "Install system updates", strOKButtonText: "Install", onOK: () => {
                void startUpgrade$1();
            }, strDescription: SP_JSX.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [SP_JSX.jsxs("div", { children: ["pacman -Syu will install ", updates.length, " package update", updates.length === 1 ? "" : "s", size ? ` (${size} download)` : "", "."] }), shownRelevant.length > 0 && (SP_JSX.jsxs("div", { children: ["Gaming-relevant:", " ", shownRelevant.map((u) => `${u.name} ${u.new_version}`).join(", "), relevant.length > shownRelevant.length ? ` and ${relevant.length - shownRelevant.length} more` : "", "."] })), SP_JSX.jsx("div", { children: hasKernel
                            ? "This includes a kernel update - a reboot will be required afterwards."
                            : "Kernel or graphics updates need a reboot afterwards." }), running && SP_JSX.jsxs("div", { children: [running, " is running and may misbehave while its files are replaced - quit it first."] }), batteryWarn && (SP_JSX.jsxs("div", { style: { color: theme.warning.text }, children: ["Battery at ", power.battery_percent, "% and not charging - plug in first (below 25% the update is refused)."] })), stale && (SP_JSX.jsxs("div", { style: { color: theme.text.secondary }, children: ["Based on a check ", timeAgo(check.last_check_at), "; pacman re-syncs and may install a slightly different set."] })), SP_JSX.jsx("div", { style: { color: theme.text.secondary }, children: "The update keeps running even if you close this menu or Steam; sleep is blocked until it finishes." })] }) }));
    };
    const confirmReboot = () => {
        if (busyRef.current)
            return;
        const running = DFL.Router.MainRunningApp?.display_name;
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { strTitle: "Reboot now?", strDescription: running
                ? `${running} is still running and will be closed. The device restarts immediately.`
                : "The device restarts immediately.", strOKButtonText: "Reboot", onOK: () => {
                void runAction("reboot", () => rebootSystem(), "Reboot");
            } }));
    };
    const handleShowLog = async () => {
        try {
            const r = await withTimeout(getUpgradeLog(80), ACTION_TIMEOUT_MS, "Loading the log");
            DFL.showModal(SP_JSX.jsx(LogModal, { title: "Upgrade log (last 80 lines)", path: r.path ?? "", lines: r.lines ?? [] }));
        }
        catch (e) {
            console.error("CachyOS Updater: log fetch failed", e);
            setErrors((prev) => ({ ...prev, upgrade: `Couldn't load the log - see ${DECKY_LOG_DIR}` }));
        }
    };
    const handleDismissResult = () => runAction("dismiss", () => dismissUpgradeResult(), "Dismiss");
    const handleClearStaleLock = () => runAction("lock", () => clearStaleLock(), "Removing the lock");
    const handleToggleBootWake = (val) => runAction("boot_wake", () => setCheckOnBootWake(val), "Saving");
    const handleIntervalChange = (hours) => runAction("interval", () => setCheckInterval(hours), "Saving");
    const handleNotifyModeChange = (mode) => runAction("notify_mode", () => setNotifyMode(mode), "Saving");
    const handleFilterChange = (mode) => runAction("list_filter", () => setListFilter(mode), "Saving");
    const savedPatterns = status?.settings.custom_patterns ?? "";
    const customPatternsDirty = customPatternsInput.trim() !== savedPatterns;
    const handleSaveCustomPatterns = async () => {
        if (!customPatternsDirty) {
            patternsEditingRef.current = false;
            return;
        }
        if (busyRef.current)
            return;
        setBusy(true);
        clearError("custom_patterns");
        try {
            const result = await withTimeout(setCustomPatterns(customPatternsInput), ACTION_TIMEOUT_MS, "Saving");
            if (result.success) {
                // Only a successful save hands the field back to the status poll;
                // a rejected value stays visible next to its error.
                patternsEditingRef.current = false;
            }
            else {
                setErrors((prev) => ({ ...prev, custom_patterns: result.message ?? "Couldn't save the patterns." }));
            }
        }
        catch {
            setErrors((prev) => ({ ...prev, custom_patterns: `Saving failed - see ${DECKY_LOG_DIR}` }));
        }
        finally {
            await refreshStatus(true);
            setBusy(false);
        }
    };
    const confirmReset = () => {
        if (busyRef.current)
            return;
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { strTitle: "Reset settings", strDescription: "Restores the default check schedule and notification mode. Pending updates are not affected.", strOKButtonText: "Reset", onOK: () => {
                patternsEditingRef.current = false;
                void runAction("reset", () => resetSettings(), "Reset");
            } }));
    };
    const handleApplyPluginUpdate = async () => {
        if (busyRef.current)
            return;
        setBusy(true);
        setPluginUpdateError(null);
        pluginUpdatingSince = Date.now();
        setPluginUpdating(true);
        try {
            const res = await applyPluginUpdate();
            if (res && res.success === false) {
                pluginUpdatingSince = 0;
                setPluginUpdating(false);
                setBusy(false);
                setPluginUpdateError(res.message ?? "Plugin update failed to start.");
            }
            // On success plugin_loader restarts us; the UI stays locked until then.
        }
        catch {
            // plugin_loader restart killed the connection; expected
        }
    };
    const handleCheckForPluginUpdate = async () => {
        setCheckingPluginUpdate(true);
        setPluginUpdateError(null);
        await runPluginUpdateCheck(true);
        setCheckingPluginUpdate(false);
    };
    // ---- render ----
    if (!status) {
        if (statusError) {
            return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsxs(Banner, { variant: "error", icon: "\u2715", children: ["Couldn't reach the plugin backend: ", statusError, ". Check ", DECKY_LOG_DIR] }), SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => {
                                    failedPollsRef.current = 0;
                                    setStatusError(null);
                                    void refreshStatus(true);
                                }, children: "Retry" }) }) })] }));
        }
        return SP_JSX.jsx(DFL.PanelSection, { title: "System updates", spinner: true });
    }
    const s = status.settings;
    const check = status.check;
    const upgrade = status.upgrade;
    const updates = check.updates;
    const relevant = check.relevant_count;
    const notifyMode = s.notify_mode;
    const running = upgrade.state === "running";
    const checkBusy = checking || check.in_progress;
    // Right after a successful upgrade the pending list is obsolete until the
    // post-upgrade check has replaced it (the backend clears it too; this
    // covers the window in between).
    const listStale = upgrade.state === "succeeded" && upgrade.finished_at > 0 && check.last_check_at < upgrade.finished_at && updates.length > 0;
    const lockBlocked = status.pacman_locked;
    const cannotInstall = !!check.resolve_error;
    const installDisabled = isBusy || checkBusy || lockBlocked || !status.pacman_available || !status.network_online || status.power.low_battery || cannotInstall || listStale;
    let statusLine;
    let statusColor = theme.text.secondary;
    if (checkBusy) {
        statusLine = "Checking for updates... this can take a minute.";
    }
    else if (listStale) {
        statusLine = "Update finished - refreshing the pending list...";
    }
    else if (!check.last_check_at) {
        statusLine = "Not checked yet.";
    }
    else if (!check.ok) {
        statusLine = `Last check failed ${timeAgo(check.last_check_at)}.`;
        statusColor = theme.warning.text;
    }
    else if (updates.length === 0) {
        statusLine = `System is up to date (checked ${timeAgo(check.last_check_at)}).`;
        statusColor = theme.success.text;
    }
    else if (notifyMode === "gaming" && relevant === 0) {
        statusLine = `${updates.length} update${updates.length === 1 ? "" : "s"} pending, none gaming-relevant.`;
    }
    else {
        const size = formatBytes(check.total_download_size);
        statusLine =
            `${updates.length} update${updates.length === 1 ? "" : "s"} available` +
                (relevant > 0 ? ` · ${relevant} gaming-relevant` : "") +
                (size ? ` · ${size}` : "");
        statusColor = theme.info.text;
    }
    const otherErrors = Object.entries(errors).filter(([k]) => !RENDERED_ERROR_KEYS.has(k));
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(PanelHeader, { distroName: status.distro_name, kernel: status.kernel_running, lastCheckAt: check.last_check_at, trigger: check.trigger, intervalHours: s.check_interval_hours, checking: checkBusy }), statusError && (SP_JSX.jsxs(Banner, { variant: "warning", icon: "\u26A0", children: ["Status updates are failing: ", statusError] })), !status.pacman_available && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: "pacman was not found. This plugin only works on CachyOS / Arch-based systems." })), pluginUpdateInfo?.update_available && !pluginUpdating && (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || running, onClick: handleApplyPluginUpdate, children: ["Update plugin to v", pluginUpdateInfo.latest_version] }) }) })), !running && (SP_JSX.jsx(UpgradeResult, { upgrade: upgrade, bootTime: status.boot_time, isBusy: isBusy, onDismiss: handleDismissResult, onReboot: confirmReboot, onRetry: confirmUpgrade, onShowLog: () => void handleShowLog() })), !running &&
                status.reboot_required &&
                !(upgrade.finished_at > status.boot_time && (upgrade.reboot_required || upgrade.reboot_recommended)) && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(Banner, { variant: "warning", icon: "\u26A0", children: "The running kernel was replaced by an update - reboot to load the new kernel." }), SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: confirmReboot, children: "Reboot now" }) }) })] })), lockBlocked && !running && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(Banner, { variant: status.pacman_lock_stale ? "warning" : "info", icon: status.pacman_lock_stale ? "⚠" : "ℹ", children: status.pacman_lock_stale
                            ? "A stale pacman lock (/var/lib/pacman/db.lck) is blocking checks and updates. No package manager is running, so it was left behind by an interrupted transaction."
                            : "Another package manager holds the pacman lock; checks and updates are paused until it finishes." }), status.pacman_lock_stale && (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: handleClearStaleLock, children: "Remove stale lock" }) }) }))] })), errors.lock && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: errors.lock })), !status.network_online && (SP_JSX.jsx(Banner, { variant: "info", icon: "\u2139", children: "No network connection. Checks resume automatically once WiFi is back." })), errors.check && (SP_JSX.jsx(Banner, { variant: "warning", icon: "\u26A0", children: errors.check })), !errors.check && !check.ok && check.error && !checkBusy && (SP_JSX.jsxs(Banner, { variant: "warning", icon: "\u26A0", children: [check.error, check.detail ? ` (${check.detail})` : "", check.kind === "network" ? " Check the WiFi connection and try again." : ""] })), cannotInstall && !running && !listStale && (SP_JSX.jsxs(Banner, { variant: "error", icon: "\u2715", children: ["These updates can't be installed automatically: ", check.resolve_error, " Run \"sudo pacman -Syu\" once from Desktop Mode or a TTY (Ctrl+Alt+F3)."] })), errors.upgrade && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: errors.upgrade })), errors.reboot && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: errors.reboot })), otherErrors.map(([key, message]) => (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: message }, key))), running ? (SP_JSX.jsx(UpgradeProgress, { upgrade: upgrade })) : (SP_JSX.jsxs(DFL.PanelSection, { title: "System updates", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.body, color: statusColor, overflowWrap: "anywhere" }, children: statusLine }) }), checkMessage && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.text.subtitle }, children: checkMessage }) })), status.power.low_battery && updates.length > 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.small, color: theme.warning.text }, children: ["Battery at ", status.power.battery_percent, "% and not charging - plug in to install."] }) })), updates.length > 0 && !listStale && !cannotInstall && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: installDisabled, onClick: confirmUpgrade, children: ["Install ", updates.length, " update", updates.length === 1 ? "" : "s", check.total_download_size ? ` · ${formatBytes(check.total_download_size)}` : ""] }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: checkBusy || isBusy || lockBlocked || !status.pacman_available, onClick: handleCheckNow, children: checkBusy ? "Checking..." : "Check now" }) })] })), !running && !listStale && updates.length > 0 && (SP_JSX.jsx(UpdateList, { updates: updates, filter: s.list_filter, onFilterChange: handleFilterChange })), SP_JSX.jsx(SettingsSection, { settings: s, intervalChoices: status.interval_choices, gamingGroups: status.gaming_groups, lastCheckAt: check.last_check_at, isBusy: isBusy, errors: errors, customPatternsInput: customPatternsInput, customPatternsDirty: customPatternsDirty, onCustomPatternsInput: (value) => {
                    patternsEditingRef.current = true;
                    setCustomPatternsInput(value);
                }, onToggleBootWake: handleToggleBootWake, onIntervalChange: handleIntervalChange, onNotifyModeChange: handleNotifyModeChange, onSaveCustomPatterns: () => void handleSaveCustomPatterns(), onReset: confirmReset }), SP_JSX.jsx(PluginUpdatesSection, { updating: pluginUpdating, checking: checkingPluginUpdate, info: pluginUpdateInfo, error: pluginUpdateError, disabled: isBusy || running, onApply: handleApplyPluginUpdate, onCheck: handleCheckForPluginUpdate }), SP_JSX.jsx(PanelFooter, { version: status.version ?? "?" })] }));
}
var index = definePlugin(() => {
    // Toasts must work with the QAM closed, so the listeners live here rather
    // than in the panel component. The backend decides whether a check result
    // deserves a toast (new set, notification mode, daily reminder) and parks
    // it until we acknowledge, in case we were not loaded when it fired.
    const onCheckEvent = (p) => {
        toastCheck(p);
        if (p?.notify)
            pullPendingNotifications().catch(() => { });
    };
    const onUpgradeEvent = (p) => {
        toastUpgrade(p);
        pullPendingNotifications().catch(() => { });
    };
    addEventListener(CHECK_EVENT, onCheckEvent);
    addEventListener(UPGRADE_EVENT, onUpgradeEvent);
    // Anything that fired before this frontend existed (boot check, a run
    // finalized after a reboot).
    const deliverPending = () => {
        pullPendingNotifications()
            .then((r) => {
            for (const n of (r?.notifications ?? [])) {
                if (n.kind === "check")
                    toastCheck(n.payload);
                else if (n.kind === "upgrade")
                    toastUpgrade(n.payload);
            }
        })
            .catch(() => { });
    };
    // The backend may still be starting when Decky loads the frontends: a
    // failed pull is retried a couple of times with growing delays.
    const pendingTimers = [5000, 30000, 120000].map((ms) => setTimeout(deliverPending, ms));
    // Fast path for the wake check: Steam's own resume hook. UNDOCUMENTED and
    // known to disappear in some Steam builds - every failure is swallowed;
    // the backend's clock-based detector covers resume regardless.
    let resumeUnsub = null;
    try {
        const register = typeof SteamClient !== "undefined" ? SteamClient?.System?.RegisterForOnResumeFromSuspend : undefined;
        if (typeof register === "function") {
            resumeUnsub = register(() => {
                pokeResume().catch(() => { });
            });
        }
    }
    catch (e) {
        console.error("CachyOS Updater: failed to register resume listener", e);
    }
    return {
        name: "CachyOS Updater",
        titleView: SP_JSX.jsx("div", { className: DFL.staticClasses.Title, children: "CachyOS Updater" }),
        content: (SP_JSX.jsx(ErrorBoundary, { children: SP_JSX.jsx(Content, {}) })),
        icon: SP_JSX.jsx(FaDownload, {}),
        onDismount() {
            pendingTimers.forEach(clearTimeout);
            removeEventListener(CHECK_EVENT, onCheckEvent);
            removeEventListener(UPGRADE_EVENT, onUpgradeEvent);
            resumeUnsub?.unregister();
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
