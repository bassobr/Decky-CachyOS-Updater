import { PanelSection, PanelSectionRow, ProgressBar } from "@decky/ui";
import type { UpgradeInfo } from "../types";
import { theme } from "../theme";
import { formatDuration } from "../utils";

interface UpgradeProgressProps {
  upgrade: UpgradeInfo;
}

// Bar drawn with plain divs. Used when Steam's ProgressBar module can't be
// located (findModuleExport returns undefined after a Steam client update).
function FallbackBar({ percent, indeterminate }: { percent: number; indeterminate: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "6px",
        borderRadius: "3px",
        overflow: "hidden",
        background: theme.surface.lg,
      }}
    >
      <style>{`@keyframes cu-indeterminate{0%{left:-40%}100%{left:100%}}`}</style>
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: indeterminate ? "40%" : `${Math.max(0, Math.min(100, percent))}%`,
          background: theme.info.text,
          borderRadius: "3px",
          transition: indeterminate ? "none" : "width 0.4s ease",
          animation: indeterminate ? "cu-indeterminate 1.4s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}

// Live view of the running pacman transaction, fed from the log tail the
// backend parses on every status poll.
//
// Deliberately not ProgressBarWithInfo: that component is a Steam Field, and
// a Field puts its child in the right-hand value column next to an (empty)
// label column, which pushed the bar far to the right. Its ItemProps
// `layout` prop is not the Field's `childrenLayout`, so it had no effect.
// Steam's raw ProgressBar in a full-width div sidesteps the Field entirely;
// the operation text and counts are rendered by us.
export function UpgradeProgress({ upgrade }: UpgradeProgressProps) {
  const p = upgrade.progress;
  const percent = p?.percent ?? 0;
  const indeterminate = percent <= 2;
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
        <div style={{ width: "100%", boxSizing: "border-box", padding: "4px 0" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "8px",
              marginBottom: "6px",
              fontSize: theme.fontSize.body,
              color: theme.text.primary,
            }}
          >
            <span style={{ overflowWrap: "anywhere" }}>{label}</span>
            {counts ? (
              <span style={{ flexShrink: 0, fontSize: theme.fontSize.small, color: theme.text.secondary }}>
                {indeterminate ? counts : `${counts} · ${Math.round(percent)}%`}
              </span>
            ) : !indeterminate ? (
              <span style={{ flexShrink: 0, fontSize: theme.fontSize.small, color: theme.text.secondary }}>
                {Math.round(percent)}%
              </span>
            ) : null}
          </div>
          <div style={{ width: "100%" }}>
            {ProgressBar ? (
              <ProgressBar nProgress={percent} indeterminate={indeterminate} focusable={false} />
            ) : (
              <FallbackBar percent={percent} indeterminate={indeterminate} />
            )}
          </div>
        </div>
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
