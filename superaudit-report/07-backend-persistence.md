# 11. Backend funcional

> Auditor: backend-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

Brew-TUI no tiene backend propio: consume tres APIs externas (Polar.sh para licencias, OSV.dev para vulnerabilidades, GitHub Releases para descargas) y orquesta el proceso `brew` via `child_process`. Las capas de autenticacion (activacion de licencia, proteccion Pro multi-capa) estan bien disenadas en su logica, pero la ausencia total de timeouts en las llamadas `fetch()` del lado TypeScript representa un riesgo critico de bloqueo. La persistencia local es funcional y mayoritariamente segura, aunque se detectan inconsistencias en permisos de archivo y un secreto de cifrado pre-derivado hard-coded en el binario Swift distribuido.

---

## 11.1 Superficie API

### Checklist

* [x] Endpoints (API clients) inventariados — tres clientes externos identificados y documentados
* [x] Validacion de URL en cliente Polar — `polar-api.ts` valida protocolo HTTPS y hostname `polar.sh`
* [x] Semantica HTTP correcta — los clientes usan POST para operaciones de activacion/validacion/consulta, conforme a los contratos de cada API
* [x] Errores tipados en cliente Polar — extrae `detail`/`error`/`message` del cuerpo de error y los propaga como `Error`
* [x] Errores tipados en cliente OSV — propaga `status`/`statusText` y degrada a consultas individuales en caso de 400
* [ ] Timeout en llamadas `fetch()` del lado TypeScript — **Critica**: ninguno de los tres clientes (`polar-api.ts`, `osv-api.ts`, `brewbar-installer.ts`) define `signal: AbortSignal.timeout(...)`. Una conexion colgada bloquea el evento loop indefinidamente
* [ ] Verificacion de integridad del binario descargado — **Critica**: `brewbar-installer.ts` descarga y extrae `BrewBar.app.zip` sin verificar checksum ni firma criptografica
* [ ] Limite de tamano en descarga de BrewBar — **Critica**: `brewbar-installer.ts:48-49` escribe `res.body` directamente a disco sin comprobar `Content-Length` ni imponer un tope de bytes
* [x] Versionado de API — Polar usa `/v1/`, OSV usa `/v1/`. No aplica para GitHub Releases (URL directa al artefacto)
* [x] Contratos documentados — interfaces TypeScript en `polar-api.ts` y `types.ts` modelan las respuestas de Polar y OSV
* [ ] Batching OSV sin backoff entre lotes — **Media**: el bucle en `osv-api.ts:126-133` envía lotes consecutivos sin delay; instalaciones grandes pueden activar rate limiting del servidor

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Timeout en `fetch()` — todos los clientes TS | No conforme | Critica | `polar-api.ts:46`, `osv-api.ts:64`, `brewbar-installer.ts:42` | Pasar `signal: AbortSignal.timeout(15_000)` (Polar/OSV) y `AbortSignal.timeout(120_000)` (descarga BrewBar) en cada llamada `fetch()` |
| Verificacion de integridad del ZIP de BrewBar | No conforme | Critica | `brewbar-installer.ts:57-64` — extrae con `ditto` sin verificacion | Publicar un archivo `BrewBar.app.zip.sha256` junto a la release y verificar el hash antes de extraer |
| Sin limite de tamano en descarga | No conforme | Critica | `brewbar-installer.ts:48-49` — `pipeline(res.body, fileStream)` sin cap | Comprobar `Content-Length` al inicio y abortar si supera un umbral razonable (ej. 200 MB) |
| Rate limiting entre batches OSV | No conforme | Media | `osv-api.ts:126-133` — bucle sin delay | Introducir `await new Promise(r => setTimeout(r, 300))` entre lotes o implementar backoff exponencial ante respuestas 429 |
| `POLAR_ORGANIZATION_ID` expuesto en fuente | No conforme | Baja | `polar-api.ts:8` — UUID hard-coded en texto claro | Mover a variable de entorno o constante de build; de bajo riesgo practico pero evita exponer la identidad de la organizacion |

---

## 11.2 Autenticacion y autorizacion

### Checklist

* [x] Activacion de licencia con formato validado — `license-manager.ts:184-194` valida longitud (10-100 chars) y regex `^[\w-]+$` antes de llamar a la API
* [x] Rate limiting client-side en activaciones — `license-manager.ts:12-57` implementa cooldown de 30s, max 5 intentos y lockout de 15 min; prevencion de abuso basica
* [x] Licencia almacenada cifrada en disco — `license.json` usa AES-256-GCM con IV aleatorio de 96 bits (`license-manager.ts:71-85`)
* [x] Permisos de archivo restrictivos en `license.json` — `writeFile` con `mode: 0o600` (`license-manager.ts:133`)
* [x] Revalidacion periodica contra servidor — cada 24h + check horario durante la sesion (`license-store.ts:71-88`)
* [x] Periodo de gracia offline con degradacion gradual — 7 dias full, 7-14 warning, 14-30 limited, 30+ expired (`license-manager.ts:170-180`)
* [x] Revocacion contemplada — endpoint `deactivate` elimina la licencia local via `clearLicense()` (`license-manager.ts:257-262`)
* [x] Gate Pro en vistas — `app.tsx` comprueba `isPro()` antes de renderizar vistas Pro; muestra `UpgradePrompt` si no Pro
* [x] Gate Pro en operaciones — `requirePro()` llamado en cada funcion critica (historia, perfiles, cleanup, security audit)
* [x] Verificacion multi-capa en `verifyPro()` — combina anti-debug, integridad de bundle, integridad de store, canaries, check directo + indirecto, nivel de degradacion
* [ ] Rate limiting NO persiste entre reinicios — **Alta**: el `tracker` en `license-manager.ts:22-26` es un objeto de modulo (en memoria). Al reiniciar el proceso, los contadores se resetean, anulando el lockout
* [ ] Clave de cifrado derivada hard-coded visible en binario Swift — **Critica**: `LicenseChecker.swift:47` embebe la clave hex pre-derivada `5c3b2ae2...`; `strings BrewBar.app/Contents/MacOS/BrewBar` la expone directamente
* [ ] Secreto de cifrado en texto claro en fuente TypeScript — **Critica**: `license-manager.ts:60-61` define `ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1'` y `SCRYPT_SALT = 'brew-tui-salt-v1'` como constantes de string en el bundle distribuido; cualquiera que lea el bundle puede derivar la misma clave
* [ ] Escritura de `license.json` no atomica — **Media**: `license-manager.ts:133` usa `writeFile` directo, no tmp+rename; si BrewBar lee el archivo mientras TS escribe, puede obtener JSON corrupto parcial
* [ ] Deactivacion silencia errores de red — **Alta**: `license-manager.ts:258-259` — `catch { /* best effort */ }`; el usuario no sabe si la desactivacion fue procesada por Polar

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Clave de cifrado pre-derivada hard-coded en binario Swift | No conforme | Critica | `LicenseChecker.swift:47` — hex key en static let | La clave debe derivarse en tiempo de ejecucion desde un secreto no hard-coded, o el archivo `license.json` debe gestionarse exclusivamente desde el proceso TS (BrewBar podria usar XPC o leer via pipe). Como minimo, ofuscar el secreto con una tecnica equivalente a la usada en el lado TS |
| Secreto de derivacion en texto claro en bundle TS | No conforme | Critica | `license-manager.ts:60-65` — ENCRYPTION_SECRET y SCRYPT_SALT literales | Cualquiera con acceso al bundle puede derivar la clave y descifrar `license.json`. Migrar el secreto a una variable de entorno en produccion o usar el Keychain del sistema operativo para almacenar/recuperar la clave real |
| Rate limiting no persiste entre reinicios | No conforme | Alta | `license-manager.ts:22-26` — tracker en memoria | Persistir el estado del lockout en `~/.brew-tui/license-ratelimit.json` con la misma proteccion de permisos que la licencia, o usar un archivo de semaforo con timestamp |
| Deactivacion silencia errores | No conforme | Alta | `license-manager.ts:258-259` — `catch { /* best effort */ }` | Propagar el error al llamador y mostrarlo al usuario; registrar en log si la desactivacion remota fallo pero la licencia local fue eliminada igualmente |
| Escritura de license.json no atomica | No conforme | Media | `license-manager.ts:133` — `writeFile` directo vs. tmp+rename en `history-logger.ts:24-26` | Reemplazar `writeFile(LICENSE_PATH, ...)` por el patron tmp+rename ya implementado en `history-logger.ts` para garantizar atomicidad ante race conditions con BrewBar |

---

## 11.3 Validacion y consistencia

### Checklist

* [x] Validacion de nombre de perfil robusta — `profile-manager.ts:18-27` verifica longitud max 100, regex `^[\w\s-]+$` y valor no vacio
* [x] Defense-in-depth contra path traversal — `profile-manager.ts:34` aplica `basename()` adicionalmente al regex, eliminando cualquier componente de directorio
* [x] Sanitizacion de terminos de busqueda en `brew search` — `brew-api.ts:41` elimina guiones iniciales para prevenir inyeccion de flags; `execBrew` usa `spawn` con array de argumentos, no interpolacion en shell
* [x] Uso de `spawn` con array de argumentos — `brew-cli.ts:5` pasa los argumentos como array a `spawn`, no como string de shell; previene command injection
* [x] Parseo JSON defensivo — `json-parser.ts:5-12` envuelve `JSON.parse` en try/catch con mensajes contextuales; comprueba null/undefined
* [x] Validacion de clave de licencia antes de llamada API — `license-manager.ts:184-194` rechaza claves con formato invalido
* [x] Formato de fecha ISO 8601 en toda la persistencia — campos `timestamp`, `activatedAt`, `lastValidatedAt`, `createdAt`, `updatedAt`, `scannedAt` usan `new Date().toISOString()`
* [ ] Sanitizacion incompleta en `brew search` — **Baja**: `brew-api.ts:41` solo elimina guiones al inicio (`replace(/^-+/, '')`); un termino como `foo --desc` pasa intacto. El riesgo es bajo (brew search trata argumentos extra como terminos adicionales, no como opciones), pero la mitigacion documentada no cubre este caso
* [ ] Sin validacion de schema en carga de archivos JSON locales — **Media**: `history-logger.ts:13` castea directamente `JSON.parse(raw) as HistoryFile` sin validar estructura; un archivo corrupto o manipulado manualmente podria causar errores en runtime no anticipados
* [ ] Ausencia de timeout en `fetch()` afecta validaciones en segundo plano — **Critica**: ya documentado en 11.1; aplica tambien a las validaciones de licencia ejecutadas en segundo plano (`license-store.ts:57-65`)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin validacion de schema en JSON local | No conforme | Media | `history-logger.ts:13`, `profile-manager.ts:58` — cast directo sin validacion de estructura | Implementar validacion minima: verificar que `entries` es Array, que cada entrada tiene los campos obligatorios (`id`, `action`, `timestamp`); considerar Zod o validacion manual lightweight |
| Sanitizacion de busqueda incompleta | No conforme | Baja | `brew-api.ts:41` — `replace(/^-+/, '')` no cubre flags embebidos | Extender la sanitizacion: `term.replace(/[^a-zA-Z0-9\s\-_.@]/g, '')` para limitar a caracteres esperados en nombres de paquetes |

---

## 11.4 Resiliencia operacional

### Checklist

* [x] Manejo de errores de red en revalidacion — `license-manager.ts:252-254` captura errores de red y aplica logica de grace period en lugar de lanzar excepcion
* [x] Timeout de procesos en BrewBar — `BrewChecker.swift:19` define `processTimeout = 60s` con kill del proceso y continuation segura via `OnceGuard`
* [x] Continuacion exactly-once en BrewChecker — `BrewChecker.swift:27-46` implementa `OnceGuard` thread-safe con NSLock para garantizar que la continuation no se resume mas de una vez
* [x] `HOMEBREW_NO_AUTO_UPDATE=1` en todos los spawns — `brew-cli.ts:5` y `BrewChecker.swift:54-56` definen la variable de entorno para evitar actualizaciones automaticas lentas
* [x] Limpieza de proceso en caso de cancelacion del generator — `brew-cli.ts:68-70` mata el proceso hijo con `proc.kill()` si el consumer del AsyncGenerator abandona la iteracion
* [x] Error propagado tras streaming completo — `brew-cli.ts:74-77` emite el error de salida no-cero solo despues de que todas las lineas han sido consumidas, preservando el output de brew en el display
* [x] Concurrencia limitada en `analyzeCleanup` — `cleanup-analyzer.ts:74` procesa orphans en batches de 5 con `Promise.all` en lugar de disparar N promesas en paralelo
* [ ] Sin timeout en llamadas `fetch()` — **Critica**: ya documentado; `polar-api.ts:46`, `osv-api.ts:64`, `brewbar-installer.ts:42`
* [ ] Sin reintentos controlados en cliente Polar — **Media**: errores transitorios de red en activacion/validacion no tienen reintento; el rate limiter client-side desincentiva los reintentos manuales del usuario
* [ ] `queryOneByOne` puede generar burst de N requests sin backoff — **Media**: `osv-api.ts:100-118` — en un fallback, N paquetes generan N requests secuenciales; sin delay ni backoff exponencial ante 429
* [ ] Ausencia de jobs o queues — **No aplica**: el proyecto no tiene tareas de fondo propias; las operaciones de brew son sincronas o streamean al UI en tiempo real
* [ ] Webhooks — **No aplica**: el proyecto no expone ni consume webhooks

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin timeout en todos los `fetch()` del lado TS | No conforme | Critica | `polar-api.ts:46`, `osv-api.ts:64`, `brewbar-installer.ts:42` | Usar `AbortSignal.timeout(ms)` en cada llamada. Valores sugeridos: 15s para Polar, 30s por lote para OSV, 120s para descarga binario |
| `queryOneByOne` sin backoff | No conforme | Media | `osv-api.ts:100-118` | Agregar `await new Promise(r => setTimeout(r, 200))` entre requests y capturar 429 para esperar `Retry-After` o usar backoff exponencial |
| Sin reintentos en activacion Polar | No conforme | Media | `polar-api.ts:41-66` — un error de red falla la activacion de forma permanente hasta que el usuario reintenta manualmente | Implementar 1-2 reintentos con backoff (300ms, 1s) para errores de red transitorios (excluir errores 4xx que son definitivos) |

### Inventario de endpoints (API clients)

| Endpoint | Metodo | Auth | Contrato | Errores | Idempotencia | Hallazgo |
|----------|--------|------|----------|---------|--------------|----------|
| `https://api.polar.sh/v1/customer-portal/license-keys/activate` | POST | Ninguna (clave en body) | `PolarActivation`: `id`, `license_key.status/expires_at` | HTTP no-2xx → extrae `detail`/`error`/`message` | No idempotente (nueva instancia por llamada) | Sin timeout; rate limiting solo en memoria (no persiste reinicios) |
| `https://api.polar.sh/v1/customer-portal/license-keys/validate` | POST | Ninguna (clave + `activation_id` en body) | `PolarValidated`: `id`, `status`, `expires_at`, `customer` | HTTP no-2xx → propaga error | Idempotente | Sin timeout; post-activacion silencia errores de cliente (`catch {}`) |
| `https://api.polar.sh/v1/customer-portal/license-keys/deactivate` | POST | Ninguna (clave + `activation_id` en body) | 204 No Content | HTTP no-2xx → capturado y silenciado en `license-manager.ts:258` | Idempotente | Sin timeout; error silenciado — slot puede quedar activo en Polar |
| `https://api.osv.dev/v1/querybatch` | POST | Ninguna | `OsvBatchResponse`: `results[].vulns[]` | HTTP 400 → degrada a `queryOneByOne`; otros → `throw` | Idempotente | Sin timeout; sin backoff entre lotes; fallback genera N requests secuenciales |
| `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip` | GET | Ninguna | ZIP binario | HTTP no-2xx o `!res.body` → `throw` localizado | No aplica (descarga unica) | Sin timeout; sin verificacion de integridad (hash/firma); sin limite de tamano |

---

# 12. Persistencia y sincronizacion

## 12.1 Persistencia local

### Checklist

* [x] Directorio de datos definido centralmente — `data-dir.ts` exporta `DATA_DIR`, `PROFILES_DIR`, `LICENSE_PATH`, `HISTORY_PATH` como constantes; punto unico de verdad
* [x] `license.json` cifrado con AES-256-GCM — IV aleatorio de 96 bits, tag de autenticacion de 128 bits; cifrado verificado en descifrado (`decipher.setAuthTag`)
* [x] `license.json` con permisos 0o600 — `license-manager.ts:133` especifica `mode: 0o600` en `writeFile`
* [x] Escritura atomica en `history.json` — `history-logger.ts:24-26` escribe en `.tmp` y luego hace `rename`; garantiza que un crash no deja el archivo a medias
* [x] Limite de entradas en historial — `history-logger.ts:49-51` trunca a 1000 entradas maximas
* [x] Validacion de nombre de perfil + path traversal — documentado en 11.3
* [x] IDs de entrada de historial con componente aleatorio — `history-logger.ts:39` combina `Date.now()` con `Math.random().toString(36).slice(2,8)`
* [x] Migracion de formato legacy a cifrado en lectura — `license-manager.ts:116-120` detecta formato sin cifrar y lo re-guarda cifrado transparentemente
* [x] `ensureDataDirs()` llamado antes de escritura — tanto en `license-manager.ts:131` como en `history-logger.ts:22` y `profile-manager.ts:64`
* [x] UserDefaults solo para preferencias no sensibles — `SchedulerService.swift:23,29` almacena solo `checkInterval` (Int) y `notificationsEnabled` (Bool) en UserDefaults; conforme
* [ ] `history.json` y perfiles sin modo de archivo explícito — **Alta**: `history-logger.ts:25` y `profile-manager.ts:67` usan `writeFile` sin `mode`; hereda la umask del proceso, tipicamente 0o644 (legible por grupo y otros)
* [ ] `ensureDataDirs()` crea directorios sin modo explícito — **Alta**: `data-dir.ts:11-12` usa `mkdir({ recursive: true })` sin `mode`; en umask 0o022 crea directorios 0o755 (listables por cualquier usuario del sistema)
* [ ] Escritura de `license.json` no atomica — **Media**: ya documentado en 11.2; `writeFile` directo vs. `rename` atomico
* [ ] IDs de historial con colision teorica — **Baja**: `history-logger.ts:39` — bajo alta concurrencia `Date.now()` puede repetirse; usar `crypto.randomUUID()` elimina el riesgo
* [ ] Sin Core Data, SwiftData ni SQLite — **No aplica**: BrewBar no usa persistencia local estructurada propia; solo UserDefaults para preferencias de scheduler
* [ ] Keychain para secretos — **Parcial**: la licencia se almacena cifrada en fichero con 0o600, no en Keychain nativo; funcionalmente aceptable pero no sigue la best practice de macOS; BrewBar no guarda ninguna credencial en Keychain

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `history.json` y perfiles sin modo de archivo | No conforme | Alta | `history-logger.ts:25` — `writeFile(tmp, ..., 'utf-8')` sin `mode`; `profile-manager.ts:67` — `writeFile(path, ..., 'utf-8')` sin `mode` | Pasar `{ mode: 0o600 }` como opcion en ambas llamadas `writeFile`, consistente con `license.json` |
| `ensureDataDirs()` sin modo de directorio | No conforme | Alta | `data-dir.ts:11-12` — `mkdir(DATA_DIR, { recursive: true })` sin `mode` | Agregar `{ recursive: true, mode: 0o700 }` para que `~/.brew-tui/` y sus subdirectorios sean accesibles solo por el propietario |
| IDs de historial con posible colision | No conforme | Baja | `history-logger.ts:39` — `Date.now()-${Math.random()...}` | Sustituir por `crypto.randomUUID()` (disponible en Node.js 14.17+ sin importacion adicional) |

---

## 12.2 Sincronizacion

### Checklist

* [x] Estrategia offline definida para licencias — degradacion gradual (7/14/30 dias) bien documentada y aplicada tanto en TS como en Swift
* [x] Estado offline previsto en revalidacion — `license-manager.ts:252-254` captura errores de red y usa `isWithinGracePeriod()` en lugar de denegar acceso inmediatamente
* [x] Estado de carga/error en BrewBar — `AppState.swift` expone `isLoading`, `error`, `servicesError`; `PopoverView` muestra estados loading/error/upToDate/lista
* [x] Concurrencia de revalidacion protegida — `license-store.ts:11` usa flag `_revalidating` para evitar llamadas concurrentes
* [ ] Sin coordinacion de escritura entre TS y BrewBar en `license.json` — **Media**: TS puede escribir (revalidar) el archivo mientras BrewBar lo lee; ausencia de file locking o IPC entre procesos; `writeFile` no atomico en TS (ver 11.2) agrava el riesgo
* [ ] Sin CloudKit ni iCloud sync — **No aplica**: la persistencia es local por diseno; profiles y history son datos locales del usuario
* [ ] Sin cola de cambios pendientes offline — **No aplica**: las operaciones de brew requieren conectividad de red local a Homebrew (repositorios git); las unicas llamadas de red son a APIs externas y la licencia tiene gracia offline
* [ ] Sin mecanismo de sync para perfiles entre maquinas — **Baja**: los perfiles se exportan como archivos JSON que el usuario debe copiar manualmente entre maquinas; decision de diseno, no defecto, pero limita la utilidad de la feature

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Race condition TS/BrewBar en `license.json` | No conforme | Media | `license-manager.ts:133` — `writeFile` no atomico; BrewBar llama `FileManager.default.contents(atPath:)` en el mismo archivo | Convertir la escritura en TS a tmp+rename (como en `history-logger.ts`) para que BrewBar solo vea el archivo completo o el anterior, nunca un estado intermedio |
| Perfiles sin mecanismo de sync entre maquinas | Parcial | Baja | `profile-manager.ts` — export/import manual via JSON | Documentar explicitamente que la sincronizacion entre maquinas es manual (export/import); considerar a futuro integrar con iCloud Drive o un endpoint de import por URL |

---

## 12.3 Calidad del dato

### Checklist

* [x] Fechas en formato ISO 8601 UTC — `new Date().toISOString()` produce UTC en todos los campos de timestamp (historial, licencia, perfiles, audit)
* [x] Fechas parseadas defensivamente — `license-manager.ts:148-150` comprueba `isNaN(lastValidated)` y trata fechas corruptas como "forzar revalidacion"
* [x] Codificacion/decodificacion JSON robusta — `json-parser.ts` y `history-logger.ts` envuelven parseos en try/catch; `BrewChecker.swift` usa `JSONDecoder` con manejo de errores
* [x] Fechas en Swift con `ISO8601DateFormatter` — `LicenseChecker.swift:91-103` usa `ISO8601DateFormatter` con `.withInternetDateTime` y `.withFractionalSeconds` para compatibilidad total con el formato TS
* [x] Unicidad de IDs en historial — combinacion `Date.now()-random` garantiza unicidad practica (salvo colision teorica documentada en 12.1)
* [x] Campos requeridos verificados en carga de perfil — `profile-manager.ts:57-59` verifica `file.profile` existe antes de retornar
* [x] Truncado de historial previene crecimiento ilimitado — max 1000 entradas
* [ ] Sin validacion de schema al cargar JSON — **Media**: ya documentado en 11.3; cast directo sin verificacion de estructura puede producir accesos a `undefined` en runtime si el dato no tiene la forma esperada
* [ ] Sin migracion de schema para version futura de archivos — **Media**: los tres formatos de archivo (`license.json`, `history.json`, perfiles) tienen campo `version: 1` pero no existe logica de migracion para ningun cambio de version futuro. La unica migracion existente es la de formato legacy sin cifrar a cifrado (`license-manager.ts:116-120`). Un cambio de esquema futuro requeriria logica de migracion o invalidara silenciosamente todos los datos persistidos de usuarios existentes
* [ ] Sin unicidad estructural en perfiles — **Media**: `saveProfile` sobrescribe silenciosamente un perfil con el mismo nombre; si dos procesos llaman `saveProfile` con el mismo nombre casi simultaneamente, el resultado es no determinista; no hay control de version ni CAS (compare-and-swap)
* [ ] Zona horaria en `BrewChecker` no normalizada explicitamente — **Baja**: `AppState.swift:9` guarda `lastChecked = Date()` que es UTC internamente en Swift; correcto en la practica pero sin assertion explicita de UTC en el modelo

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cast de JSON sin validacion de schema | No conforme | Media | `history-logger.ts:13` — `JSON.parse(raw) as HistoryFile`; `profile-manager.ts:52` — `JSON.parse(raw) as ProfileFile` | Agregar validacion minima: verificar tipos de campos criticos antes de usar (`Array.isArray(file.entries)`, `typeof entry.id === 'string'`, etc.); considerar una funcion `parseHistoryFile(raw)` con validacion explicita |
| Sin migracion de schema ante version futura | No conforme | Media | `history-logger.ts:23` — `{ version: 1, entries }`; `profile-manager.ts:66` — `{ version: 1, profile }`; `license-manager.ts:131` — `{ version: 1, encrypted, iv, tag }` — campo `version` escrito pero nunca leido para ramificar logica | Implementar un `switch (file.version)` en cada funcion de carga que maneje explicitamente la version actual y arroje un error descriptivo para versiones desconocidas; documentar el proceso de migracion antes de cualquier cambio de esquema |
| Sin control de sobreescritura concurrente en perfiles | No conforme | Media | `profile-manager.ts:63-68` — `writeFile` sin check de version previa | Usar escritura atomica (tmp+rename) y agregar un campo `updatedAt` que el llamador debe proveer para detectar conflictos de edicion |
| `lastChecked` sin assertion de UTC | Conforme | Baja | `AppState.swift:9` — `Date()` es UTC en Swift por convencion del framework | No requiere accion inmediata; documentar en comentario que `Date()` en Swift es siempre UTC internamente |
