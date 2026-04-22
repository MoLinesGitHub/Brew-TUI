cask "brewbar" do
  version "0.1.0"
  sha256 "78a74e7b1c46e088098da069f9ac75eeef4c330fb5571277703dc068107b9312"

  url "https://github.com/MoLinesGitHub/Brew-TUI/releases/download/v#{version}/BrewBar.app.zip"
  name "BrewBar"
  desc "macOS menu bar companion for Brew-TUI (Pro feature)"
  homepage "https://github.com/MoLinesGitHub/Brew-TUI"

  depends_on formula: "brew-tui"
  depends_on macos: ">= :sonoma"

  app "BrewBar.app"

  zap trash: [
    "~/Library/Preferences/com.molinesdesigns.brewbar.plist",
  ]
end
