# Standalone binary experiment

Tracking issue: #1 (Lockszmith-GH feedback on Homebrew dependency footprint).

## Goal

Eliminate the `node@22` Homebrew dependency chain (24+ transitive packages on a fresh machine) by shipping a single self-contained executable.

## Approach

`bun build --compile` — Bun bundles the JS bundle plus the JavaScriptCore runtime into a single Mach-O / ELF binary. Tested with Bun 1.3.13.

## Setup

```bash
brew install oven-sh/bun/bun
npm run build              # tsup → build/index.js
npm run build:standalone   # → dist-standalone/brew-tui-bun-darwin-arm64
```

Cross-target:

```bash
./scripts/build-standalone.sh bun-darwin-x64
./scripts/build-standalone.sh bun-linux-x64
./scripts/build-standalone.sh bun-linux-arm64
```

## What works

| Test | Result |
|---|---|
| Build (darwin-arm64) | ✅ 62 MB Mach-O 64-bit |
| `brew-tui status` | ✅ shows plan, snapshots, drift, sync |
| `brew-tui revalidate` | ✅ executes (network call attempted) |
| i18n (`LANG=es`) | ✅ Spanish messages render |
| Ink module load | ✅ reaches `useRawMode`, errors correctly when stdin is not a TTY |
| `react-devtools-core` resolve | ✅ pinned as devDep so Bun can resolve at build time; never executed at runtime (gated by `process.env.DEV`) |

## What is pending validation

- **Interactive TUI in a real terminal.** Could not validate from automated bash; user must run the binary in an interactive terminal and exercise all 12 views, navigation, search, scroll, modals.
- **`@inkjs/ui` native deps** (TextInput, Spinner) under JavaScriptCore. Static analysis suggests OK, runtime confirmation needed.
- **Streaming subprocess (install/upgrade).** `streamBrew()` uses Node-style `child_process.spawn` async iterators — Bun claims compat, untested here.
- **Cross-platform builds.** Only `bun-darwin-arm64` produced and tested. `bun-linux-x64` would be the highest-value target for the original issue (Lockszmith is on Bazzite Linux).
- **License crypto path.** `node:crypto` `createCipheriv`/`scryptSync` — Bun supports these but full license activation flow (Polar API + machine binding) untested.
- **Bundle integrity check.** `checkBundleIntegrity()` reads `bin/brew-tui.js` and computes SHA-256 against a baked-in hash. The standalone binary has no separate `bin/brew-tui.js` to read — this check will fail in standalone mode and needs a separate path.

## Known issues

1. **React duplicate-key warning** appears in non-TTY mode. Pre-existing bug in our own code, unrelated to standalone packaging — also reproduces under Node.
2. **Bundle size 62 MB** — mostly the JavaScriptCore runtime. `pkg`/`nexe` (Node-based) would be similar. `boxednode` produces ~80 MB. There is no smaller-than-50 MB option short of WASM/QuickJS, which would not run Ink+React.

## Open design questions before shipping

1. **Distribution strategy.** Two paths for the Homebrew formula:
   - Keep `depends_on "node@22"` and `npm install`, ship the standalone in parallel as `brew-tui-binary`. Two artifacts, more maintenance.
   - Switch the formula to download the standalone binary from GitHub Releases. Drops all 24 deps. Loses `npm install` lifecycle hooks.
2. **CI cross-compile matrix.** Adding `bun build` to release workflow for 4 targets (darwin-x64/arm64, linux-x64/arm64). ~30s per target.
3. **`bundle-integrity` rewrite.** Current implementation hashes `bin/brew-tui.js`. For standalone, hash the binary itself or drop the check.
4. **macOS notarization for the Mach-O.** Required for release distribution outside Homebrew. Adds Apple notary step to CI.

## Decision pending

Cost/value: the bun build proves the concept works for non-interactive paths. Shipping it as the default needs ~2 days of cross-platform validation, CI work, and the integrity-check rewrite. Recommend keeping this branch open as a tracked experiment, validate interactively when hands are free, and target as a v0.6.0 candidate if Linux adoption picks up.
