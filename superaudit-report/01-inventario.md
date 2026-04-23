# 1. Inventario maestro de cobertura

> Auditor: project-scanner | Fecha: 2026-04-22

## Resumen ejecutivo

Brew-TUI es un proyecto hibrido compuesto por dos codebases independientes: un TUI (Terminal User Interface) para gestionar Homebrew, construido con TypeScript/React/Ink y distribuido como paquete npm, y BrewBar, una app de barra de menus para macOS construida con Swift 6/SwiftUI. El TUI implementa 12 vistas funcionales con modelo freemium (4 vistas Pro gateadas por licencia Polar); el codebase TypeScript contiene 70 archivos y aproximadamente 5,947 lineas de codigo. El codebase Swift contiene 16 archivos y aproximadamente 1,431 lineas. No existen archivos de tests en ninguno de los dos codebases.

---

## 1.1 Inventario de plataformas y targets

* [x] Terminal CLI/TUI — `brew-tui` npm package, Node.js >=18, cross-platform (macOS primario, Linux compatible)
* [x] App macOS menubar — BrewBar.app, macOS 14.0+, distribuida via GitHub Release (BrewBar.app.zip)
* [ ] App iPhone — No aplica
* [ ] App iPad — No aplica
* [ ] watchOS — No aplica
* [ ] visionOS — No aplica
* [ ] Widgets — No aplica
* [ ] App Clips — No aplica
* [ ] Extensions — No aplica
* [ ] Backend API — No aplica (el proyecto consume Polar API y OSV.dev como servicios externos, sin backend propio)
* [ ] Jobs / workers — No aplica
* [ ] Admin panel / dashboard — No aplica
* [ ] Servicios auxiliares — No aplica

### Detalle de targets

| Target | Plataforma | Bundle ID / Package | Deployment Target | Tipo |
|--------|------------|---------------------|-------------------|------|
| brew-tui (TUI) | Node.js / Terminal | `brew-tui` (npm) | Node.js >=18 | CLI/TUI (ESM) |
| BrewBar | macOS | `com.molinesdesigns.brewbar` | macOS 14.0+ | App menubar (LSUIElement) |

---

## 1.2 Inventario de modulos

### Codebase TypeScript (src/)

| Modulo | Ruta | Archivos | Responsabilidad |
|--------|------|----------|-----------------|
| Entry point | `src/index.tsx` | 1 | Bootstrap: CLI subcommands (activate, deactivate, status, install-brewbar, uninstall-brewbar) + render `<App />` |
| App root | `src/app.tsx` | 1 | Router principal: switch por `currentView`, gate de features Pro, init de licencia |
| Views | `src/views/` | 12 | Una vista por funcionalidad (dashboard, installed, search, outdated, package-info, services, doctor, profiles, smart-cleanup, history, security-audit, account) |
| Components — common | `src/components/common/` | 5 | Componentes reutilizables: ConfirmDialog, Loading, ProgressLog, StatCard, StatusBadge |
| Components — layout | `src/components/layout/` | 3 | Header (tab bar), Footer (hints), UpgradePrompt (paywall) |
| Components — misc | `src/components/` (raiz) | 3 | PackageDetails, PackageList, SearchInput |
| Stores | `src/stores/` | 2 | `brew-store.ts` (datos Homebrew), `navigation-store.ts` (view routing + historial) |
| Hooks | `src/hooks/` | 4 | `use-brew-stream.ts`, `use-keyboard.ts`, `use-license.ts`, `use-search.ts` |
| lib — brew | `src/lib/brew-api.ts`, `src/lib/brew-cli.ts` | 2 | API de alto nivel (brew-api) + primitivas CLI execBrew/streamBrew (brew-cli) |
| lib — parsers | `src/lib/parsers/` | 2 | `json-parser.ts` (brew info/outdated/services --json), `text-parser.ts` (brew search/doctor/config) |
| lib — license | `src/lib/license/` | 6 | `license-manager.ts`, `polar-api.ts`, `pro-guard.ts`, `feature-gate.ts`, `canary.ts`, `types.ts` |
| lib — security | `src/lib/security/` | 3 | `audit-runner.ts`, `osv-api.ts`, `types.ts` |
| lib — cleanup | `src/lib/cleanup/` | 2 | `cleanup-analyzer.ts`, `types.ts` |
| lib — history | `src/lib/history/` | 2 | `history-logger.ts`, `types.ts` |
| lib — profiles | `src/lib/profiles/` | 2 | `profile-manager.ts`, `types.ts` |
| lib — core | `src/lib/` (raiz) | 5 | `types.ts`, `data-dir.ts`, `brewbar-installer.ts`, `relative-time.ts`, `utils.ts` |
| i18n | `src/i18n/` | 3 | `index.ts` (t(), tp(), locale detection), `en.ts` (source of truth, ~120 keys), `es.ts` (traduccion completa ES) |
| Tests | `src/` / cualquier ruta | 0 | **No existen archivos de tests** |

### Codebase Swift (menubar/)

| Modulo | Ruta | Archivos | Responsabilidad |
|--------|------|----------|-----------------|
| Tuist config | `menubar/Project.swift`, `menubar/Tuist.swift` | 2 | Manifest Tuist (targets, settings, locales, Info.plist) |
| App entry | `menubar/BrewBar/Sources/App/` | 2 | `AppDelegate.swift` (NSStatusItem, NSPopover, badge timer), `BrewBarApp.swift` |
| Views | `menubar/BrewBar/Sources/Views/` | 3 | `PopoverView.swift` (340x420pt), `PackageRowView.swift`, `ServiceRowView.swift` |
| Services | `menubar/BrewBar/Sources/Services/` | 4 | `BrewChecker.swift`, `LicenseChecker.swift`, `SchedulerService.swift`, `UpdateChecker.swift` |
| Models | `menubar/BrewBar/Sources/Models/` | 2 | `BrewPackage.swift`, `BrewService.swift` |
| Resources | `menubar/BrewBar/Resources/` | 3 | `Assets.xcassets`, `Localizable.xcstrings` (en+es), `Info.plist` |

---

## 1.3 Inventario de features

### Dashboard

* **Nombre:** dashboard
* **Modulo:** `src/views/dashboard-view.tsx`
* **Pantallas involucradas:** Una unica vista con overview, formulae count, casks count, outdated count, service errors, system info (homebrew version, prefix, last updated)
* **Casos de uso:** Vista de bienvenida; muestra el estado global de la instalacion Homebrew al arrancar
* **APIs asociadas:** `getConfig()` (brew config), datos de brew-store (formulae, casks, outdated, services)
* **Persistencia asociada:** Ninguna directa; lee del brew-store (memoria)
* **Estados criticos:** Depende de que `fetchAll()` complete para mostrar datos; muestra skeletons/loading durante la carga inicial
* **Riesgo funcional:** Bajo — vista de solo lectura

### Installed (packages instalados)

* **Nombre:** installed
* **Modulo:** `src/views/installed-view.tsx`
* **Pantallas involucradas:** Lista de formulae + casks instalados, filtro de busqueda inline, confirmacion de desinstalacion
* **Casos de uso:** Navegar paquetes instalados, filtrar por nombre, desinstalar paquetes, navegar al detalle
* **APIs asociadas:** `uninstallPackage()` via brew-store; `getInstalled()` para recarga
* **Persistencia asociada:** Ninguna — datos en memoria via brew-store
* **Estados criticos:** Confirmacion de desinstalacion (ConfirmDialog), estado de filtro, selection index entre tabs Formulae/Casks
* **Riesgo funcional:** Medio — operacion destructiva (desinstalar)

### Search

* **Nombre:** search
* **Modulo:** `src/views/search-view.tsx`
* **Pantallas involucradas:** Input de busqueda, resultados separados en Formulae / Casks, confirmacion de instalacion, progress log de instalacion
* **Casos de uso:** Buscar paquetes en Homebrew, instalar un paquete seleccionado
* **APIs asociadas:** `search()` (brew search, text parser), `installPackage()` (streamBrew)
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Streaming de salida de brew install via useBrewStream, confirmacion de instalacion
* **Riesgo funcional:** Medio — instalacion puede fallar; `search()` sanitiza la query contra flag injection

### Outdated

* **Nombre:** outdated
* **Modulo:** `src/views/outdated-view.tsx`
* **Pantallas involucradas:** Lista de paquetes desactualizados con versiones, confirmacion de upgrade individual o masivo, progress log
* **Casos de uso:** Ver paquetes desactualizados, actualizar uno o todos
* **APIs asociadas:** `upgradePackage()`, `upgradeAll()` (streamBrew)
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Streaming de brew upgrade, confirmacion "upgrade all N packages?", paquetes pinned marcados con badge
* **Riesgo funcional:** Medio — operacion con impacto en el sistema

### Package Info

* **Nombre:** package-info
* **Modulo:** `src/views/package-info-view.tsx`
* **Pantallas involucradas:** Detalle de un paquete: homepage, license, tap, versiones, bottle, dependencias, caveats; acciones install/uninstall/upgrade
* **Casos de uso:** Consultar informacion completa de un paquete, ejecutar acciones sobre el
* **APIs asociadas:** `getFormulaInfo()` (brew info --json), `installPackage()`, `uninstallPackage()`, `upgradePackage()`
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Estado de seleccion de paquete (viene de navigation-store.selectedPackage), streaming de operaciones
* **Riesgo funcional:** Bajo-medio — combina lectura y operaciones destructivas

### Services

* **Nombre:** services
* **Modulo:** `src/views/services-view.tsx`
* **Pantallas involucradas:** Lista de servicios Homebrew con status/user, acciones start/stop/restart
* **Casos de uso:** Gestionar servicios del sistema (launchd) via `brew services`
* **APIs asociadas:** `getServices()` (brew services --json), `serviceAction()` (brew services start/stop/restart)
* **Persistencia asociada:** Ninguna — persiste en launchd del sistema
* **Estados criticos:** Confirmacion antes de stop/restart
* **Riesgo funcional:** Medio — afecta servicios del sistema operativo

### Doctor

* **Nombre:** doctor
* **Modulo:** `src/views/doctor-view.tsx`
* **Pantallas involucradas:** Resultado de `brew doctor`: estado clean o lista de warnings
* **Casos de uso:** Diagnosticar problemas en la instalacion de Homebrew
* **APIs asociadas:** `getDoctor()` (brew doctor, text parser)
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Carga lenta (brew doctor puede tardar 10-30s)
* **Riesgo funcional:** Bajo — vista de solo lectura

### Profiles (Pro)

* **Nombre:** profiles
* **Modulo:** `src/views/profiles-view.tsx`
* **Pantallas involucradas:** Lista de perfiles guardados con formulae/casks counts, creacion/edicion/importacion/exportacion/eliminacion
* **Casos de uso:** Exportar setup Homebrew actual como perfil, importar perfil en nueva maquina, gestionar multiples perfiles
* **APIs asociadas:** `profile-manager.ts` — `exportCurrentSetup()`, `importProfile()` (AsyncGenerator), `listProfiles()`, `saveProfile()`, `deleteProfile()`
* **Persistencia asociada:** JSON en `~/.brew-tui/profiles/<name>.json`, validacion contra path traversal
* **Estados criticos:** Import streaming (instala paquetes uno a uno), gate Pro (UpgradePrompt si no Pro), watermark en perfiles exportados, validacion de nombre (regex `[\w\s-]+`)
* **Riesgo funcional:** Alto — la importacion ejecuta brew install/tap en el sistema; gate de seguridad critica

### Smart Cleanup (Pro)

* **Nombre:** smart-cleanup
* **Modulo:** `src/views/smart-cleanup-view.tsx`
* **Pantallas involucradas:** Lista de orphans con disk usage, reclaimable total, confirmacion de desinstalacion masiva
* **Casos de uso:** Identificar dependencias huerfanas, ver espacio en disco por paquete, desinstalar orphans
* **APIs asociadas:** `cleanup-analyzer.ts` — `analyzeCleanup()`: llama `getLeaves()`, ejecuta `du -sk` en Cellar con concurrencia=5
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Gate Pro, force uninstall (ignora dependencias), confirmacion doble cuando hay dependencias
* **Riesgo funcional:** Alto — desinstalacion masiva forzada puede romper dependencias del sistema

### History (Pro)

* **Nombre:** history
* **Modulo:** `src/views/history-view.tsx`
* **Pantallas involucradas:** Lista de acciones (install/uninstall/upgrade/upgrade-all) con timestamps, filtro por tipo, busqueda por nombre, replay de acciones
* **Casos de uso:** Ver historial de operaciones Homebrew, buscar en el historial, re-ejecutar una accion pasada
* **APIs asociadas:** `history-logger.ts` — `loadHistory()`, `appendEntry()`, `clearHistory()`; replay llama las mismas APIs de brew
* **Persistencia asociada:** `~/.brew-tui/history.json`, max 1000 entradas, escritura atomica via tmp+rename
* **Estados criticos:** Gate Pro, confirmacion antes de replay, confirmacion antes de limpiar todo el historial
* **Riesgo funcional:** Medio — replay puede ejecutar operaciones con estado diferente al momento del registro

### Security Audit (Pro)

* **Nombre:** security-audit
* **Modulo:** `src/views/security-audit-view.tsx`
* **Pantallas involucradas:** Resumen de vulnerabilidades (scanned/vulnerable/critical/high/medium), lista detallada con CVE IDs, severidad, fixed version
* **Casos de uso:** Escanear todos los paquetes instalados contra la base de datos OSV.dev, ver CVEs, iniciar upgrade de paquetes vulnerables
* **APIs asociadas:** `audit-runner.ts` — `runSecurityAudit()`: llama `osv-api.ts` en batches de 100 paquetes contra `https://api.osv.dev/v1/querybatch`
* **Persistencia asociada:** Ninguna — scan en tiempo real, sin cache
* **Estados criticos:** Gate Pro, latencia de red (puede ser lenta para instalaciones grandes), rate limiting de OSV.dev no gestionado
* **Riesgo funcional:** Bajo (solo lectura) — riesgo de false negatives si OSV.dev no tiene datos de Homebrew

### Account

* **Nombre:** account
* **Modulo:** `src/views/account-view.tsx`
* **Pantallas involucradas:** Estado de licencia (Pro/Free/Expired/Validating), datos de cuenta (email, nombre, plan, key, fechas), instrucciones de activacion, confirmacion de desactivacion
* **Casos de uso:** Ver estado de licencia, desactivar licencia en este equipo
* **APIs asociadas:** `license-manager.ts` — `deactivate()` (llama `polar-api.ts` deactivate endpoint)
* **Persistencia asociada:** `~/.brew-tui/license.json` (AES-256-GCM encriptado, modo 0o600)
* **Estados criticos:** Confirmacion de desactivacion, revalidacion automatica (24h), periodo de gracia offline (7 dias warning → 14 dias limited → 30 dias expired)
* **Riesgo funcional:** Alto desde perspectiva de negocio — cualquier fallo en la desactivacion puede bloquear al usuario

### BrewBar — PopoverView

* **Nombre:** PopoverView (BrewBar)
* **Modulo:** `menubar/BrewBar/Sources/Views/PopoverView.swift`
* **Pantallas involucradas:** Popover de 340x420pt con estados: loading, error, upToDate, lista de outdated, service errors
* **Casos de uso:** Ver resumen de paquetes desactualizados y errores de servicios sin abrir la terminal; lanzar brew-tui via NSAppleScript
* **APIs asociadas:** `BrewChecker` (ejecuta `brew outdated --json`, `brew services list --json`), `LicenseChecker` (lee `~/.brew-tui/license.json`)
* **Persistencia asociada:** Lee `~/.brew-tui/license.json` con CryptoKit AES-GCM; UserDefaults para preferencias de scheduler
* **Estados criticos:** Verificacion de licencia Pro al arrancar; apertura de Terminal via NSAppleScript; 7 previews SwiftUI incluyendo locale es
* **Riesgo funcional:** Medio — depende de brew-tui instalado y Pro activo; NSAppleScript puede fallar si Terminal no es la app de terminal

### BrewBar — SchedulerService

* **Nombre:** SchedulerService (BrewBar)
* **Modulo:** `menubar/BrewBar/Sources/Services/SchedulerService.swift`
* **Pantallas involucradas:** No tiene UI propia — servicio de fondo
* **Casos de uso:** Programar checks automaticos de Homebrew (1h/4h/8h), enviar notificaciones UNUserNotification, configurar launch at login via ServiceManagement
* **APIs asociadas:** `BrewChecker`, `UNUserNotificationCenter`, `SMAppService`
* **Persistencia asociada:** UserDefaults para intervalo y launch-at-login
* **Estados criticos:** `@Observable @MainActor`; intervalos configurables; permisos de notificacion
* **Riesgo funcional:** Bajo — servicio de fondo sin operaciones destructivas

### BrewBar — LicenseChecker

* **Nombre:** LicenseChecker (BrewBar)
* **Modulo:** `menubar/BrewBar/Sources/Services/LicenseChecker.swift`
* **Pantallas involucradas:** No tiene UI — servicio llamado desde AppDelegate
* **Casos de uso:** Verificar que la licencia Pro esta activa leyendo directamente `~/.brew-tui/license.json`
* **APIs asociadas:** CryptoKit AES-GCM; FileManager
* **Persistencia asociada:** Lee `~/.brew-tui/license.json`; clave de derivacion hard-coded como hex
* **Estados criticos:** Clave derivada hard-coded: `5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126`; threshold offline: 30 dias; soporta formato legacy (sin cifrar) y formato cifrado
* **Riesgo funcional:** Critico — la clave de derivacion es un secreto hard-coded en el binario Swift distribuido

---

## 1.4 Dependencias externas

### TypeScript — Dependencias de produccion

| Dependencia | Tipo | Version | Proposito |
|-------------|------|---------|-----------|
| `ink` | npm prod | ^5.2.1 | Terminal UI renderer (React para terminal, usa yoga-layout) |
| `@inkjs/ui` | npm prod | ^2.0.0 | Componentes UI para Ink: TextInput, Spinner |
| `react` | npm prod | ^18.3.1 | Framework UI (reconciler de Ink) |
| `zustand` | npm prod | ^5.0.0 | State management global (brew-store, navigation-store) |

### TypeScript — Dependencias de desarrollo

| Dependencia | Tipo | Version | Proposito |
|-------------|------|---------|-----------|
| `typescript` | npm dev | ~5.8.0 | Compilador TypeScript, strict mode, NodeNext resolution |
| `tsup` | npm dev | ^8.4.0 | Bundle builder (ESM, externaliza react, inyecta APP_VERSION) |
| `tsx` | npm dev | ^4.19.0 | Ejecutor TypeScript para `npm run dev` |
| `vitest` | npm dev | ^3.0.0 | Test runner (configurado, sin tests escritos) |
| `ink-testing-library` | npm dev | ^4.0.0 | Testing helpers para componentes Ink (configurado, sin uso) |
| `eslint` | npm dev | ^9.0.0 | Linter TypeScript |
| `@typescript-eslint/eslint-plugin` | npm dev | ^8.58.0 | Reglas ESLint para TypeScript |
| `@typescript-eslint/parser` | npm dev | ^8.58.0 | Parser TypeScript para ESLint |
| `prettier` | npm dev | ^3.4.0 | Formateador de codigo |
| `@types/react` | npm dev | ^18.3.0 | Tipos TypeScript para React |
| `@types/node` | npm dev | ^22.0.0 | Tipos TypeScript para Node.js |
| `@rollup/rollup-darwin-arm64` | npm dev | ^4.60.1 | Binario nativo Rollup para Apple Silicon (tsup dependency) |

### Swift — Dependencias externas

| Dependencia | Tipo | Version | Proposito |
|-------------|------|---------|-----------|
| Tuist | herramienta build | no especificada | Generacion de proyecto Xcode desde `Project.swift` |
| — | — | — | **Cero dependencias Swift externas** (solo SDKs de Apple) |

### APIs externas consumidas

| Servicio | URL | Proposito |
|----------|-----|-----------|
| Polar API | `https://api.polar.sh/v1/customer-portal/license-keys` | Activacion, validacion y desactivacion de licencias Pro |
| OSV.dev API | `https://api.osv.dev/v1/querybatch` | Escaneo de vulnerabilidades CVE en paquetes Homebrew |
| GitHub Releases | `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip` | Descarga de BrewBar.app para `brew-tui install-brewbar` |

---

## 1.5 Metricas generales

### Codebase TypeScript

* **Total archivos TypeScript (.ts/.tsx):** 70
* **Total lineas de codigo TypeScript (aprox):** 5,947
* **Total views:** 12
* **Total components:** 11 (5 common + 3 layout + 3 misc)
* **Total stores Zustand:** 2
* **Total hooks:** 4
* **Total lib modules:** 26 archivos en 7 subdirectorios (brew, parsers, license, security, cleanup, history, profiles) + 5 archivos raiz
* **Total archivos i18n:** 3 (index.ts, en.ts, es.ts), ~120 claves de traduccion
* **Total archivos de tests:** 0 (CERO — vitest configurado pero sin tests escritos)

### Codebase Swift

* **Total archivos Swift (.swift):** 16 (incluyendo 2 archivos Tuist: Project.swift, Tuist.swift)
* **Total lineas de codigo Swift (aprox):** 1,431
* **Total views SwiftUI:** 3 (PopoverView, PackageRowView, ServiceRowView)
* **Total services:** 4 (BrewChecker, LicenseChecker, SchedulerService, UpdateChecker)
* **Total models:** 2 (BrewPackage, BrewService)
* **Dependencias Swift externas:** 0

### Totales del proyecto

* **Total archivos de codigo fuente:** 86 (70 TS + 16 Swift)
* **Total lineas de codigo fuente (aprox):** 7,378 (5,947 TS + 1,431 Swift)
* **Total targets:** 2 (brew-tui TUI + BrewBar.app)
* **Total features/vistas:** 15 (12 TUI + 3 BrewBar)
* **Total dependencias npm produccion:** 4
* **Total dependencias npm desarrollo:** 11
* **Total dependencias Swift externas:** 0
* **Cobertura de tests:** 0%
