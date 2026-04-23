# 20. Auditoria por endpoint

> Auditor: endpoint-auditor | Fecha: 2026-04-22

---

## Resumen ejecutivo

Brew-TUI no tiene backend propio. El proyecto consume cuatro grupos de endpoints externos: la API de licencias Polar.sh, la API de vulnerabilidades OSV.dev, la descarga de releases desde GitHub, y el CLI local de Homebrew (invocado via `child_process.spawn`). El CLI local se trata como interfaz de programa a programa y se audita con los mismos criterios.

El hallazgo transversal mas grave es la **ausencia total de timeouts** en todas las llamadas `fetch()` del codigo TypeScript. Un servidor externo que no responda bloqueara el proceso Node.js indefinidamente. Ninguno de los seis grupos de endpoints tiene metricas de instrumentacion, logging estructurado ni logica de retry.

* **Total endpoints/grupos auditados:** 6 (3 Polar, 1 OSV, 1 GitHub Download, 1 Brew CLI)
* **Cobertura media:** 30% (16 de 54 items cubiertos en total, promedio 2.7/9 por endpoint)
* **Endpoints con cobertura completa (9/9):** 0
* **Endpoints con hallazgos criticos:** 2 (Polar deactivate, GitHub download)
* **Hallazgos totales:** 42

---

## Estadisticas por categoria

| Categoria | Endpoints que cumplen | Endpoints que no cumplen | % Cumplimiento |
|-----------|-----------------------|--------------------------|----------------|
| Contrato correcto | 5 | 1 | 83% |
| Validacion correcta | 3 | 3 | 50% |
| Auth correcta | 3 | 3 | 50% |
| Errores correctos | 3 | 3 | 50% |
| Idempotencia correcta | 2 | 4 | 33% |
| Logging correcto | 0 | 6 | 0% |
| Metricas correctas | 0 | 6 | 0% |
| Timeouts correctos | 0 | 6 | 0% |
| Retries correctos | 0 | 6 | 0% |

---

## Mapa de endpoints

| Metodo | Endpoint / Recurso | Auth | Validacion | Estado |
|--------|--------------------|------|------------|--------|
| POST | `https://api.polar.sh/v1/customer-portal/license-keys/activate` | Key en body | Longitud + regex en license-manager | Parcial |
| POST | `https://api.polar.sh/v1/customer-portal/license-keys/validate` | Key en body | Longitud + regex (via activate) | Parcial |
| POST | `https://api.polar.sh/v1/customer-portal/license-keys/deactivate` | Key en body | Ninguna | No conforme |
| POST | `https://api.osv.dev/v1/querybatch` | Sin auth (API publica) | Ninguna | Parcial |
| GET | `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip` | Sin auth; Pro check local | Pro + plataforma | Parcial |
| spawn | `brew <subcommand>` (local CLI) | Requiere brew instalado | Sanitizacion parcial (solo search) | Parcial |

---

## Endpoint 1: POST /v1/customer-portal/license-keys/activate (Polar API)

* **Metodo:** POST
* **Ruta:** `https://api.polar.sh/v1/customer-portal/license-keys/activate`
* **Auth:** La clave de licencia y el `organization_id` se envian en el body. No se usa un Bearer token ni header de autenticacion separado — es el modelo cliente-a-API de Polar para apps standalone.
* **Archivo:** `src/lib/license/polar-api.ts` (funcion `activateLicense`, linea 68) — llamado desde `src/lib/license/license-manager.ts` (funcion `activate`, linea 196)
* **Input DTO:** `{ key: string, organization_id: string, label: string }` — `label` es el hostname del equipo via `os.hostname()`
* **Output DTO:** `LemonSqueezyActivateResponse` (tipos en `src/lib/license/types.ts`) — `{ activated: boolean, error: string|null, instance: { id: string }, license_key: { ... }, meta: { customer_email, customer_name } }`
* **Errores esperados:** HTTP 400 (clave invalida), HTTP 409 (limite de activaciones alcanzado), HTTP 422 (validation error Polar), Error de red
* **Persistencia afectada:** En caso de exito: escribe `~/.brew-tui/license.json` (AES-256-GCM, modo 0o600) via `saveLicense()`
* **Impacto en UI:** Vista `account` — flujo de activacion; CLI subcommand `brew-tui activate <key>`

### Cobertura

* [x] Contrato correcto
* [x] Validacion correcta
* [ ] Auth correcta
* [x] Errores correctos
* [ ] Idempotencia correcta
* [ ] Logging correcto
* [ ] Metricas correctas
* [ ] Timeouts correctos
* [ ] Retries correctos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | La llamada `fetch()` en `post()` no tiene `signal` ni `AbortController`. Un servidor Polar que no responda bloquea el proceso Node indefinidamente. | Alta | `polar-api.ts:44` — `await fetch(url, { method: 'POST', ... })` sin timeout | Crear `AbortController` con `setTimeout` (ej. 15s) y pasarlo como `signal` en las opciones de `fetch` |
| Riesgo | No hay retry automatico ante errores de red transitorios. Un fallo de conectividad momentaneo provoca un error inmediato al usuario sin reintento. | Media | `polar-api.ts:41–66` — el bloque `post()` lanza directamente en caso de error de red | Implementar retry con backoff exponencial (max 3 intentos, delays 1s/2s/4s) para errores de red |
| Riesgo | La funcion `activateLicense` llama a `validate` internamente (linea 79) para obtener datos del cliente, pero silencia cualquier error de esa llamada secundaria (`catch {}`). Si `validate` falla, `customerEmail` y `customerName` quedan como strings vacios en la licencia guardada. | Baja | `polar-api.ts:86–88` — `catch { // customer info is non-critical }` | Documentar explicitamente que estos campos pueden quedar vacios; agregar log de advertencia en el catch |
| Riesgo | Auth marcada como no conforme porque el `organization_id` (`b8f245c0-d116-4457-92fb-1bda47139f82`) esta hard-coded en el fuente publico (`polar-api.ts:8`). Cualquier persona puede leerlo del repositorio o del bundle distribuido y usarlo para consultar la API de Polar en nombre del proyecto. La autenticacion real del llamador (que es la licencia del usuario) es correcta, pero la identidad del organizador esta expuesta. | Media | `polar-api.ts:8` — `export const POLAR_ORGANIZATION_ID = 'b8f245c0-...'` | Para un proyecto open-source esto es inherente al modelo cliente-a-API de Polar; documentar el riesgo; considerar moverlo a una variable de entorno inyectada en build si se quiere obscurecer |
| Riesgo | No se garantiza idempotencia. Si el usuario llama `brew-tui activate <key>` dos veces seguidas (antes de que la primera escritura en disco complete), se crean dos activaciones en Polar, consumiendo dos slots. El rate limiter local (`ACTIVATION_COOLDOWN_MS = 30s`) mitiga el caso de usuario, pero no el caso de script automatizado. | Media | `license-manager.ts:196–226` — sin comprobacion de activacion preexistente antes de llamar a `apiActivate()`; `polar-api.ts:68` — llamada directa sin deduplicacion | Comprobar si ya existe una licencia activa en disco antes de activar; si existe, validarla en lugar de crear nueva activacion |
| Mejora | No existe logging de la operacion de activacion (exito o fallo). Imposible diagnosticar problemas de activacion sin reproducirlos. | Media | `polar-api.ts` y `license-manager.ts:196–226` — sin ningun `console.error` ni logging estructurado en la ruta de activacion | Agregar logging de errores (con nivel warn/error) que incluya el tipo de error sin exponer la license key |
| Mejora | No hay metricas (duracion de la llamada, tasa de exito/fallo). Esperado para una app CLI pero impide monitoreo futuro. | Baja | Todo el modulo `polar-api.ts` — sin instrumentacion | Considerar logging de duracion al menos en modo debug |

---

## Endpoint 2: POST /v1/customer-portal/license-keys/validate (Polar API)

* **Metodo:** POST
* **Ruta:** `https://api.polar.sh/v1/customer-portal/license-keys/validate`
* **Auth:** `key` + `organization_id` + `activation_id` en body (mismo modelo que activate)
* **Archivo:** `src/lib/license/polar-api.ts` (funcion `validateLicense`, linea 106) — llamado desde `src/lib/license/license-manager.ts` (funcion `revalidate`, linea 234)
* **Input DTO:** `{ key: string, organization_id: string, activation_id: string }`
* **Output DTO:** `LemonSqueezyValidateResponse` — `{ valid: boolean, error: string|null, license_key: { id, status, key, expires_at }, instance: { id } }`
* **Errores esperados:** HTTP 404 (activation no encontrada), HTTP 400 (parametros invalidos), Error de red (tolerado: activa grace period)
* **Persistencia afectada:** En caso de exito: actualiza `lastValidatedAt` en `~/.brew-tui/license.json`; en caso de fallo de validacion: cambia status a `'expired'`
* **Impacto en UI:** Revalidacion automatica cada 24h al arrancar la app; vista `account`; tambien invocado internamente por `activateLicense`

### Cobertura

* [x] Contrato correcto
* [x] Validacion correcta
* [ ] Auth correcta
* [x] Errores correctos
* [x] Idempotencia correcta
* [ ] Logging correcto
* [ ] Metricas correctas
* [ ] Timeouts correctos
* [ ] Retries correctos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Sin timeout en `fetch()`. Identico al endpoint activate. Un servidor colgado durante la revalidacion de 24h bloquea el arranque de la app TUI indefinidamente. | Alta | `polar-api.ts:44` — mismo `post()` generico sin `signal` | Mismo `AbortController` de 15s recomendado para activate aplica aqui |
| Bug | La llamada `validateLicense` en `license-manager.ts:revalidate` captura excepciones de red con un `catch` generico y devuelve `isWithinGracePeriod()` como resultado. El error de red queda completamente silenciado sin ningun log, imposibilitando el diagnostico. | Media | `license-manager.ts:251–253` — `catch { return isWithinGracePeriod(license); }` | Agregar `console.warn` o logging del error de red en el catch para diagnostico |
| Riesgo | Auth marcada como no conforme por el mismo motivo que en activate: el `organization_id` esta hard-coded en fuente publico. | Media | `polar-api.ts:8` — misma referencia que en Endpoint 1 | Misma accion recomendada que en Endpoint 1 |
| Riesgo | No hay retry ante errores de red transitorios en la revalidacion. El grace period de 7 dias cubre el caso de red caida, pero un error momentaneo que ocurra justo al expirar el grace period puede denegar acceso Pro innecesariamente. | Media | `license-manager.ts:251–253` — no hay logica de retry antes del catch | Implementar 1-2 reintentos rapidos antes de considerar el error definitivo |
| Mejora | Sin logging de validaciones exitosas ni fallidas. Dado que es la operacion critica del modelo de negocio, deberia registrarse al menos el resultado (valido/invalido/red caida) sin exponer la key. | Media | `license-manager.ts:234–255` — ninguna llamada a console ni logger | Agregar logging de nivel info/warn en los tres caminos: exito, invalido, error de red |
| Mejora | Sin metricas de latencia ni tasa de error para las llamadas de validacion periodica. | Baja | `polar-api.ts` completo | Considerar registro de latencia para detectar degradacion del servicio Polar |

---

## Endpoint 3: POST /v1/customer-portal/license-keys/deactivate (Polar API)

* **Metodo:** POST
* **Ruta:** `https://api.polar.sh/v1/customer-portal/license-keys/deactivate`
* **Auth:** `key` + `organization_id` + `activation_id` en body (mismo modelo)
* **Archivo:** `src/lib/license/polar-api.ts` (funcion `deactivateLicense`, linea 129) — llamado desde `src/lib/license/license-manager.ts` (funcion `deactivate`, linea 257)
* **Input DTO:** `{ key: string, organization_id: string, activation_id: string }`
* **Output DTO:** Ninguno (espera HTTP 204 No Content)
* **Errores esperados:** HTTP 404 (activation no encontrada), HTTP 400, Error de red — todos silenciados por diseno "best effort"
* **Persistencia afectada:** Siempre elimina `~/.brew-tui/license.json` via `clearLicense()`, independientemente del resultado de la llamada API
* **Impacto en UI:** Vista `account` — boton desactivar; CLI subcommand `brew-tui deactivate`

### Cobertura

* [ ] Contrato correcto
* [ ] Validacion correcta
* [ ] Auth correcta
* [ ] Errores correctos
* [ ] Idempotencia correcta
* [ ] Logging correcto
* [ ] Metricas correctas
* [ ] Timeouts correctos
* [ ] Retries correctos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | La funcion `deactivate` en `license-manager.ts` envuelve la llamada API en `try { ... } catch { /* best effort */ }` y luego llama `clearLicense()` incondicionalmente. Si la llamada a Polar falla (red caida, timeout, 404), el slot de activacion queda huerfano en el servidor: el usuario pierde la licencia localmente pero la activacion sigue contando en Polar. En un plan con limite de activaciones, esto impide reactivar en otro equipo. | Critica | `license-manager.ts:257–261` — `try { await apiDeactivate(...) } catch { /* best effort */ }` seguido de `await clearLicense()` siempre | Reintentar la llamada de deactivacion 2-3 veces antes de silenciar el error; advertir al usuario si la desactivacion remota fallo; ofrecer mecanismo de recuperacion (ej. soporte manual via email) |
| Bug | Sin timeout en `fetch()`. En el peor caso, el usuario confirma la desactivacion y la UI queda bloqueada indefinidamente esperando respuesta del servidor antes de que se borre el archivo local. | Alta | `polar-api.ts:44` — mismo `post()` sin `signal`; `deactivateLicense` llama `post('deactivate', ...)` | Aplicar `AbortController` con timeout de 15s igual que los demas endpoints |
| Riesgo | No hay validacion de que `instanceId` sea no-nulo ni con formato valido antes de llamar a la API. Si el `license.instanceId` en el archivo cifrado esta corrupto o vacio, Polar devolvera un error que sera silenciado, dejando el estado inconsistente (licencia borrada localmente, activacion activa remotamente). | Alta | `polar-api.ts:129–135` — `deactivateLicense(key, instanceId)` sin validar `instanceId`; `license-manager.ts:258` — `apiDeactivate(license.key, license.instanceId)` sin comprobacion previa | Validar que `instanceId` sea no-vacio antes de llamar a la API; devolver error explicito al usuario en caso contrario |
| Bug | El contrato de retorno esta mal definido para el caso de error. `deactivateLicense` usa `post<void>(..., expectEmpty = true)`, pero si Polar devuelve un codigo de error HTTP (400, 404), `post()` lanza una excepcion que el caller en `license-manager.ts` silencia con `catch { /* best effort */ }`. El contrato observable para el llamador es "siempre exito o silencio". | Media | `polar-api.ts:130–134` — `post<void>('deactivate', ..., true)`; `license-manager.ts:260` — `catch { /* best effort */ }` | Distinguir entre error de red (retry) y error HTTP 4xx (mostrar al usuario); no silenciar ambos con el mismo catch generico |
| Riesgo | Auth marcada como no conforme por el mismo motivo que en activate y validate: `organization_id` hard-coded en fuente publico. | Media | `polar-api.ts:8` | Misma accion recomendada que en Endpoint 1 |
| Riesgo | Idempotencia no garantizada. Si la llamada API falla silenciosamente y el archivo local ya fue borrado, no hay forma de reintentar la desactivacion remota en una segunda ejecucion (`src/index.tsx:34` devuelve temprano si `!license`). El slot en Polar puede quedar activo permanentemente. | Alta | `src/index.tsx:34–35` — `if (!license) { console.log(t('cli_noLicense')); return; }` — segunda ejecucion de deactivate no puede reintentar | Guardar el `instanceId` y `key` hasta confirmar la desactivacion remota exitosa; o proveer un mecanismo de desactivacion forzada con key/instanceId explicitos |
| Mejora | Sin logging. La desactivacion es la operacion mas critica del modelo de negocio despues de la activacion, y no deja ningun rastro en caso de fallo. | Alta | `license-manager.ts:257–261` — sin ningun log en el bloque de deactivacion | Registrar siempre el resultado: exito, fallo de red (con codigo HTTP), o fallo del servidor |
| Mejora | Sin metricas de la operacion de desactivacion. | Baja | `polar-api.ts` y `license-manager.ts` completos | Registrar al menos la duracion y el resultado final |

---

## Endpoint 4: POST /v1/querybatch (OSV.dev API)

* **Metodo:** POST
* **Ruta:** `https://api.osv.dev/v1/querybatch`
* **Auth:** Sin autenticacion (API publica de OSV.dev)
* **Archivo:** `src/lib/security/osv-api.ts` (funcion `queryBatch`, linea 60) — orquestada desde `queryVulnerabilities` (linea 120), llamada por `src/lib/security/audit-runner.ts` (linea 34)
* **Input DTO:** `{ queries: Array<{ package: { name: string, ecosystem: 'Homebrew' }, version: string }> }` — batches de hasta 100 paquetes
* **Output DTO:** `{ results: Array<{ vulns?: OsvVulnerability[] }> }` — array paralelo al input; cada elemento puede tener 0 o N vulnerabilidades
* **Errores esperados:** HTTP 400 (paquete con formato invalido — dispara fallback one-by-one), HTTP 429 (rate limit), HTTP 5xx (servidor OSV caido)
* **Persistencia afectada:** Ninguna (solo lectura, sin cache)
* **Impacto en UI:** Vista `security-audit` (Pro) — funcion `runSecurityAudit()`; feature gateada por `requirePro()` en `audit-runner.ts:18`

**Nota sobre el "fallback a /v1/query":** La documentacion de tarea describe un fallback a `POST /v1/query`, pero el codigo real no usa ese endpoint. La funcion `queryOneByOne` (linea 100) llama recursivamente a `queryBatch` con batches de un solo elemento — sigue usando `/v1/querybatch`. No existe ninguna referencia a `/v1/query` en el codebase.

### Cobertura

* [x] Contrato correcto
* [ ] Validacion correcta
* [x] Auth correcta
* [ ] Errores correctos
* [x] Idempotencia correcta
* [ ] Logging correcto
* [ ] Metricas correctas
* [ ] Timeouts correctos
* [ ] Retries correctos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Sin timeout en `fetch()`. Para instalaciones con cientos de paquetes, la funcion `queryVulnerabilities` dispara multiples llamadas batch secuenciales. Si OSV.dev deja de responder en una de ellas, el proceso queda bloqueado indefinidamente y la vista security-audit nunca termina de cargar. | Alta | `osv-api.ts:64` — `await fetch(OSV_BATCH_URL, { method: 'POST', ... })` sin `signal` | Aplicar `AbortController` con timeout de 30s por llamada batch |
| Riesgo | No hay manejo de HTTP 429 (rate limiting). Si OSV.dev devuelve rate limit, el codigo ejecuta el path de error generico (`throw new Error(...)`) sin logica de backoff ni espera. | Alta | `osv-api.ts:72–75` — solo maneja 400 especialmente; cualquier otro status no-ok lanza error generico | Detectar HTTP 429, extraer `Retry-After` header si existe, e implementar espera con backoff |
| Bug | Los errores de paquetes individuales en `queryOneByOne` se silencian con `catch { // Skip }`. El usuario ve el resultado como si esos paquetes no tuvieran vulnerabilidades cuando en realidad no fueron consultados — falso negativo silencioso. | Alta | `osv-api.ts:112–113` — `catch { // Skip packages that the API rejects }` | Registrar los paquetes omitidos; mostrar en la UI un contador de "N paquetes no consultados" para informar al usuario de la completitud del scan |
| Riesgo | Sin validacion de los inputs enviados a OSV. Los nombres de paquetes y versiones vienen del output de `brew info --json`, lo que reduce el riesgo, pero no se valida que `name` ni `version` sean strings no vacios antes de construir la query. Una entrada invalida puede causar HTTP 400 y disparar el fallback one-by-one degradando el rendimiento. | Media | `osv-api.ts:122–128` — `batch.map((p) => ({ package: { name: p.name, ecosystem: 'Homebrew' }, version: p.version }))` sin validacion previa | Filtrar paquetes con `name` o `version` vacios antes de construir las queries |
| Riesgo | Sin delay entre batches consecutivos. Para instalaciones grandes (500+ paquetes = 5+ batches de 100), los requests se disparan en secuencia sin ninguna pausa, aumentando el riesgo de throttling. | Media | `osv-api.ts:126–133` — bucle `for` sin `await sleep()` entre iteraciones | Agregar delay minimo (ej. 200ms) entre batches; manejar 429 con Retry-After |
| Mejora | Sin logging. Fallos de OSV, paquetes omitidos y errores de parseo se pierden silenciosamente. | Media | `osv-api.ts` completo — sin ningun `console.warn` | Agregar logging de nivel warn para errores de API y paquetes omitidos |
| Mejora | Sin cache de resultados. Cada apertura de la vista security-audit dispara llamadas de red completas aunque los paquetes instalados no hayan cambiado. | Baja | `audit-runner.ts:34` — `const vulnMap = await queryVulnerabilities(packages)` sin cache | Implementar cache con TTL (ej. 1h) en `~/.brew-tui/` |

---

## Endpoint 5: GET GitHub Release Download (BrewBar installer)

* **Metodo:** GET (redirect seguido automaticamente por `fetch`)
* **Ruta:** `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip`
* **Auth:** Sin autenticacion (release publico); protegido localmente por `verifyPro()` antes de la llamada
* **Archivo:** `src/lib/brewbar-installer.ts` (funcion `installBrewBar`, linea 23)
* **Input DTO:** Ninguno (GET sin body)
* **Output DTO:** Stream binario ZIP — se escribe directamente a `/tmp/BrewBar.app.zip` via `pipeline(res.body, fileStream)`
* **Errores esperados:** HTTP 4xx/5xx (GitHub no disponible o release no encontrado), `res.ok === false`, error de escritura en disco, fallo de `ditto` al descomprimir
* **Persistencia afectada:** Escribe `/tmp/BrewBar.app.zip` (temporal), descomprime a `/Applications/BrewBar.app`; el tmp se elimina en el bloque `finally`
* **Impacto en UI:** CLI subcommand `brew-tui install-brewbar [--force]` — no tiene vista TUI propia

### Cobertura

* [x] Contrato correcto
* [x] Validacion correcta
* [x] Auth correcta
* [ ] Errores correctos
* [ ] Idempotencia correcta
* [ ] Logging correcto
* [ ] Metricas correctas
* [ ] Timeouts correctos
* [ ] Retries correctos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Sin timeout en `fetch()` para la descarga del ZIP. BrewBar.app puede pesar varios MB. Si GitHub deja de responder a mitad de la descarga, el proceso queda bloqueado indefinidamente sin ninguna forma de cancelar. | Critica | `brewbar-installer.ts:42` — `const res = await fetch(DOWNLOAD_URL)` sin `signal`; `brewbar-installer.ts:49` — `await pipeline(res.body as any, fileStream)` sin timeout | Crear `AbortController` con timeout de 120s (descarga de binario); pasarlo como `signal` al `fetch` |
| Riesgo | No se verifica la integridad del archivo descargado. El ZIP se descomprime directamente con `ditto` sin comprobar checksum (SHA256 u otro). Si el archivo esta corrupto (descarga incompleta) o ha sido manipulado (MITM), se instala un binario potencialmente danino en `/Applications/`. | Critica | `brewbar-installer.ts:57–60` — `await execFileAsync('ditto', ['-xk', TMP_ZIP, '/Applications/'])` sin ninguna verificacion previa | Publicar checksum SHA256 del ZIP en el release de GitHub y verificarlo con `crypto.createHash('sha256')` antes de descomprimir |
| Bug | Error handling incompleto: si `res.ok` es false, el error se lanza con el texto de la i18n key `cli_brewbarDownloadFailed`, pero no incluye el `res.statusText` ni headers de diagnostico del servidor. Ademas, si `!res.body` (respuesta vacia inesperada), el error es identico aunque la causa sea diferente. | Media | `brewbar-installer.ts:43–44` — `if (!res.ok \|\| !res.body) { throw new Error(t('cli_brewbarDownloadFailed', { error: \`HTTP ${res.status}\` })) }` — se podria incluir `res.statusText` para mas contexto | Incluir `res.statusText` en el mensaje de error; separar el caso `!res.body` del caso `!res.ok` con mensajes distintos |
| Bug | Idempotencia parcialmente cubierta: la llamada sin `--force` esta protegida por `isBrewBarInstalled()` check. Pero en modo `--force`, se borra la app existente y se descarga de nuevo incondicionalmente, lo que puede dejar el sistema sin BrewBar si la descarga falla a mitad. El check no protege contra la ventana donde la app fue eliminada pero la descarga no completo. | Alta | `brewbar-installer.ts:52–54` — `await rm(BREWBAR_APP_PATH, ...)` antes de verificar que la descarga es valida | Descargar y verificar el ZIP primero; borrar la app existente solo despues de que el ZIP es valido |
| Riesgo | No hay retry ante fallos de red. Un error HTTP transitorio (GitHub CDN, proxy) provoca error inmediato al usuario sin reintento. | Media | `brewbar-installer.ts:43–44` — `if (!res.ok || !res.body) { throw new Error(...) }` sin logica de retry | Implementar 2 reintentos con backoff para errores de red (no para 404) |
| Bug | El cast `res.body as any` silencia el tipo incorrecto. En Node.js 18+ `fetch` devuelve un `ReadableStream` Web, no un `NodeJS.ReadableStream`. El cast `as any` impide que TypeScript detecte incompatibilidades en versiones futuras. | Media | `brewbar-installer.ts:49` — `res.body as any` | Usar `Readable.fromWeb(res.body)` de `node:stream` para conversion explicita y type-safe |
| Bug | Si el proceso es matado durante la descarga, `/tmp/BrewBar.app.zip` queda en disco corrupto. En la siguiente ejecucion, `ditto` puede encontrarlo si el SO no lo limpio. | Baja | `brewbar-installer.ts:48` — `createWriteStream(TMP_ZIP)` antes del `try`; el `finally` limpia solo si el proceso termina normalmente | Comprobar y eliminar el archivo temporal al inicio de `installBrewBar` antes de comenzar la descarga |
| Mejora | Sin logging de progreso. Para un archivo binario de varios MB, el usuario no recibe ningun feedback durante la descarga. | Media | `brewbar-installer.ts:39` — unico log antes de la descarga; nada durante ella | Mostrar porcentaje o bytes descargados leyendo `Content-Length` del response header |

---

## Endpoint 6: Brew CLI (execBrew / streamBrew)

* **Metodo:** `spawn('brew', args)` — interfaz de proceso a proceso, no HTTP
* **Ruta:** Multiples subcomandos: `info --json=v2 --installed`, `outdated --json=v2`, `services list --json`, `info --json=v2 <name>`, `search <term>`, `doctor`, `config`, `leaves`, `install <name>`, `upgrade [name]`, `uninstall <name>`, `services start|stop|restart <name>`, `update`
* **Auth:** No aplica (Homebrew no requiere autenticacion; ejecuta bajo el usuario actual del sistema)
* **Archivo:** `src/lib/brew-cli.ts` (funciones `execBrew` linea 3, `streamBrew` linea 23); coordinado por `src/lib/brew-api.ts`
* **Input DTO:** Array de argumentos strings — sanitizacion de flag injection solo en `search()` de `brew-api.ts` (linea 41: strip de leading dashes)
* **Output DTO:** Para `execBrew`: string con stdout completo. Para `streamBrew`: `AsyncGenerator<string>` con lineas individuales de stdout+stderr
* **Errores esperados:** Exit code != 0 (error de brew), error de spawn (brew no instalado), proceso colgado indefinidamente (timeout implicito: ninguno)
* **Persistencia afectada:** Segun subcomando: modifica Cellar de Homebrew (`install`, `uninstall`, `upgrade`), modifica launchd (`services start/stop/restart`), modifica repositorios locales de Homebrew (`update`)
* **Impacto en UI:** Todos los datos mostrados en la TUI provienen del Brew CLI; todas las operaciones de instalacion/desinstalacion/upgrade lo invocan

### Cobertura

* [x] Contrato correcto
* [ ] Validacion correcta
* [x] Auth correcta
* [x] Errores correctos
* [ ] Idempotencia correcta
* [ ] Logging correcto
* [ ] Metricas correctas
* [ ] Timeouts correctos
* [ ] Retries correctos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | No hay timeout en `execBrew()`. Subcomandos como `brew doctor` pueden tardar 10-30s; `brew update` puede tardar minutos; `brew install` puede colgar si hay un lock de Homebrew activo. Si brew no termina, el proceso Node queda bloqueado indefinidamente. | Alta | `brew-cli.ts:4–21` — `new Promise` sin ninguna referencia a `setTimeout` ni `AbortSignal`; solo `streamBrew.finally()` mata el proceso hijo (linea 68) pero `execBrew` no tiene mecanismo equivalente | Agregar timeout configurable en `execBrew` (ej. 60s default, 300s para operaciones largas); matar el proceso hijo con `proc.kill()` al expirar |
| Riesgo | La sanitizacion anti-flag-injection existe solo para `search`. Los demas subcomandos que aceptan nombres de paquetes (`install`, `uninstall`, `upgrade`, `info`) no aplican ninguna sanitizacion. Un nombre que comience con `--` podria interpretarse por brew como un flag. Los nombres actualmente vienen del output de brew (riesgo bajo), pero si en el futuro se aceptan desde input externo, la superficie de ataque se amplia. | Media | `brew-api.ts:68–82` — `installPackage(name)`, `uninstallPackage(name)`, `upgradePackage(name)` sin sanitizacion; `brew-cli.ts:4–5` — `spawn('brew', args)` sin whitelist | Aplicar la misma sanitizacion de leading dashes a todos los parametros `name`; considerar usar `--` como separador de argumentos en brew commands |
| Riesgo | Idempotencia no conforme para los subcomandos de modificacion del sistema. `brew install` en un paquete ya instalado puede causar conflictos; `brew uninstall` en un paquete no instalado da error; `brew services start` en un servicio ya iniciado puede fallar. Cada subcomando tiene semantica distinta respecto a la idempotencia y no hay manejo de estos casos. | Media | `brew-api.ts:68,80,85` — `installPackage`, `uninstallPackage`, `serviceAction` sin comprobacion de estado previo | Comprobar estado antes de ejecutar operaciones destructivas (el estado esta disponible en el brew-store); manejar explicitamente los errores "ya instalado" / "no instalado" |
| Riesgo | `streamBrew` usa un busy-wait de 50ms para hacer polling de la cola de lineas en lugar de ser completamente event-driven. En sesiones largas (instalar muchas dependencias), esto mantiene el event loop activo con 20 ticks/segundo por operacion. | Baja | `brew-cli.ts:62–64` — `await new Promise((r) => setTimeout(r, 50))` dentro del bucle `while (!done)` | Usar un esquema event-driven puro: resolver una Promise cuando lleguen nuevas lineas desde el event handler `push`, en lugar de polling con sleep |
| Riesgo | No hay logging de los subcomandos ejecutados ni de sus exit codes. Ante un fallo de instalacion o upgrade capturado por el store pero no mostrado en pantalla, el error se pierde sin traza. | Media | `brew-cli.ts:10–12` — `reject(new Error(stderr.trim()))` sin logging previo; `brew-api.ts` — todas las funciones lanzan sin log | Agregar logging de nivel debug para los argumentos de cada invocacion y el exit code resultante |
| Mejora | No existen metricas de duracion de los subcomandos. Imposible saber si `brew info --installed` tarda 200ms o 5s en diferentes equipos. | Baja | `brew-cli.ts` completo — sin `Date.now()` ni `performance.now()` | Para diagnostico, loggear la duracion de cada subcomando en modo verbose |
| Mejora | `execBrew` no tiene logica de retry. Para subcomandos de solo lectura (`info`, `outdated`, `services`), un fallo transitorio de brew podria recuperarse con 1 reintento. | Baja | `brew-cli.ts:4–21` — un solo intento sin retry | Implementar 1 reintento para subcomandos de solo lectura; no reintentar operaciones con side-effects |

---

## Hallazgos transversales

Los siguientes problemas afectan a todos los endpoints/grupos auditados.

### HT-1: Ausencia total de timeouts (Alta)

**Aplica a:** Todos los `fetch()` de Polar API, OSV API y GitHub Download; `execBrew()` del Brew CLI.

Ninguna de las tres funciones que llaman a `fetch()` (`polar-api.ts:post()`, `osv-api.ts:queryBatch()`, `brewbar-installer.ts:installBrewBar()`) utiliza `AbortController` ni el parametro `signal`. La primitiva `execBrew` tampoco tiene timeout. En Node.js, un `fetch()` o un proceso hijo sin timeout puede quedar pendiente indefinidamente. Para una aplicacion TUI interactiva, esto se manifiesta como una pantalla congelada sin mensaje de error ni posibilidad de cancelacion por parte del usuario.

Patron de mitigacion recomendado para `fetch`:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);
try {
  const res = await fetch(url, { signal: controller.signal, ...options });
} finally {
  clearTimeout(timeout);
}
```

### HT-2: Ausencia total de logging estructurado (Alta)

**Aplica a:** Todos los modulos de API (`polar-api.ts`, `osv-api.ts`, `brewbar-installer.ts`, `brew-cli.ts`).

Ningun modulo emite logs de errores, advertencias ni eventos de negocio. Ante un incidente (usuario que no puede activar su licencia, scan de seguridad que falla silenciosamente, instalacion de BrewBar que se cuelga), no hay ninguna traza de diagnostico disponible. El unico output al usuario es un mensaje de error en pantalla, que puede no capturarse si el error ocurre en un camino no controlado.

### HT-3: Ausencia de metricas de instrumentacion (Baja)

**Aplica a:** Todos los endpoints.

Esperado para una aplicacion CLI/TUI, pero todas las llamadas externas (Polar, OSV, GitHub) carecen de instrumentacion de latencia, contadores de errores o tasa de exito. Si el proyecto evoluciona hacia un modelo mas instrumentado (dashboard de salud, telemetria opt-in), esta ausencia sera una deuda tecnica a abordar.
