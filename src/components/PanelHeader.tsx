import { PanelSection, PanelSectionRow } from "@decky/ui";
import { theme } from "../theme";
import { timeAgo, timeUntil, triggerLabel } from "../utils";

interface PanelHeaderProps {
  distroName: string;
  kernel: string;
  lastCheckAt: number;
  trigger: string;
  intervalHours: number;
  checking: boolean;
}

// Distro/kernel pill plus the single place that says when the last check
// ran and when the next automatic one is due.
export function PanelHeader({ distroName, kernel, lastCheckAt, trigger, intervalHours, checking }: PanelHeaderProps) {
  const via = triggerLabel(trigger);
  const nextAt = intervalHours > 0 ? (lastCheckAt || Math.floor(Date.now() / 1000)) + intervalHours * 3600 : 0;
  return (
    <PanelSection>
      <PanelSectionRow>
        <span
          style={{
            fontSize: theme.fontSize.tiny,
            background: theme.surface.md,
            padding: "2px 8px",
            borderRadius: theme.radius.pill,
            color: theme.text.tertiary,
          }}
        >
          {distroName && distroName !== "Unknown" ? distroName : "Unknown distro"}
          {kernel && kernel !== "unknown" ? ` · kernel ${kernel}` : ""}
        </span>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.muted }}>
          {checking
            ? "Checking for updates now..."
            : `Last check: ${timeAgo(lastCheckAt)}${lastCheckAt && via ? ` (${via})` : ""}`}
          {nextAt ? ` · next ${timeUntil(nextAt)}` : ""}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
