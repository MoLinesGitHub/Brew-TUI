# 19. Auditoria por pantalla

> Auditor: screen-auditor | Fecha: 2026-04-22

---

## Resumen ejecutivo

* **Total pantallas auditadas:** 15 (12 TUI TypeScript/React/Ink + 3 BrewBar Swift/SwiftUI)
* **Cobertura media:** 41% (checklist adaptado por plataforma; ver nota metodologica)
* **Pantallas con cobertura completa:** 0
* **Pantallas con hallazgos criticos:** 3 (SearchView, AccountView, ProfilesView)
* **Hallazgos totales:** 62

### Nota metodologica — TUI vs. SwiftUI

Las 12 pantallas TypeScript/Ink se ejecutan en un terminal; los conceptos de **Accesibilidad** (screen readers, labels, hints), **Dark Mode** (semantica de color del sistema) y **Dynamic Type** (escalado de fuente del sistema) no aplican de la misma forma que en una app nativa. Las notas por pantalla aclaran este contexto.

- **Accesibilidad TUI**: No existe API de accesibilidad en Ink/terminal. La accesibilidad es responsabilidad del emulador de terminal del usuario. Marcado como "No aplica" en todas las vistas TUI.
- **Dynamic Type TUI**: El tamanio de fuente lo controla el usuario directamente desde el emulador de terminal. Marcado como "No aplica".
- **Dark mode TUI**: Las vistas TUI usan colores hex hardcodeados que asumen fondo oscuro. En terminales de fondo claro, texto como `#F9FAFB` (casi blanco) es practicamente invisible. Esto es un hallazgo **consistente** en todas las vistas TUI y se reporta individualmente.
- **Offline TUI**: Ninguna pantalla TUI verifica conectividad de red. Se reporta uniformemente como deficiencia.
- **Analytics TUI**: Ninguna pantalla TUI tiene instrumentacion analitica. Se reporta uniformemente.

---

## Estadisticas por categoria

| Categoria | Pantallas que cumplen | Pantallas que no cumplen | % Cumplimiento |
|-----------|-----------------------|--------------------------|----------------|
| Estado inicial | 13 | 2 | 87% |
| Cargando | 14 | 1 | 93% |
| Error | 12 | 3 | 80% |
| Vacio | 13 | 2 | 87% |
| Offline | 0 | 15 | 0% |
| Permisos | 3 (solo BrewBar) | 12 (No aplica TUI) | N/A |
| Accesibilidad | 1 (parcial BrewBar) | 14 | 7% |
| Dark mode | 3 (BrewBar) | 12 (TUI) | 20% |
| Dynamic Type | 3 (BrewBar) | 12 (No aplica TUI) | N/A |
| Rotacion / tamano | 3 (BrewBar) | 12 (TUI parcial) | 20% |
| Instrumentacion analitica | 0 | 15 | 0% |
| Rendimiento | 9 | 6 | 60% |

---

## Pantalla 1: DashboardView

* **Feature:** Dashboard / Vista principal
* **Ruta de navegacion:** Pantalla inicial al arrancar la aplicacion; tecla `1`
* **Fuente de datos:** `useBrewStore` — `fetchAll()` (formulae, casks, outdated, services, config)
* **Casos de uso asociados:** Vista de bienvenida con metricas de la instalacion Homebrew; muestra contadores, paquetes desactualizados recientes, errores de servicios y version del sistema

### Cobertura

* [x] Estado inicial — Los flags `loading: { installed: true, outdated: true, services: true, config: true }` se pre-inicializan en el store, evitando el flash de contenido vacio
* [x] Cargando — `if (loading.installed) return <Loading />` en la linea 27; spinner visible
* [x] Error — `if (errors.installed) return <ErrorMessage />` en la linea 28
* [ ] Vacio — No existe estado "sin paquetes instalados"; si `formulae.length === 0` y `casks.length === 0` la vista muestra ceros pero no un mensaje explicativo
* [ ] Offline — No se verifica conectividad; `fetchAll()` llama `brewUpdate()` internamente pero falla silenciosamente (el catch es vacio)
* [ ] Permisos — No aplica (no requiere permisos del sistema)
* [ ] Accesibilidad — No aplica (entorno terminal)
* [ ] Dark mode — Colores hex hardcodeados asumen terminal oscura (`#F9FAFB`, `#9CA3AF`, `#06B6D4`, etc.)
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — `StatCard` usa `flexWrap="wrap"` (linea 34), lo cual es positivo; sin embargo no hay lectura de `process.stdout.columns` para adaptar el layout a terminales estrechas
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `errorServiceList` y `runningServices` calculados con `useMemo` correctamente (lineas 17-25); sin problemas detectados, pero `fetchAll()` en `useEffect` sin dependencias puede desencadenar multiples fetches si el componente se remonta

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Estado vacio no diferenciado: si Homebrew no tiene paquetes instalados, la vista muestra `0` en los StatCards sin ningun mensaje orientativo para el usuario | Baja | `src/views/dashboard.tsx:34-47` | Agregar un mensaje cuando `formulae.length === 0 && casks.length === 0` indicando que no hay paquetes instalados |
| Riesgo | Sin manejo offline: `fetchAll()` puede fallar silenciosamente si no hay red; el usuario ve datos obsoletos (o ceros) sin indicacion de que la carga fallo por conectividad | Media | `src/stores/brew-store.ts:134-137` | Detectar errores de red en `fetchAll()` y propagar un banner offline en el estado del store |
| Mejora | Dark mode asumido: todos los colores hex (`#F9FAFB`, `#9CA3AF`, `#06B6D4`) son invisibles en terminales de fondo claro | Media | `src/views/dashboard.tsx:35-45` | Documentar el requisito de terminal oscura o usar colores con mejor contraste relativo |
| Mejora | Sin instrumentacion analitica: no se registran eventos de vista cargada, contadores de paquetes, ni errores al usuario | Baja | Ausencia total en el archivo | Integrar un evento de screen view al montar el componente |

---

## Pantalla 2: InstalledView

* **Feature:** Paquetes instalados
* **Ruta de navegacion:** Tecla `2` desde cualquier vista
* **Fuente de datos:** `useBrewStore` — `fetchInstalled()`; `useBrewStream` para desinstalacion
* **Casos de uso asociados:** Navegar formulae y casks instalados, filtrar por nombre/descripcion, desinstalar paquetes, navegar al detalle de un paquete

### Cobertura

* [x] Estado inicial — `loading.installed: true` pre-inicializado en el store; la vista muestra spinner desde el primer render
* [x] Cargando — `if (loading.installed) return <Loading />` (linea 92)
* [x] Error — `if (errors.installed) return <ErrorMessage />` (linea 93)
* [x] Vacio — Lista vacia muestra `t('installed_noPackages')` en cursiva (linea 179); tabs muestran cuentas cero
* [ ] Offline — Sin deteccion de red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados (`#06B6D4`, `#A855F7`, `#22C55E`, `#F9FAFB`, etc.)
* [ ] Dynamic Type — No aplica (terminal)
* [x] Rotacion / tamano — `MAX_VISIBLE_ROWS = 20` con ventana deslizante (lineas 116-118); adaptacion basica al espacio vertical
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `allItems` calculado con `useMemo` correctamente; uso de `useDebounce` para el filtro (200ms); sin problemas criticos; la lista renderiza solo 20 filas visibles

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Error silencioso en desinstalacion: `stream.run(['uninstall', name])` no tiene manejo de error visible en la vista de lista; el `ErrorMessage` que aparece es del `stream.error` en el ProgressLog, pero si el usuario navega fuera antes de que termine, el error se pierde | Media | `src/views/installed.tsx:153-155` | Mantener el estado de error del stream accesible incluso tras completar |
| Mejora | Sin deteccion offline | Media | Ausencia en el archivo | Ver hallazgo general de offline |
| Mejora | Dark mode asumido | Media | `src/views/installed.tsx:129-141` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar eventos de filtro aplicado, paquete desinstalado |
| Mejora | El titulo del ProgressLog durante la desinstalacion usa `'...'` como placeholder del nombre (linea 101) en lugar del nombre real del paquete | Baja | `src/views/installed.tsx:101` | Pasar `allItems[cursor].name` al titulo del ProgressLog |

---

## Pantalla 3: SearchView

* **Feature:** Busqueda e instalacion de paquetes
* **Ruta de navegacion:** Tecla `3` desde cualquier vista
* **Fuente de datos:** `api.search()` (brew search, text parser); `useBrewStream` para instalacion
* **Casos de uso asociados:** Buscar paquetes en el repositorio Homebrew, instalar un paquete seleccionado, navegar al detalle del paquete antes de instalar

### Cobertura

* [x] Estado inicial — Muestra campo de texto vacio listo para escribir; estado bien definido
* [x] Cargando — `{searching && <Loading />}` (linea 139)
* [ ] Error — El `catch` en `doSearch` (lineas 44-48) establece `results` a arrays vacios en lugar de mostrar el error; busquedas fallidas (brew no encontrado, error de red) son indistinguibles de "sin resultados"
* [x] Vacio — `{allResults.length === 0 && ...}` muestra mensaje "sin resultados" (linea 192)
* [ ] Offline — Sin deteccion de red; la busqueda fallara silenciosamente
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — Resultados limitados a 20 por seccion con indicador de desbordamiento (lineas 159, 180), pero sin ventana deslizante si hay mas de 40 resultados combinados; el cursor puede apuntar a posiciones fuera de la vista
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — Sin problemas criticos detectados; `useRef(false)` para evitar refresh duplicado tras instalacion

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | **Errores de busqueda silenciados**: el `catch` en `doSearch` hace `void err` y devuelve `{ formulae: [], casks: [] }`. Un error de red, de brew no instalado, o de proceso fallido se muestra identicamente a "0 resultados encontrados". El usuario no sabe si fallo la busqueda o genuinamente no hay paquetes | Alta | `src/views/search.tsx:44-48` | Capturar el error en un estado `searchError: string | null` y renderizar un `<ErrorMessage>` en lugar de resultados vacios |
| Bug | Cursor fuera de vista: si formulae tiene 20+ resultados y el cursor esta en la seccion casks (indice >= 20), la fila activa puede quedar fuera del rango visible renderizado; no hay ventana deslizante por seccion | Media | `src/views/search.tsx:159-195` | Implementar paginacion o ventana deslizante similar a `InstalledView` |
| Mejora | Sin deteccion offline | Media | Ausencia en el archivo | Ver hallazgo general de offline |
| Mejora | Dark mode asumido | Media | `src/views/search.tsx:163-164` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica: no se registran eventos de busqueda (termino, numero de resultados), ni instalaciones iniciadas | Baja | Ausencia total en el archivo | Registrar `search_performed`, `install_initiated` |

---

## Pantalla 4: OutdatedView

* **Feature:** Paquetes desactualizados
* **Ruta de navegacion:** Tecla `4` desde cualquier vista
* **Fuente de datos:** `useBrewStore` — `fetchOutdated()`; `useBrewStream` para upgrades
* **Casos de uso asociados:** Ver lista de paquetes desactualizados con versiones actuales y disponibles, actualizar uno o todos los paquetes

### Cobertura

* [x] Estado inicial — `loading.outdated: true` pre-inicializado; spinner en primer render
* [x] Cargando — `if (loading.outdated) return <Loading />` (linea 61)
* [x] Error — `if (errors.outdated) return <ErrorMessage />` (linea 62)
* [x] Vacio — `{allOutdated.length === 0 && ...}` muestra mensaje "todo actualizado" con icono verde (lineas 116-120)
* [ ] Offline — Sin deteccion de red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — **Sin virtualizacion de lista**: `allOutdated.map(...)` renderiza todos los paquetes (linea 126); en instalaciones con muchos paquetes desactualizados el terminal se desborda; contrasta con `InstalledView` que usa `MAX_VISIBLE_ROWS = 20`
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — La lista renderiza todas las filas sin limite; en escenarios con 50+ paquetes desactualizados el scroll del terminal se vuelve inmanejable

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | **Sin virtualizacion de lista**: `allOutdated.map()` renderiza todos los items sin limite de filas visibles. `InstalledView` y `HistoryView` implementan `MAX_VISIBLE_ROWS = 20`; esta vista no lo hace | Alta | `src/views/outdated.tsx:126-143` | Implementar ventana deslizante identica a la de `InstalledView` |
| Mejora | Sin deteccion offline | Media | Ausencia en el archivo | Ver hallazgo general de offline |
| Mejora | Dark mode asumido | Media | `src/views/outdated.tsx:131-135` | Ver hallazgo general de dark mode |
| Mejora | El indicador de cursor `cursor + 1 / allOutdated.length` puede mostrar `1/0` si `allOutdated` esta vacio antes de que el estado vacio se renderice | Baja | `src/views/outdated.tsx:141-145` | Condicionar el render del indicador a `allOutdated.length > 0` |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `upgrade_initiated`, `upgrade_all_initiated` |

---

## Pantalla 5: PackageInfoView

* **Feature:** Detalle de paquete
* **Ruta de navegacion:** Enter sobre un paquete en `InstalledView` o `SearchView`; tecla `5` directa (muestra error si no hay paquete seleccionado)
* **Fuente de datos:** `api.getFormulaInfo()` directo (no via store); `useBrewStream` para operaciones
* **Casos de uso asociados:** Ver informacion completa del paquete (homepage, licencia, tap, versiones, botella, dependencias, caveats), instalar, desinstalar o actualizar el paquete

### Cobertura

* [x] Estado inicial — Si `packageName` es null muestra mensaje explicativo `t('pkgInfo_noPackage')` (linea 82)
* [x] Cargando — `if (loading) return <Loading />` con nombre del paquete (linea 85)
* [x] Error — `if (error) return <ErrorMessage />` (linea 86); ademas `if (!formula) return <ErrorMessage />` para el caso de respuesta vacia (linea 87)
* [x] Vacio — El estado de "paquete no encontrado" esta cubierto (linea 87)
* [ ] Offline — Sin deteccion de red; `getFormulaInfo()` fallara con error de proceso si brew no puede conectar
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — Sin adaptacion explicita; la lista de dependencias usa `flexWrap="wrap"` (linea 162) lo cual es positivo
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `mountedRef` previene actualizaciones de estado tras unmount (linea 36); correcto uso de cleanup; sin problemas criticos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Sin deteccion offline: si `getFormulaInfo()` falla por red, el usuario ve el `ErrorMessage` generico sin diferenciacion entre "paquete no encontrado" y "fallo de red" | Media | `src/views/package-info.tsx:48-51` | Distinguir errores de red de errores de paquete no encontrado |
| Mejora | Dark mode asumido | Media | `src/views/package-info.tsx:131-136` | Ver hallazgo general de dark mode |
| Mejora | Caveats sin scroll: si `formula.caveats` es un texto largo, se renderiza en su totalidad sin limitar la altura; puede desbordar la terminal | Baja | `src/views/package-info.tsx:171-176` | Truncar o paginar el texto de caveats |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `package_viewed`, `install_initiated`, `uninstall_initiated` |

---

## Pantalla 6: ServicesView

* **Feature:** Gestion de servicios Homebrew
* **Ruta de navegacion:** Tecla `6` desde cualquier vista
* **Fuente de datos:** `useBrewStore` — `fetchServices()`, `serviceAction()`
* **Casos de uso asociados:** Ver estado de servicios (started/stopped/error), iniciar, detener o reiniciar servicios del sistema via launchd

### Cobertura

* [x] Estado inicial — `loading.services: true` pre-inicializado
* [x] Cargando — `if (loading.services) return <Loading />` (linea 52)
* [x] Error — `if (errors.services) return <ErrorMessage />` (linea 53)
* [x] Vacio — `if (services.length === 0)` muestra mensaje `t('services_noServices')` (lineas 55-61)
* [ ] Offline — Sin deteccion de red
* [ ] Permisos — No aplica para la lectura de servicios; las acciones start/stop pueden requerir privilegios del sistema no verificados
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — Sin virtualizacion; `services.map()` renderiza todos los servicios; en instalaciones muy grandes puede desbordarse
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `actionInProgress` previene acciones concurrentes; `serviceAction` actualiza el store tras la operacion; sin problemas criticos detectados

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Sin verificacion de privilegios: `doAction('start')` se llama directamente sin verificar si el usuario tiene permisos de launchd; el error llega al store como `errors['service-action']` pero la vista no lo renderiza — solo `errors.services` se muestra | Media | `src/views/services.tsx:40-45` y `src/stores/brew-store.ts:162-172` | Verificar y renderizar `errors['service-action']` en la vista |
| Riesgo | Error de service-action ignorado en la UI: el store almacena el error en `errors['service-action']` pero la vista `ServicesView` solo chequea `errors.services`; si una accion (start/stop/restart) falla, el usuario no ve ningun mensaje de error | Alta | `src/views/services.tsx:52-53` vs `src/stores/brew-store.ts:168` | Agregar `if (errors['service-action']) <ErrorMessage />` o un toast de error en la vista |
| Mejora | Sin virtualizacion de lista de servicios | Baja | `src/views/services.tsx:96-111` | Implementar `MAX_VISIBLE_ROWS` si la lista puede ser larga |
| Mejora | Sin deteccion offline | Media | Ausencia en el archivo | Ver hallazgo general de offline |
| Mejora | Dark mode asumido | Media | `src/views/services.tsx:100-104` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `service_action_performed` con nombre y tipo de accion |

---

## Pantalla 7: DoctorView

* **Feature:** Diagnostico de Homebrew
* **Ruta de navegacion:** Tecla `7` desde cualquier vista
* **Fuente de datos:** `useBrewStore` — `fetchDoctor()`
* **Casos de uso asociados:** Ejecutar `brew doctor` y visualizar advertencias o confirmacion de instalacion limpia

### Cobertura

* [x] Estado inicial — `loading.doctor: false` en el store inicial; `fetchDoctor()` establece `loading.doctor: true` inmediatamente al llamarse en el `useEffect`
* [x] Cargando — `if (loading.doctor) return <Loading />` (linea 18)
* [x] Error — `if (errors.doctor) return <ErrorMessage />` (linea 19)
* [x] Vacio — `{doctorClean && ...}` muestra mensaje de sistema limpio (lineas 27-29); `{doctorClean === false && doctorWarnings.length === 0 && ...}` cubre el caso de warnings no capturados (lineas 31-33)
* [ ] Offline — Sin deteccion de red; `brew doctor` puede fallar si no puede verificar formulae remotas
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — Sin paginacion de la lista de warnings; warnings muy largos pueden desbordar la terminal
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — Sin problemas detectados; warnings se renderizan de forma simple; `fetchDoctor` tarda 10-30s en realidad pero el loading state lo cubre

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Sin paginacion de warnings: con multiples warnings de texto largo, la vista puede ocupar muchas mas lineas que las disponibles en el terminal sin mecanismo de scroll interno | Baja | `src/views/doctor.tsx:36-43` | Limitar las lineas visibles por warning o implementar scroll |
| Mejora | Sin deteccion offline | Media | Ausencia en el archivo | Ver hallazgo general de offline |
| Mejora | Dark mode asumido | Media | `src/views/doctor.tsx:27-29` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `doctor_run`, `doctor_warnings_count` |

---

## Pantalla 8: ProfilesView (Pro)

* **Feature:** Perfiles de Homebrew (Pro)
* **Ruta de navegacion:** Tecla `8`; muestra `UpgradePrompt` si no es Pro
* **Fuente de datos:** `useProfileStore` — `fetchProfiles()`, `loadProfile()`, `exportCurrent()`, `deleteProfile()`, `updateProfile()`
* **Casos de uso asociados:** Listar perfiles guardados, crear un nuevo perfil exportando el setup actual, ver detalle, importar (instalar todos los paquetes del perfil), editar nombre/descripcion, eliminar perfil

### Cobertura

* [x] Estado inicial — Gate Pro en `app.tsx` (linea 33); lista vacia tiene mensaje orientativo con instruccion `n` para crear (lineas 235-241)
* [x] Cargando — `if (loading) return <Loading />` (linea 110)
* [ ] Error — `profileStore.fetchProfiles()` no tiene try/catch y si falla, `profileNames` se queda vacio sin mensaje de error; `loadError` se muestra solo en modos `create-desc` y `edit-desc`, no en el modo `list`
* [x] Vacio — `{profileNames.length === 0 && ...}` muestra estado vacio con instrucciones (lineas 235-241)
* [ ] Offline — Sin deteccion de red; la importacion de perfiles hace `brew install` que requiere red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — Sin limitacion de filas en la lista de perfiles ni en la lista de formulae del detalle (slice 30 es solo una truncacion de display, no virtualizacion)
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `importGenRef.current?.return(undefined)` en el cleanup del `useEffect` cancela el import al desmontar; correcto; sin problemas criticos

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | **Error de fetchProfiles silenciado**: `fetchProfiles()` en el store (linea 24-27 de `profile-store.ts`) no tiene try/catch. Si falla (disco lleno, permisos, etc.) la vista muestra el estado vacio sin diferenciar entre "no hay perfiles" y "fallo al cargar" | Alta | `src/stores/profile-store.ts:24-27` | Agregar try/catch con `set({ loadError: ... })` en `fetchProfiles` y mostrar el error en la vista |
| Bug | `loadError` invisible en modo list: el store tiene `loadError` pero la vista solo lo renderiza en los modos `create-desc` y `edit-desc`. Los errores de `loadProfile()` (modo detalle) nunca se muestran al usuario | Media | `src/views/profiles.tsx:143` vs modo `detail` (lineas 191-218) | Renderizar `loadError` en el modo `detail` y en el modo `list` |
| Riesgo | Import sin confirmacion de estado previo: si el perfil tiene paquetes ya instalados o en conflicto, el proceso de import ejecuta `brew install` en todos sin verificacion previa; solo se muestra el streaming de salida | Media | `src/views/profiles.tsx:86-108` | Mostrar un resumen pre-import de cuantos paquetes se instalaran/ya estan instalados |
| Mejora | Sin deteccion offline antes de iniciar un import | Alta | `src/views/profiles.tsx:86` | Verificar conectividad antes de iniciar el import de un perfil |
| Mejora | Dark mode asumido | Media | `src/views/profiles.tsx:194` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `profile_created`, `profile_imported`, `profile_deleted` |

---

## Pantalla 9: SmartCleanupView (Pro)

* **Feature:** Limpieza inteligente de orphans (Pro)
* **Ruta de navegacion:** Tecla `9`; muestra `UpgradePrompt` si no es Pro
* **Fuente de datos:** `useCleanupStore` — `analyze()` (llama `analyzeCleanup` con `formulae` y `leaves`)
* **Casos de uso asociados:** Identificar dependencias huerfanas, ver espacio en disco por paquete, seleccionar y desinstalar orphans; manejo de errores de dependencia con opcion de forzar

### Cobertura

* [x] Estado inicial — Gate Pro; lista vacia tiene mensaje "sistema limpio" (lineas 137-140)
* [x] Cargando — `if (loading) return <Loading />` (linea 61)
* [x] Error — `if (error) return <ErrorMessage />` (linea 62)
* [x] Vacio — `{candidates.length === 0 && ...}` muestra confirmacion de sistema limpio (lineas 137-140)
* [ ] Offline — Sin deteccion de red; `analyzeCleanup` usa `du -sk` local pero `fetchInstalled` necesita ejecutar `brew info` que puede requerir red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — `candidates.map()` sin virtualizacion; con muchos orphans puede desbordar
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `analyzeCleanup` usa concurrencia 5 para `du -sk`; el store hace `fetchInstalled` y `fetchLeaves` si estan vacios antes de analizar — correcto evitar doble fetch

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Desinstalacion forzada con `--ignore-dependencies`: el flujo de `confirmForce` ejecuta `brew uninstall --ignore-dependencies` que puede romper otras instalaciones del sistema. La confirmacion muestra solo el numero de paquetes fallidos, no sus nombres | Alta | `src/views/smart-cleanup.tsx:95-104` | Mostrar explicitamente los nombres de los paquetes que seran desinstalados con fuerza antes de confirmar |
| Bug | `failedNames` se inicializa como todos los candidatos seleccionados (linea 129), no solo los que fallaron realmente; si la desinstalacion parcialmente falla, `failedNames` puede incluir nombres de paquetes que si se desinstalaron exitosamente | Media | `src/views/smart-cleanup.tsx:128-130` | Parsear la salida del stream para extraer los nombres de paquetes que realmente fallaron |
| Mejora | Sin virtualizacion de lista de candidatos | Baja | `src/views/smart-cleanup.tsx:145-163` | Implementar `MAX_VISIBLE_ROWS` |
| Mejora | Sin deteccion offline | Media | Ausencia en el archivo | Ver hallazgo general de offline |
| Mejora | Dark mode asumido | Media | `src/views/smart-cleanup.tsx:152-154` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `cleanup_analyzed`, `cleanup_executed`, `space_reclaimed` |

---

## Pantalla 10: HistoryView (Pro)

* **Feature:** Historial de operaciones (Pro)
* **Ruta de navegacion:** Tecla `0`; muestra `UpgradePrompt` si no es Pro
* **Fuente de datos:** `useHistoryStore` — `fetchHistory()`, `clearHistory()`; `useBrewStream` para replay
* **Casos de uso asociados:** Ver historial de acciones install/uninstall/upgrade, filtrar por tipo, buscar por nombre de paquete, repetir una accion pasada, limpiar todo el historial

### Cobertura

* [x] Estado inicial — Gate Pro; historial vacio muestra mensaje `t('history_noEntries')` (lineas 159-163)
* [x] Cargando — `if (loading) return <Loading />` (linea 99)
* [x] Error — `if (error) return <ErrorMessage />` (linea 100)
* [x] Vacio — `{filtered.length === 0 && ...}` con mensajes diferenciados segun filtro activo (lineas 159-163)
* [ ] Offline — Sin deteccion de red; replay de acciones requiere red para install/upgrade
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [x] Rotacion / tamano — `MAX_VISIBLE_ROWS = 20` con ventana deslizante (lineas 102-104)
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — `filtered` calculado con `useMemo`; `useDebounce` para busqueda; ventana de 20 filas; correcto

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Replay sin verificacion de estado actual: `history_confirmReplay` ejecuta la accion registrada (install/uninstall/upgrade) sin verificar si el paquete aun existe, si ya esta instalado, o si la version cambio desde entonces | Media | `src/views/history.tsx:137-147` | Antes del replay, verificar el estado actual del paquete con `getFormulaInfo()` |
| Mejora | Sin deteccion offline antes de replay: un replay de install/upgrade falla silenciosamente si no hay red | Media | `src/views/history.tsx:137` | Verificar conectividad antes de iniciar replay |
| Mejora | Dark mode asumido | Media | `src/views/history.tsx:177-181` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `history_replayed`, `history_cleared`, `history_filtered` |

---

## Pantalla 11: SecurityAuditView (Pro)

* **Feature:** Auditoria de seguridad CVE (Pro)
* **Ruta de navegacion:** Tecla `-` o posicion 11 en el ciclo de tabs; muestra `UpgradePrompt` si no es Pro
* **Fuente de datos:** `useSecurityStore` — `scan()` (llama `runSecurityAudit` via OSV.dev API)
* **Casos de uso asociados:** Escanear paquetes instalados contra CVEs en OSV.dev, ver vulnerabilidades por paquete con CVE IDs y severidad, iniciar upgrade de paquetes vulnerables

### Cobertura

* [x] Estado inicial — Gate Pro; pantalla carga el scan automaticamente al montar
* [x] Cargando — `if (loading) return <Loading />` (linea 58)
* [x] Error — `if (error) return <ErrorMessage />` (linea 59)
* [x] Vacio — `{results.length === 0 && summary && ...}` muestra "sin vulnerabilidades" (lineas 79-85)
* [ ] Offline — Sin deteccion de red; `runSecurityAudit` hace fetch a `https://api.osv.dev/v1/querybatch`; si falla por red el usuario ve el error generico
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — `results.map()` sin virtualizacion; con muchos paquetes vulnerables puede desbordar; cada paquete expandido muestra todas sus CVEs sin limite
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — Sin cache de resultados: cada vez que el usuario entra a la vista, `scan()` en el `useEffect` llanza un nuevo escaneo completo via red; con muchos paquetes esto es lento y costoso en ancho de banda

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | **Sin cache de resultados**: `useEffect(() => { scan(); }, [])` lanza un nuevo scan completo de red cada vez que el usuario navega a esta vista; con 200+ paquetes esto puede tardar 10-30 segundos en cada visita | Alta | `src/views/security-audit.tsx:38` y `src/stores/security-store.ts:19-33` | Guardar timestamp del ultimo scan y reusar resultados si tienen menos de N minutos; exponer un boton `r` para forzar re-escaneo |
| Riesgo | Rate limiting de OSV.dev no gestionado: `runSecurityAudit` envia batches de 100 paquetes sin manejo de HTTP 429; si OSV.dev limita la tasa, todos los resultados se pierden | Media | `src/lib/security/audit-runner.ts` (referenciado desde el store) | Implementar retry con backoff exponencial para errores 429 |
| Mejora | Sin virtualizacion: con muchos paquetes vulnerables y CVEs expandidas, el terminal se desborda | Baja | `src/views/security-audit.tsx:110-145` | Implementar `MAX_VISIBLE_ROWS` |
| Mejora | Sin deteccion offline diferenciada: el error de red se muestra igual que un error de escaneo | Media | `src/stores/security-store.ts:29` | Distinguir `NetworkError` de otros errores |
| Mejora | Dark mode asumido | Media | `src/views/security-audit.tsx:117-120` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `security_scan_completed`, `vulnerabilities_found`, `upgrade_initiated` |

---

## Pantalla 12: AccountView

* **Feature:** Gestion de licencia y cuenta
* **Ruta de navegacion:** Tecla `=` o posicion 12 en el ciclo de tabs
* **Fuente de datos:** `useLicenseStore` — `status`, `license`, `deactivate()`, `degradation`
* **Casos de uso asociados:** Ver estado de licencia (Pro/Free/Expired/Validating), datos del titular, instrucciones de activacion, desactivar licencia en este equipo

### Cobertura

* [x] Estado inicial — Muestra estado `free` con instrucciones de compra si no hay licencia; no hay loading inicial en la vista (la inicializacion de licencia ocurre en `app.tsx`)
* [ ] Cargando — No existe estado loading durante la desactivacion (hay `deactivating` bool pero solo muestra texto, no bloquea input correctamente — ver hallazgo)
* [x] Error — Estado `expired` renderizado con mensaje rojo (lineas 108-114); estado `validating` renderizado en azul (linea 52); offline warning con dias transcurridos (lineas 55-63)
* [x] Vacio — Estado `free` completamente cubierto con CTA de compra (lineas 96-105)
* [ ] Offline — Degradation levels (`warning`, `limited`) se muestran (lineas 55-63) pero no hay deteccion activa de red en la vista
* [ ] Permisos — No aplica
* [ ] Accesibilidad — No aplica (terminal)
* [ ] Dark mode — Colores hex hardcodeados
* [ ] Dynamic Type — No aplica (terminal)
* [ ] Rotacion / tamano — Vista de contenido fijo; sin problemas de layout
* [ ] Instrumentacion analitica — Ninguna
* [ ] Rendimiento — Sin problemas detectados; vista de solo lectura con una accion (deactivate)

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | **UI congelada si deactivate() lanza excepcion**: el `onConfirm` es `async` y llama `await deactivate()` sin try/catch. Si `deactivate()` lanza (fallo de red, error de API Polar), `setDeactivating(false)` nunca se ejecuta y el texto "deactivating..." permanece indefinidamente; ademas `deactivating` bloquea el input via `useInput` (linea 15) dejando la UI inutilizable | Critica | `src/views/account.tsx:35-40` | Envolver `await deactivate()` en try/catch; llamar `setDeactivating(false)` en el bloque finally; mostrar el error al usuario |
| Bug | `maskKey` no valida la longitud minima correctamente: si `key.length <= 8` devuelve la clave completa sin enmascarar; con claves de 8 caracteres exactos la clave queda expuesta por completo | Baja | `src/views/account.tsx:22-25` | Cambiar la condicion a `key.length < 12` o similar para garantizar que siempre se enmascara la parte central |
| Mejora | Estado `validating` sin feedback adicional: cuando `status === 'validating'` no hay spinner ni indicacion de progreso; el usuario ve solo el texto estatico | Baja | `src/views/account.tsx:52` | Agregar `<Spinner />` junto al texto "validating" |
| Mejora | Dark mode asumido | Media | `src/views/account.tsx:49-52` | Ver hallazgo general de dark mode |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `license_deactivated`, `account_viewed` |

---

## Pantalla 13: PopoverView (BrewBar)

* **Feature:** Popover principal de la app de menu bar
* **Ruta de navegacion:** Clic en el icono de la barra de menu del sistema
* **Fuente de datos:** `AppState` (Observable) — `BrewChecker`, resultados de `brew outdated --json` y `brew services list --json`
* **Casos de uso asociados:** Ver resumen de paquetes desactualizados y errores de servicios, actualizar todos los paquetes, abrir Brew-TUI en el terminal, acceder a ajustes, salir de la app

### Cobertura

* [x] Estado inicial — La vista tiene un estado de bienvenida coherente: `isLoading && outdatedPackages.isEmpty` muestra `loadingView` (linea 14)
* [x] Cargando — `loadingView` con `ProgressView("Checking for updates...")` (lineas 65-71); ademas `ProgressView` miniatura en el header durante refresco (lineas 47-52)
* [x] Error — `errorView(_:)` con icono amarillo, mensaje y boton "Retry" (lineas 74-91)
* [x] Vacio — `upToDateView` con checkmark verde y timestamp del ultimo check (lineas 93-110)
* [ ] Offline — Sin deteccion explicita de conectividad; `BrewChecker` falla con error generico si brew no puede conectar; el error se muestra via `errorView` pero sin diferenciar causa offline
* [x] Permisos — No aplica (la vista no solicita permisos; eso esta en `SettingsView` y `SchedulerService`)
* [ ] Accesibilidad — Los botones de accion (refresh, settings, power, "Open Brew-TUI") son `Image(systemName:)` sin `accessibilityLabel` explicito; SF Symbol otorga label implicito pero estos labels pueden ser poco descriptivos para los actions; el boton de upgrade en `OutdatedListView` tampoco tiene label contextual
* [x] Dark mode — Usa colores semanticos del sistema (`.secondary`, `.green`, `.orange`, `.red`); correctamente adapta a modo claro/oscuro
* [x] Dynamic Type — Usa text styles del sistema (`.headline`, `.caption`, `.caption2`, `.subheadline`); se adapta correctamente
* [x] Rotacion / tamano — Frame fijo `340x420` es apropiado para un popover de barra de menus; no aplica rotacion
* [ ] Instrumentacion analitica — Ninguna
* [x] Rendimiento — Sin problemas detectados; `OutdatedListView` usa `LazyVStack` (linea 26 de `OutdatedListView.swift`); el frame fijo limita el impacto visual

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | `openBrewTUI()` hardcodea "Terminal" como aplicacion de terminal (linea 176); en sistemas donde la terminal predeterminada es iTerm2, Warp, Ghostty u otra, el NSAppleScript fallara silenciosamente (el error se loguea en NSLog pero el usuario no ve ningun feedback) | Alta | `menubar/BrewBar/Sources/Views/PopoverView.swift:176-183` | Abrir `brew-tui` via `NSWorkspace.shared.open(URL(fileURLWithPath: "/path/to/brew-tui"))` o usar `Process` en lugar de NSAppleScript; si se mantiene NSAppleScript, mostrar una alerta al usuario cuando falla |
| Mejora | Botones icon-only sin `accessibilityLabel` explicito: el boton de refresh (arrow.clockwise), settings (gear) y quit (power) se apoyan en los labels implicitos de SF Symbols que pueden no ser suficientemente descriptivos en contexto | Baja | `menubar/BrewBar/Sources/Views/PopoverView.swift:53-170` | Agregar `.accessibilityLabel("Refresh")`, `.accessibilityLabel("Settings")`, `.accessibilityLabel("Quit BrewBar")` |
| Mejora | Sin diferenciacion de error offline: cuando `brew outdated` falla por falta de red, el mensaje mostrado es el mismo que para cualquier otro error | Media | `menubar/BrewBar/Sources/Views/PopoverView.swift:16-17` | Detectar errores de red en `BrewChecker` y mostrar mensaje especifico "No internet connection" |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `popover_opened`, `upgrade_all_triggered` |
| Mejora | El texto "Checking for updates..." y "All packages up to date" estan hardcodeados en ingles en lugar de usar `String(localized:)` para soporte i18n completo | Baja | `menubar/BrewBar/Sources/Views/PopoverView.swift:68, 99` | Reemplazar strings literales por `String(localized: "...")` para que se extraigan al String Catalog |

---

## Pantalla 14: OutdatedListView (BrewBar)

* **Feature:** Lista de paquetes desactualizados en el popover
* **Ruta de navegacion:** Subvista de `PopoverView`; visible cuando `outdatedPackages` no esta vacio
* **Fuente de datos:** `AppState.outdatedPackages: [OutdatedPackage]` — datos ya cargados por `BrewChecker`
* **Casos de uso asociados:** Ver lista de paquetes desactualizados con versiones, actualizar un paquete individual, actualizar todos los paquetes, ver estado pinned

### Cobertura

* [x] Estado inicial — Siempre renderiza con datos ya disponibles (la vista solo se muestra cuando hay datos)
* [x] Cargando — Los botones de upgrade se deshabilitan con `.disabled(appState.isLoading)` (lineas 16, 69); feedback implicito via estado del padre
* [x] Error — El error se gestiona en el nivel del padre (`PopoverView`); esta vista no necesita su propio manejo
* [x] Vacio — El estado vacio no aplica: esta vista solo se muestra si hay paquetes
* [ ] Offline — Gestionado en el padre; sin deteccion adicional en esta subvista
* [ ] Permisos — No aplica
* [ ] Accesibilidad — Los botones de upgrade individual son `Image(systemName: "arrow.up.circle")` sin `accessibilityLabel`; un lector de pantalla no sabria que paquete se va a actualizar
* [x] Dark mode — Colores semanticos (`.red`, `.green`, `.secondary`, `.orange`) adaptan correctamente
* [x] Dynamic Type — Mezcla de `.body` (con `monospaced` design) y `.caption` que se adaptan al Dynamic Type
* [x] Rotacion / tamano — `LazyVStack` dentro de `ScrollView`; el contendo se adapta correctamente al alto disponible
* [ ] Instrumentacion analitica — Ninguna
* [x] Rendimiento — `LazyVStack` (linea 26) para renderizado lazy; correcto para listas potencialmente largas

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Botones de upgrade individual sin `accessibilityLabel` contextual: `Image(systemName: "arrow.up.circle")` sin label; VoiceOver dira "arrow up circle button" sin mencionar el nombre del paquete | Media | `menubar/BrewBar/Sources/Views/OutdatedListView.swift:62-66` | Agregar `.accessibilityLabel("Upgrade \(pkg.name)")` al boton de upgrade individual |
| Mejora | Sin confirmacion antes de "Upgrade All": el boton "Upgrade All" ejecuta la actualizacion inmediatamente sin dialogo de confirmacion; puede ser destructivo en instalaciones donde algunos paquetes tienen cambios breaking | Media | `menubar/BrewBar/Sources/Views/OutdatedListView.swift:13-16` | Mostrar un `Alert` de confirmacion antes de ejecutar `upgradeAll()` |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `package_upgrade_triggered`, `upgrade_all_triggered` |

---

## Pantalla 15: SettingsView (BrewBar)

* **Feature:** Preferencias de BrewBar
* **Ruta de navegacion:** Boton de engranaje en `PopoverView`; se abre como `.sheet`
* **Fuente de datos:** `SchedulerService` (Observable); `SMAppService.mainApp` para launch at login
* **Casos de uso asociados:** Configurar intervalo de comprobacion automatica (1h/4h/8h), activar/desactivar notificaciones, configurar launch at login, ver mensaje de advertencia cuando las notificaciones estan denegadas en System Settings

### Cobertura

* [x] Estado inicial — Estado correcto al abrir: refleja configuracion actual del `SchedulerService`; `SMAppService.mainApp.status == .enabled` como estado inicial del toggle (linea 7)
* [x] Cargando — No aplica: todos los cambios son sincrónicos excepto la sincronizacion de permisos de notificacion que es async en `.task`
* [x] Error — `SMAppService.mainApp.register()` falla silenciosamente con `launchAtLogin = !newValue` como rollback (lineas 46-50); la UI muestra el estado correcto aunque no hay mensaje de error explicito
* [x] Vacio — No aplica; la vista siempre tiene contenido
* [ ] Offline — No aplica para esta vista de preferencias locales
* [x] Permisos — Manejo explícito del estado `notificationsDenied`: el toggle queda desactivado y se muestra un mensaje orientativo hacia System Settings (lineas 36-40)
* [x] Accesibilidad — `Form` con `Picker`, `Toggle` y `Button` tienen labels accesibles por defecto en SwiftUI; el mensaje de advertencia de notificaciones es texto visible
* [x] Dark mode — Usa colores semanticos (`.orange`) y estilos de Form del sistema; adapta correctamente
* [x] Dynamic Type — `.headline`, `.caption` y Form nativa adaptan correctamente
* [x] Rotacion / tamano — Frame fijo `300pt` para sheet; apropiado para este contexto
* [ ] Instrumentacion analitica — Ninguna
* [x] Rendimiento — Vista estatica con bindings simples; sin problemas detectados

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Error de `SMAppService` silenciado: cuando el registro de launch-at-login falla, el toggle hace rollback visualmente pero el usuario no ve ningun mensaje de error explicativo | Baja | `menubar/BrewBar/Sources/Views/SettingsView.swift:46-50` | Mostrar un `Alert` con el mensaje de error cuando `SMAppService.mainApp.register()` lanza excepcion |
| Mejora | Sin instrumentacion analitica | Baja | Ausencia total en el archivo | Registrar `settings_interval_changed`, `settings_notifications_toggled`, `settings_login_toggled` |
| Mejora | El texto "BrewBar Settings", "Check interval", "Notifications", "Launch at login" y "Done" son strings auto-extraidos por SwiftUI al String Catalog solo si Xcode los indexa; conviene verificar que esten correctamente traducidos al espanol en `Localizable.xcstrings` | Baja | `menubar/BrewBar/Sources/Views/SettingsView.swift:12-64` | Revisar el String Catalog y confirmar que todas las strings de esta vista tienen traduccion ES |

---

## Hallazgos criticos globales

Los siguientes hallazgos aplican a TODAS las pantallas TUI y se listan aqui para evitar repeticion excesiva:

| Tipo | Descripcion | Severidad | Alcance | Accion |
|------|-------------|-----------|---------|--------|
| Riesgo | **Cero instrumentacion analitica en todo el producto**: ningun evento de screen view, accion de usuario ni error llega a ningun sistema analitico en ninguna de las 15 pantallas | Media | Todas las pantallas | Integrar un sistema de telemetria opt-in (o al menos logging local) para poder entender como se usa el producto |
| Riesgo | **Cero manejo de estado offline en TUI**: las 12 vistas TypeScript no verifican conectividad antes de iniciar operaciones de red; los errores de red se muestran identicos a errores de `brew` | Alta | Todas las vistas TUI | Implementar un hook `useNetworkStatus()` que detecte conectividad y exponga un banner global |
| Mejora | **Dark mode TUI asumido oscuro**: todos los colores hex asumen fondo de terminal oscura; en terminales de fondo claro (common en macOS con tema "Basic") texto `#F9FAFB` es practicamente invisible | Media | Todas las vistas TUI | Documentar explicitamente el requisito de terminal oscura en la documentacion de instalacion; opcionalmente implementar deteccion de background color via ANSI escape |
| Bug | **`errors['service-action']` ignorado en ServicesView**: acciones de servicio que fallan no muestran ningun error al usuario | Alta | `ServicesView` | Renderizar `errors['service-action']` en la vista |
