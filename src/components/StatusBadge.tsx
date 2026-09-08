import { theme } from "../theme";

interface StatusBadgeProps {
  text: string;
}

// Small category chip next to a gaming-relevant package.
export function StatusBadge({ text }: StatusBadgeProps) {
  return (
    <span
      style={{
        fontSize: theme.fontSize.small,
        padding: "2px 6px",
        borderRadius: theme.radius.sm,
        whiteSpace: "nowrap",
        flexShrink: 0,
        background: theme.success.badgeBg,
        color: theme.success.text,
      }}
    >
      {text}
    </span>
  );
}
