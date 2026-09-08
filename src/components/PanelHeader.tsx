import { PanelSection, PanelSectionRow } from "@decky/ui";
import { theme } from "../theme";
import { timeAgo, triggerLabel } from "../utils";

interface PanelHeaderProps {
  distroName: string;
  kernel: string;
  version: string;
  lastCheckAt: number;
  trigger: string;
}

export function PanelHeader({ distroName, kernel, version, lastCheckAt, trigger }: PanelHeaderProps) {
  const rowStyle: React.CSSProperties = {
    fontSize: theme.fontSize.tiny,
    color: theme.text.muted,
  };
  const when = timeAgo(lastCheckAt);
  const via = triggerLabel(trigger);
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
        <div style={rowStyle}>
          Plugin version: {version}
          <br />
          Last check: {when}
          {lastCheckAt && via ? ` (${via})` : ""}
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
