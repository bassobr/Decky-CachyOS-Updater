import { ModalRoot } from "@decky/ui";
import { theme } from "../theme";

interface LogModalProps {
  title: string;
  path: string;
  lines: string[];
  closeModal?: () => void;
}

// Read-only view of the pacman log tail for a failed or interrupted run.
// showModal() injects closeModal.
export function LogModal({ title, path, lines, closeModal }: LogModalProps) {
  return (
    <ModalRoot onCancel={closeModal} closeModal={closeModal}>
      <div style={{ fontSize: theme.fontSize.heading, fontWeight: 600, marginBottom: "6px" }}>{title}</div>
      <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.muted, marginBottom: "8px", overflowWrap: "anywhere" }}>
        {path || "no log file"}
      </div>
      <pre
        style={{
          margin: 0,
          maxHeight: "60vh",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          fontSize: theme.fontSize.small,
          lineHeight: "1.4",
          color: theme.text.primary,
          background: theme.surface.sm,
          padding: "8px",
          borderRadius: theme.radius.md,
        }}
      >
        {lines.length ? lines.join("\n") : "The log is empty."}
      </pre>
    </ModalRoot>
  );
}
