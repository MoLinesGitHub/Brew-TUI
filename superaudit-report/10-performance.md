# 16. Rendimiento

> Auditor: performance-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 incorpora mejoras de rendimiento significativas respecto a la version anterior: lazy initialization de la clave de cifrado, renderizado con ventana deslizante en todas las vistas de lista, paralelismo `async let` en BrewBar, memoizacion de `GradientText`, y `fetchWithTimeout` en todas las llamadas de red. Los principales problemas pendientes son el bucle de polling en `streamBrew` (100ms, marcado con TODO en el propio codigo), la ausencia de caching de resultados de auditoria de seguridad, y el patron de lectura/escritura total del archivo de historial en cada operacion. No existe backend propio: la seccion 16.3 no aplica en su totalidad.

## Metricas de analisis

* **Total vistas SwiftUI analizadas:** 5 (OutdatedListView, ServicesView, DashboardView, MenuBarView, SettingsView)
* **Total vistas React/Ink analizadas:** 12 (dashboard, installed, outdated, package-info, services, security-audit, smart-cleanup, history, profiles, search, doctor, update)
* **Total listas/colecciones:** 8 (todas con renderizado windowed via `slice()` en TUI; `LazyVStack` en BrewBar)
* **Total llamadas de red detectadas:** 7 (Polar.sh activate, validate, deactivate x3; OSV.dev batch query; BrewBar installer download + checksum)
* **Total queries backend detectadas:** 0 (no aplica — sin backend)
* **Patrones de cache detectados:** 0 (no existe ninguna capa de cache HTTP ni de resultados)
* **Problemas de rendimiento potenciales:** 11

---

## 16.1 App

### Checklist

* [x] **Launch time aceptable** — El punto de entrada `src/index.tsx` despacha subcomandos CLI de forma sincrona y luego invoca `render(<App />)`. La importacion de `brewbar-installer` es lazy (`await import`). El `App` component ejecuta `initLicense()` en un `useEffect`, lo que significa que no bloquea el render inicial. `fetchAll()` se ejecuta de forma no bloqueante. No se detectan operaciones sincronas pesadas en la ruta de arranque.
* [x] **First meaningful interaction aceptable** — `brew-store.ts` pre-inicializa los flags de `loading` antes de las fetches, lo que evita un flash de contenido vacio. La UI es interactiva inmediatamente mientras los datos se cargan en background.
* [x] **Scroll fluido** — Todas las vistas de lista implementan renderizado con ventana deslizante manual (`slice(start, start + MAX_VISIBLE_ROWS)` donde `MAX_VISIBLE_ROWS = Math.max(5, rows - 8)`). El terminal renderer de Ink no sufre jank de scroll al estar limitado el numero de nodos React activos. BrewBar usa `LazyVStack` en `OutdatedListView`.
* [ ] **Memoria controlada** — `history-logger.ts` carga el archivo completo de historial en memoria en cada operacion de escritura (`appendEntry`). Con 1000 entradas el impacto es limitado pero el patron es ineficiente. `security-store.ts` no libera resultados de auditoria entre navegaciones ni limita el tamano del resultado en memoria.
* [ ] **CPU controlada** — `streamBrew()` en `brew-cli.ts` usa un bucle de polling con `setTimeout(r, 100)` en lugar de eventos `stdout.on('data')`. El propio codigo tiene un comentario TODO al respecto (linea 65). Esto genera ciclos de CPU innecesarios durante operaciones largas (install, upgrade). `audit-runner.ts` ejecuta `packages.find()` dentro de un bucle sobre `vulnMap`, resultando en complejidad O(n*m).
* [x] **Bateria razonable** — `SchedulerService` en BrewBar usa intervalos configurables (1h/4h/8h). El badge timer es de 30s con guard `count != lastBadgeCount` que evita actualizaciones innecesarias. No se detectan timers cortos, polling continuo, ni location tracking.
* [x] **Overdraw revisado** — No aplica al renderizado de terminal (Ink/React). En BrewBar las vistas SwiftUI son simples, sin `ZStack` anidados con fondos opacos superpuestos.
* [x] **Decodificacion de imagen optimizada** — No aplica al TUI (sin imagenes). BrewBar usa un unico icono de template `NSImage` (SF Symbol), sin carga de imagenes externas ni `AsyncImage`.
* [ ] **Lazy loading donde procede** — `cleanup-store.ts` y `security-store.ts` re-ejecutan el analisis completo en cada montaje del componente via `useEffect(() => { analyze()/scan(); }, [])` sin verificar si los datos ya estan disponibles o son recientes. `package-info.tsx` llama a `getFormulaInfo()` en cada montaje sin cache de paquetes visitados recientemente.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `streamBrew()` polling 100ms | No conforme | Media | `src/lib/brew-cli.ts` linea 65: `await new Promise((r) => setTimeout(r, 100))` con TODO comment | Reemplazar el bucle por `stdout.on('data', ...)` / `stderr.on('data', ...)` con `readline.createInterface`. Elimina el polling completamente. |
| `audit-runner.ts` O(n*m) lookup | No conforme | Baja | `src/lib/security/audit-runner.ts` linea 46: `packages.find((p) => p.name === name)` dentro de bucle sobre `vulnMap` | Construir un `Map<string, {name,version}>` antes del bucle para lookup O(1). |
| `security-store.ts` sin cache | No conforme | Media | `src/stores/security-store.ts`: `scan()` re-consulta OSV en cada montaje de la vista; no hay timestamp de resultado ni TTL | Almacenar timestamp del ultimo scan; omitir re-scan si el resultado tiene menos de N minutos (p. ej. 15 min). |
| `cleanup-store.ts` re-analiza en cada montaje | No conforme | Media | `src/stores/cleanup-store.ts`: `useEffect(() => { analyze(); }, [])` sin cache | Guardar `analyzedAt` en el store; comparar con Date.now() antes de re-lanzar; re-analizar solo si han pasado mas de 5 minutos. |
| `history-logger.ts` read-all/write-all | Parcial | Baja | `src/lib/history/history-logger.ts`: `appendEntry()` lee todo el JSON, prepende, reescribe | Patron aceptable para MAX_ENTRIES=1000 (bajo volumen). A largo plazo, considerar escritura append-only con compactacion periodica. |
| `package-info.tsx` sin cache de paquetes visitados | No conforme | Baja | `src/views/package-info.tsx`: `getFormulaInfo()` llamado en cada montaje | Cache LRU en memoria (p. ej. `Map` con max 20 entradas) en `brew-api.ts` para `getFormulaInfo`. |
| `cleanup-analyzer.ts` N×2 spawns de proceso | Parcial | Baja | `src/lib/cleanup/cleanup-analyzer.ts`: 2 `execFile` por huerfano (getCellarPath + getDiskUsage), concurrencia=5 | Aceptable con pocos huerfanos. Con >50, considerar un unico `du -sk` sobre el directorio Cellar completo para reducir el numero de procesos. |

---

## 16.2 Red

### Checklist

* [x] **Payloads razonables** — Las peticiones a Polar.sh son payloads JSON minimos (license key, instance name). Las consultas a OSV.dev son batches de hasta 100 paquetes en un unico POST. No se detectan payloads excesivos ni imagenes embebidas en JSON.
* [x] **Paginacion correcta** — No aplica en sentido estricto: las APIs consumidas (Polar.sh, OSV.dev) no requieren paginacion para los volumenes de datos gestionados. La carga de formulae/casks usa `brew info --json=v2` que devuelve todos los paquetes instalados — el volumen depende del sistema del usuario, pero es una llamada unica necesaria.
* [ ] **Compresion donde aplica** — No se detecta configuracion explicita de `Accept-Encoding: gzip` en `fetch-timeout.ts` ni en las llamadas a Polar.sh y OSV.dev. Node.js 18+ soporta compresion automatica en `fetch` nativo, pero no se verifica ni fuerza.
* [ ] **Cache HTTP** — No existe ninguna capa de cache HTTP. Cada session re-descarga toda la informacion de Polar.sh (revalidacion) y OSV.dev (audit). No hay `URLCache`, `ETag`, ni `Cache-Control` processing. La unica excepcion es la revalidacion de licencia con ventana de 24h + grace period de 7 dias, que es un cache de nivel aplicacion en `license.json`.
* [ ] **Reintentos controlados** — `license-manager.ts` implementa retry de 3 intentos con `sleep(1000)` solo en `deactivate()`. Las llamadas a `activate()` y `revalidate()` no tienen retry propio. `osv-api.ts` tiene fallback one-by-one en HTTP 400.
* [ ] **Timeouts definidos** — `fetchWithTimeout` aplica un timeout de 15s (por defecto) a todas las llamadas HTTP. La descarga de BrewBar usa 120s explicito. Sin embargo, `execBrew()` en `brew-cli.ts` no tiene timeout configurado: las llamadas a `brew info`, `brew list`, `brew outdated`, etc. dependen del timeout del sistema operativo, lo cual puede bloquear indefinidamente si Homebrew se cuelga.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin cache HTTP para OSV.dev | No conforme | Media | `src/lib/security/osv-api.ts` + `src/stores/security-store.ts`: sin TTL ni persistencia de resultados | Persistir el resultado del ultimo scan en `~/.brew-tui/security-cache.json` con timestamp; reutilizar si tiene menos de 15 minutos. Reduccion de latencia de ~2s a 0 en navegaciones repetidas. |
| Sin cache HTTP para Polar.sh | Parcial | Baja | `src/lib/license/license-manager.ts`: la revalidacion en disco (`license.json`) actua como cache de 24h; conforme a nivel funcional | Cache de aplicacion funcional. Aceptable. |
| `Accept-Encoding` no forzado | No conforme | Baja | `src/lib/fetch-timeout.ts`: headers por defecto, sin `Accept-Encoding: gzip` explicito | Anadir `headers: { 'Accept-Encoding': 'gzip, deflate, br' }` en `fetchWithTimeout`. Node 18+ lo soporta nativamente. |
| Retry ausente en `activate()` y `revalidate()` | Parcial | Baja | `src/lib/license/license-manager.ts`: solo `deactivate()` tiene retry de 3 intentos con sleep 1s | Anadir retry con backoff exponencial (max 2 intentos) en `revalidate()` para mejorar resiliencia ante fallos de red transitorios. |
| `execBrew()` sin timeout | No conforme | Media | `src/lib/brew-cli.ts`: `execBrew()` no configura `timeout` en `execFile` ni usa `AbortSignal`; si `brew` se cuelga, el proceso TUI queda bloqueado indefinidamente | Anadir `{ timeout: 30_000 }` como opcion en `execFileAsync`, o envolver con `AbortSignal.timeout(30_000)` para todas las llamadas `execBrew`. |

---

## 16.3 Backend

> No aplica. El proyecto Brew-TUI no incluye backend propio. Las unicas APIs externas consumidas son Polar.sh (SaaS de licencias) y OSV.dev (base de datos de vulnerabilidades publica). No existe codigo de servidor, base de datos propia, ORM, ni jobs de backend en el repositorio.

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
| Backend inexistente | No aplica | — | Proyecto es TUI + menubar app. Sin servidor, sin BD, sin ORM. | — |

---

## Registro de performance

| Zona | Metrica | Resultado | Umbral | Estado | Accion |
|------|---------|-----------|--------|--------|--------|
| App — Launch | Operaciones sincronas en arranque | Ninguna detectada; `initLicense` en `useEffect`, `brewUpdate` no-blocking | Sin bloqueos sincronicos antes del primer render | Conforme | — |
| App — First paint | Flash de contenido vacio | Loading flags pre-inicializados en `brew-store.ts` | UI interactiva antes de datos | Conforme | — |
| App — Scroll | Renderizado de listas | Windowed rendering en 8 vistas TUI; `LazyVStack` en BrewBar | Max filas activas = `rows - 8` | Conforme | — |
| App — CPU | `streamBrew()` polling | Bucle `setTimeout(100ms)` durante install/upgrade/update | Evento-driven (sin polling) | No conforme | Migrar a `stdout.on('data')` + `readline` |
| App — CPU | `audit-runner.ts` lookup O(n*m) | `packages.find()` dentro de bucle sobre vulnMap | O(n) lookup con Map | No conforme | Map pre-construido antes del bucle |
| App — Memoria | `history-logger.ts` | Lectura + escritura total del JSON en cada brew op | Append incremental | Parcial | Aceptable para 1000 entradas; revisar si el volumen crece |
| App — Memoria | `security-store.ts` | Sin cache de resultados; re-scan en cada montaje | TTL de resultado en store | No conforme | Timestamp + TTL de 15min |
| App — Lazy loading | `cleanup-store.ts` re-analiza en montaje | Sin verificacion de datos previos; spawna N*2 procesos | Re-analizar solo si datos > 5min de antiguedad | No conforme | Guard con `analyzedAt` en store |
| App — Lazy loading | `package-info.tsx` | `getFormulaInfo()` en cada montaje sin cache | LRU cache de paquetes recientes | No conforme | Map LRU max 20 en `brew-api.ts` |
| App — Bateria | SchedulerService intervalos | 1h/4h/8h configurable; badge 30s con guard | Intervalos razonables para menubar app | Conforme | — |
| App — GradientText | Memoizacion | `React.memo` + `useMemo`; 258 nodos Text por header | Re-render solo en cambio de dimensiones | Conforme | — |
| App — scryptSync | Lazy derivation | `_derivedKey` singleton con lazy init | Derivacion una sola vez por sesion | Conforme | — |
| App — BrewBar NSHostingController | Reuso de controlador | Creado una vez en `AppDelegate`, reutilizado en cada apertura | Sin instanciacion repetida en cada click | Conforme | — |
| App — BrewBar async let | Paralelismo en refresh | `async let outdatedResult` + `async let servicesResult` | Paralelo, no secuencial | Conforme | — |
| Red — Cache HTTP | Cache de resultados OSV.dev | Sin persistencia de resultados; re-query en cada sesion | Cache con TTL de 15min | No conforme | Persistir en `~/.brew-tui/security-cache.json` |
| Red — Cache HTTP | Cache de licencia Polar.sh | `license.json` con TTL 24h + grace 7d | Cache de aplicacion funcional | Conforme | — |
| Red — Compression | `Accept-Encoding` | No forzado en `fetchWithTimeout` | Header explicito recomendado | No conforme | Anadir header en `fetch-timeout.ts` |
| Red — Timeouts | `fetchWithTimeout` | 15s default; 120s para descarga binaria; 15s para checksum | Timeouts razonables por tipo de operacion | Conforme | — |
| Red — Timeouts | `execBrew()` | Sin timeout; depende del SO | Timeout explicito de 30-60s | No conforme | Anadir `{ timeout: 30_000 }` en `execFileAsync` |
| Red — Retry | `activate()` / `revalidate()` | Sin retry (solo `deactivate()` tiene 3 intentos) | Retry con backoff en operaciones criticas | Parcial | Anadir retry x2 con backoff en `revalidate()` |
| Red — Payloads | OSV.dev batch | Max 100 paquetes por request; fallback one-by-one en HTTP 400 | Batch razonable | Conforme | — |
| Backend — Queries | N/A | Sin backend propio | — | No aplica | — |
| Backend — Indices | N/A | Sin backend propio | — | No aplica | — |
| Backend — N+1 | N/A | Sin backend propio | — | No aplica | — |
| Backend — Jobs | N/A | Sin backend propio | — | No aplica | — |
| Backend — Memoria | N/A | Sin backend propio | — | No aplica | — |
| Backend — Observabilidad | N/A | Sin backend propio | — | No aplica | — |
