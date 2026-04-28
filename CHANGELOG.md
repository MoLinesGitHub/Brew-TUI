# Changelog

## [0.5.2] - 2026-04-28

### Fixed
- **Upgrade prompt:** Compliance (Team) and other Pro views displayed the
  outdated €9/month + €29 lifetime pricing and pointed at the wrong Polar
  checkout URL. The prompt now branches by tier:
  - **Pro views** show €9.95/month or €82/year and link to the Pro Yearly
    Polar product.
  - **Team views** (Compliance) show €8/seat/month or €81.60/seat/year (min
    3 seats) and link to the Team Monthly Polar product with `quantity=3`.
- Account view monthly/yearly labels updated to the same canonical pricing
  (replacing the legacy `account_lifetimePrice` key with `account_yearlyPrice`).

### Internal
- New i18n keys `upgrade_teamFeature`, `upgrade_teamPricing`,
  `upgrade_buyUrlTeam`, `upgrade_teamLabel` for tier-aware copy.
- `UpgradePrompt` now consults `isTeamView()` to pick the right tier strings.

## [0.5.1] - 2026-04-28

### Fixed
- **License gating bug:** `isTeam()` returned true for Pro users, granting free access to Team Compliance. Now strict (`status === 'team'` only).
- **Plan persistence:** activate / initialize now propagate `license.plan` ('pro' or 'team') instead of hardcoding 'pro'. Combined with the new `detectPlan()` helper that infers tier from the license-key prefix (`BTUI-T-` → Team, `BTUI-` → Pro).
- **BrewBar menu bar icon:** the status item reserved extra horizontal space because the icon's native size was used and the badge string had a leading whitespace. Icon now forced to 18×18 pt and the badge collapses to truly empty when there is nothing to show.

### Added
- `POLAR_PRODUCT_IDS` and `POLAR_CHECKOUT_URLS` constants for the four live Polar products.
- 4 regression tests for plan detection.

## [0.5.0] - 2026-04-28

### Added — Power Release (Phase 1-6)

- **CVE Real-time monitoring (Pro):** BrewBar polls OSV.dev hourly, shows ⚠N badge in menu bar and sends macOS notifications for new critical/high CVEs in installed packages. Click notification jumps to security-audit view.
- **Impact Analysis (Pro):** pre-upgrade risk panel (low/medium/high) showing dependency tree, breaking changes hint, and reverse-deps that will be affected. Surfaced in `outdated` view before each upgrade.
- **Smart Rollback (Pro):** automatic snapshots after every install/upgrade/uninstall/pin. Rollback view generates plans using bottle/versioned/pin strategies. `R` key in security-audit jumps to rollback for vulnerable packages.
- **Declarative Brewfile (Pro):** YAML-based desired state with drift score 0-100 and interactive reconciliation. High-risk upgrades hint to add the package to Brewfile first.
- **Cross-machine Sync (Pro):** iCloud Drive backend with AES-256-GCM encryption, per-machine identity, interactive conflict resolution, ⟳ drift badge in BrewBar. Post-sync success offers `c` shortcut to Compliance.
- **Team Compliance (Team tier):** PolicyFile JSON, score 0-100, severity-graded violations, automatic remediation plans. New `compliance` view (Team-gated, separate from Pro).
- **Dashboard Pro Status panel:** unified state of the 4 power modules (snapshots, Brewfile drift, sync, compliance).
- **`brew-tui status` CLI:** now shows snapshot count, Brewfile drift, sync state and compliance score.

### Internal
- New shared modules: `state-snapshot/`, `diff-engine/`, `impact/`, `rollback/`, `brewfile/`, `sync/` (with `crypto` + iCloud backend), `compliance/`.
- BrewBar `SyncMonitor.swift` + scheduler hooks for `cveMonitor` and `syncDriftCheck`.
- 205 tests across 20 test files (all passing).

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
