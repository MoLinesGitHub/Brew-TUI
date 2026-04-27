# Marketing assets

Assets referenced by the project README and used across launch channels.

## Files

| File | Used in | How to (re)generate |
|---|---|---|
| `demo.cast` | source | `./scripts/record-demo.sh` |
| `demo.gif` | README hero, Reddit, Twitter, PH | `./scripts/record-demo.sh` (auto from cast) |
| `screenshots/dashboard.png` | README | `brew-tui` → screenshot view 1 |
| `screenshots/outdated.png` | README | `brew-tui` → press `4` → screenshot |
| `screenshots/services.png` | README | `brew-tui` → press `6` → screenshot |
| `screenshots/smart-cleanup.png` | README | `brew-tui` → press `9` → screenshot |
| `screenshots/security-audit.png` | README | `brew-tui` → press `0` → screenshot |
| `screenshots/brewbar.png` | README | macOS Screenshot of BrewBar popover |

## Capture rules

- **Terminal**: 120×36 cols/rows, font size 14, `dracula` theme (matches the GIF).
- **Window chrome**: hide it (use Terminal "Window > Hide Title Bar" or capture only the inner area with `Cmd+Shift+4` then `Space`).
- **Sample data**: real packages, no placeholders. The TUI must look used, not staged.
- **Compression**: PNGs through `pngquant --quality=80-95 *.png` before commit. Target <300 KB each.
- **GIF size**: stay under 5 MB. If over, re-record with fewer steps or run `gifsicle -O3 --lossy=80 -o demo.gif demo.gif`.
