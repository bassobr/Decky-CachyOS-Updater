export type NotifyMode = "all" | "gaming" | "off";

export interface PluginSettings {
  check_on_boot_wake: boolean;
  check_interval_hours: number;
  notify_mode: NotifyMode | string;
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
  detail: string;
  in_progress: boolean;
  kind: string;
  resolve_error: string;
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
  failure_kind: string;
  acknowledged: boolean;
  progress?: UpgradeProgress;
}

export interface PowerState {
  battery_percent: number | null;
  on_ac: boolean | null;
  low_battery: boolean;
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
  boot_time: number;
  network_online: boolean;
  power: PowerState;
  settings: PluginSettings;
  check: CheckState;
  upgrade: UpgradeInfo;
  pacman_locked: boolean;
  pacman_lock_stale: boolean;
  reboot_required: boolean;
  interval_choices: number[];
  notify_modes: string[];
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
  notify_mode: string;
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

export interface PendingNotification {
  kind: "check" | "upgrade";
  payload: CheckEventPayload | UpgradeEventPayload;
  created_at: number;
}

export interface PendingNotificationResult extends MethodResult {
  notifications: PendingNotification[];
}

export interface UpgradeLogResult extends MethodResult {
  path?: string;
  lines?: string[];
}

// Human labels for the backend's classification groups.
export const CATEGORY_LABELS: Record<string, string> = {
  kernel: "Kernel",
  graphics: "Graphics",
  gaming: "Gaming",
  handheld: "Handheld",
  system: "System",
  custom: "Custom",
};

export const DECKY_LOG_DIR = "~/homebrew/logs/CachyOS Updater/";
export const UPGRADE_LOG_DIR = "/var/log/cachyos-updater/";
