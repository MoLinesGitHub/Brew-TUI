# 2. Gobierno del proyecto

> Auditor: governance-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

El proyecto Brew-TUI presenta una estructura de gobierno aceptable para un producto en etapa inicial, con configuraciones de build correctas en ambos codebases y ausencia de secretos de acceso a APIs de terceros en el codigo fuente. Sin embargo, existen tres hallazgos de impacto significativo: la clave de cifrado AES-256 del sistema de licencias Pro esta embebida como constante en el codigo Swift distribuido (lo que invalida la capa de proteccion que pretende ofrecer), existe un conflicto de workflows de CI que puede causar publicaciones npm duplicadas en cada release, y los source maps de produccion quedan incluidos en el bundle distribuido (exponiendo la estructura interna del codigo). La configuracion de Swift no activa `SWIFT_STRICT_CONCURRENCY = complete` pese a usar Swift 6, y la licencia MIT es incompatible con el modelo de negocio freemium del proyecto.

---

## 2.1 Targets, schemes y configuracion

### Alcance

Esta seccion cubre ambos codebases: el TUI TypeScript (`package.json`, scripts npm, `tsup.config.ts`, CI/CD) y BrewBar Swift (`Project.swift`, `project.pbxproj`, schemes `.xcscheme`, workflows).

### Checklist

* [x] Todos los targets tienen proposito claro
* [x] No existen targets obsoletos
* [ ] Los schemes estan alineados con los entornos reales — **Baja**: el scheme `Generate Project` contiene un `customWorkingDirectory` hardcodeado que apunta a una ruta local de desarrollador (`/Volumes/SSD/Projects/Brew/menubar`) distinta de la ruta real del proyecto
* [ ] Debug, Release y Staging estan separados correctamente — **Media**: no existe configuracion de entorno Staging en ninguno de los dos codebases; la separacion de entornos en el TUI TypeScript es binaria (dev con `tsx` vs. build con `tsup`) sin diferenciacion entre staging y produccion
* [x] No hay flags inconsistentes entre entornos (BrewBar: Debug usa `-Onone` y Release usa `-O`; TypeScript: mismo bundle en todos los entornos, sin flags divergentes)
* [x] La configuracion de testing no contamina produccion

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Target `brew-tui` (TUI TypeScript) | Conforme | — | `package.json`: `bin.brew-tui`, `main: ./build/index.js`, proposito CLI/TUI claro | — |
| Target `BrewBar` (Swift) | Conforme | — | `Project.swift:22-38`, `project.pbxproj`: un unico target `PBXNativeTarget "BrewBar"`, proposito menubar app claro | — |
| Scheme `BrewBar` (xcodeproj) | Conforme | — | `BrewBar.xcscheme`: Debug para Run/Test/Analyze, Release para Archive/Profile; alineado con los dos entornos existentes | — |
| Scheme `BrewBar-Workspace` (xcworkspace) | Conforme | — | `BrewBar-Workspace.xcscheme`: identico en estructura al anterior; `disableMainThreadChecker = "YES"` en TestAction de `BrewBar.xcscheme`, correcto para apps SwiftUI @main que no usan Main Thread Checker en tests | — |
| Scheme `Generate Project` — `customWorkingDirectory` hardcodeado | No conforme | Baja | `BrewBar.xcworkspace/xcshareddata/xcschemes/Generate Project.xcscheme:26`: `customWorkingDirectory = "/Volumes/SSD/Projects/Brew/menubar"` — ruta del desarrollador original; el proyecto real esta en `/Volumes/SSD/Projects/Brew-TUI/menubar` | Corregir el `customWorkingDirectory` al path relativo o al path correcto del proyecto; este scheme no se rastrea en git (xcworkspace es gitignored) por lo que es un problema solo en el entorno local del desarrollador actual |
| Ausencia de entorno Staging — TUI | No conforme | Media | `tsup.config.ts`: un unico bloque `defineConfig` sin variantes por entorno. `package.json` scripts: `dev` (tsx), `build` (tsup), sin `build:staging` ni `build:prod`. No hay variables de entorno diferenciadas en `release.yml` ni `publish.yml` | Definir al menos dos configs en `tsup.config.ts`: una para staging (con source maps, sin minificacion agresiva) y otra para production; o documentar explicitamente que el binario es identico en staging y production |
| Ausencia de entorno Staging — BrewBar | No conforme | Media | `Project.swift:17-20`: solo configuraciones `Debug` y `Release`; ninguna configuracion `Staging` o `Beta` | Para un producto con licencias de pago, agregar una configuracion `Staging` con `BUNDLE_ID` diferente permite testear el flujo de licencias sin afectar produccion; valorar si aplica segun la madurez del producto |
| Workflows CI/CD — `release.yml` y `publish.yml` duplican publicacion npm | No conforme | Alta | `release.yml:3-6`: trigger `push tags: v*`; `release.yml:77-90`: usa `softprops/action-gh-release@v2` que crea un GitHub Release; `publish.yml:3-5`: trigger `on release: published`; esto significa que un tag `v*` activa `release.yml` (que publica npm Y crea GitHub Release) lo que a su vez activa `publish.yml` (que vuelve a publicar npm) — doble publicacion que fallara la segunda vez con `409 Conflict` | Eliminar `publish.yml` completamente (sus responsabilidades estan cubiertas por `release.yml`) o cambiar su trigger para que solo se active manualmente; alternativamente agregar un check de version ya publicada |
| `release.yml` — Node.js version inconsistente entre jobs | No conforme | Baja | `release.yml:20`: job `publish-npm` usa `node-version: '18'`; `release.yml:38`: job `publish-github-packages` usa `node-version: '18'`; `publish.yml:15,31`: usa `node-version: '20'`; el proyecto declara `engines: { node: ">=18" }` por lo que ambas versiones son validas, pero la inconsistencia entre workflows introduce riesgo de diferencias de comportamiento | Fijar una version LTS unica (recomendado: 20 LTS) en todos los workflows para garantizar reproducibilidad |
| `release.yml` — build-brewbar sin firma de codigo | No conforme | Media | `release.yml:48-74`: el job `build-brewbar` construye y distribuye `BrewBar.app.zip` sin ninguna firma de codigo (`CODE_SIGN_IDENTITY = "-"` en Debug y Release del pbxproj). Cualquier usuario que descargue el zip recibira una app sin firmar que macOS Gatekeeper bloqueara por defecto | Configurar `CODE_SIGN_IDENTITY` con un Apple Developer certificate en CI (usando GitHub Secrets para el certificado y perfil), o documentar que el usuario debe ejecutar `xattr -cr BrewBar.app` para remover la cuarentena |
| `release.yml` — `publish-github-packages` modifica `package.json` en runtime | Parcial | Baja | `release.yml:35-42`: el job `publish-github-packages` usa un script `node -e` inline que reescribe `package.json` cambiando el nombre del paquete y agregando `publishConfig`. Esta mutacion runtime es fragil y puede fallar si el JSON se formatea de forma inesperada; ademas `npm publish --access public` en GitHub Packages con scope `@molinesgithub` puede requerir que el scope este configurado en `.npmrc` | Mover la configuracion de GitHub Packages a un `.npmrc` separado o usar `npm pkg set` (mas robusto que modificacion manual de JSON) |
| Licencia MIT vs. modelo freemium | No conforme | Alta | `LICENSE:1`: licencia MIT que permite a cualquier persona copiar, modificar, distribuir y sublicenciar el software sin restricciones; el codigo fuente del modelo de licencias Pro (`src/lib/license/`) esta incluido en el paquete npm distribuido bajo esta licencia MIT; cualquier usuario puede tomar el codigo, eliminar las verificaciones de licencia y redistribuirlo libremente | Cambiar la licencia a una que proteja el modelo freemium (por ejemplo: Commons Clause + MIT, o Business Source License 1.1 para la capa Pro), o mover el codigo Pro-gate a un modulo privado no incluido en el paquete npm publico |

---

## 2.2 Build settings

### Alcance

TypeScript: `tsconfig.json`, `tsup.config.ts`, `eslint.config.js`. Swift: `Project.swift`, `project.pbxproj` (configuraciones Debug y Release a nivel de proyecto y target).

### Checklist

* [x] Swift language version correcta — SWIFT_VERSION = 6.0 en Project.swift y pbxproj (Debug y Release)
* [ ] Strict concurrency activada segun politica del proyecto — **Media**: `SWIFT_STRICT_CONCURRENCY` ausente del proyecto; Swift 6 impone concurrencia estricta por defecto a nivel de compilacion pero la ausencia del flag explicito deja ambiguedad
* [x] Warnings relevantes tratados como errores donde proceda — pbxproj: multiples `GCC_WARN_*_ERROR`, `CLANG_WARN_*_ERROR`; TypeScript: ESLint configurado con `@typescript-eslint/no-unused-vars: warn`; no se tratan warnings como errores en TypeScript (solo warnings, no `error`)
* [x] Optimizacion de Release correcta — Release: `SWIFT_OPTIMIZATION_LEVEL = "-O"`, `SWIFT_COMPILATION_MODE = wholemodule`; Debug: `SWIFT_OPTIMIZATION_LEVEL = "-Onone"`, `GCC_OPTIMIZATION_LEVEL = 0`; TypeScript: `tsup` con `target: node18` sin `-Onone` equivalente
* [x] No hay linker flags heredados innecesarios — `OTHER_LDFLAGS = ("$(inherited)", "-L$(DT_TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)")` en ambas configuraciones; el flag `-L$(DT_TOOLCHAIN_DIR)/...` es el linker path para Swift stdlib, justificado para macOS 14 sin embedido de Swift runtime
* [x] No hay paths hardcodeados locales en build settings — pbxproj y Project.swift no contienen referencias absolutas a directorios locales de usuario (el path del scheme `Generate Project` es un scheme no build setting, analizado en 2.1)
* [x] Arquitecturas configuradas correctamente — pbxproj: `SDKROOT = macosx`, `ONLY_ACTIVE_ARCH = YES` en Debug (correcto), no presente en Release (correcto — compila para todas las archs); TypeScript: `tsup target: node18` sin limitacion de arquitectura (correcto para CLI cross-platform)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `SWIFT_VERSION = 6.0` | Conforme | — | `Project.swift:10`: `"SWIFT_VERSION": "6.0"`; `pbxproj:333,424`: `SWIFT_VERSION = 6.0;` en Release y Debug | — |
| `SWIFT_STRICT_CONCURRENCY` no declarado | No conforme | Media | El flag `SWIFT_STRICT_CONCURRENCY` no aparece en `Project.swift` ni en ninguna configuracion del `project.pbxproj`. Con Swift 6 el compilador ya aplica comprobaciones de concurrencia en el modo de compilacion, pero la ausencia del flag explicito significa que no se ha validado explicitamente este requisito y futuras versiones de Xcode podrian cambiar el comportamiento por defecto | Agregar `"SWIFT_STRICT_CONCURRENCY": "complete"` al bloque `base` de `Project.swift`; esto hace la politica explicita e invariante ante cambios de toolchain |
| `SWIFT_TREAT_WARNINGS_AS_ERRORS` no declarado (Swift) | Parcial | Baja | No presente en ninguna configuracion del pbxproj; los warnings de Swift (deprecaciones, unused variables) no produciran fallos de build. Los warnings de Clang/ObjC si se tratan como errores (`GCC_WARN_ABOUT_RETURN_TYPE = YES_ERROR`, etc.) | Valorar activar `SWIFT_TREAT_WARNINGS_AS_ERRORS = YES` al menos en Release para prevenir degradacion silenciosa |
| TypeScript ESLint — `no-unused-vars` como warning, no error | Parcial | Baja | `eslint.config.js:33`: `'@typescript-eslint/no-unused-vars': ['warn', ...]`; en `release.yml:25` el CI ejecuta `npm run lint` pero los warnings no fallan el build | Cambiar a `'error'` para que variables no usadas rompan el pipeline de CI; actualmente dead code puede acumularse silenciosamente |
| `tsconfig.json` — `skipLibCheck: true` | Parcial | Baja | `tsconfig.json:9`: `"skipLibCheck": true`; deshabilita la comprobacion de tipos en archivos `.d.ts` de dependencias, lo que puede ocultar incompatibilidades de tipos entre paquetes (especialmente relevante dada la mezcla de React 18 + Ink 5 + @inkjs/ui) | Aceptable como decision pragmatica dado el ecosistema; documentar como decision consciente en CLAUDE.md o comentario en tsconfig |
| `tsup.config.ts` — `sourcemap: true` en produccion | No conforme | Media | `tsup.config.ts:12`: `sourcemap: true` sin distincion entre entornos; el bundle npm publicado (`build/`) incluira archivos `.js.map` que exponen la estructura interna del codigo (incluyendo el modulo de licencias Pro, la logica anti-tamper, los canaries); cualquier usuario puede reconstruir el codigo fuente original desde el package npm instalado | Desactivar source maps en el bundle publico (`sourcemap: false`) o compilar con source maps internos (inline, sin emision de archivos) para el build de produccion; mantener source maps solo para el entorno de desarrollo |
| `tsconfig.json` — `declaration: true` y `declarationMap: true` | Parcial | Baja | `tsconfig.json:13-14`: genera archivos `.d.ts` y `.d.ts.map`; el `package.json:10-13` incluye el directorio `build/` en `files`, lo que publica estas declaraciones en npm; esto expone la API interna del modulo de licencias como tipos TypeScript | Si el paquete es solo una CLI (no una libreria), considerar excluir `build/*.d.ts` de los `files` en `package.json` o desactivar `declaration` para el bundle publico |
| Release optimization Swift — correcto | Conforme | — | `pbxproj:360`: `SWIFT_OPTIMIZATION_LEVEL = "-O"`, `SWIFT_COMPILATION_MODE = wholemodule` en Release; `DEAD_CODE_STRIPPING = YES` en ambas configuraciones; `ENABLE_NS_ASSERTIONS = NO` en Release | — |
| `ENABLE_USER_SCRIPT_SANDBOXING = YES` | Conforme | — | `Project.swift:14` y `pbxproj`: activo en Debug y Release; mejora la seguridad del proceso de build | — |

---

## 2.3 Info.plist, entitlements y capabilities

### Alcance

Esta seccion aplica unicamente a BrewBar (Swift). El codebase TypeScript no tiene Info.plist ni entitlements.

### Checklist

* [ ] Info.plist minimo y coherente — **Baja**: el plist generado por Tuist contiene `NSMainStoryboardFile` y `NSPrincipalClass = NSApplication` que son claves de ciclo de vida AppKit legacy, incoherentes con la arquitectura SwiftUI `@main` real del proyecto
* [x] Permisos del sistema justificados — no hay claves `NS*UsageDescription`; el unico permiso solicitado en runtime es `UNUserNotificationCenter.requestAuthorization` (notificaciones), que macOS gestiona directamente sin clave en Info.plist
* [x] Entitlements minimos necesarios — no existe archivo `.entitlements`; no se activan entitlements adicionales mas alla de los defaults del sandboxing
* [x] Capabilities activadas solo si se usan — `CODE_SIGN_IDENTITY = "-"` (sin firma); sin App Groups, sin iCloud, sin Push Notifications (APNs), sin HealthKit; las unicas capabilities en uso son las que no requieren entitlements: `UNUserNotificationCenter` y `SMAppService` (ambas correctas sin entitlements para app macOS standalone)
* [x] Universal Links / Associated Domains — No aplica; no hay configuracion de Associated Domains ni `applinks:`
* [x] App Groups — No aplica; no hay uso de `UserDefaults(suiteName:)` ni `containerURL(forSecurityApplicationGroupIdentifier:)`
* [x] Keychain Sharing — No aplica; no hay uso de `kSecAttrAccessGroup` en el codigo Swift
* [x] Background modes — No aplica formalmente; `SchedulerService` usa timers en proceso (no background task BGTaskScheduler); la app es LSUIElement (menubar) lo que mantiene el proceso activo, no requiere Background Modes capability

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Info.plist — `NSMainStoryboardFile: Main` | No conforme | Baja | `menubar/Derived/InfoPlists/BrewBar-Info.plist:31-32`: `NSMainStoryboardFile = Main`; la app usa SwiftUI `@main` (`BrewBarApp.swift:3`) con `@NSApplicationDelegateAdaptor` — no hay ningun storyboard `Main.storyboard` en el proyecto; esta clave es un artefacto del template Tuist y nunca se usa, pero puede causar confusion | Eliminar `NSMainStoryboardFile` del bloque `infoPlist` en `Project.swift` (o agregar `"NSMainStoryboardFile": .none` para anularlo explicitamente) |
| Info.plist — `NSPrincipalClass: NSApplication` | Parcial | Baja | `menubar/Derived/InfoPlists/BrewBar-Info.plist:34-35`: `NSPrincipalClass = NSApplication`; con SwiftUI `@main` este valor es sobreescrito por el sistema (`NSApplication` es el valor correcto para apps macOS sin UI propia), pero no esta declarado explicitamente en `Project.swift` (viene del template Tuist) | Declarar explicitamente `"NSPrincipalClass": "NSApplication"` en `Project.swift` para documentar la decision; actualmente es correcto por efecto del template pero no es intencional |
| Info.plist — `CFBundleShortVersionString: 1.0` hardcodeada | No conforme | Media | `menubar/Derived/InfoPlists/BrewBar-Info.plist:23`: `CFBundleShortVersionString = 1.0`; `CFBundleVersion = 1`; estas versiones son estaticas y no se actualizan automaticamente en el CI (`release.yml`); el job `build-brewbar` no inyecta la version del tag de release en el Info.plist | Configurar el job CI para pasar la version del tag git como `MARKETING_VERSION` al comando `xcodebuild` o inyectarla en el Info.plist antes del build; alternativamente usar `CURRENT_PROJECT_VERSION = $(CURRENT_PROJECT_VERSION)` dinamico |
| Entitlements — ausencia de archivo `.entitlements` | Conforme | — | No se encontro ningun archivo `.entitlements` bajo `menubar/`; `CODE_SIGN_IDENTITY = "-"` confirma ausencia de firma que requiera entitlements; las capabilities usadas (UNUserNotificationCenter, SMAppService) no requieren entitlements para apps macOS firmadas con ad-hoc o sin firma | — |
| Permisos — `UNUserNotificationCenter.requestAuthorization` | Conforme | — | `SchedulerService.swift:117`: solicita autorizacion en runtime; no requiere clave `NSUserNotificationUsageDescription` en macOS (solo en iOS); la solicitud es contextual (triggered by user enabling notifications in SettingsView) | — |
| `SMAppService.mainApp` (launch at login) | Conforme | — | `SettingsView.swift:7,47,49`: usa `SMAppService` de ServiceManagement framework; esta API moderna no requiere entitlements adicionales para app principal; correcto para macOS 13+ | — |
| `LSUIElement = true` | Conforme | — | `Project.swift:30`: `LSUIElement: true`; elimina el icono del Dock para app menubar; coherente con la arquitectura de la app | — |

---

## 2.4 Gestion de entornos y secretos

### Alcance

Ambos codebases. Incluye: secretos hardcodeados, variables por entorno, `.gitignore`, archivos de configuracion local, feature flags, y fallbacks.

### Checklist

* [ ] Secrets fuera del codigo fuente — **Critica**: la clave de cifrado AES-256-GCM derivada del sistema de licencias esta embebida como hex literal en `LicenseChecker.swift`; ademas la clave de derivacion (`ENCRYPTION_SECRET`, `SCRYPT_SALT`) esta en texto plano en `license-manager.ts`; el `POLAR_ORGANIZATION_ID` esta hardcodeado en `polar-api.ts`
* [ ] Variables por entorno bien separadas — **Media**: no existen archivos `.xcconfig` ni configuraciones de entorno por variable; el unico mecanismo de configuracion por entorno en TypeScript es `process.env.APP_VERSION` inyectado en build time
* [x] Configuracion local no filtrada al repo — `.gitignore` excluye correctamente `node_modules/`, `build/`, `.env*`, `*.xcworkspace`, `*.xcodeproj`, `menubar/Derived/`, `menubar/DerivedData/`; `package-lock.json` si esta commiteado (correcto)
* [x] Feature flags auditados — no existe sistema de feature flags (LaunchDarkly, Firebase Remote Config, ni custom); las unicas "flags" son la verificacion Pro que es codigo, no configuracion externa
* [ ] Fallbacks seguros cuando falta configuracion — **Media**: en TypeScript, `POLAR_ORGANIZATION_ID` es una constante hardcodeada (no leida de entorno), por lo que no puede faltar — pero si el valor es incorrecto no hay fallback de error claro; en Swift, `LicenseChecker.checkLicense()` retorna `.notFound` si el archivo de licencia no existe (correcto fallback)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Clave AES-256-GCM hardcodeada en Swift — `LicenseChecker.swift` | No conforme | Critica | `menubar/BrewBar/Sources/Services/LicenseChecker.swift:47`: `let hex = "5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126"`; esta es la clave derivada pre-computada del sistema de cifrado de licencias Pro; el propio comentario en linea 43-45 del archivo reconoce que ofrece "the same security level as embedding the secret string itself"; cualquier persona con acceso al binario compilado puede extraer esta clave con strings(1) o un debugger y descifrar el archivo `~/.brew-tui/license.json` directamente, sin necesidad de interactuar con el servidor de licencias | La unica mitigacion real es que la verificacion de licencia sea server-side con tokens de corta duracion. A corto plazo: rotar la clave, mover la derivacion al servidor (el cliente recibe un token opaco, no una clave de cifrado permanente); a largo plazo: redisenar el sistema de licencias para que el archivo local sea unicamente un cache del token del servidor, verificado con firma ECDSA del servidor (no con cifrado simetrico de clave local) |
| Clave de derivacion AES hardcodeada en TypeScript — `license-manager.ts` | No conforme | Alta | `src/lib/license/license-manager.ts:60-61`: `const ENCRYPTION_SECRET = 'brew-tui-license-aes256gcm-v1'`; `const SCRYPT_SALT = 'brew-tui-salt-v1'`; estas constantes son identicas a las usadas para derivar la clave Swift; estan en el bundle npm publico distribuido via GitHub y npmjs.com; cualquier usuario puede instalar el paquete y leer el codigo fuente (o el bundle compilado con source maps) para obtener estas constantes. Agravante: `tsup.config.ts:12` activa `sourcemap: true` lo que incluye mapas fuente en el bundle | Misma solucion arquitectural que el punto anterior; a corto plazo, al menos retirar los source maps del bundle publico para dificultar la extraccion |
| `POLAR_ORGANIZATION_ID` hardcodeado en TypeScript | Parcial | Baja | `src/lib/license/polar-api.ts:8`: `export const POLAR_ORGANIZATION_ID = 'b8f245c0-d116-4457-92fb-1bda47139f82'`; este ID no es un secreto en el sentido estricto (no otorga acceso privilegiado); por diseño de la API de Polar los organization IDs son identificadores publicos que aparecen en las URLs y respuestas de la API; si bien es preferible externalizarlo a una variable de entorno, su presencia en el codigo no representa un riesgo de seguridad real | Mover a variable de entorno `process.env.POLAR_ORG_ID` con validacion al arranque; si el valor debe ser publico (por diseño de la API), documentar explicitamente esa decision |
| `.gitignore` — ausencia de patrones para secretos Swift/Tuist | No conforme | Media | `.gitignore` (16 lineas) no incluye patrones para: `*.p12`, `*.cer`, `*.mobileprovision`, `ExportOptions.plist`, archivos de signing certificates; si en el futuro se agregan certificados de firma o perfiles de provision para el CI, no existira proteccion por defecto | Agregar al `.gitignore`: `*.p12`, `*.cer`, `*.mobileprovision`, `ExportOptions.plist`, `AuthKey_*.p8` |
| `.gitignore` — `menubar/BrewBar.xcodeproj` gitignored pero el proyecto existe en disco | Parcial | Baja | `.gitignore:13`: `*.xcodeproj` ignora `menubar/BrewBar.xcodeproj`; sin embargo el proyecto Xcode si existe en disco (generado por Tuist), lo que significa que cualquier colaborador que clone el repo necesita ejecutar `tuist generate` para poder abrir el proyecto. El `README.md` o `CLAUDE.md` deberian documentar este prerequisito claramente | Verificar que el `CLAUDE.md` y `README.md` documenten el prerequisito `tuist generate`; agregar un script `npm run setup-swift` que ejecute `cd menubar && tuist generate` automaticamente |
| Feature flags — ausencia de sistema externo | Conforme | — | No se encontro uso de LaunchDarkly, Firebase Remote Config ni sistema custom de feature flags; las unicas "flags" son el gate Pro implementado en codigo. Para un producto en esta etapa esto es aceptable | — |
| Fallback de licencia — TypeScript | Conforme | — | `src/lib/license/license-manager.ts:104-127`: `loadLicense()` retorna `null` en todos los casos de error (archivo no encontrado, JSON invalido, descifrado fallido); `src/app.tsx` gestiona el estado `null` como usuario free | — |
| Fallback de licencia — Swift | Conforme | — | `LicenseChecker.swift:57-79`: `checkLicense()` retorna `.notFound` si el archivo no existe o el JSON es invalido; `.expired` si la validacion de fecha falla; no hay force-unwrap peligroso en el flujo | — |
| Secretos en CI/CD — correctos | Conforme | — | `release.yml:28,45`: `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` y `GITHUB_TOKEN` usados via GitHub Secrets; no hay credenciales hardcodeadas en los workflows | — |
| Licencia `~/.brew-tui/license.json` fuera del repo | Conforme | — | El archivo de licencia se almacena en `~/.brew-tui/` (HOME del usuario), fuera del directorio del proyecto; nunca puede ser commiteado accidentalmente | — |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| Critica | 1 |
| Alta | 3 |
| Media | 7 |
| Baja | 11 |

**Total hallazgos no conformes o parciales:** 22

### Hallazgos criticos y altos — lista rapida

1. **[Critica]** Clave AES-256-GCM hardcodeada en `LicenseChecker.swift:47` — compromete el sistema de proteccion de licencias Pro en BrewBar
2. **[Alta]** Clave de derivacion AES hardcodeada en `license-manager.ts:60-61` + source maps en bundle publico npm — facilita extraccion de secretos del TUI
3. **[Alta]** Licencia MIT incompatible con modelo freemium — el codigo fuente de la proteccion Pro es libremente redistribuible y modificable bajo los terminos de la licencia actual
4. **[Alta]** Workflows CI/CD duplican publicacion npm — `release.yml` crea un GitHub Release que activa `publish.yml`, resultando en un segundo intento de publicacion que fallara con 409 Conflict en cada release
