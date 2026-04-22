class BrewTui < Formula
  desc "Visual TUI for Homebrew package management"
  homepage "https://github.com/MoLinesGitHub/Brew-TUI"
  url "https://registry.npmjs.org/brew-tui/-/brew-tui-0.1.0.tgz"
  sha256 "4fa582ffbccd5e07eb00fccffedc7f35fd64d328ec5ab05aafa8bf83e08e0b03"
  license "MIT"

  depends_on "node@18"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec/"bin/brew-tui"
  end

  test do
    assert_match "Plan:", shell_output("#{bin}/brew-tui status")
  end
end
