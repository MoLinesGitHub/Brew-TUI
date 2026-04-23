# 2. Gobierno del proyecto

> Auditor: governance-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

El proyecto v0.2.0 presenta una base de gobierno sólida en ambas codebases: los targets son mínimos y claros, los build settings del lado Swift son mayoritariamente correctos y el pipeline CI/CD ha mejorado significativamente respecto a la versión anterior. Se detectan cinco hallazgos prioritarios que requieren atención: la clave de cifrado AES-256-GCM para licencias está embebida en texto claro en `LicenseChecker.swift` y `license-manager.ts` (Media, inherente al modelo client-side), `NSMainStoryboardFile = "Main"` aparece en el template del Info.plist de Tuist sin archivo storyboard correspondiente (Media), la version `CFBundleShortVersionString` no se define explicitamente en `Project.swift` y depende del default `1.0` del template (Media), `SWIFT_STRICT_CONCURRENCY` no se documenta explicitamente en `Project.swift` (Parcial/Media), y la clave organizativa de Polar está embebida en codigo fuente (Baja).

---

## 2.1 Targets, schemes y configuracion

### Checklist

* [x] Todos los targets tienen proposito claro
* [x] No existen targets obsoletos
* [x] Los schemes estan alineados con los entornos reales
* [x] Debug, Release y Staging estan separados correctamente
* [x] No hay flags inconsistentes entre entornos
* [x] La configuracion de testing no contamina produccion

### Hallazgos

#### Codebase Swift (BrewBar — Tuist)

El proyecto Swift tiene un unico target (`BrewBar`, `com.molinesdesigns.brewbar`, macOS 14+, `LSUIElement: true`). El target tiene proposito claro y bien delimitado. No existen targets de test ni targets obsoletos. Dos configuraciones de build: `Debug` y `Release`. No existe una configuracion `Staging` separada, lo cual es aceptable dado que el modelo de distribucion es direct-download desde GitHub Releases sin TestFlight ni entorno intermedio.

La separacion Debug/Release es funcional: `GCC_PREPROCESSOR_DEFINITIONS = ("DEBUG=1", "$(inherited)")` en Debug, `SWIFT_ACTIVE_COMPILATION_CONDITIONS = "$(inherited) DEBUG"` en Debug, `SWIFT_COMPILATION_MODE = wholemodule` y `SWIFT_OPTIMIZATION_LEVEL = "-O"` en Release vs `"-Onone"` en Debug. El `.xcodeproj` y `Derived/` no estan en control de versiones (gitignoreados); se generan via `tuist generate` en CI y en local.

#### Codebase TypeScript (Brew-TUI)

Los scripts npm cubren los "entornos" relevantes: `dev` (tsx directo, sin bundling), `build` (tsup, produccion), `test` (vitest), `lint` (eslint). El pipeline de release ejecuta `typecheck → test → build → lint` en el job `publish-npm`, lo que es correcto.

No existe configuracion `Staging` explicita en TypeScript, lo cual es aceptable: el producto se distribuye como CLI npm y no existe backend propio ni entorno intermedio que requiera dicha separacion.

**La configuracion de testing no contamina produccion**: `__TEST_MODE__` se inyecta como `false` en tsup, y `NODE_ENV` se fija a `"production"`. Conforme.

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Target BrewBar (Swift) | Conforme | — | `menubar/Project.swift:23-38` | — |
| Separacion Debug/Release (Swift) | Conforme | — | Configuraciones en `Project.swift:18-22`; generadas correctamente en pbxproj local | — |
| Ausencia de target de test (Swift) | No aplica | — | No existen tests Swift en el proyecto | Considerar agregar XCTest target en version futura |
| Targets/scripts npm (TypeScript) | Conforme | — | `package.json:26-32` | — |
| NODE_ENV inyectado en produccion | Conforme | — | `tsup.config.ts:17: 'process.env.NODE_ENV': '"production"'` | — |
| __TEST_MODE__ en false en produccion | Conforme | — | `tsup.config.ts:18: '__TEST_MODE__': 'false'` | — |
| publish.yml eliminado | Conforme | — | Solo existe `release.yml` en `.github/workflows/` | — |

---

## 2.2 Build settings

### Checklist

* [x] Swift language version correcta
* [ ] Strict concurrency activada segun politica del proyecto — **Media**: `SWIFT_STRICT_CONCURRENCY` no esta declarado explicitamente en `Project.swift`; se depende del default del compilador Swift 6
* [x] Warnings relevantes tratados como errores donde proceda
* [x] Optimizacion de Release correcta
* [x] No hay linker flags heredados innecesarios
* [x] No hay paths hardcodeados locales
* [x] Arquitecturas configuradas correctamente

### Hallazgos

#### Swift — SWIFT_VERSION

`SWIFT_VERSION: "6.0"` esta definido en los build settings base de `Project.swift` (linea 10). Conforme.

#### Swift — SWIFT_STRICT_CONCURRENCY

Con Swift 6, el compilador aplica comprobaciones de concurrencia estricta por defecto al compilar en modo Swift 6 (`complete`). Sin embargo, `SWIFT_STRICT_CONCURRENCY` no aparece explicitamente en `Project.swift`. Esto implica que se usa el default del compilador Swift 6, que es el valor correcto. El hallazgo es que la politica no esta documentada explicitamente como setting, y podria heredarse de forma distinta si Tuist o el toolchain cambian sus defaults. Estado: Parcial.

#### Swift — Warnings como errores

`GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR`, `CLANG_WARN_OBJC_ROOT_CLASS = YES_ERROR`, y multiples warnings CLANG activados en ambas configuraciones (verificados en el pbxproj generado localmente). Swift 6 convierte muchas verificaciones de concurrencia en errores de compilacion. Conforme.

#### Swift — Optimizacion Release

`SWIFT_OPTIMIZATION_LEVEL = "-O"` en Release, `"-Onone"` en Debug. `SWIFT_COMPILATION_MODE = wholemodule` en Release, `singlefile` en Debug. `DEAD_CODE_STRIPPING: "YES"` en base settings de `Project.swift` (linea 14). Conforme.

#### Swift — OTHER_LDFLAGS

`-L$(DT_TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)` es un flag generado por Tuist para Swift stdlib linkage y es apropiado. Conforme.

#### Swift — Paths hardcodeados en build settings

No existen paths absolutos hardcodeados en los build settings de `Project.swift`. La referencia a `/home/linuxbrew/.linuxbrew/bin/brew` en `BrewChecker.swift` es un valor de runtime (candidato de fallback para instalaciones Linux), no un build setting. Conforme para build settings.

#### Swift — Arquitecturas

No se especifican `ARCHS` ni `EXCLUDED_ARCHS` en `Project.swift`, lo que significa que se usan los defaults del SDK macOS. Correcto para una app macOS distribuida. Conforme.

#### TypeScript — Version y configuracion

`"target": "ES2022"`, `"module": "NodeNext"`, `"strict": true` en `tsconfig.json`. tsup usa `target: 'node18'`. Conforme.

#### TypeScript — sourceMap en produccion

`tsup.config.ts` tiene `sourcemap: false` (linea 12). El directorio `build/` no contiene archivos `.map`. `tsconfig.json` tiene `"sourceMap": true` pero ese setting afecta unicamente a `tsc --noEmit` (typecheck) y no al bundle de produccion generado por tsup. Conforme.

#### TypeScript — ESLint

`eslint.config.js` usa `js.configs.recommended` mas `@typescript-eslint/no-unused-vars` como `warn`. La cobertura de reglas es minima. No es un hallazgo bloqueante dado que TypeScript `strict: true` cubre la mayoria de casos, pero la cobertura de linting podria mejorarse. Estado: Parcial.

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| SWIFT_VERSION = 6.0 | Conforme | — | `Project.swift:10` | — |
| SWIFT_STRICT_CONCURRENCY no declarado explicitamente | Parcial | Media | `Project.swift`: no contiene esta clave; Swift 6 default es `complete` | Agregar `"SWIFT_STRICT_CONCURRENCY": "complete"` en base settings de `Project.swift` para documentar la intencion explicitamente |
| Optimizacion Release (`-O`, wholemodule) | Conforme | — | `Project.swift:19-22` (configuraciones Debug/Release) | — |
| DEAD_CODE_STRIPPING = YES | Conforme | — | `Project.swift:14` | — |
| OTHER_LDFLAGS (Tuist stdlib) | Conforme | — | Generado por Tuist para Swift stdlib | — |
| Arquitecturas (default SDK macOS) | Conforme | — | Sin overrides en `Project.swift` | — |
| TypeScript strict mode | Conforme | — | `tsconfig.json:7` | — |
| sourceMap false en tsup | Conforme | — | `tsup.config.ts:12`; sin `.map` en `build/` | — |
| ESLint cobertura minimalista | Parcial | Baja | `eslint.config.js`: solo `no-unused-vars` activo | Considerar activar reglas `@typescript-eslint/recommended` para mayor cobertura estatica |

---

## 2.3 Info.plist, entitlements y capabilities

### Checklist

* [ ] Info.plist minimo y coherente — **Media**: `NSMainStoryboardFile = "Main"` se hereda del template de Tuist pero no existe ningun archivo `Main.storyboard` (app usa SwiftUI + AppDelegate adaptor)
* [ ] Info.plist version explicitamente definida — **Media**: `CFBundleShortVersionString` no se define en `Project.swift`; Tuist usara su default interno (`1.0`) a menos que se especifique explicitamente
* [x] Permisos del sistema justificados
* [x] Entitlements minimos necesarios
* [x] Capabilities activadas solo si se usan
* [x] Universal Links / Associated Domains auditados — No aplica
* [x] App Groups auditados — No aplica
* [x] Keychain Sharing auditado — No aplica
* [x] Background modes justificados
* [ ] PrivacyInfo.xcprivacy incluida en el bundle — **Baja**: verificacion pendiente de que `tuist generate` la incluya; la configuracion de `Project.swift` deberia capturarla

### Hallazgos

#### Info.plist — NSMainStoryboardFile

`Project.swift` usa `infoPlist: .extendingDefault(with: [...])` (lineas 30-35) para el target BrewBar. El bloque `with:` define `LSUIElement`, `CFBundleDisplayName`, `CFBundleDevelopmentRegion`, y `NSHumanReadableCopyright`, pero no elimina las claves del template macOS por defecto de Tuist, entre ellas `NSMainStoryboardFile = "Main"`. La app es una SwiftUI app con `@NSApplicationDelegateAdaptor`, no usa storyboards. No existe ningun archivo `Main.storyboard` en el proyecto. Esta clave es un remanente del template de Tuist y es ignorada por el sistema en apps SwiftUI, pero representa ruido en el plist y puede causar confusion. Severidad: Media.

Accion: En `Project.swift`, convertir a `.file(path:)` con un Info.plist propio, o agregar la clave con valor vacio para sobrescribir el default: se puede intentar con `.extendingDefault(with: ["NSMainStoryboardFile": ""])`. La forma mas limpia es usar `.dictionary(entiries:)` en lugar de `.extendingDefault(with:)` para tener control total sobre el plist.

#### Info.plist — Version del bundle

`Project.swift` define `MARKETING_VERSION: "$(MARKETING_VERSION:default=0.2.0)"` como build setting (linea 13) pero no define `CFBundleShortVersionString` ni `CFBundleVersion` en el bloque `infoPlist: .extendingDefault(with:)` (lineas 30-35). Tuist generara el Info.plist con sus defaults internos para estas claves, que historicamente han sido `1.0` y `1`. Esto significa que el bundle distribuido podria mostrar version `1.0` en lugar de `0.2.0` salvo que Tuist resuelva correctamente la variable `$(MARKETING_VERSION)`. Severidad: Media.

Accion: Agregar explicitamente en `Project.swift`:
```swift
"CFBundleShortVersionString": "$(MARKETING_VERSION)",
"CFBundleVersion": "$(CURRENT_PROJECT_VERSION)",
```
dentro del bloque `infoPlist: .extendingDefault(with:)`.

#### PrivacyInfo.xcprivacy — Inclusion en el bundle

`menubar/BrewBar/Resources/PrivacyInfo.xcprivacy` existe en disco con contenido correcto: declara `NSPrivacyAccessedAPICategoryUserDefaults` (razon `CA92.1`) y `NSPrivacyAccessedAPICategoryFileTimestamp` (razon `C617.1`), `NSPrivacyTracking = false`, y `NSPrivacyCollectedDataTypes = []`.

`Project.swift` define `resources: ["BrewBar/Resources/**"]` (linea 37), lo que deberia capturar el archivo al ejecutar `tuist generate`. El CI ejecuta `tuist generate` (`.github/workflows/release.yml:58`) antes de compilar, por lo que en el build de distribucion el Privacy Manifest deberia estar incluido. Sin embargo, no es posible verificar esto sin ejecutar `tuist generate` en el entorno de auditoria. Estado: Baja — la configuracion es correcta pero requiere validacion post-generacion.

Adicionalmente, la razon `CA92.1` para `NSPrivacyAccessedAPICategoryUserDefaults` esta definida por Apple como "access from app defined in same App Group". La app no usa App Groups; la razon correcta seria `1C8F.1` ("access required for app functionality"). Esta discrepancia es Baja en severidad.

#### Permisos del sistema

No existen claves `NS*UsageDescription` en el Info.plist definido en `Project.swift` ni en sus extensiones. La app no solicita ningun permiso del sistema al usuario. Las notificaciones se gestionan via `UNUserNotificationCenter` pero macOS no requiere `NS*UsageDescription` para notificaciones locales. Conforme.

#### Entitlements

No existe ningun archivo `.entitlements` en el proyecto (`Project.swift` no configura entitlements). `CODE_SIGN_IDENTITY = "-"` (firma ad-hoc, generado por Tuist). La app no usa App Sandbox, App Groups, ni Keychain Sharing. `SMAppService` para login-at-launch no requiere entitlement especifico en macOS 13+. Conforme: entitlements minimos.

Nota: La ausencia de App Sandbox es aceptable — la app necesita ejecutar `brew` como proceso hijo via `Process.run()`, lo cual es incompatible con App Sandbox.

#### Background modes

La app no declara background modes. El polling de actualizaciones se realiza via `Timer.scheduledTimer` en el run loop de la app activa. Como agente (`LSUIElement: true`) permanece activo continuamente. Conforme.

#### UserDefaults

`UserDefaults.standard` se usa en `SchedulerService.swift` para almacenar `checkInterval`, `notificationsEnabled`, y `hasLaunchedKey`. Uso apropiado para preferencias simples. No se usa App Group suite. Justificado en `PrivacyInfo.xcprivacy`. Conforme.

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| NSMainStoryboardFile heredado del template Tuist | No conforme | Media | `Project.swift:30-35`: bloque `.extendingDefault(with:)` no elimina la clave; no existe `Main.storyboard` en el proyecto | Usar `.dictionary(entries:)` o agregar `"NSMainStoryboardFile": ""` en el bloque `with:` para sobrescribir el default |
| CFBundleShortVersionString no definido en Project.swift | No conforme | Media | `Project.swift:30-35`: bloque `with:` no define `CFBundleShortVersionString` ni `CFBundleVersion` | Agregar `"CFBundleShortVersionString": "$(MARKETING_VERSION)"` y `"CFBundleVersion": "$(CURRENT_PROJECT_VERSION)"` en el bloque `infoPlist: .extendingDefault(with:)` de `Project.swift` |
| PrivacyInfo.xcprivacy — inclusion pendiente de verificacion | Parcial | Baja | `Project.swift:37`: `resources: ["BrewBar/Resources/**"]` deberia capturarla; CI ejecuta `tuist generate`; no verificable sin ejecutar Tuist | Ejecutar `tuist generate` y confirmar que `PrivacyInfo.xcprivacy` aparece en la fase Resources del proyecto generado |
| Razon CA92.1 posiblemente incorrecta en PrivacyInfo.xcprivacy | Parcial | Baja | `PrivacyInfo.xcprivacy`: `CA92.1` es "App Group access"; la app no usa App Groups; deberia ser `1C8F.1` ("app functionality") | Cambiar razon de `CA92.1` a `1C8F.1` para `NSPrivacyAccessedAPICategoryUserDefaults` |
| Sin permisos NS*UsageDescription | Conforme | — | `Project.swift:30-35`: sin claves NS*Usage | — |
| Entitlements minimos (ninguno) | Conforme | — | `Project.swift`: sin configuracion de entitlements | — |
| UserDefaults uso apropiado | Conforme | — | `SchedulerService.swift:23-53`: solo preferencias simples | — |
| Background modes no declarados | Conforme | — | Timer en run loop de agente activo; sin background modes | — |

---

## 2.4 Gestion de entornos y secretos

### Checklist

* [ ] Secrets fuera del codigo fuente — **Media**: clave de cifrado AES-256-GCM embebida en `LicenseChecker.swift` y `license-manager.ts`; `POLAR_ORGANIZATION_ID` embebido en `polar-api.ts`
* [x] Variables por entorno bien separadas
* [x] Configuracion local no filtrada al repo
* [x] Feature flags auditados
* [x] Fallbacks seguros cuando falta configuracion

### Hallazgos

#### Clave AES-256-GCM en LicenseChecker.swift y license-manager.ts

`LicenseChecker.swift` (lineas 43-50) contiene la clave derivada hardcodeada como hex literal con el comentario que documenta explicitamente su equivalencia de seguridad con embeber el secreto en texto claro:

```
private static let encryptionKey: SymmetricKey = {
    let hex = "5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126"
```

`license-manager.ts` (lineas 61-62) expone las mismas constantes de origen:

```typescript
const ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1';
const SCRYPT_SALT = 'brew-tui-salt-v1';
```

Ambas codebases tienen la misma clave de cifrado embebida en texto claro. El nivel de riesgo real es limitado: un atacante con acceso al codigo fuente podria fabricar archivos `~/.brew-tui/license.json` validos. Sin embargo, la validacion contra el servidor Polar ocurre periodicamente (cada 24h con gracia de 7 dias), lo que limita el abuso a ese intervalo. Esta limitacion es inherente a la arquitectura de licencias client-side sin servidor de validacion continua. Severidad: Media.

#### POLAR_ORGANIZATION_ID embebido

`polar-api.ts` linea 9 contiene `POLAR_ORGANIZATION_ID = 'b8f245c0-d116-4457-92fb-1bda47139f82'`. Este es un identificador publico requerido para las llamadas a la API publica de Polar. Un atacante podria usarlo para consultar informacion de licencias de la organizacion, aunque Polar requiere que el usuario aporte la clave de licencia para validar. Impacto bajo. Severidad: Baja.

#### Configuracion local no filtrada al repo

`.gitignore` cubre correctamente: `node_modules/`, `build/`, `.env`, `.env.*`, `*.xcworkspace`, `*.xcodeproj`, `menubar/Derived/`, `menubar/DerivedData/`, `*.p12`, `*.cer`, `*.mobileprovision`, `ExportOptions.plist`, `AuthKey_*.p8`. No existe ningun `.env` file en el repositorio. No existen `.xcconfig` files con secretos. Conforme.

#### NPM_TOKEN y secrets de CI

El `release.yml` usa `${{ secrets.NPM_TOKEN }}` para publicar a npm. El secreto se gestiona correctamente desde GitHub Actions y no aparece en el codigo fuente. Conforme.

#### Separacion de variables por entorno

No existen archivos `.xcconfig` de configuracion por entorno para Swift (no necesario dado que el producto no tiene backend propio). Para TypeScript, `NODE_ENV` se fija en `tsup.config.ts` (produccion) y se accede via `process.env` en el codigo. No existe archivo `.env` — no se requiere uno. Las URLs de APIs externas estan hardcodeadas en el codigo (`polar-api.ts`, `osv-api.ts`) — aceptable para URLs publicas sin secretos. Conforme.

#### Feature flags

No existe sistema de feature flags dinamico. Los "flags" del proyecto son estaticos:
- `PRO_VIEWS` en `src/lib/license/feature-gate.ts`: `Set<ViewId>` definido en codigo. No configurable en runtime. Conforme para el modelo actual.
- `__TEST_MODE__` inyectado en compile time por tsup. Conforme.
- `GCC_PREPROCESSOR_DEFINITIONS = ("DEBUG=1")` en la build Debug de Swift. Conforme.

#### Fallbacks cuando falta configuracion

- `process.env.APP_VERSION ?? '0.1.0'` en `account.tsx` linea 125: fallback a version literal. Aceptable.
- `process.env.NODE_ENV` esta inyectado en produccion via tsup, no requiere fallback.
- `LicenseChecker.checkLicense()` retorna `.notFound` si no existe el archivo de licencia. Conforme.
- `SchedulerService.swift`: `UserDefaults.standard.integer(forKey: "checkInterval")` retorna `0` si no existe la clave, y el codigo maneja el caso con defaults. Conforme.

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Clave AES-256-GCM hex en LicenseChecker.swift | No conforme | Media | `LicenseChecker.swift:48: let hex = "5c3b2ae2..."` | Inherente al modelo de licencias client-side. Documentar explicitamente el threat model. Como mejora de largo plazo: inyectar la clave derivada via build setting en CI (no en repo) para evitar exposicion en codigo fuente. |
| ENCRYPTION_SECRET / SCRYPT_SALT en license-manager.ts | No conforme | Media | `license-manager.ts:61-62` | Mismo escenario. Considerar obfuscacion de constante en build via `define` de tsup con valor inyectado desde entorno CI. |
| POLAR_ORGANIZATION_ID embebido | No conforme | Baja | `polar-api.ts:9` | Identificador publico; impacto de seguridad real bajo. Mover a constante de configuracion si se quiere evitar exposicion explicita en repo. |
| .gitignore cubre secretos y artefactos | Conforme | — | `.gitignore`: cubre `.p12`, `.cer`, `.mobileprovision`, `AuthKey_*.p8`, `.env*`, `*.xcodeproj`, `menubar/Derived/` | — |
| NPM_TOKEN via GitHub Secrets | Conforme | — | `release.yml:30: ${{ secrets.NPM_TOKEN }}` | — |
| No existen .env files en repo | Conforme | — | Busqueda exhaustiva sin resultados | — |
| Feature flags estaticos auditados | Conforme | — | `feature-gate.ts`: PRO_VIEWS set estatico; sin flags dinamicos externos | — |
| Fallbacks para configuracion faltante | Conforme | — | `account.tsx:125`, `LicenseChecker.swift:57-59`, `SchedulerService.swift:44-53` | — |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 0 |
| Media | 4 |
| Baja | 4 |

**Total hallazgos no conformes:** 8

### Detalle de los hallazgos no conformes por prioridad

1. **Media** — `NSMainStoryboardFile = "Main"` heredado del template de Tuist en `Project.swift`: clave obsoleta sin archivo storyboard correspondiente. Ruido en el Info.plist generado.

2. **Media** — `CFBundleShortVersionString` no definido en `Project.swift`: el bundle podria mostrar version `1.0` en lugar de la version real si Tuist no resuelve `MARKETING_VERSION` en la clave del plist.

3. **Media** — Clave AES-256-GCM (`5c3b2ae2...`) embebida en `LicenseChecker.swift` y `ENCRYPTION_SECRET` / `SCRYPT_SALT` embebidos en `license-manager.ts`: inherente al modelo de licencias client-side; permite fabricacion de archivos de licencia a quien tenga acceso al codigo fuente. Validacion periodica contra Polar limita el abuso.

4. **Media** — `SWIFT_STRICT_CONCURRENCY` no declarado explicitamente en `Project.swift`: dependencia del default del compilador Swift 6 sin documentar la intencion explicita.

5. **Baja** — `POLAR_ORGANIZATION_ID` embebido en `polar-api.ts`: identificador publico de organizacion; impacto de seguridad real bajo.

6. **Baja** — ESLint con cobertura minimalista: solo `no-unused-vars` activado; TypeScript strict mode mitiga la mayoria de riesgos.

7. **Baja** — `PrivacyInfo.xcprivacy` pendiente de verificacion post-`tuist generate`: la configuracion de `Project.swift` es correcta pero requiere confirmacion de inclusion en bundle.

8. **Baja** — Razon `CA92.1` posiblemente incorrecta en `PrivacyInfo.xcprivacy` para `NSPrivacyAccessedAPICategoryUserDefaults`: deberia ser `1C8F.1`.
