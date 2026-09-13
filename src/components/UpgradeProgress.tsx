import { PanelSection, PanelSectionRow, ProgressBarWithInfo } from "@decky/ui";
import type { UpgradeInfo } from "../types";
import { theme } from "../theme";
import { formatDuration } from "../utils";

interface UpgradeProgressProps {
  upgrade: UpgradeInfo;
}

// Live view of the running pacman transaction, fed from the log tail the
// backend parses on every status poll.
export function UpgradeProgress({ upgrade }: UpgradeProgressProps) {
  const p = upgrade.progress;
  const percent = p?.percent ?? 0;
  const label = p?.label ?? "Starting";
  const counts =
    p && p.total > 0
      ? p.phase === "download"
        ? `${Math.min(p.downloaded, p.total)}/${p.total} downloaded`
        : p.phase === "install"
          ? `${Math.min(p.processed, p.total)}/${p.total} installed`
          : p.phase === "hooks" && p.hooks_total > 0
            ? `hook ${p.hooks_done}/${p.hooks_total}`
            : `${p.total} packages`
      : "";
  const elapsed = upgrade.started_at ? formatDuration(Math.floor(Date.now() / 1000) - upgrade.started_at) : "";

  return (
    <PanelSection title="System update in progress">
      <PanelSectionRow>
        <ProgressBarWithInfo
          layout="below"
          nProgress={percent}
          indeterminate={percent <= 2}
          sOperationText={label}
          sTimeRemaining={counts}
          bottomSeparator="none"
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.muted, wordBreak: "break-word" }}>
          {p?.last_line ? p.last_line : "Waiting for pacman output..."}
          {elapsed ? <><br />Running for {elapsed}. Sleep is blocked until it finishes.</> : null}
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.dim }}>
          The update runs as its own system service - closing this menu, restarting Steam or Decky won't
          interrupt it.
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
