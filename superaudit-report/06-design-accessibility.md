# 7. Design System

> Auditor: design-auditor | Fecha: 2026-04-23

## Resumen ejecutivo

Brew-TUI v0.2.0 introduce un archivo de tokens de color (`src/utils/colors.ts`) como corrección de la v0.1.0, pero ese archivo no está importado en ningún módulo de la codebase: los 253 valores hex hardcodeados siguen dispersos en 26 archivos sin cambio alguno. La capa de sistema de diseño es rudimentaria: no existen tokens de espaciado, radios, sombras ni motion. BrewBar (SwiftUI) presenta ausencia total de adaptaciones de accesibilidad del sistema (Dynamic Type bloqueado por frame fijo, sin soporte a Reduce Motion, Increase Contrast ni Bold Text), y varios botones con solo icono carecen de etiqueta accesible.

---

## 7.1 Tokens

### Checklist

* [x] Colores semanticos definidos en archivo centralizado (`src/utils/colors.ts` — `COLORS`)
* [ ] Tokens de color adoptados en vistas y componentes — **Alta**: `COLORS` existe pero tiene 0 importaciones; todos los valores hex siguen hardcodeados
* [ ] Tipografia definida por roles — **Media**: no existe archivo de escala tipografica; todos los tamaños son los defaults de Ink (`<Text bold>`, etc.) sin sistema formal
* [ ] Espaciado tokenizado — **Media**: magic numbers en todos los `paddingX`, `paddingY`, `gap`, `marginTop`; no existe un archivo de constantes de espaciado
* [ ] Radios consistentes — **Baja**: Ink solo expone `borderStyle` sin configuracion de radio; en BrewBar se usa el sistema de `Form`/`Button` de SwiftUI sin tokens propios
* [ ] Sombras/elevacion sistematizadas — **No aplica**: Ink no soporta sombras; BrewBar usa efectos del sistema sin overrides
* [ ] Motion tokens definidos — **Baja**: no existen tokens de duracion/curva; el unico motion es el `Spinner` de `@inkjs/ui` (sin configuracion)
* [ ] Tokens de opacidad definidos — **Baja**: se usa `dimColor` de Ink como unico mecanismo de opacidad sin valor tokenizado
* [x] Gradientes centralizados en `GRADIENTS` (`src/utils/gradient.tsx`) — usados en todas las vistas

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| `COLORS` definido pero sin uso | No conforme | Alta | `src/utils/colors.ts` — 0 importaciones confirmadas via grep; 253 ocurrencias de hex hardcodeados en 26 archivos | Importar `COLORS` en todos los componentes y vistas; reemplazar hex inline por referencias al token |
| Duplicacion de valores hex entre `COLORS` y `StatusBadge` | No conforme | Media | `src/components/common/status-badge.tsx` lineas 7-11 define `'#22C55E'`, `'#F59E0B'`, `'#EF4444'`, `'#3B82F6'`, `'#6B7280'` — identicos a `COLORS.success`, `COLORS.warning`, `COLORS.error`, `COLORS.info`, `COLORS.muted` | Refactorizar `BADGE_STYLES` para usar `COLORS.*` |
| Sin tokens de espaciado | No conforme | Media | 114 ocurrencias de `paddingX/Y`, `gap`, `marginTop/Bottom` con magic numbers (1, 2, 3) en 21 archivos | Crear `src/utils/spacing.ts` con escala tokenizada (e.g. `SPACING.xs=1`, `sm=2`, `md=3`) |
| Color `#38BDF8` (azul claro) no incluido en `COLORS` | No conforme | Baja | Usado en `progress-log.tsx` (borde, titulo), `account.tsx` (estados), `upgrade-prompt.tsx` (url), `header.tsx` (borde) — no mapeado a ningun token | Agregar `COLORS.highlight = '#38BDF8'` o evaluar si debe unificarse con `COLORS.info` |
| Color `#2DD4BF` (teal) no incluido en `COLORS` | No conforme | Baja | Usado en `version-arrow.tsx`, `package-info.tsx`, `installed.tsx`, `security-audit.tsx` | Agregar `COLORS.teal` o renombrar como `COLORS.versionNew` |
| Color `#FF6B2B` (brand) presente en `COLORS` pero no adoptado | No conforme | Alta | `upgrade-prompt.tsx` linea 29 usa `'#FF6B2B'` literal en lugar de `COLORS.brand` (igual para `pro-badge.tsx`, `header.tsx`) | Reemplazar por `COLORS.brand` |
| `AccentColor.colorset` sin variante dark mode | No conforme | Baja | `menubar/BrewBar/Resources/Assets.xcassets/AccentColor.colorset/Contents.json` — entrada universal unica sin appearance dark | Agregar entrada dark mode con color adaptado |

---

## 7.2 Componentes base

### Checklist

* [x] Button — `ConfirmDialog` provee botones de confirmacion/cancelacion; en BrewBar SwiftUI usa `Button` nativo
* [ ] TextField reutilizable estilizado — **Baja**: `SearchInput` encapsula `TextInput` de `@inkjs/ui`; los campos de `ProfilesView` usan `TextInput` directamente sin wrapper; no existe un `StyledTextField` unificado
* [x] SecureField — No aplica para TUI; BrewBar no tiene inputs de password
* [x] SearchBar — `SearchInput` componente en `src/components/common/search-input.tsx`
* [x] StatCard — `src/components/common/stat-card.tsx`
* [ ] Row — No existe componente de fila reutilizable; cada vista implementa su propio patron cursor+texto con colores duplicados
* [ ] Sheet container — No aplica en TUI; en BrewBar se usa `.sheet()` nativo sin wrapper
* [ ] Banner — No existe; las notificaciones de exito/error son `Box borderStyle="round"` ad-hoc en cada vista (patron repetido 14+ veces)
* [ ] Toast — No existe; mismo patron que Banner
* [ ] Empty state — No existe componente unificado; cada vista implementa su propio estado vacio con diferentes estilos
* [ ] Error state — Existe `ErrorMessage` en `src/components/common/loading.tsx` pero no es un componente autonomo con icono y accion
* [x] Skeleton/Loading — `Loading` con `Spinner` en `src/components/common/loading.tsx`
* [x] Loading indicator — `Spinner` via `@inkjs/ui` en `Loading` y `ProgressLog`
* [x] ProgressLog — `src/components/common/progress-log.tsx` (streaming de brew)
* [x] UpgradePrompt — `src/components/common/upgrade-prompt.tsx`
* [x] ProBadge — `src/components/common/pro-badge.tsx`
* [x] StatusBadge — `src/components/common/status-badge.tsx`
* [x] VersionArrow — `src/components/common/version-arrow.tsx`
* [x] SectionHeader — `src/components/common/section-header.tsx`

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Patron de banner exito/error duplicado 14+ veces | No conforme | Media | `Box borderStyle="round" borderColor="#22C55E/#EF4444" paddingX={2}` repetido en `installed.tsx`, `search.tsx`, `outdated.tsx`, `smart-cleanup.tsx`, `profiles.tsx`, `package-info.tsx`, `security-audit.tsx`, `doctor.tsx` | Extraer `<ResultBanner status="success|error" message={...} />` en `src/components/common/` |
| Patron de fila cursor+texto sin componente Row | No conforme | Media | El patron `<Text color={isCurrent ? '#22C55E' : '#9CA3AF'}>{isCurrent ? '▶' : ' '}</Text>` + texto con `inverse={isCurrent}` se repite en todas las vistas de lista (6 vistas) con colores hardcodeados | Extraer `<SelectableRow isCurrent={bool} label={string} />` |
| `TextInput` sin wrapper en `ProfilesView` | No conforme | Baja | `src/views/profiles.tsx` lineas 136-140, 149, 167, 179 usan `TextInput` directamente con placeholder sin el estilo unificado de `SearchInput` | Usar `SearchInput` o crear `FormInput` wrapper que estandarice el estilo |
| `ErrorMessage` mezclado con `Loading` en mismo archivo | Parcial | Baja | `src/components/common/loading.tsx` exporta tanto `Loading` como `ErrorMessage` — logica mezclada | Separar en `error-message.tsx` independiente |

---

## 7.3 Calidad del sistema visual

### Checklist

* [x] Variantes definidas en componentes clave (`StatusBadge` con 5 variantes, `StatCard` con prop `color`)
* [ ] Estados hover/focus/pressed/disabled — **Baja**: TUI no tiene hover nativo; el estado `isCurrent`/`inverse` sirve como selected, pero no existe disabled state visual unificado
* [ ] Sin overrides locales injustificados — **Alta**: los 253 valores hex hardcodeados en vistas son overrides que eluden el sistema de tokens
* [x] Componentes encapsulan estilo (`StatusBadge`, `StatCard`, `SectionHeader`, `VersionArrow`, `ProBadge` encapsulan su estilo)
* [x] Nombres semanticos en tokens de `COLORS` (`success`, `error`, `warning`, `brand`, `muted`)
* [x] Dark mode consistente en TUI — No aplica (terminal controla el tema; los colores hex se renderizan via ANSI sobre el fondo del terminal)
* [x] Dark mode en BrewBar — `.foregroundStyle(.secondary/.tertiary)` y colores semanticos del sistema son adaptativos; colores literales (`.red`, `.green`, `.orange`) son adaptativos en SwiftUI
* [ ] Contraste suficiente — **Media**: `#6B7280` (gris) sobre fondo negro del terminal da ratio ~3.5:1, por debajo del 4.5:1 requerido para texto normal; usado extensivamente para texto secundario y pistas
* [x] Gradientes definidos centralmente en `GRADIENTS` con paletas nombradas (gold, sunset, ocean, emerald, fire, pro)
* [ ] Frame fijo en BrewBar — **Media**: `PopoverView` fijado a `340x420` pt sin posibilidad de adaptacion a Dynamic Type

### Auditoria de componentes

| Componente | Variantes | Estados | Accesible | Reutilizable | Hallazgo |
|------------|-----------|---------|-----------|--------------|----------|
| `StatusBadge` | 5 (success/warning/error/info/muted) | Solo renderizado | Parcial (texto+icono, sin role) | Si | Colores hardcodeados inline, no usa `COLORS.*` |
| `StatCard` | 1 (color como prop) | Solo renderizado | Parcial (texto plano) | Si | `#9CA3AF` hardcodeado para label |
| `ConfirmDialog` | 1 | Activo/inactivo via `useModal` | Parcial | Si | Colores `#A855F7`, `#22C55E`, `#EF4444` hardcodeados |
| `Loading` / `Spinner` | 1 | Animado / estatico | Parcial (mensaje textual) | Si | Sin control de Reduce Motion |
| `ProgressLog` | 1 | Running / stopped | Parcial | Si | `#38BDF8` hardcodeado |
| `SearchInput` | 1 | Activo / inactivo | Parcial | Si | `#FFD700` hardcodeado para icono |
| `SectionHeader` | 2 (color / gradient) | Solo renderizado | Parcial | Si | `#FFD700` default hardcodeado |
| `UpgradePrompt` | 1 | Solo renderizado | Parcial | Si | 7 valores hex hardcodeados |
| `Header` | N/A | Vista activa / inactiva | Parcial | Si | Colores hardcodeados; logo no oculto de VoiceOver |
| `Footer` | N/A | Vista activa | Parcial | Si | Colores hardcodeados |
| `GradientText` | Por paleta GRADIENTS | Solo renderizado | Parcial (texto renderizado caracter a caracter) | Si | Ningun problema estructural; paletas no referencian `COLORS` |
| `VersionArrow` | 1 | Solo renderizado | No (distincion por color puro) | Si | Version antigua en rojo, nueva en teal — solo color diferencia estados |
| PopoverView (Swift) | N/A | Loading/error/upToDate/outdated | Parcial | Si | Frame fijo; botones icono sin label |
| OutdatedListView (Swift) | N/A | Normal / loading / pinned | Parcial | Si | Botones upgrade sin accessibilityLabel |
| SettingsView (Swift) | N/A | Normal / denied | Conforme | Si | Form nativo con labels correctos |

---

# 8. Accesibilidad

## 8.1 Semantica

### Checklist

* [ ] `.accessibilityLabel` en elementos interactivos TUI — **Media**: Ink/terminal no expone API de accesibilidad semantica; no es posible en el medio
* [ ] `.accessibilityLabel` en botones icono BrewBar — **Alta**: botones gear, power, arrow.clockwise, arrow.up.circle en `PopoverView` y `OutdatedListView` usan solo `Image(systemName:)` sin `.accessibilityLabel`
* [x] `accessibilityDescription` en icono de la barra de menus — `AppDelegate.swift` lineas 141 y 168 configuran descripcion correcta con conteo de updates
* [ ] `.accessibilityHidden` en imagenes decorativas BrewBar — **Baja**: `Image(systemName: "arrow.right")` en `OutdatedListView` linea 56 (flecha decorativa entre versiones) no esta marcada como decorativa
* [ ] Agrupacion semantica de filas en `OutdatedListView` — **Baja**: nombre, version-de, version-a y boton upgrade no estan agrupados como elemento accesible unico
* [ ] Traits correctos — **Media**: botones icono sin `.accessibilityLabel` tendran traits de boton pero label generado por SF Symbol name (e.g. "arrow.clockwise" en lugar de "Refresh")
* [x] Textos de error con contenido descriptivo (`ErrorMessage` pasa el mensaje como texto, `NSAlert` con `messageText` + `informativeText`)
* [ ] Roles de cabecera — **Baja**: en BrewBar, `Text("Homebrew Updates")` y `Text("BrewBar Settings")` no tienen `.accessibilityAddTraits(.isHeader)`

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Boton Refresh sin accessibilityLabel | No conforme | Alta | `PopoverView.swift` lineas 57-61: `Button { Task { await appState.refresh() } } label: { Image(systemName: "arrow.clockwise") }` — sin label textual ni `.accessibilityLabel` | Agregar `.accessibilityLabel(String(localized: "Refresh"))` o usar `Label("Refresh", systemImage: "arrow.clockwise")` con `.labelStyle(.iconOnly)` |
| Boton Settings sin accessibilityLabel | No conforme | Alta | `PopoverView.swift` lineas 161-164: `Button { showSettings = true } label: { Image(systemName: "gear") }` — sin label | Agregar `.accessibilityLabel(String(localized: "Settings"))` |
| Boton Quit sin accessibilityLabel | No conforme | Alta | `PopoverView.swift` lineas 167-170: `Button { NSApp.terminate(nil) } label: { Image(systemName: "power") }` — sin label | Agregar `.accessibilityLabel(String(localized: "Quit"))` |
| Boton upgrade por paquete sin accessibilityLabel | No conforme | Alta | `OutdatedListView.swift` lineas 74-79: `Button { Task { await appState.upgrade(package: pkg.name) } } label: { Image(systemName: "arrow.up.circle") }` — sin label contextual | Agregar `.accessibilityLabel(String(format: String(localized: "Upgrade %@"), pkg.name))` |
| Flecha decorativa entre versiones sin accessibilityHidden | No conforme | Baja | `OutdatedListView.swift` linea 56-58: `Image(systemName: "arrow.right")` es decorativa — VoiceOver la leera como "arrow.right" | Agregar `.accessibilityHidden(true)` |
| Cabeceras de seccion sin trait `.isHeader` | No conforme | Baja | `PopoverView.swift` linea 43: `Text("Homebrew Updates").font(.headline)` y `SettingsView.swift` linea 13: `Text("BrewBar Settings").font(.headline)` | Agregar `.accessibilityAddTraits(.isHeader)` |

---

## 8.2 Interaccion

### Checklist

* [x] Tamano de toque suficiente en BrewBar — los botones en `PopoverView` tienen `padding` suficiente; `.contentShape(Rectangle())` en `packageRow` de `OutdatedListView` extiende el area tactil a toda la fila (linea 84)
* [x] Confirmaciones para acciones destructivas — `ConfirmDialog` en TUI; `.confirmationDialog` nativo en `OutdatedListView` para upgrade-all
* [x] TUI: navegacion por teclado exhaustiva con `j/k`, flechas, Enter, Esc, numeros de vista
* [ ] TUI: inputs de texto no etiquetados visualmente — **Baja**: los `TextInput` en `ProfilesView` (crear/editar perfil) solo muestran un `Text bold` como etiqueta pero no estan semanticamente asociados
* [x] Voice Control en BrewBar — botones con texto (`"Upgrade All"`, `"Retry"`, `"Done"`, `"Open Brew-TUI"`) son activables por nombre; botones icono sin label NO son activables por nombre (hallazgo en 8.1)
* [ ] Custom actions para filas de paquetes en BrewBar — **Baja**: no existen `.accessibilityAction` custom para las filas de `OutdatedListView`; el boton upgrade es el unico mecanismo de accion
* [x] ProgressView en carga de BrewBar — `ProgressView()` nativo con `scaleEffect` accesible

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Botones icono inaccesibles para Voice Control | No conforme | Alta | `PopoverView.swift`: botones gear/power/arrow.clockwise sin label — Voice Control no puede activarlos por voz | Resolver con el mismo fix de `.accessibilityLabel` del punto 8.1 |
| TextInput sin etiqueta semantica en ProfilesView | No conforme | Baja | `src/views/profiles.tsx` lineas 132-160: `Text bold` y `TextInput` son hermanos en un `Box`, no asociados semanticamente | Limitacion del medio (terminal); documentar como no aplica para TUI |

---

## 8.3 Adaptaciones del sistema

### Checklist

* [ ] Dynamic Type en BrewBar — **Alta**: `PopoverView` tiene `frame(width: 340, height: 420)` fijo; `.font(.system(size: 40))` en linea 100 es tamano absoluto que ignora Dynamic Type
* [ ] Bold Text en BrewBar — **Media**: no hay uso de `@Environment(\.legibilityWeight)` ni `UIAccessibility.isBoldTextEnabled`; las fuentes no se adaptan a la configuracion Bold Text del sistema
* [ ] Increase Contrast en BrewBar — **Media**: no hay uso de `@Environment(\.colorSchemeContrast)`; los colores `.red`/`.green`/`.orange` semanticos del sistema son adaptativos en contraste, pero el `AccentColor.colorset` no tiene variante de alto contraste
* [ ] Reduce Motion en BrewBar — **Media**: no hay uso de `@Environment(\.accessibilityReduceMotion)`; no hay animaciones explicitas identificadas (no hay `withAnimation`), por lo que el riesgo es bajo en la version actual, pero ninguna animacion futura estaria protegida
* [ ] Reduce Motion en TUI — **Baja**: el `Spinner` de `@inkjs/ui` anima en terminal; no hay mecanismo para desactivarlo; impacto bajo dado el medio
* [ ] Reduce Transparency en BrewBar — **Baja**: no hay efectos blur/vibrancy activos; sin embargo, si se agregan en el futuro no habra proteccion
* [x] Diferenciacion sin color en BrewBar — los estados se diferencian por texto e iconos ademas de color (checkmark.circle.fill para ok, exclamationmark.triangle para error)
* [ ] Diferenciacion sin color en TUI `VersionArrow` — **Media**: `VersionArrow` muestra version-antigua en rojo y version-nueva en teal sin ningun otro indicador diferenciador (no hay icono, no hay etiqueta)
* [x] Dark mode en TUI — el terminal controla el fondo; los hex de Brew-TUI son colores ANSI que el emulador renderiza; no aplica
* [x] Dark mode en BrewBar — colores semanticos del sistema (.secondary, .tertiary, .red, .green, .orange) son adaptativos; imagenes template con isTemplate=true se adaptan

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Frame fijo bloquea Dynamic Type en BrewBar | No conforme | Alta | `PopoverView.swift` linea 32: `.frame(width: 340, height: 420)` — el popover no crecera con texto mas grande | Cambiar a `.frame(width: 340, minHeight: 420)` o mejor `.frame(width: 340)` con altura dinamica |
| Tamano de fuente absoluto ignorando Dynamic Type | No conforme | Media | `PopoverView.swift` linea 100: `.font(.system(size: 40))` — hardcoded en puntos | Reemplazar por `.font(.system(size: 40, design: .default))` con `@ScaledMetric` o por `.font(.largeTitle)` (linea 81 usa correctamente `.font(.largeTitle)`) |
| Sin soporte a Bold Text | No conforme | Media | Ninguno de los 3 archivos de vista Swift usa `@Environment(\.legibilityWeight)` | Evaluar si algun texto deberia reforzar su peso con la configuracion del sistema |
| Sin soporte a Increase Contrast | No conforme | Media | Ninguna vista SwiftUI usa `@Environment(\.colorSchemeContrast)` | Agregar variantes de color de alto contraste para elementos de estado critico (error, warning) |
| `VersionArrow` diferencia versiones solo por color | No conforme | Media | `src/components/common/version-arrow.tsx` — `current` en `#EF4444`, `latest` en `#2DD4BF`; solo color los distingue | Agregar etiquetas textuales (e.g. "instalado:", "disponible:") o simbolos contextuales |
| Sin proteccion para Reduce Motion en animaciones futuras | Parcial | Baja | Codigo Swift actual no tiene `withAnimation`; sin embargo, no hay patron de guardia establecido | Agregar wrapper de utilidad `func animateIfAllowed<Result>(_ animation: Animation, _ body: () -> Result)` que verifique `.accessibilityReduceMotion` |

---

## 8.4 Media y contenido

### Checklist

* [x] Imagenes de sistema con descripcion implicita — SF Symbols en BrewBar (`mug.fill`, `arrow.clockwise`, etc.) tienen nombres descriptivos; VoiceOver usa el nombre del simbolo si no hay label
* [ ] Imagenes decorativas ocultas — **Baja**: `Image(systemName: "arrow.right")` en `OutdatedListView` linea 56 es decorativa pero no tiene `.accessibilityHidden(true)` (ya reportado en 8.1)
* [x] Videos — No aplica; la aplicacion no incluye contenido de video
* [x] Audio — No aplica; la aplicacion no incluye contenido de audio
* [x] Icono de barra de menus — `button.image?.accessibilityDescription` correctamente configurado en `AppDelegate` con descripcion dinamica que incluye el conteo de updates
* [ ] Logo ASCII en TUI — **Baja**: el logo BREW-TUI se renderiza como caracteres Unicode de caja (box-drawing); VoiceOver en terminal leera cada caracter de caja; no esta marcado como decorativo (no aplicable en Ink directamente)
* [x] Texto de notificaciones push — `SchedulerService` usa `UNMutableNotificationContent`; los titulos son textos descriptivos via String Catalog

### Hallazgos

| Elemento | Estado | Severidad | Evidencia | Accion |
|----------|--------|-----------|-----------|--------|
| Flecha decorativa entre versiones sin marcar | No conforme | Baja | `OutdatedListView.swift` linea 56: `Image(systemName: "arrow.right")` entre versiones installed → current | Agregar `.accessibilityHidden(true)` |
| Logo ASCII potencialmente ruidoso para lectores de pantalla en terminal | Parcial | Baja | `src/components/layout/header.tsx` lineas 11-26: arrays `LOGO_BREW` y `LOGO_TUI` con caracteres Unicode de caja; en terminales con VoiceOver activado podria generar ruido | No existe API Ink para ocultar nodos; como mitigacion, documentarlo; severidad baja dado el contexto de uso (usuarios tecnicos en terminal) |

---

## Registro de accesibilidad por pantalla

| Pantalla | VoiceOver | Dynamic Type | Contraste | Reduce Motion | Hallazgo |
|----------|-----------|--------------|-----------|---------------|----------|
| Dashboard (TUI) | No aplica | No aplica | Parcial | No aplica | `#6B7280` en texto secundario: ratio ~3.5:1 por debajo de WCAG AA (4.5:1) |
| Installed (TUI) | No aplica | No aplica | Parcial | No aplica | Mismo problema de contraste en texto `#6B7280`; `VersionArrow` sin diferenciacion no-color |
| Search (TUI) | No aplica | No aplica | Parcial | No aplica | `#6B7280` en hints; resultados solo diferenciados por cursor (color verde) |
| Outdated (TUI) | No aplica | No aplica | Parcial | No aplica | `VersionArrow` solo distingue versiones por color |
| Services (TUI) | No aplica | No aplica | Parcial | No aplica | Estado del servicio via `StatusBadge` — icono+texto, correctamente diferenciado |
| Doctor (TUI) | No aplica | No aplica | Parcial | No aplica | Advertencias con borde amarillo + texto; diferenciacion adecuada |
| Profiles (TUI) | No aplica | No aplica | Parcial | No aplica | `TextInput` sin etiqueta semantica; solo contexto visual del `Text bold` encima |
| Smart Cleanup (TUI) | No aplica | No aplica | Parcial | No aplica | Checkboxes `☑/☐` son Unicode puro — no semanticos, pero legibles |
| History (TUI) | No aplica | No aplica | Parcial | No aplica | Iconos de accion (`+`, `-`, `↑`) con color pero tambien con texto en columna siguiente |
| Security Audit (TUI) | No aplica | No aplica | Parcial | No aplica | Severidad CRITICAL/HIGH ambas en `#EF4444` sin distincion adicional |
| Package Info (TUI) | No aplica | No aplica | Parcial | No aplica | Badges de estado correctos (texto+icono); pistas de accion en gris claro `#6B7280` |
| Account (TUI) | No aplica | No aplica | Parcial | No aplica | Estados Pro/free/expired diferenciados por color y texto |
| PopoverView (BrewBar) | No conforme | No conforme | Parcial | No aplica | 4 botones icono sin `.accessibilityLabel`; frame fijo bloquea Dynamic Type |
| OutdatedListView (BrewBar) | No conforme | No conforme | Parcial | No aplica | Boton upgrade sin label contextual; flecha decorativa no oculta; frame fijo |
| SettingsView (BrewBar) | Conforme | Parcial | Conforme | No aplica | Form nativo con labels; `.font(.headline)` sin trait `.isHeader`; contraste conforme via sistema |

---

## Notas de contexto del medio

**TUI (Ink/terminal):** Las columnas de VoiceOver, Dynamic Type, Reduce Motion y muchas APIs de accesibilidad semantica son inaplicables para una aplicacion de terminal. Ink renderiza a stdout via ANSI; la accesibilidad en este medio es responsabilidad del emulador de terminal y del sistema operativo (VoiceOver para macOS puede leer texto en terminal). No se penaliza la ausencia de APIs de accesibilidad propias de UIKit/SwiftUI en el contexto TUI.

**BrewBar (SwiftUI):** Al ser una aplicacion macOS nativa con SwiftUI, todas las APIs de accesibilidad del sistema son exigibles. Los hallazgos de BrewBar son los que requieren atencion prioritaria.
