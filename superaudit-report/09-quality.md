# 14. Testing y calidad / 15. Observabilidad y analitica

> Auditor: quality-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

Brew-TUI presenta una cobertura de tests del **0%** en ambos codebases: el codebase TypeScript tiene vitest y ink-testing-library instalados pero cero archivos de tests escritos; el codebase Swift tiene el scheme Xcode configurado con `<Testables>` vacio y cero targets de test. El producto ejecuta comandos destructivos del sistema (`brew uninstall`, `brew services stop/restart`, force-uninstall de orphans) y maneja activacion de licencias de pago sin ninguna red de seguridad automatizada. En cuanto a observabilidad, el proyecto carece completamente de logging estructurado, crash reporting, analytics de producto y metricas operativas; las unicas trazas de ejecucion son 21 llamadas a `console.log/error` en la capa CLI y un unico `NSLog` en Swift, dos de los cuales exponen el email del cliente a stdout.

---

## Metricas de testing

* **Total archivos de test:** 0 (cero en TypeScript, cero en Swift)
* **Total metodos de test:** 0
* **Frameworks de test instalados:** vitest ^3.0.0, ink-testing-library ^4.0.0 (npm devDependencies, sin uso); XCTest disponible en Xcode pero sin targets configurados
* **Tests unitarios:** 0
* **Tests de integracion:** 0
* **Tests de UI:** 0
* **Tests de snapshot:** 0
* **Tests deshabilitados/saltados:** 0 (no existen tests que deshabilitar)
* **Directorio de tests anticipado pero nunca creado:** `tests/` referenciado en `tsconfig.json` linea 20 (`"exclude": [..., "tests"]`)
* **Tests ejecutados en CI:** 0 — ninguno de los dos workflows (release.yml, publish.yml) ejecuta `npm run test`

---

## 14.1 Unit tests

### Checklist

* [ ] Casos de uso cubiertos — Cero tests para ninguna funcion de las bibliotecas de negocio: `license-manager.ts`, `polar-api.ts`, `profile-manager.ts`, `cleanup-analyzer.ts`, `history-logger.ts`, `audit-runner.ts`, `osv-api.ts`
* [ ] Logica de dominio cubierta — Cero tests para los parsers (`json-parser.ts`, `text-parser.ts`), la maquina de estados de licencia (`getDegradationLevel`, `isExpired`, `needsRevalidation`), ni para la logica de rate limiting en `license-manager.ts`
* [ ] Mapping cubierto — Las funciones `formulaeToListItems()` y `casksToListItems()` en `brew-api.ts` no tienen tests; los parsers de JSON (`parseInstalledJson`, `parseOutdatedJson`, `parseServicesJson`, `parseFormulaInfoJson`) no tienen tests
* [ ] Validaciones cubiertas — `validateProfileName()` (regex + longitud), `validateLicenseKey()` (longitud + charset), `validateApiUrl()` y `checkRateLimit()` en `license-manager.ts` no tienen tests; los casos limite de las validaciones son desconocidos
* [ ] Casos borde cubiertos — No existen tests de ninguna clase; comportamiento ante JSON malformado, strings vacios, valores null/undefined, concurrencia y desbordamiento no esta verificado

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cero tests unitarios en todo el codebase TypeScript | No conforme | Critica | Ausencia de archivos `*.test.ts` / `*.spec.ts` en `src/`; `vitest` instalado pero sin configurar ni ejecutar | Crear suite de tests unitarios empezando por `src/lib/parsers/`, `src/lib/license/license-manager.ts` y `src/lib/profiles/profile-manager.ts` |
| Logica de rate limiting sin tests | No conforme | Critica | `src/lib/license/license-manager.ts` lineas 28-57: `checkRateLimit()` y `recordAttempt()` implementan lockout de seguridad sin ninguna cobertura de test | Escribir tests para: cooldown de 30s, max 5 intentos, lockout de 15 min, reset tras exito |
| `getDegradationLevel()` sin tests | No conforme | Critica | `src/lib/license/license-manager.ts` lineas 170-181: determina acceso Pro vs expirado por tiempo; un bug aqui afecta directamente a ingresos | Escribir tests parametrizados con fechas relativas: 0d, 6d, 8d, 15d, 31d desde `lastValidatedAt` |
| Parsers JSON sin tests contra payload real de Homebrew | No conforme | Alta | `src/lib/parsers/json-parser.ts`: las 4 funciones de parse no tienen fixtures ni tests; fallos silenciosos ante cambios en el schema de Homebrew | Crear fixtures con output real de `brew info --json=v2`, `brew outdated --json=v2`, `brew services list --json` y escribir tests de parse |
| `validateProfileName()` sin tests de casos limite | No conforme | Alta | `src/lib/profiles/profile-manager.ts` linea 25: regex `^[\w\s-]+$`; path traversal con `../etc/passwd`, caracteres unicode, strings vacios sin tests | Escribir tests para: nombres validos, `../`, null bytes, longitud 101, caracteres especiales |

### Metricas de funciones sin cobertura (TypeScript)

| Modulo | Funciones exportadas | Tests existentes |
|--------|---------------------|-----------------|
| `brew-cli.ts` | `execBrew`, `streamBrew` | 0 |
| `brew-api.ts` | 10 funciones + 2 converters | 0 |
| `parsers/json-parser.ts` | 4 funciones | 0 |
| `parsers/text-parser.ts` | 4 funciones | 0 |
| `license/license-manager.ts` | 10 funciones | 0 |
| `license/polar-api.ts` | 3 funciones | 0 |
| `license/pro-guard.ts` | `verifyPro`, `requirePro`, `_verify` | 0 |
| `license/anti-tamper.ts` | `verifyStoreIntegrity` | 0 |
| `license/canary.ts` | 4 funciones | 0 |
| `license/integrity.ts` | `checkBundleIntegrity` | 0 |
| `profiles/profile-manager.ts` | 6 funciones + 1 generator | 0 |
| `cleanup/cleanup-analyzer.ts` | `analyzeCleanup` | 0 |
| `history/history-logger.ts` | 3 funciones | 0 |
| `security/audit-runner.ts` | `runSecurityAudit` | 0 |
| `security/osv-api.ts` | 3 funciones | 0 |

---

## 14.2 Integration tests

### Checklist

* [ ] Repositorios — No existen tests de integracion para ninguna capa de persistencia; los stores Zustand (`brew-store.ts`, `license-store.ts`, `history-store.ts`, etc.) no tienen tests contra implementaciones reales o in-memory
* [ ] Persistencia — `history-logger.ts` (escritura atomica via tmp+rename), `profile-manager.ts` (lectura/escritura JSON en `~/.brew-tui/`) y `license-manager.ts` (AES-256-GCM + fichero mode 0o600) no tienen tests de integracion con filesystem temporal
* [ ] Red — `polar-api.ts` (3 endpoints Polar) y `osv-api.ts` (batch query OSV.dev) no tienen tests con mocks de HTTP ni con respuestas grabadas; comportamiento ante 4xx/5xx/timeout desconocido en produccion
* [ ] Autenticacion — El flujo completo activate → saveLicense → revalidate → deactivate no tiene ningun test de integracion; `src/lib/license/polar-api.ts` no tiene mocks de fetch
* [ ] Sincronizacion — La logica de degradacion offline (0-7d none / 7-14d warning / 14-30d limited / 30d+ expired) en `license-manager.ts` no tiene tests de integracion con tiempo simulado

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Flujo completo de licencia sin tests de integracion | No conforme | Critica | `src/lib/license/polar-api.ts` + `license-manager.ts`: la activacion llama a dos endpoints Polar secuencialmente; un fallo en el segundo endpoint deja al usuario "activado" sin email — sin tests que verifiquen este estado | Mockear `fetch` con `vi.stubGlobal` y escribir tests para: activacion exitosa, activacion con fallo del segundo validate, red caida, respuesta 4xx, respuesta 5xx |
| Escritura atomica de historial sin tests | No conforme | Alta | `src/lib/history/history-logger.ts` lineas 22-27: escribe a `.tmp` y renombra; si el proceso muere entre los dos pasos el fichero queda corrupto; no hay tests que simulen esto | Escribir test de integracion con directorio temporal (fs real) verificando atomicidad y corrupcion parcial |
| Persistencia de licencia cifrada sin tests de round-trip | No conforme | Alta | `src/lib/license/license-manager.ts`: `encryptLicenseData` → `writeFile` → `readFile` → `decryptLicenseData` no tiene test de round-trip; un cambio en los parametros scrypt romperia todas las licencias existentes silenciosamente | Escribir test de integracion encrypt/decrypt con directorio temporal |
| Lectura de perfiles sin tests ante JSON corrupto | No conforme | Media | `src/lib/profiles/profile-manager.ts` linea 53: captura el error de parse pero no hay test que verifique el mensaje de error ni que no se devuelvan datos parciales | Escribir test con fixture de perfil corrupto (JSON invalido) y verificar el mensaje de error |

---

## 14.3 UI tests

### Checklist

* [ ] Flujos criticos — No existen tests de UI para ninguno de los 12 flujos de vistas del TUI; `ink-testing-library` instalado pero sin uso
* [ ] Estados de error — Los estados de error en los stores (`errors.installed`, `errors.outdated`, etc.) y los mensajes de error en las vistas no tienen tests de renderizado
* [ ] Navegacion principal — La logica de routing de `navigation-store.ts` (push, back, tab cycling) y el guard Pro en `app.tsx` no tienen tests
* [ ] Acciones destructivas — `ConfirmDialog` (usada en uninstall, service-stop, history-clear) no tiene tests de renderizado ni de interaccion; los flujos de desinstalacion masiva en `smart-cleanup-view.tsx` no estan cubiertos
* [ ] Permisos del sistema — No aplica directamente al TUI (Node.js); en BrewBar, `SchedulerService.requestNotificationPermission()` no tiene tests

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `ink-testing-library` instalado sin ningun test de componente | No conforme | Alta | `package.json` devDependencies: `"ink-testing-library": "^4.0.0"`; sin archivos `*.test.tsx` en todo `src/`; la library fue instalada con intencion de usarse | Crear tests de renderizado para los 5 componentes common (`ConfirmDialog`, `StatusBadge`, `StatCard`, `ProgressLog`, `UpgradePrompt`) como punto de entrada minimo |
| Guard Pro en app.tsx sin tests | No conforme | Alta | `src/app.tsx` lineas 32-34: `if (isProView(currentView) && !isPro())` devuelve `<UpgradePrompt>`; la logica de gating nunca se ha verificado automaticamente | Usar `ink-testing-library` para renderizar `<App />` con estado de licencia `free` y verificar que las vistas Pro muestran `UpgradePrompt` |
| BrewBar PopoverView sin tests de estado | No conforme | Media | `menubar/BrewBar/Sources/Views/PopoverView.swift`: 7 previews SwiftUI existen (evidencia visual positiva) pero no son tests automatizados; los estados loading/error/upToDate/outdated no tienen aserciones automaticas | Crear XCTest target en Project.swift con ViewInspector o XCUITest para cubrir los 5 estados del popover |
| ConfirmDialog sin tests de interaccion | No conforme | Alta | `src/components/common/confirm-dialog.tsx`: protege todas las operaciones destructivas (uninstall, service-stop, history-clear, profile-delete); comportamiento ante teclas `y/Y/s/S` (es) y `n/N` sin tests | Escribir tests con `ink-testing-library` simulando input de teclado para confirmar y cancelar en ambos idiomas |

---

## 14.4 Snapshot / visual regression

### Checklist

* [ ] Componentes base — Ninguno de los 11 componentes UI tiene snapshot tests
* [ ] Pantallas clave — Ninguna de las 12 vistas tiene snapshot tests
* [ ] Dark mode — No aplica al TUI (terminal); en BrewBar, el popover no tiene snapshots en dark mode
* [ ] Dynamic Type — No aplica al TUI; en BrewBar, ninguna variante de Dynamic Type
* [ ] Localizacion larga — Los 7 previews SwiftUI en `PopoverView.swift` incluyen 2 en locale `es` (positivo) pero son previews manuales, no tests automatizados con aserciones

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cero snapshot tests en ambos codebases | No conforme | Media | Ausencia total de archivos `.snap`, directorios `__snapshots__`, o uso de `toMatchSnapshot()` / `swift-snapshot-testing` | Para el TUI: integrar `vitest` snapshot testing con `ink-testing-library` para los 5 componentes common; para BrewBar: integrar `swift-snapshot-testing` para los 3 estados principales del popover |
| Previews SwiftUI no sustituyen tests automatizados | Parcial | Baja | `menubar/BrewBar/Sources/Views/PopoverView.swift` lineas 188-243: 7 `#Preview` macros son un activo positivo para revision visual manual, pero no producen fallos de CI ante regresiones | Mantener los previews y complementarlos con XCUITest screenshots o swift-snapshot-testing |

---

## 14.5 Calidad del set de pruebas

### Checklist

* [ ] Tests estables — No aplica (no existen tests)
* [ ] No flakes frecuentes — No aplica (no existen tests)
* [ ] Fixtures claros — No aplica (no existen tests)
* [ ] Datos de prueba mantenibles — No aplica (no existen tests)
* [ ] Tiempo de suite razonable — No aplica (no existen tests)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| vitest configurado via `package.json` script pero sin archivo `vitest.config.ts` | No conforme | Media | `package.json` linea 8: `"test": "vitest run"`; busqueda de `vitest.config.ts/js` en todo el proyecto devuelve cero resultados; vitest usa configuracion por defecto (puede incluir inadvertidamente archivos de node_modules) | Crear `vitest.config.ts` en la raiz con `include: ['src/**/*.test.ts', 'src/**/*.spec.ts']`, `environment: 'node'`, y excludes expliciticos |
| `npm run test` nunca se ejecuta en CI | No conforme | Critica | `release.yml`: secuencia `typecheck → build → lint → publish` — falta `npm run test`; `publish.yml`: solo `npm ci → npm publish`; los tests nunca actuan como gate de publicacion | Agregar `- run: npm run test` antes de `npm publish` en ambos workflows; configurar la etapa para que falle el pipeline si los tests fallan |
| `tsconfig.json` excluye directorio `tests/` que no existe | Parcial | Baja | `tsconfig.json` linea 20: `"exclude": ["node_modules", "build", "tests"]`; el directorio `tests/` nunca fue creado, lo que indica intencion original de escribir tests | Crear el directorio `src/__tests__/` (convencion vitest) y poblar con los primeros tests unitarios |
| `brew-cli.ts` usa `setTimeout(r, 50)` en bucle de streaming | Informativo | Baja | `src/lib/brew-cli.ts` linea 64: polling loop con 50ms de delay para await de output del proceso; esto haria los tests de streaming lentos sin mocks adecuados de `spawn` | Al escribir tests para `streamBrew`, mockear el modulo `node:child_process` con `vi.mock` para eliminar la dependencia del delay real |

---

## Matriz de cobertura util

| Zona | Tipo de test | Cobertura real | Riesgo sin cubrir | Accion |
|------|--------------|----------------|-------------------|--------|
| Domain models (`types.ts`) | Unitario | Sin cubrir | Bajo — solo tipos TypeScript | Verificar tipos con `tsc --noEmit` (ya en CI) |
| Parsers JSON/texto (`parsers/`) | Unitario | Sin cubrir | Alto — cambios en schema Homebrew rompen silenciosamente la app | Fixtures de payload real + tests unitarios con vitest |
| `brew-api.ts` converters | Unitario | Sin cubrir | Medio — datos de display incorrectos | Tests unitarios con datos de entrada fabricados |
| `brew-cli.ts` primitivas | Unitario + Integracion | Sin cubrir | Alto — comandos destructivos sin verificacion de comportamiento | Mock de `child_process.spawn`, tests de exit codes, stderr |
| Stores Zustand (`brew-store`, `license-store`) | Unitario | Sin cubrir | Critico — estado global; bugs afectan todas las vistas | Tests de store con `zustand/test` o `@testing-library/react` |
| License manager (encrypt/decrypt, degradacion) | Unitario + Integracion | Sin cubrir | Critico — bugs afectan ingresos directamente | Tests parametrizados de degradacion; test round-trip AES-256-GCM |
| Polar API client (`polar-api.ts`) | Integracion | Sin cubrir | Critico — activacion de pago sin tests de error handling | Mock de `fetch` con MSW o `vi.stubGlobal` |
| Pro guard (`pro-guard.ts`, `canary.ts`, `anti-tamper.ts`) | Unitario | Sin cubrir | Alto — seguridad del modelo de negocio | Tests que verifiquen que cada capa de defensa funciona individualmente |
| Profile manager (`profile-manager.ts`) | Unitario + Integracion | Sin cubrir | Alto — path traversal validation, filesystem real | Tests de validacion de nombres + tests de integracion con `tmp` dir |
| History logger (`history-logger.ts`) | Integracion | Sin cubrir | Medio — escritura atomica, max 1000 entradas | Tests con filesystem temporal, verificar atomicidad y truncado |
| Cleanup analyzer (`cleanup-analyzer.ts`) | Unitario | Sin cubrir | Alto — desinstalacion masiva forzada | Tests unitarios con datos de formulae fabricados |
| OSV API client (`osv-api.ts`) | Integracion | Sin cubrir | Medio — batch de 100, fallback one-by-one | Mock de fetch con respuestas de OSV, escenarios de 400/fallback |
| Views TUI (12 vistas) | UI / Snapshot | Sin cubrir | Alto — flujos destructivos sin tests de comportamiento | `ink-testing-library` para flows criticos: install, uninstall, upgrade-all |
| Components common (5) | UI / Snapshot | Sin cubrir | Medio — regresiones de UI sin deteccion | `ink-testing-library` + vitest snapshot |
| Navigation store | Unitario | Sin cubrir | Alto — bug en routing bloquea toda la app | Tests de ciclos Tab/Shift+Tab, push/back, guard Pro |
| BrewBar SwiftUI views (3) | UI (XCUITest) | Sin cubrir | Medio — estados de popover no verificados | XCTest target + ViewInspector o XCUITest |
| BrewBar services (BrewChecker, LicenseChecker, SchedulerService) | Unitario | Sin cubrir | Alto — LicenseChecker controla acceso Pro en BrewBar | XCTest con mocks de FileManager y CryptoKit |
| i18n (`en.ts`, `es.ts`) | Unitario | Sin cubrir (validado por tsc) | Bajo — tsc detecta claves faltantes en `es.ts` | Mantener dependencia de tsc para type-safety; agregar test de completitud de claves |

---

## 15.1 Logging

### Checklist

* [ ] Logs estructurados — No existe ninguna capa de logging estructurado en ninguno de los dos codebases; el unico mecanismo de logging son 21 llamadas directas a `console.log/error` en el CLI entry point y 1 `NSLog` en Swift
* [ ] Niveles correctos — No existe sistema de niveles (debug/info/warn/error); los `console.log` y `console.error` se usan indistintamente para output de usuario y para errors; la distincion entre log de negocio y output de interfaz es inexistente
* [ ] Sin datos sensibles — **Parcialmente no conforme**: `src/index.tsx` lineas 22 y 59 emiten el email del cliente a stdout via `console.log`; aunque es output esperado del CLI, no hay separacion entre output de usuario y log persistido
* [ ] Correlacion frontend/backend — No aplica al modelo de este producto (no hay backend propio); sin embargo, no existe correlation ID en las llamadas a Polar API o a OSV.dev que permita correlacionar errores con traces del servidor externo
* [ ] Eventos criticos registrados — La activacion de licencia, fallos de desinstalacion, errores de `brew services`, errores de red en el security audit y timeouts de `streamBrew` no tienen logging; los errores se propagan a la UI pero no se registran en ningun log persistente

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Ausencia total de logging estructurado | No conforme | Media | Busqueda de `winston`, `pino`, `bunyan`, `OSLog`, `Logger(` en todo el proyecto: cero resultados; los 21 `console.*` son el unico mecanismo de traza | Crear un modulo `src/lib/logger.ts` con niveles (debug/info/warn/error) que escriba a `~/.brew-tui/brew-tui.log` en modo append con timestamps ISO; suprimir en produccion el nivel debug |
| Email del cliente emitido a stdout en operaciones CLI | No conforme | Media | `src/index.tsx:22`: `console.log(t('cli_activated', { email: license.customerEmail }))` y linea 59: `console.log(t('cli_email', { email: license.customerEmail }))` | Estas lineas son output de usuario intencional (no log persistente), pero si se agrega logging a fichero en el futuro, el email nunca debe incluirse en los logs de sistema; documentar este invariante |
| Unico NSLog en BrewBar no constituye estrategia de logging | No conforme | Media | `menubar/BrewBar/Sources/Views/PopoverView.swift:181`: `NSLog("[BrewBar] Failed to open Brew-TUI: %@", errorInfo.description)` — unico punto de logging en todo el codebase Swift; errores de `BrewChecker`, `LicenseChecker`, y `SchedulerService` no se registran | Adoptar `os.Logger` (OSLog unificado) con subsistema `com.molinesdesigns.brewbar`; instrumentar al menos los errores de `BrewChecker.run()`, fallos de `LicenseChecker.decrypt()` y errores de notificacion |
| `brew-store.ts` solo loggea en non-production | Parcial | Baja | `src/stores/brew-store.ts:112`: `if (process.env.NODE_ENV !== 'production') { console.error('[brew-store] fetchLeaves failed:', ...) }` — los errores de `fetchLeaves` son silenciosos en produccion | Redirigir el error al log persistente incluso en produccion (con nivel `warn`); los errores de fetchLeaves indican potencial problema con la instalacion de Homebrew |
| Errores de operaciones de red no trackeados | No conforme | Media | `src/lib/license/polar-api.ts` lineas 51-65: errores de red en activacion/validacion de licencia no se loggean; `src/lib/security/osv-api.ts` linea 75: `throw new Error` sin logging | Loggear al menos el status code HTTP y el endpoint en todos los errores de red de operaciones de negocio |

---

## 15.2 Crash y diagnostico

### Checklist

* [ ] Crash reporting configurado — No existe ningun SDK de crash reporting en ninguno de los dos codebases; busqueda de `Crashlytics`, `Sentry`, `Bugsnag`, `SentrySDK`, `FirebaseCrashlytics` devuelve cero resultados
* [ ] Symbolication verificada — No aplica para el TUI (no hay binario nativo ni dSYM); para BrewBar.app, el workflow de CI (`release.yml`) construye en Release pero no configura upload de dSYM a ningun servicio de crash reporting
* [ ] Trazas utiles — No existe mecanismo de breadcrumbs ni contexto adicional adjunto a errores; los `catch` silenciosos (23 bloques `catch { }` o `catch { /* ... */ }` en el codebase TypeScript) descartan silenciosamente errores sin traza
* [ ] Alertas caidas criticas — No existe ningun mecanismo de alertas ante crashes o errores en produccion

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| BrewBar.app distribuida sin crash reporting | No conforme | Alta | `menubar/` — cero dependencias de crash reporting; el workflow `release.yml` publica `BrewBar.app.zip` sin Sentry, Crashlytics ni Apple MetricKit; los crashes en produccion de usuarios son totalmente invisibles para el equipo | Integrar Sentry macOS SDK (cero dependencias externas Swift ya es positivo, Sentry puede agregarse via SPM) o MetricKit para crash reporting nativo de Apple; configurar upload de dSYMs en el step de build del CI |
| Cero crash reporting en el TUI TypeScript | No conforme | Media | El TUI es una aplicacion Node.js; los errores no capturados en Ink no llegan a ninguna plataforma de monitoreo; el `runCli().catch(...)` en `src/index.tsx:96` es el unico handler global de errores no capturados | Agregar `process.on('uncaughtException', ...)` y `process.on('unhandledRejection', ...)` con logging a fichero antes de re-throw; considerar Sentry Node.js SDK para el TUI |
| 23+ bloques catch silenciosos en TypeScript | No conforme | Alta | Patrones `catch { }`, `catch { /* ... */ }`, `catch { return null; }` detectados en: `license-manager.ts` (3 bloques), `polar-api.ts` (1), `profile-manager.ts` (3), `history-logger.ts` (1), `cleanup-analyzer.ts` (2), `brew-store.ts` (1), `brew-api.ts` (1), `osv-api.ts` (1) y otros; errores con informacion de diagnostico se descartan silenciosamente | Auditoria de cada bloque `catch` silencioso: los que son "best effort" deben al menos loggear al nivel debug; los que pueden enmascarar fallos de negocio deben re-throw o loggear al nivel error |
| `LicenseChecker.decrypt()` falla silenciosamente en Swift | No conforme | Alta | `menubar/BrewBar/Sources/Services/LicenseChecker.swift` lineas 120-132: el bloque `catch` devuelve `nil` sin ninguna traza; un fallo de desencriptado (clave incorrecta, datos corruptos) es indistinguible de "licencia no encontrada" | Agregar logging con `os.Logger` al fallo de descifrado: nivel `fault` con el tipo de error (excluyendo datos sensibles) |

---

## 15.3 Analytics

### Checklist

* [ ] Eventos nombrados semanticamente — No existe ningun sistema de analytics en ninguno de los dos codebases; busqueda de `track(`, `logEvent(`, `Analytics.`, `AnalyticsService`, `sendEvent`, `Amplitude`, `Mixpanel`, `Segment`, `PostHog` devuelve cero resultados
* [ ] Taxonomia consistente — No aplica (no hay analytics)
* [ ] Sin duplicados — No aplica (no hay analytics)
* [ ] Eventos alineados con producto — No aplica (no hay analytics); el producto no tiene visibilidad sobre tasas de conversion free-to-pro, retention de usuarios Pro, ni uso de features individuales
* [ ] Funnels criticos medibles — No aplica (no hay analytics); el funnel de activacion (install → launch → activate → first Pro feature) no es visible

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Ausencia total de analytics de producto | No conforme | Alta | Busqueda exhaustiva en `src/` y `menubar/` devuelve cero implementaciones de analytics; el unico "telemetry" mencionado en el codigo es la validacion periodica contra la Polar API (comentario en `license-manager.ts:230`), que es telemetria de licencia del proveedor, no analytics de producto | Para un producto freemium donde la conversion a Pro es el KPI principal, implementar al minimo: `feature_viewed` (vistas Pro bloqueadas), `upgrade_prompt_shown`, `license_activated`, `license_deactivated`; considerar PostHog (self-hosted) o Plausible para privacidad |
| Uso de features Pro completamente opaco | No conforme | Alta | No existe ningun evento cuando el usuario usa Profiles, Smart Cleanup, History o Security Audit Pro; el equipo no puede saber cuales features Pro son las mas valoradas o cuales tienen friction | Instrumentar los 4 features Pro con eventos de uso: `profiles_view_opened`, `cleanup_analyzed`, `history_replayed`, `security_audit_run` |
| Sin telemetria de errores de usuario | No conforme | Media | Los errores que el usuario ve en las vistas (errores de brew, errores de red, errores de parse) no se registran en ninguna plataforma; la tasa de error real en produccion es desconocida | Agregar tracking de errores de usuario a los `errors.*` del brew-store con rate limiting para no spamear |

---

## 15.4 Metricas operativas

### Checklist

* [ ] Latencia — No existe medicion de latencia de ninguna operacion; las llamadas a `polar-api.ts`, `osv-api.ts`, los comandos `brew` (especialmente `brew doctor` que puede tardar 10-30s) no tienen instrumentacion de duracion
* [ ] Error rate — No existe tracking de tasa de error; la tasa de fallos de activacion, de errores de `brew install`, de errores de fetch del brew-store, o de crashes de BrewBar es completamente opaca
* [ ] Throughput — No aplica directamente (no es un servidor); pero para BrewBar, el numero de checks periodicos de Homebrew ejecutados no se mide
* [ ] Retried requests — `polar-api.ts` y `osv-api.ts` no implementan retry logic; `osv-api.ts` tiene un mecanismo de fallback de batch a one-by-one en caso de 400, pero no lo registra
* [ ] Job failures — `SchedulerService.check()` en BrewBar puede fallar silenciosamente si `BrewChecker.checkOutdated()` lanza; el error se propaga a `AppState` pero no se persiste ni se notifica al equipo
* [ ] SLA/SLO — No existen definiciones de SLA/SLO, health endpoints, ni configuracion de uptime monitoring; la disponibilidad del servicio de licencias (Polar) y del OSV.dev API no se monitorea

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin medicion de latencia de operaciones criticas | No conforme | Media | `src/lib/brew-cli.ts`: `execBrew` y `streamBrew` no miden ni registran duracion; `src/lib/license/polar-api.ts`: las llamadas HTTP no tienen timing; comandos lentos (`brew doctor`, `brew update`) no tienen timeout ni medicion | Agregar medicion de duracion con `performance.now()` o `Date.now()` en `execBrew` y en las llamadas HTTP a Polar/OSV; loggear duraciones que superen umbrales (ej. >5s para brew commands, >3s para HTTP) |
| `SchedulerService` falla silenciosamente en BrewBar | No conforme | Media | `menubar/BrewBar/Sources/Services/SchedulerService.swift` lineas 101-114: `check()` llama `state.refresh()` pero no tiene try/catch; si `BrewChecker.checkOutdated()` lanza un error no capturado, la sesion de `Task` lo absorbe silenciosamente | Envolver `await state.refresh()` en do-catch y loggear el error con `os.Logger`; considerar mostrar el ultimo error en el popover footer |
| Sin monitoreo de disponibilidad de servicios externos | No conforme | Baja | El producto depende de Polar API y OSV.dev sin ninguna configuracion de health check o alerta ante caida; si Polar API cae, todos los usuarios no pueden activar licencias sin ninguna visibilidad del equipo | Configurar un health check externo (ej. Better Uptime, UptimeRobot) sobre `https://api.polar.sh/v1/customer-portal/license-keys` y `https://api.osv.dev/v1/querybatch` |
| OSV.dev fallback one-by-one no instrumentado | No conforme | Baja | `src/lib/security/osv-api.ts` lineas 100-118: cuando el batch de 100 recibe 400, se cae a queries individuales; este fallback puede indicar un paquete problematico pero no se registra cual paquete lo causa | Loggear el nombre del paquete que triggerea el fallback para identificar paquetes con metadata incorrecta en Homebrew |
