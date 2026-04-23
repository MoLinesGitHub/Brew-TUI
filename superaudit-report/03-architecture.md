# 3. Arquitectura y limites del sistema

> Auditor: architecture-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 presenta una arquitectura hibrida bien estructurada en sus niveles superiores: el entry point es claro, la navegacion es predecible y la separacion entre stores/views es solida. Sin embargo, persiste un patron sistematico de violacion de capas: cinco modulos de la capa `lib/` importan directamente del store de Zustand (`useLicenseStore`), invirtiendo el flujo de dependencias esperado (UI → Stores → Lib) e introduciendo acoplamiento circular entre la capa de dominio/servicio y la capa de estado. En BrewBar (Swift), la arquitectura es compacta y bien aislada, con `AppState` como fuente de verdad unica bajo `@MainActor`, aunque la clave de descifrado AES-256-GCM hardcodeada en `LicenseChecker.swift` constituye el hallazgo de mayor gravedad de todo el proyecto.

---

## 3.1 Composicion global

### Checklist

* [x] Existe composition root claro
* [x] La inicializacion global esta centralizada
* [x] No hay inicializacion de servicios dispersa en vistas
* [ ] La navegacion tiene modelo definido — **Parcial**: navigation-store con historial correcto, pero `previousView` es un campo redundante con `viewHistory[-1]`
* [x] La DI es explicita y predecible

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Entry point TUI (`src/index.tsx`) | Conforme | — | Unico entry, CLI subcommands separados, render de `<App/>` al final. | — |
| Composition root TUI (`src/app.tsx`) | Conforme | — | Router central con `isProView()` gate, `useEffect` para `initLicense()`. | — |
| Composition root BrewBar (`AppDelegate.swift`) | Conforme | — | `AppDelegate` instancia `AppState` y `SchedulerService` en su propio scope, los pasa por init. | — |
| `previousView` redundante en `navigation-store.ts` | Parcial | Baja | `src/stores/navigation-store.ts:6,30` — `previousView` es siempre igual a `viewHistory[viewHistory.length-1]`; la unica fuente de verdad del historial es `viewHistory`. | Eliminar el campo `previousView` y derivarlo de `viewHistory` donde se necesite; reducir superficie de estado duplicado. |
| Inicializacion de `licenseStore` en `useEffect` | Conforme | — | `src/app.tsx:29` — `initLicense()` se llama desde el componente raiz, no desde vistas hoja. | — |

---

## 3.2 Separacion por capas

### Checklist

* [x] UI no conoce detalles de persistencia
* [ ] UI no conoce detalles de red — **Parcial**: `outdated.tsx` importa `execBrew()` directamente
* [x] Domain no depende de UI
* [ ] Data implementa contratos del dominio — **No conforme**: 5 modulos `lib/` importan `useLicenseStore` del store layer
* [x] Shared/Core no se convierte en cajon desastre
* [x] No hay dependencias ciclicas (detectadas)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `lib/` importa `useLicenseStore` (5 modulos) | No conforme | Alta | `src/lib/history/history-logger.ts:5`, `src/lib/security/audit-runner.ts:3`, `src/lib/cleanup/cleanup-analyzer.ts:6`, `src/lib/profiles/profile-manager.ts:9`, `src/lib/brewbar-installer.ts:9` — todos extraen `{ license, status }` del store para llamar a `requirePro()`. La capa `lib` conoce la capa `stores`, invirtiendo la jerarquia deseada. | Refactorizar las funciones afectadas para recibir `{ license, status }` como parametros expliciticos desde la capa de stores/hooks. Asi `lib` solo dependeria de `lib/license/types.ts`, no del store. |
| `outdated.tsx` importa `execBrew` directamente | Parcial | Media | `src/views/outdated.tsx:5` — importa `execBrew` de `lib/brew-cli.ts` para la operacion de `pin`. El resto de operaciones va a traves de `useBrewStream`. Rompe la abstraccion: el store/API deberian ser la frontera de la UI con la CLI. | Mover la operacion de pin a `brew-api.ts` (p. ej. `pinPackage(name)`) y eliminar el import directo de `brew-cli` en la vista. |
| `installed.tsx`, `package-info.tsx` y `search.tsx` importan `brew-api.ts` directamente | Parcial | Baja | `src/views/installed.tsx:7` (`formulaeToListItems`, `casksToListItems`), `src/views/package-info.tsx:14` (llamadas API directas), `src/views/search.tsx:12` (`import * as api`). `formulaeToListItems` es una funcion de presentacion que deberia vivir en el store o en una capa de adaptacion, no en `brew-api`. Las llamadas directas a `api.getFormulaInfo()` en `package-info` eluden el store. | Mover `formulaeToListItems`/`casksToListItems` a un modulo de utilidades de presentacion o al store. Centralizar `getFormulaInfo` en el store o en un store propio de `package-info`. |
| `src/utils/` coherente y acotado | Conforme | — | Solo 3 ficheros: `format.ts`, `colors.ts`, `gradient.tsx`. No hay junk drawer. | — |
| Capas BrewBar bien separadas (App / Models / Services / Views) | Conforme | — | `BrewChecker` y `LicenseChecker` son structs `Sendable` sin dependencia de Views. `AppState` es el unico punto de contacto entre Services y Views. | — |

---

## 3.3 Cohesion y acoplamiento

### Checklist

* [x] Cada modulo tiene responsabilidad clara
* [x] No hay god objects
* [x] No hay view models con demasiadas responsabilidades
* [ ] No hay servicios transversales con logica de negocio escondida — **Parcial**: `profile-manager.ts` mezcla logica de validacion de dominio con IO
* [x] Las features son componibles

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Ningun archivo supera 280 lineas | Conforme | — | Archivo mas grande: `profiles.tsx` (267 lineas), `license-manager.ts` (279 lineas). Sin god objects. | — |
| Stores Zustand con responsabilidad acotada | Conforme | — | `brew-store`, `license-store`, `navigation-store`, `modal-store` tienen interfaces cohesivas y claras. Los stores de features Pro (`cleanup-store`, `security-store`, etc.) son adicionales y bien delimitados. | — |
| `profile-manager.ts` mezcla validacion de input, IO y watermark | Parcial | Baja | `src/lib/profiles/profile-manager.ts:23-42` — la funcion `validateProfileName()` y la logica de watermark (`exportedBy: getWatermark(license)`) conviven con la persistencia. La responsabilidad es razonablemente acotada pero la validacion y el watermark podrian separarse para facilitar el testing. | Considerar extraer `validateProfileName` a un modulo de validacion y la logica de watermark a la llamada desde el store. Mejora de mantenibilidad, no bloqueante. |
| `history-logger.ts` contiene tanto `detectAction` como `appendEntry` | Conforme | — | `src/lib/history/history-logger.ts:11` — `detectAction` fue movida aqui correctamente segun ARQ-006. Cohesion adecuada para un modulo de historial. | — |
| `BrewChecker.swift` contiene clase `OnceGuard` anidada | Conforme | — | `menubar/BrewBar/Sources/Services/BrewChecker.swift:27` — clase privada anidada para exactamente-una-vez en la continuacion. Patron correcto y no duplicado externamente. | — |

---

## 3.4 Deuda estructural

### Checklist

* [x] Codigo muerto identificado
* [x] Extensiones utilitarias justificadas
* [x] Helpers sin semantica reducidos o eliminados
* [x] Nombres alineados con el dominio
* [ ] No hay duplicacion estructural relevante — **Parcial**: patron de carga loading/error repetido en cada vista sin abstraccion

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `use-brew-command.ts` eliminado (ARQ-007) | Conforme | — | `Glob` no encuentra el fichero. Confirmado eliminado. | — |
| Patron `loading/error` sin abstraccion en vistas | Parcial | Baja | Cada vista repite la misma logica: `if (loading.X) return <Loading .../>; if (errors.X) return <ErrorMessage .../>`. Hay un `TODO` en `src/views/doctor.tsx:9` que lo reconoce explicitamente. | Crear un hook `useViewState(key)` o un componente `<AsyncView>` que encapsule el patron. Mejora de consistencia y reduccion de duplicacion estructural. |
| `previousView` duplica `viewHistory[-1]` | Parcial | Baja | `src/stores/navigation-store.ts:6` — campo que siempre es equivalente al ultimo elemento del historial. Introduce posibilidad de inconsistencia si se modifica el historial sin actualizar `previousView`. | Eliminar `previousView` del state interface y derivarlo de `viewHistory`. |
| Constante `VIEWS` exportada de `navigation-store` | Conforme | — | `src/stores/navigation-store.ts:59` — exportada correctamente, usada por `use-keyboard.ts`. | — |
| `LemonSqueezyActivateResponse` y `LemonSqueezyValidateResponse` en `types.ts` | Parcial | Baja | `src/lib/license/types.ts:24-49` — los tipos de respuesta de la API externa (LemonSqueezy / Polar) conviven con los tipos de dominio en el mismo fichero. Son DTOs de red que deberian separarse en `polar-api.ts` o en un fichero `dto.ts` propio. | Mover los response-types de la API a `polar-api.ts` donde se consumen. Claridad de capas sin impacto funcional. |

### Matriz de dependencias

| Modulo | Depende de | Permitido? | Riesgo | Accion |
|--------|------------|------------|--------|--------|
| `views/*` | `stores/*`, `lib/brew-api`, `hooks/*`, `i18n`, `utils`, `components/*` | Si (parcial) | `outdated.tsx` importa `brew-cli` directamente | Reemplazar con funcion en `brew-api` |
| `views/installed.tsx`, `package-info.tsx`, `search.tsx` | `lib/brew-api` | Parcial | Acoplamiento directo a API en lugar de pasar por store | Crear funciones en store / capa adaptacion |
| `stores/*` | `lib/*`, tipos | Si | Sin violaciones en stores | — |
| `lib/history/history-logger.ts` | `stores/license-store` | **No** | Inversion de dependencias: lib conoce store | Pasar `{ license, status }` como parametro |
| `lib/security/audit-runner.ts` | `stores/license-store` | **No** | Idem | Idem |
| `lib/cleanup/cleanup-analyzer.ts` | `stores/license-store` | **No** | Idem | Idem |
| `lib/profiles/profile-manager.ts` | `stores/license-store` | **No** | Idem | Idem |
| `lib/brewbar-installer.ts` | `stores/license-store` | **No** | Idem | Idem |
| `lib/license/*` | Solo tipos y Node.js APIs | Si | Sin violaciones | — |
| `lib/brew-api.ts` | `lib/brew-cli`, `lib/parsers`, `lib/types` | Si | Sin violaciones | — |
| BrewBar `Views/*` | `Models/AppState`, `Services/SchedulerService` | Si | Dependencias pasadas por init/let | — |
| BrewBar `Services/BrewChecker` | Foundation, `Models/*` | Si | Struct Sendable bien aislado | — |
| BrewBar `Services/LicenseChecker` | CryptoKit, Foundation, `Models/*` | Si | Clave hardcodeada es riesgo de seguridad, no de capa | Ver hallazgo en seccion 4 |
| BrewBar `AppDelegate` | `Models/AppState`, `Services/*`, SwiftUI, AppKit | Si | Composition root correcto | — |

---

# 4. Estado, concurrencia y flujo de datos

> Auditor: architecture-auditor | Fecha: 2026-04-23

## 4.1 Ownership del estado

> Nota metodologica: La TUI TypeScript no usa los wrappers de SwiftUI (`@State`, `@Binding`, etc.). Los equivalentes funcionales son: `useState` React (estado local de vista), Zustand stores (estado global/shared), props (projection/binding), `useRef` (estado mutable sin re-render). BrewBar usa Observation framework (`@Observable`) sobre SwiftUI, por lo que los items de `@StateObject`/`@ObservedObject` son marcados como **No aplica** para BrewBar.

### Checklist

* [x] Cada fuente de verdad esta claramente definida
* [ ] No hay duplicacion de estado — **Parcial**: `previousView` duplica el ultimo elemento de `viewHistory`
* [x] `@State` solo para estado local de vista (TS: `useState` para estado local de vista)
* [x] `@Binding` usado solo para proyeccion controlada (TS: props; Swift: `Binding(get:set:)` manual en SettingsView)
* [x] `@StateObject` en propietarios reales — **No aplica** para BrewBar (`@Observable`); TS no usa `@StateObject`
* [x] `@ObservedObject` no recrea ownership accidental — **No aplica** para BrewBar; TS no usa `@ObservedObject`
* [x] `@EnvironmentObject` no introduce dependencias invisibles peligrosas — No se usa en ninguno de los dos codebases
* [x] `@Observable` usado con criterio arquitectonico (BrewBar: `AppState` y `SchedulerService` son `@Observable @MainActor`)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `previousView` duplica `viewHistory[-1]` | Parcial | Baja | `src/stores/navigation-store.ts:6,21,30,41` — dos campos representan la misma informacion; pueden divergir si el historial se modifica sin actualizar `previousView`. | Eliminar `previousView` del interface, derivarlo de `viewHistory` en los consumidores. |
| Estado local `loading`/`error` en `package-info.tsx` | Parcial | Baja | `src/views/package-info.tsx:33-34` — `loading` y `error` gestionados con `useState` local en lugar de pasar por el store. Inconsistente con el resto de vistas que usan `brew-store`. | Valorar crear un store o hook de `package-info` para unificar el patron. Impacto bajo. |
| `AppState` como unica fuente de verdad en BrewBar | Conforme | — | `menubar/BrewBar/Sources/Models/AppState.swift:6` — `@MainActor @Observable`, propietario en `AppDelegate`. Pasado por init a Views y a SchedulerService como `weak var state`. Sin duplicaciones. | — |
| `SchedulerService` es `@Observable` y propietario de `interval`/`notificationsEnabled` | Conforme | — | `menubar/BrewBar/Sources/Services/SchedulerService.swift:6` — correcto: la preferencia de intervalo vive en el scheduler, no en AppState. | — |
| `Binding(get:set:)` manual en `SettingsView` para `scheduler.interval` | Conforme | — | `menubar/BrewBar/Sources/Views/SettingsView.swift:16-23` — necesario porque `@Observable` no genera `Binding` automatico para propiedades de tipos referencia pasados como `let`. Patron correcto. | — |
| `@EnvironmentObject` no usado en ninguna codebase | Conforme | — | Grep confirma ausencia. Todas las dependencias son explicitas via init o `useXxxStore()`. | — |

---

## 4.2 Concurrencia

> Nota metodologica: La TUI TypeScript es single-threaded (Node.js event loop). Los patrones relevantes son: Promises/async-await, AsyncGenerator para streaming, unhandled rejections, race conditions en actualizaciones de estado Zustand desde fetches paralelos, y lifecycle de tareas asincronas en componentes React. BrewBar usa Swift 6 concurrencia estructurada con `@MainActor`, `async/await`, `Task`, y `Sendable`.

### Checklist

* [ ] Aislamiento de actores definido — **No aplica** para TUI TypeScript; **Parcial** para BrewBar: sin `actor` declarado, aislamiento via `@MainActor`
* [ ] `@MainActor` usado solo donde corresponde — **No aplica** para TUI; **Conforme** para BrewBar
* [ ] No hay trabajo pesado en main thread — **No aplica** para TUI (single-thread); **Conforme** para BrewBar (brew spawn en background)
* [ ] Task cancelables y con ciclo de vida claro — **Parcial**: `launchTask` en AppDelegate se cancela en `applicationWillTerminate`, pero Tasks en botones de views son fire-and-forget
* [ ] No hay fire-and-forget sin control — **Parcial**: Tasks en botones de SwiftUI Views no tienen handle ni cancelacion; `brewUpdate().catch(() => {})` en brew-store swallows errores silenciosamente
* [ ] Errores async propagados correctamente — **Parcial**: `src/stores/brew-store.ts:147` swallows errores de `brewUpdate()` completamente
* [ ] Reentrancy revisada — **Parcial**: `AppState.refresh()` tiene guard `guard force || !isLoading`, pero `upgrade()` llama `refresh(force: true)` y puede solaparse con un refresh del scheduler
* [ ] Race conditions analizadas — **Parcial**: `_revalidating` es un flag de modulo (no atomic), posible race en Node.js si dos microtasks verifican simultaneamente
* [x] Sendable revisado en tipos compartidos (BrewBar: `OutdatedPackage`, `BrewService`, `BrewChecker` conforman `Sendable`)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `_revalidating` flag no atomico en `license-store.ts` | Parcial | Media | `src/stores/license-store.ts:12,58,79` — flag booleano de modulo usado para evitar revalidaciones concurrentes. En Node.js single-thread esto es seguro para callbacks, pero si dos microtasks en el mismo tick evaluan el flag antes de que alguna lo setee (posible con `Promise.all` o scheduling), podrian pasar dos revalidaciones simultaneas. El mutex no es verdaderamente atomico. | Reemplazar el flag por una `Promise` pendiente que actue como mutex real: `let _revalidationPromise: Promise<void> | null = null`. Quien llega segundo espera la misma promesa. |
| `brewUpdate().catch(() => {})` swallows error completamente | No conforme | Media | `src/stores/brew-store.ts:147` — `api.brewUpdate().catch(() => {})` descarta cualquier error de la actualizacion de brew en silencio. Si `brew update` falla (sin conexion, permisos), el usuario no recibe ningun feedback y el store no actualiza ningun flag de error. | Cambiar a `.catch((err) => { set({ errors: { ...state.errors, update: String(err) } }) })` para que el error sea observable en el store y la UI pueda mostrarlo. |
| `streamBrew()` usa polling de 100ms en lugar de evento | Parcial | Baja | `src/lib/brew-cli.ts:65` — `await new Promise((r) => setTimeout(r, 100))` en el bucle del generador. El propio comentario `TODO` lo reconoce. En operaciones largas esto introduce latencia de hasta 100ms por linea y aumenta CPU idle. | Refactorizar para usar un event emitter o una cola de lineas con un `Promise` que se resuelve en el callback `on('data')`, eliminando el polling. |
| Tasks fire-and-forget en buttons de BrewBar Views | Parcial | Media | `menubar/BrewBar/Sources/Views/PopoverView.swift:57,88`, `OutdatedListView.swift:26,75`, `SettingsView.swift:31` — `Task { await appState.refresh() }` sin almacenar el handle. Si la view desaparece (popover cerrado) el Task continua y podria actualizar `AppState` correctamente (ya que `AppState` es `@MainActor`), pero no hay cancelacion. El comentario en PopoverView lo reconoce. | Almacenar los Task handles en `@State` o en la propia view y cancelarlos en `.onDisappear` o usar `.task` modifier donde la semantica de cancelacion automatica sea aplicable. Para acciones disparadas por boton (no por lifecycle), el riesgo real es bajo, pero documentar la decision. |
| `DispatchQueue.global().asyncAfter` en `BrewChecker` con `@unchecked Sendable` | Parcial | Media | `menubar/BrewBar/Sources/Services/BrewChecker.swift:78` — el timeout del proceso usa `DispatchQueue.global()` en lugar de una task estructurada. El mecanismo `OnceGuard` (clase anidada en linea 27, marcada `@unchecked Sendable` con `NSLock` manual) garantiza exactamente-una-vez, pero mezcla GCD y Swift concurrency. El uso de `@unchecked Sendable` requiere discipline manual para mantener la correccion del lock bajo refactoring futuro. | Reemplazar el timeout con `withTaskGroup` o `Task { try await Task.sleep(...); if process.isRunning { process.terminate() } }` en el contexto structured concurrency para eliminar la mezcla GCD/async y el `@unchecked Sendable`. |
| `setInterval` en `license-store.ts` con `unref()` | Conforme | — | `src/stores/license-store.ts:74-93` — intervalo limpiado con `clearInterval` antes de crear uno nuevo, y marcado con `.unref()` para no bloquear el proceso. CON-001 correctamente resuelto. | — |
| `useBrewStream` con lifecycle correcto | Conforme | — | `src/hooks/use-brew-stream.ts:38-45` — `mountedRef` + `generatorRef.current?.return(undefined)` en el cleanup del `useEffect`. Cancelacion de stream correcta al desmontar. | — |
| `ProfilesView` cancela el importGenerator al desmontar | Conforme | — | `src/views/profiles.tsx:35-43` — `importGenRef.current?.return(undefined)` en el cleanup. Correcto. | — |
| `AppDelegate.launchTask` cancelado en `applicationWillTerminate` | Conforme | — | `menubar/BrewBar/Sources/App/AppDelegate.swift:47-53` — `launchTask?.cancel()` + `badgeTimer?.invalidate()` + `scheduler.stop()`. Lifecycle correcto. | — |

---

## 4.3 Flujo de datos

### Checklist

* [x] La transformacion de datos ocurre en la capa correcta
* [ ] DTO != modelo de dominio != modelo de presentacion — **Parcial**: tipos de API externa conviven con tipos de dominio en `types.ts`
* [x] El mapping es explicito
* [ ] No hay logica de negocio en la vista — **Parcial**: `search.tsx` determina si un resultado es formula o cask, `outdated.tsx` importa `execBrew` directamente
* [x] Estados de carga, error y exito estan tipados
* [ ] Cancelaciones y reintentos modelados — **Parcial**: reintentos en `deactivate` (3 intentos), pero no en `scan()` de seguridad ni en fetches de brew

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `LemonSqueezyActivateResponse` y `LemonSqueezyValidateResponse` en `lib/license/types.ts` | Parcial | Baja | `src/lib/license/types.ts:24-49` — DTOs de respuesta de la API externa definidos en el mismo fichero que los tipos de dominio (`LicenseData`, `LicenseStatus`). Mezcla contratos externos con modelo interno. | Mover los response-types de LemonSqueezy/Polar a `polar-api.ts` donde se consumen. Sin impacto funcional. |
| Logica de clasificacion formula/cask en `search.tsx` | Parcial | Baja | `src/views/search.tsx` — la distincion entre si un resultado de busqueda es formula o cask se infiere del contexto de resultados en la vista. Esta logica de clasificacion deberia vivir en `brew-api.ts` o en el store. | Mover la logica de clasificacion a `brew-api.ts`. La vista solo deberia consumir el tipo ya clasificado. |
| `execBrew` usado directamente en `outdated.tsx` | No conforme | Media | `src/views/outdated.tsx:5` — la vista llama a la primitiva de CLI directamente, eludiendo la capa de API. El resultado no pasa por ningun parser y no se registra en el store ni en el historial. | Crear `pinPackage(name)`/`unpinPackage(name)` en `brew-api.ts` y usarlas desde el store o directamente desde la vista a traves de la API. |
| Mapping explcito DTO → dominio en parsers | Conforme | — | `src/lib/parsers/json-parser.ts` y `text-parser.ts` — mappings explicitos con transformaciones seguras. Sin acceso directo a structs del JSON en la UI. | — |
| `loadingState` ad-hoc en `package-info.tsx` | Parcial | Baja | `src/views/package-info.tsx:33-34` — usa `useState<boolean>` + `useState<string|null>` en lugar del patron tipado `loading[key]` del brew-store. Inconsistencia menor. | Unificar patron o crear un store de package-info. |
| Sin reintentos en `scan()` de seguridad / fetches de brew | Parcial | Baja | `src/lib/security/osv-api.ts` — la llamada a OSV.dev no tiene logica de reintento. Si el servicio externo falla transitoriamente, el usuario debe refrescar manualmente. | Implementar retry con backoff exponencial (max 2-3 intentos) para llamadas a servicios externos. |
| Cancelacion de stream correcta en `useBrewStream` | Conforme | — | `src/hooks/use-brew-stream.ts:84-88` — `cancel()` setea `cancelRef` y llama a `generatorRef.current?.return()`. El `streamBrew` llama a `proc.kill()` en su `finally`. | — |
| Transformacion datos en BrewBar correctamente en Services | Conforme | — | `BrewChecker.swift` decodifica JSON en el servicio con `JSONDecoder`, `AppState` solo consume tipos tipados. Sin logica de parsing en Views. | — |

---

## 4.4 Persistencia temporal y cache

### Checklist

* [ ] Estrategia de cache documentada — **No conforme**: no hay documentacion de estrategia de cache para los datos de brew
* [ ] Invalidation policy definida — **Parcial**: `lastFetchedAt` existe pero no se usa para invalidar
* [ ] No hay stale state silencioso — **Parcial**: los datos de brew en el store pueden estar desactualizados sin indicacion visual
* [ ] La UI reacciona bien a datos expirados — **Parcial**: no hay indicacion de "datos de hace X tiempo"

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `lastFetchedAt` definido pero no usado para invalidacion | Parcial | Media | `src/stores/brew-store.ts:17,40,57` — el campo `lastFetchedAt` fue introducido como correccion CON-003, pero ningun componente lo lee para mostrar "ultima actualizacion hace X" ni para decidir si los datos necesitan refresco. El tracking existe pero no cierra el ciclo. | Leer `lastFetchedAt` en `DashboardView` y en vistas de listas para mostrar "Actualizado hace X". Opcionalmente, implementar refresh automatico si `lastFetchedAt[key] > N_MINUTOS`. |
| Sin cache de resultados de OSV.dev | No conforme | Media | `src/stores/security-store.ts` + `src/lib/security/audit-runner.ts` — cada llamada a `scan()` hace una peticion completa a `api.osv.dev`. Con muchos paquetes esto es lento y consume API. No hay TTL ni cache de resultados. | Introducir cache en memoria en `security-store` con TTL de 1h. Solo refrescar si `Date.now() - lastScanAt > TTL` o si el usuario lo pide explicitamente. |
| Datos de brew en store sin indicacion de staleness | Parcial | Baja | `src/views/dashboard.tsx:15` — `fetchAll()` se llama al montar pero los datos permanecen en store sin timestamp visible. El usuario no sabe si esta mirando datos de hace 2 minutos o 2 horas. | Mostrar `lastFetchedAt.installed` como "Actualizado hace X" en el Dashboard y en la vista Installed. |
| `lastChecked` de BrewBar visible en UI | Conforme | — | `menubar/BrewBar/Sources/Views/PopoverView.swift:105-109` — `appState.lastChecked` se muestra como texto relativo en la vista. El usuario sabe cuando fue la ultima comprobacion. | — |
| Licencia cacheada en disco con invalidacion por TTL | Conforme | — | `src/lib/license/license-manager.ts:156-165` — `needsRevalidation()` usa `REVALIDATION_INTERVAL_MS` (24h) y `isWithinGracePeriod()` (7 dias). Politica documentada en codigo. | — |

### Registro de fuentes de verdad

| Feature | Fuente de verdad | Estado derivado | Riesgo detectado | Accion |
|---------|------------------|-----------------|------------------|--------|
| Formulae/Casks instalados | `useBrewStore.formulae`, `useBrewStore.casks` | Listas filtradas en `InstalledView`, `PackageListItem[]` vía conversor | Sin TTL de invalidacion visible | Mostrar `lastFetchedAt.installed` en UI |
| Paquetes desactualizados | `useBrewStore.outdated` | Lista unificada en `OutdatedView` | Igual que arriba | Mostrar timestamp |
| Servicios brew | `useBrewStore.services` | `errorServiceList`, `runningServices` derivados con `useMemo` | Sin TTL de invalidacion visible | Idem |
| Estado de licencia TUI | `useLicenseStore.{ status, license }` | `isPro()` derivado, `degradation` level | `_revalidating` flag no atomico | Usar Promise-mutex |
| Historial de operaciones | Archivo `~/.brew-tui/history.json` | `useHistoryStore.entries` en memoria | Solo registra operaciones de Brew-TUI (no brew externo) | Documentado y aceptable |
| Perfiles | Archivos `~/.brew-tui/profiles/*.json` | `useProfileStore.profileNames`, `selectedProfile` | Pro-guard via `useLicenseStore` directo | Refactorizar a parametro |
| Resultado de auditoria de seguridad | `useSecurityStore.summary` | `results[]`, conteos por severidad | Sin cache — cada scan llama a OSV.dev | Implementar cache con TTL |
| Candidatos de limpieza | `useCleanupStore.summary` | `selected: Set<string>` | Sin persistencia — se recalcula en cada sesion | Aceptable (analisis on-demand) |
| Estado BrewBar (outdated, services) | `AppState.outdatedPackages`, `AppState.services` | `outdatedCount`, `errorServices` derivados | Sin indicacion de staleness en outliste (solo en "up to date" view) | Considerar mostrar `lastChecked` en OutdatedListView tambien |
| Preferencias BrewBar | `UserDefaults` via `SchedulerService.interval`, `notificationsEnabled` | Estado UI en `SettingsView` | Sin conflicto detectado | — |
| Navegacion TUI | `useNavigationStore.viewHistory` | `currentView`, `previousView` (redundante) | `previousView` puede divergir | Eliminar `previousView` |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 1 |
| Media | 7 |
| Baja | 9 |

**Total hallazgos no conformes o parciales:** 17

### Tabla consolidada de hallazgos

| ID | Elemento | Seccion | Estado | Severidad | Fichero(s) |
|----|----------|---------|--------|-----------|------------|
| ARQ-TS-001 | `lib/*` importa `useLicenseStore` (5 modulos) | 3.2 | No conforme | Alta | `history-logger.ts:5`, `audit-runner.ts:3`, `cleanup-analyzer.ts:6`, `profile-manager.ts:9`, `brewbar-installer.ts:9` |
| ARQ-TS-002 | `outdated.tsx` importa `execBrew` directamente | 3.2 / 4.3 | No conforme | Media | `src/views/outdated.tsx:5` |
| ARQ-TS-003 | `lib/license/types.ts` mezcla DTOs de red con tipos de dominio | 4.3 | Parcial | Baja | `src/lib/license/types.ts:24-49` |
| ARQ-TS-004 | `previousView` redundante con `viewHistory[-1]` | 3.1 / 4.1 | Parcial | Baja | `src/stores/navigation-store.ts:6` |
| ARQ-TS-005 | `_revalidating` flag no atomico | 4.2 | Parcial | Media | `src/stores/license-store.ts:12,58-70` |
| ARQ-TS-006 | Patron `loading/error` sin abstraccion en vistas | 3.4 | Parcial | Baja | Multiple views, `doctor.tsx:9` (TODO existente) |
| ARQ-TS-007 | `lastFetchedAt` sin uso para invalidacion/UI | 4.4 | Parcial | Media | `src/stores/brew-store.ts:17` |
| ARQ-TS-008 | Sin cache de resultados OSV.dev en security-store | 4.4 | No conforme | Media | `src/stores/security-store.ts` |
| ARQ-TS-009 | `streamBrew` usa polling de 100ms | 4.2 | Parcial | Baja | `src/lib/brew-cli.ts:65` |
| ARQ-TS-010 | `installed.tsx`/`package-info.tsx`/`search.tsx` importan `brew-api` directamente | 3.2 | Parcial | Baja | `installed.tsx:7`, `package-info.tsx:14`, `search.tsx:12` |
| ARQ-TS-011 | Estado local `loading/error` en `package-info.tsx` inconsistente con resto | 4.3 | Parcial | Baja | `src/views/package-info.tsx:33-34` |
| ARQ-TS-012 | Sin reintentos en `scan()` de seguridad / fetches brew | 4.3 | Parcial | Baja | `src/lib/security/osv-api.ts` |
| ARQ-TS-013 | `brewUpdate().catch(() => {})` swallows error sin feedback al usuario | 4.2 | No conforme | Media | `src/stores/brew-store.ts:147` |
| ARQ-SW-001 | Tasks fire-and-forget en buttons SwiftUI Views | 4.2 | Parcial | Media | `PopoverView.swift:57,88`, `OutdatedListView.swift:26,75` |
| ARQ-SW-002 | `DispatchQueue.global()` mezclado con Swift concurrency; `OnceGuard` es `@unchecked Sendable` | 4.2 | Parcial | Media | `BrewChecker.swift:78`, `BrewChecker.swift:27` |
| ARQ-SW-003 | Datos de brew en store TUI sin indicacion de staleness en UI | 4.4 | Parcial | Baja | `src/views/dashboard.tsx`, `installed.tsx` |
| ARQ-SW-004 | `profile-manager.ts` mezcla validacion, IO y watermark | 3.3 | Parcial | Baja | `src/lib/profiles/profile-manager.ts:23-42` |

> Nota: La clave AES-256-GCM hardcodeada en `LicenseChecker.swift:47` es el hallazgo de mayor gravedad del proyecto global, pero pertenece al dominio de Seguridad (seccion 13) y no a Arquitectura. Se menciona en la matriz de dependencias como riesgo de `LicenseChecker` pero el hallazgo formal debe registrarse por el agente de seguridad.

### Verificacion de correcciones v0.2.0

| Correccion reportada | Estado verificado | Evidencia |
|----------------------|-------------------|-----------|
| ARQ-001: pro-guard/anti-tamper/watermark no importan de stores | **Conforme** | `pro-guard.ts`, `anti-tamper.ts`, `watermark.ts` — ninguno importa de `stores/`. Aceptan parametros. |
| CON-001: setInterval cleanup en license-store | **Conforme** | `license-store.ts:74` — `clearInterval(_revalidationInterval)` antes de crear nuevo. `unref()` en linea 93. |
| CON-003: lastFetchedAt tracking en brew-store | **Conforme (parcial)** | Campo existe y se actualiza en cada fetch. No se lee en UI todavia (ver ARQ-TS-007). |
| ARQ-006: detectAction movido a history-logger | **Conforme** | `history-logger.ts:11` — `detectAction` vive aqui. `use-brew-stream.ts:3` lo importa desde `history-logger`. |
| ARQ-007: use-brew-command.ts eliminado | **Conforme** | Glob no encuentra el fichero. |
| Navigation store goBack() pops history | **Conforme** | `navigation-store.ts:35-43` — implementacion correcta. |
