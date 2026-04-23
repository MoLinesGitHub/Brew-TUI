# 17. Localizacion / 18. Release readiness

> Auditor: release-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

El sistema de internacionalizacion del TUI TypeScript es robusto y exhaustivo: 271 claves tipadas, cobertura completa en en/es, verificacion en tiempo de compilacion, y plurales gestionados correctamente. Sin embargo, BrewBar presenta tres cadenas en codigo con `String(localized:)` sin entrada correspondiente en `Localizable.xcstrings` — los usuarios en espanol ven texto en ingles — y un cuarto problema de clave desajustada para el mensaje de licencia expirada. En cuanto a release, el hallazgo critico es que el `.app` de BrewBar se distribuye sin firma de codigo ni notarizacion, lo que provoca que Gatekeeper de macOS bloquee el lanzamiento en la maquina del usuario. Los demas aspectos tecnicos (version, assets, build Pipeline npm, privacy manifest) estan en buen estado tras las correcciones de v0.2.0.

---

## Metricas de localizacion

* **Idiomas soportados:** Ingles (en) — fuente de verdad; Espanol (es) — traduccion completa en ambas codebases
* **Total claves de localizacion (TUI TypeScript):** 271 claves en `src/i18n/en.ts` / `es.ts`
* **Total claves de localizacion (BrewBar Swift):** 35 entradas en `Localizable.xcstrings`
* **Formato de localizacion:** TypeScript — modulo i18n personalizado con `t()` y `tp()`; Swift — String Catalog (`.xcstrings`) + `String(localized:)` para contextos no-SwiftUI
* **Strings hardcodeadas detectadas (TUI):** 0 (en vistas React)
* **Strings hardcodeadas detectadas (BrewBar):** 3 cadenas en vistas SwiftUI sin entrada en xcstrings

---

## Metricas de release

* **Version actual (TUI):** 0.2.0 (`package.json`, `jsr.json`)
* **Version actual (BrewBar):** 0.2.0 (`MARKETING_VERSION: $(MARKETING_VERSION:default=0.2.0)` en `Project.swift`)
* **Build number (BrewBar):** No configurado — `CURRENT_PROJECT_VERSION` ausente en `Project.swift`
* **Configuraciones:** Debug, Release (via Tuist en BrewBar); sin configuracion de build para TUI
* **Firma (BrewBar):** No configurada en CI — sin `CODE_SIGN_IDENTITY`, sin `DEVELOPMENT_TEAM`, sin notarizacion
* **Privacy manifest:** Presente — `menubar/BrewBar/Resources/PrivacyInfo.xcprivacy`
* **Canales de distribucion:** npm, JSR, GitHub Releases (BrewBar.app.zip), Homebrew tap (formula + cask)

---

## 17. Localizacion e internacionalizacion

### Checklist

* [ ] **Strings externalizadas** — TUI: todas las cadenas visibles al usuario pasan por `t()`. BrewBar: vistas SwiftUI usan literales extraidos automaticamente por el compilador; contextos no-SwiftUI usan `String(localized:)`. Tres cadenas en `OutdatedListView.swift` y `AppDelegate.swift` usan `String(localized:)` pero no tienen entrada en `Localizable.xcstrings`.
* [x] **Claves semanticas** — TUI: claves de estilo `seccion_concepto` (e.g. `cleanup_confirmUninstall`, `history_filterLabel`). Consistente en todos los 271 keys. BrewBar: usa el texto ingles como clave (convencion xcstrings), aceptable para String Catalog.
* [x] **Plurales correctos** — TUI: helper `tp(baseKey, count)` con sufijos `_one`/`_other` implementado; en uso para `plural_vulns` y `plural_warnings`. BrewBar: xcstrings define variaciones `plural.one`/`plural.other` para `%lld packages can be updated.` y `%lld updates available`. Correcto en ambos sistemas.
* [x] **Fechas localizadas** — BrewBar: usa `.formatted(.relative(presentation: .named))` que es locale-aware. TUI: `formatRelativeTime()` usa cadenas i18n propias. Problema menor: `toLocaleDateString()` sin argumento de locale en `account.tsx` y `profiles.tsx` — usa el locale del sistema operativo en lugar del locale seleccionado en la app con `--lang=`.
* [x] **Numeros y moneda localizados** — TUI: no se formatean numeros monetarios en runtime (precios son strings estaticos localizados). `formatBytes()` usa `toFixed(1)` con separador decimal del sistema — aceptable para informacion tecnica de disco. BrewBar: `%lld` usa formateo del sistema.
* [x] **Layout soporta textos largos** — TUI (Ink): basado en terminal, el layout es flexible por naturaleza. BrewBar: `PopoverView` tiene ancho fijo (340px) pero el contenido usa SwiftUI flexbox — los textos largos en espanol se adaptan correctamente (verificado en previews con `.environment(\.locale, Locale(identifier: "es"))`). `SettingsView` fija `frame(width: 300)` pero no hay texto de longitud variable que pueda truncarse.
* [ ] **RTL contemplado si aplica** — No aplica. Los dos idiomas soportados (en/es) son LTR. No hay `.lproj` para arabe o hebreo. Marcado como no aplicable.
* [ ] **No texto hardcodeado visible** — Tres cadenas en BrewBar usan `String(localized:)` sin entrada en xcstrings: `"Upgrade all packages?"`, `"Cancel"` (ambas en `OutdatedListView.swift`), y `"Continue"` (`AppDelegate.swift`). Adicionalmente, la clave del mensaje de licencia expirada en el codigo (`AppDelegate.swift:126`) no coincide con la clave en xcstrings, resultando en fallback al texto ingles en espanol.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Tres cadenas `String(localized:)` sin entrada en xcstrings: `"Upgrade all packages?"`, `"Cancel"`, `"Continue"` | No conforme | Alta | `OutdatedListView.swift:21,28`, `AppDelegate.swift:128` — ausentes en `Localizable.xcstrings` | Agregar las tres entradas al xcstrings con traduccion al espanol. `"Cancel"` puede omitirse si se deja el rol `.cancel` sin titulo (SwiftUI lo provee automaticamente como cadena del sistema). |
| Clave desajustada para mensaje de licencia expirada | No conforme | Alta | Codigo: `"Your Pro license has expired or needs revalidation.\n\nRun \`brew-tui activate <key>\`..."` (AppDelegate.swift:126). xcstrings tiene la clave mas corta sin el comando ni "basic mode". Las dos cadenas son diferentes; el lookup falla. | Sincronizar: actualizar la clave en xcstrings para que coincida exactamente con la cadena del codigo, o refactorizar la cadena del codigo para que coincida con la clave existente. Agregar la traduccion al espanol correspondiente. |
| Cuatro cadenas con `extractionState: stale` en xcstrings | Parcial | Baja | `"Open Brew-TUI"`, `"Retry"`, `"Service Errors"`, `"Upgrade All"` marcadas como `stale` en `Localizable.xcstrings`. Las traducciones existen y son correctas. | Ejecutar `tuist generate` y dejar que el compilador re-extraiga las cadenas para limpiar el estado stale. Sin impacto funcional pero indica que el catalogo no se ha sincronizado con el codigo fuente reciente. |
| `toLocaleDateString()` sin argumento de locale en TUI | Parcial | Baja | `src/views/account.tsx:89,94`; `src/views/profiles.tsx:201`; `src/index.tsx:25,65` — usa el locale del sistema operativo en lugar del locale de la app (`--lang=es`). | Pasar el locale de la app: `new Date(x).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US')` o crear un helper `formatDate(date, locale)`. |

---

## 18.1 Pre-release tecnico

### Checklist

* [x] **Build Release limpia** — Sin `fatalError()`, `preconditionFailure()`, `try!` ni `as!` en codigo de produccion (ni TypeScript ni Swift). Tres `TODO` menores en TypeScript (`app.tsx:22`, `brew-cli.ts:64`, `doctor.tsx:9`) describen refactors, no codigo inacabado critico. Sin mock ni test code en paths de produccion.
* [ ] **Archive correcto** — CI usa `xcodebuild build` en lugar de `xcodebuild archive`. No se genera un `.xcarchive`. El artefacto `.app` se extrae del directorio `build/` con `find` y se comprime con `ditto`. Sin `exportOptions.plist`. Sin Fastlane.
* [ ] **Firma correcta** — El job `build-brewbar` en `release.yml` no configura `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM` ni `PROVISIONING_PROFILE_SPECIFIER`. El `.app` resultante no esta firmado con Developer ID. Sin pasos de notarizacion (`xcrun notarytool`). Cualquier Mac con Gatekeeper activo (predeterminado) bloqueara la ejecucion del `.app` descargado.
* [x] **Assets correctos** — `AppIcon.appiconset` completo: 10 tamanos macOS (16x16 @1x/@2x, 32x32 @1x/@2x, 128x128 @1x/@2x, 256x256 @1x/@2x, 512x512 @1x/@2x). `MenuBarIcon.imageset` presente con `isTemplate = true`. `AccentColor.colorset` configurado. No se requiere `LaunchScreen` (app LSUIElement).
* [x] **Configuracion entorno correcta** — Sin URLs de desarrollo o staging en codigo de produccion. La unica URL de API en TypeScript es `https://api.polar.sh/v1/customer-portal/license-keys` (produccion). Sin credenciales de prueba en codigo fuente. `process.env.NODE_ENV !== 'production'` guarda el unico `console.error` de debug en `brew-store.ts:121`.
* [x] **Feature flags revisadas** — No hay sistema de feature flags externo (LaunchDarkly, Firebase Remote Config, etc.). El gating Pro es estatico via `PRO_VIEWS` set en `src/lib/license/feature-gate.ts`. Todos los Pro views correctamente gateados: `profiles`, `smart-cleanup`, `history`, `security-audit`.
* [x] **Logs verbosos eliminados o controlados** — `console.log/error/warn` en TUI se usan exclusivamente en `src/index.tsx` para salida de CLI (subcomandos `activate`, `status`, `deactivate`) — comportamiento correcto e intencionado. Un solo `console.error` en `brew-store.ts:121` protegido por `process.env.NODE_ENV !== 'production'`. Sin `NSLog` ni `print()` de debug en Swift.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| BrewBar sin firma de codigo ni notarizacion en CI | No conforme | Critica | `.github/workflows/release.yml:62-66` — `xcodebuild` sin `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM`, ni paso de notarizacion. El `BrewBar.app.zip` distribuido es ad-hoc. Gatekeeper bloquea el lanzamiento en macOS por defecto. | Agregar firma con Developer ID Certificate: configurar `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM` como secrets en GitHub Actions. Anadir paso de notarizacion con `xcrun notarytool submit` y `xcrun stapler staple`. Requerir `archive` + `export` en lugar de solo `build`. |
| `xcodebuild build` en lugar de `archive` en CI | No conforme | Alta | `.github/workflows/release.yml:62-66` — el comando es `build`, no `archive`. El `.app` se extrae del `DerivedData` con `find`. Sin `exportOptions.plist`. | Cambiar a `xcodebuild archive -archivePath BrewBar.xcarchive` seguido de `xcodebuild -exportArchive -exportOptionsPlist exportOptions.plist`. Agregar `ExportOptions.plist` al repositorio (ya ignorado en `.gitignore` — revisar si debe incluirse para CI). |
| `CURRENT_PROJECT_VERSION` ausente en `Project.swift` | No conforme | Baja | `menubar/Project.swift` — solo `MARKETING_VERSION` configurado. Sin numero de build (`CFBundleVersion`). | Agregar `"CURRENT_PROJECT_VERSION": "1"` (o incrementar automaticamente en CI). Necesario para cumplimiento de App Store si se distribuyera ahi, y buena practica para rastrear builds. |
| GitHub Packages publish sin `--provenance` | No conforme | Baja | `.github/workflows/release.yml:46` — `npm publish --access public` sin `--provenance`, a diferencia del job `publish-npm` que si lo incluye (linea 28). | Agregar `--provenance` al paso de publish en el job `publish-github-packages` para consistencia de cadena de suministro. |

---

## 18.2 Producto

### Checklist

* [ ] **Flujos criticos aprobados** — Sin ningun archivo de test (0 tests, 0% cobertura, confirmado en ficha). Los flujos criticos — activacion de licencia, install/uninstall/upgrade de paquetes, smart-cleanup, importacion de perfiles — no tienen tests automatizados ni documentados.
* [x] **Bugs criticos resueltos** — Sin comentarios `// BUG:`, `// KNOWN ISSUE:` ni `// WORKAROUND:` en el codigo. Los tres `TODO` existentes son refactors tecnicos no criticos. El CHANGELOG.md v0.2.0 documenta 8 bugs corregidos desde v0.1.0.
* [ ] **Crash-free threshold aceptable** — Sin crash reporting (no Crashlytics, Sentry, ni equivalente). Sin `fatalError` ni `try!` en paths de produccion (positivo). Sin forced unwraps (`!`) en TypeScript. Sin metrismo de estabilidad posible sin telemetria.
* [ ] **Metricas minimas cubiertas** — Sin analytics configurado en ninguna de las dos codebases. No es posible medir retencion, conversion a Pro, ni uso de features.
* [x] **Privacidad revisada** — `PrivacyInfo.xcprivacy` presente y correcto para BrewBar: `NSPrivacyAccessedAPICategoryUserDefaults` con razon `CA92.1` (uso en preferencias de usuario verificado en `SchedulerService.swift`). `NSPrivacyTracking: false`. `NSPrivacyCollectedDataTypes: []`. La declaracion `NSPrivacyAccessedAPICategoryFileTimestamp` con razon `C617.1` esta incluida — no se encontro uso directo de API de timestamp de ficheros en el codigo Swift (el acceso al fichero de licencia usa `FileManager.default.contents(atPath:)` que puede triggerar internamente) — inofensivo tenerla declarada.
* [ ] **Accesibilidad minima validada** — TUI (Ink): sin soporte de accesibilidad — Ink no expone APIs de accesibilidad a VoiceOver; es una limitacion del framework. BrewBar: solo `accessibilityDescription` en el icono de barra de menu (`AppDelegate.swift:141,168`). Sin `.accessibilityLabel`, `.accessibilityHint`, ni `.accessibilityValue` en vistas SwiftUI. Sin infraestructura de test de accesibilidad.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cero tests automatizados | No conforme | Alta | `superaudit-report/00-ficha.md` — "Archivos de test: 0 (vitest instalado, ink-testing-library instalado, sin ningun test implementado)". Flujos criticos como activacion de licencia, install/uninstall, pro-guard, y brewbar-installer sin cobertura. | Implementar tests unitarios minimos para `license-manager.ts`, `pro-guard.ts`, `feature-gate.ts`, y `brewbar-installer.ts`. Usar `vitest` ya instalado e `ink-testing-library` para tests de vista. |
| Sin crash reporting ni telemetria | No conforme | Media | No se encontro ningun SDK de crash reporting (Crashlytics, Sentry) ni analytics en ninguna de las dos codebases. | Para BrewBar: integrar `os_log` o un lightweight crash reporter. Para TUI: considerar un contador de errores anonimizado. Sin telemetria es imposible conocer la tasa de crashes en produccion. |
| Accesibilidad ausente en BrewBar SwiftUI | No conforme | Media | `PopoverView.swift`, `OutdatedListView.swift`, `SettingsView.swift` — sin modificadores `.accessibilityLabel()` en ningun elemento interactivo. Los botones de upgrade individual, el popover, y el picker de intervalo no tienen labels de accesibilidad. | Agregar `.accessibilityLabel()` a los botones de accion en `OutdatedListView` (upgrade individual, "Upgrade All"). Verificar con Accessibility Inspector de Xcode. |

---

## 18.3 Store / distribucion

### Checklist

* [x] **Metadata correcta** — Sin App Store (BrewBar se distribuye via GitHub Releases, no Mac App Store). Version `0.2.0` consistente en `package.json`, `jsr.json`, `Project.swift`, y `CHANGELOG.md`. Nombre del paquete npm: `brew-tui`. Bundle ID BrewBar: `com.molinesdesigns.brewbar`.
* [ ] **Capturas correctas** — Sin automatizacion de screenshots (sin Fastlane `snapshot`, sin UI tests de captura). No aplicable para distribucion directa, pero relevante para landing page y documentacion.
* [x] **Privacy manifest / nutrition labels correctos** — `PrivacyInfo.xcprivacy` presente con `NSPrivacyAccessedAPITypes` declarando `UserDefaults` (CA92.1) y `FileTimestamp` (C617.1). `NSPrivacyTracking: false`. `NSPrivacyCollectedDataTypes` vacio. Cumple los requisitos de Apple para SDK/app privacy manifest desde primavera 2024.
* [x] **Notas de revision correctas** — `CHANGELOG.md` presente y actualizado con v0.2.0 (fecha 2026-04-23). Contiene secciones Security, Fixed, Improved, Added. `generate_release_notes: true` en `softprops/action-gh-release@v2` genera notas automaticas de GitHub Release a partir de commits.
* [x] **Deep links / universal links validados** — No aplica. BrewBar no registra URL schemes en `Project.swift` (`CFBundleURLTypes` ausente). TUI es CLI — sin URL handling. Sin `.onOpenURL` ni `Associated Domains`. Correcto para el tipo de producto.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| BrewBar.app.zip sin firma ni notarizacion afecta distribucion directa | No conforme | Critica | (Ver tambien 18.1) El archivo descargado por usuarios desde GitHub Releases no pasara Gatekeeper. El comando `brew-tui install-brewbar` en `src/lib/brewbar-installer.ts` descarga este mismo artefacto. Los usuarios reciben error "can't be opened because it is from an unidentified developer" o similar. | Prioritario: configurar Developer ID Application certificate como secret en GitHub Actions y notarizar antes de publicar el Release. Ver hallazgo de firma en 18.1. |
| Sin screenshots ni assets de marketing automatizados | No conforme | Baja | No se encontraron screenshots en el repositorio ni automatizacion para generarlos. Sin impacto en distribucion tecnica pero limita la documentacion y el listing en cuanto el producto se expanda. | Agregar screenshots al `README.md` o a una carpeta `/assets/screenshots/`. Para BrewBar, `xcrun simctl screenshot` o el Inspector de Xcode pueden capturarlos manualmente. |
