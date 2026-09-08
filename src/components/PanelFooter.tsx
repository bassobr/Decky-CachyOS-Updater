import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import { useState } from "react";
import { theme } from "../theme";
import { DECKY_LOG_DIR, UPGRADE_LOG_DIR } from "../types";
import * as backend from "../backend";

interface PanelFooterProps {
  version: string;
}

export function PanelFooter({ version }: PanelFooterProps) {
  const [diagState, setDiagState] = useState<"idle" | "copying" | "done" | "saved" | "error">("idle");
  const rowStyle: React.CSSProperties = {
    fontSize: theme.fontSize.small,
    color: theme.text.muted,
    overflowWrap: "anywhere",
  };

  // The backend also writes diagnostics.json next to the upgrade logs, so
  // the report is reachable even when the clipboard is useless in Game Mode.
  const handleCopyDiagnostics = async () => {
    setDiagState("copying");
    try {
      const info = await backend.getDiagnosticInfo();
      try {
        await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
        setDiagState("done");
      } catch {
        setDiagState("saved");
      }
      setTimeout(() => setDiagState("idle"), 6000);
    } catch {
      setDiagState("error");
      setTimeout(() => setDiagState("idle"), 3000);
    }
  };

  const label =
    diagState === "done"
      ? `Copied - also saved to ${UPGRADE_LOG_DIR}diagnostics.json`
      : diagState === "saved"
        ? `Saved to ${UPGRADE_LOG_DIR}diagnostics.json`
        : diagState === "error"
          ? "Failed to collect diagnostics"
          : diagState === "copying"
            ? "Collecting..."
            : "Copy diagnostics";

  return (
    <PanelSection>
      <PanelSectionRow>
        <div style={rowStyle}>CachyOS Updater v{version} - by bassobr</div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={rowStyle}>
          Upgrade logs: {UPGRADE_LOG_DIR}
          <br />
          Plugin log: {DECKY_LOG_DIR}
          <br />
          Bugs? github.com/bassobr/Decky-CachyOS-Updater
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={diagState === "copying"} onClick={handleCopyDiagnostics}>
          {label}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
