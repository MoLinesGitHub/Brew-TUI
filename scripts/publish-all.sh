#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
echo "Publishing brew-tui v${VERSION} to all registries..."

# 1. Build
echo "=== Building ==="
npm run typecheck
npm run build
npm run lint

# 2. npm (primary)
echo "=== Publishing to npm ==="
npm publish --access public

# 3. GitHub Packages
echo "=== Publishing to GitHub Packages ==="
# Temporarily set registry to GitHub
npm config set @MoLinesGitHub:registry https://npm.pkg.github.com
npm publish --access public --registry https://npm.pkg.github.com
npm config delete @MoLinesGitHub:registry

# 4. JSR (if jsr CLI available)
if command -v jsr &> /dev/null; then
  echo "=== Publishing to JSR ==="
  jsr publish
elif command -v deno &> /dev/null; then
  echo "=== Publishing to JSR via Deno ==="
  deno publish
else
  echo "=== Skipping JSR (install deno or jsr CLI to publish) ==="
fi

echo ""
echo "=== Done! Published v${VERSION} ==="
echo "  npm:     https://www.npmjs.com/package/brew-tui"
echo "  GitHub:  https://github.com/MoLinesGitHub/Brew-TUI/packages"
echo "  JSR:     https://jsr.io/@molines/brew-tui"
echo ""
echo "Next steps:"
echo "  1. git tag v${VERSION} && git push --tags"
echo "  2. GitHub Actions will build BrewBar.app and create a Release"
echo "  3. Update homebrew/Formula/brew-tui.rb with the npm tarball SHA256"
echo "  4. Update homebrew/Casks/brewbar.rb with the GitHub Release SHA256"
