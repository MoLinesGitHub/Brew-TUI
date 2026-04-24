# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Run with tsx (requires interactive terminal)
npm run build        # Build ESM bundle to ./build via tsup
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest watch mode
npm run lint         # eslint src/
```

After build: `node bin/brew-tui.js` or `./bin/brew-tui.js` launches the TUI.

**BrewBar (menubar/):**
```bash
cd menubar && tuist generate   # Generate Xcode project
xcodebuild -workspace BrewBar.xcworkspace -scheme BrewBar build  # CLI build
```

CLI subcommands (run without launching TUI):
```bash
brew-tui activate <key>    # Activate Pro license via Polar
brew-tui revalidate        # Revalidate the current Pro license
brew-tui deactivate        # Deactivate license on this machine
brew-tui status            # Show evaluated license status
brew-tui install-brewbar       # Download & install BrewBar menubar app (Pro only)
brew-tui install-brewbar --force  # Reinstall BrewBar
brew-tui uninstall-brewbar     # Remove BrewBar from /Applications
brew-tui delete-account        # Remove all local data (~/.brew-tui/)
```

## Architecture

**Brew-TUI** is a visual TUI for Homebrew built with React 18 + Ink 5.x (terminal renderer). ESM-only (`"type": "module"`), TypeScript strict mode.

### Data Flow

```
Views (React) → Stores (Zustand) → brew-api → Parsers → brew-cli (spawn)
```

- **`src/lib/brew-cli.ts`** — Two primitives: `execBrew()` (30s timeout) for instant commands returning stdout, `streamBrew()` (5min idle timeout) as an AsyncGenerator yielding lines for long-running operations (install/upgrade). Both set `HOMEBREW_NO_AUTO_UPDATE=1`.
- **`src/lib/parsers/`** — `json-parser.ts` handles `brew info/outdated/services --json`, `text-parser.ts` handles `brew search/doctor/config` text output.
- **`src/lib/brew-api.ts`** — Typed high-level API combining CLI + parsers. Validates package names via `PKG_PATTERN` before passing to CLI. Also has `formulaeToListItems()`/`casksToListItems()` converters, `pinPackage()`/`unpinPackage()`, and `getCaskInfo()`.
- **`src/stores/brew-store.ts`** — Zustand store holding all Homebrew data with per-key `loading`/`errors` maps. `fetchAll()` runs parallel fetches on startup.
- **`src/stores/navigation-store.ts`** — Current view, history stack, selected package, selected package type. `VIEWS` array defines the ordered view list for tab cycling.

### Navigation & Keyboard

Global keys are in `src/hooks/use-keyboard.ts` via Ink's `useInput`: `1-0` jump to views, `Tab`/`Shift+Tab` cycle, `q` quits, `Esc` goes back, `L` toggles locale (en/es). Each view adds local keys (j/k scroll, Enter select, / search, action-specific shortcuts).

### Views

12 views routed via `<ViewRouter>` in `src/app.tsx` (switch on `currentView`). License initialization is handled by `<LicenseInitializer>`. Each view manages its own `useInput` handler and fetches data on mount via the brew store or direct API calls. Pro views (profiles, smart-cleanup, history, security-audit) are gated — if not Pro, `UpgradePrompt` renders instead. ProfilesView is decomposed into subcomponents in `src/views/profiles/` (list, detail, create, edit modes).

### UI Components

All rendering via Ink's `<Box>` (flexbox) and `<Text>`. `@inkjs/ui` provides `TextInput` (uncontrolled: uses `defaultValue`, not `value`) and `Spinner`. Shared components in `src/components/common/` (StatusBadge, StatCard, ProgressLog, ConfirmDialog, Loading, ResultBanner, SelectableRow).

## Key Conventions

- All imports use `.js` extensions (ESM requirement with NodeNext resolution)
- `@inkjs/ui` `TextInput` is **uncontrolled** — use `defaultValue` + `onChange`/`onSubmit`, not `value`
- Zustand stores accessed directly via `useXxxStore()` hooks, no React Context
- Streaming operations (install, upgrade) use `useBrewStream` hook wrapping the AsyncGenerator
- Types for Homebrew JSON responses are in `src/lib/types.ts`, verified against real Homebrew 5.1.6 output
- Each Pro feature has its own `src/lib/<feature>/types.ts` — avoid putting feature-specific types in main types.ts
- **Colors**: Use `COLORS` from `src/utils/colors.ts` — never hardcode hex values. Spacing tokens in `src/utils/spacing.ts`
- **Logging**: Use `logger` from `src/utils/logger.ts` (levels: debug/info/warn/error, controlled by `LOG_LEVEL` env). Never use bare `console.*`
- **lib/ modules must not import from stores** — receive `isPro: boolean` as parameter instead of importing `useLicenseStore`. Callers in views/stores pass the value
- **API response validation**: Always validate external API responses at runtime (Polar, OSV) — never trust `as Type` casts alone
- **Reusable UI patterns**: Use `<ResultBanner>` for success/error banners, `<SelectableRow>` for cursor-highlighted rows

## Freemium Model

- **Licensing:** Polar API (`src/lib/license/`). License stored at `~/.brew-tui/license.json` (AES-256-GCM encrypted, machine-bound). Revalidates every 24h with 7-day offline grace period.
- **Machine binding:** License envelope includes `machineId` from `~/.brew-tui/machine-id` (UUID generated on first activation). Prevents license portability between devices.
- **Feature gating:** `src/lib/license/feature-gate.ts` defines which ViewIds are Pro. `app.tsx` checks `isPro()` before rendering Pro views.
- **Pro features:** Profiles (`src/lib/profiles/`), Smart Cleanup (`src/lib/cleanup/`), History (`src/lib/history/`), Security Audit (`src/lib/security/` via OSV.dev API, 30min cache).
- **Data directory:** `~/.brew-tui/` managed by `src/lib/data-dir.ts` (license.json, machine-id, profiles/, history.json)
- **Rate limiting:** 30s cooldown between activation attempts, 15min lockout after 5 consecutive failures
- **Watermark:** Profile exports can embed user email via zero-width Unicode (requires explicit `consent` parameter)
- **Integrity:** Bundle SHA-256 verified at startup (`checkBundleIntegrity()`, fail-closed). Canary functions always return `false`

## BrewBar (menubar/)

macOS menu bar companion app (Swift 6 / macOS 14+ / Tuist). Fully independent from the TypeScript codebase — both call `brew` directly.
- `menubar/Project.swift` — Tuist manifest. `LSUIElement: true` (no Dock icon).
- `Tuist.swift` goes at `menubar/Tuist.swift` (root, not `Tuist/Config.swift` — deprecated).
- SourceKit errors in menubar/ are false positives until `tuist generate` creates the .xcworkspace.
- BrewBar requires Brew-TUI installed; checked on launch via `which brew-tui` and known paths.

## Naming

- **Brew-TUI** — branding in UI, user-facing text, docs
- **brew-tui** — CLI command, npm package name, filesystem paths (`~/.brew-tui/`)

## Adding a New View

1. Add the ViewId to the union in `src/lib/types.ts`
2. Add it to `VIEWS` array in `src/stores/navigation-store.ts`
3. Create the view component in `src/views/`
4. Add the route case in `src/app.tsx`'s switch
5. Add keybinding hints in `src/components/layout/footer.tsx`
6. Add the label in `src/components/layout/header.tsx`
7. If Pro-only: add the ViewId to `PRO_VIEWS` set in `src/lib/license/feature-gate.ts`
8. Add all user-facing strings to `src/i18n/en.ts` and `src/i18n/es.ts`

## Internationalization (i18n)

Both Brew-TUI and BrewBar support English (en) and Spanish (es).

### TypeScript TUI
- **Module:** `src/i18n/` — custom lightweight i18n (no external library)
- **`t(key, values?)`** — translation with `{{var}}` interpolation
- **`tp(baseKey, count)`** — plurals via `_one`/`_other` suffixed keys
- **`en.ts`** — source of truth, defines `Translations` type. Adding a key here without adding to `es.ts` is a compile error.
- **`es.ts`** — typed as `Translations`, must have all keys from `en.ts`
- **Locale detection:** `--lang=es` CLI flag > `LANG`/`LC_ALL`/`LC_MESSAGES` env > fallback `en`
- **Homebrew terms** (Formulae, Casks, keg-only, tap) stay in English in both locales
- **Confirm dialog** accepts `y`/`Y` in English and `s`/`S` in Spanish for "yes"
- Test locale: `LANG=es_ES.UTF-8 npm run dev`

### Swift BrewBar
- **String Catalog:** `menubar/BrewBar/Resources/Localizable.xcstrings` (en + es)
- SwiftUI views (`Text`, `Button`, `Label`, etc.) are auto-extracted — no code changes needed
- Non-SwiftUI strings (NSAlert, notifications, error messages) use `String(localized:)`
- Plurals use String Catalog plural variations (not manual ternary)

### Adding a new string
1. **TUI:** Add key to `en.ts`, add translation to `es.ts`, use `t('key')` in code. `npm run typecheck` catches missing keys.
2. **BrewBar:** For SwiftUI views, just write `Text("New string")`. For non-SwiftUI, use `String(localized: "New string")`. Add Spanish translation in `.xcstrings`.

## Testing

- **Framework:** Vitest (`vitest.config.ts` with `passWithNoTests: false` — CI gate blocks empty suites)
- **Test files:** Co-located with source (`*.test.ts` / `*.test.tsx`)
- **Coverage:** 10 test files, 99 tests covering: parsers, license manager (degradation, AES round-trip, rate limiting), canary functions, profile validation, Polar API (mocked), OSV API (mocked), brew-api validation, stores
- **Mocking:** `vi.mock()` for modules, `vi.fn()` for functions, `vi.useFakeTimers()` for time-dependent tests
- **UI tests:** `ink-testing-library` available but not yet in use for component rendering tests
- **BrewBar:** Test target `BrewBarTests` defined in `Project.swift` — no tests written yet

## Gotchas

- `npm run dev` requires an interactive TTY — Ink's raw mode fails in pipes/scripts
- On Apple Silicon, `@rollup/rollup-darwin-arm64` may need manual `npm install` if tsup fails
- `brew search` has no `--json` flag — parsed as text in `text-parser.ts`
- `__TEST_MODE__` is replaced at compile time by tsup — in dev mode (tsx), use `typeof __TEST_MODE__ !== 'undefined'` guard
- Build produces hidden sourcemaps (`.map` files for debugging, not referenced in output bundle)
