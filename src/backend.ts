import { callable } from "@decky/api";
import type {
  CheckResult,
  MethodResult,
  PluginStatus,
  PluginUpdateCheckResult,
  UpgradeInfo,
} from "./types";

export const getStatus = callable<[], PluginStatus>("get_status");
export const checkForUpdates = callable<[], CheckResult>("check_for_updates");
export const startUpgrade = callable<[], MethodResult>("start_upgrade");
export const getUpgradeStatus = callable<[], MethodResult & { upgrade?: UpgradeInfo }>("get_upgrade_status");
export const getUpgradeLog = callable<[maxLines: number], MethodResult & { lines?: string[]; path?: string }>("get_upgrade_log");
export const dismissUpgradeResult = callable<[], MethodResult>("dismiss_upgrade_result");
export const rebootSystem = callable<[], MethodResult>("reboot_system");
export const pokeResume = callable<[], MethodResult>("poke_resume");

export const setCheckOnBootWake = callable<[enabled: boolean], MethodResult>("set_check_on_boot_wake");
export const setCheckInterval = callable<[hours: number], MethodResult>("set_check_interval");
export const setGamingOnlyNotify = callable<[enabled: boolean], MethodResult>("set_gaming_only_notify");
export const setCustomPatterns = callable<[patterns: string], MethodResult>("set_custom_patterns");
export const setListFilter = callable<[mode: string], MethodResult>("set_list_filter");
export const resetSettings = callable<[], MethodResult>("reset_settings");

export const checkForPluginUpdate = callable<[], PluginUpdateCheckResult>("check_for_plugin_update");
export const applyPluginUpdate = callable<[], MethodResult>("apply_plugin_update");
export const getDiagnosticInfo = callable<[], Record<string, unknown>>("get_diagnostic_info");
