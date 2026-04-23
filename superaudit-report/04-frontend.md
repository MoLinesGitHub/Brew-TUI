# 5. Auditoria UI estructural

> Auditor: frontend-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 presenta una codebase de UI saludable en lo estructural: los fixes del ciclo anterior estan verificados (navegacion por historial, tamaños dinamicos, memoizacion de GradientText, errores visibles, claves React estables). Los hallazgos pendientes son de severidad media o baja y no bloquean ninguna funcionalidad critica. El riesgo mayor residual es de deuda tecnica acumulada — el archivo `COLORS.ts` creado como fix no tiene ninguna importacion (189 literales hex permanecen inline), y `ProfilesView` concentra 7 modos de interaccion sin descomposicion. BrewBar mantiene una estructura Swift ejemplar con cobertura de previews excelente y separacion limpia de responsabilidades.

---

## 5.1 Jerarquia de vistas

### Checklist

* [x] Root views identificadas
* [x] Contenedores claros
* [ ] Navegacion consistente *(ver hallazgo FE-01)*
* [x] Separacion entre layout y comportamiento
* [ ] Subvistas extraidas por intencion de dominio *(ver hallazgo FE-02)*
* [ ] No hay vistas gigantes dificiles de mantener *(ver hallazgo FE-02)*

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-01: `package-info` en VIEWS pero ausente de TAB_VIEWS en header | No conforme | Baja | `src/stores/navigation-store.ts` incluye `'package-info'` en `VIEWS`; `src/components/layout/header.tsx` lo excluye de `TAB_VIEWS`. Tab cycling puede llegar a esta vista sin que aparezca destacada en el nav bar. | Agregar `package-info` a `TAB_VIEWS` en `header.tsx`, o sacarlo de `VIEWS` si debe ser solo accesible por navegacion directa desde otra vista. |
| FE-02: `ProfilesView` con 7 modos inline y 267 lineas | No conforme | Media | `src/views/profiles.tsx` — FSM con `mode: 'list' \| 'detail' \| 'create-name' \| 'create-desc' \| 'importing' \| 'edit-name' \| 'edit-desc'`, cada rama renderiza un arbol JSX completamente diferente dentro del mismo componente. | Extraer subcomponentes con nombres de dominio: `<ProfileListMode>`, `<ProfileDetailMode>`, `<ProfileCreateFlow>`, `<ProfileEditFlow>`. El componente padre solo orquesta la maquina de estados. |
| FE-03: `app.tsx` mezcla inicializacion de licencia con routing de vistas | No conforme | Baja | `src/app.tsx:8` — `useEffect(()=>{ initLicense(); }, [])` y el switch de routing conviven en el mismo componente. Comentario TODO presente en linea 5. | Extraer `<LicenseInitializer>` y `<ViewRouter>` como se indica en el TODO. Mejora legibilidad y testabilidad sin cambio de comportamiento. |

---

## 5.2 Navegacion

### Checklist

* [x] NavigationStack / Tabs / Sheets coherentes
* [x] Rutas reproducibles
* [ ] Deep links contemplados *(No aplica — CLI app sin URL scheme)*
* [ ] Estados de navegacion restaurables *(No aplica — sesion efimera por naturaleza de TUI)*
* [x] No hay doble presentacion de sheets/alerts
* [x] Back navigation coherente

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Todos los items: Conforme | Conforme | — | `src/stores/navigation-store.ts` — `goBack()` hace `pop()` correcto del historial (fix v0.2.0 verificado). Historia acotada a 20 entradas con `.slice(-19)`. Modalidad de supresion de teclado usa contador de referencia (`modal-store._count`) para evitar desbloqueo prematuro cuando supresores se anidan. | Sin accion requerida. |

**Nota:** Deep links y restauracion de estado de navegacion no aplican a una TUI en terminal donde cada sesion es efimera y no existe mecanismo de URL scheme.

---

## 5.3 Estados visuales por pantalla

### Pantallas auditadas

#### DashboardView

* **Ruta:** `src/views/dashboard.tsx`
* [x] Estado inicial — loading pre-inicializado en store (`loading.installed: true`) evita flash
* [x] Cargando — `if (loading.installed) return <Loading>`
* [x] Vacio — seccion outdated muestra "All up to date" cuando lista vacia
* [x] Error recuperable — `if (errors.installed) return <ErrorMessage>`
* [ ] Error fatal — No aplica (sin errores irrecuperables en este contexto)
* [ ] Sin conexion — No aplica (brew es herramienta local)
* [ ] Datos parciales — No conforme: el bloque de configuracion se renderiza condicionalmente con `{config && (...)}` sin indicador de carga separado para config; si `config` tarda, la seccion simplemente no aparece sin feedback.
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica (vista de solo lectura)
* [ ] Confirmacion — No aplica (sin acciones destructivas en dashboard)
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — Ink TUI no usa accessibility tree nativo; las etiquetas de texto son el mecanismo principal
* [x] Dark mode validado — No aplica (terminal, hereda colores del emulador)
* [x] Dynamic Type validado — No aplica (terminal)

#### InstalledView

* **Ruta:** `src/views/installed.tsx`
* [x] Estado inicial — `loading.installed` pre-inicializado
* [x] Cargando — `<Loading>` mientras carga
* [x] Vacio — Muestra texto informativo cuando la lista filtrada esta vacia
* [x] Error recuperable — `<ErrorMessage>` con hint de reintento (`r` key)
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — Tabs formulae/casks independientes, cada uno con su propio estado
* [ ] Permiso denegado — No aplica
* [x] Modo edicion — Confirm dialog para uninstall con `y/n`
* [x] Confirmacion — `ConfirmDialog` presente antes de uninstall
* [x] Destructivo — Uninstall marcado como accion destructiva con dialog
* [x] Accesibilidad validada — Labels descriptivos en Text elements
* [x] Dark mode validado — No aplica (terminal)
* [x] Dynamic Type validado — No aplica (terminal)

#### SearchView

* **Ruta:** `src/views/search.tsx`
* [x] Estado inicial — TextInput visible inmediatamente
* [x] Cargando — Spinner durante busqueda
* [x] Vacio — Mensaje cuando no hay resultados
* [x] Error recuperable — `{searchError && <Text color="#EF4444">{searchError}</Text>}` (fix v0.2.0 verificado)
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [ ] Datos parciales — No aplica
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica (busqueda, no edicion)
* [x] Confirmacion — Confirm dialog antes de install
* [x] Destructivo — No aplica (install no es destructivo)
* [x] Accesibilidad validada — Texto descriptivo
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### OutdatedView

* **Ruta:** `src/views/outdated.tsx`
* [x] Estado inicial — Pre-cargado con `loading.outdated: true`
* [x] Cargando — `<Loading>` hasta datos disponibles
* [x] Vacio — "All packages up to date" cuando lista vacia
* [x] Error recuperable — `<ErrorMessage>` con `r` key
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — Cada paquete renderizado individualmente
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — Confirm para upgrade individual y para "upgrade all"
* [x] Destructivo — No aplica (upgrade no es destructivo)
* [x] Accesibilidad validada — Texto descriptivo
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### ServicesView

* **Ruta:** `src/views/services.tsx`
* [x] Estado inicial — Pre-cargado con `loading.services: true`
* [x] Cargando — `<Loading>` mientras carga
* [x] Vacio — Mensaje cuando no hay servicios
* [x] Error recuperable — `serviceActionError` visible en UI (fix v0.2.0 verificado)
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [ ] Datos parciales — No conforme: lista de servicios se renderiza con `.map()` sin paginacion; en sistemas con muchos servicios la lista puede exceder el viewport sin scroll accesible
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica
* [x] Confirmacion — Confirm para `stop` y `restart`; `start` es accion directa sin confirmacion (aceptable por ser no destructiva)
* [x] Destructivo — `stop`/`restart` tienen confirmacion
* [x] Accesibilidad validada — Labels descriptivos
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### DoctorView

* **Ruta:** `src/views/doctor.tsx`
* [x] Estado inicial — `loading.doctor: false` inicial (sin flash)
* [x] Cargando — `<Loading>` con `t('loading_doctor')`
* [x] Vacio — `doctorClean === true` muestra banner verde de "limpio"
* [x] Error recuperable — `<ErrorMessage>` con `r` key
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — `doctorClean === false && warnings.length === 0` muestra aviso de "warnings not captured"
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica (vista de solo lectura)
* [ ] Confirmacion — No aplica
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — Texto descriptivo
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### ProfilesView (Pro)

* **Ruta:** `src/views/profiles.tsx`
* [x] Estado inicial — Lista de perfiles o estado vacio visible
* [x] Cargando — Estado de carga durante import con generador async
* [x] Vacio — Mensaje de "no profiles yet" visible
* [x] Error recuperable — Errores de operacion mostrados en UI
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — Detalle de perfil muestra datos disponibles
* [ ] Permiso denegado — No aplica (gateado en app.tsx antes de llegar aqui)
* [x] Modo edicion — Modos `edit-name` y `edit-desc` implementados
* [x] Confirmacion — Confirm antes de delete de perfil
* [x] Destructivo — Delete con confirmacion
* [x] Accesibilidad validada — Labels descriptivos
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### SmartCleanupView (Pro)

* **Ruta:** `src/views/smart-cleanup.tsx`
* [x] Estado inicial — Loading spinner durante analisis
* [x] Cargando — `<Loading>` / `isRunning` durante operacion
* [x] Vacio — Mensaje cuando no hay candidatos a limpiar
* [x] Error recuperable — Error de dependencia detectado en stream output con path alternativo de `--ignore-dependencies`
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — Lista de candidatos con informacion por paquete
* [ ] Permiso denegado — No aplica (gateado)
* [ ] Modo edicion — No aplica
* [x] Confirmacion — Confirm dialog para uninstall, segundo dialog para force uninstall
* [x] Destructivo — Confirmacion doble para path de `--ignore-dependencies`
* [x] Accesibilidad validada — Labels descriptivos
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### HistoryView (Pro)

* **Ruta:** `src/views/history.tsx`
* [x] Estado inicial — Historia cargada al montar
* [x] Cargando — Estado de carga del stream durante replay
* [x] Vacio — Mensaje cuando historial vacio o filtro sin resultados
* [x] Error recuperable — `stream.error` visible cuando replay falla
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — Filtros aplicados sobre datos disponibles
* [ ] Permiso denegado — No aplica (gateado)
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — No aplica (replay es operacion no destructiva)
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — Labels descriptivos, IDs UUID en keys
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### SecurityAuditView (Pro)

* **Ruta:** `src/views/security-audit.tsx`
* [x] Estado inicial — Loading durante analisis de vulnerabilidades
* [x] Cargando — `<Loading>` con mensaje descriptivo
* [x] Vacio — Mensaje "no vulnerabilities found" cuando limpio
* [x] Error recuperable — Errores de API OSV.dev visibles
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica (la app sigue funcionando pero el audit requiere red)
* [x] Datos parciales — Vista expand/collapse por paquete con detalles de CVE
* [ ] Permiso denegado — No aplica (gateado)
* [ ] Modo edicion — No aplica
* [ ] Confirmacion — No aplica (audit es solo lectura)
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — Labels descriptivos
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### AccountView

* **Ruta:** `src/views/account.tsx`
* [ ] Estado inicial — No conforme: mientras `status === 'validating'` la seccion de licencia renderiza el label pero sin indicador de carga; el usuario ve contenido vacio sin explicacion durante el tiempo de validacion inicial
* [ ] Cargando — No conforme: no hay `<Loading>` / spinner durante validacion de licencia
* [x] Vacio — Estado free/expirado con CTA de upgrade
* [x] Error recuperable — `error` string del store visible en UI
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica (manejo de offline en license-manager)
* [x] Datos parciales — Detalles de licencia Pro mostrados cuando disponibles
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — Activacion/desactivacion de licencia como operaciones inline
* [x] Confirmacion — Confirm antes de deactivate
* [x] Destructivo — Deactivate con confirmacion
* [x] Accesibilidad validada — Labels descriptivos
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### PackageInfoView

* **Ruta:** `src/views/package-info.tsx`
* [x] Estado inicial — Loading al entrar con `packageName`
* [x] Cargando — `<Loading>` mientras fetch de info
* [ ] Vacio — No aplica (siempre se navega desde un paquete seleccionado)
* [x] Error recuperable — `<ErrorMessage>` cuando falla fetch
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [x] Datos parciales — Dependencias y caveats renderizados condicionalmente si existen
* [ ] Permiso denegado — No aplica
* [ ] Modo edicion — No aplica (vista de solo lectura)
* [ ] Confirmacion — No aplica
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — Labels descriptivos
* [x] Dark mode validado — No aplica
* [x] Dynamic Type validado — No aplica

#### BrewBar — PopoverView (SwiftUI)

* **Ruta:** `menubar/BrewBar/Sources/Views/PopoverView.swift`
* [x] Estado inicial — `ProgressView` mientras carga estado inicial
* [x] Cargando — `ProgressView` con etiqueta descriptiva
* [x] Vacio — Estado "up to date" con icono y mensaje positivo
* [x] Error recuperable — Vista de error con boton "Retry"
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica (brew es local)
* [x] Datos parciales — `servicesErrorView` condicional dentro de `OutdatedListView`
* [ ] Permiso denegado — Manejado via `notificationsDenied` en `SettingsView`
* [ ] Modo edicion — No aplica
* [x] Confirmacion — `confirmationDialog` para upgrade-all
* [x] Destructivo — Upgrade-all con rol `.destructive` en confirmacion
* [x] Accesibilidad validada — SwiftUI labels automaticos + `Label` con iconos semanticos
* [x] Dark mode validado — `Color.primary`/`Color.secondary` semantic colors usadas
* [x] Dynamic Type validado — SwiftUI escala automaticamente; frame fijo 340×420 podria truncar texto en sizes extremos (anotacion)

#### BrewBar — SettingsView (SwiftUI)

* **Ruta:** `menubar/BrewBar/Sources/Views/SettingsView.swift`
* [x] Estado inicial — Configuracion actual cargada del UserDefaults
* [ ] Cargando — No aplica (datos sincrónicos del UserDefaults)
* [ ] Vacio — No aplica
* [ ] Error recuperable — No aplica
* [ ] Error fatal — No aplica
* [ ] Sin conexion — No aplica
* [ ] Datos parciales — No aplica
* [x] Permiso denegado — `notificationsDenied` flag con feedback al usuario
* [ ] Modo edicion — No aplica (toggle directo en settings)
* [ ] Confirmacion — No aplica
* [ ] Destructivo — No aplica
* [x] Accesibilidad validada — SwiftUI automatico
* [x] Dark mode validado — Colors semanticos
* [x] Dynamic Type validado — SwiftUI automatico

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-04: `AccountView` sin indicador de carga durante `status === 'validating'` | No conforme | Baja | `src/views/account.tsx` — el estado `validating` no tiene rama de `<Loading>`. El usuario ve la seccion de licencia vacia durante el tiempo de inicializacion del store. | Agregar `if (status === 'validating') return <Loading message={t('loading_license')} />` o un placeholder de skeleton antes del switch de estados. |
| FE-05: `DashboardView` sin loading guard para `config` | No conforme | Baja | `src/views/dashboard.tsx` — `{config && (...)}` renderiza la seccion de configuracion sin feedback si `config` esta pendiente. | Agregar `{loading.config ? <Text dimColor>{t('loading_config')}</Text> : config && (...)}` para el bloque de configuracion. |
| FE-06: `ServicesView` sin paginacion en lista de servicios | No conforme | Baja | `src/views/services.tsx` — `services.map()` sin limite ni `MAX_VISIBLE_ROWS`. En sistemas con muchos servicios (>20) la lista puede exceder el viewport sin posibilidad de scroll. | Aplicar el mismo patron `MAX_VISIBLE_ROWS = Math.max(5, (stdout?.rows ?? 24) - 8)` con paginacion `j/k` que usan `InstalledView`, `OutdatedView` e `HistoryView`. |

---

## 5.4 Layout y adaptabilidad

### Checklist

* [x] iPhone pequeno — No aplica (macOS CLI / macOS app)
* [x] iPhone grande — No aplica
* [x] iPad portrait — No aplica
* [x] iPad landscape — No aplica
* [x] Multitarea — No aplica
* [x] Mac idiom si aplica — BrewBar usa SwiftUI macOS nativo; TUI es terminal agnostica
* [x] Safe areas correctas — BrewBar: no hay uso de `ignoresSafeArea` sin justificacion; TUI: N/A
* [ ] Keyboard avoidance correcto — No aplica (TUI maneja input via `useInput`; BrewBar es popover sin formularios de texto libre)
* [x] Scroll correcto con contenido grande — `InstalledView`, `OutdatedView`, `HistoryView` con paginacion dinamica; BrewBar usa `ScrollView` en `OutdatedListView`
* [x] Rotacion correcta — BrewBar como menu bar app no rota; TUI adapta columnas via `stdout.columns`

**Nota sobre TUI:** La adaptabilidad de layout en una TUI se expresa a traves de `useStdout()` para detectar dimensiones del terminal. Los fixes de v0.2.0 (dynamic `MAX_VISIBLE_ROWS`, dynamic `nameWidth`/`versionWidth`) estan verificados y correctamente implementados en las vistas de mayor contenido.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-07: BrewBar PopoverView frame fijo 340×420 puede truncar texto con Dynamic Type grande | No conforme | Baja | `menubar/BrewBar/Sources/Views/PopoverView.swift` — `.frame(width: 340, height: 420)`. Con accessibility sizes muy grandes (AX5+) el texto puede truncarse. | Considerar `.frame(width: 340, height: 420, alignment: .topLeading)` con `ScrollView` como wrapper interior, o bien limitar el minimo y maximo con `.frame(minHeight: 320, maxHeight: 500)`. |

---

# 9. Motion y percepcion de velocidad

> Auditor: frontend-auditor | Fecha: 2026-04-23

## 9.1 Transiciones

### Checklist

* [ ] Las transiciones comunican cambio de estado — No aplica (cero animaciones encontradas; correcto por arquitectura)
* [ ] No hay animacion gratuita — No aplica
* [ ] Las duraciones son consistentes — No aplica
* [ ] Las curvas son coherentes — No aplica
* [x] No hay jank perceptible — `GradientText` con `React.memo` + `useMemo` (fix v0.2.0); BrewBar sin animaciones custom
* [ ] Reduced Motion respetado — No aplica (sin animaciones)

**Justificacion arquitectural:** Ink 5.x es un renderer de terminal que escribe caracteres en stdout; no existe modelo de interpolacion visual entre frames. Las transiciones de estado son instantaneas por naturaleza del medio. La ausencia de animaciones es correcta y no constituye hallazgo. BrewBar no usa animaciones custom — solo el comportamiento nativo del `NSPopover` gestionado por el sistema operativo.

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Todos los items: No aplica por arquitectura | No aplica | — | Ink TUI: renderer de terminal sin capacidad de interpolacion. BrewBar: popover sin animaciones custom. | Sin accion requerida. |

---

## 9.2 Percepcion de rendimiento

### Checklist

* [ ] Skeletons correctos — No aplica (terminal no tiene layout visual previo al contenido; spinners son el mecanismo correcto)
* [x] Loaders adecuados al contexto — `<Loading>` full-view para carga inicial; `Spinner` inline para operaciones de stream
* [ ] Optimistic UI justificada — No aplica (no hay actualizaciones optimistas)
* [ ] Prefetch donde aporta valor — No aplica (TUI hace `fetchAll()` en paralelo al inicio; BrewBar carga al abrir popover)
* [x] Placeholders evitan vacio abrupto — `loading.installed: true` pre-inicializado en brew-store evita flash inicial (fix v0.2.0 verificado)
* [ ] Haptics coherentes y no invasivos — No aplica (TUI en terminal; BrewBar es popover, haptics no son estandar en menu bar apps)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-08: `openBrewTUI()` en BrewBar silencia errores de lanzamiento | No conforme | Baja | `menubar/BrewBar/Sources/App/AppDelegate.swift` — `try? process.run()` descarta silenciosamente cualquier error de lanzamiento del proceso. Si brew-tui no esta instalado o el path es incorrecto, el usuario no recibe feedback. | Sustituir `try?` por un bloque `do/catch` que muestre un `NSAlert` con el error de lanzamiento. El check de `which brew-tui` al inicio reduce la probabilidad pero no la elimina. |

### Registro de motion

**Nota:** No se encontraron animaciones ni transiciones personalizadas en ninguna de las dos codebases. La tabla siguiente registra este hecho de forma explicita.

| Elemento | Tipo de transicion | Objetivo UX | Correcta | Riesgo | Accion |
|----------|--------------------|-------------|----------|--------|--------|
| TUI (Ink 5.x) — todas las vistas | Sin animacion (renderer de terminal) | N/A — cambios de estado son instantaneos por naturaleza del medio | Correcto | Ninguno | Sin accion |
| BrewBar — NSPopover | Transicion nativa del sistema (NSPopover appearance) | Apertura/cierre del panel gestionado por macOS | Correcto | Ninguno | Sin accion |
| BrewBar — ProgressView | Indicador de actividad del sistema (spinning wheel) | Comunicar estado de carga al usuario | Correcto | Ninguno | Sin accion |

---

# 10. Frontend tecnico

> Auditor: frontend-auditor | Fecha: 2026-04-23

## 10.1 Renderizado y estabilidad

### Checklist

* [x] ForEach con identidad estable
* [x] No hay diffing defectuoso
* [ ] No hay parpadeos por recreacion de vistas — *ver hallazgo FE-09*
* [x] No hay perdida de estado por identidad incorrecta
* [x] Imagenes cargan con estrategia correcta — No aplica (no hay imagenes en TUI; BrewBar usa SF Symbols del sistema)
* [x] Scroll en listas grandes fluido — `LazyVStack` en `OutdatedListView`; paginacion con offset en TUI

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-09: Clave composite en `ProgressLog` puede causar parpadeo | No conforme | Baja | `src/components/common/progress-log.tsx` — `key={line.slice(0,30) + (lines.length - visible.length + i)}`. Si dos lineas comparten el mismo prefijo de 30 caracteres y su posicion en el buffer cambia, React recrea el elemento. | Usar un indice global monotonicamente creciente como clave (contador de lineas recibidas, no posicion en ventana) o incluir un hash del contenido completo de la linea para diferenciarlas. |
| FE-10: `key={j}` en lineas de warning en `DoctorView` | No conforme | Baja | `src/views/doctor.tsx:40` — `warning.split('\n').map((line, j) => <Text key={j}>...)`. Indice de array como clave. | Aceptable en este caso especifico (datos estaticos de solo lectura, no reordenables), pero por consistencia con el resto de la codebase se recomienda `key={warning.slice(0,20) + '-line-' + j}`. |

---

## 10.2 Presentacion y coordinacion UI

### Checklist

* [x] Sheets coordinadas correctamente — BrewBar: un solo `.sheet` en `PopoverView` para Settings
* [x] Alerts no compiten entre si — BrewBar: un solo `confirmationDialog`; TUI: `ConfirmDialog` controlado por modal-store con contador de referencias
* [x] NavigationDestination centralizada o bien trazable — TUI: switch central en `app.tsx`; BrewBar: navegacion via `.sheet` simple
* [ ] Side effects fuera del body — *ver hallazgo FE-11*
* [ ] Tareas ligadas al ciclo de vida correcto — *ver hallazgo FE-12*

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-11: `Task {}` anonimos en botones de BrewBar sin handle de cancelacion | No conforme | Baja | `menubar/BrewBar/Sources/Views/OutdatedListView.swift` — botones de upgrade individual lanzan `Task { await appState.upgradePackage(pkg) }` sin almacenar el handle. Si el popover se cierra durante la operacion, la tarea no tiene mecanismo de cancelacion explicito. | Almacenar el handle en `@State private var upgradeTask: Task<Void,Never>?` y cancelarlo en `.onDisappear { upgradeTask?.cancel() }`. Alternativamente, mover la logica de cancelacion al `@Observable AppState`. |
| FE-12: `.onAppear` en `DoctorView` sin cleanup de la operacion | No conforme | Baja | `src/views/doctor.tsx:13` — `useEffect(() => { fetchDoctor(); }, [])`. La llamada a `fetchDoctor()` no tiene mecanismo de cancelacion si la vista se desmonta mientras el fetch esta en curso. | Cambiar a `.task {}` en SwiftUI o implementar cleanup: `useEffect(() => { const controller = new AbortController(); fetchDoctor(controller.signal); return () => controller.abort(); }, [])`. Para el contexto actual de Ink TUI, el patron `mountedRef` ya usado en `package-info.tsx` es el correcto y deberia aplicarse aqui tambien. |

---

## 10.3 Calidad de codigo UI

### Checklist

* [x] Previews utiles — BrewBar: 13 previews incluyendo variantes de Spanish locale; excelente cobertura
* [x] Componentes testeables — Componentes aceptan datos inyectados; stores de Zustand son instancias singleton pero testables via reset
* [ ] No hay logica de negocio incrustada — *ver hallazgo FE-13*
* [ ] El body principal sigue siendo legible — *ver hallazgo FE-02 (ProfilesView 267 lineas)*
* [x] Modificadores custom con sentido semantico — No se encontraron ViewModifiers custom en BrewBar; TUI usa componentes con nombres semanticos (`<StatusBadge>`, `<StatCard>`, `<ProgressLog>`)

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| FE-13: `COLORS.ts` creado como fix pero nunca importado — 189 literales hex inline | No conforme | Media | `src/utils/colors.ts` — exporta `COLORS` con 8 tokens de color. Grep de importaciones: 0 resultados en los 71 archivos `.ts`/`.tsx` del proyecto. Los 12 archivos de vistas usan literales hex directos (ej. `color="#EF4444"`, `color="#22C55E"`, `color="#F59E0B"`). | Reemplazar sistematicamente los literales hex en los archivos de vistas por referencias a `COLORS.*`. Priorizar los colores mas frecuentes: `#EF4444` (error), `#22C55E` (success), `#F59E0B` (warning). Este cambio no afecta comportamiento pero es el objetivo declarado del fix. |
| FE-14: Previews de TUI ausentes en vistas principales | No conforme | Baja | Ninguna vista en `src/views/` tiene `#Preview` o `PreviewProvider`. Ink TUI no soporta Xcode previews, pero la ausencia de storybooks o snapshots hace imposible la validacion visual automatica. | A nivel inmediato: documentar en README que los previews de TUI se validan ejecutando `npm run dev`. A nivel futuro: considerar `@inkjs/testing` o snapshots de texto para regresion de layout. |

---

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| Critica | 0 |
| Alta | 0 |
| Media | 2 |
| Baja | 12 |

**Total hallazgos no conformes:** 14

### Indice de hallazgos

| ID | Descripcion | Seccion | Severidad | Archivo principal |
|----|-------------|---------|-----------|-------------------|
| FE-01 | `package-info` en VIEWS pero ausente de TAB_VIEWS | 5.1 | Baja | `src/components/layout/header.tsx` |
| FE-02 | `ProfilesView` 267 lineas con 7 modos inline sin descomposicion | 5.1 | Media | `src/views/profiles.tsx` |
| FE-03 | `app.tsx` mezcla inicializacion de licencia con routing | 5.1 | Baja | `src/app.tsx` |
| FE-04 | `AccountView` sin loading durante `status === 'validating'` | 5.3 | Baja | `src/views/account.tsx` |
| FE-05 | `DashboardView` sin guard de carga para bloque `config` | 5.3 | Baja | `src/views/dashboard.tsx` |
| FE-06 | `ServicesView` sin paginacion para listas largas | 5.3 | Baja | `src/views/services.tsx` |
| FE-07 | BrewBar PopoverView frame fijo puede truncar texto con Dynamic Type grande | 5.4 | Baja | `menubar/BrewBar/Sources/Views/PopoverView.swift` |
| FE-08 | `openBrewTUI()` silencia errores de lanzamiento con `try?` | 9.2 | Baja | `menubar/BrewBar/Sources/App/AppDelegate.swift` |
| FE-09 | Clave composite en `ProgressLog` puede causar parpadeo | 10.1 | Baja | `src/components/common/progress-log.tsx` |
| FE-10 | `key={j}` en lineas de warning en `DoctorView` | 10.1 | Baja | `src/views/doctor.tsx` |
| FE-11 | `Task {}` anonimos en botones de BrewBar sin handle de cancelacion | 10.2 | Baja | `menubar/BrewBar/Sources/Views/OutdatedListView.swift` |
| FE-12 | `.onAppear` en `DoctorView` sin cleanup de operacion async | 10.2 | Baja | `src/views/doctor.tsx` |
| FE-13 | `COLORS.ts` creado pero nunca importado — 189 literales hex inline | 10.3 | Media | `src/utils/colors.ts` + todos los archivos de vistas |
| FE-14 | Ausencia de previews/snapshots para vistas TUI | 10.3 | Baja | `src/views/` (todos) |

### Fixes de v0.2.0 verificados como Conforme

| Fix declarado | Estado | Evidencia |
|---------------|--------|-----------|
| `goBack()` hace pop del historial | Conforme | `src/stores/navigation-store.ts` — `viewHistory.slice(0, -1)` correcto |
| `MAX_VISIBLE_ROWS` dinamico | Conforme | `src/views/installed.tsx`, `outdated.tsx`, `history.tsx` — `Math.max(5, (stdout?.rows ?? 24) - 8)` |
| `GradientText` memoizado | Conforme | `src/utils/gradient.tsx` — `export const GradientText = React.memo(...)` |
| Errores de busqueda visibles | Conforme | `src/views/search.tsx` — `{searchError && <Text color="#EF4444">{searchError}</Text>}` |
| Errores de servicios visibles | Conforme | `src/views/services.tsx` — `serviceActionError` renderizado en UI |
| Anchos de columna dinamicos | Conforme | `src/views/services.tsx` — `nameWidth` desde `stdout?.columns` |
| Claves React estables | Conforme | Todas las vistas usan `name`, `id` (UUID), o composites significativos — no indices puros en listas de datos |
| Archivo de tokens de color creado | Parcial | `src/utils/colors.ts` existe pero no tiene ninguna importacion — ver FE-13 |
