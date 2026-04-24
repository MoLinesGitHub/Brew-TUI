# SUPERAUDIT-REPORT — Reporte de Auditoria Completo

> Generado por: report-consolidator | Fecha: 2026-04-23

## Estadisticas globales

* **Fecha de auditoria:** 2026-04-23
* **Proyecto auditado:** Brew-TUI v0.2.0 (commit 65c7308, rama main)
* **Total hallazgos:** 86
* **Criticos:** 4 | **Altos:** 21 | **Medios:** 36 | **Bajos:** 25
* **Dominios auditados:** 14 de 14
* **Pantallas auditadas:** 15 (12 TUI + 3 SwiftUI BrewBar)
* **Endpoints / call sites auditados:** 9 (3 Polar.sh, 2 OSV.dev, 2 GitHub Releases, 2 brew CLI)

---

## Tabla de contenidos

1. [0. Ficha de auditoria](#0-ficha-de-auditoria)
2. [1. Inventario maestro](#1-inventario-maestro-de-cobertura)
3. [2. Gobierno del proyecto](#2-gobierno-del-proyecto)
4. [3. Arquitectura y limites del sistema](#3-arquitectura-y-limites-del-sistema)
5. [4. Estado, concurrencia y flujo de datos](#4-estado-concurrencia-y-flujo-de-datos)
6. [5. UI estructural](#5-auditoria-ui-estructural)
7. [6. UX funcional](#6-ux-funcional)
8. [7. Design system](#7-design-system)
9. [8. Accesibilidad](#8-accesibilidad)
10. [11. Backend funcional](#11-backend-funcional)
11. [12. Persistencia y sincronizacion](#12-persistencia-y-sincronizacion)
12. [13. Seguridad y privacidad](#13-seguridad-y-privacidad)
13. [14. Testing y calidad](#14-testing-y-calidad--15-observabilidad-y-analitica)
14. [15. Observabilidad y analitica](#14-testing-y-calidad--15-observabilidad-y-analitica)
15. [16. Rendimiento](#16-rendimiento)
16. [17. Localizacion / 18. Release readiness](#17-localizacion--18-release-readiness)
17. [19. Auditoria por pantalla](#19-auditoria-por-pantalla)
18. [20. Auditoria por endpoint](#20-auditoria-por-endpoint)
19. [21. Registro central de hallazgos](#21-registro-central-de-hallazgos)
20. [22. Priorizacion ejecutiva](#22-priorizacion-ejecutiva)
21. [23. Veredicto final](#23-veredicto-final)
22. [24. Checklist ultra resumido](#24-checklist-ultra-resumido)

---

# 0. Ficha de auditoria

> Auditor: project-scanner | Fecha: 2026-04-23

## Datos del proyecto

* **Nombre del proyecto:** Brew-TUI
* **Version actual:** 0.2.0
* **Plataformas:** macOS CLI/Terminal (TUI), macOS Menu Bar (BrewBar companion app)
* **Stack principal:** TypeScript 5.8 / React 18 / Ink 5.x / Zustand 5 / Node.js >=18 (TUI) + Swift 6 / SwiftUI / macOS 14+ (BrewBar)
* **Repositorio:** https://github.com/MoLinesGitHub/Brew-TUI.git
* **Commit auditado:** 65c7308
* **Rama auditada:** main
* **Fecha de auditoria:** 2026-04-23
* **Auditor responsable:** super-audit (automated)
* **Entorno auditado:** Produccion (build Release para BrewBar, bundle ESM para TUI)

## Contexto de re-auditoria

Esta es una re-auditoria realizada tras la version 0.2.0. La version anterior acumulo 61 hallazgos que fueron corregidos antes de esta entrega. El objetivo es validar el estado actual del proyecto y detectar cualquier hallazgo residual o nuevo introducido durante el refactor.

## Objetivo de la auditoria

* **Objetivo principal:** Auditoria exhaustiva 100% del proyecto — ambas codebases (TypeScript TUI + Swift BrewBar)
* **Riesgo principal del producto:** Integridad del modelo freemium (licencias Pro) y seguridad de la cadena de distribucion (BrewBar installer + CI/CD)
* **Areas prioritarias:** Licencias y feature-gating, seguridad (anti-tamper, anti-debug, watermark), calidad del codigo (tests = 0), CI/CD, internacionalizacion, UX/navegacion
* **Alcance excluido:** Ninguno (auditoria completa de ambas codebases)

## Escala de severidad

* **Critica**: riesgo de caida, fuga de datos, perdida de negocio o bloqueo de uso
* **Alta**: afecta flujos clave, calidad percibida o mantenibilidad severamente
* **Media**: afecta consistencia, deuda tecnica o UX de forma relevante
* **Baja**: mejora recomendable sin impacto grave inmediato

---

# 1. Inventario maestro de cobertura

> Auditor: project-scanner | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 es un proyecto hibrido compuesto por dos codebases independientes: una TUI (Terminal User Interface) escrita en TypeScript/React/Ink para la gestion visual de Homebrew, y BrewBar, una aplicacion companion para la barra de menu de macOS escrita en Swift 6/SwiftUI. La TUI cuenta con 12 vistas, 4 funcionalidades Pro (perfiles, limpieza inteligente, historial, auditoria de seguridad) y un modelo de licencias freemium con multiples capas de proteccion. La codebase TypeScript suma 71 archivos fuente (6.139 lineas), la codebase Swift suma 12 archivos en Sources (1.235 lineas).

## 1.1 Inventario de plataformas y targets

* [x] CLI / Terminal (macOS) — Brew-TUI TUI, Node.js >=18, distribuido via npm
* [x] App macOS (Menu Bar) — BrewBar, Swift 6, macOS 14+, distribuido via GitHub Releases

| Target | Plataforma | Bundle ID / Package | Deployment Target | Tipo |
|--------|------------|---------------------|-------------------|------|
| brew-tui | macOS (Node.js CLI) | brew-tui (npm) | Node.js >=18 | CLI/TUI binario ESM |
| BrewBar | macOS (Swift) | com.molinesdesigns.brewbar | macOS 14.0+ | Menu Bar App (LSUIElement) |

## 1.2 Inventario de modulos

### Codebase TypeScript (src/)

| Modulo | Ruta | Archivos | Responsabilidad |
|--------|------|----------|-----------------|
| views | src/views/ | 12 | Componentes React de cada vista TUI |
| lib/license | src/lib/license/ | 7 | Gestion de licencias: activation, validation, anti-tamper, integrity, canary, watermark |
| lib/security | src/lib/security/ | 3 | Auditoria de vulnerabilidades via OSV.dev |
| lib/profiles | src/lib/profiles/ | 3 | Gestion de perfiles de instalacion (Pro) |
| lib/cleanup | src/lib/cleanup/ | 3 | Analisis de paquetes huerfanos (Pro) |
| lib/history | src/lib/history/ | 3 | Registro de acciones de Homebrew (Pro) |
| lib/parsers | src/lib/parsers/ | 2 | Parseo de output JSON y texto de brew |
| lib (core) | src/lib/ | 6 | brew-cli, brew-api, types, data-dir, fetch-timeout, brewbar-installer |
| stores | src/stores/ | 4 | Estados globales Zustand: brew, navigation, license, modal |
| hooks | src/hooks/ | 3 | use-keyboard, use-brew-stream, use-debounce |
| components | src/components/ | 13 | Componentes UI comunes y de layout |
| i18n | src/i18n/ | 3 | Internacionalizacion: en.ts, es.ts, index.ts |
| utils | src/utils/ | 3 | Funciones de formato (bytes, tiempo relativo, truncado) |
| root | src/ | 2 | index.tsx (entry + CLI subcommands), app.tsx (router) |

### Codebase Swift (menubar/)

| Modulo | Ruta | Archivos | Responsabilidad |
|--------|------|----------|-----------------|
| App | menubar/BrewBar/Sources/App/ | 2 | Entry point (@main), AppDelegate, ciclo de vida |
| Models | menubar/BrewBar/Sources/Models/ | 4 | AppState (@Observable), tipos de datos |
| Services | menubar/BrewBar/Sources/Services/ | 3 | BrewChecker, LicenseChecker, SchedulerService |
| Views | menubar/BrewBar/Sources/Views/ | 3 | PopoverView, OutdatedListView, SettingsView |
| Resources | menubar/BrewBar/Resources/ | 2 | Localizable.xcstrings, PrivacyInfo.xcprivacy |
| Project config | menubar/ | 2 | Project.swift (Tuist), Tuist.swift |

## 1.3 Inventario de APIs externas

| Servicio | URL | Proposito |
|----------|-----|-----------|
| Polar.sh | https://api.polar.sh/v1/customer-portal/license-keys | Activacion y validacion de licencias Pro |
| OSV.dev | https://api.osv.dev/v1/querybatch | Consulta de vulnerabilidades (CVEs) por paquete |
| GitHub Releases | https://github.com/MoLinesGitHub/Brew-TUI/releases | Descarga de BrewBar.app.zip (instalador) |

## 1.5 Metricas generales

* **Total archivos fuente (ambas codebases):** 83 (71 TS/TSX + 12 Swift Sources)
* **Total targets:** 2 (brew-tui CLI/TUI + BrewBar macOS app)
* **Total features TUI:** 14 (12 vistas + CLI subcommands + BrewBar app)
* **Archivos de test:** 3 (`src/lib/parsers/parsers.test.ts`, `src/stores/brew-store.test.ts`, `src/stores/license-store.test.ts`)
* **Cobertura de test:** Suite minima presente con 8 tests Vitest en TypeScript; 0 tests XCTest en Swift

---

# 2. Gobierno del proyecto

> Auditor: governance-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

El proyecto v0.2.0 presenta una base de gobierno solida en ambas codebases: los targets son minimos y claros, los build settings del lado Swift son mayoritariamente correctos y el pipeline CI/CD ha mejorado significativamente respecto a la version anterior. Se detectan cinco hallazgos prioritarios: la clave de cifrado AES-256-GCM embebida en `LicenseChecker.swift` y `license-manager.ts` (Media, inherente al modelo client-side), `NSMainStoryboardFile = "Main"` sin archivo storyboard correspondiente (Media), `CFBundleShortVersionString` no definido explicitamente en `Project.swift` (Media), `SWIFT_STRICT_CONCURRENCY` no documentado explicitamente (Media/Parcial), y `POLAR_ORGANIZATION_ID` embebido en codigo fuente (Baja).

## Hallazgos de gobierno

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 0 |
| Media | 4 |
| Baja | 4 |

**Total hallazgos: 8**

### Hallazgos principales

1. **Media** — `NSMainStoryboardFile = "Main"` heredado del template de Tuist: clave obsoleta sin archivo storyboard correspondiente.
2. **Media** — `CFBundleShortVersionString` no definido en `Project.swift`: bundle podria mostrar version `1.0`.
3. **Media** — Clave AES-256-GCM embebida en `LicenseChecker.swift:47` y `license-manager.ts:61-62`: inherente al modelo client-side; permite fabricacion de licencias.
4. **Media** — `SWIFT_STRICT_CONCURRENCY` no declarado explicitamente en `Project.swift`.
5. **Baja** — `POLAR_ORGANIZATION_ID` embebido en `polar-api.ts:9`.
6. **Baja** — ESLint con cobertura minimalista (solo `no-unused-vars`).
7. **Baja** — `PrivacyInfo.xcprivacy` pendiente de verificacion post-`tuist generate`.
8. **Baja** — Razon `CA92.1` posiblemente incorrecta para `NSPrivacyAccessedAPICategoryUserDefaults`.

---

# 3. Arquitectura y limites del sistema

> Auditor: architecture-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 presenta una arquitectura hibrida bien estructurada en sus niveles superiores. Sin embargo, persiste un patron sistematico de violacion de capas: cinco modulos de `lib/` importan directamente `useLicenseStore`, invirtiendo el flujo de dependencias esperado (UI → Stores → Lib) e introduciendo acoplamiento circular. En BrewBar la arquitectura es compacta y bien aislada con `AppState` como fuente de verdad unica bajo `@MainActor`.

## Hallazgos de arquitectura

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 1 |
| Media | 7 |
| Baja | 9 |

**Total hallazgos: 17**

### Hallazgo Alta principal

**ARQ-001** — Cinco modulos de `lib/` importan `useLicenseStore` directamente del store layer, invirtiendo la jerarquia de dependencias. Afecta: `history-logger.ts:5`, `audit-runner.ts:3`, `cleanup-analyzer.ts:6`, `profile-manager.ts:9`, `brewbar-installer.ts:9`.

### Otros hallazgos clave

- `_revalidating` flag booleano no verdaderamente atomico (`license-store.ts:12,58,79`)
- `brewUpdate().catch(() => {})` descarta errores silenciosamente (`brew-store.ts:147`)
- Tasks fire-and-forget en botones SwiftUI sin handle de cancelacion
- `DispatchQueue.global()` mezclado con Swift concurrency
- `lastFetchedAt` definido pero no usado para invalidacion (`brew-store.ts:17,40,57`)
- Sin cache de resultados de OSV.dev (`security-store.ts`)
- `outdated.tsx` importa `execBrew()` directamente sin pasar por la capa de API

---

# 4. Estado, concurrencia y flujo de datos

> (Incluido en el reporte de arquitectura — ver seccion 3)

---

# 5. Auditoria UI estructural

> Auditor: frontend-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

La codebase de UI es saludable en lo estructural. Los fixes del ciclo anterior estan verificados (navegacion por historial, tamanos dinamicos, memoizacion de GradientText, errores visibles, claves React estables). Los riesgos residuales son principalmente deuda tecnica: `COLORS.ts` sin importaciones (189 literales hex inline) y `ProfilesView` con 7 modos sin descomposicion.

## Hallazgos de UI

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 0 |
| Media | 2 |
| Baja | 7 |

**Total hallazgos: 9**

### Hallazgos principales

- **FE-02 (Media)** — `ProfilesView` con 267 lineas y 7 modos inline (FSM) sin descomposicion en subcomponentes.
- **FE-13 (Media)** — `COLORS.ts` creado como fix de v0.1.0 pero con 0 importaciones; 189 literales hex inline permanecen en los archivos de vistas.
- **FE-09 (Baja)** — Clave composite en `ProgressLog` puede causar parpadeo.
- **FE-11 (Baja)** — `Task {}` anonimos en botones de BrewBar sin handle de cancelacion.
- **FE-12 (Baja)** — `.onAppear` en `DoctorView` sin cleanup de fetch async.

---

# 6. UX funcional

> Auditor: ux-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 presenta una arquitectura de flujos coherente y bien estructurada, con patrones consistentes de loading/error, confirmaciones en acciones destructivas masivas, y navegacion global predecible. Los hallazgos UX son menores y no bloquean la experiencia principal. La calidad UX general es alta para una herramienta TUI/menubar.

## Hallazgos UX clave (cross-referenciados con otros dominios)

- `AccountView.deactivate()` silencia el error — el usuario queda en estado ambiguo (ver SCR-007, Alta)
- `ProfilesView` muestra importacion masiva sin indicar el numero de paquetes (ver SCR-005, Alta)
- `HistoryView` replay de `upgrade-all` puede actualizar mas paquetes que el original (ver SCR-006, Alta)
- `start` de servicio ejecuta sin confirmacion; asimetrico respecto a `stop`/`restart` (Baja)
- Sin onboarding para nuevos usuarios TUI (Baja)

---

# 7. Design system

> Auditor: design-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

`src/utils/colors.ts` introduce tokens de color pero no esta importado en ningun modulo: los 253 literales hex hardcodeados siguen dispersos en 26 archivos. No existen tokens de espaciado, radios ni motion. BrewBar presenta ausencia total de adaptaciones de accesibilidad del sistema (Dynamic Type bloqueado, sin Reduce Motion, sin Increase Contrast, sin Bold Text). Varios botones icono carecen de etiqueta accesible.

## Hallazgos de Design System

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 1 |
| Media | 4 |
| Baja | 0 |

**Total hallazgos: 5**

### Hallazgos principales

- **DS-001 (Alta)** — `COLORS` definido pero con 0 importaciones; 253 literales hex en 26 archivos.
- **DS-002 (Media)** — Patron de banner exito/error duplicado 14+ veces sin componente `ResultBanner`.
- **DS-003 (Media)** — Sin tokens de espaciado; 114 magic numbers en 21 archivos.
- **DS-004 (Media)** — Patron de fila cursor+texto sin componente `SelectableRow` repetido en 6 vistas.
- **DS-005 (Media)** — Contraste insuficiente: `#6B7280` sobre fondo negro da ~3.5:1, por debajo de WCAG AA 4.5:1.

---

# 8. Accesibilidad

> Auditor: design-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

BrewBar tiene brechas de accesibilidad inaceptables para distribucion publica: cuatro botones icono sin `.accessibilityLabel` (inaccesibles para VoiceOver y Voice Control), y Dynamic Type bloqueado por frame fijo `340x420`. Las vistas TUI tienen limitaciones estructurales inherentes al renderer Ink, pero la diferenciacion por color puro en `VersionArrow` y el contraste insuficiente de `#6B7280` son correcciones aplicables.

## Hallazgos de Accesibilidad

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 2 |
| Media | 3 |
| Baja | 3 |

**Total hallazgos: 8**

### Hallazgos principales

- **ACC-001 (Alta)** — Cuatro botones solo-icono en BrewBar sin `.accessibilityLabel`: Refresh, Settings, Quit, upgrade por paquete.
- **ACC-002 (Alta)** — Frame fijo `340x420` bloquea Dynamic Type; `.font(.system(size: 40))` es tamano absoluto.
- **ACC-005 (Media)** — `VersionArrow` diferencia versiones solo por color (rojo vs teal) sin indicador alternativo.
- **ACC-003/ACC-004 (Media)** — Sin soporte a Bold Text ni Increase Contrast en BrewBar.

---

# 11. Backend funcional

> Auditor: backend-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 no dispone de backend propio. La capa de red del cliente esta bien estructurada con timeouts universales y HTTPS obligatorio. La persistencia local usa AES-256-GCM, permisos 0o600/0o700 y escrituras atomicas en la mayoria de modulos. La clave de derivacion del cifrado esta embebida en el codigo fuente, lo que es la principal limitacion arquitectonica de seguridad.

## Hallazgos de Backend

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 1 |
| Media | 3 |
| Baja | 3 |

**Total hallazgos: 7**

### Hallazgos principales

- **BK-001 (Alta)** — Clave AES-256-GCM embebida en `license-manager.ts:61-62` y `LicenseChecker.swift:47`.
- **BK-002 (Media)** — `saveProfile` no atomica: usa `writeFile` directo sin patron tmp+rename.
- **BK-003 (Media)** — `loadLicense`: `JSON.parse(...) as LicenseData` sin type guard.
- **BK-004 (Media)** — Sin lock de archivo para escrituras concurrentes en `history.json`/`profiles/`.
- **BK-005 (Baja)** — Licencia almacenada en `~/.brew-tui/license.json` sin usar Keychain macOS.

---

# 12. Persistencia y sincronizacion

> (Incluido en el reporte de backend — ver seccion 11)

---

# 13. Seguridad y privacidad

> Auditor: security-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 presenta una postura de seguridad solida para un producto CLI/TUI en fase temprana: no se detectaron secretos de API reales hardcodeados, los datos de licencia se almacenan cifrados, las llamadas de red usan timeouts y HTTPS exclusivamente. Los tres riesgos residuales de mayor impacto son: (1) la verificacion SHA-256 de BrewBar que es codigo muerto en produccion, (2) la falta de firma y notarizacion en BrewBar.app, y (3) la clave AES hardcodeada.

## Hallazgos de Seguridad

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 2 |
| Media | 1 |
| Baja | 4 |

**Total hallazgos: 7**

### Hallazgos principales

- **SEG-001 (Alta)** — Verificacion SHA-256 de BrewBar es codigo muerto: el archivo `.sha256` nunca se genera en CI; el instalador recibe un 404 que el `catch` descarta; la comparacion en la linea 68 jamas ha ejecutado en produccion.
- **SEG-002 (Alta)** — Clave AES-256-GCM embebida en codigo fuente TypeScript y binario Swift; derivable trivialmente por cualquier usuario con acceso al bundle npm.
- **SEG-003 (Media)** — Watermark invisible con email del usuario en perfiles exportados via Unicode de ancho cero sin consentimiento explicito.
- **SEG-004 (Baja)** — `hostname()` del equipo transmitido a Polar.sh como campo `label` sin informar al usuario.
- **SEG-005 (Baja)** — `softprops/action-gh-release@v2` sin pin por hash SHA en el workflow.

---

# 14. Testing y calidad / 15. Observabilidad y analitica

> Auditor: quality-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 ya no esta en 0 tests: incorpora una base minima con 3 archivos / 8 tests Vitest para parsers, deduplicacion de brew-store y revalidacion del license-store. Sin embargo, la cobertura sigue siendo critica: la funcion `getDegradationLevel` (que controla el acceso offline Pro) no tiene ningun test, el gate de CI pasa en vacio con exit 0, y BrewBar continua sin target XCTest. La observabilidad es inexistente: ni crash reporting, ni analytics, ni logging estructurado.

## Hallazgos de Testing / Observabilidad

| Severidad | Cantidad |
|-----------|----------|
| Critica | 3 |
| Alta | 10 |
| Media | 5 |
| Baja | 5 |

**Total hallazgos: 23**

### Hallazgos criticos

- **QA-001 (Critica)** — `npm run test` pasa en vacio con exit 0; gate de CI es false-green.
- **QA-002 (Critica)** — `getDegradationLevel` sin tests; funcion que controla acceso offline Pro.
- **QA-003 (Critica)** — Flujo completo de licencia sin test end-to-end.

### Hallazgos Altos principales

- Rate limiting (`checkRateLimit`) sin tests
- `validateProfileName` sin tests (path traversal prevention)
- AES-256-GCM round-trip sin test
- `polar-api.ts` sin mock de red
- Fallback HTTP 400 de OSV one-by-one sin test
- `ink-testing-library` instalada sin uso
- Sin crash reporting en TypeScript ni en BrewBar
- Sin logging estructurado en TypeScript (22 `console.*` sin metadatos)
- Swift sin logging absolutamente (0 llamadas a `Logger`/`OSLog`)

---

# 16. Rendimiento

> Auditor: performance-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 incorpora mejoras significativas: lazy initialization de clave de cifrado, renderizado con ventana deslizante en todas las vistas de lista, paralelismo `async let` en BrewBar, memoizacion de GradientText, y `fetchWithTimeout` en todas las llamadas de red. Los principales problemas pendientes son el bucle de polling en `streamBrew` (100ms), la ausencia de cache de resultados de OSV.dev, y la ausencia de timeout en `execBrew`.

## Hallazgos de Rendimiento (cross-referenciados en dominios EP y ARQ)

| Zona | Hallazgo | Severidad |
|------|----------|-----------|
| `streamBrew()` | Polling de 100ms en lugar de eventos | Media (EP-012) |
| `security-store.ts` | Sin cache; re-scan en cada montaje | Media (ARQ-005) |
| `cleanup-store.ts` | Re-analiza en cada montaje | Media |
| `audit-runner.ts` | O(n*m) lookup con `packages.find()` en bucle | Baja |
| `execBrew()` | Sin timeout; TUI puede quedar irresponsiva | Media (EP-012) |

---

# 17. Localizacion / 18. Release readiness

> Auditor: release-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

El sistema de i18n del TUI es robusto y exhaustivo: 281 claves tipadas, cobertura completa en en/es, verificacion en tiempo de compilacion. BrewBar tiene el catalogo alineado con las cadenas actuales. El hallazgo critico de release es que BrewBar.app se distribuye sin firma Developer ID ni notarizacion, haciendo el producto inusable para todos los usuarios que lo descarguen.

## Hallazgos de Release

| Severidad | Cantidad |
|-----------|----------|
| Critica | 1 |
| Alta | 2 |
| Media | 0 |
| Baja | 4 |

**Total hallazgos: 7**

### Hallazgos principales

- **REL-001 (Critica)** — BrewBar.app sin firma Developer ID ni notarizacion; macOS Gatekeeper bloquea el lanzamiento en todos los usuarios por defecto.
- **REL-002 (Alta)** — `xcodebuild build` en lugar de `xcodebuild archive`; sin `.xcarchive` ni `exportOptions.plist`.
- **REL-003 (Alta)** — Cobertura de tests insuficiente para release; flujos criticos sin cobertura.
- **REL-003/REL-004 (Baja)** — Cuatro cadenas stale en `Localizable.xcstrings`; `CURRENT_PROJECT_VERSION` ausente.

---

# 19. Auditoria por pantalla

> Auditor: screen-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

* **Total pantallas auditadas:** 15 (12 vistas TUI TypeScript + 3 vistas SwiftUI BrewBar)
* **Cobertura media:** 46% (promedio de items cubiertos por pantalla sobre 12 criterios)
* **Pantallas con hallazgos criticos:** 1 (SmartCleanupView)
* **Hallazgos totales (por pantallas):** 60 en el reporte de pantallas; consolidados en el registro central

## Estadisticas por categoria

| Categoria | Pantallas que cumplen | % Cumplimiento |
|-----------|-----------------------|----------------|
| Estado inicial | 13 de 15 | 87% |
| Cargando | 13 de 15 | 87% |
| Error | 12 de 15 | 80% |
| Offline | 0 de 15 | 0% |
| Accesibilidad | 3 de 15 | 20% |
| Instrumentacion analitica | 0 de 15 | 0% |
| Rendimiento | 13 de 15 | 87% |

## Hallazgos por pantalla (consolidados en registro central)

| ID | Pantalla | Hallazgo | Severidad |
|----|----------|----------|-----------|
| SCR-001 | SmartCleanupView | Deteccion de huerfanos puede incluir herramientas del sistema sin advertencia | Critica |
| SCR-002 | InstalledView | Cabeceras de columna hardcodeadas en ingles | Alta |
| SCR-003 | SearchView | Fallback de error hardcodeado en ingles | Alta |
| SCR-004 | ProfilesView | Error de `fetchProfiles()` no visible en modo lista | Alta |
| SCR-005 | ProfilesView | Importacion masiva sin mostrar conteo de paquetes | Alta |
| SCR-006 | HistoryView | Replay de `upgrade-all` puede actualizar mas paquetes que el original | Alta |
| SCR-007 | AccountView | Fallo en `deactivate()` es silencioso | Alta |
| SCR-008 | PackageInfoView | Solo soporta formulas; casks muestran "Not found" | Alta |
| SCR-009 | Todas (15/15) | Sin instrumentacion analitica | Alta |
| SCR-010 | Todas TUI (12/12) | Sin manejo de escenario offline | Media |
| SCR-011 | Todas TUI | Colores hex hardcodeados ilegibles en terminales de tema claro | Media |
| SCR-012 | OutdatedView | Upgrade masivo sin mostrar lista de paquetes afectados | Media |
| SCR-013 | DoctorView | Flash de estado vacio por `loading.doctor` no pre-inicializado | Media |
| SCR-014 | ServicesView | Error de `service-action` se resetea antes de que el usuario lo lea | Media |
| SCR-015 | PopoverView | `.font(.system(size: 40))` no escala con Dynamic Type | Media |
| SCR-016 | SettingsView BrewBar | Fallo en `SMAppService` revierte toggle silenciosamente | Media |
| SCR-017 | SecurityAuditView | Sin mensaje diferenciado para error OSV.dev vs error local | Media |
| SCR-018 | DashboardView | Sin adaptacion al ancho del terminal; StatCards pueden solaparse | Baja |
| SCR-019 | AccountView | Sin atajo de teclado numerico; solo accesible via Tab | Baja |

---

# 20. Auditoria por endpoint

> Auditor: endpoint-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 no dispone de backend propio. La superficie de endpoints se compone de cuatro capas: tres integraciones HTTP con servicios externos (Polar.sh, OSV.dev, GitHub Releases) y una capa de subprocesos para invocar la CLI de Homebrew. Se auditaron 9 call sites discretos.

El mayor riesgo transversal es la ausencia de validacion de respuesta en tiempo de ejecucion: todas las respuestas HTTP se castean con `as T` sin comprobar que los campos requeridos existan. El segundo riesgo es que la verificacion SHA-256 de BrewBar es codigo muerto en produccion.

## Estadisticas por categoria

| Categoria | Cumple | % Cumplimiento |
|-----------|--------|----------------|
| Contrato correcto | 5 de 9 | 56% |
| Validacion correcta | 1 de 9 | 11% |
| Auth correcta | 9 de 9 | 100% |
| Errores correctos | 7 de 9 | 78% |
| Timeouts correctos | 6 de 9 | 67% |
| Rate limiting / retries | 2 de 9 | 22% |

## Hallazgos por endpoint (consolidados en registro central)

| ID | Endpoint | Hallazgo | Severidad |
|----|----------|----------|-----------|
| EP-001 | Polar — activacion | `res.json() as PolarActivation` sin validacion | Alta |
| EP-002 | Polar — validacion | `res.json() as PolarValidated` sin validacion | Alta |
| EP-003 | OSV batch | `OsvBatchResponse` sin validacion de tipos | Alta |
| EP-004 | OSV one-by-one | `catch {}` vacio descarta errores HTTP 5xx | Alta |
| EP-005 | Instalador BrewBar | Limite de 200 MB inefectivo sin `Content-Length` | Alta |
| EP-006 | Polar — validacion | `catch` en `revalidate()` agrupa errores de red y contrato | Media |
| EP-007 | OSV batch | Versiones vacias incluidas en queries sin validacion | Media |
| EP-008 | OSV one-by-one | Loop secuencial sin delay puede exceder rate limits | Media |
| EP-009 | Instalador | Non-null assertion puede producir `"undefined"` como expected hash | Media |
| EP-010 | Instalador | Sin validacion del formato del hash extraido | Media |
| EP-011 | brew CLI | `name` pasa a `spawn` sin validacion; `--force` seria flag | Media |
| EP-012 | brew CLI | Sin timeout en `execBrew` y `streamBrew` | Media |
| EP-013 | Instalador | Dos instancias comparten `/tmp/BrewBar.app.zip` | Baja |

---

# 21. Registro central de hallazgos

> Auditor: report-consolidator | Fecha: 2026-04-23

## Resumen

* **Total hallazgos:** 86
* **Criticos:** 4
* **Altos:** 21
* **Medios:** 36
* **Bajos:** 25
* **Reportes analizados:** 14 de 14
* **Reportes faltantes:** Ninguno

## Registro completo

| ID | Dominio | Subzona | Hallazgo | Severidad | Impacto | Evidencia | Accion | Estado |
|----|---------|---------|----------|-----------|---------|-----------|--------|--------|
| QA-001 | Testing | Calidad de suite | `npm run test` pasa en vacio con exit 0 — gate de CI false-green | Critica | Un release puede publicarse sin ningun test ejecutado | `.github/workflows/release.yml:25` | Configurar vitest con `--passWithNoTests false` | Pendiente |
| QA-002 | Testing | Unit tests | `getDegradationLevel` sin tests — funcion critica que controla acceso offline Pro (0-7d, 7-14d, 14-30d, 30+d) | Critica | Modelo freemium puede comportarse incorrectamente sin deteccion | `license-manager.ts:179` | Cubrir todos los rangos con tests de fecha inyectada | Pendiente |
| QA-003 | Testing | Integration | Flujo completo de licencia sin test end-to-end | Critica | Regresion silenciosa en cualquier paso del flujo de licencia | `src/lib/license/` | Crear test de integracion con filesystem temporal | Pendiente |
| REL-001 | Release | Firma y notarizacion | BrewBar.app distribuido sin firma Developer ID ni notarizacion — Gatekeeper bloquea el lanzamiento | Critica | El producto es inusable para todos los usuarios que descarguen BrewBar | `release.yml:62-66` | Obtener Apple Developer Program; agregar firma y notarizacion en CI | Pendiente |
| SEG-001 | Seguridad | SHA-256 / distribucion | Verificacion SHA-256 de BrewBar es codigo muerto — `.sha256` nunca generado; instalador recibe 404 que el `catch` descarta | Alta | Binario sustituido se instala sin verificacion de integridad | `release.yml` no genera `.sha256`; `brewbar-installer.ts:63,73,78` | Agregar generacion de hash en CI; corregir el `catch` | Pendiente |
| SEG-002 | Seguridad | Autenticacion / licencias | Clave AES-256-GCM embebida en codigo fuente TypeScript y en binario Swift | Alta | Bypass del modelo freemium por cualquier usuario con acceso al bundle | `license-manager.ts:61-62`; `LicenseChecker.swift:47` | Documentar como riesgo conocido; incorporar UUID de maquina en derivacion | Pendiente |
| ARQ-001 | Arquitectura | Separacion de capas | Cinco modulos de `lib/` importan `useLicenseStore` directamente, invirtiendo la jerarquia | Alta | Acoplamiento circular; impide testing unitario en aislamiento | `history-logger.ts:5`, `audit-runner.ts:3`, `cleanup-analyzer.ts:6`, `profile-manager.ts:9`, `brewbar-installer.ts:9` | Refactorizar para recibir `{ license, status }` como parametros | Pendiente |
| DS-001 | Design System | Tokens de color | `COLORS.ts` con 0 importaciones — 253 literales hex en 26 archivos sin cambio | Alta | Imposible cambiar la paleta sin editar decenas de archivos | `src/utils/colors.ts` — 0 importaciones; 253 ocurrencias hex | Importar `COLORS` y reemplazar hex inline por tokens | Pendiente |
| ACC-001 | Accesibilidad | BrewBar — botones icono | Cuatro botones solo-icono en BrewBar sin `.accessibilityLabel` | Alta | Usuarios con discapacidad visual no pueden usar estas funciones | `PopoverView.swift:57-61,161-164,167-170`; `OutdatedListView.swift:74-79` | Agregar `.accessibilityLabel` o usar `Label` con `.labelStyle(.iconOnly)` | Pendiente |
| ACC-002 | Accesibilidad | BrewBar — Dynamic Type | Frame fijo `340x420` bloquea Dynamic Type; `.font(.system(size: 40))` no escala | Alta | Texto truncado para usuarios con texto grande en Accesibilidad | `PopoverView.swift:32` (frame); `PopoverView.swift:100` (size 40) | Cambiar a frame dinamico; reemplazar `size: 40` por `.font(.largeTitle)` | Pendiente |
| QA-004 | Testing | Unit tests | Rate limiting sin tests — 5 intentos deben provocar lockout de 15 min | Alta | Mecanismo de proteccion contra fuerza bruta podria estar roto | `license-manager.ts:29-58` | Verificar lockout tras MAX_ATTEMPTS | Pendiente |
| QA-005 | Testing | Unit tests | `validateProfileName` sin tests — path traversal prevention sin cobertura | Alta | Vulnerabilidad de path traversal sin deteccion | `profile-manager.ts:25-35` | Cubrir: nombre vacio, longitud, caracteres especiales, `../` | Pendiente |
| QA-006 | Testing | Integration | AES-256-GCM round-trip sin test | Alta | Regresion en cifrado romperia acceso Pro sin deteccion | `license-manager.ts:73-103` | Test que encripte y desencripte verificando integridad del GCM tag | Pendiente |
| QA-007 | Testing | Integration | `polar-api.ts` sin mock de red | Alta | Cambios en contrato de Polar.sh pasan desapercibidos | `src/lib/license/polar-api.ts` | Usar `vi.mock` o MSW para simular respuestas | Pendiente |
| QA-008 | Testing | Integration | Fallback HTTP 400 de OSV one-by-one sin test | Alta | El fallback podria estar roto sin deteccion | `osv-api.ts:72-77` | Test que simule HTTP 400 y verifique activacion del fallback | Pendiente |
| QA-009 | Testing | UI tests | `ink-testing-library` instalada sin uso | Alta | Componentes criticos sin cobertura de regresion | `package.json devDependencies` — sin ningun test que la importe | Crear tests de renderizado para componentes criticos | Pendiente |
| QA-010 | Testing | UI tests | Flujo de activacion de licencia sin test de UI | Alta | Regresion en pantalla de activacion no detectable | `src/views/account.tsx` | Crear test con `ink-testing-library` | Pendiente |
| QA-011 | Observabilidad | Logging | Sin logging estructurado en TypeScript — 22 `console.*` sin metadatos | Alta | Imposible diagnosticar errores en produccion | 22 `console.*` en `src/` | Adoptar `pino` o wrapper `logger.ts` con niveles | Pendiente |
| QA-012 | Observabilidad | Logging | Swift sin logging — 0 llamadas a `Logger`/`OSLog` en los 12 archivos | Alta | Fallos silenciosos en BrewChecker, SchedulerService, LicenseChecker | 0 llamadas en `menubar/BrewBar/Sources/` | Integrar `os.Logger` con subsistema `com.molinesdesigns.brewbar` | Pendiente |
| QA-013 | Observabilidad | Crash reporting | Sin crash reporting en TypeScript ni en BrewBar | Alta | Imposible conocer la tasa de crashes en produccion | Sin `@sentry/node` ni equivalente | Integrar `@sentry/node` y Sentry Swift; configurar carga de dSYM | Pendiente |
| EP-001 | Endpoints | Polar — activacion | `res.json() as PolarActivation` sin validacion — `activation.id` puede ser `undefined` | Alta | Licencia con `instanceId: undefined`; revalidaciones rotas | `polar-api.ts:66` | Agregar `assertPolarActivation(obj)` | Pendiente |
| EP-002 | Endpoints | Polar — validacion | `res.json() as PolarValidated` sin validacion — `res.status` puede ser `undefined` | Alta | Usuarios Pro pierden acceso sin notificacion de error | `polar-api.ts:66,114-115` | Agregar `assertPolarValidated(obj)` | Pendiente |
| EP-003 | Endpoints | OSV batch | `OsvBatchResponse` sin validacion — `data.results` puede no ser array | Alta | Paquetes vulnerables no aparecen en auditoria sin indicacion de fallo | `osv-api.ts:79-83` | Verificar `Array.isArray(data.results)` | Pendiente |
| EP-004 | Endpoints | OSV one-by-one | `catch {}` vacio descarta errores HTTP 5xx — falso negativo de seguridad | Alta | Paquetes afectados aparecen como "sin vulnerabilidades" | `osv-api.ts:113-115` | Solo omitir en HTTP 400; propagar errores 5xx o de red | Pendiente |
| EP-005 | Endpoints | Instalador BrewBar | Limite de 200 MB inefectivo si servidor omite `Content-Length` | Alta | Binario malicioso de tamano ilimitado podria descargarse | `brewbar-installer.ts:62-63` | Implementar contador de bytes que aborte si supera el limite | Pendiente |
| REL-002 | Release | CI/CD | `xcodebuild build` en lugar de `archive` — sin `.xcarchive` ni `exportOptions.plist` | Alta | Artefacto no reproducible ni rastreable | `release.yml:62-66` | Cambiar a `xcodebuild archive` + `xcodebuild -exportArchive` | Pendiente |
| REL-003 | Release | Cobertura de tests | Cobertura insuficiente para release — flujos criticos sin cobertura | Alta | Release puede introducir regresiones sin deteccion | `npm test` ejecuta 3 archivos / 8 tests | Ampliar cobertura con tests para `license-manager.ts`, `feature-gate.ts`, `brewbar-installer.ts` | Pendiente |
| BK-001 | Backend | Autenticacion | Clave de cifrado embebida en codigo fuente (cross-ref SEG-002) | Alta | Bypass de licencias por cualquier usuario con acceso al bundle | `license-manager.ts:61-62`; `LicenseChecker.swift:47` | Ver SEG-002 | Pendiente |
| SCR-001 | Pantallas | SmartCleanupView | Deteccion de huerfanos puede incluir herramientas del sistema sin advertencia | Critica | El usuario podria desinstalar herramientas esenciales; operacion irreversible | `smart-cleanup.tsx:55,99,128-129` | Agregar advertencia y confirmacion de dos pasos | Pendiente |
| SCR-002 | Pantallas | InstalledView | Cabeceras `'Package'`, `'Version'`, `'Status'` hardcodeadas en ingles | Alta | Usuarios con locale espanol ven cabeceras en ingles | `installed.tsx:187-189` | Agregar claves i18n y usar `t()` | Pendiente |
| SCR-003 | Pantallas | SearchView | Fallback de error `'Search failed'` hardcodeado en ingles | Alta | Mensaje de error en ingles para usuarios con locale espanol | `search.tsx:52` | Reemplazar con `t('search_failed')` | Pendiente |
| SCR-004 | Pantallas | ProfilesView | Error de `fetchProfiles()` no visible en modo lista | Alta | Vista aparece vacia sin explicacion cuando la carga falla | `profiles.tsx:116-117` | Agregar `{loadError && <ErrorMessage message={loadError} />}` | Pendiente |
| SCR-005 | Pantallas | ProfilesView | Importacion masiva sin indicar numero de paquetes | Alta | El usuario no puede hacer decision informada | `profiles.tsx:66-70` | Mostrar resumen (N formulae, M casks) antes de iniciar | Pendiente |
| SCR-006 | Pantallas | HistoryView | Replay de `upgrade-all` puede actualizar mas paquetes que el original | Alta | El usuario podria actualizar paquetes inesperados | `history.tsx:144-146` | Mostrar en dialogo que "upgrade-all" actualizara todos los desactualizados al momento | Pendiente |
| SCR-007 | Pantallas | AccountView | Fallo en `deactivate()` es silencioso — sin rama `catch` | Alta | El usuario no sabe si la desactivacion fallo | `account.tsx:41-49` | Agregar `catch(err)` con `setDeactivateError(...)` | Pendiente |
| SCR-008 | Pantallas | PackageInfoView | Solo soporta formulas; casks muestran "Not found" sin explicacion | Alta | Funcionalidad bloqueada silenciosamente | `package-info.tsx:48` | Detectar si el nombre es cask y llamar al endpoint correcto | Pendiente |
| SCR-009 | Pantallas | Todas (15/15) | Sin instrumentacion analitica en ninguna vista | Alta | Imposible medir engagement ni funnel de conversion | 0 referencias a tracking en todas las vistas | Integrar telemetria ligera con opt-in | Pendiente |
| ARQ-002 | Arquitectura | Concurrencia | `_revalidating` flag booleano no atomico | Media | Dos revalidaciones concurrentes podrian producir estado inconsistente | `license-store.ts:12,58,79` | Reemplazar flag por `Promise` como mutex real | Pendiente |
| ARQ-003 | Arquitectura | Flujo de datos | `brewUpdate().catch(() => {})` descarta errores silenciosamente | Media | El usuario trabaja con indices desactualizados sin saberlo | `brew-store.ts:147` | Capturar error en el store | Pendiente |
| ARQ-004 | Arquitectura | Cache | `lastFetchedAt` existe pero nunca se usa | Media | El usuario no sabe si los datos son recientes | `brew-store.ts:17,40,57` | Leer `lastFetchedAt` en vistas para mostrar timestamp | Pendiente |
| ARQ-005 | Arquitectura | Cache | Sin cache de resultados de OSV.dev | Media | Latencia elevada y consumo innecesario de API | `security-store.ts` | Introducir cache con TTL de 15-60 min | Pendiente |
| ARQ-006 | Arquitectura | Concurrencia | Tasks fire-and-forget en botones SwiftUI sin handle | Media | Tasks sin cancelacion si el popover se cierra | `PopoverView.swift:57,88`; `OutdatedListView.swift:26,75` | Almacenar Task handles en `@State`; cancelar en `.onDisappear` | Pendiente |
| ARQ-007 | Arquitectura | Concurrencia | `DispatchQueue.global()` mezclado con Swift concurrency; `OnceGuard` es `@unchecked Sendable` | Media | Mezcla GCD/async fragil | `BrewChecker.swift:78,27` | Reemplazar con structured concurrency | Pendiente |
| ARQ-008 | Arquitectura | Capas | `outdated.tsx` importa `execBrew()` directamente | Media | Operacion invisible al store y al historial Pro | `outdated.tsx:5` | Crear `pinPackage(name)`/`unpinPackage(name)` en `brew-api.ts` | Pendiente |
| BK-002 | Backend | Persistencia | `saveProfile` no atomica — `writeFile` directo sin tmp+rename | Media | Corrupcion del archivo en corte de energia | `profile-manager.ts:78` | Patron `writeFile(tmpPath) + rename` | Pendiente |
| BK-003 | Backend | Validacion | Cast sin validacion en `loadLicense` | Media | Archivo corrompido puede producir comportamiento inesperado | `license-manager.ts:103` | Agregar type guard `isLicenseData(obj)` | Pendiente |
| BK-004 | Backend | Sincronizacion | Sin proteccion contra escrituras concurrentes para `history.json`/`profiles/` | Media | Dos instancias pueden corromper datos | `history-logger.ts`, `profile-manager.ts` | Agregar lock de archivo | Pendiente |
| BK-005 | Backend | Persistencia | Licencia en `~/.brew-tui/license.json` sin usar Keychain | Media | Si permisos incorrectos, la licencia queda expuesta | Sin referencia a `SecItem` en el proyecto | Considerar almacenar la license key en Keychain | Pendiente |
| SEG-003 | Seguridad | Privacidad | Watermark con email del usuario via Unicode de ancho cero sin consentimiento | Media | Violacion de privacidad — email transmitido a terceros sin conocimiento | `watermark.ts:25-38`; `profile-manager.ts:111` | Notificar antes de exportar; ofrecer exportacion sin watermark | Pendiente |
| DS-002 | Design System | Componentes | Patron de banner exito/error duplicado 14+ veces | Media | Inconsistencias visuales; mantenimiento costoso | Repetido en 8+ vistas | Extraer `<ResultBanner status="success|error" message={...} />` | Pendiente |
| DS-003 | Design System | Tokens | Sin tokens de espaciado — 114 magic numbers en 21 archivos | Media | Inconsistencias de espaciado sin ajuste global | 114 ocurrencias en 21 archivos | Crear `src/utils/spacing.ts` | Pendiente |
| DS-004 | Design System | Componentes | Patron de fila cursor+texto repetido en 6 vistas | Media | Cursor y colores inconsistentes entre vistas | Patron repetido en 6 vistas | Extraer `<SelectableRow isCurrent={bool} label={string} />` | Pendiente |
| DS-005 | Design System | Calidad visual | Contraste insuficiente: `#6B7280` da ~3.5:1 bajo fondo negro | Media | Texto secundario ilegible para usuarios con baja vision | Usado en texto secundario y hints | Reemplazar por gris con ratio >= 4.5:1 | Pendiente |
| ACC-003 | Accesibilidad | BrewBar — adaptaciones | Sin soporte a Bold Text | Media | Usuarios con Bold Text no ven efecto en BrewBar | Sin uso de `@Environment(\.legibilityWeight)` | Evaluar textos que deberian reforzar su peso | Pendiente |
| ACC-004 | Accesibilidad | BrewBar — adaptaciones | Sin soporte a Increase Contrast | Media | Usuarios con alto contraste no obtienen beneficio | Sin uso de `@Environment(\.colorSchemeContrast)` | Agregar variantes de color de alto contraste | Pendiente |
| ACC-005 | Accesibilidad | TUI — color | `VersionArrow` diferencia versiones solo por color | Media | Usuarios con daltonismo no pueden distinguir versiones | `version-arrow.tsx` | Agregar etiquetas textuales o simbolos contextuales | Pendiente |
| QA-014 | Testing | Unit tests | Parsers cubiertos solo parcialmente | Media | Regresiones en parsing no detectadas | `parsers.test.ts` — faltan `parseInstalledJson`, `parseOutdatedJson` | Completar cobertura con fixtures reales | Pendiente |
| QA-015 | Testing | Unit tests | Funciones canary sin tests | Media | Regresion podria abrir acceso Pro sin licencia | `src/lib/license/canary.ts` | Verificar que canaries retornan `false` | Pendiente |
| QA-016 | Testing | Crash/diagnostic | Sourcemaps deshabilitados en produccion | Media | Stack traces ininterpretables | `tsup.config.ts:13` — `sourcemap: false` | Habilitar sourcemaps o mantenerlos en S3 | Pendiente |
| QA-017 | Testing | Crash/diagnostic | dSYM no preservado en CI | Media | Crashes de BrewBar imposibles de diagnosticar | `release.yml:60-76` | Incluir dSYM en artifact | Pendiente |
| QA-018 | Observabilidad | Analytics | Sin analytics en TUI ni en BrewBar | Media | Funnel de conversion free→Pro invisible | 0 referencias a tracking en ambas codebases | Integrar analytics con opt-in | Pendiente |
| QA-019 | Testing | UI tests | BrewBar sin target XCTest/XCUITest | Media | Las 3 vistas SwiftUI y 3 servicios sin cobertura | `menubar/Project.swift` — 0 targets de test | Anadir target de tests y smoke test | Pendiente |
| QA-020 | Testing | UI tests | `ConfirmDialog` sin test de aceptacion/rechazo | Media | Regresion podria permitir acciones destructivas sin confirmacion | `confirm-dialog.tsx` | Testear con `y`/`Y` (en) y `s`/`S` (es) | Pendiente |
| EP-006 | Endpoints | Polar — validacion | `catch` en `revalidate()` agrupa errores de red y contrato | Media | Bugs de integracion quedan ocultos en grace period | `license-manager.ts:261` | Separar errores de red de errores de validacion | Pendiente |
| EP-007 | Endpoints | OSV batch | Versiones vacias en queries sin validacion | Media | Fallback one-by-one innecesario; resultados incorrectos | `osv-api.ts:129-132` | Filtrar paquetes con `version` vacia | Pendiente |
| EP-008 | Endpoints | OSV one-by-one | Loop secuencial sin delay puede exceder rate limits | Media | Escaneos de seguridad podrian fallar sin explicacion | `osv-api.ts:106-118` | Agregar delay de 50-100ms y manejo de HTTP 429 | Pendiente |
| EP-009 | Endpoints | Instalador | Non-null assertion puede producir `"undefined"` como expected hash | Media | Verificacion SHA-256 falla por error de parsing; fallo descartado | `brewbar-installer.ts:75` | Validar que split sea 64 caracteres hex | Pendiente |
| EP-010 | Endpoints | Instalador | Sin validacion del formato del hash extraido | Media | Archivo checksum malformado podria pasar la comparacion | `brewbar-installer.ts:75-78` | Agregar validacion `/^[0-9a-f]{64}$/i` | Pendiente |
| EP-011 | Endpoints | brew CLI | `name` pasa a `spawn` sin validacion — `--force` interpretado como flag | Media | Comportamiento inesperado con nombres de paquete especiales | `brew-api.ts:35-36,80-87,69,73` | Agregar validacion con `PKG_PATTERN` | Pendiente |
| EP-012 | Endpoints | brew CLI | Sin timeout en `execBrew` y `streamBrew` | Media | TUI queda irresponsiva sin cancelacion automatica | `brew-cli.ts:3-21,23-79` | Agregar `timeout: 30000` en `execFileAsync` | Pendiente |
| SCR-010 | Pantallas | Todas TUI (12/12) | Sin manejo de escenario offline | Media | El usuario no puede distinguir error de conectividad | `brew-cli.ts` — sin pattern matching para errores de red | Agregar deteccion de error de conectividad | Pendiente |
| SCR-011 | Pantallas | Todas TUI (12/12) | Colores hex hardcodeados ilegibles en terminales de tema claro | Media | Producto ilegible para usuarios con terminal de tema claro | `#F9FAFB` en multiples archivos de vistas | Definir paleta con variantes oscuro/claro | Pendiente |
| SCR-012 | Pantallas | OutdatedView | Upgrade masivo sin mostrar paquetes afectados | Media | El usuario puede actualizar paquetes no deseados | `outdated.tsx:61,121-123` | Mostrar lista completa en el dialogo de "Upgrade All" | Pendiente |
| SCR-013 | Pantallas | DoctorView | Flash de estado vacio — `loading.doctor` no pre-inicializado | Media | Frame con contenido vacio confunde al usuario | `brew-store.ts:61`; `doctor.tsx:19` | Pre-inicializar `loading: { ..., doctor: true }` | Pendiente |
| SCR-014 | Pantallas | ServicesView | Error de `service-action` se resetea en `finally` | Media | Usuario ve error que desaparece antes de poder leerlo | `services.tsx:57,47-48` | Mantener error hasta accion del usuario | Pendiente |
| SCR-015 | Pantallas | PopoverView | `.font(.system(size: 40))` no escala con Dynamic Type | Media | Texto truncado con tallas grandes (cross-ref ACC-002) | `PopoverView.swift:106` | Reemplazar por `.font(.system(.largeTitle))` | Pendiente |
| SCR-016 | Pantallas | SettingsView BrewBar | Fallo en `SMAppService` revierte toggle silenciosamente | Media | El usuario no sabe que el toggle de login al inicio fallo | `SettingsView.swift:55-63` | Agregar `@State var loginError: String?` | Pendiente |
| SCR-017 | Pantallas | SecurityAuditView | Sin mensaje diferenciado para error OSV.dev vs error local | Media | El usuario no puede saber si el problema es externo o local | `security-audit.tsx:58-59` | Categorizar el error en `useSecurityStore.scan()` | Pendiente |
| GOV-001 | Gobierno | Info.plist | `NSMainStoryboardFile = "Main"` heredado del template de Tuist | Media | Ruido en el Info.plist; confusion para desarrolladores | `Project.swift:30-35` | Sobrescribir con `"NSMainStoryboardFile": ""` | Pendiente |
| GOV-002 | Gobierno | Versioning | `CFBundleShortVersionString` no definido en `Project.swift` | Media | Bundle podria mostrar version incorrecta | `Project.swift:30-35` | Agregar `"CFBundleShortVersionString": "$(MARKETING_VERSION)"` | Pendiente |
| GOV-003 | Gobierno | Build settings | `SWIFT_STRICT_CONCURRENCY` no declarado explicitamente | Media | Cambio en defaults podria cambiar nivel sin notificacion | `Project.swift` | Agregar `"SWIFT_STRICT_CONCURRENCY": "complete"` | Pendiente |
| FE-001 | Frontend | Jerarquia de vistas | `ProfilesView` con 267 lineas y 7 modos inline sin descomposicion | Media | Archivo dificil de mantener; modos no testeables independientemente | `profiles.tsx` | Extraer subcomponentes por dominio | Pendiente |
| FE-002 | Frontend | Calidad de codigo | `COLORS.ts` sin importaciones — 189 literales hex inline (cross-ref DS-001) | Media | Ya cubierto por DS-001 | `src/utils/colors.ts` | Ver DS-001 | Pendiente |
| QA-021 | Observabilidad | Logging | `console.error` en `brew-store.ts` gateado por `NODE_ENV` — silencioso en produccion | Media | Errores de fetch invisibles en produccion | `brew-store.ts:121-123` | Loguear errores no criticos en produccion | Pendiente |
| GOV-004 | Gobierno | Secretos | `POLAR_ORGANIZATION_ID` embebido en `polar-api.ts` | Baja | Identificador publico expuesto; impacto bajo | `polar-api.ts:9` | Mover a constante de configuracion | Pendiente |
| GOV-005 | Gobierno | Build settings | ESLint con cobertura minimalista | Baja | Potenciales bugs sin deteccion | `eslint.config.js` | Activar `@typescript-eslint/recommended` | Pendiente |
| GOV-006 | Gobierno | Privacy | `PrivacyInfo.xcprivacy` pendiente de verificacion | Baja | Configuracion correcta pero no verificable sin Tuist | `Project.swift:37` | Ejecutar `tuist generate` y confirmar | Pendiente |
| GOV-007 | Gobierno | Privacy | Razon `CA92.1` posiblemente incorrecta en `PrivacyInfo.xcprivacy` | Baja | Razon correcta seria `1C8F.1` ("app functionality") | `PrivacyInfo.xcprivacy` | Cambiar razon a `1C8F.1` | Pendiente |
| ARQ-009 | Arquitectura | Deuda | `previousView` en navigation-store redundante con `viewHistory[-1]` | Baja | Posible inconsistencia de estado en navegacion | `navigation-store.ts:6,30` | Eliminar `previousView` y derivarlo de `viewHistory` | Pendiente |
| ARQ-010 | Arquitectura | Deuda | Patron `loading/error` repetido en cada vista sin abstraccion | Baja | Duplicacion de codigo; inconsistencias potenciales | Multiple views; `doctor.tsx:9` (TODO existente) | Crear `<AsyncView>` o hook `useViewState(key)` | Pendiente |
| ARQ-011 | Arquitectura | Deuda | `LemonSqueezyActivateResponse`/`ValidateResponse` en `lib/license/types.ts` | Baja | Naming obsoleto; confusion entre contratos externos y modelo interno | `src/lib/license/types.ts:24-49` | Mover a `polar-api.ts` y renombrar | Pendiente |
| ARQ-012 | Arquitectura | Deuda | Sin reintentos en `scan()` ni en fetches de brew | Baja | UX degradada en conexiones inestables | `src/lib/security/osv-api.ts` | Retry con backoff exponencial | Pendiente |
| FE-003 | Frontend | Renderizado | Clave composite en `ProgressLog` puede causar parpadeo | Baja | Parpadeo durante operaciones largas | `progress-log.tsx` | Usar indice global monotonicamente creciente | Pendiente |
| FE-004 | Frontend | Renderizado | `key={j}` en lineas de warning en `DoctorView` | Baja | Inconsistencia con patron del resto de la codebase | `doctor.tsx:40` | Usar clave derivada del contenido | Pendiente |
| FE-005 | Frontend | Ciclo de vida | `Task {}` anonimos en botones de BrewBar sin handle (cross-ref ARQ-006) | Baja | Tareas huerfanas si el popover se cierra | `OutdatedListView.swift` | Almacenar handle en `@State` | Pendiente |
| FE-006 | Frontend | Ciclo de vida | `.onAppear` en `DoctorView` sin cleanup del fetch async | Baja | Posible setState en componente desmontado | `doctor.tsx:13` | Aplicar patron `mountedRef` de `package-info.tsx` | Pendiente |
| FE-007 | Frontend | Calidad | Ausencia de previews/snapshots para vistas TUI | Baja | Sin validacion visual automatizada | `src/views/` — sin `#Preview` | Considerar snapshots con `ink-testing-library` | Pendiente |
| FE-008 | Frontend | Layout | BrewBar PopoverView frame fijo puede truncar texto (cross-ref ACC-002) | Baja | Texto truncado con tallas de fuente grandes | `PopoverView.swift` | Cambiar a `frame(minHeight: 320, maxHeight: 500)` | Pendiente |
| FE-009 | Frontend | Arquitectura | `app.tsx` mezcla inicializacion de licencia con routing | Baja | Legibilidad y testabilidad reducidas | `src/app.tsx:8` | Extraer `<LicenseInitializer>` y `<ViewRouter>` | Pendiente |
| SEG-004 | Seguridad | Privacy | `hostname()` transmitido a Polar.sh sin informar al usuario | Baja | Nombre del equipo llega al servidor sin consentimiento | `polar-api.ts:73` | Reemplazar con UUID anonimo | Pendiente |
| SEG-005 | Seguridad | Supply chain | `softprops/action-gh-release@v2` sin pin por hash SHA | Baja | Tag mutable expone el workflow | `release.yml:89` | Reemplazar con hash SHA inmutable | Pendiente |
| SEG-006 | Seguridad | Integridad | `checkBundleIntegrity()` falla-abierta en errores de lectura | Baja | Proteccion de integridad desactivada silenciosamente | `integrity.ts:37` | Cambiar a falla-cerrada con log | Pendiente |
| SEG-007 | Seguridad | Privacy | Sin mecanismo de eliminacion de datos del usuario | Baja | Requerido por App Store si se distribuyera ahi | Sin subcomando `delete-account` | Agregar `brew-tui delete-account` con confirmacion | Pendiente |
| QA-022 | Observabilidad | Metricas | Sin medicion de latencia de APIs externas | Baja | Imposible detectar degradacion en Polar.sh o OSV.dev | Sin instrumentacion en `fetchWithTimeout` | Anadir `Date.now()` antes/despues en modo debug | Pendiente |
| QA-023 | Observabilidad | Metricas | Fallos de SchedulerService silenciosos en produccion | Baja | Fallos del scheduler de BrewBar invisibles mas alla de la sesion | `AppState.swift:33-43` | Persistir ultimo error en `UserDefaults` con timestamp | Pendiente |
| SCR-018 | Pantallas | DashboardView | Sin adaptacion al ancho del terminal | Baja | Layout roto en terminales con menos de 60 columnas | `dashboard.tsx:49-62` | Usar `useStdout()` y adaptar numero de StatCards | Pendiente |
| SCR-019 | Pantallas | AccountView | Sin atajo de teclado numerico — solo accesible via Tab | Baja | Descubrimiento dificil de la vista de cuenta | `navigation-store.ts:14-17` | Documentar el atajo en el footer | Pendiente |
| EP-013 | Endpoints | Instalador | Dos instancias de `install-brewbar` comparten `/tmp/BrewBar.app.zip` | Baja | Pueden corromperse mutuamente | `brewbar-installer.ts:16` | Usar path temporal unico con `randomUUID()` | Pendiente |
| BK-006 | Backend | Persistencia | Sin migracion de schema — comentario `// Future: add migration logic here` | Baja | Un cambio de schema dejara datos de usuarios v1 ilegibles | `license-manager.ts:113`, `history-logger.ts:36`, `profile-manager.ts:65` | Disenar logica de migracion antes de cambio de schema | Pendiente |
| BK-007 | Backend | Persistencia | `saveProfile` sobreescribe silenciosamente perfiles existentes | Baja | El usuario puede perder datos de un perfil por sobreescritura | `profile-manager.ts:78` | Agregar comprobacion de existencia | Pendiente |
| REL-003 | Release | Localizacion | Cuatro cadenas `stale` en `Localizable.xcstrings` | Baja | Catalogo no sincronizado con codigo fuente | `"Open Brew-TUI"`, `"Retry"`, `"Service Errors"`, `"Upgrade All"` | Ejecutar `tuist generate` para re-extraer cadenas | Pendiente |
| REL-004 | Release | Versioning | `CURRENT_PROJECT_VERSION` ausente en `Project.swift` | Baja | Sin numero de build para distinguir entre builds | `menubar/Project.swift` | Agregar `"CURRENT_PROJECT_VERSION": "1"` | Pendiente |
| REL-005 | Release | Marketing | Sin screenshots ni assets de marketing automatizados | Baja | Limita la documentacion y el listing | Sin screenshots en el repositorio | Agregar screenshots al README | Pendiente |
| ACC-006 | Accesibilidad | BrewBar — semantica | Imagenes decorativas en OutdatedListView sin `.accessibilityHidden(true)` | Baja | VoiceOver leera "arrow.right" como contenido significativo | `OutdatedListView.swift:56-58` | Agregar `.accessibilityHidden(true)` | Pendiente |
| ACC-007 | Accesibilidad | BrewBar — semantica | Cabeceras sin `.accessibilityAddTraits(.isHeader)` | Baja | Estructura no accesible para VoiceOver | `PopoverView.swift:43`; `SettingsView.swift:13` | Agregar `.accessibilityAddTraits(.isHeader)` | Pendiente |
| ACC-008 | Accesibilidad | BrewBar — adaptaciones | Sin patron para Reduce Motion en animaciones futuras | Baja | Sin guardia si se agregan animaciones | Sin `@Environment(\.accessibilityReduceMotion)` | Agregar wrapper de utilidad | Pendiente |

---

# 22. Priorizacion ejecutiva

> Auditor: report-consolidator | Fecha: 2026-04-23

## Distribucion de hallazgos

| Severidad | Cantidad | % del total |
|-----------|----------|-------------|
| Critica   | 4        | 4.7%        |
| Alta      | 21       | 24.4%       |
| Media     | 36       | 41.9%       |
| Baja      | 25       | 29.1%       |
| **Total** | **86**   | **100%**    |

## Criticos — Accion inmediata requerida

| ID | Hallazgo | Riesgo | Accion inmediata |
|----|----------|--------|------------------|
| QA-001 | `npm run test` pasa en vacio — gate de CI false-green | Release puede publicarse sin tests | Configurar vitest con `--passWithNoTests false` |
| QA-002 | `getDegradationLevel` sin tests | Modelo freemium incorrecto en produccion | Cubrir todos los rangos con tests de fecha inyectada |
| QA-003 | Flujo de licencia sin test end-to-end | Regresion silenciosa afecta a todos los usuarios Pro | Test de integracion con filesystem temporal |
| REL-001 | BrewBar.app sin firma Developer ID ni notarizacion | Producto inusable para todos los usuarios de BrewBar | Obtener Apple Developer Program y notarizar en CI |
| SCR-001 | SmartCleanupView puede proponer desinstalar herramientas del sistema | Desinstalacion irreversible de herramientas esenciales | Advertencia explicita y confirmacion de dos pasos |

## Mapa de calor por dominio

| Dominio | Critica | Alta | Media | Baja | Total | Estado general |
|---------|---------|------|-------|------|-------|----------------|
| Testing / Calidad (QA) | 3 | 10 | 5 | 5 | 23 | Critico |
| Pantallas (SCR) | 1 | 8 | 9 | 2 | 20 | Critico |
| Endpoints (EP) | 0 | 5 | 6 | 2 | 13 | Preocupante |
| Arquitectura (ARQ) | 0 | 1 | 6 | 4 | 11 | Preocupante |
| Release (REL) | 1 | 2 | 0 | 4 | 7 | Critico |
| Seguridad (SEG) | 0 | 2 | 1 | 4 | 7 | Preocupante |
| Accesibilidad (ACC) | 0 | 2 | 3 | 3 | 8 | Preocupante |
| Design System (DS) | 0 | 1 | 4 | 0 | 5 | Preocupante |
| Backend (BK) | 0 | 1 | 3 | 3 | 7 | Preocupante |
| Frontend (FE) | 0 | 0 | 2 | 7 | 9 | Aceptable |
| Gobierno (GOV) | 0 | 0 | 3 | 4 | 7 | Aceptable |

---

# 23. Veredicto final

> Auditor: report-consolidator | Fecha: 2026-04-23

## Resumen ejecutivo

* **Estado general del frontend:** Aceptable — Las vistas TUI estan bien estructuradas; los hallazgos son principalmente deuda tecnica sin riesgos de crash. La falta de cobertura de tests hace que cualquier refactor sea de alto riesgo.
* **Estado general del backend:** Preocupante — Los modulos de persistencia y licencia tienen vulnerabilidades de integridad (clave AES embebida, escrituras no atomicas, casts sin validacion) que afectan la confiabilidad del modelo freemium.
* **Estado general de UI/UX:** Aceptable — La experiencia de usuario es coherente y funcional. El bloqueo mayor esta en la falta de feedback de error en vistas clave (ProfilesView, AccountView).
* **Estado general de arquitectura:** Preocupante — La inversion de dependencias entre `lib/` y stores es el problema estructural mas urgente. La ausencia de cache, atomicidad y timeouts limita la robustez.
* **Estado general de seguridad:** Preocupante — La clave AES embebida y el SHA-256 que es codigo muerto son vulnerabilidades de distribucion graves. La watermark con email sin consentimiento es un problema de privacidad activo.
* **Estado general de rendimiento:** Aceptable — El polling de 100ms en `streamBrew` y la ausencia de cache en OSV.dev son los problemas mas notables, pero no bloquean el uso normal.
* **Estado general de accesibilidad:** Preocupante — BrewBar tiene brechas inaceptables para distribucion publica: cuatro botones inaccessibles para VoiceOver, Dynamic Type bloqueado.

## Metricas clave

* **Total hallazgos:** 86
* **Hallazgos criticos:** 4 (QA-001, QA-002, QA-003, REL-001)
* **Hallazgos altos:** 21
* **Dominios auditados:** 14 de 14
* **Pantallas auditadas:** 15 (12 TUI + 3 SwiftUI)
* **Endpoints auditados:** 9 call sites

## Riesgos de salida a produccion

1. **BrewBar.app es rechazado por Gatekeeper en todos los macOS modernos.** El workflow no ejecuta `codesign` ni `notarytool`. Cualquier usuario que descargue BrewBar recibira un binario que macOS se niega a abrir. — Ver REL-001.

2. **La suite de tests no verifica nada en la puerta de CI.** `npm run test` retorna exit 0 cuando no hay tests. El gate en `release.yml:25` no bloquea releases con 0 tests. Cualquier regresion puede llegar a produccion sin deteccion. — Ver QA-001, QA-002, QA-003.

3. **La verificacion de integridad SHA-256 de BrewBar es codigo muerto.** El archivo `.sha256` nunca se genera. El instalador recibe un 404 que el `catch` descarta. La comparacion de hash jamas se ha ejecutado. Un binario sustituido se instala sin verificacion. — Ver SEG-001.

4. **La clave AES-256-GCM esta embebida en el bundle npm publicado y en el binario Swift.** Cualquier usuario puede derivar la misma clave y fabricar un `license.json` valido. — Ver SEG-002, BK-001.

5. **SmartCleanupView puede proponer desinstalar herramientas del sistema.** Sin advertencia explicita, el usuario puede desinstalar herramientas esenciales de forma irreversible. — Ver SCR-001.

6. **El watermark de exportacion de perfiles embebe el email del usuario sin consentimiento.** `watermark.ts` codifica el email via Unicode de ancho cero sin informar al usuario. — Ver SEG-003.

## Recomendacion

* [x] No apto para produccion sin correcciones previas — Requiere resolver hallazgos criticos y altos antes de release

**Justificacion:** Brew-TUI v0.2.0 tiene una base funcional solida y una arquitectura coherente, pero no puede distribuirse publicamente en su estado actual. El bloqueador absoluto es REL-001: BrewBar.app es rechazado por macOS Gatekeeper en todos los sistemas modernos, haciendo el producto inusable para el segmento de usuarios al que va dirigido. Adicionalmente, la ausencia de una suite de tests real (QA-001) y la integridad de distribucion comprometida (SEG-001) representan riesgos inaceptables para un producto con modelo freemium basado en licencias. Tras resolver los 4 hallazgos criticos y los hallazgos altos de seguridad (SEG-001, SEG-002), el producto podria calificarse para una beta interna o TestFlight.

## Proximas acciones

1. **[Bloqueo de release]** Obtener Apple Developer Program y agregar firma Developer ID + notarizacion en el workflow de CI antes de cualquier publicacion de BrewBar. — Ver REL-001.
2. **[Bloqueo de release]** Configurar vitest con `--passWithNoTests false` y escribir tests minimos para `getDegradationLevel`, flujo end-to-end de licencia, y AES round-trip. — Ver QA-001, QA-002, QA-003, QA-006.
3. **[Bloqueo de release]** Agregar `shasum -a 256 BrewBar.app.zip` en CI, subir ambos archivos al release, y corregir el `catch` en `brewbar-installer.ts:73`. — Ver SEG-001.
4. **[Prioridad critica]** Agregar advertencia explicita en SmartCleanupView con confirmacion de dos pasos. — Ver SCR-001.
5. **[Prioridad alta]** Agregar validacion de tipos en runtime para todas las respuestas de API: `assertPolarActivation`, `assertPolarValidated`, `assertOsvBatchResponse`. — Ver EP-001, EP-002, EP-003.
6. **[Prioridad alta]** Cambiar `xcodebuild build` a `xcodebuild archive` + `xcodebuild -exportArchive` en CI. — Ver REL-002.
7. **[Prioridad alta]** Agregar `.accessibilityLabel` a los cuatro botones solo-icono de BrewBar y cambiar el frame fijo `340x420` a dinamico. — Ver ACC-001, ACC-002.
8. **[Prioridad alta]** Completar la suite de tests con mocks de red para `polar-api.ts` y `osv-api.ts`. — Ver QA-004 hasta QA-010.
9. **[Prioridad alta]** Notificar al usuario antes de exportar un perfil que el archivo contendra su email. — Ver SEG-003.
10. **[Prioridad alta]** Integrar logging estructurado en TypeScript y `os.Logger` en Swift. — Ver QA-011, QA-012, QA-013.
11. **[Prioridad alta]** Refactorizar los cinco modulos de `lib/` que importan `useLicenseStore`. — Ver ARQ-001.
12. **[Prioridad media]** Importar `COLORS.ts` en todos los componentes y reemplazar literales hex inline. — Ver DS-001, FE-002.
13. **[Prioridad media]** Agregar timeout de 30 segundos en `execBrew` y de 5 minutos en `streamBrew`. — Ver EP-012.
14. **[Prioridad media]** Corregir los hallazgos de i18n en InstalledView (SCR-002) y SearchView (SCR-003).
15. **[Prioridad media]** Documentar formalmente la clave AES embebida como riesgo conocido e incorporar UUID de maquina en la derivacion. — Ver SEG-002, BK-001.

---

# 24. Checklist ultra resumido

| Area | Estado | Hallazgos | Accion prioritaria |
|------|--------|-----------|--------------------|
| Inventario y ficha | Conforme | 0 | Ninguna |
| Gobierno | Parcial | 7 | Corregir `CFBundleShortVersionString`; eliminar clave AES del codigo fuente o documentar formalmente |
| Arquitectura | Parcial | 11 | Refactorizar inversion de dependencias en 5 modulos `lib/` (ARQ-001) |
| Concurrencia | Parcial | 3 | Reemplazar flag `_revalidating` por mutex real (ARQ-002); gestionar Task handles en BrewBar |
| UI estructural | Parcial | 9 | Descomponer `ProfilesView` FSM; adoptar `COLORS.ts` |
| UX funcional | Parcial | 8 | Agregar feedback de error en `AccountView.deactivate()` (SCR-007); mostrar conteo antes de importar perfil (SCR-005) |
| Design system | No conforme | 5 | Completar migracion a `COLORS.ts` (DS-001); extraer `ResultBanner` y `SelectableRow` |
| Accesibilidad | No conforme | 8 | Agregar `.accessibilityLabel` a 4 botones de BrewBar (ACC-001); cambiar frame fijo (ACC-002) |
| Backend | Parcial | 7 | Corregir `saveProfile` a escritura atomica (BK-002); agregar type guard en `loadLicense` (BK-003) |
| Seguridad | No conforme | 7 | Reparar SHA-256 dead code (SEG-001); notificar al usuario del watermark (SEG-003) |
| Testing | No conforme | 23 | Deshabilitar false-green CI (QA-001); escribir tests para `getDegradationLevel`, flujo de licencia, AES round-trip |
| Pantallas | Parcial | 20 | Firmado de BrewBar (REL-001); advertencia en SmartCleanupView (SCR-001); soporte a casks en PackageInfoView (SCR-008) |
| Endpoints | Parcial | 13 | Agregar validacion de tipos en respuestas Polar y OSV (EP-001, EP-002, EP-003, EP-004) |
| Release | No conforme | 7 | Firma Developer ID + notarizacion (REL-001); cambiar a `xcodebuild archive` (REL-002) |

---

> Fin del reporte. Generado automaticamente por super-audit.
> Proyecto: Brew-TUI v0.2.0 | Commit: 65c7308 | Fecha: 2026-04-23
