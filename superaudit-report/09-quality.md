# 14. Testing y calidad / 15. Observabilidad y analitica

> Auditor: quality-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 mantiene una cobertura de test del **0%** en ambas codebases (TypeScript y Swift). La version 0.2.0 introduce dos mejoras verificadas respecto a v0.1.0: `NODE_ENV` se inyecta en tiempo de compilacion via tsup, y el workflow `release.yml` ejecuta `typecheck` y `test` antes de publicar; sin embargo, al no existir ningun test, el paso `npm run test` siempre pasa en verde de forma vacia, ofreciendo una falsa garantia de calidad. La observabilidad es igualmente inexistente: ni crash reporting, ni analytics, ni logging estructurado en ninguno de los dos targets.

---

## Metricas de testing

* **Total archivos de test:** 0
* **Total metodos de test:** 0
* **Frameworks de test:** vitest ^3.0.0 (instalado, sin configuracion ni tests), ink-testing-library ^4.0.0 (instalado, sin uso)
* **Tests unitarios:** 0
* **Tests de integracion:** 0
* **Tests de UI:** 0
* **Tests de snapshot:** 0
* **Tests deshabilitados/saltados:** 0 (no aplica — no existen tests)
* **Targets de test Swift (XCTest):** 0 — `menubar/Project.swift` define un unico target `BrewBar` sin target de tests

---

## 14.1 Unit tests

### Checklist

* [ ] Casos de uso cubiertos — No existe ningun archivo de test. Las funciones `activate`, `revalidate`, `deactivate`, `analyzeCleanup`, `runSecurityAudit`, `exportCurrentSetup`, `importProfile` no tienen ni un unico test.
* [ ] Logica de dominio cubierta — `license-manager.ts`, `cleanup-analyzer.ts`, `osv-api.ts`, `history-logger.ts` no tienen tests. La logica de degradacion gradual (`getDegradationLevel`) y el rate limiting de activaciones son criticos y carecen de cobertura.
* [ ] Mapping cubierto — `json-parser.ts` y `text-parser.ts` contienen funciones de parseo puras (`parseInstalledJson`, `parseOutdatedJson`, `parseSearchResults`, `parseDoctorOutput`, `parseBrewConfig`) ideales para tests unitarios; ningun test existe.
* [ ] Validaciones cubiertas — `validateProfileName`, `validateLicenseKey`, `validateApiUrl` (polar-api.ts), validaciones de patrones `TAP_PATTERN`/`PKG_PATTERN` (profile-manager.ts) no estan cubiertas por ningun test.
* [ ] Casos borde cubiertos — Ningun caso borde cubierto: inputs vacios, nil/undefined, tokens malformados, respuestas JSON truncadas, fechas invalidas en licencia.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cobertura unit tests = 0% | No conforme | Critica | 0 archivos `.test.ts` en todo `src/` | Implementar tests unitarios comenzando por `parsers/`, `license-manager.ts` y `utils/format.ts` |
| `getDegradationLevel` sin test | No conforme | Critica | `src/lib/license/license-manager.ts:179` — logica de time-bomb critica para el modelo de negocio | Cubrir todos los rangos de tiempo (0-7d, 7-14d, 14-30d, 30+d) con tests de fecha inyectada |
| Rate limiting en memoria sin test | No conforme | Alta | `src/lib/license/license-manager.ts:29-58` — `checkRateLimit` y `recordAttempt` sin tests | Verificar lockout tras MAX_ATTEMPTS y reset en caso de exito |
| Parsers puros sin test | No conforme | Alta | `src/lib/parsers/json-parser.ts`, `src/lib/parsers/text-parser.ts` — funciones deterministicas sin tests | Crear `json-parser.test.ts` y `text-parser.test.ts` con fixtures de output real de brew |
| `validateProfileName` sin test | No conforme | Alta | `src/lib/profiles/profile-manager.ts:25-35` — path traversal prevention sin cobertura | Cubrir: nombre vacio, longitud maxima, caracteres especiales, `../` traversal |
| Canary functions sin test | No conforme | Media | `src/lib/license/canary.ts` — `checkCanaries()` no verificado por tests automatizados | Anadir test que verifique que `isProUnlocked()`, `hasProAccess()`, `isLicenseValid()` retornan false |

---

## 14.2 Integration tests

### Checklist

* [ ] Repositorios — No existen tests de integracion para operaciones de escritura/lectura de `profile-manager.ts`, `history-logger.ts` o `license-manager.ts` contra el sistema de archivos.
* [ ] Persistencia — No hay tests con filesystem temporal (`tmp` dir) que verifiquen atomic save (write + rename), permisos de archivo (0o600), migracion de formato legacy a encrypted.
* [ ] Red — No hay tests para `polar-api.ts` (activacion/validacion/desactivacion Polar) ni para `osv-api.ts` (batch query, fallback one-by-one en HTTP 400) usando interceptores de red (MSW, nock, etc).
* [ ] Autenticacion — Ningun test cubre el flujo completo de activacion → guardado cifrado → carga → revalidacion → degradacion.
* [ ] Sincronizacion — No aplica (no hay sincronizacion entre dispositivos, solo lectura/escritura local).

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Flujo de licencia sin test end-to-end | No conforme | Critica | `src/lib/license/` — 10 archivos, 0 tests | Crear test de integracion con filesystem temporal: activate → saveLicense → loadLicense → decrypt → revalidate |
| AES-256-GCM round-trip sin verificacion | No conforme | Alta | `src/lib/license/license-manager.ts:73-103` — cifrado/descifrado sin test | Test que encripte y desencripte datos de licencia verificando integridad del GCM tag |
| `polar-api.ts` sin mock de red | No conforme | Alta | `src/lib/license/polar-api.ts` — calls a `https://api.polar.sh` sin test | Usar `vi.mock` o MSW para simular respuestas de Polar: activacion exitosa, clave invalida, red caida |
| `osv-api.ts` fallback HTTP 400 sin test | No conforme | Alta | `src/lib/security/osv-api.ts:72-77` — rama critica de recuperacion sin test | Test que simule HTTP 400 del batch y verifique fallback a `queryOneByOne` |
| Persistencia de historial sin test | No conforme | Media | `src/lib/history/history-logger.ts` — atomic save y limite MAX_ENTRIES sin test | Test con directorio temporal: appendEntry x 1001 entradas → verificar truncado a 1000 |

---

## 14.3 UI tests

### Checklist

* [ ] Flujos criticos — No existen tests de UI para ningun flujo del TUI (TypeScript/Ink) ni para BrewBar (Swift/SwiftUI). `ink-testing-library` esta instalado pero sin uso.
* [ ] Estados de error — Ninguna pantalla de error verificada automaticamente.
* [ ] Navegacion principal — Ningun test de navegacion entre las 12 vistas del TUI.
* [ ] Acciones destructivas — Las confirmaciones de desinstalacion (`ConfirmDialog`) y borrado de historial no estan cubiertas por ningun test.
* [ ] Permisos del sistema — No aplica para el TUI. Para BrewBar, el flujo de `requestNotificationPermission` no tiene XCUITest.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `ink-testing-library` instalada sin uso | No conforme | Alta | `package.json` devDependencies — `ink-testing-library ^4.0.0` sin ningun test que la importe | Crear tests de renderizado para componentes criticos: `ConfirmDialog`, `StatusBadge`, `ProgressLog` |
| Flujo de activacion de licencia sin test de UI | No conforme | Alta | `src/views/account.tsx` — pantalla de activacion de licencia sin cobertura | Crear test con `ink-testing-library` que verifique el estado inicial, el formulario de activacion y el estado Pro |
| BrewBar sin XCUITest target | No conforme | Media | `menubar/Project.swift` — 0 targets de test definidos | Anadir target de tests a `Project.swift` e implementar al menos un smoke test de arranque |
| `ConfirmDialog` sin test de aceptacion/rechazo | No conforme | Media | `src/components/common/confirm-dialog.tsx` — componente critico para acciones destructivas | Testear que el componente responde correctamente a `y`/`Y` (en) y `s`/`S` (es) |

---

## 14.4 Snapshot / visual regression

### Checklist

* [ ] Componentes base — No existe ninguna herramienta de snapshot/visual regression instalada o configurada.
* [ ] Pantallas clave — No aplica (no hay infraestructura).
* [ ] Dark mode — No aplica (TUI usa colores ANSI; BrewBar soporta dark mode por SwiftUI pero sin tests).
* [ ] Dynamic Type — No aplica para el TUI. Para BrewBar, sin cobertura.
* [ ] Localizacion larga — No aplica (sin infraestructura de snapshot).

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin herramienta de snapshot/visual regression | No conforme | Baja | No se encontro ninguna dependencia de snapshot testing en `package.json` ni en `menubar/Project.swift` | Evaluar `swift-snapshot-testing` para BrewBar y snapshots de output de texto para el TUI una vez que existan tests basicos |

---

## 14.5 Calidad del set de pruebas

### Checklist

* [ ] Tests estables — No aplica: no existen tests.
* [ ] No flakes frecuentes — No aplica: no existen tests.
* [ ] Fixtures claros — No aplica: no existen fixtures.
* [ ] Datos de prueba mantenibles — No aplica: no existen datos de prueba.
* [ ] Tiempo de suite razonable — `npm run test` se completa en <1 segundo porque no hay tests que ejecutar. El paso en CI es un false-green.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `npm run test` pasa en vacio en CI | No conforme | Critica | `.github/workflows/release.yml:25` — `npm run test` se ejecuta antes de publicar pero vitest no tiene ningun test que ejecutar; retorna 0 sin ejecutar nada | Configurar vitest con `--passWithNoTests false` (o equivalente) hasta que existan tests, o bloquear el release hasta alcanzar cobertura minima |
| Polling de 100ms en `streamBrew` | No conforme | Baja | `src/lib/brew-cli.ts:65` — `await new Promise((r) => setTimeout(r, 100))` con TODO documentado | Reemplazar el polling por patron event-driven usando `stdout.on('data')` antes de escribir tests de esta funcion |
| `vitest` sin archivo de configuracion | No conforme | Media | No se encontro `vitest.config.ts` ni `vitest.config.js` en el proyecto | Crear `vitest.config.ts` definiendo: directorio de tests, timeout, cobertura (`@vitest/coverage-v8`), variables globales para `__TEST_MODE__` |

---

## Matriz de cobertura util

| Zona | Tipo de test | Cobertura real | Riesgo sin cubrir | Accion |
|------|--------------|----------------|-------------------|--------|
| Domain models (`src/lib/types.ts`) | Unit | Sin cubrir | Bajo — solo tipos TypeScript | No prioritario |
| Parsers (`json-parser.ts`, `text-parser.ts`) | Unit | Sin cubrir | Alto — parseo incorrecto crashea la UI | Prioridad 1: tests unitarios con fixtures de brew reales |
| License manager (`license-manager.ts`) | Unit + Integration | Sin cubrir | Critico — modelo de negocio depende de esto | Prioridad 1: cubrir todos los estados y la logica de degradacion |
| Polar API (`polar-api.ts`) | Integration (mock) | Sin cubrir | Alto — fallo silencioso en activacion | Mock de red con respuestas de exito y error |
| OSV API (`osv-api.ts`) | Integration (mock) | Sin cubrir | Medio — fallback HTTP 400 no verificado | Mock que fuerce el fallback one-by-one |
| ViewModels / Stores (Zustand) | Unit | Sin cubrir | Alto — stores manejan estado critico de licencia y brew | Tests unitarios de transitions de estado |
| Views (TUI Ink) | UI (ink-testing-library) | Sin cubrir | Medio — regresiones en componentes criticos no detectadas | Prioridad 2: `ConfirmDialog`, `UpgradePrompt`, `AccountView` |
| Navegacion (`navigation-store.ts`) | Unit | Sin cubrir | Medio — ciclos de navegacion no verificados | Tests de las transiciones entre vistas y el back-stack |
| Networking (brew-cli) | Unit | Sin cubrir | Medio — polling workaround documentado como TODO | Tests tras refactorizar el polling |
| Autenticacion (flujo completo) | Integration | Sin cubrir | Critico — flujo activate→persist→load→verify sin test | Test end-to-end con filesystem temporal |
| Persistencia (history, profiles, license) | Integration | Sin cubrir | Alto — atomic save, permisos 0o600, truncado no verificados | Tests con directorios temporales de sistema de archivos |
| Sync | No aplica | No aplica | — | — |
| Componentes UI comunes (`src/components/common/`) | Unit + Snapshot | Sin cubrir | Medio — regresiones de renderizado no detectadas | ink-testing-library tras crear la infraestructura de test |
| BrewBar (Views Swift) | XCUITest | Sin cubrir | Medio — ninguna pantalla verificada | Anadir target de tests al `Project.swift` |
| BrewBar (Services Swift) | Unit (XCTest) | Sin cubrir | Alto — `BrewChecker`, `LicenseChecker`, `SchedulerService` sin tests | Anadir target XCTest con mocks de Process/URLSession |

---

## 15.1 Logging

### Checklist

* [ ] Logs estructurados — El proyecto no usa ningun sistema de logging estructurado. En TypeScript, se usan exclusivamente `console.log/error/warn` (22 llamadas, todas en `index.tsx` para output de CLI y una en `brew-store.ts`). En Swift, no existe ninguna llamada a `print`, `NSLog`, `os_log`, `Logger` ni `OSLog` en ningun archivo de `Sources/`.
* [ ] Niveles correctos — TypeScript: los niveles `log/error/warn` se usan de forma apropiada en el CLI de activacion/desactivacion, pero no existe un sistema formal de niveles. Swift: sin logging en absoluto.
* [x] Sin datos sensibles — El `customerEmail` se muestra en stdout como parte de la respuesta al usuario en los comandos `activate` y `status` (`src/index.tsx:22, :62`). Este es el email del propio usuario mostrado intencionalmente como confirmacion de CLI, no un leak de PII en logs internos. Conforme.
* [ ] Correlacion frontend/backend — No existe correlation ID ni request ID en las llamadas a Polar.sh ni a OSV.dev.
* [ ] Eventos criticos registrados — Las operaciones criticas (fallo de activacion de licencia, fallo de revalidacion, fallo de BrewChecker en Swift) no producen ninguna entrada de log observable ni agregable.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin logging estructurado en TypeScript | No conforme | Alta | 22 `console.*` dispersas, ninguna con metadatos estructurados ni niveles formales | Adoptar `pino` o `winston` con nivel configurable; o como minimo definir un wrapper `logger.ts` con niveles y contexto |
| Swift sin logging absolutamente | No conforme | Alta | 0 llamadas a `Logger`/`OSLog`/`print` en los 12 archivos de `Sources/` — fallos silenciosos en `BrewChecker`, `SchedulerService`, `AppState` | Integrar `os.Logger` con subsistema `com.molinesdesigns.brewbar` para errores de proceso brew, fallos de notificacion y errores de licencia |
| `console.error` en brew-store solo en desarrollo | No conforme | Media | `src/stores/brew-store.ts:121-123` — el unico log de error en stores esta gateado por `NODE_ENV !== 'production'`; errores de `fetchLeaves` son silenciosos en produccion | Loguear errores no criticos en produccion al menos con una referencia de error opaca (sin PII) |
| Sin correlacion de requests | No conforme | Baja | `src/lib/license/polar-api.ts`, `src/lib/security/osv-api.ts` — no se envian ni registran request IDs | Generar `X-Request-ID` por llamada y loguearlo para facilitar debugging de fallos de red |

---

## 15.2 Crash y diagnostico

### Checklist

* [ ] Crash reporting configurado — No se encontro ninguna integracion de crash reporting en TypeScript (sin `@sentry/node`, sin Firebase Crashlytics, sin Bugsnag) ni en Swift (sin `FirebaseCrashlytics`, sin `SentrySDK`, sin `Bugsnag`).
* [ ] Symbolication verificada — El build de TypeScript tiene `sourcemap: false` en `tsup.config.ts`. El build de Swift Release en CI no configura carga de dSYM (`release.yml` no contiene ninguna referencia a dSYM, Instruments ni servicio de symbolication).
* [ ] Trazas utiles — Sin crash reporting no hay trazas ni breadcrumbs.
* [ ] Alertas caidas criticas — Sin crash reporting no hay alertas.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin crash reporting en TypeScript | No conforme | Alta | `package.json` — ninguna dependencia de Sentry, Bugsnag ni equivalente | Integrar `@sentry/node` con DSN de ambiente; capturar como minimo errores no manejados del proceso principal |
| Sin crash reporting en BrewBar (Swift) | No conforme | Alta | `menubar/Project.swift` — ninguna dependencia de Sentry, Firebase ni Crashlytics | Integrar Sentry para macOS via Swift Package Manager o Tuist; configurar carga automatica de dSYM en CI |
| Sourcemaps deshabilitados en produccion | No conforme | Media | `tsup.config.ts:13` — `sourcemap: false` | Habilitar `sourcemap: true` o mantener sourcemaps en artifacts de release para facilitar debugging de crashes reportados manualmente |
| dSYM no preservado en CI | No conforme | Media | `.github/workflows/release.yml:60-76` — `xcodebuild` produce dSYM pero el artifact empaquetado es solo `BrewBar.app.zip` sin dSYM | Modificar el paso de empaquetado para incluir el dSYM en el artifact o subirlo a un servicio de symbolication |

---

## 15.3 Analytics

### Checklist

* [ ] Eventos nombrados semanticamente — No existe ningun sistema de analytics en el proyecto. No se encontraron llamadas a `track(`, `logEvent(`, `Analytics.`, `sendEvent` ni equivalentes en TypeScript ni en Swift.
* [ ] Taxonomia consistente — No aplica (sin analytics).
* [ ] Sin duplicados — No aplica (sin analytics).
* [ ] Eventos alineados con producto — No aplica (sin analytics). No hay medicion de activaciones, uso de features Pro, tasas de retencion ni conversion.
* [ ] Funnels criticos medibles — No aplica (sin analytics). El funnel de activacion Pro (free → activate → pro) no es medible sin analytics.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin analytics en TUI ni BrewBar | No conforme | Media | 0 referencias a cualquier SDK de analytics en ambas codebases | Para un producto freemium es critico medir el funnel de conversion. Integrar analytics con privacidad (PostHog self-hosted o Mixpanel) con opt-in explicito. Minimo: evento de activacion Pro, uso de features Pro, frecuencia de uso del TUI |
| Funnel de activacion Pro no medible | No conforme | Media | No existe ninguna llamada de tracking en `src/lib/license/license-manager.ts:activate()` | Registrar evento anonimo `license_activated` con metadatos no-PII (plan, timestamp) |

---

## 15.4 Metricas operativas

### Checklist

* [ ] Latencia — No se mide la latencia de ningun API call (Polar.sh, OSV.dev) ni del tiempo de ejecucion de comandos brew.
* [ ] Error rate — No existe agregacion de tasas de error. Los errores se muestran en UI pero no se contabilizan ni persisten.
* [ ] Throughput — No aplica como metrica operativa para una herramienta CLI/menubar local.
* [ ] Retried requests — El unico retry implementado es el de `deactivate` en `license-manager.ts` (3 intentos); no se registra ni exporta como metrica.
* [ ] Job failures — `SchedulerService.check()` en Swift captura errores de `AppState.refresh()` pero los asigna a `state.error` (string en UI) sin ninguna persistencia ni alerta externa.
* [ ] SLA/SLO — No aplica para una herramienta CLI/menubar local de usuario individual. No existe ningun health endpoint.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin medicion de latencia de APIs externas | No conforme | Media | `src/lib/fetch-timeout.ts` tiene timeout de 15s pero no registra duracion real | Anadir instrumentacion basica: `Date.now()` antes/despues de cada `fetchWithTimeout`, loguearlo en modo debug |
| Fallos de SchedulerService silenciosos en produccion | No conforme | Media | `menubar/BrewBar/Sources/Models/AppState.swift:33-43` — errores de `checkOutdated` y `checkServices` se asignan a `self.error` (string en UI) pero no se persisten ni reportan | Persistir el ultimo error en `UserDefaults` con timestamp para facilitar diagnostico; integrar con crash reporting cuando exista |
| Sin SLA/SLO definidos | No conforme | Baja | Ninguna definicion de uptime, latencia maxima aceptable ni politica de disponibilidad de OSV.dev/Polar.sh | Documentar limites de aceptabilidad para OSV.dev (maximo 15s ya configurado) y Polar.sh (maximo 15s ya configurado); anadir health check de dependencias en pantalla de Account |
