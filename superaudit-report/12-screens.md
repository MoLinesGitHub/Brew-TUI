# 19. Auditoria por pantalla

> Auditor: screen-auditor | Fecha: 2026-04-23

---

## Resumen ejecutivo

* **Total pantallas auditadas:** 15 (12 vistas TUI TypeScript + 3 vistas SwiftUI BrewBar)
* **Cobertura media:** 46% (promedio de items cubiertos por pantalla sobre 12 criterios)
* **Pantallas con cobertura completa:** 0
* **Pantallas con hallazgos criticos:** 1 (SmartCleanupView — operacion destructiva sin timeout guard)
* **Hallazgos totales:** 60

**Nota metodologica:** En una TUI de terminal no existe dark/light mode en el sentido iOS. El criterio "Dark mode" se interpreta como legibilidad en terminales con fondo claro vs. fondo oscuro. El criterio "Dynamic Type" se interpreta como adaptacion al tamanio de fuente del terminal (no aplica directamente en Ink). El criterio "Offline" verifica manejo de red no disponible. El criterio "Permisos" se marca "No aplica" para vistas TUI que no necesitan permisos del sistema; se aplica con pleno rigor en las vistas SwiftUI.

---

## Estadisticas por categoria

| Categoria | Pantallas que cumplen | Pantallas que no cumplen | % Cumplimiento |
|-----------|-----------------------|--------------------------|----------------|
| Estado inicial | 13 | 2 | 87% |
| Cargando | 13 | 2 | 87% |
| Error | 12 | 3 | 80% |
| Vacio | 12 | 3 | 80% |
| Offline | 0 | 15 | 0% |
| Permisos | 14 (No aplica) + 1 (SettingsView) | 0 con incumplimiento | 100% efectivo |
| Accesibilidad | 3 | 12 | 20% |
| Dark mode / temas | 3 | 12 | 20% |
| Dynamic Type | 1 | 14 | 7% |
| Rotacion / tamano | 7 | 8 | 47% |
| Instrumentacion analitica | 0 | 15 | 0% |
| Rendimiento | 13 | 2 | 87% |

---

## Pantallas TUI (TypeScript / React / Ink)

---

## Pantalla: DashboardView

* **Feature:** Dashboard (vista de inicio)
* **Ruta de navegacion:** Inicio automatico al arrancar Brew-TUI / tecla `1`
* **Fuente de datos:** `useBrewStore` — `fetchAll()` (formulae, casks, outdated, services, config)
* **Casos de uso asociados:** Vision general del entorno Homebrew: paquetes instalados, actualizaciones pendientes, estado de servicios, informacion del sistema

### Cobertura

* [x] Estado inicial — el store inicializa `loading.installed: true` previniendo flash de contenido vacio
* [x] Cargando — `<Loading message={t('loading_fetchingBrew')} />` mientras `loading.installed`
* [x] Error — `<ErrorMessage message={errors.installed} />` para el error principal; errores parciales de outdated/services/config mostrados en panel amarillo
* [x] Vacio — no aplica directamente (siempre hay al menos 0 paquetes); el dashboard muestra contadores en cero correctamente
* [ ] Offline — no hay deteccion de red; si brew no responde, el error generico de CLI se propaga sin mensaje diferenciado
* [ ] Permisos — No aplica (TUI, sin permisos del sistema)
* [ ] Accesibilidad — ninguna etiqueta de accesibilidad Ink (`accessibilityLabel`); los StatCard son solo cajas con texto sin metadata de accesibilidad
* [ ] Dark mode — colores hexadecimales hardcodeados (`#06B6D4`, `#A855F7`, `#F9FAFB`, `#EF4444`, etc.); en terminales con fondo claro, `#F9FAFB` (casi blanco) es ilegible
* [ ] Dynamic Type — Ink no expone escalado de fuente del terminal; no hay adaptacion explicita al tamanio de fuente
* [ ] Rotacion / tamano — no usa `useStdout()` para adaptar el layout a columnas disponibles; a terminales muy estrechas (<60 col), los 4 StatCard en fila pueden solaparse
* [ ] Instrumentacion analitica — ninguna llamada de tracking o analytics en todo el proyecto
* [x] Rendimiento — `useMemo` para `errorServiceList` y `runningServices`; sin heavy computation en body; `fetchAll()` usa `Promise.all` en paralelo

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Sin deteccion de conectividad: errores de red aparecen como mensajes CLI crudos sin indicacion de "sin red" | Media | `src/views/dashboard.tsx:42-43` | Agregar deteccion de error de red en `fetchAll()` para diferenciar errores de conectividad |
| Bug | Colores `#F9FAFB` y `#F9FAFB` son casi blancos, invisibles en terminales con fondo claro | Media | `src/views/dashboard.tsx:49,79,91` | Usar colores con mayor contraste o proporcionar alternativa via variable de entorno de tema |
| Mejora | Sin adaptacion al ancho del terminal: StatCard en fila puede solaparse en terminales estrechas | Baja | `src/views/dashboard.tsx:49-62` | Importar `useStdout()` y adaptar el numero de StatCard por fila segun columnas disponibles |
| Mejora | Sin analitica de pantalla: no hay tracking de `screen_view` ni de interacciones | Baja | `src/views/dashboard.tsx` completo | Integrar libreria de analytics ligera o telemetria local |

---

## Pantalla: InstalledView

* **Feature:** Formulae y Casks instalados (tabs combinados)
* **Ruta de navegacion:** Tecla `2` desde cualquier vista
* **Fuente de datos:** `useBrewStore` — `fetchInstalled()` (formulae + casks)
* **Casos de uso asociados:** Listar paquetes instalados por tab (formulae/casks), buscar/filtrar, ver detalle, desinstalar

### Cobertura

* [x] Estado inicial — `loading.installed: true` pre-inicializado en el store
* [x] Cargando — `<Loading message={t('loading_installed')} />`
* [x] Error — `<ErrorMessage message={errors.installed} />`
* [x] Vacio — mensaje `t('installed_noPackages')` cuando la lista filtrada esta vacia
* [ ] Offline — sin deteccion de red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas de accesibilidad; cursor visual (▶) no tiene representacion en screen readers; el tab de formulae/casks no tiene roles ARIA equivalentes
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#FFD700`, `#2DD4BF`, `#F9FAFB`); `#F9FAFB` invisible en fondo claro
* [ ] Dynamic Type — sin adaptacion a escalado de fuente del terminal
* [x] Rotacion / tamano — usa `useStdout()` para calcular `nameWidth`, `versionWidth` y `MAX_VISIBLE_ROWS` en funcion de columnas y filas del terminal
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `useMemo` para `allItems`; paginacion virtual con ventana de `MAX_VISIBLE_ROWS`; `useDebounce(200ms)` para el filtro

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Cabeceras de columna hardcodeadas en ingles: `'Package'`, `'Version'`, `'Status'` no usan `t()` — incumplimiento i18n | Alta | `src/views/installed.tsx:187-189` | Agregar claves i18n `installed_colPackage`, `installed_colVersion`, `installed_colStatus` y usar `t()` |
| Bug | Color `#F9FAFB` (texto principal seleccionado) es practicamente blanco, invisible en terminales con fondo claro | Media | `src/views/installed.tsx:207,209,229` | Usar color con contraste minimo en ambas polaridades de fondo |
| Mejora | Sin feedback al usuario cuando `cursor` rebasa la lista filtrada (cursor se queda en ultima posicion sin notificacion) | Baja | `src/views/installed.tsx:88-91` | Mostrar brevemente un indicador cuando se llega al final de la lista |
| Mejora | Sin analitica | Baja | Archivo completo | Tracking de accion `uninstall` y de `tab_switch` |

---

## Pantalla: SearchView

* **Feature:** Busqueda de paquetes en Homebrew
* **Ruta de navegacion:** Tecla `3`
* **Fuente de datos:** `api.search()` (text parser sobre `brew search`), `useBrewStream` para instalacion
* **Casos de uso asociados:** Buscar formulas y casks, navegar resultados, instalar, ver detalle de paquete

### Cobertura

* [x] Estado inicial — campo de busqueda vacio con placeholder localizado `t('search_placeholder')`
* [x] Cargando — `<Loading message={t('loading_searching')} />` durante `searching`
* [x] Error — `searchError` mostrado en rojo; captura `err instanceof Error ? err.message : 'Search failed'`
* [x] Vacio — `t('search_noResults')` cuando `allVisible.length === 0`
* [ ] Offline — sin deteccion de red; error de CLI mostrado crudo
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; `TextInput` de `@inkjs/ui` no expone rol de campo de busqueda
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#EF4444`, `#FFD700`, `#06B6D4`, `#A855F7`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; lista de resultados sin paginacion virtual (maximo 20 + 20 por tipo, gestionado con slice)
* [ ] Instrumentacion analitica — ninguna
* [ ] Rendimiento — `allVisible` recalculado en cada render sin `useMemo`; riesgo bajo ya que el maximo es 40 elementos, pero es inconsistente con el patron del resto de vistas

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Fallback de error hardcodeado en ingles: `'Search failed'` no usa `t()` | Alta | `src/views/search.tsx:52` | Reemplazar con `t('search_failed')` y agregar la clave a `en.ts`/`es.ts` |
| Mejora | `allVisible` sin `useMemo`: se recalcula en cada render | Baja | `src/views/search.tsx:68` | Envolver `allVisible` con `useMemo([results, cursor])` para consistencia |
| Mejora | Sin minimo de espera (debounce) en submit del formulario: el usuario puede disparar busquedas multiples rapidamente si pulsa Enter varias veces | Baja | `src/views/search.tsx:38-56` | Agregar guardia `if (searching) return` en `doSearch` antes de la llamada |
| Mejora | Sin analitica de busqueda (query, resultados encontrados, paquete instalado) | Baja | Archivo completo | Tracking de evento `search_query` e `install_from_search` |

---

## Pantalla: OutdatedView

* **Feature:** Paquetes con actualizaciones disponibles
* **Ruta de navegacion:** Tecla `4`
* **Fuente de datos:** `useBrewStore` — `fetchOutdated()`; `useBrewStream` para upgrade
* **Casos de uso asociados:** Ver paquetes desactualizados (formulae + casks), actualizar individual o todos, pin/unpin

### Cobertura

* [x] Estado inicial — `loading.outdated: true` pre-inicializado
* [x] Cargando — `<Loading message={t('loading_outdated')} />`
* [x] Error — `<ErrorMessage message={errors.outdated} />`
* [x] Vacio — `t('outdated_upToDate')` con icono verde cuando lista vacia
* [ ] Offline — sin deteccion de red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; `VersionArrow` es representacion visual sin texto alternativo
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#F9FAFB`, `#EF4444`, `#6B7280`)
* [ ] Dynamic Type — sin adaptacion
* [x] Rotacion / tamano — usa `useStdout()` para `MAX_VISIBLE_ROWS`; paginacion virtual implementada
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — paginacion virtual correcta; `hasRefreshed` ref previene double-fetch

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Upgrade masivo (`brew upgrade` sin listado previo de paquetes afectados) confirmado con un solo dialogo de confirmacion generico — riesgo de rotura de dependencias | Alta | `src/views/outdated.tsx:61,121-123` | Mostrar lista completa de paquetes a actualizar en el dialogo de confirmacion de "Upgrade All" |
| Mejora | `VersionArrow` no tiene texto alternativo; en terminales sin soporte de Unicode, las flechas pueden no renderizarse | Baja | `src/views/outdated.tsx:154` | Agregar fallback ASCII (`->`) cuando el componente `VersionArrow` falla o anadir text override |
| Mejora | Sin analitica (evento `upgrade_single`, `upgrade_all`) | Baja | Archivo completo | Tracking de operaciones de upgrade |

---

## Pantalla: PackageInfoView

* **Feature:** Detalle de paquete (formula)
* **Ruta de navegacion:** Enter sobre cualquier paquete en InstalledView o SearchView → vista `package-info`
* **Fuente de datos:** `api.getFormulaInfo(packageName)` directo; `useBrewStream` para install/uninstall/upgrade
* **Casos de uso asociados:** Ver informacion completa de un paquete, instalar, desinstalar, actualizar

### Cobertura

* [x] Estado inicial — estado local `loading: true` mientras se carga; `mountedRef` para evitar setState en componente desmontado
* [x] Cargando — `<Loading message={t('loading_package', { name: packageName })} />`
* [x] Error — `<ErrorMessage message={error} />` y `<ErrorMessage message={t('pkgInfo_notFound')} />` si formula es null
* [ ] Vacio — si `packageName` es null muestra `t('pkgInfo_noPackage')` pero no es un estado vacio tipico; las dependencias vacias simplemente no muestran la seccion (correcto)
* [ ] Offline — sin deteccion de red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; los StatusBadge son solo texto coloreado sin role
* [ ] Dark mode — colores hardcodeados (`#9CA3AF`, `#2DD4BF`, `#F59E0B`, `#EF4444`, `#22C55E`, `#4B5563`, `#6B7280`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; contenido fijo sin adaptacion a columnas disponibles; caveats con `wrap` puede exceder pantalla en terminales muy estrechas
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `mountedRef` evita setState tras desmontaje; `hasRefreshed` ref previene double-refresh; cancellation correctamente delegada al stream

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Sin adaptacion al ancho del terminal: detalles como `homepage` y `dependencies` pueden exceder el ancho y romperse visualmente | Media | `src/views/package-info.tsx:145,163` | Importar `useStdout()` y aplicar `truncate()` en campos de texto largo segun columnas disponibles |
| Mejora | Casks no soportadas en `PackageInfoView`: `api.getFormulaInfo()` solo consulta formulas; si el usuario navega a un cask desde SearchView, el resultado sera "Not found" | Alta | `src/views/package-info.tsx:48` | Detectar si el nombre es un cask (por sufijo o resultado de search) y llamar al endpoint correcto |
| Mejora | Sin analitica (evento `package_detail_view`, `install`, `uninstall`, `upgrade`) | Baja | Archivo completo | Tracking de interacciones con paquetes |

---

## Pantalla: ServicesView

* **Feature:** Gestion de servicios Homebrew
* **Ruta de navegacion:** Tecla `6`
* **Fuente de datos:** `useBrewStore` — `fetchServices()`, `serviceAction()`
* **Casos de uso asociados:** Listar servicios, iniciar, detener, reiniciar

### Cobertura

* [x] Estado inicial — `loading.services: true` pre-inicializado
* [x] Cargando — `<Loading message={t('loading_services')} />`
* [x] Error — `<ErrorMessage message={errors.services} />`
* [x] Vacio — `t('services_noServices')` cuando lista vacia
* [ ] Offline — sin deteccion de red
* [ ] Permisos — No aplica (control de servicios sin dialogo de permiso en TUI)
* [ ] Accesibilidad — sin etiquetas; `StatusBadge` para estado del servicio no tiene accesibilidad
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#EF4444`, `#38BDF8`, `#F9FAFB`, `#4B5563`)
* [ ] Dynamic Type — sin adaptacion
* [x] Rotacion / tamano — usa `useStdout()` para `svcNameWidth`, `svcStatusWidth`, `MAX_VISIBLE_ROWS`
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — paginacion virtual implementada; `actionInProgress` evita acciones concurrentes

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Accion `start` (tecla `s`) no tiene dialogo de confirmacion — solo `stop` y `restart` lo tienen; iniciar un servicio es potencialmente disruptivo | Media | `src/views/services.tsx:52-54` | Agregar `ConfirmDialog` para la accion `start` de forma consistente con stop/restart |
| Bug | Error de `service-action` se consume via `useBrewStore(s => s.errors['service-action'])` pero `actionInProgress` se resetea en `finally`, no tras mostrar el error al usuario — el error podria desaparecer al siguiente fetch de servicios | Media | `src/views/services.tsx:57,47-48` | Mantener el error hasta que el usuario pulse una tecla o haga una nueva accion |
| Mejora | Sin analitica de acciones de servicio | Baja | Archivo completo | Tracking de eventos `service_start`, `service_stop`, `service_restart` |

---

## Pantalla: DoctorView

* **Feature:** Diagnostico del sistema Homebrew
* **Ruta de navegacion:** Tecla `7`
* **Fuente de datos:** `useBrewStore` — `fetchDoctor()` via `api.getDoctor()`
* **Casos de uso asociados:** Ejecutar `brew doctor`, revisar warnings del sistema

### Cobertura

* [ ] Estado inicial — `loading.doctor: false` en el store (no pre-inicializado como `installed`/`outdated`); hay un frame en que `loading.doctor = false` y `doctorWarnings = []` y `doctorClean = null` antes de que `fetchDoctor()` se ejecute en `useEffect`
* [x] Cargando — `<Loading message={t('loading_doctor')} />`
* [x] Error — `<ErrorMessage message={errors.doctor} />`
* [x] Vacio — caso `doctorClean === true` muestra icono de exito; caso `doctorClean === false && warnings.length === 0` muestra `t('doctor_warningsNotCaptured')`
* [ ] Offline — sin deteccion de red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; warnings renderizados como texto plano sin roles
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#F59E0B`, `#9CA3AF`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; warnings largos pueden exceder el ancho del terminal sin scroll horizontal
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — sin derivaciones pesadas en el body; output del doctor es texto plano dividido por lineas

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Flash de estado vacio: `loading.doctor` no se pre-inicializa a `true` en el store a diferencia de `installed`/`outdated`; hay un frame donde la vista muestra contenido vacio antes del spinner | Media | `src/stores/brew-store.ts:61`, `src/views/doctor.tsx:19` | Pre-inicializar `loading: { ..., doctor: true }` en el store, o iniciar `fetchDoctor()` antes del primer render |
| Mejora | Warnings con lineas muy largas pueden no envolverse correctamente en terminales estrechas — Ink no tiene `word-wrap` automatico por defecto | Baja | `src/views/doctor.tsx:39` | Agregar `wrap="wrap"` en el `<Text>` de cada linea de warning |
| Mejora | Sin analitica (evento `doctor_run`, `warnings_count`) | Baja | Archivo completo | Tracking de resultado del diagnostico |

---

## Pantalla: ProfilesView (Pro)

* **Feature:** Perfiles de instalacion (Pro)
* **Ruta de navegacion:** Tecla `8` (gateada por `isPro()`)
* **Fuente de datos:** `useProfileStore` — `fetchProfiles()`, `exportCurrent()`, `importProfile()`
* **Casos de uso asociados:** Crear, listar, ver detalle, editar, eliminar, importar perfil de instalacion

### Cobertura

* [x] Estado inicial — `loading: true` durante fetch inicial de perfiles
* [x] Cargando — `<Loading message={t('loading_profiles')} />`
* [ ] Error — `loadError` solo se muestra en los modos `create-desc` y `edit-desc`; si `fetchProfiles()` falla no hay `<ErrorMessage>` en el modo `list`
* [x] Vacio — `t('profiles_noProfiles')` con instruccion de uso cuando la lista esta vacia
* [ ] Offline — sin deteccion de red; importacion puede fallar silenciosamente si `brew install` no tiene red
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; modos multiples (create-name, create-desc, etc.) sin indicacion de progreso accesible
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#FFD700`, `#EF4444`, `#6B7280`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; lista de profiles sin paginacion virtual (podria ser larga)
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `importGenRef` cancela el generator en unmount evitando leaks; `mountedRef` previene setState tras desmontaje

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Error de `fetchProfiles()` no se muestra en modo `list`; `loadError` solo aparece en sub-modos de creacion/edicion | Alta | `src/views/profiles.tsx:116-117` | Agregar `{loadError && <ErrorMessage message={loadError} />}` en la rama de renderizado de lista |
| Bug | Lista de profiles sin paginacion virtual: si el usuario tiene muchos profiles, la lista puede exceder la altura del terminal sin scroll | Media | `src/views/profiles.tsx:250-264` | Aplicar paginacion virtual con `useStdout().rows` igual que otras listas |
| Riesgo | Importacion masiva de paquetes desde perfil sin indicacion del numero total de paquetes a instalar antes de confirmar | Alta | `src/views/profiles.tsx:66-70` | Mostrar resumen (N formulae, M casks) antes de iniciar la importacion |
| Mejora | Sin analitica (evento `profile_create`, `profile_import`, `profile_delete`) | Baja | Archivo completo | Tracking de operaciones de perfil |

---

## Pantalla: SmartCleanupView (Pro)

* **Feature:** Limpieza inteligente de dependencias huerfanas (Pro)
* **Ruta de navegacion:** Tecla `9` (gateada por `isPro()`)
* **Fuente de datos:** `useCleanupStore` — `analyze()`, `toggleSelect()`, `selectAll()`; `useBrewStream` para uninstall
* **Casos de uso asociados:** Detectar paquetes huerfanos, seleccionar, desinstalar, forzar si hay error de dependencia

### Cobertura

* [x] Estado inicial — `loading: true` durante analisis inicial
* [x] Cargando — `<Loading message={t('loading_cleanup')} />`
* [x] Error — `<ErrorMessage message={error} />` para error de analisis
* [x] Vacio — `t('cleanup_systemClean')` cuando no hay candidatos
* [ ] Offline — sin deteccion de red; `analyze()` usa `du -sk` (local) y `brew --cellar` (local), por lo que el analisis no depende de red, pero la desinstalacion si usa brew que puede intentar contactar servidores
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; checkboxes visuales (`☑`/`☐`) no tienen representacion accesible
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#F59E0B`, `#EF4444`, `#F9FAFB`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; lista de candidatos sin paginacion virtual
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `hasRefreshed` ref previene double-fetch; stream con cancellation en unmount

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Riesgo | Desinstalacion de dependencias puede romper herramientas del sistema no gestionadas por Homebrew — deteccion de huerfanos basada solo en `brew leaves` puede tener falsos positivos | Critica | `src/views/smart-cleanup.tsx:55,99,128-129` | Agregar advertencia explicita ("estos paquetes pueden ser requeridos por herramientas externas a Homebrew") y requerir confirmacion de dos pasos para la desinstalacion |
| Bug | Lista de candidatos sin paginacion virtual: en sistemas con muchas dependencias huerfanas, la lista puede exceder la altura del terminal | Media | `src/views/smart-cleanup.tsx:144-164` | Aplicar paginacion virtual con ventana calculada desde `useStdout().rows` |
| Mejora | El estado de `failedNames` se inicializa con todos los nombres seleccionados antes de la desinstalacion (`setFailedNames(names)`) — si la desinstalacion tiene exito, `failedNames` queda "sucio" para la siguiente operacion | Baja | `src/views/smart-cleanup.tsx:129-130` | Limpiar `failedNames` en `hasRefreshed` callback o tras analisis exitoso |
| Mejora | Sin analitica de limpieza (evento `cleanup_analyze`, `cleanup_uninstall`, espacio recuperado) | Baja | Archivo completo | Tracking de operaciones destructivas con metadata de espacio recuperado |

---

## Pantalla: HistoryView (Pro)

* **Feature:** Historial de operaciones Homebrew (Pro)
* **Ruta de navegacion:** Tecla `0` (gateada por `isPro()`)
* **Fuente de datos:** `useHistoryStore` — `fetchHistory()`, `clearHistory()`; `useBrewStream` para replay
* **Casos de uso asociados:** Ver historial de installs/uninstalls/upgrades, filtrar, buscar, repetir operacion, limpiar historial

### Cobertura

* [x] Estado inicial — store inicializa `entries: []` con `loading: false` (no pre-inicializado a true)
* [x] Cargando — `<Loading message={t('loading_history')} />`
* [x] Error — `<ErrorMessage message={error} />`
* [x] Vacio — `t('history_noEntries')` o `t('history_noEntriesFor', { filter })` segun filtro activo
* [ ] Offline — sin deteccion de red; replay de operaciones puede fallar sin red de forma silenciosa mas alla del error del stream
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; filtro activo cambia color pero no tiene representacion textual en un campo accesible
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#EF4444`, `#06B6D4`, `#9CA3AF`, `#F9FAFB`, `#FFD700`)
* [ ] Dynamic Type — sin adaptacion
* [x] Rotacion / tamano — usa `useStdout()` para `MAX_VISIBLE_ROWS`; paginacion virtual implementada
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `useMemo` para `filtered`; `useDebounce(200ms)` para searchQuery; paginacion virtual

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Replay de `upgrade-all` desde historial ejecuta `brew upgrade` sin confirmacion del estado actual de paquetes — podria actualizar mas paquetes de los originalmente actualizados | Alta | `src/views/history.tsx:144-146` | Mostrar en el dialogo de confirmacion de replay que "upgrade-all" actualizara todos los paquetes desactualizados al momento de la reproduccion, no los del momento original |
| Mejora | `loading` del historyStore no se pre-inicializa a `true`: hay un frame donde la lista aparece vacia antes del spinner | Baja | `src/stores/history-store.ts` (implicito) | Pre-inicializar `loading: true` en el store |
| Mejora | Sin analitica (evento `history_view`, `history_replay`, `history_clear`) | Baja | Archivo completo | Tracking de operaciones de historial |

---

## Pantalla: SecurityAuditView (Pro)

* **Feature:** Auditoria de seguridad via OSV.dev (Pro)
* **Ruta de navegacion:** Tecla `!` / acceso desde menu (gateada por `isPro()`)
* **Fuente de datos:** `useSecurityStore` — `scan()` via OSV.dev API; `useBrewStream` para upgrade
* **Casos de uso asociados:** Escanear CVEs en paquetes instalados, ver detalle de vulnerabilidades, actualizar paquete afectado

### Cobertura

* [x] Estado inicial — `loading: true` durante escaneo inicial
* [x] Cargando — `<Loading message={t('loading_security')} />`
* [x] Error — `<ErrorMessage message={error} />`
* [x] Vacio — `t('security_noVulns')` con icono verde cuando no hay vulnerabilidades
* [ ] Offline — sin deteccion de red; si OSV.dev no esta disponible, el error generico se muestra sin indicar "servicio externo no disponible"
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; vulnerabilidades expandidas/colapsadas sin indicacion accesible de estado
* [ ] Dark mode — colores hardcodeados (`#EF4444`, `#F59E0B`, `#6B7280`, `#22C55E`, `#9CA3AF`, `#06B6D4`, `#F9FAFB`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; summaries de vulnerabilidades con `wrap="wrap"` pero sin limite de columnas
* [ ] Instrumentacion analitica — ninguna
* [ ] Rendimiento — `results` derivado de `summary?.results ?? []` sin `useMemo`; recalculado en cada render pero de bajo impacto dado el tamano esperado del dataset

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | `results` derivado de `summary` sin `useMemo`; menor inconsistencia con el patron del proyecto | Baja | `src/views/security-audit.tsx:40` | Envolver con `useMemo([summary])` para consistencia |
| Mejora | Sin mensaje diferenciado para error de servicio externo OSV.dev (timeout, HTTP 5xx) vs error local | Media | `src/views/security-audit.tsx:58-59` | Categorizar el error en `useSecurityStore.scan()` para mostrar "servicio externo no disponible" vs error local |
| Mejora | Sin cache de resultados de escaneo: cada vez que el usuario navega a la vista se realiza un escaneo completo contra OSV.dev | Media | `src/stores/security-store.ts` (implicito) | Agregar TTL de cache (ej. 1h) para resultados del escaneo |
| Mejora | Sin analitica (evento `security_scan`, vulnerabilidades encontradas, paquete actualizado) | Baja | Archivo completo | Tracking de resultado de auditoria de seguridad |

---

## Pantalla: AccountView

* **Feature:** Gestion de licencia y cuenta
* **Ruta de navegacion:** Acceso desde menu (sin atajo numerico; no en VIEWS_KEYS)
* **Fuente de datos:** `useLicenseStore` — `status`, `license`, `deactivate()`, `degradation`
* **Casos de uso asociados:** Ver estado de licencia, activar Pro (via CLI), desactivar licencia, ver info de cuenta

### Cobertura

* [x] Estado inicial — el store carga la licencia en `app.tsx:useEffect` antes de renderizar la vista
* [x] Cargando — `<Loading message={t('account_loading')} />` durante `status === 'validating'`
* [ ] Error — no hay manejo explicito de error en la propia vista si `deactivate()` falla; el `finally` simplemente resetea `setDeactivating(false)` sin mostrar feedback de error al usuario
* [x] Vacio — no aplica directamente; todos los estados de licencia (free/pro/expired) tienen representacion
* [ ] Offline — el degradation warning (`license_offlineWarning`) se muestra pero no hay manejo de escenario "sin red durante deactivation"
* [ ] Permisos — No aplica
* [ ] Accesibilidad — sin etiquetas; `maskKey` muestra la clave parcialmente pero sin label accesible explicando el mascarado
* [ ] Dark mode — colores hardcodeados (`#22C55E`, `#9CA3AF`, `#EF4444`, `#FF6B2B`, `#06B6D4`, `#38BDF8`, `#F9FAFB`)
* [ ] Dynamic Type — sin adaptacion
* [ ] Rotacion / tamano — no usa `useStdout()`; contenido estatico con padding fijo
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — sin computaciones pesadas; `maskKey` es O(n) sobre string corto

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Fallo en `deactivate()` es silencioso: el `try/catch` en `onConfirm` no tiene rama `catch` con feedback de error | Alta | `src/views/account.tsx:41-49` | Agregar `catch(err)` con `setDeactivateError(...)` y mostrar el error al usuario |
| Bug | `account.tsx` no tiene atajo de teclado numerico (no esta en `VIEWS`) — el usuario solo puede llegar alli via Tab/Shift+Tab; no hay instruccion visible de como acceder | Media | `src/stores/navigation-store.ts:14-17`, `src/views/account.tsx` | Documentar el atajo de navegacion en el footer o agregar AccountView a VIEWS con un numero de tecla |
| Mejora | Sin analitica (evento `account_view`, `license_deactivate`) | Baja | Archivo completo | Tracking de interacciones con la cuenta |

---

## Pantallas Swift BrewBar (SwiftUI)

---

## Pantalla: PopoverView

* **Feature:** Vista principal del popover del menu bar
* **Ruta de navegacion:** Click en el icono de BrewBar en la barra de menu
* **Fuente de datos:** `AppState` (@Observable) — `refresh()` via `BrewChecker`
* **Casos de uso asociados:** Ver resumen de actualizaciones disponibles, ver errores de servicios, abrir Brew-TUI, acceder a ajustes, salir

### Cobertura

* [x] Estado inicial — `AppState` inicializa `outdatedPackages: []`, `isLoading: false`; el `AppDelegate` dispara `refresh()` en `applicationDidFinishLaunching`
* [x] Cargando — `loadingView` con `ProgressView("Checking for updates...")` + spinner inline en el header mientras `isLoading`
* [x] Error — `errorView(_:)` con icono de advertencia, mensaje de error y boton "Retry"
* [x] Vacio — `upToDateView` con icono de exito verde y timestamp de ultima comprobacion
* [ ] Offline — sin deteccion de red (`NWPathMonitor`); si el Mac no tiene red, el error de `brew outdated` se muestra como un error generico sin indicar "sin conexion"
* [x] Permisos — No aplica en PopoverView (los permisos de notificacion se gestionan en SettingsView)
* [x] Accesibilidad — botones con `.accessibilityLabel` via `String(localized:)` para Retry, Open Brew-TUI, Settings, Quit; `Image(systemName:)` tiene descripcion simbolica automatica en VoiceOver
* [x] Dark mode — usa colores semanticos de SwiftUI (`.primary`, `.secondary`, `.tertiary`, `.green`, `.yellow`, `.orange`) que se adaptan automaticamente; sin colores hardcodeados hexadecimales
* [ ] Dynamic Type — `headerView` usa `.headline`/`.caption` (escalable), pero `loadingView` usa `ProgressView` de tamano fijo; el icono `upToDateView` usa `.font(.system(size: 40))` hardcodeado que no escala con Dynamic Type
* [x] Rotacion / tamano — menu bar popover es siempre `.frame(width: 340, height: 420)` — fijo por diseno de la plataforma; correcto para macOS popover
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `@Observable` con `@MainActor` garantiza actualizaciones en el hilo principal; operaciones de red en `async` tasks; `async let` en paralelo para outdated + services

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | `Text("Homebrew Updates")` en `headerView` usa un string literal que es `LocalizedStringKey` (correcto para SwiftUI auto-extraction), pero `Text("All packages up to date")` en `upToDateView` tambien es literal y NO tiene traduccion al espanol en el `.xcstrings` — verificar cobertura del catalogo | Media | `PopoverView.swift:47,108` | Ejecutar `tuist generate` y verificar en Xcode que todos los literales esten en el catalogo de localizacion con traduccion al espanol |
| Bug | `.font(.system(size: 40))` en `upToDateView` es un tamano fijo que no escala con Dynamic Type del sistema | Media | `PopoverView.swift:106` | Reemplazar por `.font(.system(.largeTitle))` o una TextStyle semantica escalable |
| Mejora | Sin `accessibilityHint` en el boton de refresh para indicar que actualiza la lista de paquetes | Baja | `PopoverView.swift:68` | Agregar `.accessibilityHint(String(localized: "Refreshes the list of outdated packages"))` |
| Mejora | La tarea en el boton de refresh (`Task { await appState.refresh() }`) no almacena el handle; si el popover se cierra durante el refresh, la tarea queda huerfana | Baja | `PopoverView.swift:62-65` | Almacenar la `Task` en un `@State` para poder cancelarla en `onDisappear` |
| Mejora | Sin Reduce Motion: no hay animaciones explicitas, pero si se agregan en el futuro, usar `withAnimation(.default.speed(isReduceMotion ? 0 : 1))` | Baja | `PopoverView.swift` completo | Agregar `@Environment(\.accessibilityReduceMotion)` como preparacion futura |
| Mejora | Sin analitica (evento `popover_open`, `open_brew_tui`) | Baja | Archivo completo | Tracking de interacciones del popover |

---

## Pantalla: OutdatedListView

* **Feature:** Lista de paquetes con actualizaciones disponibles (subvista del popover)
* **Ruta de navegacion:** Subvista de `PopoverView` cuando `outdatedPackages` no esta vacia
* **Fuente de datos:** `AppState` — `outdatedPackages`; `upgrade(package:)` y `upgradeAll()`
* **Casos de uso asociados:** Ver lista de paquetes desactualizados, actualizar individualmente (Pro) o todos (Pro), ver pin de paquete

### Cobertura

* [ ] Estado inicial — no tiene estado propio inicial; depende del estado de `AppState` pasado desde `PopoverView`
* [ ] Cargando — no tiene estado de carga propio; el spinner del header en `PopoverView` lo cubre parcialmente pero no hay indicador en la lista durante upgrade individual
* [x] Error — la fila de paquete se deshabilita con `.disabled(appState.isLoading || pkg.pinned)` durante operaciones; error de upgrade es manejado en `AppState` y mostrado en `PopoverView.errorView`
* [ ] Vacio — no aplica (esta vista solo se muestra cuando hay paquetes)
* [ ] Offline — sin deteccion de red
* [ ] Permisos — No aplica (acciones de upgrade heredan permisos de Homebrew)
* [x] Accesibilidad — "Upgrade All" tiene `.accessibilityLabel`; filas individuales tienen `.accessibilityLabel(String(format: String(localized: "Upgrade %@"), pkg.name))`; `confirmationDialog` es nativo de SwiftUI y accesible
* [x] Dark mode — usa `Color.orange`, `Color.cyan`, `.secondary`, `.foregroundStyle(.secondary)` — colores semanticos; `private let installedVersionColor = Color.orange` y `currentVersionColor = Color.cyan` son colores fijos pero adaptados a dark mode
* [x] Dynamic Type — `Text(pkg.name).font(.system(.body, design: .monospaced))` escala correctamente; `.font(.caption)` y `.font(.caption2)` escalan con Dynamic Type; se anota finding para tallas Extra Large
* [x] Rotacion / tamano — `LazyVStack` dentro de `ScrollView` para lista eficiente; `HStack`/`VStack` adaptativos
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — `LazyVStack` para carga diferida de filas; `Binding` custom para `confirmationDialog` individual sin estado de array; `@Observable` garantiza reactividad minima

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Mejora | Sin indicador de progreso durante upgrade individual: el boton se deshabilita pero no hay feedback visual en la fila del paquete que esta siendo actualizado | Media | `OutdatedListView.swift:81-87` | Agregar un `ProgressView` inline junto al boton de upgrade cuando `appState.isLoading && appState.upgradingPackage == pkg.name` |
| Mejora | `Color.cyan` como `currentVersionColor` puede tener contraste insuficiente en modo claro de macOS (cyan claro sobre fondo blanco) | Baja | `OutdatedListView.swift:8` | Verificar contraste y usar `.teal` o un color con mayor contraste semantico |
| Mejora | `.font(.caption2)` para versiones de paquetes puede quedar demasiado pequenio con Dynamic Type en talla Extra Large — sin `minimumScaleFactor` especificado | Baja | `OutdatedListView.swift:60-67` | Agregar `.minimumScaleFactor(0.8)` o cambiar a `.caption` para las versiones |
| Mejora | Sin analitica (evento `package_upgrade_single`, `package_upgrade_all`) | Baja | Archivo completo | Tracking de acciones de upgrade |

---

## Pantalla: SettingsView

* **Feature:** Ajustes de BrewBar
* **Ruta de navegacion:** Boton gear en el footer de `PopoverView` → `.sheet`
* **Fuente de datos:** `SchedulerService` — `interval`, `notificationsEnabled`, `notificationsDenied`; `SMAppService.mainApp` para launch at login
* **Casos de uso asociados:** Configurar intervalo de comprobacion, activar/desactivar notificaciones, activar/desactivar launch at login

### Cobertura

* [x] Estado inicial — `launchAtLogin` inicializado desde `SMAppService.mainApp.status` en el `init`; `notificationsDenied` sincronizado via `.task { await scheduler.syncNotificationPermission() }`
* [x] Cargando — no hay estado de carga explicito (ajustes son sincronos excepto `syncNotificationPermission`); `.task` se ejecuta en background sin bloquear la UI
* [ ] Error — si `SMAppService.mainApp.register()` o `.unregister()` falla, el toggle revierte al valor anterior (`launchAtLogin = !newValue`) pero no muestra mensaje de error al usuario
* [x] Vacio — no aplica (la vista siempre tiene contenido)
* [ ] Offline — no aplica directamente (ajustes locales), excepto que la verificacion de licencia que habilita `canUpgrade` requiere red
* [x] Permisos — maneja el estado de permiso de notificaciones: `.disabled(scheduler.notificationsDenied)` + mensaje de instruccion para ir a System Settings
* [x] Accesibilidad — `Form` con `.formStyle(.grouped)` genera automaticamente grupos accesibles; `Picker`, `Toggle` son controles nativos con accesibilidad integrada; `Button("Done")` con `.keyboardShortcut(.defaultAction)` es accesible
* [x] Dark mode — todos los colores usan `.orange` semantico y estilos de fuente de SwiftUI; sin colores hardcodeados hexadecimales — correcto
* [ ] Dynamic Type — `Form` y controles nativos escalan automaticamente con Dynamic Type; `.font(.caption)` del mensaje de notificaciones denegadas puede quedar muy pequenio en tallas Extra Large sin `minimumScaleFactor`
* [x] Rotacion / tamano — `.frame(width: 300)` con height adaptativo via `VStack` — correcto para sheet modal en macOS
* [ ] Instrumentacion analitica — ninguna
* [x] Rendimiento — sin computaciones; ajustes son O(1); `syncNotificationPermission()` es async y no bloquea

### Hallazgos

| Tipo | Descripcion | Severidad | Evidencia | Accion |
|------|-------------|-----------|-----------|--------|
| Bug | Fallo en `SMAppService.register()/unregister()` revierte el toggle silenciosamente sin feedback de error | Media | `SettingsView.swift:55-63` | Agregar `@State private var loginError: String? = nil` y mostrar `Text(loginError)` cuando no sea nil tras el fallo |
| Bug | Strings `"BrewBar Settings"`, `"Check interval"`, `"Notifications"`, `"Launch at login"`, `"Done"` son literales de SwiftUI y se extraen automaticamente al `.xcstrings`; SIN EMBARGO el mensaje largo `"Notifications are disabled in System Settings..."` usa `Text("...")` directo sin `String(localized:)` — en este caso tambien funciona (es LocalizedStringKey) pero es inconsistente con el patron del resto de strings no-SwiftUI del proyecto | Baja | `SettingsView.swift:46-48` | Cambiar a `Text(LocalizedStringKey("Notifications are disabled in System Settings. Enable them in System Settings > Notifications > BrewBar."))` o dejar como esta si el catalogo lo cubre |
| Mejora | Sin `accessibilityLabel` explicito en el boton "Done" — SwiftUI lo infiere del texto, lo cual es correcto, pero agregar un hint de contexto mejoraria la UX de VoiceOver | Baja | `SettingsView.swift:70` | Agregar `.accessibilityHint(String(localized: "Closes the settings panel"))` |
| Mejora | Sin analitica de cambio de ajustes (evento `settings_interval_changed`, `settings_notifications_toggled`, `settings_login_toggled`) | Baja | Archivo completo | Tracking de cambios de configuracion |

---

## Hallazgos transversales (aplican a todas las pantallas)

| Tipo | Descripcion | Severidad | Afecta | Accion |
|------|-------------|-----------|--------|--------|
| Mejora | **Sin instrumentacion analitica en todo el proyecto**: ninguna vista implementa tracking de eventos, screen views ni errores — imposible medir engagement, funnel de conversion free→Pro, o tasas de error en produccion | Alta | 15/15 vistas | Integrar una solucion de telemetria ligera (ej. Posthog self-hosted, Plausible, o metricas locales anonimizadas via archivo de log) |
| Mejora | **Sin manejo de escenario offline en TUI**: todos los errores de red se muestran como mensajes de CLI crudos sin diferenciar "sin red" de otros errores | Media | 12/12 vistas TUI | Agregar deteccion de error de conectividad en `brew-cli.ts` (exit code o pattern matching en stderr) y propagar tipo de error al store |
| Mejora | **Colores hardcodeados en hexadecimal en todas las vistas TUI**: paleta de colores no adaptable al esquema de color del terminal del usuario; `#F9FAFB` y colores claros son ilegibles en terminales con fondo blanco | Media | 12/12 vistas TUI | Definir paleta centralizada de colores en un modulo `src/theme.ts` con variantes para fondo oscuro/claro; detectar esquema via variable de entorno `COLORFGBG` o flag `--theme` |
| Mejora | **Sin accesibilidad en vistas TUI**: Ink 5.x no expone APIs de accesibilidad equivalentes a ARIA; sin embargo, el uso de caracteres Unicode para cursores (▶) y checkboxes (☑/☐) puede ser problemático en terminales sin soporte de Unicode | Baja | 12/12 vistas TUI | Agregar flag `--no-unicode` que sustituya simbolos Unicode por alternativas ASCII; documentar limitaciones de accesibilidad del terminal |
