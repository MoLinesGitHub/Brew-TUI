#!/usr/bin/env bash
# Notarize the already-built menubar/build/BrewBar.app.zip and publish it
# to the v0.6.2 GitHub Release. Re-run idempotently — if the .zip is
# already stapled this only updates the SHA on the cask.
#
# Required env vars:
#   APPLE_ID                — your Apple ID email (e.g. you@example.com)
#   APPLE_TEAM_ID           — Developer Team ID (defaults to GD6M44DYPQ)
#   APPLE_APP_SPECIFIC_PWD  — app-specific password from appleid.apple.com
#
# Usage:
#   APPLE_ID="you@example.com" \
#   APPLE_APP_SPECIFIC_PWD="abcd-efgh-ijkl-mnop" \
#   ./menubar/scripts/notarize.sh

set -euo pipefail

APPLE_ID="${APPLE_ID:-}"
APPLE_TEAM_ID="${APPLE_TEAM_ID:-GD6M44DYPQ}"
APPLE_APP_SPECIFIC_PWD="${APPLE_APP_SPECIFIC_PWD:-}"

if [[ -z "$APPLE_ID" || -z "$APPLE_APP_SPECIFIC_PWD" ]]; then
  cat >&2 <<EOF
✘ Missing credentials. Set both:
    APPLE_ID                — your Apple ID email
    APPLE_APP_SPECIFIC_PWD  — generate at https://appleid.apple.com/account/manage
                              -> Sign-In and Security -> App-Specific Passwords
EOF
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="${REPO_ROOT}/menubar/build/export/BrewBar.app"
ZIP_PATH="${REPO_ROOT}/menubar/build/BrewBar.app.zip"
EXPORT_DIR="${REPO_ROOT}/menubar/build/export"

if [[ ! -d "$APP_PATH" ]]; then
  echo "✘ $APP_PATH does not exist. Run the archive+export step first."
  exit 1
fi

# ── Step 1: notarize ──────────────────────────────────────────────────────
echo "→ Submitting to notarytool (this may take 1-3 minutes)..."
xcrun notarytool submit "$ZIP_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$APPLE_TEAM_ID" \
  --password "$APPLE_APP_SPECIFIC_PWD" \
  --wait

# ── Step 2: staple ────────────────────────────────────────────────────────
echo "→ Stapling notarization to the .app..."
xcrun stapler staple "$APP_PATH"
xcrun stapler validate "$APP_PATH"

# ── Step 3: re-zip the stapled app ────────────────────────────────────────
echo "→ Re-zipping the stapled .app..."
rm -f "$ZIP_PATH"
( cd "$EXPORT_DIR" && ditto -c -k --keepParent BrewBar.app "$ZIP_PATH" )

# ── Step 4: SHA256 + upload ───────────────────────────────────────────────
SHA="$(shasum -a 256 "$ZIP_PATH" | awk '{print $1}')"
echo "$SHA  $ZIP_PATH" > "${ZIP_PATH}.sha256"
echo ""
echo "✓ Notarized and stapled."
echo "  $ZIP_PATH"
echo "  SHA256: $SHA"
echo ""

echo "→ Uploading to GitHub Release v0.6.2..."
gh release upload v0.6.2 "$ZIP_PATH" "${ZIP_PATH}.sha256" --clobber

# ── Step 5: bump cask to 0.6.2 ────────────────────────────────────────────
TAP_DIR="$(mktemp -d)/homebrew-tap"
git clone https://github.com/MoLinesDesigns/homebrew-tap "$TAP_DIR"
CASK_FILE="${TAP_DIR}/Casks/brewbar.rb"

# Replace version + sha256 in-place
perl -i -pe 's/^  version "[^"]+"/  version "0.6.2"/' "$CASK_FILE"
perl -i -pe "s/^  sha256 \"[^\"]+\"/  sha256 \"${SHA}\"/" "$CASK_FILE"

cd "$TAP_DIR"
git add Casks/brewbar.rb
git commit -m "chore: bump brewbar 0.6.1 → 0.6.2 (notarized)

Stapled .app published to MoLinesDesigns/Brew-TUI release v0.6.2.
SHA256: ${SHA}"
git push origin HEAD

echo ""
echo "✓ Done. Cask bumped on MoLinesDesigns/homebrew-tap. Users running"
echo "  'brew upgrade --cask brewbar' will pick up the notarized 0.6.2."
