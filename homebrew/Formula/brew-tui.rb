class BrewTui < Formula
  desc "Visual TUI for Homebrew package management"
  homepage "https://github.com/MoLinesDesigns/Brew-TUI"
  url "https://registry.npmjs.org/brew-tui/-/brew-tui-0.7.0.tgz"
  sha256 "2e1a850cda205426839d846189dd9bb5cda11c032bad7ec947a6d0fe21a928ed"
  license "MIT"

  depends_on "node@22"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec/"bin/brew-tui"
  end

  test do
    assert_match "Plan:", shell_output("#{bin}/brew-tui status")
  end
end
