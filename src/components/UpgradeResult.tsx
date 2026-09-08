import { useState } from "react";
import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import type { UpgradeInfo } from "../types";
import { Banner } from "./Banner";
import { theme } from "../theme";
import { needsManualIntervention } from "../utils";

interface UpgradeResultProps {
  upgrade: UpgradeInfo;
  bootTime: number;
  isBusy: boolean;
  onDismiss: () => void;
  onReboot: () => void;
  onRetry: () => void;
  onShowLog: () => void;
}

// Everything the user sees after a run ended: the result banner with the
// right advice, the actions that follow from it, and - after the result has
// been dismissed - a persistent reboot reminder until the device actually
// rebooted (finished_at newer than the current boot).
export function UpgradeResult({ upgrade, bootTime, isBusy, onDismiss, onReboot, onRetry, onShowLog }: UpgradeResultProps) {
  const [showPackages, setShowPackages] = useState(false);
  if (upgrade.state === "idle" || upgrade.state === "running") return null;

  const rebootPending =
    (upgrade.reboot_required || upgrade.reboot_recommended) && upgrade.finished_at > 0 && upgrade.finished_at > bootTime;

  if (upgrade.acknowledged) {
    if (!rebootPending) return null;
    return (
      <>
        <Banner variant="warning" icon="⚠">
          {upgrade.reboot_required
            ? "Reboot required: the running kernel was replaced by the last update."
            : "Reboot recommended since the last update (kernel, graphics or Steam components changed)."}
        </Banner>
        <PanelSection>
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={onReboot}>
              Reboot now
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  }

  const manual = needsManualIntervention(upgrade.errors, upgrade.message);
  const smallText: React.CSSProperties = {
    fontSize: theme.fontSize.small,
    color: theme.text.secondary,
    overflowWrap: "anywhere",
  };

  if (upgrade.state === "succeeded") {
    const count = upgrade.upgraded.length;
    return (
      <>
        <Banner variant={rebootPending ? "warning" : "success"} icon="✓">
          Update finished: {upgrade.message}
          {upgrade.pacnew ? ` ${upgrade.pacnew} .pacnew file${upgrade.pacnew === 1 ? "" : "s"} to review.` : ""}
          {upgrade.reboot_required
            ? " The running kernel was replaced - reboot required."
            : upgrade.reboot_recommended
              ? " Kernel, graphics or Steam components changed - reboot recommended."
              : ""}
        </Banner>
        <PanelSection>
          {count > 0 && (
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={() => setShowPackages(!showPackages)}>
                {showPackages ? "Hide packages" : `Show ${count} upgraded package${count === 1 ? "" : "s"}`}
              </ButtonItem>
            </PanelSectionRow>
          )}
          {showPackages && (
            <PanelSectionRow>
              <div style={smallText}>{upgrade.upgraded.join(", ")}</div>
            </PanelSectionRow>
          )}
          {rebootPending && (
            <PanelSectionRow>
              <ButtonItem layout="below" disabled={isBusy} onClick={onReboot}>
                Reboot now
              </ButtonItem>
            </PanelSectionRow>
          )}
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={onDismiss}>
              Dismiss
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  }

  const interrupted = upgrade.state === "interrupted";
  return (
    <>
      <Banner variant={interrupted ? "warning" : "error"} icon={interrupted ? "⚠" : "✕"}>
        {interrupted ? upgrade.message : `Update failed: ${upgrade.message}`}
      </Banner>
      <PanelSection>
        {upgrade.errors.length > 0 && (
          <PanelSectionRow>
            <div style={{ ...smallText, color: theme.error.text }}>
              {upgrade.errors.slice(-3).map((e, i) => (
                <div key={i}>• {e}</div>
              ))}
            </div>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <div style={smallText}>
            {interrupted
              ? "pacman did not finish (the system restarted or the service was killed). Run Check now, then install again."
              : manual
                ? 'This needs a decision pacman cannot make on its own. Run "sudo pacman -Syu" once from Desktop Mode or a TTY (Ctrl+Alt+F3).'
                : "This looks like a network or mirror problem. Check the connection and try again."}
          </div>
        </PanelSectionRow>
        {!interrupted && !manual && (
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={isBusy} onClick={onRetry}>
              Try again
            </ButtonItem>
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={onShowLog}>
            Show log
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={onDismiss}>
            Dismiss
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
}
