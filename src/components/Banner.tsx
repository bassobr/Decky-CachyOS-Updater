import { PanelSection, PanelSectionRow } from "@decky/ui";
import type { ReactNode } from "react";
import { theme } from "../theme";

type BannerVariant = "success" | "warning" | "error" | "info";

interface BannerProps {
  variant: BannerVariant;
  icon?: ReactNode;
  children: ReactNode;
}

// Shared banner styling for the panel's inline notifications (upgrade
// result, reboot hint, pacman lock, check errors). Banners are display-only:
// the gamepad cannot focus them, so every action they announce needs a
// ButtonItem next to them. Long unbreakable strings (mirror URLs, package
// paths) wrap instead of widening the ~300 px panel.
export function Banner({ variant, icon, children }: BannerProps) {
  const palette = theme[variant];
  return (
    <PanelSection>
      <PanelSectionRow>
        <div
          style={{
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
          }}
        >
          {icon !== undefined && (
            <span style={{ fontSize: theme.fontSize.icon, flexShrink: 0 }}>{icon}</span>
          )}
          <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
        </div>
      </PanelSectionRow>
    </PanelSection>
  );
}
