import { PanelSection, PanelSectionRow, DropdownItem, TextField, ButtonItem } from "@decky/ui";
import type { GamingGroup, PluginSettings } from "../types";
import { InfoRow } from "./InfoRow";
import { theme } from "../theme";

interface SettingsSectionProps {
  settings: PluginSettings;
  intervalChoices: number[];
  gamingGroups: GamingGroup[];
  isBusy: boolean;
  errors: Record<string, string>;
  customPatternsInput: string;
  onCustomPatternsInput: (value: string, editing: boolean) => void;
  onToggleBootWake: (val: boolean) => void;
  onIntervalChange: (hours: number) => void;
  onToggleGamingOnly: (val: boolean) => void;
  onSaveCustomPatterns: () => void;
  onReset: () => void;
}

function intervalLabel(hours: number): string {
  if (hours <= 0) return "Off";
  if (hours === 1) return "Every hour";
  if (hours === 24) return "Once a day";
  return `Every ${hours} hours`;
}

export function SettingsSection({
  settings,
  intervalChoices,
  gamingGroups,
  isBusy,
  errors,
  customPatternsInput,
  onCustomPatternsInput,
  onToggleBootWake,
  onIntervalChange,
  onToggleGamingOnly,
  onSaveCustomPatterns,
  onReset,
}: SettingsSectionProps) {
  const intervalOptions = intervalChoices.map((h) => ({ data: h, label: intervalLabel(h) }));
  const groupSummary = gamingGroups
    .map((g) => `${g.label}: ${g.patterns.slice(0, 4).join(", ")}${g.patterns.length > 4 ? ", …" : ""}`)
    .join(" · ");

  return (
    <PanelSection title="Settings">
      <InfoRow
        label="Check after boot & wake"
        subtitle="Looks for updates when the device starts or resumes"
        explanation="Runs an update check about 45 seconds after boot and about 20 seconds after the device wakes from sleep, once WiFi is back. The check downloads the package databases into a private copy (like pacman-contrib's checkupdates) and never modifies the system; a failed check is retried a few times while the network comes up."
        checked={settings.check_on_boot_wake}
        disabled={isBusy}
        error={errors.boot_wake}
        onChange={onToggleBootWake}
      />
      <PanelSectionRow>
        <DropdownItem
          label="Periodic check"
          description="Re-check while the device stays on"
          rgOptions={intervalOptions}
          selectedOption={settings.check_interval_hours}
          disabled={isBusy}
          onChange={(option: { data: number }) => onIntervalChange(option.data)}
        />
      </PanelSectionRow>
      {errors.interval && (
        <PanelSectionRow>
          <div style={{ fontSize: theme.fontSize.small, color: theme.error.text }}>{errors.interval}</div>
        </PanelSectionRow>
      )}
      <InfoRow
        label="Gaming-relevant only"
        subtitle="Notify only for kernel, Mesa, Steam, gamescope, handheld drivers…"
        explanation={`With this on, the notification toast only appears when at least one pending update matches a gaming-relevant package group. All updates are still listed and installed together - pacman never does partial upgrades. Groups: ${groupSummary}. Add your own patterns below.`}
        checked={settings.gaming_only_notify}
        disabled={isBusy}
        error={errors.gaming_only}
        onChange={onToggleGamingOnly}
      >
        <PanelSectionRow>
          <TextField
            label="Extra gaming-relevant packages"
            description="Space-separated globs, e.g. heroic* lutris"
            value={customPatternsInput}
            disabled={isBusy}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCustomPatternsInput(e.target.value, true)}
            onBlur={() => {
              onCustomPatternsInput(customPatternsInput, false);
              onSaveCustomPatterns();
            }}
          />
        </PanelSectionRow>
        {errors.custom_patterns && (
          <PanelSectionRow>
            <div style={{ fontSize: theme.fontSize.small, color: theme.error.text }}>{errors.custom_patterns}</div>
          </PanelSectionRow>
        )}
      </InfoRow>
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={isBusy} onClick={onReset}>
          Reset settings
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
