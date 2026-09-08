export interface PluginSettings {
  check_on_boot_wake: boolean;
  check_interval_hours: number;
  gaming_only_notify: boolean;
  custom_patterns: string;
  list_filter: string; // "all" | "gaming"
  distro_id: string;
  distro_name: string;
  last_applied: number;
}

export interface UpdateEntry {
  name: string;
  old_version: string;
  new_version: string;
  download_size: number;
  repo: string;
  category: string | null;
  relevant: boolean;
}

export interface CheckState {
  last_check_at: number;
  trigger: string;
  ok: boolean;
  error: string;
  in_progress: boolean;
  updates: UpdateEntry[];
  relevant_count: number;
  total_download_size: number;
}

export interface UpgradeProgress {
  phase: string;
  label: string;
  total: number;
  downloaded: number;
  processed: number;
  hooks_done: number;
  hooks_total: number;
  percent: number;
  pacnew: number;
  errors: string[];
  upgraded: string[];
  nothing_to_do: boolean;
  exit_code: number | null;
  last_line: string;
}

export type UpgradeState = "idle" | "running" | "succeeded" | "failed" | "interrupted";

export interface UpgradeInfo {
  state: UpgradeState;
  started_at: number;
  finished_at: number;
  exit_code: number | null;
  log_path: string;
  upgraded: string[];
  pacnew: number;
  errors: string[];
  reboot_required: boolean;
  reboot_recommended: boolean;
  message: string;
  acknowledged: boolean;
  progress?: UpgradeProgress;
}

export interface GamingGroup {
  id: string;
  label: string;
  patterns: string[];
}

export interface PluginStatus {
  success: boolean;
  version?: string;
  distro_name: string;
  distro_id: string;
  kernel_running: string;
  pacman_available: boolean;
  settings: PluginSettings;
  check: CheckState;
  upgrade: UpgradeInfo;
  pacman_locked: boolean;
  reboot_required: boolean;
  interval_choices: number[];
  gaming_groups: GamingGroup[];
  error?: string;
  message?: string;
}

export interface MethodResult {
  success: boolean;
  error?: string;
  message?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface CheckResult extends MethodResult {
  skipped?: boolean;
  trigger?: string;
  updates?: UpdateEntry[];
  updates_count?: number;
  relevant_count?: number;
  notify?: boolean;
}

export interface PluginUpdateCheckResult {
  success: boolean;
  current_version?: string;
  latest_version?: string;
  update_available?: boolean;
  release_url?: string;
  message?: string;
}

export interface CheckEventPayload {
  trigger: string;
  success: boolean;
  updates_count: number;
  relevant_count: number;
  relevant_names: string[];
  notify: boolean;
  gaming_only: boolean;
  message: string;
}

export interface UpgradeEventPayload {
  state: UpgradeState;
  message: string;
  upgraded_count: number;
  reboot_required: boolean;
  reboot_recommended: boolean;
  exit_code: number | null;
}

export type BadgeStatus = "active" | "drifted" | "off" | "error" | "unknown";

// Human labels for the backend's classification groups.
export const CATEGORY_LABELS: Record<string, string> = {
  kernel: "Kernel",
  graphics: "Graphics",
  gaming: "Gaming",
  handheld: "Handheld",
  system: "System",
  custom: "Custom",
};
