# 20. Auditoria por endpoint

> Auditor: endpoint-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 no dispone de backend propio. La "superficie de endpoints" del proyecto se
compone de cuatro capas heterogeneas: tres integraciones HTTP con servicios externos (Polar.sh,
OSV.dev y GitHub Releases) y una capa de subprocesos (spawn) para invocar la CLI de Homebrew.
Se auditaron **9 call sites discretos** (3 endpoints Polar.sh, 2 paths OSV.dev, 2 GETs a
GitHub Releases y 2 primitivas brew-cli mas sus wrappers de nivel alto).

El mayor riesgo transversal es la **ausencia de validacion de respuesta en tiempo de ejecucion**:
todas las respuestas HTTP se castean directamente con `as T` sin comprobar que los campos
requeridos existan y tengan el tipo correcto. Un cambio de contrato en cualquier API externa o
una respuesta malformada produciria `undefined` donde se espera `string`, propagandose
silenciosamente a la UI o al sistema de licencias.

El segundo riesgo destacado es que el **mecanismo de verificacion de integridad SHA-256 de
BrewBar es codigo muerto en produccion**: el archivo `.sha256` nunca ha sido generado por el
workflow de CI, lo que hace que la descarga del binario nunca haya sido verificada desde que se
implemento esta funcionalidad (reportado como Alta en seccion 08-security.md; se referencia sin
repetir la evidencia).

---

## Estadisticas por categoria

| Categoria | Cumple | No cumple | % Cumplimiento |
|-----------|--------|-----------|----------------|
| Contrato correcto | 5 | 4 | 56% |
| Validacion correcta | 1 | 8 | 11% |
| Auth correcta | 9 | 0 | 100% |
| Errores correctos | 7 | 2 | 78% |
| Idempotencia correcta | 6 | 3 | 67% |
| Logging correcto | 0 | 9 | 0% |
| Metricas correctas | 0 | 9 | 0% |
| Timeouts correctos | 6 | 3 | 67% |
| Rate limiting / retries | 2 | 7 | 22% |

> Nota: "9 call sites" = 3 Polar + 2 OSV + 2 GitHub + `execBrew` + `streamBrew` (incluye
> `brewUpdate` como variante de `execBrew`).

---

## Mapa de call sites

| Mecanismo | Metodo | Destino | Auth | Validacion input | Estado global |
|-----------|--------|---------|------|-----------------|---------------|
| `POST /activate` | POST | api.polar.sh | Key en body | Key format (local) | Parcial |
| `POST /validate` (activacion) | POST | api.polar.sh | Key + activation_id en body | Key format | Parcial |
| `POST /validate` (revalidacion) | POST | api.polar.sh | Key + activation_id en body | Ninguna en revalidate() | Parcial |
| `POST /deactivate` | POST | api.polar.sh | Key + activation_id en body | Ninguna | Parcial |
| `POST /v1/querybatch` (batch) | POST | api.osv.dev | Sin auth (API publica) | Ninguna | Parcial |
| `POST /v1/querybatch` (one-by-one) | POST | api.osv.dev | Sin auth (API publica) | Ninguna | No conforme |
| `GET BrewBar.app.zip` | GET | github.com | Sin auth | Content-Length (incompleto) | No conforme |
| `GET BrewBar.app.zip.sha256` | GET | github.com | Sin auth | Ninguna | No conforme |
| `execBrew` + wrappers | spawn | brew (local) | N/A | Parcial (solo search) | Parcial |
| `streamBrew` | spawn | brew (local) | N/A | Ninguna | No conforme |

---

## Endpoint 1: POST /activate — Polar.sh

* **Metodo:** POST
* **Ruta:** `https://api.polar.sh/v1/customer-portal/license-keys/activate`
* **Auth:** Sin header de autorizacion. La autenticacion se realiza incluyendo `key` y
  `organization_id` en el cuerpo JSON.
* **Archivo:** `src/lib/license/polar-api.ts` (funcion `activateLicense`, lineas 69-105)
  invocada desde `src/lib/license/license-manager.ts` (`activate`, lineas 206-236)
* **Input:** `{ key: string, organization_id: string, label: string }` — `label` contiene
  el hostname del equipo.
* **Output esperado:** `PolarActivation { id: string, license_key: { status, expires_at } }`
* **Errores esperados:** HTTP 400 (key invalida), 404 (organizacion no encontrada), 409
  (limite de activaciones alcanzado), 5xx (error del servidor). Todos producen `throw new
  Error(message)`.
* **Persistencia afectada:** Escribe `~/.brew-tui/license.json` (AES-256-GCM) tras activacion
  exitosa. Tambien dispara un segundo POST a `/validate` para obtener el email del cliente.
* **Impacto en UI:** `AccountView` (src/views/account-view.tsx), subcomando `brew-tui activate`.

### Cobertura

* [x] Contrato correcto — respuesta mapeada a `LemonSqueezyActivateResponse` con campos
  normalizados; error en formato JSON extraido con multiples fallbacks (`detail`/`error`/`message`)
* [ ] Validacion correcta — validacion de `key` presente en `validateLicenseKey()`, pero el
  campo `label` (hostname) no se sanitiza; `organization_id` es constante no validada en
  ejecucion. Sin embargo, el problema critico es que **la respuesta `PolarActivation` no se
  valida en runtime**: `res.json() as PolarActivation` (linea 66) castea sin comprobar que
  `activation.id` o `activation.license_key.status` sean strings.
* [x] Auth correcta — la clave de licencia del usuario viaja en el cuerpo cifrado por TLS.
  No hay secretos de API del vendedor expuestos.
* [x] Errores correctos — `post()` comprueba `res.ok`, extrae el mensaje de error del cuerpo
  JSON y lanza `Error`. El caller (`activate`) propaga la excepcion. Rate limiting local previene
  abusos.
* [x] Idempotencia correcta — una segunda llamada con la misma key crea una nueva activacion
  (no es idempotente por diseno); el rate limiter evita llamadas accidentales duplicadas en
  la misma sesion.
* [ ] Logging correcto — no hay logging de errores de activacion (ni en `activate()` ni en
  `apiActivate()`); el error solo se propaga a la UI. No hay registro de auditoria de intentos.
* [ ] Metricas correctas — sin instrumentacion de latencia, tasa de error ni contadores de activacion.
* [x] Timeouts correctos — `fetchWithTimeout` con 15 000 ms (adecuado para una llamada de autenticacion).
* [ ] Rate limiting / retries — el rate limiter cliente existe para activacion pero **no hay
  retry en caso de error de red transitorio**. Una falla de red justo despues del pago deja
  al usuario sin licencia activa sin posibilidad de reintento automatico. Solo `deactivate`
  tiene reintentos (3x con 1s de espera).

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | `res.json() as PolarActivation` en `post()` no valida los campos de la respuesta en runtime; si Polar cambia el contrato o retorna un cuerpo malformado, `activation.id` sera `undefined` y se guardara una licencia con `instanceId: undefined`, rompiendo todas las revalidaciones posteriores | Alta | `polar-api.ts:66` — `return res.json() as Promise<T>` sin type guard; `activateLicense:94` — `instance: { id: activation.id }` | Agregar una funcion `assertPolarActivation(obj): asserts obj is PolarActivation` que verifique que `id` sea `string` y `license_key.status` sea `string` antes de retornar |
| Mejora | Sin retry en activacion ante errores de red transitorios | Media | `license-manager.ts:212` — `apiActivate(key)` sin envoltorio de reintento; contrasta con `deactivate` (lineas 268-278) que si tiene 3 reintentos | Agregar reintento con backoff exponencial (2-3 intentos, backoff 1s/2s) en `activate()` para errores de red (no para errores HTTP 4xx) |
| Mejora | `hostname()` transmitido a Polar.sh como `label` sin informar al usuario | Baja | `polar-api.ts:73` — `label: hostname()` (ya reportado en 08-security.md 13.3; se referencia sin duplicar la accion) | Ver hallazgo en 08-security.md — reemplazar con UUID anonimo |
| Mejora | Sin logging de intentos de activacion fallidos | Baja | `license-manager.ts:206-236` — el bloque `try/finally` solo registra el resultado en el tracker en memoria; no hay log persistente | Registrar timestamp, resultado (success/failure) y codigo de error en un log de auditoria separado (no la key en si) |

---

## Endpoint 2: POST /validate — Polar.sh (revalidacion periodica)

* **Metodo:** POST
* **Ruta:** `https://api.polar.sh/v1/customer-portal/license-keys/validate`
* **Auth:** `key` + `organization_id` + `activation_id` en body.
* **Archivo:** `src/lib/license/polar-api.ts` (funcion `validateLicense`, lineas 107-128),
  invocada desde `src/lib/license/license-manager.ts` (`revalidate`, lineas 244-265) y
  tambien desde `activateLicense` (linea 80) para obtener el email del cliente.
* **Input:** `{ key: string, organization_id: string, activation_id: string }`
* **Output esperado:** `PolarValidated { id, status, expires_at, customer: { email, name }, activation }`
* **Errores esperados:** HTTP 400/404 (key o activation_id no encontrados), 5xx. En
  `revalidate()`, cualquier excepcion de red se captura y se evalua el grace period.
* **Persistencia afectada:** Actualiza `~/.brew-tui/license.json` con `lastValidatedAt` y
  nuevo `expiresAt`.
* **Impacto en UI:** `AccountView`, indicador Pro en `Header`, gating de vistas Pro.

### Cobertura

* [ ] Contrato correcto — `res.json() as PolarValidated` (polar-api.ts:66) sin validacion
  runtime. Si `res.status` o `res.expires_at` son `undefined` por cambio de contrato, la
  expresion `res.status === 'granted'` sera `false` y la licencia se marcara como expirada
  silenciosamente.
* [ ] Validacion correcta — en `revalidate()` (license-manager.ts:246) no hay validacion
  previa de `license.key` ni `license.instanceId` antes de llamar a la API. Si `loadLicense`
  retorna un objeto con campos `undefined` (ver hallazgo de cast sin validacion en
  07-backend-persistence.md 11.3), la llamada a la API falla silenciosamente con un error HTTP
  que cae en el grace period.
* [x] Auth correcta — misma razon que `/activate`.
* [x] Errores correctos — `revalidate()` captura todos los errores de red y los degrada
  correctamente al grace period. Los errores HTTP 4xx se tratan como licencia expirada.
* [x] Idempotencia correcta — la validacion es idempotente: el mismo input siempre produce
  el mismo estado de licencia.
* [ ] Logging correcto — el bloque `catch` en `revalidate()` (linea 261) descarta el error
  de red sin loguear nada; en produccion no hay forma de distinguir un error 401 (licencia
  revocada) de un timeout de red.
* [ ] Metricas correctas — sin instrumentacion.
* [x] Timeouts correctos — `fetchWithTimeout` con 15 000 ms.
* [ ] Rate limiting / retries — sin retry en revalidacion. Una falla de red transitoria
  durante la revalidacion cada 24h activa el grace period sin intentar de nuevo, lo que puede
  acumular tiempo offline innecesariamente.

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | `PolarValidated` no se valida en runtime; si `res.status` llega como `undefined`, la licencia se considera expirada sin notificacion de error | Alta | `polar-api.ts:66,114-115` — `return res.json() as Promise<T>`; `const valid = res.status === 'granted' && notExpired` | Agregar type guard `assertPolarValidated(obj)` que verifique `id`, `status` y `customer` antes de usar la respuesta |
| Bug | En `revalidate()`, el bloque `catch` agrupa errores de red Y errores de contrato (campo `undefined`) bajo el mismo flujo de grace period, ocultando bugs de integracion | Media | `license-manager.ts:261` — `} catch { return isWithinGracePeriod(license) ? 'grace' : 'expired'; }` | Separar errores de red (tratar con grace) de errores de validacion de respuesta (loguear y tratar como `expired` inmediatamente) |
| Mejora | Sin logging del motivo de la falla de revalidacion | Baja | `license-manager.ts:261` — catch sin log | Agregar log de debug con el tipo de error (network/HTTP status/parse) para diagnostico |

---

## Endpoint 3: POST /deactivate — Polar.sh

* **Metodo:** POST
* **Ruta:** `https://api.polar.sh/v1/customer-portal/license-keys/deactivate`
* **Auth:** `key` + `organization_id` + `activation_id` en body.
* **Archivo:** `src/lib/license/polar-api.ts` (funcion `deactivateLicense`, lineas 130-136),
  invocada desde `src/lib/license/license-manager.ts` (`deactivate`, lineas 267-280).
* **Input:** `{ key: string, organization_id: string, activation_id: string }`
* **Output esperado:** HTTP 204 No Content.
* **Errores esperados:** HTTP 400/404. La logica tiene 3 reintentos con 1s de espera.
* **Persistencia afectada:** `clearLicense()` elimina `~/.brew-tui/license.json` siempre,
  independientemente de si la desactivacion remota tuvo exito.
* **Impacto en UI:** Subcomando `brew-tui deactivate`; flujo de desactivacion en `AccountView`.

### Cobertura

* [x] Contrato correcto — `expectEmpty = true` hace que `post()` retorne `undefined` para
  HTTP 204 sin intentar parsear el body; manejo correcto del contrato de respuesta vacia.
* [x] Validacion correcta — la clave y el instanceId ya fueron validados al activar; se usan
  los valores del `LicenseData` ya almacenado.
* [x] Auth correcta — misma razon que los anteriores.
* [x] Errores correctos — 3 reintentos con catch; `clearLicense()` se llama siempre
  en el finally implicito; `remoteSuccess: false` informa al caller si el servidor no
  respondio.
* [x] Idempotencia correcta — la desactivacion es idempotente; una segunda llamada con la
  misma key+activation_id retornara un error HTTP pero el archivo local ya habra sido
  eliminado.
* [ ] Logging correcto — el bloque `catch` interno del loop (linea 274) descarta la excepcion
  sin loguear; si los 3 intentos fallan, el caller solo sabe que `remoteSuccess: false` pero
  no el motivo.
* [ ] Metricas correctas — sin instrumentacion.
* [x] Timeouts correctos — `fetchWithTimeout` con 15 000 ms por intento.
* [x] Rate limiting / retries — 3 reintentos con 1s de espera entre intentos; adecuado para
  desactivacion.

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | El loop de reintento descarta la excepcion sin loguear el motivo del fallo | Baja | `license-manager.ts:274` — `} catch { if (attempt < 2) await new Promise(r => setTimeout(r, 1000)); }` — sin log | Loguear el error en cada intento fallido (nivel debug/warn) para facilitar diagnostico de desactivaciones fallidas |

---

## Endpoint 4: POST /v1/querybatch — OSV.dev (modo batch)

* **Metodo:** POST
* **Ruta:** `https://api.osv.dev/v1/querybatch`
* **Auth:** Sin autenticacion (API publica).
* **Archivo:** `src/lib/security/osv-api.ts` (funcion `queryBatch`, lineas 61-99),
  invocada desde `queryVulnerabilities` (lineas 121-138).
* **Input:** `{ queries: [{ package: { name, ecosystem: 'Homebrew' }, version }] }` —
  batches de hasta 100 paquetes.
* **Output esperado:** `{ results: [{ vulns?: OsvVulnerability[] }] }` — array de resultados
  indexado 1:1 con `queries`.
* **Errores esperados:** HTTP 400 (query malformada — activa fallback one-by-one), otros 4xx/5xx
  lanzan `Error('OSV API error: ...')`.
* **Persistencia afectada:** Sin persistencia. Resultados solo en memoria durante la sesion.
* **Impacto en UI:** Vista `SecurityAuditView` (src/views/security-view.tsx).

### Cobertura

* [ ] Contrato correcto — `res.json() as OsvBatchResponse` (linea 79) sin validacion runtime.
  Si `data.results` no es un array (o tiene menos elementos que `packages`), el acceso a
  `data.results[i]` retornara `undefined` sin error; los paquetes correspondientes se omiten
  silenciosamente del resultado.
* [ ] Validacion correcta — los nombres y versiones de paquetes vienen de `brew info --json=v2`
  (ya parseados), pero no se valida que sean strings no vacios antes de incluirlos en el body
  de OSV. Un paquete con version `""` o `undefined` generaria una query malformada.
* [x] Auth correcta — no aplica (API publica sin credenciales).
* [x] Errores correctos — HTTP 400 dispara el fallback one-by-one; otros errores lanzan
  excepcion que se propaga al caller (`runSecurityAudit`).
* [x] Idempotencia correcta — la consulta es idempotente; el mismo set de paquetes siempre
  devuelve el mismo resultado (asumiendo que OSV.dev no actualiza su base durante la sesion).
* [ ] Logging correcto — sin logging de errores ni de resultados del escaneo; no hay rastro
  auditable de que se realizo un escaneo de seguridad.
* [ ] Metricas correctas — sin instrumentacion.
* [x] Timeouts correctos — `fetchWithTimeout` con 15 000 ms.
* [ ] Rate limiting / retries — sin rate limiting cliente ni cache entre sesiones; el usuario
  puede disparar multiples escaneos consecutivos (ya reportado como Baja en 07-backend-persistence.md
  11.4; se referencia sin duplicar). Sin retry automatico ante errores de red.

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | `res.json() as OsvBatchResponse` sin validar que `data.results` sea un array ni que tenga la longitud correcta; si OSV cambia el contrato, los resultados se pierden silenciosamente | Alta | `osv-api.ts:79-83` — `const data = (await res.json()) as OsvBatchResponse; for (let i = 0; i < packages.length; i++) { const vulns = data.results[i]?.vulns` | Verificar `Array.isArray(data.results)` y `data.results.length === packages.length` antes de iterar; lanzar error descriptivo si no se cumple |
| Bug | Versiones de paquete potencialmente vacias o `undefined` incluidas en queries sin validacion | Media | `osv-api.ts:129-132` — `batch.map((p) => ({ package: { name: p.name, ecosystem: 'Homebrew' }, version: p.version }))` sin comprobar que `p.version` sea un string valido | Filtrar paquetes con `version` vacia o nula antes de construir las queries; loguear los paquetes omitidos |
| Mejora | Sin validacion de hostname en llamadas a OSV.dev | Baja | `osv-api.ts:4` — `const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch'` — URL hardcodeada sin llamada a `validateApiUrl` (ya reportado en 07-backend-persistence.md 11.1; se referencia) | Agregar validacion similar a la de Polar.sh |

---

## Endpoint 5: POST /v1/querybatch — OSV.dev (modo one-by-one)

* **Metodo:** POST
* **Ruta:** `https://api.osv.dev/v1/querybatch` (mismo endpoint, llamada individual)
* **Auth:** Sin autenticacion (API publica).
* **Archivo:** `src/lib/security/osv-api.ts` (funcion `queryOneByOne`, lineas 101-119).
  Activado cuando el batch retorna HTTP 400.
* **Input:** Un unico paquete `{ queries: [{ package: { name, ecosystem }, version }] }`.
* **Output esperado:** `{ results: [{ vulns? }] }`.
* **Errores esperados:** Cualquier excepcion es capturada y el paquete se omite.
* **Persistencia afectada:** Sin persistencia.
* **Impacto en UI:** Mismo que el modo batch.

### Cobertura

* [ ] Contrato correcto — hereda el mismo problema de cast sin validacion del modo batch.
* [ ] Validacion correcta — ninguna adicional a la del batch.
* [x] Auth correcta — no aplica.
* [ ] Errores correctos — el bloque `catch {}` (linea 113) descarta **todas** las excepciones
  silenciosamente, incluyendo errores HTTP 5xx del servidor y errores de red. Un fallo del
  servidor durante el fallback hace que los paquetes afectados aparezcan como "sin
  vulnerabilidades" en lugar de "error de escaneo". Esto es un **falso negativo de seguridad**.
* [x] Idempotencia correcta — idempotente por las mismas razones que el batch.
* [ ] Logging correcto — el catch vacio no registra que paquetes fueron omitidos ni el motivo.
* [ ] Metricas correctas — sin instrumentacion.
* [x] Timeouts correctos — hereda el timeout de `queryBatch` (15 000 ms via `fetchWithTimeout`).
* [ ] Rate limiting / retries — el loop secuencial sin delay entre peticiones puede saturar
  la API si hay muchos paquetes; sin retry ante errores.

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | El `catch {}` vacio en el loop one-by-one descarta errores HTTP 5xx y de red; los paquetes afectados aparecen como "sin vulnerabilidades" — falso negativo de seguridad | Alta | `osv-api.ts:113-115` — `} catch { // Skip packages that the API rejects }` — no distingue entre rechazo del paquete (correcto omitir) y error del servidor (incorrecto omitir) | Capturar el error; si el status HTTP es 5xx o hay error de red (AbortError), propagar la excepcion o marcarlo como `{ error: true }` en el resultado; solo omitir en 400 |
| Riesgo | El loop secuencial sin delay entre peticiones individuales puede exceder los rate limits de OSV.dev para instalaciones con muchos paquetes | Media | `osv-api.ts:106-118` — `for (const pkg of packages)` con `await queryBatch(...)` sin delay entre llamadas | Agregar un delay de 50-100ms entre peticiones individuales y un maximo de reintentos con backoff exponencial ante 429 |

---

## Endpoint 6: GET BrewBar.app.zip — GitHub Releases (descarga principal)

* **Metodo:** GET
* **Ruta:** `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip`
* **Auth:** Sin autenticacion (release publico).
* **Archivo:** `src/lib/brewbar-installer.ts` (funcion `installBrewBar`, lineas 56-69).
* **Input:** Ninguno (URL hardcodeada).
* **Output esperado:** Binario ZIP de BrewBar.app; Content-Length en cabecera.
* **Errores esperados:** HTTP 404 (no existe release), otros errores HTTP, timeout de red.
* **Persistencia afectada:** Escribe `/tmp/BrewBar.app.zip` temporalmente; luego descomprime
  en `/Applications/BrewBar.app` con `ditto`.
* **Impacto en UI:** Subcomando `brew-tui install-brewbar`.

### Cobertura

* [x] Contrato correcto — se comprueba `res.ok` y `res.body` antes de procesar; el body
  se trata como stream binario, no se parsea como JSON.
* [ ] Validacion correcta — la comprobacion del limite de tamano de 200 MB (lineas 62-64)
  es bypasseable: si el servidor omite el header `Content-Length`, `Number('0')` es 0, que
  no supera el limite, por lo que la descarga continua sin limite efectivo via `pipeline`.
  El tamano real del ZIP nunca se valida durante o despues de la descarga.
* [x] Auth correcta — no aplica; release publico.
* [x] Errores correctos — `!res.ok || !res.body` lanza error descriptivo; el bloque
  `finally` del paso `ditto` limpia `/tmp/BrewBar.app.zip` aunque falle la descompresion.
* [ ] Idempotencia correcta — la descarga sobreescribe `/tmp/BrewBar.app.zip` sin comprobar
  si existe; si `force = false` y el app ya existe, se lanza error antes de la descarga
  (correcto), pero si dos procesos ejecutan `install-brewbar` simultaneamente, ambos
  escriben en el mismo `/tmp/BrewBar.app.zip`, lo que puede corromper el ZIP.
* [ ] Logging correcto — solo `console.log(t('cli_brewbarInstalling'))` al inicio; sin log
  de progreso, de tamano descargado ni de resultado.
* [ ] Metricas correctas — sin instrumentacion.
* [ ] Timeouts correctos — 120 000 ms para la descarga (adecuado), pero sin timeout por tasa
  de transferencia; una conexion lenta que transfiere 1 byte cada 120s completaria el
  timeout sin descargar el archivo.
* [ ] Rate limiting / retries — sin retry ante errores de red; una falla transitoria a mitad
  de descarga requiere que el usuario ejecute el comando de nuevo manualmente.

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | El limite de 200 MB es inefectivo si el servidor omite `Content-Length`; el stream se descarga sin limite | Alta | `brewbar-installer.ts:62-63` — `const contentLength = Number(res.headers.get('content-length') ?? '0')` — si el header no existe, el valor es 0 y pasa la condicion `if (contentLength > 200 * 1024 * 1024)` | Implementar un contador de bytes durante `pipeline` que aborte la descarga si supera el limite; o usar `TransformStream` que cuente los bytes y cierre el stream al superar el maximo |
| Bug | Verificacion SHA-256 es codigo muerto en produccion — el archivo `.sha256` nunca ha existido en el release (reportado como Alta en 08-security.md 13.2) | Alta | `brewbar-installer.ts:72-86` — el fetch del checksum recibe un 404; el `catch` descarta el error; la comparacion de la linea 78 nunca ha ejecutado | Ver accion en 08-security.md — generar el archivo `.sha256` en CI |
| Riesgo | Dos instancias de `install-brewbar` concurrentes comparten `/tmp/BrewBar.app.zip` | Baja | `brewbar-installer.ts:16` — `const TMP_ZIP = '/tmp/BrewBar.app.zip'` — constante sin randomizacion | Usar un path temporal unico: `os.tmpdir() + '/BrewBar-' + randomUUID() + '.zip'` |

---

## Endpoint 7: GET BrewBar.app.zip.sha256 — GitHub Releases (checksum)

* **Metodo:** GET
* **Ruta:** `https://github.com/MoLinesGitHub/Brew-TUI/releases/latest/download/BrewBar.app.zip.sha256`
* **Auth:** Sin autenticacion.
* **Archivo:** `src/lib/brewbar-installer.ts` (lineas 73-86).
* **Input:** Ninguno (URL hardcodeada, derivada de `DOWNLOAD_URL + '.sha256'`).
* **Output esperado:** Texto plano con formato `<sha256hex> <filename>`.
* **Errores esperados:** HTTP 404 (archivo no existe — caso actual), errores de red.
* **Persistencia afectada:** Ninguna (solo lectura del hash para verificar el ZIP descargado).
* **Impacto en UI:** Subcomando `brew-tui install-brewbar`.

### Cobertura

* [ ] Contrato correcto — no se valida que el cuerpo de texto tenga el formato esperado;
  `(await checksumRes.text()).trim().split(/\s+/)[0]!` usa `!` (non-null assertion) sobre el
  resultado del split, que puede ser `undefined` si la respuesta esta vacia.
* [ ] Validacion correcta — no se valida que el hash extraido tenga el formato de SHA-256
  (64 caracteres hexadecimales) antes de compararlo. Un archivo checksum malformado o
  interceptado con un hash arbitrario pasaria la comparacion si el atacante controla ambos
  lados.
* [x] Auth correcta — no aplica.
* [ ] Errores correctos — el bloque `catch` (linea 83) solo relanza errores que contienen
  `'checksum mismatch'`; cualquier otro error (incluyendo el 404 actual) se descarta
  silenciosamente, haciendo que la instalacion continue sin verificacion. Este es el hallazgo
  principal reportado en 08-security.md 13.2 como Alta.
* [x] Idempotencia correcta — N/A (solo lectura).
* [ ] Logging correcto — el error de descarga del checksum se descarta sin log.
* [ ] Metricas correctas — sin instrumentacion.
* [x] Timeouts correctos — `fetchWithTimeout` con 15 000 ms.
* [x] Rate limiting / retries — N/A (solo una llamada, no critica para el flujo de usuario).

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | El catch descarta el 404 actual, convirtiendo la verificacion SHA-256 en no-operacion (reportado como Alta en 08-security.md 13.2) | Alta | `brewbar-installer.ts:83-86` — `if (err instanceof Error && err.message.includes('checksum mismatch')) throw err` — un 404 no contiene esa cadena y se descarta | Ver accion en 08-security.md |
| Bug | `split(/\s+/)[0]!` con non-null assertion puede retornar `undefined` en respuesta vacia, causando que `expected` sea `"undefined"` y la comparacion siempre falle | Media | `brewbar-installer.ts:75` — `.split(/\s+/)[0]!.toLowerCase()` | Validar que el resultado del split sea una cadena de 64 caracteres hex antes de usarla: `/^[0-9a-f]{64}$/i.test(expected)` |
| Riesgo | Sin validacion del formato del hash extraido; un archivo malformado o un hash de longitud incorrecta pasaria la comparacion si el servidor esta comprometido | Media | `brewbar-installer.ts:75-78` — no hay comprobacion de longitud ni formato antes de `if (actual !== expected)` | Agregar validacion del formato SHA-256 del expected hash antes de comparar |

---

## Endpoint 8: execBrew() — CLI de Homebrew (comandos instantaneos)

* **Mecanismo:** `spawn('brew', args, { env: { ...process.env, HOMEBREW_NO_AUTO_UPDATE: '1' } })`
* **Archivo:** `src/lib/brew-cli.ts` (funcion `execBrew`, lineas 3-21)
* **Wrappers en brew-api.ts:**
  - `getInstalled()` → `brew info --json=v2 --installed`
  - `getOutdated()` → `brew outdated --json=v2`
  - `getServices()` → `brew services list --json`
  - `getFormulaInfo(name)` → `brew info --json=v2 <name>`
  - `search(term)` → `brew search <safeTerm>`
  - `getDoctor()` → `brew doctor`
  - `getConfig()` → `brew config`
  - `getLeaves()` → `brew leaves`
  - `uninstallPackage(name)` → `brew uninstall <name>`
  - `serviceAction(name, action)` → `brew services <action> <name>`
* **Auth:** N/A — proceso local; hereda permisos del usuario actual.
* **Input DTO:** Array de argumentos string pasados directamente a `spawn`.
* **Output DTO:** stdout completo como string; stderr acumulado para mensajes de error.
* **Errores esperados:** Exit code != 0 → `reject(new Error(stderr))`. Error de spawn
  (brew no encontrado) → `reject(new Error('Failed to run brew: ...'))`.
* **Persistencia afectada:** Segun el comando — las operaciones de escritura (install,
  uninstall, services start/stop/restart) modifican la instalacion de Homebrew.

### Cobertura

* [x] Contrato correcto — stdout/stderr capturados correctamente; exit code != 0 produce
  error con el mensaje de stderr.
* [ ] Validacion correcta — solo `search()` sanitiza el input (stripping de guiones). Los
  wrappers `getFormulaInfo(name)`, `uninstallPackage(name)` y `serviceAction(name, action)`
  pasan `name` directamente a `spawn` sin validacion. Aunque `spawn` (sin `shell: true`)
  previene inyeccion de shell, un nombre como `--force` o `--ignore-dependencies` seria
  interpretado por brew como un flag, modificando el comportamiento de la operacion.
* [x] Auth correcta — N/A (proceso local).
* [x] Errores correctos — exit code != 0 y error de spawn manejados correctamente con
  mensajes descriptivos.
* [ ] Idempotencia correcta — `getFormulaInfo`, `getInstalled`, `getOutdated`, `getServices`,
  `getDoctor`, `getConfig`, `getLeaves` son idempotentes (solo lectura). `uninstallPackage`
  no es idempotente: si el paquete no existe, brew retorna exit code != 0. `serviceAction`
  tampoco es idempotente: `stop` en un servicio ya detenido falla.
* [ ] Logging correcto — sin logging de los comandos ejecutados ni de sus argumentos; el
  historial Pro solo registra operaciones si estan explicitamente instrumentadas en las vistas,
  no en la capa CLI.
* [ ] Metricas correctas — sin instrumentacion de latencia por comando.
* [ ] Timeouts correctos — **sin timeout en `execBrew`**: un proceso `brew info --json=v2
  --installed` colgado bloquea el event loop de Node.js indefinidamente. El equivalente Swift
  (`BrewChecker`) tiene timeout de 60s. (Ya reportado como Media en 07-backend-persistence.md
  11.4; se referencia sin duplicar.)
* [ ] Rate limiting / retries — sin retry ante fallos transitorios de brew (p.ej. lock de
  Homebrew en uso por otra instancia).

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Sin timeout en `execBrew`; un proceso brew colgado bloquea la TUI indefinidamente (ya reportado en 07-backend-persistence.md 11.4) | Media | `brew-cli.ts:4-21` — `spawn()` sin opcion `timeout` ni AbortController | Ver accion en 07-backend-persistence.md — agregar `timeout: 30000` en las opciones de `spawn` |
| Bug | `getFormulaInfo(name)`, `uninstallPackage(name)` y `serviceAction(name, action)` pasan `name` a `spawn` sin validacion; un nombre con flags de brew (ej. `--force`) modifica el comportamiento de la operacion | Media | `brew-api.ts:35-36` — `execBrew(['info', '--json=v2', name])` sin validacion; `brew-api.ts:80-81` — `execBrew(['uninstall', name])` sin validacion; `brew-api.ts:85-87` — `execBrew(['services', action, name])` sin validacion | Agregar validacion de `name` con el mismo patron `PKG_PATTERN` usado en `profile-manager.ts` (`/^[\w@./+-]+$/`) antes de pasar a `spawn`; la ausencia de `shell: true` previene inyeccion de shell pero no la inyeccion de flags de brew |
| Mejora | Sin logging de los comandos brew ejecutados en la capa CLI (fuera del historial Pro) | Baja | `brew-cli.ts:3-21` — sin log de `args` ni de tiempos de ejecucion | Agregar log de debug (nivel no persistente) de los comandos y su duracion para facilitar diagnostico |

---

## Endpoint 9: streamBrew() — CLI de Homebrew (operaciones con streaming)

* **Mecanismo:** `spawn('brew', args, { stdio: ['ignore', 'pipe', 'pipe'] })` con polling
  de 100ms via `setTimeout`.
* **Archivo:** `src/lib/brew-cli.ts` (funcion `streamBrew`, lineas 23-79) y variante
  `brewUpdate()` en `src/lib/brew-api.ts` (lineas 7-17, spawn separado).
* **Wrappers en brew-api.ts:**
  - `installPackage(name)` → `brew install <name>`
  - `upgradePackage(name)` → `brew upgrade <name>`
  - `upgradeAll()` → `brew upgrade`
  - (streaming de `brew update` via `brewUpdate()` — spawn separado en brew-api.ts)
* **Auth:** N/A.
* **Input DTO:** Array de argumentos; `name` viene de la seleccion del usuario en la UI.
* **Output DTO:** AsyncGenerator de strings (lineas de stdout/stderr mezcladas).
* **Errores esperados:** Exit code != 0 produce `throw new Error(exitError)` al finalizar
  el generator; error de spawn produce el mismo error.
* **Persistencia afectada:** Modifica la instalacion de Homebrew (install/upgrade).

### Cobertura

* [x] Contrato correcto — stdout y stderr del proceso se mezclan correctamente en el
  stream; el error de exit code se lanza al final del generator tras entregar todas las
  lineas al consumer.
* [ ] Validacion correcta — `installPackage(name)` y `upgradePackage(name)` pasan `name`
  directamente a `spawn` sin validacion, igual que los wrappers de `execBrew`. `upgradeAll()`
  no toma input del usuario (sin riesgo). `brewUpdate()` tampoco toma input (sin riesgo).
* [x] Auth correcta — N/A.
* [x] Errores correctos — el error de exit code se propaga correctamente al consumer via
  el generator. El bloque `finally` mata el proceso si el consumer abandona el generator
  antes de que termine.
* [ ] Idempotencia correcta — `installPackage` es idempotente si el paquete ya esta
  instalado (brew retorna 0 con un aviso). `upgradePackage` y `upgradeAll` son idempotentes
  si no hay actualizaciones disponibles. Ningun problema funcional aqui, pero la UI no
  informa al usuario si la operacion fue un no-op.
* [ ] Logging correcto — mismo hallazgo que `execBrew`.
* [ ] Metricas correctas — sin instrumentacion.
* [ ] Timeouts correctos — sin timeout en `streamBrew` ni en `brewUpdate`. Una instalacion
  colgada (red lenta, servidor brew caido) bloquea la UI sin posibilidad de cancelacion
  automatica. El usuario puede navegar fuera de la vista, lo que mata el proceso via el
  `finally` del generator, pero no hay timeout automatico. `brewUpdate()` tiene `stdio:
  'ignore'` — es fire-and-forget sin forma de cancelar.
* [ ] Rate limiting / retries — sin mecanismo de cancelacion ni retry ante fallos transitorios
  de red durante la descarga de una formula. El polling de 100ms es ineficiente (TODO
  explicito en el codigo, linea 64). (Ya reportado como Baja en 07-backend-persistence.md 11.4.)

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | `installPackage(name)` y `upgradePackage(name)` pasan `name` a `spawn` sin validacion; mismo riesgo de flag injection que en `execBrew` | Media | `brew-api.ts:69,73` — `streamBrew(['install', name])`, `streamBrew(['upgrade', name])` sin validacion de `name` | Agregar validacion con `PKG_PATTERN` antes de llamar a `streamBrew`; aplicar la misma validacion que `profile-manager.ts` usa para paquetes importados |
| Bug | Sin timeout en `streamBrew` ni en `brewUpdate`; instalaciones colgadas bloquean la UI sin cancelacion automatica | Media | `brew-cli.ts:23-79` — sin `timeout` en spawn ni AbortController; `brew-api.ts:10` — `spawn('brew', ['update'], { stdio: 'ignore' })` sin timeout | Agregar timeout configurable (ej. 5 minutos para install/upgrade) que mate el proceso y notifique al consumer via un error de timeout |
| Mejora | Polling de 100ms en el loop del generator en lugar de arquitectura event-driven (TODO explicito en el codigo) | Baja | `brew-cli.ts:64-65` — `// TODO: replace polling with event-driven approach` + `await new Promise((r) => setTimeout(r, 100))` (ya reportado en 07-backend-persistence.md 11.4) | Reemplazar con un `AsyncIterableIterator` sobre los eventos `data` del stream |

---

## Resumen de hallazgos consolidado

| # | Endpoint | Tipo | Descripcion | Severidad |
|---|----------|------|-------------|-----------|
| E01 | POST /activate (Polar) | Bug | Respuesta `PolarActivation` no validada en runtime; `activation.id` puede ser `undefined` | Alta |
| E02 | POST /activate (Polar) | Mejora | Sin retry ante errores de red transitorios en activacion | Media |
| E03 | POST /validate (Polar) | Bug | Respuesta `PolarValidated` no validada; `res.status` puede ser `undefined`, forzando expirado | Alta |
| E04 | POST /validate (Polar) | Bug | `catch` en `revalidate()` agrupa errores de red y de contrato bajo el mismo flujo de grace | Media |
| E05 | POST /querybatch (OSV batch) | Bug | `OsvBatchResponse` no validada en runtime; resultados se pierden silenciosamente si el contrato cambia | Alta |
| E06 | POST /querybatch (OSV batch) | Bug | Versiones de paquete vacias o `undefined` incluidas en queries sin validacion | Media |
| E07 | POST /querybatch (OSV one-by-one) | Bug | `catch {}` vacio descarta errores 5xx y de red — falso negativo de seguridad | Alta |
| E08 | POST /querybatch (OSV one-by-one) | Riesgo | Loop sin delay puede exceder rate limits de OSV.dev | Media |
| E09 | GET BrewBar.app.zip | Bug | Limite de 200 MB inefectivo si el servidor omite `Content-Length` | Alta |
| E10 | GET BrewBar.app.zip | Bug | Verificacion SHA-256 es codigo muerto en produccion (ref. 08-security.md) | Alta |
| E11 | GET BrewBar.app.zip.sha256 | Bug | `catch` descarta el 404 actual; la verificacion SHA-256 nunca ejecuta (ref. 08-security.md) | Alta |
| E12 | GET BrewBar.app.zip.sha256 | Bug | Non-null assertion en `split()[0]!` puede producir `"undefined"` como expected hash | Media |
| E13 | GET BrewBar.app.zip.sha256 | Riesgo | Sin validacion del formato del hash extraido | Media |
| E14 | execBrew() | Bug | Sin timeout; proceso brew colgado bloquea TUI (ref. 07-backend-persistence.md) | Media |
| E15 | execBrew() wrappers | Bug | `name` en `getFormulaInfo`, `uninstallPackage`, `serviceAction` sin validacion — flag injection | Media |
| E16 | streamBrew() wrappers | Bug | `name` en `installPackage`, `upgradePackage` sin validacion — flag injection | Media |
| E17 | streamBrew() | Bug | Sin timeout en streaming/install; `brewUpdate()` sin timeout | Media |
| E18 | Todos | Mejora | Ausencia total de logging estructurado de operaciones y errores de red | Baja |
| E19 | Todos | Mejora | Ausencia total de metricas/instrumentacion | Baja |
| E20 | POST /deactivate (Polar) | Mejora | Loop de reintento descarta excepcion sin log | Baja |

---

## Notas de alcance

* Los hallazgos E10, E11, E14 son **referencias cruzadas** a reportes previos
  (08-security.md y 07-backend-persistence.md respectivamente). Se incluyen en este
  reporte por completitud del mapa de endpoints; las acciones ya estan documentadas en
  los reportes originales.
* El hallazgo E18 (ausencia de logging) y E19 (ausencia de metricas) son transversales
  a todos los call sites y reflejo de la ausencia de un framework de observabilidad en
  el proyecto. La naturaleza CLI/TUI del producto hace que el impacto sea menor que en
  un backend web tradicional, pero dificulta el diagnostico de problemas en produccion.
* La capa `brew-cli.ts` / `brew-api.ts` no expone un endpoint HTTP sino una interfaz de
  subprocesos. Los criterios de "rate limiting" y "retries" se aplicaron con el sentido
  de control de concurrencia y tolerancia a fallos del proceso externo, no de trafico HTTP.
