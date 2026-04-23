# 13. Seguridad y privacidad

> Auditor: security-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 presenta una postura de seguridad sólida para un producto CLI/TUI en fase temprana: no se detectaron secretos de API reales hardcodeados, los datos de licencia se almacenan cifrados con AES-256-GCM en disco, las llamadas de red usan timeouts y HTTPS exclusivamente, y el manifiesto de privacidad PrivacyInfo.xcprivacy está presente y correctamente declarado. Los tres riesgos residuales de mayor impacto son: (1) la clave AES hardcodeada en LicenseChecker.swift (inherente al modelo cliente-local pero con una mitigación de rotación pendiente), (2) la falta de firma de código y notarización en BrewBar.app (lo que expone a los usuarios a advertencias de Gatekeeper y a la posibilidad de sustitución del binario sin detección), y (3) el archivo checksum `.sha256` que nunca ha sido generado en CI — el archivo `BrewBar.app.zip.sha256` no existe en la URL de descarga porque el workflow no lo produce, el `catch` en la línea 73 de `brewbar-installer.ts` descarta el 404 resultante, y la comparación de la línea 68 nunca ha ejecutado en producción desde que se implementó esta funcionalidad.

---

## 13.1 App y cliente

### Checklist

* [x] No se detectaron API keys ni tokens de terceros hardcodeados en el codigo fuente (Polar.sh POLAR_ORGANIZATION_ID es un ID publico de organizacion, no un secreto)
* [x] La clave de licencia del usuario nunca aparece en texto plano en logs — se muestra enmascarada en AccountView con `maskKey()`
* [x] El archivo `license.json` se guarda con permisos `0o600` y el directorio `~/.brew-tui/` con `0o700`
* [x] Los directorios de datos (`~/.brew-tui/`) se crean con permisos restrictivos (`0o700`)
* [x] Las escrituras en disco usan patron write-tmp-then-rename (atomic write) para evitar corrupcion
* [x] No hay llamadas HTTP planas (http://) — todas las URLs externas usan HTTPS
* [x] `fetchWithTimeout` se usa en todas las llamadas de red (Polar.sh, OSV.dev, descarga de BrewBar)
* [x] Source maps desactivados en produccion (`sourcemap: false` en tsup.config.ts)
* [x] `NODE_ENV` inyectado como `"production"` en build time (`tsup.config.ts`)
* [x] `__TEST_MODE__` inyectado como `false` en build de produccion — anti-debug no bypasseable en test sin recompilar
* [x] Anti-debug (`isDebuggerAttached()`) cubre inspector protocol, `execArgv`, y `NODE_OPTIONS`
* [x] Deteccion de tamper en bundle (hash SHA-256 del bundle al inicio, `checkBundleIntegrity()`)
* [x] Canaries de bypass (`isProUnlocked`, `hasProAccess`, `isLicenseValid`) siempre retornan false en produccion
* [x] Integridad del store Zustand verificada via `verifyStoreIntegrity()` en `initStoreIntegrity()`
* [x] Validacion de nombre de perfil anti path-traversal (`validateProfileName()` + `basename()`)
* [x] Validacion de nombres de paquetes/taps con regex estrictos antes de pasar a `brew` (`TAP_PATTERN`, `PKG_PATTERN`)
* [x] Limite de tamano de descarga en instalador de BrewBar (200 MB maximos)
* [x] Rate limiting en activaciones de licencia (30s cooldown, 5 intentos, 15min lockout)
* [x] Degradacion gradual de licencia offline (7d/14d/30d en lugar de corte abrupto)
* [x] `verifyPro()` multi-capa llamado desde dentro de la logica Pro (defense-in-depth), no solo en el router
* [ ] La clave AES de cifrado hardcodeada en `license-manager.ts` — **Media**: `ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1'` y `SCRYPT_SALT = 'brew-tui-salt-v1'` son constantes publicas en el bundle publicado en npm; cualquier persona puede derivar la misma clave y descifrar cualquier `license.json` local
* [ ] La clave AES precomputada hardcodeada en `LicenseChecker.swift` — **Media**: el hex `5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126` es la misma clave derivada embebida directamente en el binario Swift; un atacante con `strings` o un debugger la extrae en segundos
* [ ] `console.log` con email del cliente fuera de guarda `DEBUG` — **Baja**: `src/index.tsx:62` imprime `license.customerEmail` en el comando `status`; es intencional como output de CLI pero no tiene guarda de entorno
* [ ] Proteccion de integridad del bundle falla-abierta — **Baja**: `checkBundleIntegrity()` retorna `true` si no puede leer el archivo (permiso denegado, etc.), lo que abre una ventana de degradacion silenciosa

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `ENCRYPTION_SECRET` hardcodeado en bundle npm | No conforme | Media | `src/lib/license/license-manager.ts:61-62` — `'brew-tui-license-aes256gcm-v1'` y `'brew-tui-salt-v1'` son publicos en el paquete npm publicado | Documentar explicitamente que es un secreto conocido (seguridad-por-oscuridad); considerar derivar parte de la clave del UUID de la maquina para hacer el archivo no portable |
| Clave AES precomputada en binario Swift | No conforme | Media | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:47` — hex `5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126` embebido como constante Swift; extraible con `strings BrewBar` o Hopper en 5 segundos | Mismo vector que el anterior; inherente al modelo; documentar como riesgo conocido y agregar rotacion de version en la proxima revision del formato |
| `checkBundleIntegrity()` falla-abierta | Parcial | Baja | `src/lib/license/integrity.ts:31` — `return true` en catch; si el proceso no puede leer su propio bundle (permisos), la proteccion se desactiva sin aviso | Loguear un warning interno; considerar falla-cerrada con mensaje de error al usuario |
| `console.log` con email en CLI `status` | Parcial | Baja | `src/index.tsx:62` — `console.log(t('cli_email', { email: license.customerEmail }))` — output intencional pero sin posibilidad de suprimir | Bajo impacto dado que es un comando explicito del usuario; agregar nota en documentacion |

---

## 13.2 Backend y transporte

### Checklist

* [x] No existe backend propio — toda la logica de validacion corre en el servidor de Polar.sh (externo)
* [x] Todas las peticiones de red usan HTTPS exclusivamente — validado mediante `validateApiUrl()` en `polar-api.ts`
* [x] Validacion de URL de API antes de cada llamada (`validateApiUrl` verifica protocolo `https:` y hostname terminando en `polar.sh`)
* [x] Timeouts en todas las llamadas de red: 15s para Polar.sh y OSV.dev, 120s para descarga de BrewBar, 15s para checksum
* [x] Manejo de errores HTTP robusto en `polar-api.ts` — parsea body de error JSON con multiples formatos (`detail`, `error`, `message`)
* [x] Limite de tamano de respuesta en descarga de BrewBar (200 MB)
* [x] CI/CD usa `actions/checkout@v4` y `actions/setup-node@v4` (versiones fijadas)
* [x] `npm publish --provenance` activo en el workflow — produce SLSA provenance attestation
* [x] `NODE_AUTH_TOKEN` inyectado via secrets de GitHub, no hardcodeado en el workflow
* [ ] El archivo `.sha256` NUNCA ha existido en la URL de descarga — **Alta**: el workflow `release.yml` no genera `BrewBar.app.zip.sha256`; el instalador en `brewbar-installer.ts:63` intenta descargarlo pero recibe un 404; el bloque `catch` en la linea 73 solo re-lanza errores de `checksum mismatch` y descarta silenciosamente cualquier otro error (incluyendo el 404); la comparacion de la linea 68 nunca ha ejecutado en produccion desde que se implemento esta funcionalidad — la verificacion de integridad SHA-256 es codigo muerto en produccion
* [ ] BrewBar.app no esta firmado ni notarizado — **Alta**: el workflow no incluye pasos de `codesign` ni `notarytool`; macOS Gatekeeper mostrara advertencia de seguridad al instalar; no es posible verificar autenticidad del binario
* [ ] Sin pin de version de `softprops/action-gh-release@v2` por hash SHA — **Baja**: las GitHub Actions de terceros deberian fijarse por hash de commit para evitar ataques de supply chain en el workflow

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Checksum SHA-256 de BrewBar es codigo muerto — nunca ha ejecutado en produccion | No conforme | Alta | `.github/workflows/release.yml` — el job `build-brewbar` nunca genera ni sube `BrewBar.app.zip.sha256`; `brewbar-installer.ts:63` descarga `${DOWNLOAD_URL}.sha256` y recibe un 404; el `catch` en la linea 73 descarta el error porque no contiene la cadena `'checksum mismatch'`; la comparacion en la linea 68 jamas ha ejecutado | Agregar en `build-brewbar`: `shasum -a 256 BrewBar.app.zip > BrewBar.app.zip.sha256` y subir ambos archivos; adicionalmente cambiar el comportamiento del `catch` para relanzar cualquier error si el archivo checksum fue descargado exitosamente pero la verificacion falla |
| BrewBar.app sin firma de codigo ni notarizacion | No conforme | Alta | `.github/workflows/release.yml:58-76` — el build con `xcodebuild` usa configuracion Release pero no incluye `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM`, `codesign`, ni `notarytool`; los usuarios recibiran el mensaje "BrewBar cannot be opened because the developer cannot be verified" | Obtener Apple Developer Account; agregar signing con certificado en GitHub Secrets; notarizar con `notarytool submit --staple`; este es el unico bloqueante conocido para distribucion verificada |
| `softprops/action-gh-release@v2` sin pin por hash | No conforme | Baja | `.github/workflows/release.yml:89` — usar `@v2` (tag) en lugar de hash SHA inmutable expone el workflow a repositorio comprometido del tercero | Reemplazar con `softprops/action-gh-release@<SHA>` (hash correspondiente a v2.2.1 o posterior) |

---

## 13.3 Privacidad

### Checklist

* [x] `PrivacyInfo.xcprivacy` presente en `menubar/BrewBar/Resources/PrivacyInfo.xcprivacy`
* [x] `NSPrivacyTracking = false` declarado correctamente
* [x] `NSPrivacyCollectedDataTypes = []` — BrewBar no recopila datos personales del dispositivo
* [x] `NSPrivacyAccessedAPITypes` declara `NSPrivacyAccessedAPICategoryUserDefaults` con razon `CA92.1` (configuracion de app propia)
* [x] `NSPrivacyAccessedAPITypes` declara `NSPrivacyAccessedAPICategoryFileTimestamp` con razon `C617.1` (mostrar timestamps a usuario)
* [x] `UserDefaults` en BrewBar solo almacena configuracion no sensible: `checkInterval` (Int), `notificationsEnabled` (Bool), `hasLaunchedBefore` (Bool)
* [x] Ningun dato sensible (claves, tokens, PII) almacenado en `UserDefaults` — la licencia se lee de `~/.brew-tui/license.json` via `FileManager`
* [x] No se usa Camera, Photos, Location, Microphone, Contacts, Calendar ni HealthKit — no aplican permisos de privacidad adicionales
* [x] No hay URLs de rastreo (`NSPrivacyTrackingDomains` no aplica — `NSPrivacyTracking = false`)
* [x] No se usa `ATTrackingManager` ni `requestTrackingAuthorization`
* [x] La clave de licencia del usuario se muestra enmascarada en AccountView — no se expone en pantalla completa
* [x] Deep links no declarados — no hay `CFBundleURLTypes` ni `Associated Domains` en el plist; no aplica superficie de ataque de deep link
* [x] El portapapeles en BrewBar solo copia el comando de instalacion `npm install -g brew-tui` (no sensible) cuando el usuario hace clic explicitamente en "Copy Install Command"
* [ ] Watermark invisible con email del usuario en perfiles exportados sin consentimiento explicito — **Media**: `exportCurrentSetup()` en `profile-manager.ts:111` embede el email del titular de la licencia usando caracteres de ancho cero (Unicode U+200B/U+200C/U+200D) en el primer campo del JSON exportado sin informar al usuario en el momento de la exportacion
* [ ] El email del cliente se imprime en salida de CLI `status` y `activate` — **Baja**: `src/index.tsx:22,62` — aunque es output esperado de una CLI de gestion de cuenta, el email puede quedar en el historial de la shell o en logs de CI si el comando se ejecuta en scripts
* [ ] Sin mecanismo de exportacion ni eliminacion de datos del usuario — **Baja**: el proyecto no proporciona un comando o flujo para exportar o eliminar todos los datos de `~/.brew-tui/`; la eliminacion manual es posible pero no documentada
* [ ] El hostname del equipo se transmite a Polar.sh como campo `label` durante la activacion — **Baja**: `src/lib/license/polar-api.ts:73` envia `label: hostname()` que en macOS puede contener el nombre real del usuario (ej. "El MacBook de Juan") al servidor de Polar.sh; no se informa al usuario de esta transmision

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Watermark invisible con PII sin consentimiento explicito | No conforme | Media | `src/lib/license/watermark.ts:25-38` y `src/lib/profiles/profile-manager.ts:111` — el email se codifica en bits como caracteres Unicode de ancho cero en el JSON exportado; la propia funcion `getWatermark()` contiene el comentario "A future improvement should inform the user" | Agregar consentimiento explicito antes de la exportacion: notificar al usuario que el perfil exportado contendra su email como marca de autoria; ofrecer opcion de exportar sin watermark |
| `hostname()` transmitido a Polar.sh sin informar al usuario | No conforme | Baja | `src/lib/license/polar-api.ts:73` — `label: hostname()` incluye el nombre del equipo macOS (que por defecto contiene el nombre del propietario) en la peticion de activacion enviada a `api.polar.sh`; el usuario no es informado de esta transmision | Reemplazar `hostname()` con el `instanceId` UUID ya generado localmente (`activation.id`) o con un UUID anonimo almacenado en `~/.brew-tui/`; el `label` de Polar.sh es visible en el dashboard del vendedor |
| Sin mecanismo de eliminacion de datos de usuario | No conforme | Baja | No existe comando `brew-tui delete-data` ni flujo en TUI para eliminar `~/.brew-tui/` (license.json, history.json, profiles/); los requisitos de App Store para apps con cuentas exigen eliminacion de cuenta/datos | Agregar subcomando `brew-tui delete-account` que elimine `~/.brew-tui/` tras confirmacion; documentar el proceso en README |
| Email visible en historial de shell via CLI | Parcial | Baja | `src/index.tsx:22,62` — el email se imprime en los comandos `activate` y `status`; queda en `~/.zsh_history` si el output se redirige, y en logs de CI si se ejecuta en pipelines | Bajo impacto en uso interactivo normal; documentar para usuarios de CI |

---

## Registro de riesgos de seguridad

| Riesgo | Superficie | Severidad | Evidencia | Mitigacion |
|--------|------------|-----------|-----------|------------|
| Verificacion SHA-256 de BrewBar es codigo muerto — el archivo `.sha256` nunca ha existido en la URL de descarga | Backend/Distribucion | Alta | `release.yml` nunca genera `BrewBar.app.zip.sha256`; `brewbar-installer.ts:63` recibe un 404 al intentar descargarlo; el `catch` en la linea 73 descarta el error (solo relanza `'checksum mismatch'`); la comparacion en linea 68 jamas ha ejecutado en produccion | Agregar `shasum -a 256 BrewBar.app.zip > BrewBar.app.zip.sha256` en el job `build-brewbar`; subir ambos en `create-release`; revisar la logica del `catch` para no descartar errores de red cuando el archivo existe |
| BrewBar.app sin firma de codigo ni notarizacion | App/Distribucion | Alta | `release.yml` no incluye `codesign` ni `notarytool`; binario sin firma provoca advertencia de Gatekeeper y no permite verificar autenticidad | Obtener Apple Developer Program membership; configurar signing y notarizacion en CI usando secretos de GitHub (`APPLE_CERT_P12`, `APPLE_CERT_PASSWORD`, `APPLE_TEAM_ID`, `APPLE_ID`, `APPLE_APP_PASSWORD`) |
| Clave AES hardcodeada en bundle npm (TypeScript) | App/Licencia | Media | `src/lib/license/license-manager.ts:61-62` — `'brew-tui-license-aes256gcm-v1'` y `'brew-tui-salt-v1'` son visibles en el paquete npm publicado; permiten descifrar cualquier `license.json` local | Inherente al modelo cliente-local; mitigacion parcial: incorporar un componente derivado del UUID del sistema operativo (`ioreg -rd1 -c IOPlatformExpertDevice`) para que la clave sea unica por maquina y no portable |
| Clave AES precomputada embebida en binario Swift | App/Licencia | Media | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:47` — hex `5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126` extraible con `strings BrewBar` o Hopper en 5 segundos | Mismo vector que el anterior; agregar el UUID de la maquina como componente de la clave en la proxima version del formato `v2`; el comentario ya reconoce este hecho |
| Watermark con email del usuario sin consentimiento explicito en exportacion de perfiles | Privacidad | Media | `src/lib/license/watermark.ts:5-17` (comentario interno reconoce el problema) + `profile-manager.ts:111` | Agregar pantalla/mensaje de consentimiento antes de exportar; permitir exportacion sin watermark |
| `checkBundleIntegrity()` falla-abierta en errores de lectura | App/Licencia | Baja | `src/lib/license/integrity.ts:37` — `return true` en el bloque catch del hash de verificacion | Cambiar a falla-cerrada con mensaje de advertencia; al menos loguear un aviso interno visible en modo debug |
| GitHub Action de tercero `softprops/action-gh-release` sin pin por hash SHA | CI/CD | Baja | `.github/workflows/release.yml:89` — `@v2` es un tag mutable; si el repositorio del tercero es comprometido, el tag puede apuntar a codigo malicioso | Fijar la action por hash de commit inmutable: `softprops/action-gh-release@<SHA>` |
| `hostname()` del equipo transmitido a Polar.sh como campo `label` sin informar al usuario | App/Privacidad | Baja | `src/lib/license/polar-api.ts:73` — `label: hostname()` envia el nombre del equipo macOS (que por defecto contiene el nombre del propietario) al servidor de Polar.sh durante la activacion | Reemplazar con un UUID anonimo generado localmente o con el `instanceId` ya existente; el `label` es visible en el dashboard de Polar.sh del vendedor |
| Sin mecanismo de eliminacion de datos de usuario (`delete-account`) | Privacidad | Baja | No existe subcomando ni flujo TUI para borrar `~/.brew-tui/`; los requisitos de App Store para apps con cuentas requieren opcion de eliminacion | Implementar `brew-tui delete-account` con confirmacion y documentar; no aplica a la distribucion npm actual pero si a una eventual publicacion en Mac App Store |
| Email del usuario visible en historial de shell via `brew-tui status` y `brew-tui activate` | App/Privacidad | Baja | `src/index.tsx:22,62` — el email queda en `~/.zsh_history` si el output es redirigido o en logs de CI | Advertencia menor para usuarios que ejecuten estos comandos en pipelines de CI; documentar |
