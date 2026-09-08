import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import { useState } from "react";
import { theme } from "../theme";
import * as backend from "../backend";

interface PanelFooterProps {
  version: string;
}

export function PanelFooter({ version }: PanelFooterProps) {
  const [diagState, setDiagState] = useState<"idle" | "copying" | "done" | "error">("idle");
  const rowStyle: React.CSSProperties = {
    fontSize: theme.fontSize.tiny,
    color: theme.text.dim,
  };

  const handleCopyDiagnostics = async () => {
    setDiagState("copying");
    try {
      const info = await backend.getDiagnosticInfo();
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      setDiagState("done");
      setTimeout(() => setDiagState("idle"), 5000);
    } catch {
      setDiagState("error");
      setTimeout(() => setDiagState("idle"), 3000);
    }
  };

  const label =
    diagState === "done"
      ? "Copied to clipboard"
      : diagState === "error"
        ? "Failed to collect diagnostics"
        : diagState === "copying"
          ? "Collecting..."
          : "Copy diagnostics";

  return (
    <PanelSection>
      <PanelSectionRow>
        <div style={rowStyle}>v{version} - by bassobr</div>
      </PanelSectionRow>
      <PanelSectionRow>
        <div style={rowStyle}>
          Upgrade logs: /var/log/cachyos-updater/
          <br />
          Bugs? Report at github.com/bassobr/Decky-CachyOS-Updater
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
