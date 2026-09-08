import { useState } from "react";
import { PanelSectionRow, ToggleField, Focusable } from "@decky/ui";
import { theme } from "../theme";

interface InfoRowProps {
  label: string;
  subtitle: string;
  explanation: string;
  checked: boolean;
  disabled?: boolean;
  error?: string | null;
  onChange: (val: boolean) => void;
  children?: React.ReactNode;
}

// A toggle with a one-line subtitle and a longer explanation behind a
// gamepad-focusable "What does this do?" row (a tap target inside the
// ToggleField label would be touch-only in the QAM).
export function InfoRow({
  label,
  subtitle,
  explanation,
  checked,
  disabled = false,
  error,
  onChange,
  children,
}: InfoRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <PanelSectionRow>
        <ToggleField
          label={label}
          description={
            error ? (
              <span style={{ color: theme.error.text, overflowWrap: "anywhere" }}>{error}</span>
            ) : (
              <span style={{ color: theme.text.subtitle, fontSize: theme.fontSize.small }}>{subtitle}</span>
            )
          }
          checked={checked}
          disabled={disabled}
          bottomSeparator="none"
          onChange={onChange}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <Focusable
          onActivate={() => setExpanded(!expanded)}
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            marginBottom: "6px",
            borderRadius: theme.radius.md,
            fontSize: theme.fontSize.tiny,
            color: expanded ? theme.info.text : theme.text.tertiary,
            background: expanded ? theme.info.bg : "transparent",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: expanded ? theme.info.accentBg : theme.surface.lg,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            i
          </span>
          <span>{expanded ? "Hide details" : "What does this do?"}</span>
        </Focusable>
      </PanelSectionRow>
      {expanded && (
        <PanelSectionRow>
          <div
            style={{
              padding: "8px 12px",
              marginBottom: "6px",
              background: theme.surface.xs,
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.small,
              lineHeight: "1.5",
              color: theme.text.secondary,
              overflowWrap: "anywhere",
            }}
          >
            {explanation}
          </div>
        </PanelSectionRow>
      )}
      {children}
    </>
  );
}
