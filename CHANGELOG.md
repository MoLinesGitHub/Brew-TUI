# Changelog

## [0.4.1] - 2026-04-27

### Added
- BrewBar auto-install + auto-launch on every `brew-tui` run for Pro users (macOS only).
- BrewBar auto-registers as a login item the first time it runs as Pro (idempotent; respects later opt-out from Settings).

### Changed
- BrewBar binary now signed with Developer ID + hardened runtime, notarized by Apple, and stapled — installs cleanly without Gatekeeper warnings.
- `LicenseChecker` (Swift) now recognizes built-in PRO accounts so they pass the Pro check in BrewBar.

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
- CLI: `status` now reports expired licenses correctly
- CLI: `install-brewbar` now evaluates the current license before requiring Pro
- Dashboard: partial Homebrew fetch failures now surface explicit warnings instead of misleading stats
- License: revalidation now refreshes degradation state instead of leaving stale warnings
- BrewBar: expired-license guidance now points to `brew-tui revalidate`
- BrewBar: expired licenses now fall back to actual basic mode with upgrades disabled

### Improved
- Dynamic terminal row adaptation (no more hardcoded 20 rows)
- Atomic file writes for license data
- Proper file permissions (0o600) for user data files
- GradientText memoized for better render performance
- fetchAll no longer blocks on brew update
- BrewBar badge timer reduced from 2s to 30s
- Parallel refresh in BrewBar (outdated + services)
- CLI: new `revalidate` command for existing licenses
- Docs and release notes aligned with the current npm-only publish flow

### Added
- Color tokens file (src/utils/colors.ts)
- Fetch timeout utility
- CHANGELOG.md
- Vitest coverage for parsers, `brew-store` concurrency, and `license-store` revalidation

## [0.1.0] - 2026-04-22
- Initial release
