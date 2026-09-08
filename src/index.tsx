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
  showModal,
  staticClasses,
} from "@decky/ui";
import { addEventListener, removeEventListener, definePlugin, toaster } from "@decky/api";
import { FaDownload } from "react-icons/fa";

import * as backend from "./backend";
import type {
  CheckEventPayload,
  MethodResult,
  PluginStatus,
  PluginUpdateCheckResult,
  UpgradeEventPayload,
} from "./types";
import { Banner } from "./components/Banner";
import { PanelHeader } from "./components/PanelHeader";
import { PanelFooter } from "./components/PanelFooter";
import { UpdateList } from "./components/UpdateList";
import { UpgradeProgress } from "./components/UpgradeProgress";
import { SettingsSection } from "./components/SettingsSection";
import { PluginUpdatesSection } from "./components/PluginUpdatesSection";
import { theme } from "./theme";
import { formatBytes, timeAgo } from "./utils";

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

function Content() {
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [customPatternsInput, setCustomPatternsInput] = useState("");

  // Plugin self-update flow state
  const [pluginUpdateInfo, setPluginUpdateInfo] = useState<PluginUpdateCheckResult | null>(null);
  const [checkingPluginUpdate, setCheckingPluginUpdate] = useState(false);
  const [pluginUpdating, setPluginUpdating] = useState(false);
  const [pluginUpdateError, setPluginUpdateError] = useState<string | null>(null);

  // busyRef is the synchronous re-entrancy guard; isBusy is its React mirror.
  const busyRef = useRef(false);
  const patternsEditingRef = useRef(false);
  const lastPluginCheckAtRef = useRef<number>(0);

  const setBusy = useCallback((val: boolean) => {
    busyRef.current = val;
    setIsBusy(val);
  }, []);

  const refreshStatus = useCallback(async (force: boolean = false) => {
    if (!force && busyRef.current) return;
    try {
      const s = await backend.getStatus();
      if (!s || !s.success) return;
      setStatus(s);
      if (!patternsEditingRef.current) {
        setCustomPatternsInput(s.settings?.custom_patterns ?? "");
      }
    } catch (e) {
      console.error("CachyOS Updater: failed to get status", e);
    }
  }, []);

  const runPluginUpdateCheck = useCallback((force: boolean = false) => {
    const now = Date.now();
    if (!force && now - lastPluginCheckAtRef.current < PLUGIN_UPDATE_DEDUPE_MS) return;
    lastPluginCheckAtRef.current = now;
    backend.checkForPluginUpdate().then(setPluginUpdateInfo).catch(() => {});
  }, []);

  // Status poll, paused while the panel is hidden; faster while pacman runs.
  const upgradeRunning = status?.upgrade?.state === "running";
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const interval = upgradeRunning ? REFRESH_INTERVAL_UPGRADING : REFRESH_INTERVAL;
    const start = () => {
      if (id) return;
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
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [refreshStatus, upgradeRunning]);

  // Backend events refresh the panel immediately (the global toast handler
  // lives in definePlugin so it works with the panel closed).
  useEffect(() => {
    const onCheck = () => {
      void refreshStatus(true);
    };
    const onUpgrade = () => {
      void refreshStatus(true);
    };
    addEventListener<[CheckEventPayload]>(CHECK_EVENT, onCheck);
    addEventListener<[UpgradeEventPayload]>(UPGRADE_EVENT, onUpgrade);
    return () => {
      removeEventListener(CHECK_EVENT, onCheck);
      removeEventListener(UPGRADE_EVENT, onUpgrade);
    };
  }, [refreshStatus]);

  // Plugin self-update: check on mount and periodically while open.
  useEffect(() => {
    runPluginUpdateCheck();
    const id = setInterval(() => {
      if (!document.hidden) runPluginUpdateCheck();
    }, PLUGIN_UPDATE_CHECK_INTERVAL);
    return () => clearInterval(id);
  }, [runPluginUpdateCheck]);

  // Safety timeout for the plugin self-update: if plugin_loader hasn't
  // restarted us within 60s, the detached script probably failed.
  useEffect(() => {
    if (!pluginUpdating) return;
    const id = setTimeout(() => {
      setPluginUpdating(false);
      setBusy(false);
      setPluginUpdateError("Plugin update didn't complete. Try again, or reinstall with install.sh.");
    }, PLUGIN_UPDATE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [pluginUpdating, setBusy]);

  // ---- handlers ----

  const runAction = async (key: string, fn: () => Promise<MethodResult>) => {
    if (busyRef.current) return;
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
    } catch (e) {
      console.error(`CachyOS Updater: ${key} failed`, e);
      setErrors((prev) => ({ ...prev, [key]: "Backend call failed - check the Decky log." }));
    } finally {
      await refreshStatus(true);
      setBusy(false);
    }
  };

  const handleCheckNow = async () => {
    if (busyRef.current) return;
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
      const result = await backend.checkForUpdates();
      if (!result.success) {
        const detail = result.detail ? ` (${result.detail})` : "";
        setErrors((prev) => ({ ...prev, check: (result.message ?? "Update check failed") + detail }));
      } else if (result.skipped) {
        setCheckMessage(result.message ?? "Check skipped.");
      } else if ((result.updates_count ?? 0) === 0) {
        setCheckMessage("System is up to date.");
      }
    } catch (e) {
      console.error("CachyOS Updater: check failed", e);
      setErrors((prev) => ({ ...prev, check: "Backend call failed - check the Decky log." }));
    } finally {
      await refreshStatus(true);
      setBusy(false);
    }
  };

  const startUpgrade = () => runAction("upgrade", () => backend.startUpgrade());

  const confirmUpgrade = () => {
    if (busyRef.current || !status) return;
    const count = status.check.updates.length;
    const size = formatBytes(status.check.total_download_size);
    showModal(
      <ConfirmModal
        strTitle="Install system updates"
        strDescription={
          `pacman -Syu will install ${count} package update${count === 1 ? "" : "s"}` +
          (size ? ` (${size} download)` : "") +
          ". Running games may be affected; kernel or graphics updates need a reboot afterwards. " +
          "The update keeps running even if you close this menu or Steam."
        }
        strOKButtonText="Install"
        onOK={() => {
          void startUpgrade();
        }}
      />
    );
  };

  const confirmReboot = () => {
    if (busyRef.current) return;
    showModal(
      <ConfirmModal
        strTitle="Reboot now?"
        strDescription="The device restarts immediately. Make sure no game is running."
        strOKButtonText="Reboot"
        onOK={() => {
          void runAction("reboot", () => backend.rebootSystem());
        }}
      />
    );
  };

  const handleDismissResult = () => runAction("dismiss", () => backend.dismissUpgradeResult());

  const handleToggleBootWake = (val: boolean) => runAction("boot_wake", () => backend.setCheckOnBootWake(val));
  const handleIntervalChange = (hours: number) => runAction("interval", () => backend.setCheckInterval(hours));
  const handleToggleGamingOnly = (val: boolean) => runAction("gaming_only", () => backend.setGamingOnlyNotify(val));
  const handleFilterChange = (mode: string) => runAction("list_filter", () => backend.setListFilter(mode));
  const handleSaveCustomPatterns = () => {
    if ((status?.settings.custom_patterns ?? "") === customPatternsInput.trim()) return;
    void runAction("custom_patterns", () => backend.setCustomPatterns(customPatternsInput));
  };

  const confirmReset = () => {
    if (busyRef.current) return;
    showModal(
      <ConfirmModal
        strTitle="Reset settings"
        strDescription="Restores the default check schedule and notification mode. Pending updates are not affected."
        strOKButtonText="Reset"
        onOK={() => {
          void runAction("reset", () => backend.resetSettings());
        }}
      />
    );
  };

  const handleApplyPluginUpdate = async () => {
    if (busyRef.current) return;
    setBusy(true);
    setPluginUpdateError(null);
    setPluginUpdating(true);
    try {
      const res = await backend.applyPluginUpdate();
      if (res && res.success === false) {
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
    lastPluginCheckAtRef.current = Date.now();
    try {
      setPluginUpdateInfo(await backend.checkForPluginUpdate());
    } catch {
      // ignore
    }
    setCheckingPluginUpdate(false);
  };

  // ---- render ----

  if (!status) {
    return <PanelSection title="CachyOS Updater" />;
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

  let statusLine: string;
  let statusColor: string = theme.text.secondary;
  if (check.in_progress) {
    statusLine = "Checking for updates...";
  } else if (!check.last_check_at) {
    statusLine = "Not checked yet.";
  } else if (!check.ok) {
    statusLine = `Last check failed ${timeAgo(check.last_check_at)}.`;
    statusColor = theme.warning.text;
  } else if (updates.length === 0) {
    statusLine = `System is up to date (checked ${timeAgo(check.last_check_at)}).`;
    statusColor = theme.success.text;
  } else if (gamingOnly && relevant === 0) {
    statusLine = `${updates.length} update${updates.length === 1 ? "" : "s"} pending, none gaming-relevant.`;
  } else {
    const size = formatBytes(check.total_download_size);
    statusLine =
      `${updates.length} update${updates.length === 1 ? "" : "s"} available` +
      (relevant > 0 ? ` · ${relevant} gaming-relevant` : "") +
      (size ? ` · ${size}` : "");
    statusColor = relevant > 0 || !gamingOnly ? theme.info.text : theme.text.secondary;
  }

  return (
    <>
      <PanelHeader
        distroName={status.distro_name}
        kernel={status.kernel_running}
        version={status.version ?? "?"}
        lastCheckAt={check.last_check_at}
        trigger={check.trigger}
      />

      {!status.pacman_available && (
        <Banner variant="error" icon="✕">
          pacman was not found. This plugin only works on CachyOS / Arch-based systems.
        </Banner>
      )}

      {/* Plugin self-update available */}
      {pluginUpdateInfo?.update_available && !pluginUpdating && (
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={handleApplyPluginUpdate}>
              Update plugin to v{pluginUpdateInfo.latest_version}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {/* Result of the last upgrade run */}
      {showResult && (
        <>
          <Banner
            variant={upgrade.state === "succeeded" ? (upgrade.reboot_recommended ? "warning" : "success") : "error"}
            icon={upgrade.state === "succeeded" ? "✓" : "✕"}
          >
            {upgrade.state === "succeeded"
              ? `Update finished: ${upgrade.message}` +
                (upgrade.pacnew ? ` ${upgrade.pacnew} .pacnew file${upgrade.pacnew === 1 ? "" : "s"} to review.` : "") +
                (upgrade.reboot_required
                  ? " The running kernel was replaced - reboot required."
                  : upgrade.reboot_recommended
                    ? " Kernel, graphics or Steam components changed - reboot recommended."
                    : "")
              : upgrade.state === "interrupted"
                ? upgrade.message
                : `Update failed: ${upgrade.message} Run "sudo pacman -Syu" from Desktop Mode or a TTY to resolve it.`}
          </Banner>
          <PanelSection>
            {rebootNeeded && (
              <PanelSectionRow>
                <ButtonItem layout="below" disabled={isBusy} onClick={confirmReboot}>
                  Reboot now
                </ButtonItem>
              </PanelSectionRow>
            )}
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={handleDismissResult}>
                Dismiss
              </ButtonItem>
            </PanelSectionRow>
          </PanelSection>
        </>
      )}

      {/* Kernel replaced earlier (e.g. update from Desktop Mode) */}
      {!showResult && status.reboot_required && !running && (
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

      {status.pacman_locked && !running && (
        <Banner variant="info" icon="ℹ">
          Another package manager holds the pacman lock. Checks and updates wait until it finishes.
        </Banner>
      )}

      {errors.check && (
        <Banner variant="warning" icon="⚠">
          {errors.check}
        </Banner>
      )}
      {!errors.check && !check.ok && check.error && !check.in_progress && (
        <Banner variant="warning" icon="⚠">
          {check.error}
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

      {running ? (
        <UpgradeProgress upgrade={upgrade} />
      ) : (
        <PanelSection title="System updates">
          <PanelSectionRow>
            <div style={{ fontSize: theme.fontSize.body, color: statusColor }}>{statusLine}</div>
          </PanelSectionRow>
          {checkMessage && (
            <PanelSectionRow>
              <div style={{ fontSize: theme.fontSize.small, color: theme.text.subtitle }}>{checkMessage}</div>
            </PanelSectionRow>
          )}
          {updates.length > 0 && (
            <PanelSectionRow>
              <ButtonItem
                layout="below"
                disabled={isBusy || check.in_progress || status.pacman_locked || !status.pacman_available}
                onClick={confirmUpgrade}
              >
                Install {updates.length} update{updates.length === 1 ? "" : "s"}
              </ButtonItem>
            </PanelSectionRow>
          )}
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              disabled={isBusy || check.in_progress || !status.pacman_available}
              onClick={handleCheckNow}
            >
              {check.in_progress ? "Checking..." : "Check now"}
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}

      {!running && updates.length > 0 && (
        <UpdateList updates={updates} filter={s.list_filter} onFilterChange={handleFilterChange} />
      )}

      <SettingsSection
        settings={s}
        intervalChoices={status.interval_choices}
        gamingGroups={status.gaming_groups}
        isBusy={isBusy}
        errors={errors}
        customPatternsInput={customPatternsInput}
        onCustomPatternsInput={(value, editing) => {
          patternsEditingRef.current = editing;
          setCustomPatternsInput(value);
        }}
        onToggleBootWake={handleToggleBootWake}
        onIntervalChange={handleIntervalChange}
        onToggleGamingOnly={handleToggleGamingOnly}
        onSaveCustomPatterns={handleSaveCustomPatterns}
        onReset={confirmReset}
      />

      <PluginUpdatesSection
        updating={pluginUpdating}
        checking={checkingPluginUpdate}
        info={pluginUpdateInfo}
        error={pluginUpdateError}
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
  // deserves a toast (new set, gaming-relevant filter, daily reminder).
  const onCheckEvent = (p: CheckEventPayload) => {
    if (!p || !p.notify) return;
    const names = p.relevant_names?.length ? p.relevant_names.join(", ") : "";
    const body =
      p.relevant_count > 0
        ? `${p.updates_count} update${p.updates_count === 1 ? "" : "s"} available - ${names}${
            p.relevant_count > p.relevant_names.length ? ", …" : ""
          }`
        : `${p.updates_count} system update${p.updates_count === 1 ? "" : "s"} available`;
    toaster.toast({
      title: "CachyOS Updater",
      body,
      icon: <FaDownload />,
      duration: 8000,
      onClick: () => Navigation.OpenQuickAccessMenu(),
    });
  };
  const onUpgradeEvent = (p: UpgradeEventPayload) => {
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
      onClick: () => Navigation.OpenQuickAccessMenu(),
    });
  };
  addEventListener<[CheckEventPayload]>(CHECK_EVENT, onCheckEvent);
  addEventListener<[UpgradeEventPayload]>(UPGRADE_EVENT, onUpgradeEvent);

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
      removeEventListener(CHECK_EVENT, onCheckEvent);
      removeEventListener(UPGRADE_EVENT, onUpgradeEvent);
      resumeUnsub?.unregister();
    },
  };
});
