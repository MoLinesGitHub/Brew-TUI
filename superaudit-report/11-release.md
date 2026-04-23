# 17. Localizacion / 18. Release readiness

> Auditor: release-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

El codebase TypeScript (Brew-TUI TUI) tiene una infraestructura de localizacion excelente: 120 claves semanticas, cobertura bilingue (en/es) completa con verificacion de tipos en tiempo de compilacion, y ninguna cadena de texto visible hardcodeada en las vistas. El codebase Swift (BrewBar) tiene cobertura completa: todas las vistas SwiftUI localizan automaticamente via `LocalizedStringKey`, las rutas no-SwiftUI usan `String(localized:)` correctamente, y el String Catalog cubre los dos idiomas. Se detectan 4 entradas marcadas como `stale` en el String Catalog, lo que indica desincronizacion con el extractor de Xcode.

En materia de release, el mayor bloqueador es que BrewBar se distribuye sin firma de codigo ni notarizacion de Apple, lo que significa que macOS Gatekeeper bloqueara la app para la mayoria de usuarios al descargarla. Ademas se detectan dos workflows de CI duplicados para publicacion npm, ausencia total de `PrivacyInfo.xcprivacy`, ausencia de CHANGELOG, y 0% de cobertura de tests en ambos codebases.

---

## Metricas de localizacion

* **Idiomas soportados:** Ingles (en), Espanol (es) — ambos codebases
* **Total claves de localizacion (TUI TypeScript):** 120 claves en `src/i18n/en.ts` / `es.ts`
* **Total claves de localizacion (BrewBar Swift):** 30 entradas en `Localizable.xcstrings` (en + es); 4 marcadas `stale`
* **Formato de localizacion:** TypeScript: modulo i18n custom con claves semanticas; Swift: String Catalog (`Localizable.xcstrings`)
* **Strings hardcodeadas detectadas (TUI):** 0
* **Strings hardcodeadas detectadas (BrewBar):** 0 — las vistas SwiftUI (`Text`, `Button`, `Label`, `Toggle`, `Picker`, `ProgressView`) localizan automaticamente via `LocalizedStringKey`; las rutas no-SwiftUI usan `String(localized:)` correctamente
* **Entradas `stale` en String Catalog:** 4 (`"Open Brew-TUI"`, `"Retry"`, `"Service Errors"`, `"Upgrade All"`) — traducciones presentes y funcionales en runtime, pero el extractor de Xcode las considera obsoletas
* **Plurales correctos:** TUI via `tp()` (`_one`/`_other`); BrewBar via String Catalog plural variations

---

## Metricas de release

* **Version actual (npm):** 0.1.0
* **Version actual (BrewBar):** 0.1.0 (declarada en Homebrew cask; `Project.swift` no declara `MARKETING_VERSION`)
* **Configuraciones de build:** Debug / Release (via Tuist `Project.swift`)
* **Firma BrewBar:** No configurada — sin `CODE_SIGN_IDENTITY`, sin `DEVELOPMENT_TEAM` en `Project.swift`
* **Notarizacion BrewBar:** Ausente — no hay pasos `notarytool` ni `codesign` en CI
* **Privacy manifest (`PrivacyInfo.xcprivacy`):** Ausente en todo el proyecto
* **CHANGELOG:** Ausente
* **CI/CD:** 2 workflows de GitHub Actions — `release.yml` (trigger: tag push) y `publish.yml` (trigger: release published) — con solapamiento de responsabilidades

---

## 17. Localizacion e internacionalizacion

### Checklist

* [x] Strings externalizadas (TUI) — todas las vistas usan `t()` / `tp()`; ninguna cadena user-visible hardcodeada
* [x] Strings externalizadas (BrewBar) — vistas SwiftUI localizan automaticamente via `LocalizedStringKey`; rutas no-SwiftUI usan `String(localized:)` correctamente (NSAlert, UNNotification, SchedulerService); cobertura completa
* [x] Claves semanticas (TUI) — claves con namespace semantico consistente (ej. `dashboard_overview`, `badge_outdated`, `cli_activated`)
* [x] Claves semanticas (BrewBar) — String Catalog usa el texto en ingles como clave (patron valido para xcstrings con auto-extraccion)
* [x] Plurales correctos (TUI) — `tp('plural_vulns', count)` / `tp('plural_warnings', count)` con sufijos `_one`/`_other`; compilacion detecta claves faltantes
* [x] Plurales correctos (BrewBar) — String Catalog con variaciones `one`/`other` para `%lld packages can be updated` y `%lld updates available`
* [x] Fechas localizadas — TUI usa `toLocaleDateString()` (locale-aware del runtime); BrewBar usa `.formatted(.relative(presentation: .named))` con locale del sistema; no hay `dateFormat` hardcodeados
* [x] Numeros y moneda localizados — precios en euros como strings literales (ej. `account_monthlyPrice: '9€/month'`); numeros en BrewBar via `%lld` con `String(format:)`; sin `NumberFormatter` hardcodeado
* [ ] Layout soporta textos largos (BrewBar) — popover de tamano fijo 340x420pt; en textos largos en espanol puede haber truncamiento en etiquetas del popover sin `lineLimit`/`minimumScaleFactor`; nota: es intencionalmente fijo como menu bar popover
* [x] RTL contemplado — No aplica; no se soportan idiomas RTL (no hay directorios `.lproj` para ar/he)
* [x] No texto hardcodeado visible (TUI) — 0 strings hardcodeadas en `src/`
* [x] No texto hardcodeado visible (BrewBar) — 0 strings hardcodeadas; todas las cadenas visibles estan en el String Catalog con traduccion al espanol

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| 4 entradas `extractionState: stale` en xcstrings — `"Open Brew-TUI"`, `"Retry"`, `"Service Errors"`, `"Upgrade All"` | Parcial | Baja | `menubar/BrewBar/Resources/Localizable.xcstrings` lineas 348, 381, 392, 403 — las traducciones son funcionales en runtime pero el extractor de Xcode las marca como obsoletas | Resolver con `tuist generate` y re-ejecutar `xcodebuild -extractLocStrings`; actualizar estado a `manual` o eliminar entradas obsoletas para mantener el catalog limpio |
| Precio como string literal no localizable — `account_monthlyPrice: '9€/month'` / `account_pricing: '9€/month or 29€ lifetime'` | Parcial | Baja | `src/i18n/en.ts` lineas 249, 257; `es.ts` lineas 251, 258 | Las traducciones al espanol ya existen; el formato de moneda es correcto en ambos idiomas; considerar si el simbolo de moneda requiere adaptacion regional |
| Textos de fecha en TUI usan `toLocaleDateString()` sin opciones de locale explicitas | Parcial | Baja | `src/index.tsx` linea 25 (`new Date(license.expiresAt).toLocaleDateString()`) | Pasar el locale activo como argumento: `new Date(...).toLocaleDateString(currentLocale)` para garantizar consistencia con el locale seleccionado por el usuario |

---

## 18.1 Pre-release tecnico

### Checklist

* [x] Build Release limpia (TUI) — sin `TODO`/`FIXME`/`HACK` en ningun archivo TypeScript; el unico `console.error` esta guardado por `process.env.NODE_ENV !== 'production'`
* [x] Build Release limpia (BrewBar) — sin `TODO`/`FIXME`/`fatalError`/`preconditionFailure`/`try!`/`as!` en el codigo Swift de produccion
* [x] Archive correcto (TUI) — `prepublishOnly` ejecuta `typecheck && build`; CI en `release.yml` ejecuta `typecheck`, `build`, `lint` antes de `npm publish`
* [ ] Archive correcto (BrewBar) — el CI no realiza `codesign --deep --force` despues del build; la distribucion de `BrewBar.app.zip` se hace con `ditto` pero sin firma ni notarizacion
* [ ] Firma correcta (BrewBar) — `Project.swift` y `Tuist.swift` no declaran `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM` ni `PROVISIONING_PROFILE`; el build de CI (`xcodebuild ... build`) usara firma ad-hoc por defecto
* [x] Assets correctos — `Assets.xcassets` contiene `AppIcon.appiconset` con todos los tamanos macOS (16, 32, 128, 256, 512 en 1x y 2x); `MenuBarIcon.imageset` con variantes `dark`/`light` en 1x y 2x; `AccentColor.colorset` presente
* [ ] Configuracion entorno correcta (TUI) — sin mecanismo de configuracion de entorno (sin `.env`, sin variables de entorno de build); las URLs de Polar API y OSV.dev estan hardcodeadas en el codigo fuente sin separacion debug/release
* [x] Feature flags revisadas — no hay sistema de feature flags dinamico; el gating Pro se hace en compile-time via `PRO_VIEWS` set en `src/lib/license/feature-gate.ts`; estado claro y determinista
* [x] Logs verbosos eliminados o controlados (TUI) — unico `console.error` en `brew-store.ts:111` esta guardado por `NODE_ENV !== 'production'`; no hay `print()` descontrolado en TS
* [ ] Logs verbosos eliminados o controlados (BrewBar) — `NSLog("[BrewBar] Failed to open Brew-TUI: %@", ...)` en `PopoverView.swift:181` sin guarda de build configuration; aparecera en logs de produccion
* [ ] Dos workflows CI solapados — `release.yml` y `publish.yml` ambos publican a npm; pueden ejecutarse en secuencia para el mismo release causando doble publish

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| BrewBar distribuido sin firma de codigo ni notarizacion | No conforme | **Critica** | `.github/workflows/release.yml` — ningun paso de `codesign` ni `xcrun notarytool`; `Project.swift` sin `CODE_SIGN_IDENTITY` | Configurar Developer ID Application en `Project.swift`; agregar pasos de `codesign --deep --force --sign "Developer ID Application: ..."` y `xcrun notarytool submit` en CI; almacenar certificados en GitHub Secrets |
| macOS Gatekeeper bloqueara BrewBar en usuarios que lo descarguen via GitHub Releases o Homebrew cask | No conforme | **Critica** | `homebrew/Casks/brewbar.rb` linea 5; `.github/workflows/release.yml` — distribuye zip sin notarizar | Sin notarizacion, macOS >=10.15 mostrara "Apple no puede comprobar si este software contiene malware"; Homebrew cask instalara la app pero Gatekeeper la bloqueara al primer lanzamiento; solucion: notarizar y aplicar `spctl --assess` antes de empaquetar |
| Dos workflows CI con responsabilidades solapadas para npm publish | No conforme | Media | `release.yml` lineas 26, 37; `publish.yml` lineas 19, 43 | Unificar en un unico workflow; eliminar `publish.yml` o redefinir el trigger de `release.yml` para no solaparse; riesgo de doble publicacion y error `403 Forbidden` en la segunda ejecucion |
| `publish.yml` no ejecuta `typecheck` ni `build` antes de `npm publish` | No conforme | Alta | `publish.yml` lineas 17-22 — solo `npm ci` y `npm publish` | Agregar `npm run typecheck && npm run build` antes de publicar para garantizar que el artefacto publicado es siempre compilado y verificado |
| Inconsistencia de version Node entre workflows — `release.yml` usa Node 18; `publish.yml` usa Node 20 | No conforme | Baja | `release.yml` linea 20; `publish.yml` linea 8 | Unificar en Node 20 (LTS vigente) o usar `engines.node: ">=18"` del `package.json` como fuente de verdad |
| `NSLog` en produccion sin guarda en BrewBar | No conforme | Baja | `menubar/BrewBar/Sources/Views/PopoverView.swift:181` | Envolver en `#if DEBUG` o reemplazar con `Logger` (OSLog) usando nivel `.debug` que no aparece en builds release |
| Clave de derivacion AES-256-GCM hardcodeada en LicenseChecker | No conforme | **Critica** | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:47` — `let hex = "5c3b2ae2..."` | Esta clave permite descifrar cualquier licencia de cualquier usuario; mover al Keychain o usar un mecanismo de verificacion asincrono contra el servidor Polar; riesgo de pirateria total del sistema de licencias |
| `Project.swift` no declara version de marketing ni build number para BrewBar | No conforme | Media | `menubar/Project.swift` — sin `MARKETING_VERSION` ni `CURRENT_PROJECT_VERSION` en `base` settings | Agregar `"MARKETING_VERSION": "0.1.0"` y `"CURRENT_PROJECT_VERSION": "1"` en la seccion `base` de `settings`; sincronizar con version del cask Homebrew |

---

## 18.2 Producto

### Checklist

* [ ] Flujos criticos aprobados — 0 tests automatizados; vitest configurado sin ningun archivo `.test.ts`; `ink-testing-library` instalada sin uso
* [ ] Bugs criticos resueltos — no hay comentarios `BUG:`/`KNOWN ISSUE:` en el codigo; sin embargo, flujo de NSAppleScript en BrewBar solo soporta Terminal.app (hardcoded) lo que falla en iTerm2, Warp, Ghostty
* [ ] Crash-free threshold aceptable — sin crash reporting configurado (ni Crashlytics, ni Sentry) en ninguno de los dos codebases; imposible medir crash-free rate; en BrewBar no hay `try!`/`as!` en rutas de produccion criticas; el `Data(hexString: hex)!` en `LicenseChecker.swift:48` opera sobre una constante literal de compilacion (riesgo de crash practico nulo)
* [ ] Metricas minimas cubiertas — sin analytics configurado en ningun codebase
* [ ] Privacidad revisada — `PrivacyInfo.xcprivacy` ausente; BrewBar usa `UserDefaults` (requiere `NSPrivacyAccessedAPITypesUserDefaultsKey`), `FileManager` para timestamps de ficheros (requiere razon), y `UNUserNotificationCenter`; sin declaracion en Info.plist de permisos de usuario requeridos
* [ ] Accesibilidad minima validada (TUI) — no hay uso de `accessibilityLabel` ni APIs de accesibilidad en ninguna vista TypeScript/Ink; 0 ocurrencias en todo `src/`
* [x] Accesibilidad minima validada (BrewBar) — `accessibilityDescription` presente en el status item icon (`AppDelegate.swift:141,165`); SwiftUI tiene accesibilidad basica automatica para los controles nativos

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cero tests automatizados en ambos codebases | No conforme | **Critica** | `src/` — 0 archivos `.test.ts`; `menubar/` — 0 archivos `.xctest`; vitest configurado pero sin tests; `ink-testing-library` instalada sin uso | Escribir tests de integracion para flujos criticos: activacion/desactivacion de licencia, gating Pro, comandos CLI; para BrewBar: tests unitarios de `LicenseChecker` y `BrewChecker` |
| Sin crash reporting configurado | No conforme | Alta | No hay `Crashlytics`, `Sentry` ni equivalente en `package.json` ni en `Project.swift` | Integrar Sentry (SDK npm para TUI, Swift SDK para BrewBar) o Crashlytics via Firebase para ambos targets antes del lanzamiento publico |
| Sin analytics configurado | No conforme | Media | No hay evento de tracking en ningun archivo de `src/`; no hay dependencia de analytics en `package.json` | Integrar analytics minimo para medir conversion Free-to-Pro, activaciones, y errores de activacion de licencia |
| NSAppleScript hardcoded a Terminal.app en BrewBar | No conforme | Media | `menubar/BrewBar/Sources/Views/PopoverView.swift:176` — `tell application \"Terminal\" to do script \"brew-tui\"` | Detectar el terminal por defecto via `NSWorkspace` o permitir al usuario configurarlo en Settings; alternativa: usar `Process` para lanzar `brew-tui` directamente |
| Forced unwrap en constante de compilacion en LicenseChecker | Parcial | Baja | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:48` — `Data(hexString: hex)!` sobre una cadena hex literal compile-time | El riesgo de crash en produccion es nulo porque `hex` es una constante literal verificable en compilacion; sin embargo es un code smell; reemplazar con `guard let` para mayor claridad defensiva |
| Ausencia de `PrivacyInfo.xcprivacy` | No conforme | **Critica** | No existe ningun archivo `*.xcprivacy` en el proyecto; BrewBar usa `UserDefaults`, `FileManager` timestamp access, y `UNUserNotificationCenter` | Crear `BrewBar/Resources/PrivacyInfo.xcprivacy` declarando `NSPrivacyAccessedAPITypes` con razones para `UserDefaults` (`CA92.1`) y acceso a timestamps de ficheros (`C617.1`); necesario para notarizacion en macOS 15+ |
| Accesibilidad nula en vistas TUI | No conforme | Baja | 0 ocurrencias de `accessibilityLabel` en `src/`; la naturaleza de terminal de Ink limita la accesibilidad, pero se podria documentar la limitacion | Documentar que la accesibilidad de Ink/terminal es gestionada por el screen reader del sistema operativo; evaluar si las teclas de navegacion son anunciadas correctamente por VoiceOver |

---

## 18.3 Store / distribucion

### Checklist

* [x] Metadata correcta (npm) — `package.json` con `name`, `version`, `description`, `keywords`, `license`, `homepage`, `repository`, `engines`; `bin` correcto; `files` lista explicitamente `build/`, `bin/`, `LICENSE`, `README.md`
* [ ] Metadata correcta (BrewBar) — `Project.swift` no declara `MARKETING_VERSION` ni `CURRENT_PROJECT_VERSION`; la version 0.1.0 esta solo en el cask Homebrew, no en el bundle
* [ ] Capturas correctas — no existe ningun sistema de capturas de pantalla automatizadas; no hay screenshots en el repositorio para la pagina de npm, JSR ni GitHub
* [x] Privacy manifest / nutrition labels — N/A para npm/GitHub Releases; para BrewBar en distribucion ad-hoc via GitHub no es mandatorio a menos que se distribuya por App Store; sin embargo, la notarizacion en macOS 15+ requiere `PrivacyInfo.xcprivacy` para accesos a APIs del sistema
* [ ] Notas de revision correctas — no existe `CHANGELOG.md` ni `RELEASE_NOTES.md`; `generate_release_notes: true` en `release.yml` genera notas automaticamente desde commits pero sin estructura semantica
* [x] Deep links / universal links — N/A confirmado; sin `CFBundleURLTypes` en Info.plist de BrewBar; sin `.onOpenURL` en TUI; proyecto no requiere deep links segun su funcionalidad

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Homebrew cask distribuye app sin notarizar — Gatekeeper la bloqueara | No conforme | **Critica** | `homebrew/Casks/brewbar.rb` linea 5 — cask apunta a `BrewBar.app.zip` del GitHub Release; el CI no notariza ni firma con Developer ID | Notarizar y `staple` la app antes de empaquetar en zip; sin esto, `brew install --cask brewbar` instala una app que macOS bloqueara al primer lanzamiento con "unidentified developer" |
| Version de BrewBar no declarada en el bundle — bundle version drift | No conforme | Media | `menubar/Project.swift` sin `MARKETING_VERSION`; `homebrew/Casks/brewbar.rb` hardcodea `version "0.1.0"` | Declarar `"MARKETING_VERSION": "$(BREW_TUI_VERSION)"` o un valor explicito en `Project.swift`; considerar un script que sincronice la version del cask con la del bundle en cada release |
| Ausencia de CHANGELOG estructurado | No conforme | Media | No hay `CHANGELOG.md` ni `RELEASE_NOTES.md` en la raiz del repositorio; `generate_release_notes: true` genera notas desde commits sin formato semantico | Crear `CHANGELOG.md` siguiendo Keep a Changelog; el workflow puede prepender el bloque del tag automaticamente usando `gh release view --json body` |
| Sha256 en Formula Homebrew podria desincronizarse en futuros releases | Parcial | Media | `homebrew/Formula/brew-tui.rb` linea 5 — `sha256 "4fa582ff..."` hardcodeado para 0.1.0; `homebrew/Casks/brewbar.rb` linea 3 — `sha256 "78a74e7b..."` | Automatizar la actualizacion de sha256 en el CI (post-publish, calcular hash del artefacto publicado y hacer PR a la formula); sin esto cada release manual puede desincronizarse |
| No hay screenshots para npm/JSR ni pagina del producto | No conforme | Baja | `package.json` sin campo `screenshots`; repositorio sin directorio `screenshots/` o `docs/assets/` | Agregar capturas de pantalla del TUI y del popover de BrewBar al README y a la pagina npm para mejorar discoverability y conversion |
| `publish.yml` modifica `package.json` en tiempo de ejecucion para cambiar nombre del paquete | Parcial | Baja | `publish.yml` lineas 35-42 — usa `node -e` para mutar `package.json` antes de publicar a GitHub Packages | Preferir un archivo `.npmrc` de publicacion o un `package.json` separado para el scope `@molinesgithub`; mutar el archivo en CI es fragil y puede causar inconsistencias |
