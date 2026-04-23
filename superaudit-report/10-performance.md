# 16. Rendimiento

> Auditor: performance-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

Brew-TUI presenta una arquitectura de rendimiento generalmente solida para una aplicacion TUI, con patrones correctos de debounce, virtualizacion de listas y streaming acotado. Sin embargo, existen bottlenecks criticos en el arranque: la inicializacion de licencia bloquea el event loop con `scryptSync` e I/O sincrona al cargarse el modulo, y `fetchAll()` serializa `brew update` antes de cualquier dato de UI. En BrewBar, el timer de badge a 2 segundos y las llamadas secuenciales en `refresh()` representan desperdicios energeticos y de latencia evitables.

## Metricas de analisis

* **Total vistas TUI (React/Ink) analizadas:** 12
* **Total vistas SwiftUI (BrewBar) analizadas:** 3
* **Total listas/colecciones con scroll:** 5 (InstalledView, OutdatedView, HistoryView, SearchView, OutdatedListView)
* **Total sitios de llamada de red detectados:** 7 (Polar activate, Polar validate, Polar deactivate, OSV batch, OSV fallback, GitHub download, Homebrew formulae index)
* **Total queries backend detectadas:** 0 (no existe capa backend en el proyecto)
* **Patrones de cache detectados:** 0
* **Problemas de rendimiento potenciales:** 18

---

## 16.1 App

### Checklist

* [ ] **Launch time aceptable** — `scryptSync` bloquea el event loop en el import de `license-manager.ts` (linea 65); `readFileSync` ejecuta I/O sincrona en el import de `integrity.ts` (linea 23). Ambos ocurren antes de que se renderice el primer frame.
* [ ] **First meaningful interaction aceptable** — `fetchAll()` en `brew-store.ts` serializa `brew update` (potencialmente 5-30 segundos de espera de red) antes de iniciar las cargas paralelas. La UI queda en estado loading hasta que `brew update` termina.
* [x] **Scroll fluido** — InstalledView, HistoryView y SearchView implementan `MAX_VISIBLE_ROWS=20`. OutdatedView carece de virtualizacion; para instalaciones con muchos paquetes desactualizados podria causar render lento. BrewBar usa `LazyVStack` correctamente en `OutdatedListView`.
* [ ] **Memoria controlada** — `GradientText` en `gradient.tsx` renderiza un elemento `<Text>` por caracter: el logo BREW (28 chars × 6 filas = 168 elementos) + logo TUI (15 × 6 = 90 elementos) = ~258 nodos React creados en cada render del Header. El Header se renderiza en cada vista del TUI. `history-logger.ts` carga el archivo completo en memoria en cada `appendEntry()`, aunque esta acotado a 1000 entradas.
* [ ] **CPU controlada** — `streamBrew()` en `brew-cli.ts` linea 61 usa un bucle de busy-polling con `setTimeout(r, 50)` para detectar nuevas lineas del child process. Genera 20 wake cycles por segundo durante toda operacion de instalacion/upgrade. `verifyPro()` ejecuta `readFileSync` en cada invocacion desde `requirePro()`, llamado en cada operacion de cleanup, historial y perfiles.
* [x] **Bateria razonable (TUI)** — El store de licencia usa `setInterval` con `.unref()` (intervalo 1h), lo que no impide la salida del proceso. No hay polling agresivo en el codebase TypeScript mas alla del busy-poll de `streamBrew` (activo solo durante operaciones).
* [ ] **Bateria razonable (BrewBar)** — `AppDelegate.swift` linea 40: `Timer.scheduledTimer(withTimeInterval: 2, repeats: true)` ejecuta la comprobacion de badge cada 2 segundos de forma continua mientras la app esta en ejecucion.
* [x] **Overdraw revisado** — Ink renderiza en terminal (no GPU), el concepto de overdraw no aplica directamente. En BrewBar las vistas SwiftUI son simples (listas, texto, botones) sin capas de fondo superpuestas problematicas.
* [x] **Decodificacion de imagen optimizada** — No se usan imagenes en el TUI. BrewBar usa `Image(systemName:)` exclusivamente (SF Symbols, sin decodificacion de imagen externa).
* [ ] **Lazy loading donde procede** — OutdatedView renderiza `allOutdated.map(...)` sin limite de filas visibles. Para usuarios con 50+ paquetes desactualizados, todos los elementos se renderizan inmediatamente. `AppState.refresh()` en BrewBar ejecuta `checkOutdated()` y `checkServices()` de forma secuencial en lugar de concurrente.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `scryptSync` al cargar modulo | No conforme | Alta | `src/lib/license/license-manager.ts:65` — `const _derivedKey = scryptSync(...)` ejecutado en tiempo de import, bloqueando el event loop con derivacion de clave CPU-bound (N=16384 iteraciones) | Mover a inicializacion lazy dentro de `deriveEncryptionKey()` con memoizacion: `if (!_key) _key = scryptSync(...); return _key;` — solo ejecuta la primera vez que se necesita, no en el import |
| `readFileSync` al cargar modulo | No conforme | Alta | `src/lib/license/integrity.ts:23` — `_baselineHash = _captureBaseline()` ejecutado en tiempo de import; `_captureBaseline()` llama `readFileSync` sobre el bundle | Mover la captura de baseline a una funcion `initIntegrity()` llamada de forma asincrona al inicio, o usar `readFile` async dentro de una `Promise` que se resuelve antes de que se necesite el hash |
| `fetchAll()` secuencial con `brew update` | No conforme | Alta | `src/stores/brew-store.ts:136-138` — `await api.brewUpdate()` bloquea todas las cargas de datos hasta que `brew update` completa (puede tardar 5-30s con red lenta) | Ejecutar `brew update` en background sin esperar su resultado para el renderizado inicial: `api.brewUpdate().catch(() => {})` y despues lanzar el `Promise.all` inmediatamente. Mostrar indicador de "actualizando indices" de forma no bloqueante |
| `GradientText` por caracter en Header | No conforme | Media | `src/utils/gradient.tsx` — un `<Text>` por caracter; `src/components/layout/header.tsx:63-66` renderiza los logos en cada vista (~258 elementos React por render de Header) | Memoizar el componente del logo con `React.memo` y `useMemo` para el array de caracteres. Dado que el gradiente es estatico, calcularlo una sola vez fuera del componente o en un `useMemo` sin dependencias dinamicas |
| Busy-polling en `streamBrew()` | No conforme | Media | `src/lib/brew-cli.ts:61` — `await new Promise((r) => setTimeout(r, 50))` en bucle activo durante todo el streaming de child process | Reemplazar el polling con eventos del readable stream: escuchar `process.stdout.on('data', ...)` y usar un `AsyncQueue` o `Readable.asyncIterator()` nativo de Node.js para eliminar los 20 wake cycles/segundo |
| `verifyPro()` con I/O sincrona en cada operacion | No conforme | Media | `src/lib/license/pro-guard.ts` — `checkBundleIntegrity()` llama `readFileSync` en cada invocacion; `requirePro()` llama `verifyPro()` desde cleanup-analyzer, history-logger y profile-manager en cada operacion | Cachear el resultado de `checkBundleIntegrity()` con TTL de 60s o durante el tiempo de vida del proceso. El hash del bundle no cambia durante la ejecucion; re-leerlo en cada operacion es I/O innecesaria |
| OutdatedView sin virtualizacion de filas | No conforme | Baja | `src/views/outdated.tsx` — `allOutdated.map(...)` sin `MAX_VISIBLE_ROWS`; contrasta con InstalledView y HistoryView que si lo implementan | Aplicar el mismo patron `MAX_VISIBLE_ROWS = 20` + `selectedIndex` + `slice(scrollOffset, scrollOffset + MAX_VISIBLE_ROWS)` ya implementado en InstalledView |
| `AppState.refresh()` secuencial en BrewBar | No conforme | Media | `menubar/BrewBar/Sources/Models/AppState.swift:25,32` — `await checker.checkOutdated()` seguido de `await checker.checkServices()` en serie; cada uno spawn un `Process` | Usar `async let`: `async let outdated = checker.checkOutdated(); async let services = checker.checkServices(); self.outdatedPackages = try await outdated; self.services = try await services` |
| Timer de badge a 2 segundos en BrewBar | No conforme | Media | `menubar/BrewBar/Sources/App/AppDelegate.swift:40` — `Timer.scheduledTimer(withTimeInterval: 2, repeats: true)` ejecutandose continuamente | Aumentar el intervalo a 30-60 segundos para actualizar el badge. El recuento de paquetes desactualizados no cambia con frecuencia de 2s; el usuario no percibiria diferencia |
| Timeout leak en `BrewChecker` | No conforme | Baja | `menubar/BrewBar/Sources/Services/BrewChecker.swift:78` — el bloque `asyncAfter` del timeout NO se cancela cuando el proceso termina exitosamente; la closure queda en flight hasta que el timeout de 60s se dispara igualmente | Capturar el `DispatchWorkItem` del timeout y llamar `.cancel()` en los completion handlers del proceso: `let timeoutWork = DispatchWorkItem { ... }; process.terminationHandler = { _ in timeoutWork.cancel(); ... }` |
| `history-logger.ts` lectura/escritura completa | No conforme | Baja | `src/lib/history/history-logger.ts` — `appendEntry()` lee todo el archivo JSON, modifica el array en memoria, escribe todo el archivo en cada llamada. Con 1000 entradas y escrituras frecuentes (cada install/upgrade/uninstall) genera I/O innecesaria | Considerar formato NDJSON (newline-delimited JSON) para poder hacer append sin leer el archivo completo. O mantener el archivo JSON pero limitar la escritura sincrona a operaciones que el usuario ya espera completar |
| `NSHostingController` recreado en cada apertura de popover | No conforme | Baja | `menubar/BrewBar/Sources/App/AppDelegate.swift:175` — `NSHostingController(rootView: PopoverView(...))` se instancia de nuevo en cada apertura del popover; SwiftUI construye el arbol de vistas completo cada vez | Crear el `hostingController` como propiedad del `AppDelegate` en `applicationDidFinishLaunching` y reutilizarlo en cada apertura; actualizar solo el `AppState` observable |

---

## 16.2 Red

### Checklist

* [x] **Payloads razonables** — Las peticiones a Polar.sh envian solo `key`, `organization_id`, `label`/`activation_id`. Las peticiones a OSV.dev envian batches de 100 paquetes con `name`/`version`/`ecosystem`. No hay over-fetching ni imagenes embebidas en JSON.
* [ ] **Paginacion correcta** — OSV.dev no requiere paginacion (batch por diseno). Polar.sh no requiere paginacion (operaciones de un solo recurso). Sin embargo, la llamada a `queryOneByOne` en `osv-api.ts` ejecuta N peticiones secuenciales sin ninguna forma de limitar la tasa; para instalaciones grandes (200+ paquetes) puede generar cientos de peticiones en serie.
* [x] **Compresion donde aplica** — `fetch()` nativo de Node.js 18+ negocia automaticamente `Accept-Encoding: gzip, deflate, br`. No se requiere configuracion manual.
* [ ] **Cache HTTP** — No existe ningun mecanismo de cache para las respuestas de Polar.sh ni de OSV.dev. Cada montaje de `SecurityAuditView` dispara un escaneo completo contra OSV.dev sin verificar si los resultados recientes aun son validos. No hay `URLCache` equivalente configurado.
* [x] **Reintentos controlados** — No existe logica de reintentos en ninguna capa de red. Esto evita el riesgo de reintentos agresivos o loops infinitos. El manejo de errores usa `try/catch` con propagacion directa al usuario. Aceptable para operaciones interactivas donde el usuario puede reintentar manualmente.
* [ ] **Timeouts definidos** — Ningun `fetch()` en el codebase configura `signal: AbortController`. Afecta: `polar-api.ts:45` (activate), `polar-api.ts:79` (validate en activation), `polar-api.ts:107` (revalidate), `polar-api.ts:130` (deactivate), `osv-api.ts:64` (batch query), `osv-api.ts` (fallback one-by-one), `brewbar-installer.ts:42` (GitHub download). Una red congestionada o un servidor que no responde puede colgar la operacion indefinidamente.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin timeout en fetch() — Polar API | No conforme | Alta | `src/lib/license/polar-api.ts:45` — `fetch(url, { method: 'POST', headers, body })` sin `signal`. Afecta activacion, validacion y desactivacion de licencias | Crear un `AbortController` con `setTimeout(controller.abort, 15000)` y pasar `signal: controller.signal` a cada `fetch()`. Envolver en helper: `fetchWithTimeout(url, options, timeoutMs = 15000)` |
| Sin timeout en fetch() — OSV.dev | No conforme | Alta | `src/lib/security/osv-api.ts:64` — `fetch(OSV_BATCH_URL, ...)` sin `signal`. Un escaneo de seguridad puede quedar colgado indefinidamente si OSV.dev no responde | Aplicar el mismo patron `AbortController` con timeout de 30s para queries batch (son payloads mas grandes) |
| Sin timeout en fetch() — GitHub download | No conforme | Media | `src/lib/brewbar-installer.ts:42` — `fetch(DOWNLOAD_URL)` para descargar el binario de BrewBar sin timeout. Descarga de red lenta puede bloquear el CLI subcommand indefinidamente | Aplicar timeout de 120s (descarga de binario puede ser lenta en conexiones lentas) con feedback de progreso si la descarga supera N segundos |
| Sin cache de resultados OSV | No conforme | Media | `src/views/security-audit.tsx` — `useEffect(() => { scan(); }, [])` dispara escaneo completo en cada montaje de la vista. `osv-api.ts` no cachea resultados. Con 200+ paquetes instalados cada navegacion a SecurityAudit genera 2+ peticiones batch a OSV.dev | Guardar los resultados del ultimo escaneo con timestamp en el store de seguridad. Mostrar resultados cacheados si tienen menos de 1 hora, con opcion de forzar rescan. Evitar re-escanear en cada navegacion a la vista |
| `queryOneByOne` sin rate limiting | No conforme | Media | `src/lib/security/osv-api.ts` — el path de fallback hace peticiones secuenciales O(N) sin ninguna pausa entre ellas. Para N=200 paquetes son 200 peticiones HTTP consecutivas al mismo endpoint | Agregar un delay minimo entre peticiones en el fallback (50-100ms) o usar el batch endpoint exclusivamente con reintentos por sub-batch en caso de error parcial |
| Activacion realiza 2 peticiones secuenciales | No conforme | Baja | `src/lib/license/polar-api.ts:79-88` — `activateLicense()` hace POST a `activate`, luego inmediatamente otro POST a `validate` para obtener `customerEmail`/`customerName`. Son dos round-trips en serie | Si la API de Polar no incluye datos del cliente en la respuesta de activate, documentarlo como limitacion conocida. Si Polar ofrece un endpoint unificado, usarlo. De lo contrario, el segundo request podria hacerse en background sin bloquear el flujo de activacion |

---

## 16.3 Backend

> No existe codigo de backend en este proyecto. Brew-TUI es una aplicacion cliente (TUI + menubar) que se comunica directamente con APIs externas (Polar.sh, OSV.dev) y con el binario local de Homebrew. No hay servidor Express, base de datos Prisma, jobs de cola ni infraestructura de backend propia.

### Checklist

* [ ] **Queries eficientes** — No aplica
* [ ] **Indices correctos** — No aplica
* [ ] **No N+1 queries** — No aplica
* [ ] **Jobs dimensionados** — No aplica
* [ ] **Memoria servicio estable** — No aplica
* [ ] **Observabilidad hotspots** — No aplica

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Queries eficientes | No aplica | — | No existe capa de base de datos ni backend propio | — |
| Indices correctos | No aplica | — | No existe schema de base de datos | — |
| No N+1 queries | No aplica | — | No existe ORM ni acceso a base de datos | — |
| Jobs dimensionados | No aplica | — | No existen workers ni sistemas de cola de mensajes | — |
| Memoria servicio estable | No aplica | — | No existe proceso servidor de larga duracion | — |
| Observabilidad hotspots | No aplica | — | No existe infraestructura de backend a monitorizar | — |

---

## Registro de performance

| Zona | Metrica | Resultado | Umbral | Estado | Accion |
|------|---------|-----------|--------|--------|--------|
| Launch — TUI | Bloqueo sincrono en import | `scryptSync` (N=16384) + `readFileSync` ejecutados al cargar modulos `license-manager` e `integrity` | Cero I/O sincrona en el path critico de arranque | No conforme | Mover a inicializacion lazy con memoizacion; usar `readFile` async |
| Launch — TUI | Serializacion de `brew update` | `fetchAll()` espera `brew update` (~5-30s) antes de iniciar cargas paralelas | `brew update` no debe bloquear el renderizado inicial de datos | No conforme | Ejecutar `brew update` en background; iniciar `Promise.all` de datos inmediatamente |
| Render — TUI | Elementos React por frame de Header | ~258 nodos `<Text>` para logos ASCII degradados en cada render de Header | <50 nodos para elementos estaticos reutilizados | No conforme | `React.memo` + `useMemo` estatico para logos; calcular gradiente una sola vez |
| Render — TUI | Virtualizacion de OutdatedView | `allOutdated.map(...)` sin limite; N filas renderizadas para N paquetes desactualizados | Max 20 filas visibles (patron ya establecido en InstalledView) | No conforme | Aplicar `MAX_VISIBLE_ROWS=20` + virtual scroll con `slice(offset, offset+20)` |
| CPU — TUI | Busy-poll en streaming | 20 `setTimeout(50ms)` wake-ups por segundo durante cada operacion de install/upgrade | Cero wake cycles idle; usar eventos de stream | No conforme | Sustituir polling por `AsyncIterator` nativo del readable stream |
| CPU — TUI | `readFileSync` en cada operacion Pro | `checkBundleIntegrity()` lee el bundle desde disco en cada `requirePro()` call | Una lectura por sesion (resultado cacheado) | No conforme | Cachear resultado con TTL de sesion (hash no cambia en runtime) |
| Memoria — TUI | Carga completa de historial en `appendEntry` | Lee 1000 entradas JSON completas, modifica array, reescribe todo en cada append | Append O(1) sin leer el archivo completo | No conforme | Cambiar a NDJSON con append directo o limitar re-escrituras |
| Bateria — BrewBar | Frecuencia del timer de badge | Timer de badge a 2 segundos, continuo, desde el inicio hasta el cierre de la app | Intervalo minimo 30s para contadores de estado que cambian raramente | No conforme | Aumentar `withTimeInterval` a 30-60s |
| Latencia — BrewBar | Concurrencia en `AppState.refresh()` | `checkOutdated()` y `checkServices()` ejecutados secuencialmente (2 × latencia de spawn) | Latencia total = max(checkOutdated, checkServices) con ejecucion concurrente | No conforme | `async let` para paralelizar ambos checks |
| Fiabilidad — BrewBar | Leak del bloque de timeout | El `DispatchQueue.asyncAfter` del timeout de 60s no se cancela cuando el proceso termina antes | El timeout debe cancelarse al completarse el proceso exitosamente | No conforme | Usar `DispatchWorkItem` cancelable |
| Render — BrewBar | Recreacion de NSHostingController | `NSHostingController(rootView: PopoverView(...))` creado nuevo en cada apertura del popover | El hosting controller debe instanciarse una vez y reutilizarse | No conforme | Crear `hostingController` como propiedad del `AppDelegate`; reutilizar en cada apertura |
| Red — Network | Timeout en fetch() | 0 de 7 sitios de `fetch()` tienen `AbortSignal` configurado | Todos los fetch() deben tener timeout explicito | No conforme | `fetchWithTimeout(url, opts, 15000)` helper aplicado en polar-api, osv-api, brewbar-installer |
| Red — Cache | Cache de resultados OSV | 0 cache; cada navegacion a SecurityAudit dispara escaneo completo | Resultados validos por minimo 1 hora dado que los CVEs no cambian en segundos | No conforme | Store de seguridad con timestamp; mostrar cache si tiene <1h, opcion de rescan manual |
| Red — Rate limit | `queryOneByOne` sin throttle | N peticiones HTTP consecutivas sin pausa en path de fallback OSV | Max 10 req/s con backoff entre peticiones | No conforme | Delay minimo 50ms entre peticiones o usar batch exclusivamente |
| Red — Payloads | Double round-trip en activacion | Activacion de licencia realiza 2 POST secuenciales (activate + validate) | Idealmente 1 round-trip para obtener todos los datos necesarios | Parcial | Si Polar incluye datos de cliente en activate, consolidar; si no, ejecutar validate en background |
| Backend — Queries | Queries de base de datos | No aplica — no existe backend propio | — | No aplica | — |
| Backend — Cache HTTP | Cache del lado servidor | No aplica — no existe servidor propio | — | No aplica | — |
