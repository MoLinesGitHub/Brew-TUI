# Changelog

## [0.2.0] - 2026-04-23

### Security
- Fix: Remove source maps from production bundle
- Fix: Add timeouts to all network requests (15s API, 120s downloads)
- Fix: Verify BrewBar download integrity with SHA-256
- Fix: License deactivation retries before clearing local data
- Fix: Remove anti-debug environment variable bypass
- Add: PrivacyInfo.xcprivacy for Apple compliance

### Fixed
- Navigation: goBack() now properly pops history stack
- Search: errors no longer silenced as "no results"
- Services: action errors now visible to user
- Account: deactivation no longer freezes on network error
- Profiles: importing mode no longer traps user
- Installed: ProgressLog dismissible with Esc after uninstall
- BrewBar: Upgrade All now requires confirmation
- BrewBar: Expired license no longer terminates app

### Improved
- Dynamic terminal row adaptation (no more hardcoded 20 rows)
- Atomic file writes for license data
- Proper file permissions (0o600) for user data files
- GradientText memoized for better render performance
- fetchAll no longer blocks on brew update
- BrewBar badge timer reduced from 2s to 30s
- Parallel refresh in BrewBar (outdated + services)

### Added
- Color tokens file (src/utils/colors.ts)
- Fetch timeout utility
- CHANGELOG.md

## [0.1.0] - 2026-04-22
- Initial release
