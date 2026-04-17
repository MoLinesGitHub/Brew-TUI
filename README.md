# Brew-TUI

A visual terminal UI for [Homebrew](https://brew.sh) package management.

![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![npm](https://img.shields.io/npm/v/brew-tui)

## Features

- **Dashboard** -- overview of installed packages, outdated counts, services, and system info
- **Installed** -- browse and filter formulae and casks with version info and status badges
- **Search** -- find and install packages directly from the TUI
- **Outdated** -- see available upgrades with version comparison arrows, upgrade individually or all at once
- **Services** -- start, stop, and restart Homebrew services
- **Doctor** -- run `brew doctor` and see warnings at a glance
- **Package Info** -- detailed view with dependencies, caveats, and quick install/uninstall

### Pro Features

- **Profiles** -- export and import your Homebrew setup across machines
- **Smart Cleanup** -- find orphaned packages and reclaim disk space
- **Action History** -- track every install, uninstall, and upgrade
- **Security Audit** -- scan packages against the OSV vulnerability database

## Install

```bash
# npm / pnpm / yarn / bun (all use the same npm registry)
npm install -g brew-tui
pnpm add -g brew-tui
yarn global add brew-tui
bun add -g brew-tui

# Homebrew
brew tap MoLinesGitHub/tap
brew install brew-tui

# GitHub Packages
npm install -g @MoLinesGitHub/brew-tui --registry https://npm.pkg.github.com

# npx (run without installing)
npx brew-tui
```

## Usage

```bash
brew-tui              # Launch the TUI
brew-tui status       # Show license status
brew-tui activate <key>   # Activate Pro license
brew-tui deactivate   # Deactivate Pro license
```

### Install BrewBar (Pro)

BrewBar is a companion macOS menu bar app that shows outdated package counts, sends notifications, and lets you upgrade packages without opening a terminal. Pro users can install it directly from the CLI:

```bash
brew-tui install-brewbar          # Download & install to /Applications
brew-tui install-brewbar --force  # Reinstall / update
brew-tui uninstall-brewbar        # Remove from /Applications
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `1`-`0` | Jump to view |
| `Tab` / `Shift+Tab` | Cycle views |
| `j` / `k` | Navigate lists |
| `Enter` | Select / confirm |
| `/` | Search / filter |
| `Escape` | Go back |
| `L` | Toggle language (en/es) |
| `q` | Quit |

## Language

Brew-TUI supports English and Spanish. The language is detected automatically from your system locale (`LANG` environment variable). You can also:

- Pass `--lang=es` or `--lang=en` as a CLI flag
- Press `L` inside the TUI to toggle between languages

## BrewBar

BrewBar is a companion macOS menu bar app (Swift 6 / SwiftUI) that shows outdated package counts, sends notifications, and lets you upgrade packages without opening a terminal.

BrewBar lives in the `menubar/` directory and is built separately with [Tuist](https://tuist.io):

```bash
cd menubar
tuist generate
xcodebuild -workspace BrewBar.xcworkspace -scheme BrewBar build
```

## Requirements

- **Node.js** >= 18
- **Homebrew** installed on your system
- **macOS** 14+ (for BrewBar)

## License

[MIT](LICENSE) -- MoLines Designs
