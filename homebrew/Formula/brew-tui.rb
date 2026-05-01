class BrewTui < Formula
  desc "Visual TUI for Homebrew package management"
  homepage "https://github.com/MoLinesDesigns/Brew-TUI"
  url "https://registry.npmjs.org/brew-tui/-/brew-tui-0.6.2.tgz"
  sha256 "c204df2b1b8b7ae0caba4d81b15de030a7977679f48fa6af7404c41f7e37e18b"
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
