# -*- coding: utf-8; mode: tcl; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- vim:fenc=utf-8:ft=tcl:et:sw=4:ts=4:sts=4

PortSystem          1.0
PortGroup           nodejs 1.0

node.version        20
node.setup          brew-tui 0.1.0 https://registry.npmjs.org/brew-tui/-/

categories          sysutils
platforms           darwin
license             MIT
maintainers         {molinesdesigns.com:admin @MoLinesGitHub} openmaintainer

description         Visual TUI for Homebrew package management
long_description    Brew-TUI is a terminal UI for Homebrew built with React and Ink. \
                    Browse installed packages, search, upgrade, manage services, run \
                    brew doctor, and view package details — all from the terminal. \
                    Pro features include Profiles, Smart Cleanup, History, and Security Audit.

homepage            https://github.com/MoLinesGitHub/Brew-TUI

checksums           rmd160  0000000000000000000000000000000000000000 \
                    sha256  4fa582ffbccd5e07eb00fccffedc7f35fd64d328ec5ab05aafa8bf83e08e0b03 \
                    size    0

depends_run         port:node20

destroot {
    set npmdir ${destroot}${prefix}/lib/node_modules/brew-tui
    xinstall -d ${npmdir}
    system "cd ${worksrcpath} && npm pack && tar -xzf brew-tui-${version}.tgz -C ${destroot}${prefix}/lib/node_modules --strip-components=1"
    ln -s ${prefix}/lib/node_modules/brew-tui/bin/brew-tui.js ${destroot}${prefix}/bin/brew-tui
}
