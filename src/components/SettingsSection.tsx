import { PanelSection, PanelSectionRow, DropdownItem, TextField, ButtonItem } from "@decky/ui";
import type { GamingGroup, PluginSettings } from "../types";
import { InfoRow } from "./InfoRow";
import { theme } from "../theme";
import { timeUntil } from "../utils";

interface SettingsSectionProps {
  settings: PluginSettings;
  intervalChoices: number[];
  gamingGroups: GamingGroup[];
  lastCheckAt: number;
  isBusy: boolean;
  errors: Record<string, string>;
  customPatternsInput: string;
  customPatternsDirty: boolean;
  onCustomPatternsInput: (value: string) => void;
  onToggleBootWake: (val: boolean) => void;
  onIntervalChange: (hours: number) => void;
  onNotifyModeChange: (mode: string) => void;
  onSaveCustomPatterns: () => void;
  onReset: () => void;
}

const NOTIFY_OPTIONS = [
  { data: "all", label: "All updates" },
  { data: "gaming", label: "Gaming-relevant only" },
  { data: "off", label: "Off" },
];

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
  lastCheckAt,
  isBusy,
  errors,
  customPatternsInput,
  customPatternsDirty,
  onCustomPatternsInput,
  onToggleBootWake,
  onIntervalChange,
  onNotifyModeChange,
  onSaveCustomPatterns,
  onReset,
}: SettingsSectionProps) {
  const intervalOptions = intervalChoices.map((h) => ({ data: h, label: intervalLabel(h) }));
  const groupSummary = gamingGroups
    .map((g) => `${g.label}: ${g.patterns.slice(0, 4).join(", ")}${g.patterns.length > 4 ? ", …" : ""}`)
    .join(" · ");
  const nextAt =
    settings.check_interval_hours > 0
      ? (lastCheckAt || Math.floor(Date.now() / 1000)) + settings.check_interval_hours * 3600
      : 0;
  const errorText = (key: string) =>
    errors[key] ? (
      <PanelSectionRow>
        <div style={{ fontSize: theme.fontSize.small, color: theme.error.text, overflowWrap: "anywhere" }}>{errors[key]}</div>
      </PanelSectionRow>
    ) : null;

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
          description={nextAt ? `Next automatic check ${timeUntil(nextAt)}` : "Only on boot, wake or manually"}
          rgOptions={intervalOptions}
          selectedOption={settings.check_interval_hours}
          disabled={isBusy}
          onChange={(option: { data: number }) => onIntervalChange(option.data)}
        />
      </PanelSectionRow>
      {errorText("interval")}
      <PanelSectionRow>
        <DropdownItem
          label="Notifications"
          description={
            settings.notify_mode === "off"
              ? "No toasts; the panel still shows pending updates"
              : settings.notify_mode === "gaming"
                ? "Toast only for kernel, Mesa, Steam, gamescope, handheld drivers…"
                : "Toast whenever new updates are found"
          }
          rgOptions={NOTIFY_OPTIONS}
          selectedOption={NOTIFY_OPTIONS.some((o) => o.data === settings.notify_mode) ? settings.notify_mode : "all"}
          disabled={isBusy}
          onChange={(option: { data: string }) => onNotifyModeChange(option.data)}
        />
      </PanelSectionRow>
      {errorText("notify_mode")}
      <PanelSectionRow>
        <div style={{ fontSize: theme.fontSize.tiny, color: theme.text.muted, overflowWrap: "anywhere", paddingBottom: "4px" }}>
          Gaming-relevant groups: {groupSummary}. All updates are still listed and installed together - pacman never
          does partial upgrades.
        </div>
      </PanelSectionRow>
      <PanelSectionRow>
        <TextField
          label="Extra gaming-relevant packages"
          description="Space-separated globs, e.g. heroic* lutris"
          value={customPatternsInput}
          disabled={isBusy}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCustomPatternsInput(e.target.value)}
          onBlur={onSaveCustomPatterns}
        />
      </PanelSectionRow>
      {customPatternsDirty && (
        <PanelSectionRow>
          <ButtonItem layout="below" disabled={isBusy} onClick={onSaveCustomPatterns}>
            Save patterns
          </ButtonItem>
        </PanelSectionRow>
      )}
      {errorText("custom_patterns")}
      <PanelSectionRow>
        <ButtonItem layout="below" disabled={isBusy} onClick={onReset}>
          Reset settings
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
}
