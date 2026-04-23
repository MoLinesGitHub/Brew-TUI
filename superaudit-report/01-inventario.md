# 1. Inventario maestro de cobertura

> Auditor: project-scanner | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 es un proyecto hibrido compuesto por dos codebases independientes: una TUI (Terminal User Interface) escrita en TypeScript/React/Ink para la gestion visual de Homebrew, y BrewBar, una aplicacion companion para la barra de menu de macOS escrita en Swift 6/SwiftUI. La TUI cuenta con 12 vistas, 4 funcionalidades Pro (perfiles, limpieza inteligente, historial, auditoria de seguridad) y un modelo de licencias freemium con multiples capas de proteccion. La codebase TypeScript suma 71 archivos fuente (6.139 lineas), la codebase Swift suma 12 archivos en Sources (1.235 lineas). El proyecto no dispone de ningun archivo de test funcional.

---

## 1.1 Inventario de plataformas y targets

* [x] CLI / Terminal (macOS) — Brew-TUI TUI, Node.js >=18, distribuido via npm
* [x] App macOS (Menu Bar) — BrewBar, Swift 6, macOS 14+, distribuido via GitHub Releases
* [ ] App iPhone — No aplica
* [ ] App iPad — No aplica
* [ ] watchOS — No aplica
* [ ] visionOS — No aplica
* [ ] Widgets — No aplica
* [ ] App Clips — No aplica
* [ ] Extensions — No aplica
* [ ] Backend API — No aplica (usa APIs externas: Polar.sh, OSV.dev, Homebrew JSON API)
* [ ] Jobs / workers — No aplica
* [ ] Admin panel / dashboard — No aplica
* [ ] Servicios auxiliares — No aplica (CI/CD via GitHub Actions)

### Detalle de targets

| Target | Plataforma | Bundle ID / Package | Deployment Target | Tipo |
|--------|------------|---------------------|-------------------|------|
| brew-tui | macOS (Node.js CLI) | brew-tui (npm) | Node.js >=18 | CLI/TUI binario ESM |
| BrewBar | macOS (Swift) | com.molinesdesigns.brewbar | macOS 14.0+ | Menu Bar App (LSUIElement) |

---

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
| components | src/components/ | 13 | Componentes UI comunes y de layout (Header, Footer, StatusBadge, etc.) |
| i18n | src/i18n/ | 3 | Internacionalizacion: en.ts, es.ts, index.ts |
| utils | src/utils/ | 3 | Funciones de formato (bytes, tiempo relativo, truncado) |
| root | src/ | 2 | index.tsx (entry + CLI subcommands), app.tsx (router) |

### Codebase Swift (menubar/)

| Modulo | Ruta | Archivos | Responsabilidad |
|--------|------|----------|-----------------|
| App | menubar/BrewBar/Sources/App/ | 2 | Entry point (@main), AppDelegate, ciclo de vida |
| Models | menubar/BrewBar/Sources/Models/ | 4 | AppState (@Observable), tipos de datos (BrewPackage, BrewService, etc.) |
| Services | menubar/BrewBar/Sources/Services/ | 3 | BrewChecker, LicenseChecker, SchedulerService |
| Views | menubar/BrewBar/Sources/Views/ | 3 | PopoverView, OutdatedListView, SettingsView |
| Resources | menubar/BrewBar/Resources/ | 2 | Localizable.xcstrings, PrivacyInfo.xcprivacy |
| Project config | menubar/ | 2 | Project.swift (Tuist), Tuist.swift |

---

## 1.3 Inventario de features

### formulae (vista: Formulae)

* **Nombre:** Formulae
* **Modulo:** src/views/formulae-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** FormulaView (lista), PackageInfoView (detalle)
* **Casos de uso:** Listar formulas instaladas, buscar, ver detalle, instalar, desinstalar, actualizar formula individual
* **APIs asociadas:** `getInstalled()`, `getOutdated()`, `brew install/uninstall/upgrade` via `streamBrew()`
* **Persistencia asociada:** brew-store (Zustand, en memoria), history-logger (Pro, ~/.brew-tui/history.json)
* **Estados criticos:** Estado de stream activo durante install/upgrade; lista combinada formulae+outdated
* **Riesgo funcional:** Medio — operaciones destructivas (uninstall) sin confirmacion adicional visible en el codigo

### casks (vista: Casks)

* **Nombre:** Casks
* **Modulo:** src/views/casks-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** CasksView (lista), PackageInfoView (detalle)
* **Casos de uso:** Listar casks instalados, instalar, desinstalar, actualizar cask individual
* **APIs asociadas:** `getInstalled()`, `brew install --cask`, `brew uninstall --cask` via `streamBrew()`
* **Persistencia asociada:** brew-store (Zustand), history-logger (Pro)
* **Estados criticos:** Mismo patron de stream que Formulae
* **Riesgo funcional:** Medio — mismo riesgo que Formulae

### outdated (vista: Outdated)

* **Nombre:** Outdated
* **Modulo:** src/views/outdated-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** OutdatedView
* **Casos de uso:** Ver paquetes con actualizaciones disponibles, actualizar individualmente o todos
* **APIs asociadas:** `getOutdated()`, `brew upgrade [name]`, `brew upgrade` (todos)
* **Persistencia asociada:** brew-store (Zustand), history-logger (Pro)
* **Estados criticos:** Upgrade masivo via `brew upgrade` sin listado de paquetes afectados previo
* **Riesgo funcional:** Alto — upgrade masivo puede romper dependencias sin confirmacion granular

### search (vista: Search)

* **Nombre:** Search
* **Modulo:** src/views/search-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** SearchView
* **Casos de uso:** Buscar formulas y casks en Homebrew, instalar desde resultados
* **APIs asociadas:** `search()` (text parser), `brew install` / `brew install --cask` via `streamBrew()`
* **Persistencia asociada:** history-logger (Pro)
* **Estados criticos:** Debounce en busqueda; distincion formula/cask inferida del resultado de texto
* **Riesgo funcional:** Bajo

### services (vista: Services)

* **Nombre:** Services
* **Modulo:** src/views/services-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** ServicesView
* **Casos de uso:** Ver servicios brew, iniciar/detener/reiniciar servicios
* **APIs asociadas:** `getServices()`, `brew services start/stop/restart`
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Estado de servicio (running/stopped/error) actualizado post-accion
* **Riesgo funcional:** Medio — control de servicios del sistema sin confirmacion

### doctor (vista: Doctor)

* **Nombre:** Doctor
* **Modulo:** src/views/doctor-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** DoctorView
* **Casos de uso:** Ejecutar `brew doctor`, mostrar diagnostico del sistema
* **APIs asociadas:** `runDoctor()` (text parser)
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Output largo potencialmente; ejecucion on-demand
* **Riesgo funcional:** Bajo — solo lectura

### config (vista: Config)

* **Nombre:** Config
* **Modulo:** src/views/config-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** ConfigView
* **Casos de uso:** Ver configuracion actual de Homebrew
* **APIs asociadas:** `getConfig()` (text parser via `brew config`)
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Ninguno especial
* **Riesgo funcional:** Bajo — solo lectura

### update (vista: Update)

* **Nombre:** Update
* **Modulo:** src/views/update-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** UpdateView
* **Casos de uso:** Ejecutar `brew update`, mostrar progreso en tiempo real
* **APIs asociadas:** `brewUpdate()` via `streamBrew()` (SIN HOMEBREW_NO_AUTO_UPDATE — intencional)
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Unica operacion sin la variable de entorno de proteccion
* **Riesgo funcional:** Bajo — comportamiento correcto e intencional

### profiles (vista: Profiles — Pro)

* **Nombre:** Profiles
* **Modulo:** src/views/profiles-view.tsx + src/lib/profiles/
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** ProfilesView
* **Casos de uso:** Crear, listar, cargar, exportar, eliminar perfiles de instalacion de Homebrew
* **APIs asociadas:** `getInstalled()`, `getLeaves()`, `brew tap`, `brew install`, `brew install --cask` via `streamBrew()`
* **Persistencia asociada:** ~/.brew-tui/profiles/*.json (modo 0o600), profile-manager.ts
* **Estados criticos:** Import es un generator async que instala paquetes en secuencia; watermark invisible embebido en exportacion
* **Riesgo funcional:** Alto — instalacion masiva de paquetes desde perfil; watermark sin consentimiento explicito

### smart-cleanup (vista: Smart Cleanup — Pro)

* **Nombre:** Smart Cleanup
* **Modulo:** src/views/cleanup-view.tsx + src/lib/cleanup/
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** CleanupView
* **Casos de uso:** Detectar paquetes huerfanos (instalados como dependencia, sin dependientes activos), mostrar espacio recuperable, desinstalar selectivamente
* **APIs asociadas:** `getInstalled()`, `getLeaves()`, `brew --cellar`, `du -sk` (sistema), `brew uninstall`
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Deteccion de huerfanos puede tener falsos positivos si hay dependencias externas no gestionadas por brew
* **Riesgo funcional:** Alto — desinstalacion de dependencias puede romper herramientas del sistema

### history (vista: History — Pro)

* **Nombre:** History
* **Modulo:** src/views/history-view.tsx + src/lib/history/
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** HistoryView
* **Casos de uso:** Ver historial de operaciones brew ejecutadas desde Brew-TUI
* **APIs asociadas:** Ninguna (lectura de archivo local)
* **Persistencia asociada:** ~/.brew-tui/history.json (max 1000 entradas, UUID por entrada, atomic save)
* **Estados criticos:** Solo registra operaciones iniciadas desde Brew-TUI (no operaciones brew externas)
* **Riesgo funcional:** Bajo — solo lectura

### security-audit (vista: Security Audit — Pro)

* **Nombre:** Security Audit
* **Modulo:** src/views/security-view.tsx + src/lib/security/
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** SecurityView
* **Casos de uso:** Escanear paquetes instalados contra base de datos OSV.dev para detectar CVEs conocidos
* **APIs asociadas:** `https://api.osv.dev/v1/querybatch` (batch de hasta 100), fallback one-by-one en HTTP 400
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Batches de hasta 100 paquetes; mapeo CVSS V3 → severidad (CRITICAL/HIGH/MEDIUM/LOW/UNKNOWN)
* **Riesgo funcional:** Medio — dependencia de servicio externo (OSV.dev); sin cache de resultados

### package-info (vista: Package Info)

* **Nombre:** Package Info
* **Modulo:** src/views/package-info-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** PackageInfoView
* **Casos de uso:** Ver detalle completo de un paquete (dependencias, versiones, descripcion, opciones)
* **APIs asociadas:** `brew info --json` via parsers
* **Persistencia asociada:** Ninguna
* **Estados criticos:** Sin atajo de numero de tecla (no incluida en VIEW_KEYS)
* **Riesgo funcional:** Bajo

### account (vista: Account)

* **Nombre:** Account
* **Modulo:** src/views/account-view.tsx
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** AccountView
* **Casos de uso:** Ver estado de licencia, activar/desactivar Pro, enlace a upgrade
* **APIs asociadas:** Polar.sh API via license-manager.ts
* **Persistencia asociada:** ~/.brew-tui/license.json (AES-256-GCM, modo 0o600)
* **Estados criticos:** Sin atajo de numero de tecla (no incluida en VIEW_KEYS); revalidacion horaria con mutex
* **Riesgo funcional:** Medio — gestion de licencia critica para el modelo de negocio

### BrewBar (macOS Menu Bar App)

* **Nombre:** BrewBar
* **Modulo:** menubar/BrewBar/Sources/
* **Responsable:** project-scanner (inventario automatico)
* **Pantallas involucradas:** PopoverView (340x420), OutdatedListView, SettingsView
* **Casos de uso:** Mostrar badge con count de paquetes desactualizados, notificaciones push cuando aumenta el count, actualizar paquetes individualmente o todos, ver estado de servicios brew, configurar intervalo de comprobacion (1h/4h/8h), login al inicio via SMAppService, abrir Brew-TUI desde el menu
* **APIs asociadas:** `brew outdated --json`, `brew services list`, `brew upgrade [name]` (Process spawn)
* **Persistencia asociada:** UserDefaults (configuracion), ~/.brew-tui/license.json (lectura de licencia Pro)
* **Estados criticos:** `OnceGuard` para continuation exactamente-una-vez; 60s timeout en BrewChecker; dependencia de que brew-tui este instalado (comprobado al inicio)
* **Riesgo funcional:** Medio — clave hardcodeada para descifrado de licencia en LicenseChecker.swift

---

## 1.4 Dependencias externas

### Dependencias de produccion (TypeScript)

| Dependencia | Tipo | Version | Proposito |
|-------------|------|---------|-----------|
| ink | npm | ^5.2.1 | Motor de renderizado React para terminal (TUI) |
| react | npm | ^18.3.1 | Framework UI (renderizado via Ink) |
| @inkjs/ui | npm | ^2.0.0 | Componentes UI para Ink (TextInput, Spinner) |
| zustand | npm | ^5.0.0 | Gestion de estado global |

### Dependencias de desarrollo (TypeScript)

| Dependencia | Tipo | Version | Proposito |
|-------------|------|---------|-----------|
| typescript | npm | ~5.8.0 | Compilador TypeScript |
| tsup | npm | ^8.4.0 | Bundler ESM (basado en esbuild) |
| tsx | npm | ^4.19.0 | Ejecutor TypeScript para desarrollo |
| vitest | npm | ^3.0.0 | Framework de tests (configurado pero sin tests) |
| eslint | npm | ^9.0.0 | Linter |
| prettier | npm | ^3.4.0 | Formateador |
| ink-testing-library | npm | ^4.0.0 | Utilidades de test para Ink (sin uso activo) |
| @typescript-eslint/eslint-plugin | npm | ^8.58.0 | Plugin ESLint para TypeScript |
| @typescript-eslint/parser | npm | ^8.58.0 | Parser ESLint para TypeScript |
| @rollup/rollup-darwin-arm64 | npm | ^4.60.1 | Binario nativo de Rollup para Apple Silicon |
| @types/node | npm | ^22.0.0 | Tipos TypeScript para Node.js |
| @types/react | npm | ^18.3.0 | Tipos TypeScript para React |

### Dependencias Swift (BrewBar — frameworks Apple via Tuist)

| Dependencia | Tipo | Version | Proposito |
|-------------|------|---------|-----------|
| SwiftUI | Framework Apple | macOS 14+ | UI declarativa |
| CryptoKit | Framework Apple | macOS 14+ | Descifrado AES-256-GCM de licencia |
| UserNotifications | Framework Apple | macOS 14+ | Notificaciones push de actualizaciones |
| ServiceManagement | Framework Apple | macOS 14+ | SMAppService para login al inicio |
| AppKit | Framework Apple | macOS 14+ | NSStatusItem, NSPopover, NSMenu |

### APIs externas

| Servicio | URL | Proposito |
|----------|-----|-----------|
| Polar.sh | https://api.polar.sh/v1/customer-portal/license-keys | Activacion y validacion de licencias Pro |
| OSV.dev | https://api.osv.dev/v1/querybatch | Consulta de vulnerabilidades (CVEs) por paquete |
| GitHub Releases | https://github.com/MoLinesGitHub/Brew-TUI/releases | Descarga de BrewBar.app.zip (instalador) |

---

## 1.5 Metricas generales

### Codebase TypeScript

* **Total archivos TypeScript/TSX (src/):** 71
* **Total lineas de codigo TypeScript (src/):** 6.139
* **Total vistas (views):** 12 (8 free + 4 Pro)
* **Total stores Zustand:** 4
* **Total hooks personalizados:** 3
* **Total modulos de lib:** 7 subdirectorios + core
* **Total dependencias de produccion:** 4
* **Total dependencias de desarrollo:** 12

### Codebase Swift (BrewBar)

* **Total archivos Swift (Sources/):** 12
* **Total lineas de codigo Swift (Sources/):** 1.235
* **Total vistas SwiftUI:** 3
* **Total servicios:** 3
* **Total modelos:** 4

### Totales del proyecto

* **Total archivos fuente (ambas codebases):** 83 (71 TS/TSX + 12 Swift Sources)
* **Total targets:** 2 (brew-tui CLI/TUI + BrewBar macOS app)
* **Total features TUI:** 14 (12 vistas + CLI subcommands + BrewBar app)
* **Total dependencias externas (produccion):** 4 npm + 5 Apple frameworks + 3 APIs externas
* **Archivos de test:** 3 (`src/lib/parsers/parsers.test.ts`, `src/stores/brew-store.test.ts`, `src/stores/license-store.test.ts`)
* **Cobertura de test:** No instrumentada; suite minima presente con 8 tests Vitest en TypeScript
