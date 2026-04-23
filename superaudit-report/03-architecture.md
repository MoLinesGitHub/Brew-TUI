# 3. Arquitectura y limites del sistema

> Auditor: architecture-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

Brew-TUI tiene una arquitectura bien estratificada para ser un proyecto TUI de tamano mediano. El patron Views → Stores (Zustand) → brew-api → Parsers → brew-cli esta claramente implementado y se respeta en casi todos los modulos, con violaciones de capa directas en `OutdatedView` y `ProfilesView`. El codebase Swift (BrewBar) tambien mantiene una separacion correcta entre modelos, servicios y vistas, con una arquitectura @Observable/@MainActor coherente. La deuda estructural principal es moderada: algunos modulos del lado TypeScript en la capa `lib/license/` importan directamente `useLicenseStore` desde la capa `stores/`, la licencia hardcodea la clave derivada en BrewBar, y el modulo `AppState.swift` importa SwiftUI en la capa de modelo. No hay god objects, todos los archivos estan por debajo de 350 lineas, y la cohesion por modulo es alta.

---

## 3.1 Composicion global

### Checklist

* [x] Existe composition root claro
* [x] La inicializacion global esta centralizada
* [ ] No hay inicializacion de servicios dispersa en vistas — **Baja**: `SearchView` importa `* as api` de `brew-api` y llama `api.search()` directamente
* [x] La navegacion tiene modelo definido
* [x] La DI es explicita y predecible

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Composition root TypeScript | Conforme | — | `src/index.tsx` arranca el CLI y renderiza `<App />`. `src/app.tsx` es el router central con gate Pro. Cada store Zustand se inicializa de forma lazy en el primer acceso, sin disperion de estado. | — |
| Composition root Swift | Conforme | — | `BrewBarApp.swift` declara `@main` + `@NSApplicationDelegateAdaptor`. `AppDelegate.swift` centraliza toda la inicializacion: `AppState`, `SchedulerService`, `LicenseChecker`, `statusItem`, `popover`. | — |
| Inicializacion global TypeScript | Conforme | — | `src/app.tsx:28` llama `initLicense()` en un `useEffect` sin dependencias. `fetchAll()` se llama desde `DashboardView` al montar. Los stores Zustand se configuran a nivel modulo, no dentro de vistas. | — |
| Inicializacion global Swift | Conforme | — | `AppDelegate.applicationDidFinishLaunching` coordina todo el arranque en un `Task` unico con guard clauses para dependencias faltantes. | — |
| `SearchView` llama `api.search()` directo | No conforme | Baja | `src/views/search.tsx:12`: `import * as api from '../lib/brew-api.js'` y `src/views/search.tsx:41`: `api.search(term)`. Es la unica vista que bypassa el store para una operacion de lectura. | Crear `searchPackages(term)` en `brew-store.ts` o en un store dedicado `search-store.ts`, y mover la llamada alli. |
| Modelo de navegacion TypeScript | Conforme | — | `src/stores/navigation-store.ts`: `VIEWS`, `navigate()`, `goBack()`, `selectPackage()`. El router en `src/app.tsx` es un switch simple y claro. Keyboard en `src/hooks/use-keyboard.ts`. | — |
| DI TypeScript | Conforme | — | Los stores Zustand se acceden directamente mediante hooks tipados. No hay singletons globales ni Context de React. Las dependencias entre modulos son explicitas via imports. | — |
| DI Swift | Conforme | — | `AppState` y `SchedulerService` se crean en `AppDelegate` y se pasan explicitamente a `PopoverView(appState:scheduler:)`. No hay singletons de acceso implicito. `LicenseChecker` usa solo static methods, acceptable para una utilidad sin estado. | — |

---

## 3.2 Separacion por capas

### Checklist

* [x] UI no conoce detalles de persistencia
* [ ] UI no conoce detalles de red — **Baja**: `SearchView` llama `brew-api` directamente (CLI, no red pura, pero es infra)
* [x] Domain no depende de UI
* [x] Data implementa contratos del dominio
* [ ] Shared/Core no se convierte en cajon desastre — **Baja**: `src/lib/` raiz mezcla tipos de dominio con utilidades de infra
* [x] No hay dependencias ciclicas

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| UI no accede persistencia directamente | Conforme | — | Ninguna vista importa `readFile`, `writeFile`, ni llama a history/profiles/license directamente. Toda escritura de disco pasa por stores o lib managers. | — |
| `OutdatedView` importa `execBrew` | No conforme | Media | `src/views/outdated.tsx:5`: `import { execBrew } from '../lib/brew-cli.js'` y `src/views/outdated.tsx:54`: `void execBrew([pkg.pinned ? 'unpin' : 'pin', pkg.name])`. Una vista llama directamente a la primitiva CLI para la accion pin/unpin, saltandose el store y el api layer. | Agregar `pinPackage(name, pinned)` en `brew-api.ts` y `togglePinPackage(name)` en `brew-store.ts`, y reemplazar la llamada directa. |
| `ProfilesView` llama `profile-manager` directamente | No conforme | Baja | `src/views/profiles.tsx:12`: `import * as manager from '../lib/profiles/profile-manager.js'`. En `startImport()` (lineas 91-92) la vista llama `manager.loadProfile(name)` y `manager.importProfile(profile)` directamente, saltandose `useProfileStore`. El store ya expone `loadProfile` como accion, pero para la operacion de import la vista gestiona el generator y el ciclo de vida del refRef manualmente. El manejo de errores y la cancelacion con `mountedRef` son correctos, pero el bypass rompe la consistencia del patron capa-store. | Mover la logica de import (iterator, `mountedRef`, lineas streaming) a una accion del store `importProfile(name)` que exponga un `ReadableStream` o un callback de progreso, alineando el patron con las demas acciones del store. |
| Domain no depende de UI | Conforme | — | Todos los modulos en `src/lib/` importan solo Node.js core, otros modulos de `lib/`, e `i18n`. Ningun archivo en `src/lib/` importa `ink`, `react`, ni ninguna vista. | — |
| `AppState.swift` importa SwiftUI | No conforme | Baja | `menubar/BrewBar/Sources/Models/AppState.swift:2`: `import SwiftUI`. El import es innecesario: `AppState` es un modelo `@Observable` y no necesita SwiftUI para eso en Swift 5.9+. | Eliminar `import SwiftUI`; `@Observable` esta en el modulo `Observation`, disponible sin SwiftUI en Swift 5.9+. |
| `lib/license/pro-guard.ts` importa `stores/` | No conforme | Media | `src/lib/license/pro-guard.ts:1`: `import { useLicenseStore } from '../../stores/license-store.js'`. La capa `lib/` importa la capa `stores/`. Esto invierte la dependencia esperada (stores → lib), creando una dependencia ciclica potencial y acoplando logica de dominio al estado de presentacion. Lo mismo ocurre en `anti-tamper.ts:1` y `watermark.ts:1`. | Refactorizar `verifyPro()` para que acepte el estado de licencia como parametro (`verifyPro(status, license)`) en lugar de acceder al store directamente. Alternativa: usar una funcion de callback registrada al iniciar el store. |
| `lib/license/license-manager.ts` importa `i18n` | Parcial | Baja | `src/lib/license/license-manager.ts:5`: `import { t } from '../../i18n/index.js'`. Los managers de dominio deberian lanzar errores en ingles y dejar la traduc cion a la capa de presentacion. | Reemplazar los usos de `t()` en `license-manager.ts` por mensajes de error en ingles; traducir en la capa de vista o en `license-store.ts`. |
| Contratos del dominio en Data | Conforme | — | Los parsers (`json-parser.ts`, `text-parser.ts`) implementan contratos definidos por los tipos en `src/lib/types.ts`. Las interfaces `Formula`, `Cask`, `OutdatedPackage`, etc. son el contrato del dominio. | — |
| `src/lib/` raiz como cajon | Parcial | Baja | `src/lib/` raiz contiene cinco archivos: `types.ts` (tipos de dominio), `brew-api.ts` (capa API), `brew-cli.ts` (primitivas CLI), `data-dir.ts` (infra de filesystem), `brewbar-installer.ts` (infra de instalacion). La mezcla entre contrato de dominio, API de alto nivel y utilidades de infra es moderada pero controlable para el tamano actual del proyecto. | Considerar mover `data-dir.ts` y `brewbar-installer.ts` a `src/lib/infra/` cuando el proyecto crezca, para separar claramente la infra del contrato de dominio. |
| Dependencias ciclicas | Conforme | — | El ciclo `pro-guard → license-store → license-manager → pro-guard` no existe directamente porque `license-store` importa `license-manager` pero `license-manager` NO importa `license-store`. Sin embargo, `pro-guard` accede al store en runtime, lo que crea un acoplamiento logico (no un ciclo de importacion estatico). | Ver hallazgo de `pro-guard` arriba. |

---

## 3.3 Cohesion y acoplamiento

### Checklist

* [x] Cada modulo tiene responsabilidad clara
* [x] No hay god objects
* [x] No hay view models con demasiadas responsabilidades
* [ ] No hay servicios transversales con logica de negocio escondida — **Media**: el modulo de licencia (`pro-guard`, `anti-tamper`, `canary`, `integrity`) concentra logica tecnica no trivial con obfuscacion
* [x] Las features son componibles

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Responsabilidades por modulo | Conforme | — | Cada directorio tiene un objetivo claro: `views/` (render + input), `stores/` (estado reactivo), `lib/brew-*` (CLI infra), `lib/parsers/` (parsing), `lib/license/` (licencias), `lib/security/` (CVE scanning), `lib/cleanup/` (orphan analysis), `lib/history/` (registro de acciones), `lib/profiles/` (perfiles de configuracion), `i18n/` (traducciones). | — |
| Ausencia de god objects | Conforme | — | El archivo mas grande es `src/i18n/en.ts` (333 lineas, solo datos de traduccion) y `src/i18n/es.ts` (333 lineas). El archivo de logica mas grande es `src/lib/license/license-manager.ts` (262 lineas). Ningun archivo supera 500 lineas. | — |
| Stores Zustand: responsabilidades | Conforme | — | `brew-store.ts` (173 lineas): gestiona datos de Homebrew. `license-store.ts` (113 lineas): gestiona estado de licencia. `navigation-store.ts` (58 lineas): gestiona navegacion. `profile-store.ts` (69 lineas): gestiona perfiles. `cleanup-store.ts`, `security-store.ts`, `history-store.ts`, `modal-store.ts`: cada uno con responsabilidad unica. Ninguno supera 15 propiedades o 20 metodos publicos. | — |
| Logica de negocio en `pro-guard.ts` | No conforme | Media | `src/lib/license/pro-guard.ts` implementa: obfuscacion de strings (lineas 11-12), verificacion multinivel con anti-debug, integridad de bundle, verificacion de canaries, comprobacion de degradacion. La tecnica de obfuscacion (`String.fromCharCode`) es trivialmente reversible en JS y no aporta seguridad real mientras aumenta la deuda de mantenibilidad. Ademas, `anti-tamper.ts` captura referencias a funciones del store en tiempo de carga del modulo, lo que puede causar problemas en entornos de test. | Documentar explicitamente que esta obfuscacion es "security theater" en un binario JS distribuido. Si se mantiene, aislarla en un modulo separado con una interfaz limpia. Considerar eliminar la obfuscacion de strings ya que no provee seguridad real. |
| Canaries logica | Parcial | Baja | `src/lib/license/canary.ts`: las tres funciones `isProUnlocked`, `hasProAccess`, `isLicenseValid` siempre devuelven `false`. El objetivo es la trampa, pero el codigo es confuso y dificulta la lectura. La variable `_canaryTripped` nunca se usa para nada fuera del modulo. | Documentar claramente en comentarios de que se trata la tecnica. La logica es correcta pero requiere contexto para cualquier mantenedor. |
| Features componibles | Conforme | — | Las features Pro (profiles, cleanup, history, security-audit) son independientes entre si. `CleanupStore` reutiliza `useBrewStore.getState()` para obtener datos de formulae, lo que es composicion correcta entre stores. | — |

---

## 3.4 Deuda estructural

### Checklist

* [x] Codigo muerto identificado
* [x] Extensiones utilitarias justificadas
* [ ] Helpers sin semantica reducidos o eliminados — **Baja**: `useBrewCommand` hook no se usa en ninguna vista
* [x] Nombres alineados con el dominio
* [ ] No hay duplicacion estructural relevante — **Baja**: patron loading/error/success duplicado manualmente en 8+ vistas

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `useBrewCommand` hook sin usar | No conforme | Baja | `src/hooks/use-brew-command.ts`: hook generico `useBrewCommand<T>` que envuelve `execBrew`. No hay ninguna vista ni componente que lo importe. El patron identico existe en los stores Zustand. | Eliminar el archivo o documentarlo como placeholder para uso futuro. |
| `useDebounce` bien justificado | Conforme | — | `src/hooks/use-debounce.ts`: usado en `installed.tsx` y `history.tsx` para debounce de filtros de busqueda. | — |
| Patron loading/error duplicado | No conforme | Baja | En 8 vistas (`dashboard.tsx`, `installed.tsx`, `outdated.tsx`, `services.tsx`, `doctor.tsx`, `smart-cleanup.tsx`, `history.tsx`, `security-audit.tsx`) el patron `if (loading.X) return <Loading />;` + `if (errors.X) return <ErrorMessage />` se repite identicamente. | Extraer un HOC o un hook `useViewState(key)` que retorne el estado tipado `{ status: 'loading' | 'error' | 'ready', error? }`. |
| `src/utils/` limitado y cohesivo | Conforme | — | Solo dos archivos: `format.ts` (formateo de bytes, tiempo relativo, truncate) y `gradient.tsx` (componente + paletas de gradiente). Ambos tienen responsabilidades claras. | — |
| Nombres alineados con dominio | Conforme | — | `PackageListItem`, `BrewService`, `OutdatedPackage`, `CleanupCandidate`, `HistoryEntry`, `Profile`, `LicenseData` — todos los nombres reflejan conceptos del dominio Homebrew/SaaS, no detalles de implementacion. | — |
| `LemonSqueezyActivateResponse` / `LemonSqueezyValidateResponse` en `types.ts` | Parcial | Baja | `src/lib/license/types.ts:23-49`: los tipos `LemonSqueezyActivateResponse` y `LemonSqueezyValidateResponse` son contratos del proveedor externo (ahora Polar, no LemonSqueezy), pero el nombre aun referencia la plataforma anterior. | Renombrar a `PolarActivateResponse` / `PolarValidateResponse` para alinear con la implementacion real en `polar-api.ts`. |

### Matriz de dependencias

| Modulo | Depende de | Permitido? | Riesgo | Accion |
|--------|------------|------------|--------|--------|
| `src/views/*` | `stores/`, `components/`, `lib/brew-api`, `i18n/`, `utils/` | Si | — | — |
| `src/views/outdated.tsx` | `lib/brew-cli` (directo) | No | Bypassa la capa API/store | Agregar `togglePin` a `brew-api` y `brew-store` |
| `src/views/search.tsx` | `lib/brew-api` (directo) | Parcial | Bypassa el store; accepta para llamadas sin estado | Mover `search()` a un store o hook dedicado |
| `src/views/profiles.tsx` | `lib/profiles/profile-manager` (directo) | No | Bypassa `profile-store` para operacion de import | Mover logica de streaming import al store |
| `src/stores/*` | `lib/*`, `i18n/` | Si | — | — |
| `src/lib/license/pro-guard.ts` | `stores/license-store` | No | Capa lib depende de stores (inversion) | Refactorizar a parametros o callback |
| `src/lib/license/anti-tamper.ts` | `stores/license-store` | No | Igual que pro-guard | Igual que pro-guard |
| `src/lib/license/watermark.ts` | `stores/license-store` | No | Igual | Igual |
| `src/lib/license/license-manager.ts` | `i18n/` | Parcial | Dominio con strings localizados | Eliminar traducciones del manager |
| `src/lib/profiles/profile-manager.ts` | `i18n/` | Parcial | Generator yielding i18n strings | Aceptable si se documenta como intencion |
| `src/lib/cleanup/cleanup-analyzer.ts` | `src/utils/format.ts` | Parcial | lib → utils, aceptable | — |
| `src/hooks/*` | `stores/`, `lib/brew-cli` | Si | — | — |
| `menubar/Services/*` | Foundation only | Si | — | — |
| `menubar/Models/AppState.swift` | SwiftUI (innecesario) | No | Dependencia UI en capa de modelo | Eliminar `import SwiftUI` |
| `menubar/Views/*` | AppState, SchedulerService | Si | DI explicita via parametros | — |
| `menubar/App/AppDelegate.swift` | Todos los modulos Swift | Si | Es el composition root | — |

---

# 4. Estado, concurrencia y flujo de datos

> Auditor: architecture-auditor | Fecha: 2026-04-22

## 4.1 Ownership del estado

### Checklist

* [x] Cada fuente de verdad esta claramente definida
* [ ] No hay duplicacion de estado — **Media**: `PackageInfoView` mantiene `formula` local mientras `brew-store` tiene los mismos datos
* [x] `@State` solo para estado local de vista (Swift) / `useState` solo para estado local (TS)
* [x] `@Binding` usado solo para proyeccion controlada
* [x] `@StateObject` en propietarios reales (no aplica — usa `@Observable`)
* [x] `@ObservedObject` no recrea ownership accidental (no aplica — usa `@Observable`)
* [ ] `@EnvironmentObject` no introduce dependencias invisibles peligrosas — No aplica (no se usa `@EnvironmentObject`)
* [x] `@Observable` usado con criterio arquitectonico

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Fuentes de verdad TypeScript | Conforme | — | `brew-store.ts`: formulae, casks, outdated, services, config, leaves. `license-store.ts`: status, license, degradation. `navigation-store.ts`: currentView, selectedPackage, viewHistory. `profile-store.ts`, `cleanup-store.ts`, `security-store.ts`, `history-store.ts`: cada uno con su dominio. `modal-store.ts`: contador de modales. Cada dato tiene exactamente un store propietario. | — |
| `PackageInfoView` duplica estado de formula | No conforme | Media | `src/views/package-info.tsx:32-33`: `const [formula, setFormula] = useState<Formula | null>(null)` + `const [loading, setLoading] = useState(true)`. La vista carga y almacena la formula localmente con `api.getFormulaInfo()`, mientras `brew-store` ya tiene los datos de formulae. Hay dos fuentes para el mismo dato con ciclos de vida distintos. | Agregar `selectedFormulaDetails: Formula | null` a `brew-store.ts` y una accion `fetchFormulaDetails(name)`. La vista lee del store en lugar de hacer la llamada directa. Alternativa menos invasiva: el estado local esta bien documentado, pero debe sincronizarse cuando el brew-store actualice los datos. |
| `useState` en vistas para estado verdaderamente local | Conforme | — | Los `useState` en las vistas son: `cursor` (posicion de lista), `filter` (texto de busqueda local), `tab` (tab activo), `confirmAction` (estado de dialogo de confirmacion), `mode` (sub-modo de vista). Todos son estados efimeros de UI sin necesidad de persistir en un store. | — |
| `@Observable` + `@MainActor` en BrewBar | Conforme | — | `AppState` y `SchedulerService` son `@Observable @MainActor`. Las vistas leen propiedades observadas sin wrappers adicionales. `PreviewData.makeAppState()` es `@MainActor`. El ownership es claro: `AppDelegate` crea y posee ambos objetos. | — |
| `SettingsView` accede a `SchedulerService` via parametro | Conforme | — | `menubar/BrewBar/Sources/Views/SettingsView.swift:3`: `let scheduler: SchedulerService`. No hay acceso implicito via environment. El `Binding` customizado en las lineas 16-28 y 25-34 proyecta correctamente los valores del scheduler. | — |
| `launchAtLogin` en `SettingsView` | Parcial | Baja | `menubar/BrewBar/Sources/Views/SettingsView.swift:7`: `@State private var launchAtLogin = SMAppService.mainApp.status == .enabled`. Este `@State` se inicializa una sola vez al crear la vista y no se sincroniza si el estado cambia externamente. Si el usuario habilita login-at-launch desde otra app y luego abre Settings, el toggle mostrara el estado desactualizado. | Sincronizar con `.task { launchAtLogin = SMAppService.mainApp.status == .enabled }` al aparecer la vista. |
| `_revalidating` module-level flag | Parcial | Media | `src/stores/license-store.ts:11`: `let _revalidating = false` declarado a nivel de modulo. Esta variable no es reactiva y su acceso desde el closure del `setInterval` (linea 71) y desde `initialize()` no esta coordinado con ninguna primitiva de sincronizacion. En el contexto de Node.js single-threaded es seguro, pero la variable sobrevive entre reinicios de la aplicacion si el modulo no se descarga (por ejemplo en tests). | Documentar explicitamente que solo es seguro en entorno single-threaded. En tests, resetear el modulo entre suites. |

---

## 4.2 Concurrencia

### Checklist

* [x] Aislamiento de actores definido (Swift: `@MainActor` correcto; TypeScript: single-threaded, sin actores)
* [ ] `@MainActor` usado solo donde corresponde — **Baja**: `SchedulerService` es `@MainActor` pero ejecuta lógica de scheduling y notificaciones
* [x] No hay trabajo pesado en main thread
* [ ] `Task` cancelables y con ciclo de vida claro — **Media**: multiples `Task { }` fire-and-forget en vistas SwiftUI
* [ ] No hay fire-and-forget sin control — **Media**: idem
* [x] Errores async propagados correctamente
* [ ] Reentrancy revisada — **Media**: `AppState.refresh()` tiene guard, pero `upgrade` + `refresh` en secuencia es reentrable
* [x] Race conditions analizadas
* [x] Sendable revisado en tipos compartidos

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `Task { }` fire-and-forget en vistas SwiftUI | No conforme | Media | `menubar/.../PopoverView.swift:54`: `Task { await appState.refresh() }` en `Button`. `menubar/.../OutdatedListView.swift:14`: `Task { await appState.upgradeAll() }`. Lineas 63, 85, 31 en sus respectivos archivos. Estas tasks no tienen handle para cancelacion ni estan ligadas al ciclo de vida de la vista. Si la vista se desmonta durante la operacion, la task continua y puede modificar `AppState` huerfano. | Capturar el handle en una variable `@State private var task: Task<Void, Never>?` y cancelarlo en `.onDisappear`. Alternativamente, usar `.task { ... }` modifier que cancela automaticamente. |
| `SchedulerService` es `@MainActor` innecesariamente | No conforme | Baja | `menubar/.../SchedulerService.swift:4-5`: `@MainActor @Observable final class SchedulerService`. El servicio gestiona timers y notificaciones, operaciones que no son exclusivamente UI. Estar en `@MainActor` significa que `check()`, `syncNotificationPermission()`, y `sendNotification()` bloquean el hilo principal durante su ejecucion. En la practica, estas operaciones son rapidas, pero el diseño no es correcto. | Considerar mover `@MainActor` solo a las propiedades observadas (`interval`, `notificationsEnabled`, `notificationsDenied`) usando `nonisolated` en los metodos de scheduling, o mover el servicio a un actor propio. |
| `AppDelegate.launchTask` sin cancelacion en error paths | Parcial | Baja | `menubar/.../AppDelegate.swift:15`: `launchTask = Task { ... }`. El task se cancela correctamente en `applicationWillTerminate`. Sin embargo, si `setupStatusItem()` o `setupPopover()` lanzaran (son metodos privados que no lanzan ahora), el `launchTask` se quedaria pendiente. La implementacion actual es correcta, pero fragil. | Documenting the cancellation contract. Mantener `applicationWillTerminate` como esta. |
| `BrewChecker.run()` con `OnceGuard` | Conforme | — | `menubar/.../BrewChecker.swift:27-44`: el patron `OnceGuard` garantiza que la continuation solo se resuma una vez, incluso si tanto el `terminationHandler` como el timeout disparan simultaneamente. Correcto. | — |
| Timeout con `DispatchQueue.global().asyncAfter` | Parcial | Media | `menubar/.../BrewChecker.swift:78-83`: el timeout usa `DispatchQueue.global().asyncAfter` que no es concurrency-aware. Podria haber una carrera entre el `terminationHandler` y el timeout si el proceso termina exactamente cuando el timeout dispara. El `OnceGuard` previene el doble-resume, pero `process.terminate()` se llama aunque el proceso ya termino, lo cual es inofensivo pero impreciso. | El patron `OnceGuard` lo protege. Considerar reemplazar por `withCheckedThrowingContinuation` con un `Task` de timeout cancelable para alinear con structured concurrency. |
| Node.js async patterns en TypeScript | Conforme | — | `src/lib/brew-cli.ts`: `execBrew` usa `Promise` correctamente. `streamBrew` usa `AsyncGenerator` con `finally` que hace `proc.kill()` al cancelar. `use-brew-stream.ts`: el hook guarda el generator en `generatorRef` y llama `.return()` en `cancel()` y en el cleanup del `useEffect`. Los `void` en las vistas son intencionales para fire-and-forget de operaciones de refresco donde el error ya se maneja internamente. | — |
| `setInterval` en `license-store.ts` sin limpieza | No conforme | Media | `src/stores/license-store.ts:71-88`: `setInterval(async () => { ... }, REVALIDATION_CHECK_MS).unref()`. El `.unref()` evita que Node.js quede bloqueado, pero el interval nunca se cancela mientras el proceso vive. Si se llama `initialize()` multiples veces (ej. en tests), se acumulan intervals. La flag `_revalidating` previene solapamiento de revalidaciones, pero no los intervals duplicados. | Guardar el ID del interval en el store: `let _intervalId: ReturnType<typeof setInterval> | null = null` y cancelar el anterior antes de crear uno nuevo. |
| `void execBrew([...]).then(...)` en `OutdatedView` | Parcial | Media | `src/views/outdated.tsx:54`: `void execBrew([pkg.pinned ? 'unpin' : 'pin', pkg.name]).then(() => void fetchOutdated())`. Este patron fire-and-forget ignora errores del `execBrew`. Si `brew pin` falla, el usuario no recibe feedback. | Manejar el error mostrando un mensaje de error local, o mover la logica al store donde los errores se capturan en el mapa `errors`. |
| Reentrancy en `AppState.upgrade` + `refresh` | Parcial | Media | `menubar/.../AppState.swift:43-55`: `upgrade(package:)` hace `isLoading = true`, llama `upgradePackage`, luego `refresh(force: true)`. Si el usuario pulsa el boton de upgrade dos veces rapidamente, el segundo `upgrade` sera bloqueado por el guard `guard !isLoading`. Sin embargo, si `upgradePackage` falla, `isLoading` se setea a `false` antes de retornar, permitiendo que otro upgrade empiece inmediatamente. Esto es correcto, pero `refresh` se llama sin guard de reentrada independiente. | El diseño es aceptable. Considerar agregar un indicador de que operacion especifica esta en curso para feedback mas granular en la UI. |
| `Sendable` en tipos Swift | Conforme | — | `BrewChecker: Sendable` (linea 3), `BrewService: Sendable` (linea 3), `OutdatedPackage: Sendable` (via `Codable`). `AppState` y `SchedulerService` son `@MainActor`, por lo que son implicitamente `Sendable`. `OnceGuard` es `@unchecked Sendable` con NSLock, correcto. | — |
| Errores async TypeScript | Conforme | — | En `brew-store.ts`, todos los async actions tienen `try/catch` que almacenan el error en `errors[key]`. En `useBrewStream.ts`, el `for await` esta en `try/catch`. En `license-store.ts`, el revalidation handler captura errores correctamente. | — |

---

## 4.3 Flujo de datos

### Checklist

* [x] La transformacion de datos ocurre en la capa correcta
* [ ] DTO != modelo de dominio != modelo de presentacion — **Media**: los mismos tipos `Formula`/`Cask` fluyen desde el JSON crudo hasta la vista sin ninguna transformacion de dominio intermedia
* [x] El mapping es explicito
* [ ] No hay logica de negocio en la vista — **Media**: `SmartCleanupView` contiene logica para detectar errores de dependencia
* [x] Estados de carga, error y exito estan tipados
* [ ] Cancelaciones y reintentos modelados — **Media**: no hay retry logic en llamadas a OSV.dev ni a Polar API

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Tipos DTO = Dominio = Presentacion | No conforme | Media | `src/lib/types.ts` define `Formula`, `Cask`, `OutdatedPackage`, `BrewService`. Estos tipos reflejan directamente el JSON de Homebrew (snake_case, estructura anidada con `installed[0]`). El mismo tipo `Formula` se usa en: el parser JSON, el store Zustand, `brew-api.ts`, `formulaeToListItems()`, y directamente en `PackageInfoView`. Solo existe una transformacion ligera a `PackageListItem` para las listas. No hay separation entre DTO de red / modelo de dominio / modelo de presentacion. | Para el tamano actual del proyecto este acoplamiento es gestionable. Si el proyecto crece, definir un `DomainFormula` con nombres camelCase y sin anidamiento innecesario, y mapear desde el DTO en el parser. |
| `formulaeToListItems` / `casksToListItems` | Conforme | — | `src/lib/brew-api.ts:89-118`: estas funciones son mappers explicitos de `Formula[]` / `Cask[]` a `PackageListItem[]`. Son la unica transformacion de presentacion y estan en la capa correcta (api/lib, no en la vista). | — |
| Logica de deteccion de errores en `SmartCleanupView` | No conforme | Media | `src/views/smart-cleanup.tsx:33-34`: `const isDependencyError = stream.error != null && stream.lines.some((l) => l.includes('Refusing to uninstall') \|\| l.includes('required by'))`. Esta logica analiza la salida de texto de `brew uninstall` para detectar un tipo especifico de error. Es parsing de texto de CLI dentro de la vista. | Mover la deteccion a `brew-cli.ts` o a un helper en `lib/cleanup/` que clasifique el tipo de error. La vista deberia recibir un tipo de error estructurado. |
| Estados de carga tipados | Conforme | — | En los stores TypeScript: `loading: Record<string, boolean>` + `errors: Record<string, string \| null>` por clave. En los stores especificos (cleanup, security, history): `loading: boolean` + `error: string \| null`. En BrewBar: `AppState.isLoading`, `AppState.error`, `AppState.servicesError`. Todos los estados estan representados explicitamente. No se usa un enum tipado (ej. `ViewState<T>`), pero los flags son suficientes para este proyecto. | — |
| Cancelacion de streams TypeScript | Conforme | — | `useBrewStream` expone `cancel()` que llama `generatorRef.current?.return(undefined)` y `streamBrew` tiene `finally { if (!done) proc.kill() }`. El proceso child es terminado en cancelacion. Las vistas usan `key.escape` para cancelar. | — |
| Cancelacion en OSV.dev y Polar API | No conforme | Media | `src/lib/security/osv-api.ts` y `src/lib/license/polar-api.ts` usan `fetch()` sin `AbortController`. Si el usuario navega fuera de la vista `security-audit` durante un scan, el request HTTP continua. Tampoco hay retry logic para errores transitorios de red. | Agregar `AbortController` y pasar la signal al `fetch`. Implementar retry con backoff exponencial para errores 5xx en Polar API. |
| Mapping de datos en parsers | Conforme | — | `src/lib/parsers/json-parser.ts` transforma el JSON crudo de Homebrew en los tipos del dominio con validacion defensiva (`Array.isArray`, valores por defecto). `text-parser.ts` parsea los formatos de texto (search, doctor, config). El mapping ocurre exclusivamente en esta capa. | — |
| Transformaciones BrewBar | Conforme | — | `OutdatedPackage` y `BrewService` en Swift son DTOs de red con `CodingKeys` para mapear snake_case. `AppState` consume estos DTOs directamente. Al ser una app simple de solo lectura/actualizacion, la ausencia de capa de dominio separada es aceptable. | — |

---

## 4.4 Persistencia temporal y cache

### Checklist

* [ ] Estrategia de cache documentada — **Media**: no hay documentacion de la estrategia de cache en memoria
* [ ] Invalidation policy definida — **Baja**: la invalidacion del brew-store depende de acciones del usuario, sin TTL
* [ ] No hay stale state silencioso — **Media**: el dashboard muestra datos de `fetchAll()` que pueden ser minutos o sesiones desactualizados
* [x] La UI reacciona bien a datos expirados (para la licencia si; para datos Homebrew, parcialmente)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Cache en memoria sin TTL | No conforme | Media | `brew-store.ts`: los datos de `formulae`, `casks`, `outdated`, `services` se cargan con `fetchAll()` al iniciar el dashboard y permanecen en memoria sin expiracion. Si el usuario deja la app abierta, navega a otras vistas y vuelve al dashboard horas despues, los datos mostrados pueden estar desactualizados sin indicacion visual. El store pre-inicializa `loading: { installed: true, outdated: true, services: true, config: true }` para evitar el flash, pero no hay TTL ni "last fetched at". | Agregar `lastFetchedAt: Record<string, number>` al store y mostrar un indicador de "ultima actualizacion hace X" en el dashboard o una opcion de refresco manual. |
| Invalidacion del brew-store | No conforme | Baja | Cada vista llama a su propio fetch al montar (`fetchInstalled`, `fetchOutdated`, etc.) sin verificar si los datos ya son recientes. Esto provoca llamadas redundantes a brew CLI cuando el usuario navega entre vistas. | Agregar un threshold de frescura (ej. 30 segundos). Si los datos se cargaron hace menos del threshold, no refetchear. |
| `SecurityAuditView` sin cache | Parcial | Baja | `src/views/security-audit.tsx:38`: `useEffect(() => { scan(); }, [])`. Cada vez que el usuario entra a la vista, se ejecuta un nuevo scan completo contra OSV.dev. No hay cache del resultado previo. Para instalaciones grandes (100+ paquetes), esto puede ser lento. | Almacenar el resultado en `security-store.ts` con un `scannedAt` timestamp y no re-escanear si fue hace menos de X minutos. El store ya tiene `summary` pero no tiene logica de frescura. |
| Licencia con política de degradacion | Conforme | — | `src/lib/license/license-manager.ts`: degradacion gradual 0-7 dias (none), 7-14 (warning), 14-30 (limited), 30+ (expired). Revalidacion cada 24h con grace period de 7 dias. La UI en `account.tsx:55-63` muestra el warning de degradacion con dias transcurridos. | — |
| BrewBar: sin cache de resultados | Parcial | Baja | `AppState.refresh()` en BrewBar ejecuta siempre las dos llamadas a brew (outdated + services). No hay cache entre refreshes del scheduler. Para una app de menubar que checkea cada hora esto es aceptable, pero el `badgeTimer` en `AppDelegate` corre cada 2 segundos leyendo del `AppState` en memoria (no re-ejecuta brew), lo que es correcto. | — |
| `UserDefaults` en SchedulerService | Conforme | — | `interval` y `notificationsEnabled` se persisten en `UserDefaults` al cambiar (via `didSet`). Este es el uso correcto de `UserDefaults` para preferencias simples. | — |

### Registro de fuentes de verdad

| Feature | Fuente de verdad | Estado derivado | Riesgo detectado | Accion |
|---------|------------------|-----------------|------------------|--------|
| Formulae instalados | `brew-store.formulae` | `PackageListItem[]` via `formulaeToListItems()` | Stale tras operaciones externas a la app | Agregar TTL o timestamp de ultima carga |
| Casks instalados | `brew-store.casks` | `PackageListItem[]` via `casksToListItems()` | Idem | Idem |
| Paquetes desactualizados | `brew-store.outdated` | Lista combinada formulae+casks en `OutdatedView` | Stale; no hay refresco automatico | TTL o mensaje de ultima actualizacion |
| Servicios Homebrew | `brew-store.services` | `errorServices` filtrado en dashboard | Stale para servicios de larga vida | TTL o refresco periodico opcional |
| Navegacion actual | `navigation-store.currentView` | Vista renderizada en `app.tsx` | Sin riesgo — estado efimero de sesion | — |
| Paquete seleccionado | `navigation-store.selectedPackage` | Datos cargados en `PackageInfoView` | Desincronia si el paquete se modifica externamente | Refrescar al montar `PackageInfoView` (ya se hace) |
| Licencia Pro | `license-store.{status, license, degradation}` | `isPro()`, gate en `app.tsx` | Acumulacion de intervals si `initialize()` se llama dos veces | Guardar ID del interval y cancelar el anterior |
| Perfiles | `profile-store.profileNames` + archivos JSON en `~/.brew-tui/profiles/` | `selectedProfile` tras `loadProfile()` | Sin TTL; listado puede quedar stale si otro proceso modifica archivos | Aceptable para este caso de uso |
| Historial | `history-store.entries` + `~/.brew-tui/history.json` | Filtrado en `HistoryView` | `appendEntry` en `use-brew-stream.ts` escribe directo al disco sin pasar por el store | `historyStore.logAction` existe pero no se usa en el hook |
| Resultados de seguridad | `security-store.summary` | Lista de vulnerabilidades en `SecurityAuditView` | Sin cache: re-scan en cada mount | Agregar logica de frescura al store |
| Outdated en BrewBar | `AppState.outdatedPackages` | `outdatedCount`, badge del statusItem | Stale entre checks del scheduler | Aceptable dado el intervalo de 1h+ |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 0 |
| Media | 9 |
| Baja | 11 |

**Total hallazgos no conformes o parciales:** 20

### Distribucion por seccion

| Seccion | No conformes | Parciales |
|---------|-------------|-----------|
| 3.1 Composicion global | 1 | 0 |
| 3.2 Separacion por capas | 4 | 2 |
| 3.3 Cohesion y acoplamiento | 1 | 1 |
| 3.4 Deuda estructural | 2 | 1 |
| 4.1 Ownership del estado | 2 | 2 |
| 4.2 Concurrencia | 4 | 3 |
| 4.3 Flujo de datos | 3 | 0 |
| 4.4 Cache | 3 | 2 |

### Hallazgos de mayor prioridad (Media)

1. **`lib/license/pro-guard.ts` importa `stores/`** — inversion de dependencias entre capa lib y capa de estado. Misma violacion en `anti-tamper.ts` y `watermark.ts`.
2. **`OutdatedView` llama `execBrew` directamente** — unica vista que bypassa API y store para una accion de mutacion (pin/unpin).
3. **Tipos DTO = Dominio = Presentacion** — `Formula`/`Cask` fluyen sin transformacion desde JSON hasta la vista.
4. **`Task {}` fire-and-forget en BrewBar views** — tasks sin handle de cancelacion ni ligadas al ciclo de vida de la vista.
5. **`setInterval` en `license-store` sin limpieza** — interval se acumula si `initialize()` se llama multiples veces.
6. **`SmartCleanupView` parsea texto de CLI** — logica de negocio (deteccion de tipo de error) en la vista.
7. **Sin `AbortController` en OSV.dev y Polar API** — requests HTTP no cancelables.
8. **Brew-store sin TTL** — datos pueden estar obsoletos sin indicacion visual.
9. **`PackageInfoView` duplica estado de formula** — fuente de verdad ambigua entre vista y store.
