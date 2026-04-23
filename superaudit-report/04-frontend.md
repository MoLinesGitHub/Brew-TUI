# 5. Auditoria UI estructural

> Auditor: frontend-auditor | Fecha: 2026-04-22

## Resumen ejecutivo

El proyecto tiene dos codebases con filosofias de UI radicalmente distintas: la TUI en TypeScript/React/Ink es una aplicacion de terminal sin DOM ni CSS, y BrewBar es una app SwiftUI convencional para macOS. La arquitectura TUI es solida en su mayor parte — routing por switch, gate de features Pro centralizado, modal-store con conteo de referencias — pero presenta deuda tecnica relevante en navegacion hacia atras (historial inutilizado), hardcoding de dimensiones de layout, identidades inestables en ForEach/map, y una vista de busqueda que silencia errores. BrewBar es pequeña, bien estructurada y con buena cobertura de previews, pero hardcodea el nombre de la aplicacion de terminal, limitando compatibilidad.

---

## 5.1 Jerarquia de vistas

### Checklist

* [x] Root views identificadas
* [x] Contenedores claros
* [x] Navegacion consistente
* [ ] Separacion entre layout y comportamiento
* [x] Subvistas extraidas por intencion de dominio
* [ ] No hay vistas gigantes dificiles de mantener

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Root view TUI (`app.tsx`) mezcla routing, Pro gate, y efecto de inicializacion de licencia | No conforme | Media | `src/app.tsx:10-20` — `useEffect(() => { initLicense(); }, [])` con dep array incompleto, `renderView()` con switch de 12 casos, y logica Pro gate, todo en el mismo componente | Extraer `<LicenseInitializer>` como componente separado; extraer `renderView` a un `ViewRouter` independiente |
| `ProfilesView` supera 300 lineas y contiene una maquina de estados de 7 modos dentro del `body` del componente | No conforme | Media | `src/views/profiles.tsx` — ~320 LOC con estados `list \| detail \| create \| edit \| apply \| confirm-delete \| import` gestionados con condicionales anidados | Extraer cada modo como subcomponente (`ProfileList`, `ProfileDetail`, `ProfileForm`, `ProfileImport`) |
| `SmartCleanupView` (~270 LOC) concentra logica de recuperacion de dependencias fallidas, dos fases de confirmacion, y streaming en el mismo cuerpo | Parcial | Baja | `src/views/smart-cleanup.tsx` — `failedNames`, `showForceConfirm`, `showConfirm`, `stream` gestionados sin separacion | Extraer logica de recuperacion de dependencias a hook `useCleanupFlow` |
| BrewBar: vistas Swift bien separadas por dominio (PopoverView, OutdatedListView, SettingsView) | Conforme | — | `menubar/BrewBar/Sources/Views/` | — |

---

## 5.2 Navegacion

### Checklist

* [x] NavigationStack / Tabs / Sheets coherentes
* [ ] Rutas reproducibles
* [ ] Deep links contemplados
* [ ] Estados de navegacion restaurables si aplica
* [ ] No hay doble presentacion de sheets/alerts
* [ ] Back navigation coherente

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `goBack()` solo vuelve 1 nivel aunque `viewHistory` acumula hasta 20 entradas — el historial nunca se consume | No conforme | Alta | `src/stores/navigation-store.ts` — `goBack()` intercambia `currentView` y `previousView` sin hacer pop de `viewHistory`; `viewHistory.push()` es letra muerta | Reemplazar la logica de `goBack()` por `viewHistory.pop()`: `const prev = viewHistory.at(-1); set({ currentView: prev, viewHistory: viewHistory.slice(0,-1) })` |
| Rutas por string ad-hoc: `ViewId` es una union de strings literales sin tipado de parametros de ruta | Parcial | Baja | `src/lib/types.ts` — `type ViewId = 'dashboard' \| 'installed' \| ...` — funcional pero sin soporte para parametros tipados (p.ej. navegar a `package-info` requiere set separado de `selectedPackage`) | Aceptable para el alcance actual; documentar el patron en CLAUDE.md como convencion consciente |
| Deep links: no contemplados — la TUI es una CLI sin URL scheme; BrewBar tampoco registra URL scheme | No aplica | — | Producto terminal/menubar — no hay URL scheme esperado | — |
| `package-info` requiere que `selectedPackage` este pre-cargado en el navigation store antes de navegar — acoplamiento fragil | Parcial | Media | `src/stores/navigation-store.ts` `setSelectedPackage()` + `src/views/package-info.tsx:12` `const { packageName }` | Incluir el nombre del paquete como payload de navegacion en `navigate('package-info', { packageName })` en lugar de estado lateral |
| BrewBar: `.sheet(isPresented: $showSettings)` — unica sheet, sin conflicto | Conforme | — | `menubar/BrewBar/Sources/Views/PopoverView.swift:30` | — |

---

## 5.3 Estados visuales por pantalla

### Pantallas auditadas

#### DashboardView

* **Ruta:** `src/views/dashboard.tsx`
* [x] Estado inicial — loading guard con `<Loading>`
* [x] Cargando — `Loading` component renderizado
* [x] Vacio — 0 stats se muestra correctamente (valores numericos en cero)
* [x] Error recuperable — `<ErrorMessage>` + hint `r` para refresh
* [ ] Error fatal — no distingue errores fatales de recuperables
* [ ] Sin conexion — no detectado; brew offline pasa como error generico
* [x] Datos parciales — stats individuales con su propio loading por key
* [ ] Permiso denegado — No aplica (brew no requiere permisos especiales)
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — No aplica
* [ ] Destructivo — No aplica
* [ ] Accesibilidad validada — No aplica (terminal, sin VoiceOver)
* [ ] Dark mode validado — No aplica (terminal)
* [ ] Dynamic Type validado — No aplica (terminal)

#### InstalledView

* **Ruta:** `src/views/installed.tsx`
* [x] Estado inicial — pre-loading flags en brew-store evitan flash
* [x] Cargando — `<Loading>` guard
* [x] Vacio — empty state renderizado ("No packages installed")
* [x] Error recuperable — `<ErrorMessage>` mostrado
* [ ] Error fatal — no distingue
* [ ] Sin conexion — no aplica a paquetes instalados (datos locales)
* [x] Datos parciales — lista parcial funcional
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica (uninstall in-place con confirmacion)
* [x] Confirmacion — confirmacion de uninstall presente
* [x] Destructivo — uninstall visualmente separado, con confirmacion
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### SearchView

* **Ruta:** `src/views/search.tsx`
* [x] Estado inicial — campo de busqueda vacio, sin resultados
* [x] Cargando — `isSearching` flag con `<Loading>`
* [x] Vacio — "No results found" cuando resultados vacios
* [ ] Error recuperable — **CRITICO**: errores de `doSearch` silenciados con `void err`; usuario ve "No results" en lugar de mensaje de error
* [ ] Error fatal — no distingue
* [ ] Sin conexion — error silenciado, indistinguible de busqueda sin resultados
* [x] Datos parciales — formulae/casks mostrados independientemente
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — No aplica
* [ ] Destructivo — No aplica
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### OutdatedView

* **Ruta:** `src/views/outdated.tsx`
* [x] Estado inicial — loading guard
* [x] Cargando — `<Loading>`
* [x] Vacio — "All packages up to date" con borde verde
* [x] Error recuperable — `<ErrorMessage>`
* [ ] Error fatal — no distingue
* [x] Sin conexion — brew offline resulta en error que se muestra
* [x] Datos parciales — lista parcial funcional
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — upgrade individual y upgrade-all con confirmacion
* [x] Destructivo — No aplica (upgrade no es destructivo)
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### PackageInfoView

* **Ruta:** `src/views/package-info.tsx`
* [x] Estado inicial — guard para `packageName` ausente
* [x] Cargando — loading guard con `<Loading>`
* [x] Vacio — "Package not found" cuando formula/cask no existe
* [x] Error recuperable — `<ErrorMessage>`
* [ ] Error fatal — no distingue
* [ ] Sin conexion — error generico
* [x] Datos parciales — muestra campos disponibles aunque otros fallen
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — install/uninstall/upgrade con confirmacion
* [x] Destructivo — uninstall visualmente separado
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### ServicesView

* **Ruta:** `src/views/services.tsx`
* [x] Estado inicial — loading guard
* [x] Cargando — `<Loading>`
* [x] Vacio — empty state renderizado
* [x] Error recuperable — `<ErrorMessage>`
* [ ] Error fatal — no distingue
* [ ] Sin conexion — No aplica (servicios locales)
* [x] Datos parciales — servicios individuales con estado propio
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — **stop y restart tienen confirmacion; start NO tiene confirmacion**
* [x] Destructivo — stop es destructivo y tiene confirmacion
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### DoctorView

* **Ruta:** `src/views/doctor.tsx`
* [x] Estado inicial — loading guard
* [x] Cargando — `<Loading>` con mensaje de espera
* [x] Vacio — "All checks passed" cuando sin warnings
* [x] Error recuperable — `<ErrorMessage>`
* [ ] Error fatal — no distingue
* [ ] Sin conexion — error generico
* [ ] Datos parciales — No aplica (doctor es atomico)
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — No aplica (solo lectura)
* [ ] Destructivo — No aplica
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### ProfilesView (Pro)

* **Ruta:** `src/views/profiles.tsx`
* [x] Estado inicial — loading guard
* [x] Cargando — `<Loading>`
* [x] Vacio — empty state "No profiles yet"
* [x] Error recuperable — `<ErrorMessage>` para loadError
* [ ] Error fatal — no distingue
* [ ] Sin conexion — No aplica (datos locales)
* [ ] Datos parciales — No aplica
* [ ] Permiso denegado — gated por Pro, no por permisos de sistema
* [x] Modo edicion — modo `edit` implementado
* [x] Confirmacion — confirm-delete implementado
* [x] Destructivo — delete con doble confirmacion
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### SmartCleanupView (Pro)

* **Ruta:** `src/views/smart-cleanup.tsx`
* [x] Estado inicial — loading guard
* [x] Cargando — `<Loading>`
* [x] Vacio — "Nothing to clean up"
* [x] Error recuperable — `<ErrorMessage>`
* [ ] Error fatal — no distingue
* [ ] Sin conexion — No aplica (brew local)
* [x] Datos parciales — lista parcial de paquetes a limpiar
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — cleanup con confirmacion
* [x] Destructivo — force uninstall con doble confirmacion
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### HistoryView (Pro)

* **Ruta:** `src/views/history.tsx`
* [x] Estado inicial — loading guard
* [x] Cargando — `<Loading>`
* [x] Vacio — "No history yet"
* [x] Error recuperable — `<ErrorMessage>`
* [ ] Error fatal — no distingue
* [ ] Sin conexion — No aplica (datos locales)
* [x] Datos parciales — entradas parciales visibles
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — clear history con confirmacion
* [x] Destructivo — clear all con confirmacion
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### SecurityAuditView (Pro)

* **Ruta:** `src/views/security-audit.tsx`
* [x] Estado inicial — auto-scan al montar
* [x] Cargando — `<Loading>` durante scan
* [x] Vacio — "No vulnerabilities found"
* [x] Error recuperable — `<ErrorMessage>` + hint `r` para re-scan manual
* [ ] Error fatal — no distingue
* [ ] Sin conexion — error generico de OSV.dev API
* [x] Datos parciales — vulnerabilidades parciales mostradas
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — upgrade individual sin confirmacion previa al streaming
* [x] Destructivo — No aplica
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### AccountView

* **Ruta:** `src/views/account.tsx`
* [ ] Estado inicial — **status arranca como `'free'` antes de validacion; no hay estado "checking"** — usuario puede ver "Free" brevemente aunque sea Pro
* [x] Cargando — estado `validating` renderizado con color cyan
* [ ] Vacio — No aplica
* [ ] Error recuperable — no hay estado de error de licencia en esta vista
* [ ] Error fatal — no aplica
* [ ] Sin conexion — degradation warning presente (offline grace)
* [ ] Datos parciales — sin `license` object, solo muestra status
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — deactivation con confirmacion
* [x] Destructivo — deactivation con confirmacion
* [ ] Accesibilidad validada — No aplica
* [ ] Dark mode validado — No aplica
* [ ] Dynamic Type validado — No aplica

#### BrewBar: PopoverView

* **Ruta:** `menubar/BrewBar/Sources/Views/PopoverView.swift`
* [x] Estado inicial — estado `loading` renderizado
* [x] Cargando — `ProgressView` en estado loading
* [x] Vacio — "All packages up to date" con checkmark
* [x] Error recuperable — estado `error` con mensaje + boton Retry
* [ ] Error fatal — no distingue fatal de recuperable
* [ ] Sin conexion — error generico (brew offline = error)
* [x] Datos parciales — lista de outdated parcial visible
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — upgrade-all presente
* [x] Destructivo — No aplica (upgrade no es destructivo)
* [x] Accesibilidad validada — SwiftUI infiere labels de Text/Button
* [x] Dark mode validado — usa colores semanticos de SwiftUI
* [x] Dynamic Type validado — Text sin tamaños fijos

#### BrewBar: SettingsView

* **Ruta:** `menubar/BrewBar/Sources/Views/SettingsView.swift`
* [x] Estado inicial — valores del AppState cargados
* [ ] Cargando — No aplica (settings sincrono)
* [ ] Vacio — No aplica
* [ ] Error recuperable — notificaciones denegadas: caption informativo presente
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [ ] Datos parciales — No aplica
* [x] Permiso denegado — estado "notifications denied" con caption
* [x] Modo edicion — Form editable directamente
* [ ] Confirmacion — No aplica
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — Form + Picker + Toggle con labels semanticos
* [x] Dark mode validado — colores semanticos
* [x] Dynamic Type validado — Form nativo

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `SearchView`: errores de `doSearch` silenciados con `void err` | No conforme | Alta | `src/views/search.tsx` bloque catch — `setResults({ formulae: [], casks: [] }); void err;` | Reemplazar `void err` por `setError(err instanceof Error ? err.message : String(err))` y renderizar `<ErrorMessage>` cuando `error !== null` |
| `AccountView`: estado inicial muestra `'free'` antes de que se complete la validacion de licencia | No conforme | Media | `src/stores/license-store.ts` — estado inicial `status: 'free'` antes de `initialize()`; `src/views/account.tsx:49-51` | Inicializar `status` como `'validating'` en el store hasta que `initialize()` complete la primera verificacion |
| `ServicesView`: accion `start` sin dialogo de confirmacion (stop y restart si tienen confirmacion) | No conforme | Media | `src/views/services.tsx` — handler de `Enter` para `start` llama directamente a `startService()` sin `<ConfirmDialog>` | Agregar confirmacion para `start` con el mismo patron que `stop`/`restart` |
| `SecurityAuditView`: upgrade individual ejecuta streaming sin confirmacion previa | Parcial | Baja | `src/views/security-audit.tsx` — `Enter` en vuln seleccionada lanza `stream.run(['upgrade', pkg])` sin confirm | Agregar `<ConfirmDialog>` antes de iniciar el upgrade desde security-audit |
| Ninguna vista distingue errores fatales de errores recuperables — siempre se usa el mismo `<ErrorMessage>` | Parcial | Baja | Patron uniforme en todas las vistas `src/views/*.tsx` | Clasificar errores en brew-store con `isFatal` flag; renderizar mensaje diferenciado en vistas criticas |

---

## 5.4 Layout y adaptabilidad

### Checklist

* [ ] iPhone pequeno — No aplica (TUI es terminal, no iOS)
* [ ] iPhone grande — No aplica
* [ ] iPad portrait — No aplica
* [ ] iPad landscape — No aplica
* [ ] Multitarea — No aplica
* [ ] Mac idiom — BrewBar: conforme; TUI: limitado por hardcoding
* [ ] Safe areas correctas — No aplica (TUI); BrewBar: conforme (NSPopover fixed frame)
* [ ] Keyboard avoidance correcto — No aplica (TUI es teclado); BrewBar: No aplica (no hay text input en popover)
* [ ] Scroll correcto con contenido grande — Parcial (ver hallazgos)
* [ ] Rotacion correcta — No aplica (TUI terminal; BrewBar no rota)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `MAX_VISIBLE_ROWS = 20` hardcodeado en `installed.tsx`, `history.tsx`, y `outdated.tsx` — en terminales pequeñas (<22 filas) el contenido desborda o queda cortado | No conforme | Alta | `src/views/installed.tsx:15`, `src/views/history.tsx:18`, `src/views/outdated.tsx:13` | Usar `useStdout()` de Ink para obtener `stdout.rows` dinamicamente: `const maxRows = Math.max(5, (stdout?.rows ?? 24) - 8)` |
| `padEnd(27)`, `padEnd(12)`, `padEnd(20)` hardcodeados para columnas de tablas — en terminales de menos de 80 columnas los valores se truncan o desfasan | No conforme | Media | `src/views/installed.tsx` — `pkg.name.padEnd(27)`, `src/views/services.tsx` — `svc.name.padEnd(20)` | Calcular anchos de columna a partir de `stdout.columns` con `useStdout()`; usar fraccion del total (ej. 35% nombre, 20% version) |
| `UpgradePrompt` usa `width="80%"` — en terminales muy estrechas (<40 cols) el border box puede sobrepasar el ancho disponible | Parcial | Baja | `src/components/common/upgrade-prompt.tsx:29` | Agregar guard: `Math.min(Math.floor(columns * 0.8), columns - 4)` |
| BrewBar: `.frame(width: 340, height: 420)` fijo en NSPopover | Conforme | — | `menubar/BrewBar/Sources/Views/PopoverView.swift:10` — apropiado para NSPopover; macOS gestiona el safe area del status bar | — |

---

# 9. Motion y percepcion de velocidad

> Auditor: frontend-auditor | Fecha: 2026-04-22

## 9.1 Transiciones

### Checklist

* [ ] Las transiciones comunican cambio de estado — Parcial (TUI no tiene animaciones; BrewBar minimal)
* [x] No hay animacion gratuita — correcto, ninguna animacion decorativa innecesaria
* [x] Las duraciones son consistentes — BrewBar usa duraciones de sistema
* [x] Las curvas son coherentes — BrewBar usa curvas de sistema SwiftUI
* [ ] No hay jank perceptible — riesgo en GradientText (ver hallazgos)
* [ ] Reduced Motion respetado — No aplica en TUI; BrewBar no usa animaciones custom

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| TUI no implementa animaciones — Ink/terminal no soporta CSS transitions; el re-render completo del `body` en cada keystroke reemplaza el contenido sin transicion | Conforme | — | Comportamiento esperado en terminal UI; no es un defecto | — |
| `GradientText` crea un nodo `<Text>` por caracter — logo ASCII genera ~258 nodos React — cada re-render de Header (cualquier cambio en navigation-store) reconcilia 258 elementos | No conforme | Alta | `src/utils/gradient.tsx` — `chars.map((char, i) => <Text key={i} color={...}>{char}</Text>)`; header.tsx usa GradientText para LOGO_BREW (28ch × 6 filas) + LOGO_TUI (~15ch × 6 filas) | Memoizar `GradientText` con `React.memo`; o pre-renderizar el logo como string ANSI estático con `chalk` y usar un solo `<Text>` |
| BrewBar: no usa animaciones custom — todas las transiciones son del sistema (sheet presentation, ProgressView) | Conforme | — | `menubar/BrewBar/Sources/Views/` — sin `.animation()`, sin `.transition()` custom | — |

---

## 9.2 Percepcion de rendimiento

### Checklist

* [ ] Skeletons correctos — no hay skeletons; se usa spinner centralizado
* [x] Loaders adecuados al contexto — spinner para operaciones cortas, ProgressLog para streaming
* [ ] Optimistic UI justificada — no hay optimistic UI (correcto para CLI operations)
* [ ] Prefetch donde aporta valor — `fetchAll()` en dashboard hace prefetch paralelo; vistas Pro no prefetchean
* [x] Placeholders evitan vacio abrupto — brew-store pre-inicializa flags de loading a `true`
* [ ] Haptics coherentes y no invasivos — No aplica (TUI terminal); BrewBar no usa haptics

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| No hay skeleton views — el spinner `<Loading>` no preserva la estructura visual de la pantalla; en listas largas, el cambio de spinner a contenido es abrupto | Parcial | Baja | `src/components/common/loading.tsx` — solo `<Spinner>` + label; ninguna vista tiene skeleton placeholder | Para terminal, un skeleton ASCII de líneas vacias (ej. `░░░░░░░░░░ loading...`) seria suficiente en vistas de lista criticas (installed, outdated) |
| `SecurityAuditView` hace auto-scan en mount — el usuario ve un spinner durante el scan de OSV.dev en cada apertura de la vista aunque los datos no hayan cambiado | Parcial | Baja | `src/views/security-audit.tsx:useEffect(() => { scan(); }, [])` — scan incondicionalen mount | Cachear resultado del ultimo scan con timestamp en security-store; re-escanear solo si >N minutos desde ultimo scan |
| `AccountView`: transicion de estado `'validating'` a `'pro'`/`'free'` es instantanea sin indicador de progreso previo a la inicializacion | Parcial | Media | `src/stores/license-store.ts` — estado inicial `'free'` antes de que `initialize()` sea llamado; la TUI puede mostrar estado incorrecto durante startup | Unificar con hallazgo de 5.3: inicializar como `'validating'`; agregar `<Loading>` en AccountView cuando `status === 'validating'` |

### Registro de motion

| Elemento | Tipo de transicion | Objetivo UX | Correcta | Riesgo | Accion |
|----------|--------------------|-------------|----------|--------|--------|
| `<Spinner>` (TUI) | Animacion ASCII rotating | Indicar operacion en progreso | Si | Bajo — usa `@inkjs/ui` nativo | Ninguna |
| `ProgressLog` (TUI) | Scroll de lineas en tiempo real (buffer rolling 100 lineas) | Mostrar output de brew streaming | Si | Bajo | Ninguna |
| `ConfirmDialog` (TUI) | Aparicion instantanea (sin transicion — comportamiento de terminal) | Interrumpir flujo para confirmacion destructiva | Si | Bajo | Ninguna |
| `PopoverView` sheet presentation (BrewBar) | `.sheet(isPresented:)` — animacion del sistema macOS | Mostrar SettingsView como modal | Si | Bajo — animacion de sistema | Ninguna |
| `ProgressView` (BrewBar) | Spinner/indeterminate del sistema macOS | Indicar carga de paquetes outdated | Si | Bajo | Ninguna |
| Logo GradientText (TUI) | Re-render estatico en cada navegacion | Identidad visual | Parcial | Alto — 258 nodos React recalculados sin memo | Memoizar o convertir a string ANSI estatico |

---

# 10. Frontend tecnico

> Auditor: frontend-auditor | Fecha: 2026-04-22

## 10.1 Renderizado y estabilidad

### Checklist

* [ ] ForEach con identidad estable
* [ ] No hay diffing defectuoso
* [ ] No hay parpadeos por recreacion de vistas
* [x] No hay perdida de estado por identidad incorrecta — no detectado en TUI (vistas son singleton por switch)
* [ ] Imagenes cargan con estrategia correcta — No aplica (terminal; BrewBar sin imagenes remotas)
* [x] Scroll en listas grandes fluido — LazyVStack en BrewBar; buffer rolling de 100 lineas en TUI streams

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `key={i}` (indice de array) en `DoctorView` para renderizar advertencias | No conforme | Media | `src/views/doctor.tsx` — `doctorWarnings.map((warning, i) => <Box key={i}` y `warning.split('\n').map((line, j) => <Text key={j}` — si el array cambia de orden o longitud, React reutiliza nodos incorrectos | Usar `key={warning.slice(0,40)}` para el Box externo (contenido como key); `key={j}` en lineas internas es menos critico pero reemplazar por `key={`${i}-${j}`}` |
| `key={i}` en `ProgressLog` para lineas de streaming — el buffer es una ventana deslizante `slice(-maxVisible)`, lo que hace que el indice 0 represente distintas lineas en cada render | No conforme | Media | `src/components/common/progress-log.tsx` — `visible.map((line, i) => <Text key={i}` — a medida que llegan nuevas lineas y se descarta la primera, todos los indices se desplazan | Usar `key={`${startIndex + i}`}` donde `startIndex = lines.length - visible.length`; o usar un ID monotono por linea en el hook |
| `useEffect(() => { fetchAll(); }, [])` en todas las vistas — dep array vacio con funcion de store como dep — viola React exhaustive-deps pero es un patron intencionado de Ink/Zustand | Parcial | Baja | `src/views/dashboard.tsx:useEffect`, `src/views/installed.tsx:useEffect`, etc. (patron en ~8 vistas) | Aceptable dado que Zustand store functions son estables; documentar como excepcion eslint-disable con comentario explicativo |
| BrewBar: `ForEach(appState.outdatedPackages)` — `BrewPackage` conforma `Identifiable` con `id: String` (nombre del paquete) — identidad estable y correcta | Conforme | — | `menubar/BrewBar/Sources/Models/AppState.swift` | — |
| BrewBar: `NSHostingController` creado de nuevo en cada apertura del popover (`togglePopover()`) — destruye y recrea todo el arbol SwiftUI | Parcial | Baja | `menubar/BrewBar/Sources/App/AppDelegate.swift` — `popover.contentViewController = NSHostingController(rootView: PopoverView(...))` en cada `showRelativeToRect` | Crear el `NSHostingController` una sola vez en `applicationDidFinishLaunching` y reutilizarlo; actualizar `appState` desde el exterior |

---

## 10.2 Presentacion y coordinacion UI

### Checklist

* [x] Sheets coordinadas correctamente — `modal-store` con conteo de referencias evita conflictos
* [x] Alerts no compiten entre si — un solo `<ConfirmDialog>` activo a la vez por diseno del modal-store
* [ ] NavigationDestination centralizada o bien trazable — TUI: routing por switch en `app.tsx` (centralizado); acoplamiento lateral via `selectedPackage`
* [ ] Side effects fuera del body — violations detectadas (ver hallazgos)
* [ ] Tareas ligadas al ciclo de vida correcto

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `app.tsx` tiene un side effect (`initLicense()`) dentro de `useEffect` con dep array vacio que omite la dep — React DevTools marcaria esto como violation; en Strict Mode se llamaria dos veces | No conforme | Media | `src/app.tsx:useEffect(() => { initLicense(); }, [])` — `initLicense` no esta en el dep array | Agregar `// eslint-disable-next-line react-hooks/exhaustive-deps` con comentario explicando que `initLicense` es idempotente; o envolver en `useRef` guard |
| `setInterval` en `license-store.ts` `initialize()` no tiene guard contra llamadas multiples — si `initialize()` se llama dos veces (posible en desarrollo con HMR o Strict Mode), se acumulan timers | No conforme | Alta | `src/stores/license-store.ts:71` — `setInterval(async () => { ... }, REVALIDATION_CHECK_MS).unref()` sin variable de referencia ni guard | Guardar la referencia del interval: `const intervalId = setInterval(...); return () => clearInterval(intervalId)`; o agregar un flag modular `let _initialized = false` |
| `SecurityAuditView`: `useEffect(() => { scan(); }, [])` lanza una peticion de red (OSV.dev API) en mount sin cancelacion en unmount | No conforme | Media | `src/views/security-audit.tsx` — no hay `useEffect` de cleanup ni `AbortController` para el scan en curso | Retornar cleanup desde el useEffect que cancele el scan via `scanAbortRef.current?.abort()` |
| `BrewBar AppDelegate`: Timer de 2 segundos para badge updates con `Timer.scheduledTimer` — el timer persiste aunque el popover este cerrado y no sea visible | Parcial | Baja | `menubar/BrewBar/Sources/App/AppDelegate.swift` — timer creado en `applicationDidFinishLaunching` siempre activo | Aceptable para menu bar app (el badge debe actualizarse aunque el popover este cerrado); evaluar reducir frecuencia a 5s |

---

## 10.3 Calidad de codigo UI

### Checklist

* [ ] Previews utiles — TUI: 0 previews; BrewBar: buena cobertura
* [ ] Componentes testeables — TUI: `ink-testing-library` instalada pero 0 tests escritos
* [ ] No hay logica de negocio incrustada — violations detectadas (ver hallazgos)
* [ ] El body principal sigue siendo legible — violations en vistas complejas
* [x] Modificadores custom con sentido semantico — BrewBar: sin ViewModifiers custom problemáticos; TUI: sin custom modifiers (paradigma diferente)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| 0 tests de componentes UI en TUI — `ink-testing-library` esta instalada pero ninguna vista ni componente tiene test | No conforme | Alta | `package.json` — `"@inkjs/testing-library"` en devDependencies; `src/` — 0 archivos `.test.tsx`; `src/views/` — 0 tests | Escribir tests para al menos: `<ConfirmDialog>` (flujo confirm/cancel), `AccountView` (estados free/pro/expired), `UpgradePrompt` (renderizado por viewId) |
| `AccountView` contiene `maskKey()` — logica de presentacion de datos sensibles incrustada en la vista | Parcial | Baja | `src/views/account.tsx:22-26` — funcion `maskKey()` definida dentro del componente | Mover a `src/utils/mask.ts` o al license-store como selector; testeable de forma independiente |
| `useBrewStream` contiene logica de dominio — detecta tipo de accion brew y escribe en history desde el hook de UI | No conforme | Media | `src/hooks/use-brew-stream.ts:7-36` — `detectAction()` y `logToHistory()` son logica de dominio de history, no UI | Mover `detectAction` y `logToHistory` a `src/lib/history/history-logger.ts`; el hook solo deberia manejar el ciclo de vida del stream |
| `ProfilesView` body supera 300 lineas con condicionales anidados para 7 modos — legibilidad muy reducida | No conforme | Media | `src/views/profiles.tsx` — cuerpo principal con bloques `mode === 'list'`, `mode === 'detail'`, `mode === 'create'`, etc., sin extraccion a subcomponentes | Extraer cada modo como subcomponente; el body principal deberia ser un switch de ~10 lineas |
| BrewBar: previews bien cubiertos — 7 previews en PopoverView cubriendo todos los estados + locale; 4 en OutdatedListView; 2 en SettingsView | Conforme | — | `menubar/BrewBar/Sources/Views/PopoverView.swift`, `OutdatedListView.swift`, `SettingsView.swift` | — |
| `NSAppleScript` en BrewBar hardcodea `"Terminal"` como nombre de la aplicacion de terminal — falla con iTerm2, Warp, Ghostty, Alacritty | No conforme | Alta | `menubar/BrewBar/Sources/Views/PopoverView.swift` — `tell application "Terminal" to do script "brew-tui"` | Leer la terminal preferida del usuario desde UserDefaults o NSUserDefaults; ofrecer picker en SettingsView con opciones Terminal/iTerm2/Warp/custom |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| Critica   | 0 |
| Alta      | 6 |
| Media     | 9 |
| Baja      | 7 |

**Total hallazgos no conformes:** 22

### Indice de hallazgos por severidad

**Alta:**
1. `goBack()` con historial inutilizado — solo 1 nivel de back disponible (`src/stores/navigation-store.ts`)
2. `SearchView`: errores de busqueda silenciados — usuario ve "no results" en lugar de mensaje de error (`src/views/search.tsx`)
3. `MAX_VISIBLE_ROWS = 20` hardcodeado — desborde en terminales pequenas (`src/views/installed.tsx`, `history.tsx`, `outdated.tsx`)
4. `GradientText`: 258 nodos React sin memo — re-render costoso en cada navegacion (`src/utils/gradient.tsx`)
5. `setInterval` en `license-store.initialize()` sin guard — acumulacion de timers (`src/stores/license-store.ts:71`)
6. 0 tests de UI — `ink-testing-library` instalada sin uso (`package.json`, `src/views/`)
7. `NSAppleScript` hardcodea "Terminal" — falla con iTerm2, Warp, Ghostty (`menubar/.../PopoverView.swift`)

**Media:**
1. `app.tsx` mezcla routing, Pro gate, e inicializacion de licencia en un mismo componente
2. `AccountView` muestra estado `'free'` antes de que la validacion de licencia complete
3. `ServicesView`: accion `start` sin dialogo de confirmacion
4. `padEnd()` con valores hardcodeados — layout roto en terminales < 80 cols
5. `key={i}` en `DoctorView` — identidad inestable en lista de advertencias
6. `key={i}` en `ProgressLog` — identidad inestable en buffer rolling de streaming
7. `SecurityAuditView`: scan en mount sin cancelacion en unmount
8. `ProfilesView`: body > 300 lineas con 7 modos anidados sin extraccion
9. `useBrewStream` contiene logica de dominio (`detectAction`, `logToHistory`)

**Baja:**
1. `package-info` requiere estado lateral `selectedPackage` — acoplamiento fragil en navegacion
2. `UpgradePrompt` usa `width="80%"` sin guard de ancho minimo
3. `useEffect` con dep array vacio — patron intencionado pero sin comentario explicativo
4. `NSHostingController` creado nuevo en cada apertura del popover (BrewBar)
5. `maskKey()` incrustada en AccountView — deberia estar en utils
6. No hay skeleton views — transicion spinner → contenido es abrupta
7. `SecurityAuditView` no cachea resultados de scan — re-escanea en cada apertura
