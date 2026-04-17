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
  hint_rescan: 'rescan',
  hint_deactivate: 'deactivate',
  hint_importProfile: 'import this profile',
  hint_lang: 'lang',

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

  // ── Installed ──
  installed_formulaeCount: 'Formulae ({{count}})',
  installed_casksCount: 'Casks ({{count}})',
  installed_filterDisplay: 'Filter: "{{query}}" ({{count}} matches)',
  installed_noPackages: 'No packages found',

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

  // ── Doctor ──
  doctor_title: 'Homebrew Doctor',
  doctor_clean: 'Your system is ready to brew.',
  doctor_warningsNotCaptured: 'Doctor finished with warnings but none were captured.',

  // ── Profiles ──
  profiles_title: 'Package Profiles ({{count}})',
  profiles_importTitle: 'Importing profile...',
  profiles_importComplete: 'Import complete. Press any key.',
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

  // ── Smart Cleanup ──
  cleanup_title: 'Smart Cleanup',
  cleanup_cleaning: 'Cleaning up...',
  cleanup_complete: 'Cleanup complete! Press r to re-analyze.',
  cleanup_orphans: 'Orphans',
  cleanup_reclaimable: 'Reclaimable',
  cleanup_selected: 'Selected',
  cleanup_confirmUninstall: 'Uninstall {{count}} packages?',
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

  // ── Security Audit ──
  security_title: 'Security Audit',
  security_scanned: 'Scanned',
  security_vulnerable: 'Vulnerable',
  security_critical: 'Critical',
  security_high: 'High',
  security_medium: 'Medium',
  security_noVulns: 'No known vulnerabilities found in your installed packages!',
  security_fixedIn: 'Fixed in: {{version}}',

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
  account_yearlyPrice: '49\u20AC/year',
  account_keyLabel: 'Key:',
  account_expiresLabel: 'Expires:',
  account_activatedLabel: 'Activated:',
  account_upgradeTitle: 'Upgrade to Brew-TUI Pro',
  account_unlockDesc: 'Unlock Profiles, Smart Cleanup, History, and Security Audit.',
  account_pricing: '9\u20AC/month or 49\u20AC/year',
  account_runActivate: 'Run:',
  account_activateCmd: 'brew-tui activate <key>',
  account_licenseExpired: 'Your license has expired. Renew to continue using Pro features.',
  account_deactivating: 'Deactivating...',

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
  upgrade_pricing: '9\u20AC/month or 49\u20AC/year',
  upgrade_activateWith: 'Activate with:',
  upgrade_activateCmd: 'brew-tui activate <your-license-key>',
  upgrade_proLabel: 'Brew-TUI Pro \u2014 9\u20AC/month or 49\u20AC/year',

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
  cli_confirmDeactivate: 'Deactivate your Pro license on this machine? (y/N): ',
  cli_deactivateCancelled: 'Deactivation cancelled.',
  cli_upgradeHint: 'Run `brew-tui activate <key>` to upgrade to Pro.',
  cli_email: 'Email: {{email}}',
  cli_status: 'Status: {{status}}',
  cli_rateLimited: 'Too many activation attempts. Try again in {{minutes}} minutes.',
  cli_cooldown: 'Please wait before trying again.',

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
};

export default en;
export type Translations = { [K in keyof typeof en]: string };
export type TranslationKey = keyof typeof en;
