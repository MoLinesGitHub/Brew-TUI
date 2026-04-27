const en = {
  // ── App chrome ──
  app_title: 'Brew-TUI',
  pro_badge: 'PRO',
  app_version: 'Brew-TUI v{{version}}',

  // ── View labels (header tab bar) ──
  view_dashboard: 'Dashboard',
  view_installed: 'Installed',
  view_search: 'Search',
  view_outdated: 'Outdated',
  view_packageInfo: 'Pkg Info',
  view_services: 'Services',
  view_doctor: 'Doctor',
  view_profiles: 'Profiles',
  view_smartCleanup: 'Cleanup',
  view_history: 'History',
  view_rollback: 'Rollback',
  view_brewfile: 'Brewfile',
  view_securityAudit: 'Security',
  view_account: 'Account',

  // ── Keyboard hint actions ──
  hint_navigate: 'navigate',
  hint_next: 'next',
  hint_quit: 'quit',
  hint_filter: 'filter',
  hint_info: 'info',
  hint_toggle: 'toggle',
  hint_typeToSearch: 'type to search',
  hint_install: 'install',
  hint_uninstall: 'uninstall',
  hint_upgrade: 'upgrade',
  hint_upgradeAll: 'upgrade all',
  hint_back: 'back',
  hint_start: 'start',
  hint_stop: 'stop',
  hint_restart: 'restart',
  hint_refresh: 'refresh',
  hint_new: 'new',
  hint_details: 'details',
  hint_import: 'import',
  hint_delete: 'delete',
  hint_clean: 'clean',
  hint_all: 'all',
  hint_search: 'search',
  hint_clear: 'clear',
  hint_scan: 'scan',
  hint_expand: 'expand',
  hint_cancel: 'cancel',
  hint_force: 'force uninstall (ignore deps)',
  hint_rescan: 'rescan',
  hint_deactivate: 'deactivate',
  hint_promo: 'promo code',
  hint_importProfile: 'import this profile',
  hint_lang: 'lang',
  hint_replay: 'replay',
  hint_edit: 'edit',
  hint_pin: 'pin/unpin',
  hint_rollback_confirm: 'rollback',
  hint_add: 'add',
  hint_reconcile: 'reconcile',
  hint_export: 'export',
  hint_select: 'select',

  // ── Loading / progress ──
  loading_default: 'Loading...',
  loading_fetchingBrew: 'Fetching Homebrew data...',
  loading_installed: 'Loading installed packages...',
  loading_outdated: 'Checking for outdated packages...',
  loading_services: 'Loading services...',
  loading_doctor: 'Running brew doctor... (this may take a moment)',
  loading_profiles: 'Loading profiles...',
  loading_cleanup: 'Analyzing packages... (checking disk usage)',
  loading_history: 'Loading history...',
  loading_security: 'Scanning packages against OSV vulnerability database...',
  loading_searching: 'Searching...',
  loading_package: 'Loading {{name}}...',

  // ── Confirm dialog ──
  confirm_yes: '[Y]es',
  confirm_no: '[N]o',

  // ── Error ──
  error_prefix: 'Error: ',

  // ── Common ──
  common_andMore: '...and {{count}} more',
  common_exit: '(exit {{code}})',
  common_yes: 'yes',
  common_no: 'no',

  // ── Relative time ──
  time_justNow: 'just now',
  time_minutesAgo: '{{n}}m ago',
  time_hoursAgo: '{{n}}h ago',
  time_daysAgo: '{{n}}d ago',
  time_monthsAgo: '{{n}}mo ago',

  // ── Badges ──
  badge_outdated: 'outdated',
  badge_pinned: 'pinned',
  badge_kegOnly: 'keg-only',
  badge_dep: 'dep',
  badge_installed: 'installed',
  badge_deprecated: 'deprecated',
  badge_ok: 'ok',
  badge_fail: 'fail',
  badge_error: 'error',

  // ── Dashboard ──
  dashboard_overview: 'Overview',
  dashboard_formulae: 'Formulae',
  dashboard_casks: 'Casks',
  dashboard_outdated: 'Outdated',
  dashboard_services: 'Services',
  dashboard_systemInfo: 'System Info',
  dashboard_homebrew: 'Homebrew:',
  dashboard_prefix: 'Prefix:',
  dashboard_updated: 'Updated:',
  dashboard_outdatedPackages: 'Outdated Packages',
  dashboard_serviceErrors: 'Service Errors',
  dashboard_partialData: 'Some Homebrew sections failed to load:',
  dashboard_statError: 'ERR',

  // ── Installed ──
  installed_formulaeCount: 'Formulae ({{count}})',
  installed_casksCount: 'Casks ({{count}})',
  installed_filterDisplay: 'Filter: "{{query}}" ({{count}} matches)',
  installed_noPackages: 'No packages found',
  installed_confirmUninstall: 'Uninstall {{name}}?',

  // ── Search ──
  search_placeholder: 'Search Homebrew packages... (enter to search)',
  search_resultsFor: 'Results for',
  search_escToClear: '(esc to clear)',
  search_installing: 'Installing package...',
  search_installComplete: 'Installation complete!',
  search_confirmInstall: 'Install {{name}}?',
  search_formulaeHeader: '=== Formulae ({{count}})',
  search_casksHeader: '=== Casks ({{count}})',
  search_noResults: 'No results found',
  search_minChars: 'Type at least 2 characters to search.',

  // ── Outdated ──
  outdated_title: 'Outdated Packages ({{count}})',
  outdated_upgrading: 'Upgrading...',
  outdated_upgradeComplete: 'Upgrade complete!',
  outdated_pressRefresh: '(press r to refresh)',
  outdated_upToDate: 'Everything is up to date!',
  outdated_confirmAll: 'Upgrade all {{count}} packages?',
  outdated_confirmSingle: 'Upgrade {{name}}?',
  outdated_pinned: '[pinned]',

  // ── Package Info ──
  pkgInfo_noPackage: 'No package selected. Go to Installed and press Enter on a package.',
  pkgInfo_notFound: 'Package not found',
  pkgInfo_installing: 'Installing {{name}}...',
  pkgInfo_uninstalling: 'Uninstalling {{name}}...',
  pkgInfo_upgrading: 'Upgrading {{name}}...',
  pkgInfo_done: 'Done!',
  pkgInfo_confirmInstall: 'install {{name}}?',
  pkgInfo_confirmUninstall: 'uninstall {{name}}?',
  pkgInfo_confirmUpgrade: 'upgrade {{name}}?',
  pkgInfo_details: 'Details',
  pkgInfo_homepage: 'Homepage:',
  pkgInfo_license: 'License:',
  pkgInfo_tap: 'Tap:',
  pkgInfo_stable: 'Stable:',
  pkgInfo_installed: 'Installed:',
  pkgInfo_bottle: 'Bottle:',
  pkgInfo_onRequest: 'On request:',
  pkgInfo_noDependency: 'no (dependency)',
  pkgInfo_dependencies: 'Dependencies ({{count}})',
  pkgInfo_caveats: 'Caveats',

  // ── Services ──
  services_title: 'Homebrew Services',
  services_titleCount: 'Homebrew Services ({{count}})',
  services_noServices: 'No services found',
  services_name: 'Name',
  services_status: 'Status',
  services_user: 'User',
  services_processing: 'Processing...',
  services_confirmStop: 'Stop service {{name}}?',
  services_confirmRestart: 'Restart service {{name}}?',

  // ── Doctor ──
  doctor_title: 'Homebrew Doctor',
  doctor_clean: 'Your system is ready to brew.',
  doctor_warningsNotCaptured: 'Doctor finished with warnings but none were captured.',

  // ── Profiles ──
  profiles_title: 'Package Profiles ({{count}})',
  profiles_importTitle: 'Importing profile...',
  profiles_importComplete: 'Import complete. Press any key.',
  profiles_importPartial: 'Import finished with errors. Check the log above.',
  profiles_createName: 'Create Profile \u2014 Name:',
  profiles_namePlaceholder: 'e.g. work, personal, project-x',
  profiles_createDesc: 'Create Profile "{{name}}" \u2014 Description:',
  profiles_descPlaceholder: 'Brief description of this setup',
  profiles_created: 'Created: {{date}}',
  profiles_formulaeCount: 'Formulae ({{count}})',
  profiles_casksCount: 'Casks ({{count}})',
  profiles_confirmDelete: 'Delete profile "{{name}}"?',
  profiles_noProfiles: 'No profiles saved yet.',
  profiles_press: 'Press',
  profiles_exportHint: 'to export your current setup as a profile.',
  profiles_editName: 'Edit Profile \u2014 Name:',
  profiles_editDesc: 'Edit Profile "{{name}}" \u2014 Description:',

  // ── Smart Cleanup ──
  cleanup_title: 'Smart Cleanup',
  cleanup_cleaning: 'Cleaning up...',
  cleanup_complete: 'Cleanup complete! Press r to re-analyze.',
  cleanup_orphans: 'Orphans',
  cleanup_reclaimable: 'Reclaimable',
  cleanup_selected: 'Selected',
  cleanup_confirmUninstall: 'Uninstall {{count}} packages?',
  cleanup_confirmForce: 'Some packages have dependencies. Force uninstall {{count}} packages? (ignores dependencies)',
  cleanup_depError: 'Some packages could not be removed due to dependencies.',
  cleanup_systemClean: 'No orphaned packages found. Your system is clean!',

  // ── History ──
  history_title: 'Action History ({{count}})',
  history_filterLabel: 'filter: {{filter}}',
  history_searchPlaceholder: 'Search packages...',
  history_confirmClear: 'Clear all {{count}} history entries?',
  history_noEntries: 'No history entries',
  history_noEntriesFor: 'No history entries for "{{filter}}"',
  history_all: '(all)',
  history_actionInstall: 'install',
  history_actionUninstall: 'uninstall',
  history_actionUpgrade: 'upgrade',
  history_actionUpgradeAll: 'upgrade-all',
  history_confirmReplay: 'Re-run: {{action}} {{name}}?',
  history_replayAll: 'Re-run: upgrade all packages?',

  // ── Security Audit ──
  security_title: 'Security Audit',
  security_scanned: 'Scanned',
  security_vulnerable: 'Vulnerable',
  security_critical: 'Critical',
  security_high: 'High',
  security_medium: 'Medium',
  security_noVulns: 'No known vulnerabilities found in your installed packages!',
  security_fixedIn: 'Fixed in: {{version}}',
  security_confirmUpgrade: 'Upgrade {{name}} to fix vulnerabilities?',

  // ── Account ──
  account_title: 'Account & License',
  account_confirmDeactivate: 'Deactivate your Pro license on this machine?',
  account_statusLabel: 'Status:',
  account_pro: '[Pro]',
  account_free: '[Free]',
  account_expired: '[Expired]',
  account_validating: '[Validating...]',
  account_emailLabel: 'Email:',
  account_nameLabel: 'Name:',
  account_planLabel: 'Plan:',
  account_monthlyPrice: '9\u20AC/month',
  account_lifetimePrice: '29\u20AC lifetime',
  account_keyLabel: 'Key:',
  account_expiresLabel: 'Expires:',
  account_activatedLabel: 'Activated:',
  account_upgradeTitle: 'Upgrade to Brew-TUI Pro',
  account_unlockDesc: 'Unlock Profiles, Smart Cleanup, History, Security Audit, and BrewBar (macOS menu bar companion).',
  account_pricing: '9\u20AC/month or 29\u20AC lifetime',
  account_runActivate: 'Run:',
  account_activateCmd: 'brew-tui activate <key>',
  account_licenseExpired: 'Your license has expired. Renew to continue using Pro features.',
  account_deactivating: 'Deactivating...',
  account_loading: 'Loading license status...',
  account_promoTitle: 'Redeem Promo Code',
  account_promoLabel: 'Code:',
  account_promoValidating: 'Validating promo code...',
  account_promoSuccess: 'Promo code redeemed! Pro access until {{expires}}.',
  account_promoInvalid: 'Invalid or expired promo code.',
  account_promoError: 'Could not validate promo code. Check your connection.',
  account_promoEsc: 'esc: cancel',
  account_promoHint: 'p: redeem promo code',

  // ── Upgrade Prompt ──
  upgrade_proFeature: '{{title}} \u2014 Pro Feature',
  upgrade_profiles: 'Package Profiles',
  upgrade_profilesDesc: 'Export and import your Homebrew setup across machines. Save named profiles for work, personal, or project-specific configurations.',
  upgrade_cleanup: 'Smart Cleanup',
  upgrade_cleanupDesc: 'Find orphaned packages, analyze disk usage per package, and reclaim disk space with one-click intelligent cleanup.',
  upgrade_history: 'Action History',
  upgrade_historyDesc: 'Track every install, uninstall, and upgrade with timestamps. Search and filter your package management history.',
  upgrade_security: 'Security Audit',
  upgrade_securityDesc: 'Scan installed packages against known vulnerabilities (CVEs). See severity levels, affected versions, and available fixes.',
  upgrade_pricing: '9\u20AC/month or 29\u20AC lifetime',
  upgrade_buyAt: 'Buy at:',
  upgrade_buyUrl: 'https://buy.polar.sh/polar_cl_QW1ZJ9887bU74drGr7JfujQfm3RKYnn1fuvc53DqD6D',
  upgrade_activateWith: 'Then activate with:',
  upgrade_activateCmd: 'brew-tui activate <your-license-key>',
  upgrade_proLabel: 'Brew-TUI Pro \u2014 9\u20AC/month or 29\u20AC lifetime \u2014 Includes BrewBar for macOS',

  // ── Progress Log ──
  progress_noOutput: 'No output yet',

  // ── Search Input ──
  searchInput_placeholder: 'Type to filter...',

  // ── Profile Manager ──
  profileMgr_tapping: 'Tapping {{name}}...',
  profileMgr_installing: 'Installing {{name}}...',
  profileMgr_installingCask: 'Installing cask {{name}}...',
  profileMgr_importDone: 'Done! Installed {{count}} packages.',

  // ── CLI ──
  cli_usageActivate: 'Usage: brew-tui activate <license-key>',
  cli_activated: '\u2714 Pro activated for {{email}}',
  cli_plan: '  Plan: {{plan}}',
  cli_expires: '  Expires: {{date}}',
  cli_activationFailed: '\u2718 Activation failed: {{error}}',
  cli_noLicense: 'No active license found.',
  cli_deactivated: '\u2714 License deactivated.',
  cli_planFree: 'Plan: Free',
  cli_planPro: 'Plan: Pro',
  cli_planExpired: 'Plan: Expired',
  cli_confirmDeactivate: 'Deactivate your Pro license on this machine? (y/N): ',
  cli_deactivateCancelled: 'Deactivation cancelled.',
  cli_upgradeHint: 'Run `brew-tui activate <key>` to upgrade to Pro.',
  cli_revalidateHint: 'Run `brew-tui revalidate` to refresh your current license.',
  cli_email: 'Email: {{email}}',
  cli_status: 'Status: {{status}}',
  cli_revalidated: '\u2714 License revalidated.',
  cli_revalidateGrace: '\u26A0 Could not reach the server. Your current license remains usable within the offline grace period.',
  cli_revalidateFailed: '\u2718 License revalidation failed. Renew your subscription or activate a valid key.',
  cli_rateLimited: 'Too many activation attempts. Try again in {{minutes}} minutes.',
  cli_cooldown: 'Please wait before trying again.',
  cli_brewbarInstalling: 'Downloading BrewBar...',
  cli_brewbarInstalled: '\u2714 BrewBar installed to /Applications/BrewBar.app',
  cli_brewbarAlreadyInstalled: 'BrewBar is already installed. Use --force to reinstall.',
  cli_brewbarUninstalled: '\u2714 BrewBar removed from /Applications.',
  cli_brewbarNotInstalled: 'BrewBar is not installed.',
  cli_brewbarProRequired: '\u2718 BrewBar requires a Pro license.\n  Run: brew-tui activate <key>',
  cli_brewbarRevalidateRequired: '\u2718 BrewBar requires a valid Pro license.\n  Run: brew-tui revalidate',
  cli_brewbarMacOnly: '\u2718 BrewBar is only available on macOS.',
  cli_brewbarDownloadFailed: '\u2718 Failed to download BrewBar: {{error}}',
  cli_brewbarAutoFailed: '\u26A0 BrewBar auto-launch failed: {{error}}',
  cli_deactivateRemoteFailed: '\u26A0 Warning: Could not reach the server to deactivate remotely. The license was removed locally but may still count as active.',

  // ── License degradation (Layer 15) ──
  license_offlineWarning: 'Your license has not been validated for {{days}} days. Please connect to the internet.',

  // ── Plurals ──
  plural_vulns_one: '({{count}} vuln)',
  plural_vulns_other: '({{count}} vulns)',
  plural_warnings_one: '{{count}} warning',
  plural_warnings_other: '{{count}} warnings',

  // ── Scroll indicators ──
  scroll_moreAbove: '\u2191 {{count}} more',
  scroll_moreBelow: '\u2193 {{count}} more',

  // ── SCR-001: Cleanup warning ──
  cleanup_warning_system_tools: 'Warning: detected orphans may include dependencies of tools not managed by Homebrew. Review the list before proceeding.',

  // ── SCR-002: Installed column headers ──
  installed_col_package: 'Package',
  installed_col_version: 'Version',
  installed_col_status: 'Status',

  // ── SCR-003: Search failed ──
  search_failed: 'Search failed',

  // ── SCR-007: Deactivate failed ──
  deactivate_failed: 'Deactivation failed',

  // ── ACC-005: Version labels ──
  version_installed: 'installed:',
  version_available: 'available:',

  // ── SCR-006: Upgrade-all replay warning ──
  upgrade_all_warning: 'Note: this will upgrade all currently outdated packages, which may differ from the original set.',

  // ── SEG-007: Delete account ──
  delete_account_confirm: 'Delete all Brew-TUI data (~/.brew-tui)? This removes your license, profiles, and history. This cannot be undone.',
  delete_account_success: 'All Brew-TUI data has been removed.',

  // ── SCR-012: Upgrade All packages list ──
  outdated_upgradeAllList: 'Packages to upgrade: {{list}}',

  // ── SCR-005: Profile import summary ──
  profiles_importSummary: 'This profile contains {{formulae}} formulae and {{casks}} casks. Continue?',

  // ── SCR-017: Network error ��─
  security_networkError: 'Could not reach OSV.dev vulnerability database. Check your internet connection.',

  // ── ARQ-004: Dashboard last updated ──
  dashboard_lastUpdated: 'Last updated: {{time}}',

  // ── SCR-014: Services last error ──
  services_lastError: 'Last error: {{error}}',

  // ── SCR-010: Generic network error ──
  error_network: 'Network error: unable to reach the server.',

  // ── ARQ-005: Security cache ──
  security_cachedResults: 'Showing cached results ({{time}} ago). Press r to rescan.',

  // ── Impact Analysis ──
  impact_analyzing: 'Analyzing upgrade impact...',
  impact_high: 'HIGH RISK',
  impact_medium: 'MEDIUM RISK',
  impact_low: 'LOW RISK',
  impact_affects: 'affects {{count}} installed packages',
  impact_usedBy: 'Used by: {{packages}}',
  impact_hint: 'Select package to see upgrade impact',
  impact_reason_critical_package: 'Critical system package',
  impact_reason_major_bump: 'Major version change',
  impact_reason_many_deps: '{{count}} packages depend on this',

  // ── Rollback ──
  rollback_title: 'Rollback \u2014 Restore Previous State',
  rollback_no_snapshots: 'No snapshots available. Snapshots are captured automatically after each operation.',
  rollback_select_snapshot: 'Select a snapshot to restore',
  rollback_snapshot_label: '{{label}} \u2014 {{date}}',
  rollback_snapshot_auto: 'Auto',
  rollback_diff_empty: 'No changes detected between this snapshot and current state',
  rollback_confirm: 'Roll back {{count}} package(s) to this state?',
  rollback_strategy_bottle: 'from bottle cache',
  rollback_strategy_versioned: 'from versioned formula',
  rollback_strategy_pin: 'pin only (version not restorable)',
  rollback_strategy_unavailable: 'cannot restore',
  rollback_executing: 'Rolling back...',
  rollback_success: 'Rollback completed',
  rollback_error: 'Rollback failed: {{error}}',
  rollback_item_downgrade: '{{name}}: {{from}} \u2192 {{to}}',
  rollback_item_remove: 'Remove: {{name}}',
  rollback_item_install: 'Install: {{name}} {{version}}',
  rollback_warning_cask: 'Casks will be pinned only (version restoration not supported)',
  rollback_capturing: 'Capturing current snapshot...',

  // ── Brewfile ──
  brewfile_title: 'Declarative Brewfile',
  brewfile_compliant: 'compliant',
  brewfile_no_brewfile: 'No Brewfile found. Press n to create one from your current installation.',
  brewfile_create_name: 'Brewfile name (Enter to confirm):',
  brewfile_created: 'Brewfile created: {{name}}',
  brewfile_drift_missing: '{{count}} packages missing',
  brewfile_drift_extra: '{{count}} extra packages',
  brewfile_drift_wrong: '{{count}} wrong versions',
  brewfile_reconciling: 'Reconciling...',
  brewfile_reconcile_success: 'Reconciliation complete',
  brewfile_reconcile_error: 'Reconciliation failed: {{error}}',
  brewfile_exported: 'Exported to {{path}}',
  brewfile_formulae_count: '{{count}} formulae',
  brewfile_casks_count: '{{count}} casks',
  brewfile_strict_mode: 'Strict mode',
};

export default en;
export type Translations = { [K in keyof typeof en]: string };
export type TranslationKey = keyof typeof en;
