import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  PanelSection,
  PanelSectionRow,
  ButtonItem,
  ConfirmModal,
  Navigation,
  QuickAccessTab,
  Router,
  showModal,
  staticClasses,
} from "@decky/ui";
import { addEventListener, removeEventListener, definePlugin, toaster } from "@decky/api";
import { FaDownload } from "react-icons/fa";

import * as backend from "./backend";
import type {
  CheckEventPayload,
  MethodResult,
  PendingNotification,
  PluginStatus,
  PluginUpdateCheckResult,
  UpgradeEventPayload,
} from "./types";
import { DECKY_LOG_DIR } from "./types";
import { Banner } from "./components/Banner";
import { PanelHeader } from "./components/PanelHeader";
import { PanelFooter } from "./components/PanelFooter";
import { UpdateList } from "./components/UpdateList";
import { UpgradeProgress } from "./components/UpgradeProgress";
import { UpgradeResult } from "./components/UpgradeResult";
import { SettingsSection } from "./components/SettingsSection";
import { PluginUpdatesSection } from "./components/PluginUpdatesSection";
import { LogModal } from "./components/LogModal";
import { theme } from "./theme";
import { formatBytes, timeAgo, withTimeout } from "./utils";

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
let pluginUpdateCache: { info: PluginUpdateCheckResult | null; checkedAt: number } = { info: null, checkedAt: 0 };
let pluginUpdatingSince = 0;

function toastCheck(p: CheckEventPayload) {
  if (!p || !p.notify) return;
  const names = p.relevant_names?.length ? p.relevant_names.join(", ") : "";
  const more = p.relevant_count > (p.relevant_names?.length ?? 0) ? ", …" : "";
  const body =
    p.relevant_count > 0
      ? `${p.updates_count} update${p.updates_count === 1 ? "" : "s"} available - ${names}${more}`
      : `${p.updates_count} system update${p.updates_count === 1 ? "" : "s"} available`;
  toaster.toast({
    title: "CachyOS Updater",
    body,
    icon: <FaDownload />,
    duration: 8000,
    onClick: () => Navigation.OpenQuickAccessMenu(QuickAccessTab.Decky),
  });
}

function toastUpgrade(p: UpgradeEventPayload) {
  if (!p) return;
  const body =
    p.state === "succeeded"
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
    icon: <FaDownload />,
    duration: 10000,
    critical: p.state !== "succeeded",
    onClick: () => Navigation.OpenQuickAccessMenu(QuickAccessTab.Decky),
  });
}

// Catches render-time exceptions in the panel tree so a bad status shape or
// other unexpected error surfaces a recoverable message instead of Decky
// blanking the panel.
class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };

  static getDerivedStateFromError(err: Error) {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("CachyOS Updater render error:", err, info);
  }

  render() {
    if (this.state.err) {
      return (
        <Banner variant="error">
          CachyOS Updater hit an unexpected error. Close and reopen the panel to recover. If it keeps
          happening, please report at github.com/bassobr/Decky-CachyOS-Updater.
        </Banner>
      );
    }
    return this.props.children;
  }
}

const RENDERED_ERROR_KEYS = new Set([
  "check", "upgrade", "reboot", "boot_wake", "interval", "notify_mode", "custom_patterns", "lock",
]);

function Content() {
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // isBusy locks the short setter-style actions; checking only the two
  // buttons that would conflict with a running check (30-60 s).
  const [isBusy, setIsBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [customPatternsInput, setCustomPatternsInput] = useState("");

  const [pluginUpdateInfo, setPluginUpdateInfo] = useState<PluginUpdateCheckResult | null>(pluginUpdateCache.info);
  const [checkingPluginUpdate, setCheckingPluginUpdate] = useState(false);
  const [pluginUpdating, setPluginUpdating] = useState(Date.now() - pluginUpdatingSince < PLUGIN_UPDATE_TIMEOUT_MS);
  const [pluginUpdateError, setPluginUpdateError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const patternsEditingRef = useRef(false);
  const pollSeqRef = useRef(0);
  const failedPollsRef = useRef(0);
  const lastCheckAtRef = useRef<number | null>(null);

  const setBusy = useCallback((val: boolean) => {
    busyRef.current = val;
    setIsBusy(val);
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const refreshStatus = useCallback(async (force: boolean = false) => {
    if (!force && busyRef.current) return;
    // Sequence number: a response that started before a newer request (or
    // before an optimistic update) is dropped instead of reverting the UI.
    const seq = ++pollSeqRef.current;
    try {
      const s = await backend.getStatus();
      if (seq !== pollSeqRef.current) return;
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
    } catch (e) {
      failedPollsRef.current++;
      if (failedPollsRef.current >= STATUS_FAILURES_BEFORE_BANNER) {
        setStatusError("Couldn't reach the plugin backend.");
      }
      console.error("CachyOS Updater: failed to get status", e);
    }
  }, [clearError]);

  const runPluginUpdateCheck = useCallback(async (force: boolean = false) => {
    const now = Date.now();
    if (!force && now - pluginUpdateCache.checkedAt < PLUGIN_UPDATE_CACHE_MS) {
      setPluginUpdateInfo(pluginUpdateCache.info);
      return;
    }
    pluginUpdateCache.checkedAt = now;
    try {
      const info = await backend.checkForPluginUpdate();
      pluginUpdateCache = { info, checkedAt: Date.now() };
      setPluginUpdateInfo(info);
    } catch {
      // offline or backend not ready; the button stays available
    }
  }, []);

  // Status poll, paused while the panel is hidden; faster while pacman runs.
  const upgradeRunning = status?.upgrade?.state === "running";
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const interval = upgradeRunning ? REFRESH_INTERVAL_UPGRADING : REFRESH_INTERVAL;
    const start = () => {
      if (id) return;
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
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [refreshStatus, upgradeRunning]);

  // Backend events refresh the panel immediately (toasts are handled in
  // definePlugin so they work with the panel closed).
  useEffect(() => {
    const onEvent = () => {
      void refreshStatus(true);
    };
    addEventListener<[CheckEventPayload]>(CHECK_EVENT, onEvent);
    addEventListener<[UpgradeEventPayload]>(UPGRADE_EVENT, onEvent);
    return () => {
      removeEventListener(CHECK_EVENT, onEvent);
      removeEventListener(UPGRADE_EVENT, onEvent);
    };
  }, [refreshStatus]);

  useEffect(() => {
    void runPluginUpdateCheck();
  }, [runPluginUpdateCheck]);

  // Safety timeout for the plugin self-update: if plugin_loader hasn't
  // restarted us within 60 s, the detached script probably failed (it never
  // restarts Decky on a failed copy, so the old version keeps running).
  useEffect(() => {
    if (!pluginUpdating) return;
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

  const runAction = async (key: string, fn: () => Promise<MethodResult>, what: string = "The action") => {
    if (busyRef.current) return;
    setBusy(true);
    clearError(key);
    try {
      const result = await withTimeout(fn(), ACTION_TIMEOUT_MS, what);
      if (result && !result.success) {
        const detail = result.detail ? ` (${result.detail})` : "";
        setErrors((prev) => ({ ...prev, [key]: (result.message ?? "Something went wrong") + detail }));
      }
    } catch (e) {
      console.error(`CachyOS Updater: ${key} failed`, e);
      setErrors((prev) => ({ ...prev, [key]: `${what} failed - see ${DECKY_LOG_DIR}` }));
    } finally {
      await refreshStatus(true);
      setBusy(false);
    }
  };

  const handleCheckNow = async () => {
    if (checking || busyRef.current) return;
    setChecking(true);
    setCheckMessage(null);
    clearError("check");
    // Optimistic "Checking..." and invalidate in-flight polls so an older
    // response can't revert it; the backend flag takes over on the next poll.
    pollSeqRef.current++;
    setStatus((prev) => (prev ? { ...prev, check: { ...prev.check, in_progress: true } } : prev));
    let frontendError: string | null = null;
    let skippedMessage: string | null = null;
    try {
      const result = await withTimeout(backend.checkForUpdates(), CHECK_TIMEOUT_MS, "The update check");
      if (!result.success) {
        // Persisted failures (mirror/lock) come back through status;
        // the ones the backend does not record are shown from here.
        if (result.error === "offline" || result.error === "pacman_locked" || result.error === "no_pacman" || result.error === "upgrade_running") {
          frontendError = result.message ?? "Update check failed.";
        }
      } else if (result.skipped) {
        skippedMessage = result.message ?? "Check skipped.";
      }
    } catch (e) {
      console.error("CachyOS Updater: check failed", e);
      frontendError = `The update check did not finish in time - see ${DECKY_LOG_DIR}`;
    } finally {
      await refreshStatus(true);
      if (frontendError) setErrors((prev) => ({ ...prev, check: frontendError! }));
      if (skippedMessage) setCheckMessage(skippedMessage);
      setChecking(false);
    }
  };

  const startUpgrade = () => runAction("upgrade", () => backend.startUpgrade(), "Starting the update");

  const confirmUpgrade = () => {
    if (busyRef.current || !status) return;
    const check = status.check;
    const updates = check.updates;
    const relevant = updates.filter((u) => u.relevant);
    const size = formatBytes(check.total_download_size);
    const hasKernel = updates.some((u) => u.category === "kernel");
    const stale = check.last_check_at > 0 && Math.floor(Date.now() / 1000) - check.last_check_at > STALE_CHECK_FOR_INSTALL_S;
    const power = status.power;
    const batteryWarn =
      power.battery_percent !== null && power.battery_percent < BATTERY_WARN_PERCENT && !power.on_ac;
    const shownRelevant = relevant.slice(0, 6);
    const running = Router.MainRunningApp?.display_name;
    showModal(
      <ConfirmModal
        strTitle="Install system updates"
        strOKButtonText="Install"
        onOK={() => {
          void startUpgrade();
        }}
        strDescription={
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>
              pacman -Syu will install {updates.length} package update{updates.length === 1 ? "" : "s"}
              {size ? ` (${size} download)` : ""}.
            </div>
            {shownRelevant.length > 0 && (
              <div>
                Gaming-relevant:{" "}
                {shownRelevant.map((u) => `${u.name} ${u.new_version}`).join(", ")}
                {relevant.length > shownRelevant.length ? ` and ${relevant.length - shownRelevant.length} more` : ""}.
              </div>
            )}
            <div>
              {hasKernel
                ? "This includes a kernel update - a reboot will be required afterwards."
                : "Kernel or graphics updates need a reboot afterwards."}
            </div>
            {running && <div>{running} is running and may misbehave while its files are replaced - quit it first.</div>}
            {batteryWarn && (
              <div style={{ color: theme.warning.text }}>
                Battery at {power.battery_percent}% and not charging - plug in first (below 25% the update is refused).
              </div>
            )}
            {stale && (
              <div style={{ color: theme.text.secondary }}>
                Based on a check {timeAgo(check.last_check_at)}; pacman re-syncs and may install a slightly different set.
              </div>
            )}
            <div style={{ color: theme.text.secondary }}>
              The update keeps running even if you close this menu or Steam; sleep is blocked until it finishes.
            </div>
          </div>
        }
      />
    );
  };

  const confirmReboot = () => {
    if (busyRef.current) return;
    const running = Router.MainRunningApp?.display_name;
    showModal(
      <ConfirmModal
        strTitle="Reboot now?"
        strDescription={
          running
            ? `${running} is still running and will be closed. The device restarts immediately.`
            : "The device restarts immediately."
        }
        strOKButtonText="Reboot"
        onOK={() => {
          void runAction("reboot", () => backend.rebootSystem(), "Reboot");
        }}
      />
    );
  };

  const handleShowLog = async () => {
    try {
      const r = await withTimeout(backend.getUpgradeLog(80), ACTION_TIMEOUT_MS, "Loading the log");
      showModal(<LogModal title="Upgrade log (last 80 lines)" path={r.path ?? ""} lines={r.lines ?? []} />);
    } catch (e) {
      console.error("CachyOS Updater: log fetch failed", e);
      setErrors((prev) => ({ ...prev, upgrade: `Couldn't load the log - see ${DECKY_LOG_DIR}` }));
    }
  };

  const handleDismissResult = () => runAction("dismiss", () => backend.dismissUpgradeResult(), "Dismiss");
  const handleClearStaleLock = () => runAction("lock", () => backend.clearStaleLock(), "Removing the lock");
  const handleToggleBootWake = (val: boolean) => runAction("boot_wake", () => backend.setCheckOnBootWake(val), "Saving");
  const handleIntervalChange = (hours: number) => runAction("interval", () => backend.setCheckInterval(hours), "Saving");
  const handleNotifyModeChange = (mode: string) => runAction("notify_mode", () => backend.setNotifyMode(mode), "Saving");
  const handleFilterChange = (mode: string) => runAction("list_filter", () => backend.setListFilter(mode), "Saving");

  const savedPatterns = status?.settings.custom_patterns ?? "";
  const customPatternsDirty = customPatternsInput.trim() !== savedPatterns;
  const handleSaveCustomPatterns = async () => {
    if (!customPatternsDirty) {
      patternsEditingRef.current = false;
      return;
    }
    if (busyRef.current) return;
    setBusy(true);
    clearError("custom_patterns");
    try {
      const result = await withTimeout(backend.setCustomPatterns(customPatternsInput), ACTION_TIMEOUT_MS, "Saving");
      if (result.success) {
        // Only a successful save hands the field back to the status poll;
        // a rejected value stays visible next to its error.
        patternsEditingRef.current = false;
      } else {
        setErrors((prev) => ({ ...prev, custom_patterns: result.message ?? "Couldn't save the patterns." }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, custom_patterns: `Saving failed - see ${DECKY_LOG_DIR}` }));
    } finally {
      await refreshStatus(true);
      setBusy(false);
    }
  };

  const confirmReset = () => {
    if (busyRef.current) return;
    showModal(
      <ConfirmModal
        strTitle="Reset settings"
        strDescription="Restores the default check schedule and notification mode. Pending updates are not affected."
        strOKButtonText="Reset"
        onOK={() => {
          patternsEditingRef.current = false;
          void runAction("reset", () => backend.resetSettings(), "Reset");
        }}
      />
    );
  };

  const handleApplyPluginUpdate = async () => {
    if (busyRef.current) return;
    setBusy(true);
    setPluginUpdateError(null);
    pluginUpdatingSince = Date.now();
    setPluginUpdating(true);
    try {
      const res = await backend.applyPluginUpdate();
      if (res && res.success === false) {
        pluginUpdatingSince = 0;
        setPluginUpdating(false);
        setBusy(false);
        setPluginUpdateError(res.message ?? "Plugin update failed to start.");
      }
      // On success plugin_loader restarts us; the UI stays locked until then.
    } catch {
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
      return (
        <>
          <Banner variant="error" icon="✕">
            Couldn't reach the plugin backend: {statusError}. Check {DECKY_LOG_DIR}
          </Banner>
          <PanelSection>
            <PanelSectionRow>
              <ButtonItem
                layout="below"
                onClick={() => {
                  failedPollsRef.current = 0;
                  setStatusError(null);
                  void refreshStatus(true);
                }}
              >
                Retry
              </ButtonItem>
            </PanelSectionRow>
          </PanelSection>
        </>
      );
    }
    return <PanelSection title="System updates" spinner />;
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
  const listStale =
    upgrade.state === "succeeded" && upgrade.finished_at > 0 && check.last_check_at < upgrade.finished_at && updates.length > 0;
  const lockBlocked = status.pacman_locked;
  const cannotInstall = !!check.resolve_error;
  const installDisabled =
    isBusy || checkBusy || lockBlocked || !status.pacman_available || !status.network_online || status.power.low_battery || cannotInstall || listStale;

  let statusLine: string;
  let statusColor: string = theme.text.secondary;
  if (checkBusy) {
    statusLine = "Checking for updates... this can take a minute.";
  } else if (listStale) {
    statusLine = "Update finished - refreshing the pending list...";
  } else if (!check.last_check_at) {
    statusLine = "Not checked yet.";
  } else if (!check.ok) {
    statusLine = `Last check failed ${timeAgo(check.last_check_at)}.`;
    statusColor = theme.warning.text;
  } else if (updates.length === 0) {
    statusLine = `System is up to date (checked ${timeAgo(check.last_check_at)}).`;
    statusColor = theme.success.text;
  } else if (notifyMode === "gaming" && relevant === 0) {
    statusLine = `${updates.length} update${updates.length === 1 ? "" : "s"} pending, none gaming-relevant.`;
  } else {
    const size = formatBytes(check.total_download_size);
    statusLine =
      `${updates.length} update${updates.length === 1 ? "" : "s"} available` +
      (relevant > 0 ? ` · ${relevant} gaming-relevant` : "") +
      (size ? ` · ${size}` : "");
    statusColor = theme.info.text;
  }

  const otherErrors = Object.entries(errors).filter(([k]) => !RENDERED_ERROR_KEYS.has(k));

  return (
    <>
      <PanelHeader
        distroName={status.distro_name}
        kernel={status.kernel_running}
        lastCheckAt={check.last_check_at}
        trigger={check.trigger}
        intervalHours={s.check_interval_hours}
        checking={checkBusy}
      />

      {statusError && (
        <Banner variant="warning" icon="⚠">
          Status updates are failing: {statusError}
        </Banner>
      )}

      {!status.pacman_available && (
        <Banner variant="error" icon="✕">
          pacman was not found. This plugin only works on CachyOS / Arch-based systems.
        </Banner>
      )}

      {pluginUpdateInfo?.update_available && !pluginUpdating && (
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy || running} onClick={handleApplyPluginUpdate}>
              Update plugin to v{pluginUpdateInfo.latest_version}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {!running && (
        <UpgradeResult
          upgrade={upgrade}
          bootTime={status.boot_time}
          isBusy={isBusy}
          onDismiss={handleDismissResult}
          onReboot={confirmReboot}
          onRetry={confirmUpgrade}
          onShowLog={() => void handleShowLog()}
        />
      )}

      {/* Kernel replaced by an update we did not run (e.g. from Desktop Mode);
          UpgradeResult already shows the reboot prompt for our own runs. */}
      {!running &&
        status.reboot_required &&
        !(upgrade.finished_at > status.boot_time && (upgrade.reboot_required || upgrade.reboot_recommended)) && (
        <>
          <Banner variant="warning" icon="⚠">
            The running kernel was replaced by an update - reboot to load the new kernel.
          </Banner>
          <PanelSection>
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={confirmReboot}>
                Reboot now
              </ButtonItem>
            </PanelSectionRow>
          </PanelSection>
        </>
      )}

      {lockBlocked && !running && (
        <>
          <Banner variant={status.pacman_lock_stale ? "warning" : "info"} icon={status.pacman_lock_stale ? "⚠" : "ℹ"}>
            {status.pacman_lock_stale
              ? "A stale pacman lock (/var/lib/pacman/db.lck) is blocking checks and updates. No package manager is running, so it was left behind by an interrupted transaction."
              : "Another package manager holds the pacman lock; checks and updates are paused until it finishes."}
          </Banner>
          {status.pacman_lock_stale && (
            <PanelSection>
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={handleClearStaleLock}>
                  Remove stale lock
                </ButtonItem>
              </PanelSectionRow>
            </PanelSection>
          )}
        </>
      )}
      {errors.lock && (
        <Banner variant="error" icon="✕">
          {errors.lock}
        </Banner>
      )}

      {!status.network_online && (
        <Banner variant="info" icon="ℹ">
          No network connection. Checks resume automatically once WiFi is back.
        </Banner>
      )}

      {errors.check && (
        <Banner variant="warning" icon="⚠">
          {errors.check}
        </Banner>
      )}
      {!errors.check && !check.ok && check.error && !checkBusy && (
        <Banner variant="warning" icon="⚠">
          {check.error}
          {check.detail ? ` (${check.detail})` : ""}
          {check.kind === "network" ? " Check the WiFi connection and try again." : ""}
        </Banner>
      )}
      {cannotInstall && !running && !listStale && (
        <Banner variant="error" icon="✕">
          These updates can't be installed automatically: {check.resolve_error} Run "sudo pacman -Syu" once from
          Desktop Mode or a TTY (Ctrl+Alt+F3).
        </Banner>
      )}
      {errors.upgrade && (
        <Banner variant="error" icon="✕">
          {errors.upgrade}
        </Banner>
      )}
      {errors.reboot && (
        <Banner variant="error" icon="✕">
          {errors.reboot}
        </Banner>
      )}
      {otherErrors.map(([key, message]) => (
        <Banner key={key} variant="error" icon="✕">
          {message}
        </Banner>
      ))}

      {running ? (
        <UpgradeProgress upgrade={upgrade} />
      ) : (
        <PanelSection title="System updates">
          <PanelSectionRow>
            <div style={{ fontSize: theme.fontSize.body, color: statusColor, overflowWrap: "anywhere" }}>{statusLine}</div>
          </PanelSectionRow>
          {checkMessage && (
            <PanelSectionRow>
              <div style={{ fontSize: theme.fontSize.small, color: theme.text.subtitle }}>{checkMessage}</div>
            </PanelSectionRow>
          )}
          {status.power.low_battery && updates.length > 0 && (
            <PanelSectionRow>
              <div style={{ fontSize: theme.fontSize.small, color: theme.warning.text }}>
                Battery at {status.power.battery_percent}% and not charging - plug in to install.
              </div>
            </PanelSectionRow>
          )}
          {updates.length > 0 && !listStale && !cannotInstall && (
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={installDisabled} onClick={confirmUpgrade}>
                Install {updates.length} update{updates.length === 1 ? "" : "s"}
                {check.total_download_size ? ` · ${formatBytes(check.total_download_size)}` : ""}
              </ButtonItem>
            </PanelSectionRow>
          )}
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={checkBusy || isBusy || lockBlocked || !status.pacman_available}
              onClick={handleCheckNow}
            >
              {checkBusy ? "Checking..." : "Check now"}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {!running && !listStale && updates.length > 0 && (
        <UpdateList updates={updates} filter={s.list_filter} onFilterChange={handleFilterChange} />
      )}

      <SettingsSection
        settings={s}
        intervalChoices={status.interval_choices}
        gamingGroups={status.gaming_groups}
        lastCheckAt={check.last_check_at}
        isBusy={isBusy}
        errors={errors}
        customPatternsInput={customPatternsInput}
        customPatternsDirty={customPatternsDirty}
        onCustomPatternsInput={(value) => {
          patternsEditingRef.current = true;
          setCustomPatternsInput(value);
        }}
        onToggleBootWake={handleToggleBootWake}
        onIntervalChange={handleIntervalChange}
        onNotifyModeChange={handleNotifyModeChange}
        onSaveCustomPatterns={() => void handleSaveCustomPatterns()}
        onReset={confirmReset}
      />

      <PluginUpdatesSection
        updating={pluginUpdating}
        checking={checkingPluginUpdate}
        info={pluginUpdateInfo}
        error={pluginUpdateError}
        disabled={isBusy || running}
        onApply={handleApplyPluginUpdate}
        onCheck={handleCheckForPluginUpdate}
      />

      <PanelFooter version={status.version ?? "?"} />
    </>
  );
}

export default definePlugin(() => {
  // Toasts must work with the QAM closed, so the listeners live here rather
  // than in the panel component. The backend decides whether a check result
  // deserves a toast (new set, notification mode, daily reminder) and parks
  // it until we acknowledge, in case we were not loaded when it fired.
  const onCheckEvent = (p: CheckEventPayload) => {
    toastCheck(p);
    if (p?.notify) backend.pullPendingNotifications().catch(() => {});
  };
  const onUpgradeEvent = (p: UpgradeEventPayload) => {
    toastUpgrade(p);
    backend.pullPendingNotifications().catch(() => {});
  };
  addEventListener<[CheckEventPayload]>(CHECK_EVENT, onCheckEvent);
  addEventListener<[UpgradeEventPayload]>(UPGRADE_EVENT, onUpgradeEvent);

  // Anything that fired before this frontend existed (boot check, a run
  // finalized after a reboot).
  const deliverPending = () => {
    backend
      .pullPendingNotifications()
      .then((r) => {
        for (const n of (r?.notifications ?? []) as PendingNotification[]) {
          if (n.kind === "check") toastCheck(n.payload as CheckEventPayload);
          else if (n.kind === "upgrade") toastUpgrade(n.payload as UpgradeEventPayload);
        }
      })
      .catch(() => {});
  };
  // The backend may still be starting when Decky loads the frontends: a
  // failed pull is retried a couple of times with growing delays.
  const pendingTimers = [5000, 30000, 120000].map((ms) => setTimeout(deliverPending, ms));

  // Fast path for the wake check: Steam's own resume hook. UNDOCUMENTED and
  // known to disappear in some Steam builds - every failure is swallowed;
  // the backend's clock-based detector covers resume regardless.
  let resumeUnsub: { unregister(): void } | null = null;
  try {
    const register =
      typeof SteamClient !== "undefined" ? SteamClient?.System?.RegisterForOnResumeFromSuspend : undefined;
    if (typeof register === "function") {
      resumeUnsub = register(() => {
        backend.pokeResume().catch(() => {});
      });
    }
  } catch (e) {
    console.error("CachyOS Updater: failed to register resume listener", e);
  }

  return {
    name: "CachyOS Updater",
    titleView: <div className={staticClasses.Title}>CachyOS Updater</div>,
    content: (
      <ErrorBoundary>
        <Content />
      </ErrorBoundary>
    ),
    icon: <FaDownload />,
    onDismount() {
      pendingTimers.forEach(clearTimeout);
      removeEventListener(CHECK_EVENT, onCheckEvent);
      removeEventListener(UPGRADE_EVENT, onUpgradeEvent);
      resumeUnsub?.unregister();
    },
  };
});
