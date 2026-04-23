# 13. Seguridad y privacidad

> Auditor: security-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

El proyecto presenta **cuatro vulnerabilidades criticas** que invalidan sustancialmente el modelo de proteccion de licencias: la clave de cifrado AES-256-GCM esta hard-codeada tanto en el bundle TypeScript distribuido via npm como en el binario Swift de BrewBar, la proteccion anti-debugger puede desactivarse trivialmente con una variable de entorno, y el instalador de BrewBar descarga y extrae una aplicacion sin verificar su integridad ni firma. Adicionalmente, BrewBar se distribuye sin firma de codigo, sin notarizacion y sin `PrivacyInfo.xcprivacy`, lo que incumple los requisitos de la App Store y Gatekeeper. El transporte hacia APIs externas usa HTTPS correctamente, pero el sistema de licencias en su conjunto ofrece una resistencia ilusoria a atacantes determinados con acceso al codigo fuente publicado.

---

## 13.1 App y cliente

### Checklist

* [ ] Sin secretos hard-coded — **Critica**: `ENCRYPTION_SECRET` y `SCRYPT_SALT` en `license-manager.ts:60-61`; clave hex derivada en `LicenseChecker.swift:47`
* [ ] Anti-debug robusto — **Critica**: bypass trivial via `VITEST=1` o `CI=1` (`anti-debug.ts:11`)
* [x] Almacenamiento de licencia con permisos restrictivos — `license.json` con modo `0o600`
* [ ] Almacenamiento seguro (Keychain) para credenciales — **Media**: se usa fichero del sistema de archivos, no Keychain
* [ ] Descarga de BrewBar con verificacion de integridad — **Critica**: ningun checksum ni verificacion de firma
* [x] HTTPS obligatorio en todas las URLs externas — todas las URL usan `https://`
* [ ] Pinning de certificados en llamadas a API sensibles — **Media**: no implementado
* [x] Logs sin PII no controlado — los logs de consola en la CLI son intencionados (salida al usuario), no logs de debugging internos con PII
* [ ] `console.error` de debugging no guardado por DEBUG — **Media**: `brew-store.ts:112` usa `NODE_ENV !== 'production'` pero tsup no inyecta `NODE_ENV`, por lo que la guarda es ineficaz en produccion
* [x] Deep links / URL schemes — no hay schemes registrados ni universal links
* [x] Portapapeles — solo se copia el comando `npm install -g brew-tui` de forma explicita al usuario (`AppDelegate.swift:105`)
* [x] Sanitizacion de flag injection en `brew search` — `brew-api.ts:41-43` elimina guiones iniciales
* [ ] Sanitizacion de nombres en importacion de perfiles — **Alta**: nombres de tap/formula/cask de un JSON externo se pasan directamente a `brew tap` y `brew install` sin validar formato
* [x] Path traversal en nombres de perfiles — validado con regex `[\w\s-]+` y `basename()` en `profile-manager.ts:25-35`
* [ ] BrewBar firmada con identidad de desarrollador — **Alta**: pipeline de CI (`release.yml`) construye pero no firma
* [ ] BrewBar notarizada — **Alta**: no hay paso de notarizacion en CI
* [ ] BrewBar con App Sandbox habilitado — **Alta**: sin entitlements, sin sandbox
* [ ] `PrivacyInfo.xcprivacy` presente — **Alta**: fichero inexistente
* [x] Formato legacy de licencia (sin cifrar) aceptado solo para migracion — aceptado en ambos codebases; riesgo residual limitado al escenario de downgrade

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Clave AES hard-coded (TypeScript) | No conforme | Critica | `src/lib/license/license-manager.ts:60-61`: `ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1'`, `SCRYPT_SALT = 'brew-tui-salt-v1'` — publicados en npm | Leer secreto desde `~/.brew-tui/` o variable de entorno generada al instalar; rotar la clave |
| Clave AES hard-coded (Swift) | No conforme | Critica | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:47`: hex `5c3b2ae2a3066bca...` embebido en el binario distribuido | Derivar la clave en tiempo de ejecucion desde un secreto generado durante la activacion; no usar una constante compilada |
| Bypass anti-debug via env var | No conforme | Critica | `src/lib/license/anti-debug.ts:11`: `if (process.env.VITEST \|\| process.env.CI) return false` — cualquier usuario puede ejecutar `VITEST=1 brew-tui` | Eliminar el bypass de entorno o restringirlo a builds marcados explicitamente como debug en tiempo de compilacion |
| Descarga de BrewBar sin integridad | No conforme | Critica | `src/lib/brewbar-installer.ts:42-60`: descarga ZIP de GitHub sin checksum SHA-256 ni verificacion de firma de codigo antes de instalar en `/Applications/` | Publicar checksum SHA-256 en el release y verificarlo post-descarga; verificar firma con `codesign --verify` antes de ejecutar `ditto` |
| Nombres de tap/formula/cask en perfiles sin validacion | No conforme | Alta | `src/lib/profiles/profile-manager.ts:130-151`: `profile.taps`, `profile.formulae`, `profile.casks` se pasan directamente a `execBrew(['tap', tap])` y `streamBrew(['install', name])` sin validar formato Homebrew | Validar que tap siga el patron `owner/repo`, y que formula/cask solo contenga caracteres alfanumericos, guiones y puntos; rechazar entradas malformadas |
| BrewBar sin firma de codigo ni notarizacion | No conforme | Alta | `.github/workflows/release.yml:57-69`: `xcodebuild ... build` sin `CODE_SIGN_IDENTITY`, sin `xcrun notarytool` — Gatekeeper bloqueara la app o la marcara como no verificada | Configurar firma con Apple Developer ID en CI; notarizar y staple antes de empaquetar el ZIP |
| BrewBar sin App Sandbox | No conforme | Alta | Ausencia total de `.entitlements` en el proyecto; `Project.swift` no declara ningun entitlement | Crear `BrewBar.entitlements` con `com.apple.security.app-sandbox = true` y unicamente los entitlements necesarios |
| `PrivacyInfo.xcprivacy` ausente | No conforme | Alta | Fichero no encontrado en ninguna ruta del proyecto; requerido por Apple desde primavera 2024 para SDKs y apps | Crear `PrivacyInfo.xcprivacy` declarando `NSPrivacyAccessedAPITypes` para UserDefaults (`NSPrivacyAccessedAPICategoryUserDefaults`), y completar `NSPrivacyCollectedDataTypes` |
| Almacenamiento de licencia fuera de Keychain | No conforme | Media | `src/lib/data-dir.ts:6`: `LICENSE_PATH = ~/.brew-tui/license.json` — `writeFile` con `mode: 0o600`; la clave de cifrado es publica, por lo que el cifrado no aporta confidencialidad real | Almacenar al menos el `instanceId` y `key` en Keychain; usar `~/.brew-tui/license.json` unicamente como cache de metadatos no sensibles |
| Sin pinning de certificados | No conforme | Media | `src/lib/license/polar-api.ts` y `src/lib/security/osv-api.ts` usan `fetch()` nativo sin configuracion TLS adicional | Para la API de licencias, considerar pinning de certificado o al menos HPKP documentado; critico para resistir MITM contra el sistema de activacion |
| `console.error` en brew-store no guardado en produccion | No conforme | Media | `src/stores/brew-store.ts:112`: `if (process.env.NODE_ENV !== 'production')` — `tsup.config.ts` no inyecta `NODE_ENV`, por lo que la guarda nunca activa el modo produccion | Agregar `"process.env.NODE_ENV": '"production"'` en el bloque `define` de `tsup.config.ts` |
| Formato legacy de licencia sin cifrar | Parcial | Baja | `src/lib/license/license-manager.ts:116-121` y `LicenseChecker.swift:75-77`: fallback al formato legacy aceptado — vector de downgrade si un atacante reemplaza el fichero | Emitir un warning y migrar inmediatamente; considerar rechazar el formato legacy tras un periodo de transicion |

---

## 13.2 Backend y transporte

### Checklist

* [x] No existe backend propio — el proyecto es cliente de Polar API y OSV.dev
* [x] HTTPS obligatorio en Polar API — `polar-api.ts:12-18` valida que el protocolo sea `https:` y el host termine en `polar.sh`
* [x] HTTPS obligatorio en OSV.dev — URL constante `https://api.osv.dev/v1/querybatch`
* [x] HTTPS obligatorio en descarga de BrewBar — `DOWNLOAD_URL` usa `https://github.com`
* [ ] Pinning de certificados — **Media**: no implementado en ninguna llamada de red
* [x] Validacion del formato de licencia key antes de llamar a la API — `license-manager.ts:184-194`: rechaza keys con menos de 10 o mas de 100 caracteres y solo permite `[\w-]+`
* [x] Rate limiting local en activaciones — `license-manager.ts:28-57`: cooldown 30s, 5 intentos, lockout 15 min
* [ ] Sin limite de rate en llamadas a OSV.dev — **Baja**: en instalaciones grandes puede alcanzar el limite de la API sin gestion de reintentos con backoff
* [x] Datos de red no logueados — ninguna respuesta de la API se vuelca a consola fuera del path de error intencional
* [x] Llamadas a Polar API solo sobre endpoints conocidos — `validateApiUrl()` en `polar-api.ts:11-18`
* [x] `brew` invocado como array de argumentos (no shell) — `spawn('brew', args)` y `execFile('ditto', args)` impiden shell injection
* [x] `du` invocado como array de argumentos — `execFileAsync('du', ['-sk', cellarPath])` sin shell
* [ ] Verificacion de integridad del artefacto descargado — **Critica**: (repetido de 13.1) ninguna verificacion post-descarga de BrewBar.app.zip
* [x] CI publica en npm con token secreto — `NPM_TOKEN` en GitHub Secrets, no en codigo
* [ ] npm publish sin provenance — **Media**: `npm publish --access public` sin `--provenance`, sin SLSA attestation

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Sin provenance en npm publish | No conforme | Media | `.github/workflows/release.yml:26` y `publish.yml:18`: `npm publish --access public` sin `--provenance` | Agregar `--provenance` al comando `npm publish`; requiere `permissions: id-token: write` en el job |
| Sin rate limiting ni backoff en OSV.dev | No conforme | Baja | `src/lib/security/osv-api.ts:60-98`: en caso de error HTTP != 400 lanza excepcion; no hay reintentos con backoff exponencial | Implementar backoff exponencial con jitter para errores 429/5xx de OSV.dev |
| CI de BrewBar sin firma de codigo | No conforme | Alta | `.github/workflows/release.yml:57-69`: `xcodebuild ... build` sin `-CODE_SIGN_IDENTITY`, sin `xcrun notarytool submit` | Ver accion en 13.1: configurar certificado Developer ID en CI secrets y notarizar antes de empaquetar |
| Segunda publicacion a GitHub Packages sin typecheck | No conforme | Baja | `.github/workflows/release.yml:39-45`: `publish-github-packages` ejecuta solo `npm run build`, omite `typecheck` y `lint` | Agregar `npm run typecheck && npm run lint` antes de `npm run build` en el job secundario |

---

## 13.3 Privacidad

### Checklist

* [x] BrewBar no solicita camara, fotos, localizacion, microfono, contactos — ninguna descripcion de permiso declarada porque no se usan esos recursos
* [x] Notificaciones solicitadas en contexto — `SchedulerService.swift:49`: la primera solicitud se realiza en el primer lanzamiento (contexto de configuracion), con permiso revocable desde Ajustes
* [x] Preferencias en UserDefaults son no sensibles — solo `checkInterval`, `notificationsEnabled`, `hasLaunchedBefore` — sin tokens ni credenciales
* [ ] `PrivacyInfo.xcprivacy` ausente — **Alta**: UserDefaults requiere declarar `NSPrivacyAccessedAPICategoryUserDefaults`; `FileManager` para leer `license.json` podria requerir declaracion segun uso
* [ ] Sin politica de retencion de datos definida — **Baja**: `history.json` puede crecer hasta 1000 entradas indefinidamente; no hay mecanismo de TTL
* [x] Eliminacion de licencia implementada — `clearLicense()` en `license-manager.ts:136-140` borra el fichero al desactivar
* [ ] Sin mecanismo de exportacion/eliminacion de cuenta en el producto — **Baja**: la desactivacion elimina la licencia local pero no hay solicitud de borrado de cuenta en Polar.sh desde la app
* [ ] Watermark incrustado con email del usuario sin consentimiento explicito — **Media**: `watermark.ts:8-13`: el email del cliente se incrusta en los perfiles exportados como `Licensed to: <email>`; `embedInvisibleWatermark()` codifica el email con caracteres de ancho cero
* [ ] Sin declaracion de analytics/telemetria al usuario — **Baja**: `license-manager.ts:230-232` documenta que cada revalidacion sirve como telemetria para Polar.sh, pero esto no se informa al usuario
* [x] Sin tracking de terceros (Firebase, Mixpanel, etc.) — no se detecta ninguna SDK de analytics
* [x] Sin framework ATT (App Tracking Transparency) — no aplica porque no hay tracking de publicidad

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `PrivacyInfo.xcprivacy` ausente en BrewBar | No conforme | Alta | Fichero no encontrado; `SchedulerService.swift:44` usa `UserDefaults.standard`, que requiere declaracion de razon de acceso desde iOS 17 / macOS 14 | Crear `PrivacyInfo.xcprivacy` en `menubar/BrewBar/Resources/`, declarar `NSPrivacyAccessedAPICategoryUserDefaults` con razon `CA92.1` (user preferences) |
| Watermark con email sin consentimiento informado | No conforme | Media | `src/lib/license/watermark.ts:8-13` y `src/lib/license/watermark.ts:20-34`: el email del comprador se incrusta en texto visible (`Licensed to: email`) y en caracteres invisibles Unicode en cada perfil exportado; el usuario no es informado | Informar en la UI que los perfiles exportados contienen una marca de agua con el email de licencia; ofrecer opcion de exportar sin marca o con hash del email |
| Telemetria de validacion no declarada | No conforme | Baja | `src/lib/license/license-manager.ts:229-232`: el comentario describe explicitamente que cada validacion sirve como telemetria; no hay aviso al usuario en la UI ni en la documentacion accesible | Incluir en la pantalla de cuenta (`account-view`) o en los terminos una descripcion de que las revalidaciones periodicas informan a Polar.sh del uso activo |
| Historial sin TTL | No conforme | Baja | `src/lib/history/history-logger.ts:47-50`: cap de 1000 entradas sin fecha de expiracion; entradas antiguas pueden persistir indefinidamente | Implementar un TTL de 90 dias o proporcionar opcion de borrado automatico configurable |
| Sin flujo de eliminacion de cuenta en Polar.sh | No conforme | Baja | `account-view.tsx` ofrece desactivacion (elimina licencia local) pero no enlaza ni documenta el proceso para solicitar el borrado de datos en Polar.sh | Agregar enlace al panel de Polar.sh o instrucciones para solicitar eliminacion de datos al vendor |

---

## Registro de riesgos de seguridad

| Riesgo | Superficie | Severidad | Evidencia | Mitigacion |
|--------|------------|-----------|-----------|------------|
| Clave AES-256-GCM compilada en el bundle npm — cualquier instalador puede extraerla y forjar `license.json` | App (TUI) | Critica | `src/lib/license/license-manager.ts:60-61`: `ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1'`; `SCRYPT_SALT = 'brew-tui-salt-v1'` | Generar una clave unica por instalacion durante `activate`; almacenarla en Keychain; invalidar el secreto estatico actual rotando el esquema de cifrado |
| Clave AES-256-GCM hex en el binario Swift de BrewBar — reversible con `strings` o un disassembler | App (BrewBar) | Critica | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:47`: `"5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126"` | Almacenar el secreto en Keychain durante la activacion; leer desde Keychain en LicenseChecker en lugar de la constante compilada |
| Anti-debug desactivable con `VITEST=1` o `CI=1` — cualquier usuario puede omitir la proteccion | App (TUI) | Critica | `src/lib/license/anti-debug.ts:11`: `if (process.env.VITEST \|\| process.env.CI) return false` | Eliminar el bypass por variable de entorno; usar una flag de compilacion inyectada por tsup en su lugar (`define: { '__DEBUG_EXEMPT__': 'false' }`) |
| BrewBar descargada e instalada sin verificacion de integridad — vector de sustitucion de binario / MITM | Transporte + App | Critica | `src/lib/brewbar-installer.ts:42-60`: descarga HTTPS sin checksum; `ditto -xk` extrae directamente en `/Applications/` | Publicar SHA-256 del ZIP en el release; verificar el checksum post-descarga; verificar la firma con `codesign --verify --deep` antes de mover a `/Applications/` |
| Nombres de paquetes y taps de perfiles importados pasan sin validacion a `brew install` y `brew tap` | App (TUI) | Alta | `src/lib/profiles/profile-manager.ts:130-151`: arrays `profile.taps`, `profile.formulae`, `profile.casks` de JSON externo ejecutados directamente | Validar que taps sigan `owner/repo`, formulae y casks solo contengan `[a-z0-9._-]`; rechazar entradas que no cumplan el patron antes de invocar brew |
| BrewBar distribuida sin firma Developer ID ni notarizacion — Gatekeeper la bloqueara; ademas la app puede ser sustituida | App (BrewBar) | Alta | `.github/workflows/release.yml:57-69`: sin `CODE_SIGN_IDENTITY` ni `xcrun notarytool` | Configurar certificado Developer ID en CI secrets; firmar con `--deep --options runtime`; notarizar con `xcrun notarytool`; staple antes de empaquetar |
| BrewBar sin App Sandbox — acceso completo al sistema de archivos y red del usuario | App (BrewBar) | Alta | Ausencia de `.entitlements` en todo el proyecto | Crear `BrewBar.entitlements` con `com.apple.security.app-sandbox = true` y solo los entitlements minimos necesarios |
| `PrivacyInfo.xcprivacy` ausente — incumplimiento de requisito de Apple desde primavera 2024 | Privacidad | Alta | Fichero no encontrado en ninguna ruta del repositorio | Crear el fichero declarando UserDefaults (`CA92.1`) y cualquier otro API accedido |
| Email del comprador incrustado en perfiles exportados sin consentimiento informado | Privacidad | Media | `src/lib/license/watermark.ts:8-13,20-34`: texto visible + caracteres Unicode de ancho cero con el email | Informar al usuario en la UI; ofrecer opcion de exportar sin PII; usar hash en lugar del email en claro |
| Almacenamiento de licencia en fichero del sistema en lugar de Keychain — la clave de cifrado es publica | App (TUI + BrewBar) | Media | `src/lib/data-dir.ts:6`: `~/.brew-tui/license.json`; `LicenseChecker.swift:39-40`: misma ruta | Migrar `key` e `instanceId` a Keychain; mantener solo metadatos no sensibles en el JSON |
| `console.error` en brew-store no desactivado en produccion — `NODE_ENV` no inyectado por tsup | App (TUI) | Media | `src/stores/brew-store.ts:112` + `tsup.config.ts` sin `define NODE_ENV` | Agregar `"process.env.NODE_ENV": '"production"'` en el `define` de `tsup.config.ts` |
| Sin pinning de certificados en Polar API ni OSV.dev | Transporte | Media | `src/lib/license/polar-api.ts` y `src/lib/security/osv-api.ts`: `fetch()` nativo sin configuracion TLS adicional | Implementar pinning de certificado para Polar API como minimo; documentar la ausencia de pinning en la politica de seguridad |
| npm publish sin SLSA provenance — los artefactos en npm no son verificables | Cadena de suministro | Media | `.github/workflows/release.yml:26` y `publish.yml:18`: sin `--provenance` | Agregar `--provenance` y `permissions: id-token: write` en ambos workflows |
| Telemetria de validacion no declarada al usuario | Privacidad | Baja | `src/lib/license/license-manager.ts:229-232` | Documentar en la pantalla de cuenta o en la politica de privacidad accesible desde la app |
| Sin TTL en `history.json` | Privacidad | Baja | `src/lib/history/history-logger.ts:47-50`: cap de 1000 entradas sin expiracion temporal | Implementar TTL de 90 dias o configuracion de retencion por el usuario |
| Sin flujo de solicitud de borrado de cuenta en Polar.sh desde la app | Privacidad | Baja | `src/views/account.tsx`: solo ofrece desactivacion local | Agregar enlace al portal de Polar.sh para gestion de datos personales |
| Segunda publicacion de CI a GitHub Packages omite typecheck y lint | Cadena de suministro | Baja | `.github/workflows/release.yml:39-45` | Agregar `npm run typecheck && npm run lint` al job `publish-github-packages` |
| Sin rate limiting ni backoff en OSV.dev para instalaciones grandes | Transporte | Baja | `src/lib/security/osv-api.ts:60-98`: sin manejo de 429 | Implementar backoff exponencial con jitter para respuestas 429 y 5xx |
