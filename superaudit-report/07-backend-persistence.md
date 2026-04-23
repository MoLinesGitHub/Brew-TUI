# 11. Backend funcional

> Auditor: backend-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 no dispone de backend propio: toda la logica del servidor reside en tres servicios externos (Polar.sh para licencias, OSV.dev para CVEs y GitHub Releases para distribucion de binarios). La capa de red del cliente esta bien estructurada con timeouts universales y validacion de URLs. La persistencia local esta protegida con cifrado AES-256-GCM, permisos de archivo correctos y escrituras atomicas, aunque `saveProfile` omite el patron atomico aplicado al resto. La clave de derivacion del cifrado esta embebida en el codigo fuente, lo que es la principal limitacion arquitectonica de seguridad del modelo de licencias.

---

## 11.1 Superficie API

> Nota de alcance: al no existir backend propio, este apartado audita la superficie de la capa de red del cliente — los tres puntos de integracion externos que constituyen la "API" del producto.

### Checklist

* [x] Endpoints inventariados — tres integraciones externas identificadas y auditadas
* [x] HTTPS obligatorio en todas las llamadas — validado en `polar-api.ts` (lineas 12-18) y en `fetchWithTimeout`
* [x] Validacion de host en llamadas a Polar.sh — `validateApiUrl()` comprueba `polar.sh` (linea 17)
* [x] Timeout en todas las llamadas HTTP — `fetchWithTimeout` con 15s para API y 120s para descarga
* [x] Errores HTTP tipados — `polar-api.ts` extrae `detail`/`error`/`message` del cuerpo de error (lineas 54-62)
* [x] Limite de tamano en descarga de binario — 200 MB (brewbar-installer.ts linea 53)
* [x] Verificacion SHA-256 del binario descargado — brewbar-installer.ts lineas 62-76
* [x] Reintento controlado en deactivate — 3 intentos con espera de 1s (license-manager.ts lineas 268-278)
* [ ] Sin validacion de host en llamadas a OSV.dev — **Baja**: osv-api.ts no llama a `validateApiUrl`; la URL esta hardcodeada como constante pero no se valida en tiempo de ejecucion
* [ ] Verificacion SHA-256 silenciosamente omitible — **Media**: si el endpoint `.sha256` no existe o retorna error de red, la instalacion continua sin ninguna verificacion de integridad (brewbar-installer.ts lineas 73-76)
* [ ] Sin autenticacion en llamadas a OSV.dev — **No aplica**: OSV.dev es una API publica sin autenticacion requerida

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Timeout universal en fetch | Conforme | — | `src/lib/fetch-timeout.ts` linea 2; aplicado en polar-api.ts, osv-api.ts, brewbar-installer.ts | — |
| Validacion HTTPS + hostname en Polar | Conforme | — | `polar-api.ts` lineas 12-18 | — |
| Verificacion SHA-256 presente | Conforme | — | `brewbar-installer.ts` lineas 62-76 | — |
| SHA-256 omitida silenciosamente si .sha256 falla | No conforme | Media | `brewbar-installer.ts` lineas 73-76: `catch (err)` solo relanza errores de `checksum mismatch`; error de red al obtener el archivo `.sha256` deja pasar la instalacion sin verificar | Hacer la verificacion SHA-256 obligatoria: incluir el hash esperado en el manifesto de release (o en el codigo firmado); rechazar la instalacion si no se puede obtener o verificar el checksum |
| Limite de tamano 200 MB | Conforme | — | `brewbar-installer.ts` linea 53 | — |
| Reintento 3x en deactivate | Conforme | — | `license-manager.ts` lineas 268-278 | — |
| Sin validacion de host en OSV.dev | Parcial | Baja | `osv-api.ts` linea 4: URL constante sin llamada a `validateApiUrl` | Agregar validacion de host similar a la de Polar, o extraer `validateApiUrl` a `fetch-timeout.ts` como helper generico |
| Fallback one-by-one en OSV HTTP 400 | Conforme | — | `osv-api.ts` lineas 73-76 | — |

---

## 11.2 Autenticacion y autorizacion

> Nota de alcance: no existe backend propio con sesiones. La autenticacion se resuelve mediante licencias Polar.sh almacenadas localmente.

### Checklist

* [x] Activacion segura con rate limiting — cooldown 30s entre intentos, lockout 15min tras 5 fallos (license-manager.ts lineas 12-58)
* [x] Clave de licencia validada antes de llamar a la API — `validateLicenseKey()` (lineas 193-203)
* [x] Token cifrado en reposo — AES-256-GCM con IV aleatorio de 96 bits (license-manager.ts lineas 73-103)
* [x] Permisos de archivo restrictivos — modo 0o600 en license.json y demas datos; 0o700 en directorios
* [x] Revocacion contemplada — endpoint `deactivate` con 3 reintentos; eliminacion local siempre ocurre
* [x] Caducidad de token evaluada — `isExpired()` y degradacion escalonada (0-7d: ninguna, 7-14d: warning, 14-30d: limitada, 30+d: expirada)
* [x] Revalidacion periodica — cada 24h contra servidor, comprobacion cada hora en sesion activa
* [x] Verificacion multi-capa en `verifyPro` — anti-debug, bundle integrity, store integrity, canaries, degradacion
* [ ] Clave de cifrado embebida en codigo fuente — **Alta**: `ENCRYPTION_SECRET` y `SCRYPT_SALT` son constantes literales (license-manager.ts lineas 61-62); cualquier usuario que lea el fuente o el bundle desofuscado puede derivar la misma clave y descifrar cualquier license.json
* [ ] Clave derivada hardcodeada en Swift — **Alta**: `LicenseChecker.swift` linea 47 contiene la clave derivada en hexadecimal; equivalente a exponer la clave en claro

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Rate limiting en activacion | Conforme | — | `license-manager.ts` lineas 12-58 | — |
| Cifrado AES-256-GCM en reposo | Conforme | — | `license-manager.ts` lineas 73-103 | — |
| Clave de cifrado en codigo fuente | No conforme | Alta | `license-manager.ts` lineas 61-62: `ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1'`; `LicenseChecker.swift` linea 47: clave derivada en hex | Migrar secreto a variable de entorno en tiempo de compilacion o a un mecanismo de derivacion basado en identificador de maquina (machine-bound key); en BrewBar, considerar derivar la clave del `SecureEnclaveKey` o del bundle signing identity. Reconocer que cualquier solucion 100% client-side tiene limitaciones inherentes |
| Permisos 0o600/0o700 | Conforme | — | `data-dir.ts` lineas 11-12; `license-manager.ts` linea 141 | — |
| Revocacion con 3 reintentos | Conforme | — | `license-manager.ts` lineas 268-278 | — |
| Degradacion escalonada offline | Conforme | — | `license-manager.ts` lineas 168-190 | — |
| Revalidacion horaria en sesion | Conforme | — | `license-store.ts` lineas 9, 75-92 | — |
| Licencia no almacenada en Keychain macOS | No conforme | Media | `data-dir.ts`: datos en `~/.brew-tui/license.json`; ninguna referencia a `SecItem`, `kSecClass` o KeychainAccess en todo el proyecto | Considerar almacenar el license key en Keychain y usar el archivo cifrado solo para metadatos no sensibles. En BrewBar, usar `Security.framework` para leer desde Keychain en lugar de `~/.brew-tui/license.json` |
| `verifyPro` multi-capa | Conforme | — | `pro-guard.ts` lineas 25-43 | — |

---

## 11.3 Validacion y consistencia

### Checklist

* [x] Validacion de nombre de perfil — regex `^[\w\s-]+$` con longitud maxima 100 (profile-manager.ts lineas 23-35)
* [x] Defense-in-depth con `basename()` en path de perfil — profile-manager.ts linea 41
* [x] Validacion de tap/paquete en importacion — `TAP_PATTERN` y `PKG_PATTERN` (profile-manager.ts lineas 134-135)
* [x] Sanitizacion de input en busqueda — stripping de guiones iniciales en `search()` (brew-api.ts lineas 41-43)
* [x] Validacion de formato de license key — longitud 10-100, caracteres permitidos (license-manager.ts lineas 193-203)
* [x] Validacion de URL de API Polar — protocolo HTTPS + hostname (polar-api.ts lineas 12-18)
* [x] Version de schema comprobada en todos los archivos de persistencia — `file.version !== 1` en license, history, profiles
* [x] Deserializacion robusta en parsers JSON — `safeParse` con try/catch (json-parser.ts lineas 3-13)
* [x] Manejo de campos opcionales/nulos en modelos Swift — todos los campos criticos son `let`, opcionales donde corresponde
* [ ] Sin validacion de tipos en deserializacion de licencia — **Media**: `loadLicense` (linea 103) hace cast directo `as LicenseData` tras `JSON.parse` sin validar que los campos requeridos existan ni que tengan los tipos correctos; un archivo modificado manualmente podria producir comportamientos inesperados

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Validacion de nombre y path de perfil | Conforme | — | `profile-manager.ts` lineas 23-42 | — |
| TAP_PATTERN / PKG_PATTERN en import | Conforme | — | `profile-manager.ts` lineas 134-135, 146-149, 158-162, 167-172 | — |
| Stripping de guiones en busqueda | Conforme | — | `brew-api.ts` lineas 41-43 | — |
| Validacion de license key format | Conforme | — | `license-manager.ts` lineas 193-203 | — |
| Schema version check en todos los stores | Conforme | — | `license-manager.ts` linea 111; `history-logger.ts` linea 34; `profile-manager.ts` linea 64 | — |
| Cast sin validacion de tipos en `loadLicense` | No conforme | Media | `license-manager.ts` linea 103: `return JSON.parse(...) as LicenseData` — ninguna comprobacion de que `key`, `instanceId`, `status`, etc. existan y sean strings | Agregar validacion estructural (zod schema o funcion `isLicenseData(obj): obj is LicenseData`) antes de hacer el cast; lanzar error descriptivo si el objeto no es valido |
| Deserializacion Swift con `JSONDecoder` y `Codable` | Conforme | — | `LicenseChecker.swift` linea 128; `BrewChecker.swift` lineas 89, 93 | — |

---

## 11.4 Resiliencia operacional

### Checklist

* [x] Timeout en todas las llamadas externas HTTP — 15s API, 120s descarga
* [x] Timeout en procesos `brew` (Swift) — 60s en `BrewChecker` (BrewChecker.swift linea 19)
* [x] Manejo de error en todas las llamadas externas — try/catch en polar-api.ts, osv-api.ts, brewbar-installer.ts
* [x] Grace period offline — 7 dias sin revalidacion (license-manager.ts linea 9)
* [x] Fallback one-by-one en OSV 400 — osv-api.ts lineas 101-119
* [x] `OnceGuard` en BrewChecker — previene doble resume de continuation (BrewChecker.swift lineas 27-45)
* [x] `brewUpdate` fire-and-forget intencional — documentado en brew-store.ts linea 146
* [ ] Sin timeout en `execBrew` (TypeScript) — **Media**: `brew-cli.ts` linea 4: `spawn()` sin timeout; un proceso `brew info --json` colgado bloquea la TUI indefinidamente. El equivalente Swift tiene timeout de 60s
* [ ] `streamBrew` usa polling de 100ms — **Baja**: brew-cli.ts linea 65: `setTimeout(r, 100)` en lugar de espera event-driven; aumenta latencia de respuesta y consume CPU innecesariamente
* [ ] Sin rate limiting en Security Audit — **Baja**: el usuario puede disparar multiples scans OSV consecutivos sin restriccion; sin cache de resultados entre sesiones

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Timeout en fetch HTTP | Conforme | — | `fetch-timeout.ts` linea 2: `AbortSignal.timeout(timeoutMs)` | — |
| Timeout en procesos brew (Swift) | Conforme | — | `BrewChecker.swift` lineas 19, 78-83 | — |
| Grace period offline | Conforme | — | `license-manager.ts` lineas 9, 162-166 | — |
| Fallback OSV one-by-one | Conforme | — | `osv-api.ts` lineas 73-76 | — |
| Sin timeout en `execBrew` (TypeScript) | No conforme | Media | `brew-cli.ts` lineas 3-21: `spawn()` sin opcion `timeout` ni AbortController; afecta a `getInstalled`, `getOutdated`, `getServices`, `getConfig`, `getLeaves` — todos los fetches de startup | Agregar `timeout` a las opciones de `spawn()` o usar `AbortController` con `setTimeout`; valor recomendado 30-60s similar al de BrewChecker |
| Polling de 100ms en `streamBrew` | No conforme | Baja | `brew-cli.ts` linea 65: `await new Promise((r) => setTimeout(r, 100))` con TODO explicito | Reemplazar con arquitectura event-driven: usar un `AsyncIterableIterator` sobre eventos `data` del stream, eliminando el polling |
| `brewUpdate` fire-and-forget silencioso | Parcial | Baja | `brew-store.ts` linea 147: `api.brewUpdate().catch(() => {})` | Comportamiento intencional y documentado; considerar loguear el error en desarrollo (`process.env.NODE_ENV !== 'production'`) para diagnostico |
| Sin rate limiting en Security Audit | No conforme | Baja | `security-view.tsx` y `audit-runner.ts`: sin debounce ni cache entre llamadas | Agregar debounce de 5s entre escaneos y cache en memoria de los resultados durante la sesion |

### Inventario de endpoints

| Endpoint | Metodo | Auth | Contrato | Errores | Idempotencia | Hallazgo |
|----------|--------|------|----------|---------|--------------|----------|
| `https://api.polar.sh/v1/customer-portal/license-keys/activate` | POST | Sin auth de cabecera (key en body) | `{ key, organization_id, label }` → `PolarActivation` | HTTP status + JSON `detail`/`error`/`message` | No idempotente — reactivacion requiere nueva instancia | Conforme |
| `https://api.polar.sh/v1/customer-portal/license-keys/validate` | POST | Sin auth de cabecera (key + activation_id en body) | `{ key, organization_id, activation_id }` → `PolarValidated` | HTTP status + JSON | Idempotente | Conforme |
| `https://api.polar.sh/v1/customer-portal/license-keys/deactivate` | POST | Sin auth de cabecera (key + activation_id en body) | `{ key, organization_id, activation_id }` → 204 | HTTP status | Idempotente | Conforme |
| `https://api.osv.dev/v1/querybatch` | POST | Sin autenticacion (API publica) | `{ queries: [{package, version}] }` → `{ results: [{vulns}] }` | HTTP status; fallback one-by-one en 400 | Idempotente | Sin validacion de host en cliente |
| `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip` | GET | Sin autenticacion | Binario ZIP | HTTP status | N/A (descarga) | SHA-256 omitida silenciosamente si .sha256 falla — ver hallazgo en 11.1 |
| `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip.sha256` | GET | Sin autenticacion | Texto `<hash> <filename>` | Error de red ignorado silenciosamente | N/A | No conforme — ver 11.1 |

---

# 12. Persistencia y sincronizacion

## 12.1 Persistencia local

> Nota de alcance: no existe Core Data ni SwiftData. La persistencia es hibrida: archivos JSON en `~/.brew-tui/` (TypeScript) y UserDefaults (Swift BrewBar).

### Checklist

* [x] Cifrado AES-256-GCM en license.json — license-manager.ts lineas 73-103
* [x] Escritura atomica en license.json — patron tmp + rename (lineas 140-142)
* [x] Escritura atomica en history.json — patron tmp + rename (history-logger.ts lineas 46-51)
* [x] Permisos 0o600 en archivos de datos — license.json, history.json, profiles/*.json
* [x] Permisos 0o700 en directorios de datos — `~/.brew-tui/` y `~/.brew-tui/profiles/`
* [x] UUID criptografico para IDs de historial — `randomUUID()` de `node:crypto` (history-logger.ts linea 3, linea 64)
* [x] Schema version en todos los archivos persistidos — version: 1 en license, history y profiles
* [x] Limite de entradas en historial — max 1000 (history-logger.ts linea 8, lineas 74-76)
* [x] UserDefaults solo para preferencias no sensibles en BrewBar — checkInterval, notificationsEnabled, hasLaunchedBefore
* [x] Ninguna credencial en UserDefaults — validado; license.json se lee via FileManager, no UserDefaults
* [ ] `saveProfile` no es atomica — **Media**: profile-manager.ts linea 78 usa `writeFile` directo sin patron tmp+rename, a diferencia de `saveLicense` y `saveHistory`
* [ ] Sin migracion implementada — **Baja**: los tres modulos tienen comentario `// Future: add migration logic here` (license-manager.ts linea 113, history-logger.ts linea 36, profile-manager.ts linea 65) pero ninguna logica de migracion real; un cambio de schema en v2 dejara datos de usuarios v1 ilegibles

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Escritura atomica license.json y history.json | Conforme | — | `license-manager.ts` lineas 140-142; `history-logger.ts` lineas 48-51 | — |
| Escritura NO atomica en `saveProfile` | No conforme | Media | `profile-manager.ts` linea 78: `await writeFile(profilePath(profile.name), ...)` sin tmp+rename | Reemplazar por el mismo patron usado en `saveLicense`: `writeFile(tmpPath, ...)` seguido de `rename(tmpPath, finalPath)` |
| Cifrado AES-256-GCM en license.json | Conforme | — | `license-manager.ts` lineas 73-103 | — |
| Permisos 0o600/0o700 | Conforme | — | `data-dir.ts` lineas 11-12; `license-manager.ts` linea 141; `history-logger.ts` linea 49; `profile-manager.ts` linea 78 | — |
| UUID criptografico en historial | Conforme | — | `history-logger.ts` linea 3 (`import { randomUUID }`) y linea 64 | — |
| Schema version check | Conforme | — | `license-manager.ts` linea 111; `history-logger.ts` linea 34; `profile-manager.ts` linea 64 | — |
| Sin migracion implementada | No conforme | Baja | Comentarios `// Future: add migration logic here` en los tres modulos | Disenar e implementar logica de migracion antes de cualquier cambio de schema; documentar el formato de cada version |
| UserDefaults solo para preferencias (BrewBar) | Conforme | — | `SchedulerService.swift` lineas 23-24, 30-31, 41: solo `checkInterval`, `notificationsEnabled`, `hasLaunchedBefore` | — |
| Ninguna credencial en UserDefaults | Conforme | — | Auditado todo `SchedulerService.swift`, `AppState.swift`, `LicenseChecker.swift`: sin `UserDefaults` para datos de licencia | — |
| Migracion de formato legacy (unencrypted → encrypted) | Conforme | — | `license-manager.ts` lineas 122-129: re-guarda en formato cifrado al leer formato legacy | — |

---

## 12.2 Sincronizacion

> Nota de alcance: el proyecto es local-first por diseno. No existe sincronizacion activa entre dispositivos ni CloudKit. La unica "sincronizacion" es la revalidacion periodica de licencia contra Polar.sh.

### Checklist

* [x] Estrategia local-first definida — los datos de usuario (perfiles, historial) son locales exclusivamente
* [x] Offline contemplado para licencias — grace period 7d + degradacion escalonada
* [x] Sin CloudKit ni iCloud Sync — no aplica, no se ha implementado
* [x] Sin cola de cambios pendientes — no aplica, no se necesita (no hay sync activa)
* [x] Sin conflictos de concurrencia en revalidacion — mutex booleano `_revalidating` en license-store.ts linea 11
* [ ] Sin proteccion contra escrituras concurrentes entre procesos — **Media**: si dos instancias de brew-tui se ejecutan simultaneamente (improbable pero posible), ambas podrian leer/escribir `history.json` o `profiles/*.json` concurrentemente; el patron tmp+rename reduce la ventana pero no elimina la condicion de carrera a nivel de proceso

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Estrategia local-first | Conforme | — | Sin CloudKit, sin sync activa; datos en `~/.brew-tui/` | — |
| Grace period offline | Conforme | — | `license-manager.ts` lineas 9, 162-166 | — |
| Mutex de revalidacion | Conforme | — | `license-store.ts` linea 11: `let _revalidating = false` con guards en lineas 58, 79 | — |
| Sin proteccion multi-proceso en archivos locales | No conforme | Media | `history-logger.ts`, `profile-manager.ts`: sin lock de archivo (`fs.flock` o similar); multiples instancias pueden corromper datos | Para history.json: agregar lock de archivo con `proper-lockfile` o equivalente antes de `loadHistory + saveHistory`; para profiles: el mismo patron aplica aunque la probabilidad de colision es menor |
| BrewBar lee license.json sin interferir con TUI | Conforme | — | `LicenseChecker.swift` solo lee, nunca escribe; `rename` atomico minimiza lectura de archivo parcial | — |

---

## 12.3 Calidad del dato

### Checklist

* [x] Fechas en ISO 8601 UTC — `new Date().toISOString()` en todos los campos de fecha (license-manager.ts lineas 222, 226; history-logger.ts linea 68)
* [x] Parseo de fechas con manejo de NaN — `isNaN(lastValidated)` con fallback seguro (license-manager.ts lineas 158, 165, 182)
* [x] ISO8601DateFormatter en Swift con formato completo — `LicenseChecker.swift` lineas 91-92: `[.withInternetDateTime, .withFractionalSeconds]`
* [x] Unicidad garantizada por UUID en historial — `randomUUID()` de `node:crypto`
* [x] Limite de entradas en historial — previene crecimiento ilimitado del archivo
* [x] Arrays validados en parsers — `Array.isArray()` antes de procesar (json-parser.ts lineas 18-20)
* [x] Serializacion con `JSON.stringify` + `JSON.parse` robusta — `safeParse` con try/catch
* [ ] Sin restriccion de unicidad en perfiles por nombre — **Baja**: `saveProfile` sobreescribe silenciosamente un perfil existente con el mismo nombre sin advertencia; `exportCurrentSetup` tampoco comprueba si ya existe un perfil con ese nombre antes de sobreescribir
* [ ] Cast sin validacion estructural en `loadLicense` — **Media**: (duplicado de 11.3) `JSON.parse(...) as LicenseData` sin comprobar tipos de campo; un archivo modificado manualmente puede producir `undefined` donde se espera `string`

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Fechas ISO 8601 UTC en todos los registros | Conforme | — | `.toISOString()` en license-manager.ts lineas 222, 226; history-logger.ts linea 68; profile-manager.ts lineas 105-106 | — |
| Manejo de NaN en fechas | Conforme | — | `license-manager.ts` lineas 158, 165, 182: `isNaN(lastValidated)` con fallback explicito | — |
| ISO8601DateFormatter con fraccion de segundos (Swift) | Conforme | — | `LicenseChecker.swift` lineas 91-92 | — |
| UUID v4 criptografico en historial | Conforme | — | `history-logger.ts` linea 3 + linea 64 | — |
| Sin unicidad garantizada en perfiles | No conforme | Baja | `profile-manager.ts` linea 78: `writeFile` sobreescribe sin verificar existencia previa | Agregar comprobacion de existencia en `saveProfile` y lanzar error descriptivo si el perfil ya existe (salvo en operaciones de actualizacion explicita como `updateProfile`) |
| Cast sin validacion en `loadLicense` | No conforme | Media | `license-manager.ts` linea 103: `return JSON.parse(plaintext.toString('utf-8')) as LicenseData` — TypeScript no valida en runtime | Agregar type guard `isLicenseData(obj): obj is LicenseData` que verifique que `key`, `instanceId`, `status`, `plan`, `activatedAt`, `lastValidatedAt` sean strings no vacios |
| Arrays validados con `Array.isArray` en parsers | Conforme | — | `json-parser.ts` lineas 18-20, 26-29, 32-33 | — |
| Codable con campos opcionales en Swift | Conforme | — | `LicenseData.swift`: `expiresAt: String?`; `OutdatedPackage`: `pinnedVersion: String?`; `BrewService`: `user`, `file`, `exitCode` todos opcionales | — |
