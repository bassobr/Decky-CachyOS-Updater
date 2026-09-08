import { PanelSection, PanelSectionRow, ButtonItem } from "@decky/ui";
import type { PluginUpdateCheckResult } from "../types";
import { theme } from "../theme";

interface PluginUpdatesSectionProps {
  updating: boolean;
  checking: boolean;
  info: PluginUpdateCheckResult | null;
  error: string | null;
  onApply: () => void;
  onCheck: () => void;
}

// Self-update of the plugin itself (signed GitHub release), separate from
// the system updates above.
export function PluginUpdatesSection({ updating, checking, info, error, onApply, onCheck }: PluginUpdatesSectionProps) {
  return (
    <PanelSection title="Plugin update">
      {error && !updating && (
        <PanelSectionRow>
          <div style={{ fontSize: theme.fontSize.body, color: theme.warning.text }}>&#9888; {error}</div>
        </PanelSectionRow>
      )}
      {updating ? (
        <PanelSectionRow>
          <div style={{ fontSize: theme.fontSize.body, color: theme.info.text }}>
            Updating plugin... Decky will restart momentarily.
          </div>
        </PanelSectionRow>
      ) : info?.update_available ? (
        <>
          <PanelSectionRow>
            <div style={{ fontSize: theme.fontSize.body, color: theme.success.text }}>
              Plugin v{info.latest_version} available (you have v{info.current_version})
            </div>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem layout="below" onClick={onApply}>
              Update plugin now
            </ButtonItem>
          </PanelSectionRow>
        </>
      ) : (
        <>
          {info && info.success === false && info.message && (
            <PanelSectionRow>
              <div style={{ fontSize: theme.fontSize.tiny, color: theme.error.text }}>{info.message}</div>
            </PanelSectionRow>
          )}
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={checking} onClick={onCheck}>
              {checking ? "Checking..." : info?.success && !info?.update_available ? "Plugin is up to date" : "Check for plugin update"}
            </ButtonItem>
          </PanelSectionRow>
        </>
      )}
    </PanelSection>
  );
}
