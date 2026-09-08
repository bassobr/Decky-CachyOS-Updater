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
callable("get_upgrade_status");
callable("get_upgrade_log");
const dismissUpgradeResult = callable("dismiss_upgrade_result");
const rebootSystem = callable("reboot_system");
const pokeResume = callable("poke_resume");
const setCheckOnBootWake = callable("set_check_on_boot_wake");
const setCheckInterval = callable("set_check_interval");
const setGamingOnlyNotify = callable("set_gaming_only_notify");
const setCustomPatterns = callable("set_custom_patterns");
const setListFilter = callable("set_list_filter");
const resetSettings = callable("reset_settings");
const checkForPluginUpdate = callable("check_for_plugin_update");
const applyPluginUpdate = callable("apply_plugin_update");
const getDiagnosticInfo = callable("get_diagnostic_info");

// Design tokens for the CachyOS Updater panel. Keep this in sync with the
// palette used in the README mockup and the four semantic banner colors
// (success/warning/error/info) that Decky's Quick Access Menu supports well
// against its dark background.
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

// Shared banner styling for the panel's many inline notifications
// (unknown hardware, drift alert, optimize result, backend switch
// result, update errors, etc.). Each banner sits in its own
// PanelSection so Decky's QAM can focus it with gamepad navigation.
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
                }, children: [icon !== undefined && (SP_JSX.jsx("span", { style: { fontSize: theme.fontSize.icon }, children: icon })), SP_JSX.jsx("span", { children: children })] }) }) }));
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

function PanelHeader({ distroName, kernel, version, lastCheckAt, trigger }) {
    const rowStyle = {
        fontSize: theme.fontSize.tiny,
        color: theme.text.muted,
    };
    const when = timeAgo(lastCheckAt);
    const via = triggerLabel(trigger);
    return (SP_JSX.jsxs(DFL.PanelSection, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("span", { style: {
                        fontSize: theme.fontSize.tiny,
                        background: theme.surface.md,
                        padding: "2px 8px",
                        borderRadius: theme.radius.pill,
                        color: theme.text.tertiary,
                    }, children: [distroName && distroName !== "Unknown" ? distroName : "Unknown distro", kernel && kernel !== "unknown" ? ` · kernel ${kernel}` : ""] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: rowStyle, children: ["Plugin version: ", version, SP_JSX.jsx("br", {}), "Last check: ", when, lastCheckAt && via ? ` (${via})` : ""] }) })] }));
}

function PanelFooter({ version }) {
    const [diagState, setDiagState] = SP_REACT.useState("idle");
    const rowStyle = {
        fontSize: theme.fontSize.tiny,
        color: theme.text.dim,
    };
    const handleCopyDiagnostics = async () => {
        setDiagState("copying");
        try {
            const info = await getDiagnosticInfo();
            await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
            setDiagState("done");
            setTimeout(() => setDiagState("idle"), 5000);
        }
        catch {
            setDiagState("error");
            setTimeout(() => setDiagState("idle"), 3000);
        }
    };
    const label = diagState === "done"
        ? "Copied to clipboard"
        : diagState === "error"
            ? "Failed to collect diagnostics"
            : diagState === "copying"
                ? "Collecting..."
                : "Copy diagnostics";
    return (SP_JSX.jsxs(DFL.PanelSection, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: rowStyle, children: ["v", version, " - by bassobr"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: rowStyle, children: ["Upgrade logs: /var/log/cachyos-updater/", SP_JSX.jsx("br", {}), "Bugs? Report at github.com/bassobr/Decky-CachyOS-Updater"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: diagState === "copying", onClick: handleCopyDiagnostics, children: label }) })] }));
}

// Human labels for the backend's classification groups.
const CATEGORY_LABELS = {
    kernel: "Kernel",
    graphics: "Graphics",
    gaming: "Gaming",
    handheld: "Handheld",
    system: "System",
    custom: "Custom",
};

const BADGE_STYLES = {
    active: { background: theme.success.badgeBg, color: theme.success.text },
    drifted: { background: theme.warning.badgeBg, color: theme.warning.text },
    off: { background: theme.surface.md, color: theme.text.muted },
    error: { background: theme.error.badgeBg, color: theme.error.text },
    unknown: { background: theme.surface.md, color: theme.text.tertiary },
};
function StatusBadge({ badge, text }) {
    const style = BADGE_STYLES[badge];
    return (SP_JSX.jsx("span", { style: {
            fontSize: theme.fontSize.small,
            padding: "2px 6px",
            borderRadius: theme.radius.sm,
            whiteSpace: "nowrap",
            background: style.background,
            color: style.color,
        }, children: text }));
}

const FILTER_OPTIONS = [
    { data: "all", label: "All packages" },
    { data: "gaming", label: "Gaming-relevant only" },
];
const COLLAPSED_COUNT = 10;
// Pending updates, gaming-relevant ones first (the backend sorts them that
// way) with a category chip. Collapsed to a handful of rows by default so
// a 200-package sync doesn't turn the QAM into an endless scroll.
function UpdateList({ updates, filter, onFilterChange }) {
    const [expanded, setExpanded] = SP_REACT.useState(false);
    const shown = filter === "gaming" ? updates.filter((u) => u.relevant) : updates;
    const visible = expanded ? shown : shown.slice(0, COLLAPSED_COUNT);
    const hidden = shown.length - visible.length;
    return (SP_JSX.jsxs(DFL.PanelSection, { title: `Pending updates (${updates.length})`, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Show", rgOptions: FILTER_OPTIONS, selectedOption: filter === "gaming" ? "gaming" : "all", onChange: (option) => onFilterChange(option.data) }) }), shown.length === 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.text.subtitle }, children: "No gaming-relevant packages in this batch." }) })), visible.map((u) => (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        padding: "4px 0",
                        width: "100%",
                    }, children: [SP_JSX.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }, children: [SP_JSX.jsx("span", { style: {
                                        fontSize: theme.fontSize.body,
                                        color: u.relevant ? theme.text.primary : theme.text.secondary,
                                        fontWeight: u.relevant ? 600 : 400,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }, children: u.name }), u.relevant && u.category && (SP_JSX.jsx(StatusBadge, { badge: "active", text: CATEGORY_LABELS[u.category] ?? u.category }))] }), SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.tiny, color: theme.text.muted }, children: [u.old_version, " \u2192 ", u.new_version, u.download_size ? ` · ${formatBytes(u.download_size)}` : "", u.repo ? ` · ${u.repo}` : ""] })] }) }, u.name))), (hidden > 0 || expanded) && shown.length > COLLAPSED_COUNT && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: () => setExpanded(!expanded), children: expanded ? "Show fewer" : `Show all (${hidden} more)` }) }))] }));
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

function InfoRow({ label, subtitle, explanation, badge, text, checked, disabled = false, error, onChange, children, }) {
    const showBadge = badge !== undefined && text !== undefined;
    const [expanded, setExpanded] = SP_REACT.useState(false);
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ToggleField, { label: SP_JSX.jsxs("span", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [SP_JSX.jsx("span", { onClick: (e) => {
                                    e.stopPropagation();
                                    setExpanded(!expanded);
                                }, style: {
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "50%",
                                    background: expanded ? theme.info.accentBg : theme.surface.lg,
                                    color: expanded ? theme.info.text : theme.text.tertiary,
                                    fontSize: theme.fontSize.tiny,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    flexShrink: 0,
                                }, children: "i" }), SP_JSX.jsx("span", { children: label })] }), description: SP_JSX.jsxs("span", { style: { display: "block" }, children: [showBadge && (SP_JSX.jsx("span", { style: {
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginBottom: "4px",
                                }, children: SP_JSX.jsx(StatusBadge, { badge: badge, text: text }) })), error ? (SP_JSX.jsx("span", { style: { color: theme.error.text }, children: error })) : (SP_JSX.jsx("span", { style: { color: theme.text.subtitle, fontSize: theme.fontSize.small }, children: subtitle }))] }), checked: checked, disabled: disabled, onChange: onChange }) }), expanded && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: {
                        padding: "8px 12px",
                        background: theme.surface.xs,
                        borderRadius: theme.radius.md,
                        fontSize: theme.fontSize.small,
                        lineHeight: "1.5",
                        color: theme.text.secondary,
                    }, children: explanation }) })), children] }));
}

function intervalLabel(hours) {
    if (hours <= 0)
        return "Off";
    if (hours === 1)
        return "Every hour";
    if (hours === 24)
        return "Once a day";
    return `Every ${hours} hours`;
}
function SettingsSection({ settings, intervalChoices, gamingGroups, isBusy, errors, customPatternsInput, onCustomPatternsInput, onToggleBootWake, onIntervalChange, onToggleGamingOnly, onSaveCustomPatterns, onReset, }) {
    const intervalOptions = intervalChoices.map((h) => ({ data: h, label: intervalLabel(h) }));
    const groupSummary = gamingGroups
        .map((g) => `${g.label}: ${g.patterns.slice(0, 4).join(", ")}${g.patterns.length > 4 ? ", …" : ""}`)
        .join(" · ");
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Settings", children: [SP_JSX.jsx(InfoRow, { label: "Check after boot & wake", subtitle: "Looks for updates when the device starts or resumes", explanation: "Runs an update check about 45 seconds after boot and about 20 seconds after the device wakes from sleep, once WiFi is back. The check downloads the package databases into a private copy (like pacman-contrib's checkupdates) and never modifies the system; a failed check is retried a few times while the network comes up.", checked: settings.check_on_boot_wake, disabled: isBusy, error: errors.boot_wake, onChange: onToggleBootWake }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.DropdownItem, { label: "Periodic check", description: "Re-check while the device stays on", rgOptions: intervalOptions, selectedOption: settings.check_interval_hours, disabled: isBusy, onChange: (option) => onIntervalChange(option.data) }) }), errors.interval && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.error.text }, children: errors.interval }) })), SP_JSX.jsxs(InfoRow, { label: "Gaming-relevant only", subtitle: "Notify only for kernel, Mesa, Steam, gamescope, handheld drivers\u2026", explanation: `With this on, the notification toast only appears when at least one pending update matches a gaming-relevant package group. All updates are still listed and installed together - pacman never does partial upgrades. Groups: ${groupSummary}. Add your own patterns below.`, checked: settings.gaming_only_notify, disabled: isBusy, error: errors.gaming_only, onChange: onToggleGamingOnly, children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.TextField, { label: "Extra gaming-relevant packages", description: "Space-separated globs, e.g. heroic* lutris", value: customPatternsInput, disabled: isBusy, onChange: (e) => onCustomPatternsInput(e.target.value, true), onBlur: () => {
                                onCustomPatternsInput(customPatternsInput, false);
                                onSaveCustomPatterns();
                            } }) }), errors.custom_patterns && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.error.text }, children: errors.custom_patterns }) }))] }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: onReset, children: "Reset settings" }) })] }));
}

// Self-update of the plugin itself (signed GitHub release), separate from
// the system updates above.
function PluginUpdatesSection({ updating, checking, info, error, onApply, onCheck }) {
    return (SP_JSX.jsxs(DFL.PanelSection, { title: "Plugin update", children: [error && !updating && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.body, color: theme.warning.text }, children: ["\u26A0 ", error] }) })), updating ? (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.body, color: theme.info.text }, children: "Updating plugin... Decky will restart momentarily." }) })) : info?.update_available ? (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs("div", { style: { fontSize: theme.fontSize.body, color: theme.success.text }, children: ["Plugin v", info.latest_version, " available (you have v", info.current_version, ")"] }) }), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", onClick: onApply, children: "Update plugin now" }) })] })) : (SP_JSX.jsxs(SP_JSX.Fragment, { children: [info && info.success === false && info.message && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.tiny, color: theme.error.text }, children: info.message }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: checking, onClick: onCheck, children: checking ? "Checking..." : info?.success && !info?.update_available ? "Plugin is up to date" : "Check for plugin update" }) })] }))] }));
}

const CHECK_EVENT = "cachyos_updater_check";
const UPGRADE_EVENT = "cachyos_updater_upgrade";
const REFRESH_INTERVAL = 4000;
const REFRESH_INTERVAL_UPGRADING = 2000;
const PLUGIN_UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const PLUGIN_UPDATE_DEDUPE_MS = 60 * 1000;
const PLUGIN_UPDATE_TIMEOUT_MS = 60 * 1000;
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
function Content() {
    const [status, setStatus] = SP_REACT.useState(null);
    const [errors, setErrors] = SP_REACT.useState({});
    const [isBusy, setIsBusy] = SP_REACT.useState(false);
    const [checkMessage, setCheckMessage] = SP_REACT.useState(null);
    const [customPatternsInput, setCustomPatternsInput] = SP_REACT.useState("");
    // Plugin self-update flow state
    const [pluginUpdateInfo, setPluginUpdateInfo] = SP_REACT.useState(null);
    const [checkingPluginUpdate, setCheckingPluginUpdate] = SP_REACT.useState(false);
    const [pluginUpdating, setPluginUpdating] = SP_REACT.useState(false);
    const [pluginUpdateError, setPluginUpdateError] = SP_REACT.useState(null);
    // busyRef is the synchronous re-entrancy guard; isBusy is its React mirror.
    const busyRef = SP_REACT.useRef(false);
    const patternsEditingRef = SP_REACT.useRef(false);
    const lastPluginCheckAtRef = SP_REACT.useRef(0);
    const setBusy = SP_REACT.useCallback((val) => {
        busyRef.current = val;
        setIsBusy(val);
    }, []);
    const refreshStatus = SP_REACT.useCallback(async (force = false) => {
        if (!force && busyRef.current)
            return;
        try {
            const s = await getStatus();
            if (!s || !s.success)
                return;
            setStatus(s);
            if (!patternsEditingRef.current) {
                setCustomPatternsInput(s.settings?.custom_patterns ?? "");
            }
        }
        catch (e) {
            console.error("CachyOS Updater: failed to get status", e);
        }
    }, []);
    const runPluginUpdateCheck = SP_REACT.useCallback((force = false) => {
        const now = Date.now();
        if (!force && now - lastPluginCheckAtRef.current < PLUGIN_UPDATE_DEDUPE_MS)
            return;
        lastPluginCheckAtRef.current = now;
        checkForPluginUpdate().then(setPluginUpdateInfo).catch(() => { });
    }, []);
    // Status poll, paused while the panel is hidden; faster while pacman runs.
    const upgradeRunning = status?.upgrade?.state === "running";
    SP_REACT.useEffect(() => {
        let id = null;
        const interval = upgradeRunning ? REFRESH_INTERVAL_UPGRADING : REFRESH_INTERVAL;
        const start = () => {
            if (id)
                return;
            refreshStatus();
            id = setInterval(refreshStatus, interval);
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
    // Backend events refresh the panel immediately (the global toast handler
    // lives in definePlugin so it works with the panel closed).
    SP_REACT.useEffect(() => {
        const onCheck = () => {
            void refreshStatus(true);
        };
        const onUpgrade = () => {
            void refreshStatus(true);
        };
        addEventListener(CHECK_EVENT, onCheck);
        addEventListener(UPGRADE_EVENT, onUpgrade);
        return () => {
            removeEventListener(CHECK_EVENT, onCheck);
            removeEventListener(UPGRADE_EVENT, onUpgrade);
        };
    }, [refreshStatus]);
    // Plugin self-update: check on mount and periodically while open.
    SP_REACT.useEffect(() => {
        runPluginUpdateCheck();
        const id = setInterval(() => {
            if (!document.hidden)
                runPluginUpdateCheck();
        }, PLUGIN_UPDATE_CHECK_INTERVAL);
        return () => clearInterval(id);
    }, [runPluginUpdateCheck]);
    // Safety timeout for the plugin self-update: if plugin_loader hasn't
    // restarted us within 60s, the detached script probably failed.
    SP_REACT.useEffect(() => {
        if (!pluginUpdating)
            return;
        const id = setTimeout(() => {
            setPluginUpdating(false);
            setBusy(false);
            setPluginUpdateError("Plugin update didn't complete. Try again, or reinstall with install.sh.");
        }, PLUGIN_UPDATE_TIMEOUT_MS);
        return () => clearTimeout(id);
    }, [pluginUpdating, setBusy]);
    // ---- handlers ----
    const runAction = async (key, fn) => {
        if (busyRef.current)
            return;
        setBusy(true);
        setErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        try {
            const result = await fn();
            if (result && !result.success) {
                const detail = result.detail ? ` (${result.detail})` : "";
                setErrors((prev) => ({ ...prev, [key]: (result.message ?? "Something went wrong") + detail }));
            }
        }
        catch (e) {
            console.error(`CachyOS Updater: ${key} failed`, e);
            setErrors((prev) => ({ ...prev, [key]: "Backend call failed - check the Decky log." }));
        }
        finally {
            await refreshStatus(true);
            setBusy(false);
        }
    };
    const handleCheckNow = async () => {
        if (busyRef.current)
            return;
        setCheckMessage(null);
        setBusy(true);
        setErrors((prev) => {
            const next = { ...prev };
            delete next.check;
            return next;
        });
        // Show "Checking..." immediately - the backend flag only flips once the
        // call has reached it.
        setStatus((prev) => (prev ? { ...prev, check: { ...prev.check, in_progress: true } } : prev));
        try {
            const result = await checkForUpdates();
            if (!result.success) {
                const detail = result.detail ? ` (${result.detail})` : "";
                setErrors((prev) => ({ ...prev, check: (result.message ?? "Update check failed") + detail }));
            }
            else if (result.skipped) {
                setCheckMessage(result.message ?? "Check skipped.");
            }
            else if ((result.updates_count ?? 0) === 0) {
                setCheckMessage("System is up to date.");
            }
        }
        catch (e) {
            console.error("CachyOS Updater: check failed", e);
            setErrors((prev) => ({ ...prev, check: "Backend call failed - check the Decky log." }));
        }
        finally {
            await refreshStatus(true);
            setBusy(false);
        }
    };
    const startUpgrade$1 = () => runAction("upgrade", () => startUpgrade());
    const confirmUpgrade = () => {
        if (busyRef.current || !status)
            return;
        const count = status.check.updates.length;
        const size = formatBytes(status.check.total_download_size);
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { strTitle: "Install system updates", strDescription: `pacman -Syu will install ${count} package update${count === 1 ? "" : "s"}` +
                (size ? ` (${size} download)` : "") +
                ". Running games may be affected; kernel or graphics updates need a reboot afterwards. " +
                "The update keeps running even if you close this menu or Steam.", strOKButtonText: "Install", onOK: () => {
                void startUpgrade$1();
            } }));
    };
    const confirmReboot = () => {
        if (busyRef.current)
            return;
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { strTitle: "Reboot now?", strDescription: "The device restarts immediately. Make sure no game is running.", strOKButtonText: "Reboot", onOK: () => {
                void runAction("reboot", () => rebootSystem());
            } }));
    };
    const handleDismissResult = () => runAction("dismiss", () => dismissUpgradeResult());
    const handleToggleBootWake = (val) => runAction("boot_wake", () => setCheckOnBootWake(val));
    const handleIntervalChange = (hours) => runAction("interval", () => setCheckInterval(hours));
    const handleToggleGamingOnly = (val) => runAction("gaming_only", () => setGamingOnlyNotify(val));
    const handleFilterChange = (mode) => runAction("list_filter", () => setListFilter(mode));
    const handleSaveCustomPatterns = () => {
        if ((status?.settings.custom_patterns ?? "") === customPatternsInput.trim())
            return;
        void runAction("custom_patterns", () => setCustomPatterns(customPatternsInput));
    };
    const confirmReset = () => {
        if (busyRef.current)
            return;
        DFL.showModal(SP_JSX.jsx(DFL.ConfirmModal, { strTitle: "Reset settings", strDescription: "Restores the default check schedule and notification mode. Pending updates are not affected.", strOKButtonText: "Reset", onOK: () => {
                void runAction("reset", () => resetSettings());
            } }));
    };
    const handleApplyPluginUpdate = async () => {
        if (busyRef.current)
            return;
        setBusy(true);
        setPluginUpdateError(null);
        setPluginUpdating(true);
        try {
            const res = await applyPluginUpdate();
            if (res && res.success === false) {
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
        lastPluginCheckAtRef.current = Date.now();
        try {
            setPluginUpdateInfo(await checkForPluginUpdate());
        }
        catch {
            // ignore
        }
        setCheckingPluginUpdate(false);
    };
    // ---- render ----
    if (!status) {
        return SP_JSX.jsx(DFL.PanelSection, { title: "CachyOS Updater" });
    }
    const s = status.settings;
    const check = status.check;
    const upgrade = status.upgrade;
    const updates = check.updates;
    const relevant = check.relevant_count;
    const gamingOnly = s.gaming_only_notify;
    const running = upgrade.state === "running";
    const showResult = !running && upgrade.state !== "idle" && !upgrade.acknowledged;
    const rebootNeeded = status.reboot_required || (showResult && upgrade.reboot_recommended);
    let statusLine;
    let statusColor = theme.text.secondary;
    if (check.in_progress) {
        statusLine = "Checking for updates...";
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
    else if (gamingOnly && relevant === 0) {
        statusLine = `${updates.length} update${updates.length === 1 ? "" : "s"} pending, none gaming-relevant.`;
    }
    else {
        const size = formatBytes(check.total_download_size);
        statusLine =
            `${updates.length} update${updates.length === 1 ? "" : "s"} available` +
                (relevant > 0 ? ` · ${relevant} gaming-relevant` : "") +
                (size ? ` · ${size}` : "");
        statusColor = relevant > 0 || !gamingOnly ? theme.info.text : theme.text.secondary;
    }
    return (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(PanelHeader, { distroName: status.distro_name, kernel: status.kernel_running, version: status.version ?? "?", lastCheckAt: check.last_check_at, trigger: check.trigger }), !status.pacman_available && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: "pacman was not found. This plugin only works on CachyOS / Arch-based systems." })), pluginUpdateInfo?.update_available && !pluginUpdating && (SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: handleApplyPluginUpdate, children: ["Update plugin to v", pluginUpdateInfo.latest_version] }) }) })), showResult && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(Banner, { variant: upgrade.state === "succeeded" ? (upgrade.reboot_recommended ? "warning" : "success") : "error", icon: upgrade.state === "succeeded" ? "✓" : "✕", children: upgrade.state === "succeeded"
                            ? `Update finished: ${upgrade.message}` +
                                (upgrade.pacnew ? ` ${upgrade.pacnew} .pacnew file${upgrade.pacnew === 1 ? "" : "s"} to review.` : "") +
                                (upgrade.reboot_required
                                    ? " The running kernel was replaced - reboot required."
                                    : upgrade.reboot_recommended
                                        ? " Kernel, graphics or Steam components changed - reboot recommended."
                                        : "")
                            : upgrade.state === "interrupted"
                                ? upgrade.message
                                : `Update failed: ${upgrade.message} Run "sudo pacman -Syu" from Desktop Mode or a TTY to resolve it.` }), SP_JSX.jsxs(DFL.PanelSection, { children: [rebootNeeded && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: confirmReboot, children: "Reboot now" }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: handleDismissResult, children: "Dismiss" }) })] })] })), !showResult && status.reboot_required && !running && (SP_JSX.jsxs(SP_JSX.Fragment, { children: [SP_JSX.jsx(Banner, { variant: "warning", icon: "\u26A0", children: "The running kernel was replaced by an update - reboot to load the new kernel." }), SP_JSX.jsx(DFL.PanelSection, { children: SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy, onClick: confirmReboot, children: "Reboot now" }) }) })] })), status.pacman_locked && !running && (SP_JSX.jsx(Banner, { variant: "info", icon: "\u2139", children: "Another package manager holds the pacman lock. Checks and updates wait until it finishes." })), errors.check && (SP_JSX.jsx(Banner, { variant: "warning", icon: "\u26A0", children: errors.check })), !errors.check && !check.ok && check.error && !check.in_progress && (SP_JSX.jsx(Banner, { variant: "warning", icon: "\u26A0", children: check.error })), errors.upgrade && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: errors.upgrade })), errors.reboot && (SP_JSX.jsx(Banner, { variant: "error", icon: "\u2715", children: errors.reboot })), running ? (SP_JSX.jsx(UpgradeProgress, { upgrade: upgrade })) : (SP_JSX.jsxs(DFL.PanelSection, { title: "System updates", children: [SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.body, color: statusColor }, children: statusLine }) }), checkMessage && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx("div", { style: { fontSize: theme.fontSize.small, color: theme.text.subtitle }, children: checkMessage }) })), updates.length > 0 && (SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsxs(DFL.ButtonItem, { layout: "below", disabled: isBusy || check.in_progress || status.pacman_locked || !status.pacman_available, onClick: confirmUpgrade, children: ["Install ", updates.length, " update", updates.length === 1 ? "" : "s"] }) })), SP_JSX.jsx(DFL.PanelSectionRow, { children: SP_JSX.jsx(DFL.ButtonItem, { layout: "below", disabled: isBusy || check.in_progress || !status.pacman_available, onClick: handleCheckNow, children: check.in_progress ? "Checking..." : "Check now" }) })] })), !running && updates.length > 0 && (SP_JSX.jsx(UpdateList, { updates: updates, filter: s.list_filter, onFilterChange: handleFilterChange })), SP_JSX.jsx(SettingsSection, { settings: s, intervalChoices: status.interval_choices, gamingGroups: status.gaming_groups, isBusy: isBusy, errors: errors, customPatternsInput: customPatternsInput, onCustomPatternsInput: (value, editing) => {
                    patternsEditingRef.current = editing;
                    setCustomPatternsInput(value);
                }, onToggleBootWake: handleToggleBootWake, onIntervalChange: handleIntervalChange, onToggleGamingOnly: handleToggleGamingOnly, onSaveCustomPatterns: handleSaveCustomPatterns, onReset: confirmReset }), SP_JSX.jsx(PluginUpdatesSection, { updating: pluginUpdating, checking: checkingPluginUpdate, info: pluginUpdateInfo, error: pluginUpdateError, onApply: handleApplyPluginUpdate, onCheck: handleCheckForPluginUpdate }), SP_JSX.jsx(PanelFooter, { version: status.version ?? "?" })] }));
}
var index = definePlugin(() => {
    // Toasts must work with the QAM closed, so the listeners live here rather
    // than in the panel component. The backend decides whether a check result
    // deserves a toast (new set, gaming-relevant filter, daily reminder).
    const onCheckEvent = (p) => {
        if (!p || !p.notify)
            return;
        const names = p.relevant_names?.length ? p.relevant_names.join(", ") : "";
        const body = p.relevant_count > 0
            ? `${p.updates_count} update${p.updates_count === 1 ? "" : "s"} available - ${names}${p.relevant_count > p.relevant_names.length ? ", …" : ""}`
            : `${p.updates_count} system update${p.updates_count === 1 ? "" : "s"} available`;
        toaster.toast({
            title: "CachyOS Updater",
            body,
            icon: SP_JSX.jsx(FaDownload, {}),
            duration: 8000,
            onClick: () => DFL.Navigation.OpenQuickAccessMenu(),
        });
    };
    const onUpgradeEvent = (p) => {
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
            onClick: () => DFL.Navigation.OpenQuickAccessMenu(),
        });
    };
    addEventListener(CHECK_EVENT, onCheckEvent);
    addEventListener(UPGRADE_EVENT, onUpgradeEvent);
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
            removeEventListener(CHECK_EVENT, onCheckEvent);
            removeEventListener(UPGRADE_EVENT, onUpgradeEvent);
            resumeUnsub?.unregister();
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
