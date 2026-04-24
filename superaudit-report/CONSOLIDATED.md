# CONSOLIDATED — Reporte de Auditoria Super-Audit

> Generado por: report-consolidator | Fecha: 2026-04-23
> Proyecto: Brew-TUI v0.2.0 | Commit: 65c7308 | Rama: main

---

## 1. Resumen ejecutivo

Brew-TUI v0.2.0 es un proyecto hibrido de calidad media-alta para su etapa de desarrollo. La arquitectura de la TUI TypeScript es coherente y bien estructurada en sus capas superiores, con patrones consistentes de manejo de estado, streams asincronos cancelables, cifrado AES-256-GCM en reposo y rate limiting en la activacion de licencias. BrewBar presenta un codigo Swift 6 ejemplar en separacion de responsabilidades y cobertura de previews. El refactor de v0.2.0 elimino 61 hallazgos previos verificados como conformes, lo que indica una deuda tecnica que se gestiona activamente.

Sin embargo, la auditoria identifica **dos bloqueantes absolutos para la distribucion en produccion**. El primero es que BrewBar.app se distribuye sin firma de codigo ni notarizacion: cualquier usuario de macOS con Gatekeeper activo (configuracion por defecto desde macOS 10.15) recibira el mensaje "BrewBar cannot be opened because the developer cannot be verified" y no podra usar la aplicacion. El segundo es que el mecanismo de verificacion de integridad SHA-256 del instalador de BrewBar es codigo muerto en produccion: el archivo `.sha256` nunca ha sido generado por el workflow de CI, el instalador recibe un 404 al intentar descargarlo, el `catch` descarta el error silenciosamente, y la comparacion de hash nunca ha ejecutado desde que se implemento la funcionalidad. Los usuarios instalan un binario no verificado.

En el dominio de calidad y testing, la situacion es preocupante. El comando `npm run test` ejecuta correctamente los 8 tests presentes, pero el paso de CI pasa igualmente si vitest no encuentra ningun test — es un false-green que no protege contra regresiones. La logica de degradacion de licencia (`getDegradationLevel`), que determina si un usuario Pro puede seguir accediendo a las funcionalidades de pago durante un periodo offline, no tiene ningun test unitario. Tampoco existe cobertura de integracion para el flujo completo de activacion, cifrado, almacenamiento y revalidacion de licencia — el nucleo del modelo de negocio. BrewBar carece completamente de target XCTest. La observabilidad es inexistente en ambas codebases: ni crash reporting, ni analytics, ni logging estructurado, lo que hace imposible diagnosticar fallos en produccion o medir el funnel de conversion free → Pro.

Los dominios de design system y accesibilidad presentan deuda acumulada pero no bloqueante. El archivo `COLORS.ts` fue creado como fix en v0.2.0 pero no ha sido importado en ningun modulo: 253 valores hex hardcodeados permanecen dispersos en 26 archivos. Los botones icono de BrewBar (Refresh, Settings, Quit, upgrade individual) carecen de `.accessibilityLabel`, lo que los hace inoperables para usuarios de VoiceOver y Voice Control. El frame fijo de `PopoverView` (340x420 pt) bloquea el soporte a Dynamic Type. La arquitectura de capas muestra una inversion sistematica: cinco modulos de `lib/` importan directamente del store de Zustand (`useLicenseStore`), violando el flujo de dependencias esperado.

En conjunto, el proyecto es **no apto para produccion en su estado actual** debido a los dos bloqueantes de distribucion descritos. Una vez resueltos — firma de codigo, notarizacion y generacion del checksum SHA-256 en CI — el proyecto puede avanzar a beta interna siempre que se implementen tests minimos para la logica de degradacion de licencia y el flujo de activacion. El resto de hallazgos (design system, accesibilidad, observabilidad, capas arquitectonicas) son deuda tecnica relevante que debe planificarse para versiones posteriores.

---

## 2. Registro central de hallazgos

> Metodologia de deduplicacion: cuando un hallazgo aparece en multiples reportes, se registra una unica vez con el reporte canonico como fuente. Las referencias cruzadas se indican en la columna Evidencia. Los hallazgos transversales de pantallas (12-screens.md) y endpoints (13-endpoints.md) que duplican hallazgos ya registrados en dominios previos se consolidan en el dominio canonico.

### Hallazgos Criticos

| ID | Dominio | Subzona | Hallazgo | Evidencia | Accion | Estado |
|----|---------|---------|----------|-----------|--------|--------|
| SEG-001 | Seguridad | Distribucion / CI-CD | BrewBar.app distribuido sin firma de codigo ni notarizacion — Gatekeeper bloquea el lanzamiento en macOS por defecto | `release.yml:62-66` sin `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM` ni `notarytool`; tambien en 11-release.md 18.1 | Obtener Apple Developer Program; agregar `codesign` con Developer ID Certificate y `xcrun notarytool submit --staple` en el job `build-brewbar`; cambiar `xcodebuild build` a `archive + exportArchive` | Pendiente |
| QA-001 | Testing | Unit tests | `getDegradationLevel` — logica critica de time-bomb para el modelo de negocio sin ningun test unitario; controla acceso Pro en escenario offline | `src/lib/license/license-manager.ts:179` — rangos 0-7d, 7-14d, 14-30d, 30+d sin cobertura | Cubrir todos los rangos de tiempo con tests de fecha inyectada via parametro; es la logica de negocio mas critica del producto | Pendiente |
| QA-002 | Testing | Integration tests | Flujo completo de licencia sin test end-to-end: activate → saveLicense (AES-256-GCM) → loadLicense → decrypt → revalidate no tiene ninguna cobertura de integracion | `src/lib/license/` — 3 test files cubren stores pero no el flujo IO real sobre disco | Crear test de integracion con filesystem temporal que cubra el ciclo completo de la licencia | Pendiente |
| QA-003 | Testing | CI / pipeline | `npm run test` retorna exit 0 en CI aunque no haya ningun test que ejecutar — false-green que no protege contra regresiones | `release.yml:25` — vitest sin `--passWithNoTests false`; el paso publica a npm sin garantia de cobertura | Configurar vitest con `passWithNoTests: false` o equivalente hasta que exista cobertura minima establecida | Pendiente |
| SCR-001 | Pantallas | SmartCleanupView | Desinstalacion de dependencias puede romper herramientas del sistema no gestionadas por Homebrew — deteccion de huerfanos basada solo en `brew leaves` puede producir falsos positivos criticos | `src/views/smart-cleanup.tsx:55,99,128-129` | Agregar advertencia explicita y confirmacion de dos pasos; indicar que paquetes externos a Homebrew pueden verse afectados | Pendiente |

### Hallazgos Alta

| ID | Dominio | Subzona | Hallazgo | Evidencia | Accion | Estado |
|----|---------|---------|----------|-----------|--------|--------|
| SEG-002 | Seguridad | Distribucion / CI-CD | Verificacion SHA-256 de BrewBar es codigo muerto: el archivo `.sha256` nunca ha sido generado en CI; el instalador recibe un 404 y descarta el error; la comparacion de hash nunca ha ejecutado en produccion | `release.yml` sin `shasum`; `brewbar-installer.ts:63,73-76`; tambien en 13-endpoints.md E10, E11 | Agregar `shasum -a 256 BrewBar.app.zip > BrewBar.app.zip.sha256` en CI; subir ambos artefactos; corregir el `catch` para no descartar 404s cuando el archivo checksum deberia existir | Pendiente |
| ARQ-001 | Arquitectura | Separacion de capas | Cinco modulos de `lib/` importan directamente `useLicenseStore` del store layer, invirtiendo la jerarquia de dependencias (lib debe desconocer stores) | `history-logger.ts:5`, `audit-runner.ts:3`, `cleanup-analyzer.ts:6`, `profile-manager.ts:9`, `brewbar-installer.ts:9` | Refactorizar para recibir `{ license, status }` como parametros desde la capa de stores/hooks | Pendiente |
| QA-004 | Testing | Unit tests | Cobertura unitaria insuficiente para el modelo de negocio: `license-manager.ts`, `cleanup-analyzer.ts`, `osv-api.ts`, `profile-manager.ts` sin cobertura unitaria directa | `src/lib/` — 8 tests en 3 archivos; dominio critico sin tests | Ampliar cobertura hacia los modulos de negocio criticos; prioridad: `license-manager.ts` y `validateProfileName` (path traversal prevention) | Pendiente |
| QA-005 | Testing | Unit tests | Rate limiting en memoria (`checkRateLimit` / `recordAttempt`) sin tests — lockout tras MAX_ATTEMPTS no verificado automaticamente | `src/lib/license/license-manager.ts:29-58` | Verificar lockout tras 5 intentos y reset en caso de exito | Pendiente |
| QA-006 | Testing | Unit tests | `validateProfileName` sin test — previene path traversal; es una funcion de seguridad sin cobertura automatizada | `src/lib/profiles/profile-manager.ts:25-35` | Cubrir: nombre vacio, longitud maxima, caracteres especiales, `../` traversal | Pendiente |
| QA-007 | Testing | Integration tests | AES-256-GCM round-trip sin verificacion automatica: el cifrado/descifrado de licencias no tiene test | `src/lib/license/license-manager.ts:73-103` | Test que encripte y desencripte datos de licencia verificando integridad del GCM tag | Pendiente |
| QA-008 | Testing | Integration tests | `polar-api.ts` sin mock de red — flujo de activacion/validacion/desactivacion sin test | `src/lib/license/polar-api.ts` | Usar `vi.mock` o MSW para simular respuestas de Polar; cubrir exito, clave invalida, red caida | Pendiente |
| QA-009 | Testing | Integration tests | `osv-api.ts` fallback HTTP 400 sin test — rama critica de recuperacion de seguridad sin cobertura | `src/lib/security/osv-api.ts:72-77` | Test que simule HTTP 400 del batch y verifique fallback a `queryOneByOne` | Pendiente |
| QA-010 | Testing | UI tests | `ink-testing-library` instalada pero sin ningun test que la importe — inversion en infraestructura sin retorno | `package.json` devDependencies — `ink-testing-library ^4.0.0` | Crear tests de renderizado para `ConfirmDialog`, `StatusBadge`, `ProgressLog`, `AccountView` | Pendiente |
| QA-011 | Testing | UI tests | Flujo de activacion de licencia en UI sin test — pantalla de mayor impacto de negocio sin cobertura | `src/views/account.tsx` | Test con `ink-testing-library` que verifique estado inicial, formulario de activacion y estado Pro | Pendiente |
| QA-012 | Testing | Observabilidad | Sin logging estructurado en TypeScript: 22 `console.*` dispersas sin niveles formales ni metadatos | `src/index.tsx`, `src/stores/brew-store.ts` | Adoptar `pino` o wrapper `logger.ts` con niveles y contexto estructurado | Pendiente |
| QA-013 | Testing | Observabilidad | BrewBar sin logging absolutamente: 0 llamadas a `Logger`/`OSLog` en 12 archivos Swift — fallos silenciosos en BrewChecker, SchedulerService, AppState | `menubar/BrewBar/Sources/` completo | Integrar `os.Logger` con subsistema `com.molinesdesigns.brewbar` para errores criticos | Pendiente |
| QA-014 | Testing | Crash reporting | Sin crash reporting en TypeScript ni en BrewBar Swift — imposible diagnosticar fallos en produccion | `package.json` sin Sentry/Bugsnag; `Project.swift` sin dependencias de crash reporting | Integrar `@sentry/node` para TypeScript y Sentry/Swift o `os_log` para BrewBar | Pendiente |
| ACC-001 | Accesibilidad | BrewBar buttons | Cuatro botones icono en BrewBar (Refresh, Settings, Quit, upgrade individual) sin `.accessibilityLabel` — inoperables para VoiceOver y Voice Control | `PopoverView.swift:57-61,161-164,167-170`; `OutdatedListView.swift:74-79` | Agregar `.accessibilityLabel(String(localized: "..."))` o usar `Label("...", systemImage: "...")` con `.labelStyle(.iconOnly)` | Pendiente |
| ACC-002 | Accesibilidad | BrewBar Dynamic Type | Frame fijo `340x420` en `PopoverView` bloquea Dynamic Type — con tamaños de fuente grandes el texto se trunca sin adaptacion | `PopoverView.swift:32` — `.frame(width: 340, height: 420)` fijo | Cambiar a `.frame(width: 340, minHeight: 420)` o `.frame(width: 340)` con altura dinamica | Pendiente |
| DS-001 | Design system | Tokens de color | `COLORS.ts` creado como fix en v0.2.0 pero no importado en ningun modulo: 253 literales hex hardcodeados permanecen en 26 archivos — el fix declarado no se aplico | `src/utils/colors.ts` — 0 importaciones; grep confirma; tambien en 04-frontend FE-13 | Importar `COLORS` en todos los componentes y vistas; reemplazar hex inline por referencias a tokens | Pendiente |
| BK-001 | Backend | Autenticacion | Clave de cifrado AES-256-GCM embebida en codigo fuente: `ENCRYPTION_SECRET` / `SCRYPT_SALT` en `license-manager.ts` y hex precomputado en `LicenseChecker.swift` — permite descifrar cualquier `license.json` local | `license-manager.ts:61-62`; `LicenseChecker.swift:47`; tambien en 02-governance, 03-architecture | Documentar como riesgo conocido inherente al modelo client-side; considerar componente derivado de UUID de maquina para hacer la clave no portable | Pendiente |
| EP-001 | Endpoints | Polar.sh / Validacion | Respuestas de Polar.sh (`PolarActivation`, `PolarValidated`) no validadas en runtime — `res.json() as T` sin type guard; campos criticos como `activation.id` o `res.status` pueden ser `undefined`, corrompiendo la licencia persistida | `polar-api.ts:66`; tambien en 13-endpoints E01, E03 | Agregar `assertPolarActivation(obj)` y `assertPolarValidated(obj)` que verifiquen campos requeridos antes de usar la respuesta | Pendiente |
| EP-002 | Endpoints | OSV.dev / Validacion | `OsvBatchResponse` no validada en runtime; `catch {}` vacio en one-by-one descarta errores 5xx y de red, produciendo falsos negativos de seguridad | `osv-api.ts:79-83,113-115`; tambien en 13-endpoints E05, E07 | Verificar `Array.isArray(data.results)`; en one-by-one, distinguir rechazo de paquete (400) de error de servidor (5xx) | Pendiente |
| EP-003 | Endpoints | GitHub Releases | Limite de descarga de 200 MB inefectivo si el servidor omite `Content-Length` — el stream se descarga sin limite real | `brewbar-installer.ts:62-63`; tambien en 13-endpoints E09 | Implementar contador de bytes durante `pipeline` que aborte si supera el maximo | Pendiente |
| SCR-002 | Pantallas | InstalledView | Cabeceras de columna `'Package'`, `'Version'`, `'Status'` hardcodeadas en ingles en lugar de usar `t()` — incumplimiento i18n en vista principal | `src/views/installed.tsx:187-189` | Agregar claves i18n `installed_colPackage`, `installed_colVersion`, `installed_colStatus` | Pendiente |
| SCR-003 | Pantallas | SearchView | Fallback de error de busqueda hardcodeado en ingles (`'Search failed'`) sin usar `t()` | `src/views/search.tsx:52` | Reemplazar con `t('search_failed')` y agregar la clave a `en.ts`/`es.ts` | Pendiente |
| SCR-004 | Pantallas | ProfilesView | Error de `fetchProfiles()` no se muestra en modo `list`; `loadError` solo aparece en sub-modos de creacion/edicion | `src/views/profiles.tsx:116-117` | Agregar `{loadError && <ErrorMessage message={loadError} />}` en la rama de renderizado de lista | Pendiente |
| SCR-005 | Pantallas | ProfilesView | Importacion masiva de paquetes desde perfil sin mostrar resumen previo (N formulae, M casks) — el usuario confirma sin saber el alcance | `src/views/profiles.tsx:66-70` | Mostrar resumen de paquetes antes de iniciar la importacion | Pendiente |
| SCR-006 | Pantallas | HistoryView | Replay de `upgrade-all` desde historial ejecuta `brew upgrade` sin confirmacion del estado actual — puede actualizar mas paquetes de los originalmente actualizados | `src/views/history.tsx:144-146` | Advertir en el dialogo que "upgrade-all" actualizara todos los paquetes desactualizados al momento del replay | Pendiente |
| SCR-007 | Pantallas | AccountView | Fallo en `deactivate()` es silencioso: el `try/catch` no tiene rama `catch` con feedback de error al usuario | `src/views/account.tsx:41-49` | Agregar `catch(err)` con `setDeactivateError(...)` y mostrar el error | Pendiente |
| REL-001 | Release | CI / Build | `xcodebuild build` en lugar de `archive` en CI — no se genera `.xcarchive`; sin `exportOptions.plist`; el `.app` se extrae del `DerivedData` con `find` | `release.yml:62-66` | Cambiar a `xcodebuild archive` + `xcodebuild -exportArchive` con `ExportOptions.plist` | Pendiente |

### Hallazgos Media

| ID | Dominio | Subzona | Hallazgo | Evidencia | Accion | Estado |
|----|---------|---------|----------|-----------|--------|--------|
| ARQ-002 | Arquitectura | Flujo de datos | `outdated.tsx` importa `execBrew` directamente eludiendo la capa de API — la operacion de pin no pasa por ningun parser ni se registra en el store | `src/views/outdated.tsx:5` | Crear `pinPackage(name)` / `unpinPackage(name)` en `brew-api.ts` | Pendiente |
| ARQ-003 | Arquitectura | Concurrencia | `_revalidating` flag booleano de modulo no atomico — dos microtasks pueden evaluar el flag antes de que alguna lo setee, causando revalidaciones duplicadas | `src/stores/license-store.ts:12,58,79` | Reemplazar por `Promise` pendiente como mutex real: `let _revalidationPromise: Promise<void> | null = null` | Pendiente |
| ARQ-004 | Arquitectura | Cache / Staleness | `lastFetchedAt` definido en el store pero no usado para invalidacion ni para mostrar timestamp en UI — el tracking existe pero no cierra el ciclo | `src/stores/brew-store.ts:17,40,57` | Leer `lastFetchedAt` en `DashboardView` y vistas de lista para mostrar "Actualizado hace X" | Pendiente |
| ARQ-005 | Arquitectura | Cache | Sin cache de resultados de OSV.dev: cada montaje de `SecurityAuditView` lanza un scan completo — latencia de ~2-5s en cada navegacion | `src/stores/security-store.ts`; tambien en 10-performance y 16-red | Introducir cache con TTL de 15-60 min; solo refrescar si el usuario lo pide o TTL expirado | Pendiente |
| ARQ-006 | Arquitectura | Concurrencia | `brewUpdate().catch(() => {})` silencia completamente cualquier error de `brew update` — el usuario no recibe feedback si falla | `src/stores/brew-store.ts:147` | Cambiar a `.catch((err) => set({ errors: { ...state.errors, update: String(err) } }))` | Pendiente |
| ARQ-007 | Arquitectura | Concurrencia | Tasks fire-and-forget en botones SwiftUI de BrewBar sin handle de cancelacion — si el popover se cierra durante la operacion, la tarea continua sin control | `PopoverView.swift:57,88`; `OutdatedListView.swift:26,75` | Almacenar handles en `@State` y cancelar en `.onDisappear`; o usar `.task` modifier | Pendiente |
| ARQ-008 | Arquitectura | Concurrencia | `DispatchQueue.global().asyncAfter` mezclado con Swift concurrency en `BrewChecker`; `OnceGuard` con `@unchecked Sendable` requiere discipline manual | `BrewChecker.swift:78`; `BrewChecker.swift:27` | Reemplazar timeout con `Task { try await Task.sleep(...); if process.isRunning { process.terminate() } }` | Pendiente |
| GOV-001 | Gobierno | Info.plist | `NSMainStoryboardFile = "Main"` heredado del template Tuist en `Project.swift` sin archivo storyboard correspondiente — ruido en el plist | `Project.swift:30-35` | Usar `.dictionary(entries:)` o agregar `"NSMainStoryboardFile": ""` para sobrescribir el default | Pendiente |
| GOV-002 | Gobierno | Info.plist | `CFBundleShortVersionString` no definido explicitamente en `Project.swift` — el bundle podria mostrar version `1.0` en lugar de `0.2.0` | `Project.swift:30-35` — bloque sin `CFBundleShortVersionString` ni `CFBundleVersion` | Agregar `"CFBundleShortVersionString": "$(MARKETING_VERSION)"` en el bloque `infoPlist:` | Pendiente |
| GOV-003 | Gobierno | Secretos | Clave AES-256-GCM en codigo fuente — mismo hallazgo que BK-001; registrado en Gobierno para trazabilidad de compliance | `license-manager.ts:61-62`; `LicenseChecker.swift:47` | Ver BK-001 | Pendiente |
| GOV-004 | Gobierno | Build settings | `SWIFT_STRICT_CONCURRENCY` no declarado explicitamente en `Project.swift` — dependencia del default del compilador Swift 6 sin documentar la intencion | `Project.swift` — clave ausente; Swift 6 default es `complete` | Agregar `"SWIFT_STRICT_CONCURRENCY": "complete"` en base settings de `Project.swift` | Pendiente |
| BK-002 | Backend | Autenticacion | Licencia no almacenada en Keychain macOS: datos en `~/.brew-tui/license.json`; ningun uso de `SecItem` ni `kSecClass` en todo el proyecto | `data-dir.ts`; ninguna referencia a Keychain | Considerar almacenar el license key en Keychain y usar el archivo cifrado solo para metadatos no sensibles | Pendiente |
| BK-003 | Backend | Validacion | Cast sin validacion de tipos en `loadLicense`: `JSON.parse(...) as LicenseData` sin comprobar que campos requeridos existan y sean strings | `license-manager.ts:103` | Agregar type guard `isLicenseData(obj): obj is LicenseData` que verifique campos requeridos | Pendiente |
| BK-004 | Backend | Resiliencia | Sin timeout en `execBrew` (TypeScript): procesos `brew info`, `brew list`, `brew outdated` etc. pueden colgar indefinidamente — el equivalente Swift tiene timeout de 60s | `brew-cli.ts:3-21`; tambien en 10-performance, 13-endpoints E14 | Agregar `{ timeout: 30_000 }` en `spawn()` para todas las llamadas `execBrew` | Pendiente |
| BK-005 | Backend | Persistencia | `saveProfile` no usa escritura atomica (tmp + rename) a diferencia de `saveLicense` y `saveHistory` — riesgo de corrupcion de perfil si el proceso termina durante la escritura | `profile-manager.ts:78` | Reemplazar por patron `writeFile(tmpPath, ...)` + `rename(tmpPath, finalPath)` | Pendiente |
| BK-006 | Backend | Persistencia | Sin proteccion contra escrituras concurrentes entre procesos en `history.json` y `profiles/` — dos instancias de brew-tui simultaneas pueden corromper datos | `history-logger.ts`, `profile-manager.ts` — sin `flock` ni lock de archivo | Agregar lock de archivo con `proper-lockfile` o equivalente antes de load+save | Pendiente |
| SEG-003 | Seguridad | Privacidad | Watermark invisible con email del usuario embebido en perfiles exportados sin consentimiento explicito — caracteres Unicode de ancho cero con PII | `src/lib/license/watermark.ts:25-38`; `profile-manager.ts:111`; el codigo fuente reconoce el problema en un comentario | Agregar consentimiento explicito antes de exportar; ofrecer opcion de exportar sin watermark | Pendiente |
| SEG-004 | Seguridad | Privacidad | `hostname()` del equipo transmitido a Polar.sh como campo `label` sin informar al usuario — puede contener nombre real del propietario | `polar-api.ts:73` — `label: hostname()` | Reemplazar con UUID anonimo o `instanceId` existente | Pendiente |
| QA-015 | Testing | Observabilidad | `console.error` en brew-store gateado por `NODE_ENV !== 'production'` — errores de `fetchLeaves` son silenciosos en produccion | `src/stores/brew-store.ts:121-123` | Loguear errores no criticos en produccion al menos con referencia opaca (sin PII) | Pendiente |
| QA-016 | Testing | Observabilidad | Sin analytics en TUI ni BrewBar — funnel de conversion free → Pro no medible; uso de features Pro desconocido | 0 referencias a SDK de analytics en ambas codebases | Integrar analytics con privacidad (PostHog self-hosted o equivalente) con opt-in explicito | Pendiente |
| QA-017 | Testing | Observabilidad | Sourcemaps deshabilitados en produccion sin preservacion en artefactos de release — imposible symbolikar crashes reportados manualmente | `tsup.config.ts:13` — `sourcemap: false` | Habilitar sourcemaps en artefactos de release sin incluirlos en el bundle distribuido | Pendiente |
| QA-018 | Testing | Observabilidad | dSYM no preservado en CI — `xcodebuild` produce dSYM pero el artefacto empaquetado es solo `BrewBar.app.zip` | `release.yml:60-76` | Incluir dSYM en artifact o subirlo a servicio de symbolication | Pendiente |
| QA-019 | Testing | Snapshot | Sin herramienta de snapshot / visual regression — sin infraestructura para detectar regresiones de UI automaticamente | `package.json` y `Project.swift` sin dependencias de snapshot | Evaluar `swift-snapshot-testing` para BrewBar y snapshots de texto para el TUI | Pendiente |
| QA-020 | Testing | Unit tests | Parsers cubiertos solo parcialmente — `parseInstalledJson`, `parseOutdatedJson`, `parseBrewConfig` sin cobertura | `src/lib/parsers/parsers.test.ts` — solo cubre 4 de 7 funciones de parseo | Completar cobertura con fixtures reales de `brew info`, `brew outdated --json` y `brew config` | Pendiente |
| QA-021 | Testing | Unit tests | Canary functions sin test — `checkCanaries()` no verificado que `isProUnlocked()` etc. retornen `false` | `src/lib/license/canary.ts` | Anadir test que verifique que las canary functions retornan `false` en build de produccion | Pendiente |
| QA-022 | Testing | UI tests | BrewBar sin XCUITest target — 0 targets de test en `Project.swift` | `menubar/Project.swift` — un unico target `BrewBar` sin target de tests | Anadir target XCTest con al menos un smoke test de arranque y mocks de Process/URLSession | Pendiente |
| DS-002 | Design system | Tokens | Duplicacion de valores hex entre `COLORS` y `StatusBadge` — los 5 colores semanticos redefinidos localmente en lugar de importar `COLORS.*` | `src/components/common/status-badge.tsx:7-11` | Refactorizar `BADGE_STYLES` para usar `COLORS.*` | Pendiente |
| DS-003 | Design system | Tokens | Sin tokens de espaciado: 114 magic numbers en `paddingX/Y`, `gap`, `marginTop/Bottom` en 21 archivos | Grep de `paddingX` / `paddingY` en `src/` — 114 ocurrencias | Crear `src/utils/spacing.ts` con escala tokenizada (`SPACING.xs=1`, `sm=2`, `md=3`) | Pendiente |
| DS-004 | Design system | Componentes | Patron de banner exito/error duplicado 14+ veces: `Box borderStyle="round"` ad-hoc sin componente extraido | `installed.tsx`, `search.tsx`, `outdated.tsx`, `smart-cleanup.tsx`, etc. | Extraer `<ResultBanner status="success|error" message={...} />` en `src/components/common/` | Pendiente |
| DS-005 | Design system | Componentes | Patron de fila cursor+texto repetido en 6 vistas sin componente `Row` reutilizable — colores hardcodeados en cada instancia | `installed.tsx`, `outdated.tsx`, `history.tsx`, `doctor.tsx`, `profiles.tsx`, `cleanup.tsx` | Extraer `<SelectableRow isCurrent={bool} label={string} />` | Pendiente |
| DS-006 | Design system | Accesibilidad | Contraste insuficiente: `#6B7280` sobre fondo negro da ratio ~3.5:1, por debajo de WCAG AA (4.5:1) — usado extensivamente para texto secundario | `src/components/` — grep de `#6B7280` en 15+ archivos | Usar color con contraste minimo 4.5:1 para texto secundario en contexto de terminal | Pendiente |
| DS-007 | Design system | Accesibilidad | `VersionArrow` diferencia versiones solo por color (rojo/teal) sin otro indicador — no accesible para usuarios con deficiencia de vision del color | `src/components/common/version-arrow.tsx` | Agregar etiquetas textuales ("instalado:", "disponible:") o simbolos contextuales | Pendiente |
| DS-008 | Design system | Accesibilidad BrewBar | Sin soporte a Bold Text, Increase Contrast ni Reduce Motion en BrewBar — sin uso de `@Environment(\.legibilityWeight)`, `colorSchemeContrast` ni `accessibilityReduceMotion` | `PopoverView.swift`, `OutdatedListView.swift`, `SettingsView.swift` — ninguno de los tres | Evaluar adaptaciones: Bold Text para textos criticos; colores alternativos de alto contraste para estados error/warning | Pendiente |
| DS-009 | Design system | Accesibilidad BrewBar | Tamano de fuente absoluto `.font(.system(size: 40))` en `PopoverView` ignora Dynamic Type | `PopoverView.swift:100` | Reemplazar por `.font(.largeTitle)` o equivalente con `@ScaledMetric` | Pendiente |
| FE-001 | Frontend | Jerarquia de vistas | `ProfilesView` con 267 lineas y 7 modos inline (FSM con cada rama renderizando un arbol JSX distinto) sin descomposicion en subcomponentes | `src/views/profiles.tsx` — 7 modos: list/detail/create-name/create-desc/importing/edit-name/edit-desc | Extraer `<ProfileListMode>`, `<ProfileDetailMode>`, `<ProfileCreateFlow>`, `<ProfileEditFlow>` | Pendiente |
| FE-002 | Frontend | Calidad de codigo | `COLORS.ts` nunca importado — 189 literales hex inline (referencia cruzada con DS-001; el conteo exacto varia segun alcance del grep pero el problema es el mismo) | Ver DS-001 | Ver DS-001 | Pendiente |
| SCR-008 | Pantallas | OutdatedView | Upgrade masivo confirma con dialogo generico sin listar los paquetes afectados — riesgo de rotura de dependencias | `src/views/outdated.tsx:61,121-123` | Mostrar lista completa de paquetes en el dialogo "Upgrade All" | Pendiente |
| SCR-009 | Pantallas | PackageInfoView | Casks no soportadas en `PackageInfoView`: `api.getFormulaInfo()` falla para casks — el usuario recibe "Not found" al navegar desde SearchView a un cask | `src/views/package-info.tsx:48` | Detectar si el paquete es cask y llamar al endpoint correcto | Pendiente |
| SCR-010 | Pantallas | ServicesView | Error de `service-action` puede desaparecer al siguiente fetch sin que el usuario lo vea — `actionInProgress` se resetea en `finally` antes de que el usuario pueda leer el error | `src/views/services.tsx:57,47-48` | Mantener el error hasta que el usuario pulse una tecla o haga una nueva accion | Pendiente |
| SCR-011 | Pantallas | DoctorView | Flash de estado vacio: `loading.doctor` no pre-inicializado a `true` en el store — hay un frame donde la vista muestra contenido vacio antes del spinner | `src/stores/brew-store.ts:61`; `src/views/doctor.tsx:19` | Pre-inicializar `loading: { ..., doctor: true }` en el store | Pendiente |
| SCR-012 | Pantallas | PopoverView (BrewBar) | `Text("All packages up to date")` en `upToDateView` sin traduccion al espanol verificada en el catalogo | `PopoverView.swift:108` | Ejecutar `tuist generate` y verificar cobertura en el catalogo de localizacion | Pendiente |
| SCR-013 | Pantallas | SettingsView (BrewBar) | Fallo en `SMAppService.register()/unregister()` revierte el toggle silenciosamente sin feedback de error al usuario | `SettingsView.swift:55-63` | Agregar `@State private var loginError: String?` y mostrar el error cuando no sea nil | Pendiente |
| EP-004 | Endpoints | Polar.sh / Revalidacion | `catch` en `revalidate()` agrupa errores de red y errores de contrato bajo el mismo flujo de grace period, ocultando bugs de integracion | `license-manager.ts:261` | Separar errores de red (tratar con grace) de errores de validacion (tratar como `expired`) | Pendiente |
| EP-005 | Endpoints | OSV.dev | Versiones de paquete vacias o `undefined` incluidas en queries sin validacion — genera queries malformadas | `osv-api.ts:129-132` | Filtrar paquetes con `version` vacia o nula antes de construir las queries | Pendiente |
| EP-006 | Endpoints | OSV.dev | Loop one-by-one sin delay entre peticiones — puede exceder rate limits de OSV.dev en instalaciones con muchos paquetes | `osv-api.ts:106-118` | Agregar delay de 50-100ms entre peticiones y backoff ante 429 | Pendiente |
| EP-007 | Endpoints | GitHub Releases | Non-null assertion `split()[0]!` en parse del checksum puede producir `"undefined"` como hash esperado | `brewbar-installer.ts:75` | Validar que el resultado sea cadena de 64 caracteres hex: `/^[0-9a-f]{64}$/i.test(expected)` | Pendiente |
| EP-008 | Endpoints | CLI brew | `getFormulaInfo(name)`, `uninstallPackage(name)`, `serviceAction(name, action)` pasan `name` a `spawn` sin validacion — un nombre con flags de brew modifica el comportamiento | `brew-api.ts:35-36,80-81,85-87` | Agregar validacion con `PKG_PATTERN` (`/^[\w@./+-]+$/`) antes de pasar a `spawn` | Pendiente |
| EP-009 | Endpoints | CLI brew | `installPackage(name)` y `upgradePackage(name)` en `streamBrew` pasan `name` sin validacion — mismo riesgo de flag injection | `brew-api.ts:69,73` | Misma validacion con `PKG_PATTERN` | Pendiente |
| EP-010 | Endpoints | CLI brew | Sin timeout en `streamBrew` ni en `brewUpdate` — instalaciones colgadas bloquean la UI sin cancelacion automatica | `brew-cli.ts:23-79`; `brew-api.ts:10` | Agregar timeout configurable (5 minutos para install/upgrade) que mate el proceso y notifique al consumer | Pendiente |
| REL-002 | Release | Localizacion | Cuatro cadenas con `extractionState: stale` en xcstrings — catalogo no sincronizado con codigo fuente reciente | `Localizable.xcstrings` — "Open Brew-TUI", "Retry", "Service Errors", "Upgrade All" | Ejecutar `tuist generate` para re-extraer cadenas y limpiar el estado stale | Pendiente |
| UX-001 | UX | Flujos criticos | `start` de servicio (tecla `s`) ejecuta sin confirmacion — asimetria respecto a `stop` y `restart` que si confirman | `src/views/services.tsx:52-54` | Agregar `ConfirmDialog` para la accion `start` por consistencia | Pendiente |
| UX-002 | UX | AccountView | Error en `deactivate()` se silencia — si la llamada API falla, el `finally` resetea el estado pero no muestra mensaje de error (ver tambien SCR-007) | `src/views/account.tsx:41-49` | Ver SCR-007 | Pendiente |

### Hallazgos Baja

| ID | Dominio | Subzona | Hallazgo | Evidencia | Accion | Estado |
|----|---------|---------|----------|-----------|--------|--------|
| ARQ-009 | Arquitectura | Deuda estructural | `previousView` en navigation-store duplica `viewHistory[-1]` — pueden divergir si el historial se modifica sin actualizar `previousView` | `src/stores/navigation-store.ts:6` | Eliminar `previousView` del state interface y derivarlo de `viewHistory` | Pendiente |
| ARQ-010 | Arquitectura | Deuda estructural | Patron `loading/error` repetido en cada vista sin abstraccion — TODO documentado en `doctor.tsx:9` | Multiple vistas; `doctor.tsx:9` — TODO explicito | Crear hook `useViewState(key)` o componente `<AsyncView>` | Pendiente |
| ARQ-011 | Arquitectura | Deuda estructural | `LemonSqueezyActivateResponse` / `LemonSqueezyValidateResponse` conviven con tipos de dominio en `lib/license/types.ts` — DTOs de red mezclados con modelo interno | `src/lib/license/types.ts:24-49` | Mover DTOs a `polar-api.ts` donde se consumen | Pendiente |
| ARQ-012 | Arquitectura | Performance | `streamBrew()` usa polling de 100ms (`setTimeout`) en lugar de arquitectura event-driven — marcado con TODO en el codigo | `src/lib/brew-cli.ts:65` — TODO explicito; tambien en 07-backend, 10-performance, 13-endpoints | Refactorizar a `stdout.on('data')` + `readline.createInterface` eliminando el polling | Pendiente |
| ARQ-013 | Arquitectura | Deuda estructural | `installed.tsx`, `package-info.tsx`, `search.tsx` importan `brew-api` directamente eludiendo el store — acoplamiento directo a la capa de API | `installed.tsx:7`, `package-info.tsx:14`, `search.tsx:12` | Centralizar en store o crear capa de adaptacion | Pendiente |
| ARQ-014 | Arquitectura | Deuda estructural | `profile-manager.ts` mezcla logica de validacion de dominio, IO y watermark — dificulta el testing independiente | `src/lib/profiles/profile-manager.ts:23-42` | Extraer `validateProfileName` a modulo de validacion; mover watermark al store | Pendiente |
| ARQ-015 | Arquitectura | Cache / Staleness | `cleanup-store.ts` y `security-store.ts` re-ejecutan analisis completo en cada montaje sin verificar si los datos son recientes | `src/stores/cleanup-store.ts`; `src/stores/security-store.ts` | Guardar `analyzedAt`/`scannedAt`; re-analizar solo si datos superan TTL | Pendiente |
| ARQ-016 | Arquitectura | Performance | `audit-runner.ts` O(n*m) lookup: `packages.find()` dentro de bucle sobre `vulnMap` | `src/lib/security/audit-runner.ts:46` | Construir `Map<string, {name,version}>` antes del bucle para lookup O(1) | Pendiente |
| GOV-005 | Gobierno | Info.plist | `PrivacyInfo.xcprivacy` — razon `CA92.1` posiblemente incorrecta para `NSPrivacyAccessedAPICategoryUserDefaults`; deberia ser `1C8F.1` ("app functionality") | `PrivacyInfo.xcprivacy` | Cambiar razon de `CA92.1` a `1C8F.1` | Pendiente |
| GOV-006 | Gobierno | Build settings | ESLint con cobertura minimalista — solo `no-unused-vars` activado; TypeScript strict mitiga la mayoria de casos | `eslint.config.js` | Activar reglas `@typescript-eslint/recommended` | Pendiente |
| GOV-007 | Gobierno | Info.plist | `PrivacyInfo.xcprivacy` pendiente de verificacion post-`tuist generate` — configuracion correcta pero no verificable sin ejecutar Tuist | `Project.swift:37` — `resources: ["BrewBar/Resources/**"]` | Ejecutar `tuist generate` y confirmar inclusion en la fase Resources | Pendiente |
| GOV-008 | Gobierno | Secretos | `POLAR_ORGANIZATION_ID` embebido en `polar-api.ts` — identificador publico; impacto de seguridad real bajo | `polar-api.ts:9` | Mover a constante de configuracion si se quiere evitar exposicion explicita en repo | Pendiente |
| GOV-009 | Gobierno | Build settings | `CURRENT_PROJECT_VERSION` ausente en `Project.swift` — sin numero de build en `CFBundleVersion` | `Project.swift` | Agregar `"CURRENT_PROJECT_VERSION": "1"` o incrementar automaticamente en CI | Pendiente |
| BK-007 | Backend | Red | Sin validacion de host en llamadas a OSV.dev — URL hardcodeada sin llamar a `validateApiUrl` como hace Polar.sh | `osv-api.ts:4` | Agregar validacion de host similar a la de Polar.sh | Pendiente |
| BK-008 | Backend | Red | `streamBrew` usa polling de 100ms (ver ARQ-012) — referencia cruzada | Ver ARQ-012 | Ver ARQ-012 | Pendiente |
| BK-009 | Backend | Persistencia | Sin unicidad garantizada en perfiles por nombre — `saveProfile` sobreescribe silenciosamente | `profile-manager.ts:78` | Agregar comprobacion de existencia en `saveProfile` | Pendiente |
| BK-010 | Backend | Persistencia | Sin migracion implementada — comentarios `// Future: add migration logic here` en los tres modulos; un cambio de schema dejara datos de v1 ilegibles | `license-manager.ts:113`, `history-logger.ts:36`, `profile-manager.ts:65` | Disenar logica de migracion antes de cualquier cambio de schema | Pendiente |
| BK-011 | Backend | Red | Retry ausente en `activate()` y `revalidate()` — solo `deactivate()` tiene 3 reintentos; red transitoria puede dejar al usuario sin licencia activa | `license-manager.ts:206-265` | Agregar retry con backoff exponencial (max 2-3 intentos) en operaciones criticas | Pendiente |
| BK-012 | Backend | Red | `Accept-Encoding` no forzado en `fetchWithTimeout` — Node 18+ soporta compresion nativa pero no se fuerza | `src/lib/fetch-timeout.ts` | Agregar `headers: { 'Accept-Encoding': 'gzip, deflate, br' }` | Pendiente |
| SEG-005 | Seguridad | App / Licencia | `checkBundleIntegrity()` falla-abierta: retorna `true` si no puede leer su propio bundle — ventana de degradacion silenciosa | `src/lib/license/integrity.ts:31` — `return true` en catch | Cambiar a falla-cerrada con mensaje de advertencia; loguear aviso interno | Pendiente |
| SEG-006 | Seguridad | CI / CD | `softprops/action-gh-release@v2` sin pin por hash SHA — tag mutable expone el workflow a supply chain attack | `release.yml:89` | Fijar por hash de commit: `softprops/action-gh-release@<SHA>` | Pendiente |
| SEG-007 | Seguridad | Privacidad | Sin mecanismo de eliminacion de datos del usuario (`delete-account`) — requisito si el producto se expande a Mac App Store | No existe subcomando ni flujo TUI | Implementar `brew-tui delete-account` con confirmacion | Pendiente |
| SEG-008 | Seguridad | Privacidad | Email del usuario visible en historial de shell via `brew-tui status` y `brew-tui activate` | `src/index.tsx:22,62` | Advertencia en documentacion para usuarios de CI | Pendiente |
| QA-023 | Testing | CI | `vitest` sin archivo de configuracion — sin `vitest.config.ts`; sin cobertura configurada (`@vitest/coverage-v8`) | No se encontro `vitest.config.ts` en el proyecto | Crear `vitest.config.ts` con timeout, cobertura y variables globales para `__TEST_MODE__` | Pendiente |
| QA-024 | Testing | Metricas | Sin medicion de latencia de APIs externas — timeout de 15s configurado pero duracion real no instrumentada | `src/lib/fetch-timeout.ts` | Anadir `Date.now()` antes/despues de cada `fetchWithTimeout` en modo debug | Pendiente |
| QA-025 | Testing | Metricas | Fallos de SchedulerService silenciosos en produccion — errores asignados a string en UI sin persistencia ni reporte | `AppState.swift:33-43` | Persistir ultimo error en `UserDefaults` con timestamp | Pendiente |
| FE-003 | Frontend | Jerarquia | `app.tsx` mezcla inicializacion de licencia con routing de vistas — TODO presente en linea 5 | `src/app.tsx:8` — TODO explicito | Extraer `<LicenseInitializer>` y `<ViewRouter>` como indica el TODO | Pendiente |
| FE-004 | Frontend | Renderizado | Clave composite en `ProgressLog` puede causar parpadeo: `key={line.slice(0,30) + (lines.length - visible.length + i)}` | `src/components/common/progress-log.tsx` | Usar indice global monotonicamente creciente como clave | Pendiente |
| FE-005 | Frontend | Renderizado | `key={j}` en lineas de warning en `DoctorView` — indice de array como clave | `src/views/doctor.tsx:40` | Usar `key={warning.slice(0,20) + '-line-' + j}` | Pendiente |
| FE-006 | Frontend | Coordinacion | `Task {}` anonimos en botones de BrewBar sin handle de cancelacion (ver ARQ-007) — referencia cruzada | Ver ARQ-007 | Ver ARQ-007 | Pendiente |
| FE-007 | Frontend | Coordinacion | `.onAppear` en `DoctorView` sin cleanup de la operacion async — si la vista se desmonta durante el fetch, no hay cancelacion | `src/views/doctor.tsx:13` — `useEffect(() => { fetchDoctor(); }, [])` sin cleanup | Implementar cleanup con `mountedRef` igual que `package-info.tsx` | Pendiente |
| FE-008 | Frontend | Layout | BrewBar `PopoverView` frame fijo puede truncar texto con Dynamic Type muy grande (ver ACC-002) | Ver ACC-002 | Ver ACC-002 | Pendiente |
| FE-009 | Frontend | Previews | Ausencia de previews/snapshots para vistas TUI — imposible validacion visual automatica | `src/views/` — ninguna vista tiene snapshot | Documentar que previews de TUI se validan via `npm run dev`; considerar snapshots de texto | Pendiente |
| ACC-003 | Accesibilidad | BrewBar | Flecha decorativa entre versiones (`Image(systemName: "arrow.right")`) en `OutdatedListView` sin `.accessibilityHidden(true)` | `OutdatedListView.swift:56-58` | Agregar `.accessibilityHidden(true)` | Pendiente |
| ACC-004 | Accesibilidad | BrewBar | Cabeceras de seccion `Text("Homebrew Updates")` y `Text("BrewBar Settings")` sin `.accessibilityAddTraits(.isHeader)` | `PopoverView.swift:43`; `SettingsView.swift:13` | Agregar `.accessibilityAddTraits(.isHeader)` | Pendiente |
| ACC-005 | Accesibilidad | TUI | Inputs de texto en `ProfilesView` (crear/editar) sin etiqueta semantica — solo `Text bold` como contexto visual | `src/views/profiles.tsx:132-160` | Limitacion del medio (terminal); documentar como no aplica para TUI | Pendiente |
| DS-010 | Design system | Tokens | Color `#38BDF8` (azul claro) usado en 4+ archivos sin mapeo a ningun token en `COLORS` | `progress-log.tsx`, `account.tsx`, `upgrade-prompt.tsx`, `header.tsx` | Agregar `COLORS.highlight = '#38BDF8'` | Pendiente |
| DS-011 | Design system | Tokens | Color `#2DD4BF` (teal) usado en 4 archivos sin mapeo a token | `version-arrow.tsx`, `package-info.tsx`, `installed.tsx`, `security-audit.tsx` | Agregar `COLORS.teal` o `COLORS.versionNew` | Pendiente |
| DS-012 | Design system | Tokens | `AccentColor.colorset` en BrewBar sin variante dark mode | `menubar/BrewBar/Resources/Assets.xcassets/AccentColor.colorset/Contents.json` | Agregar entrada dark mode con color adaptado | Pendiente |
| DS-013 | Design system | Componentes | `TextInput` sin wrapper en `ProfilesView` — usan `TextInput` directamente sin el estilo unificado de `SearchInput` | `src/views/profiles.tsx:136-179` | Usar `SearchInput` o crear `FormInput` wrapper | Pendiente |
| DS-014 | Design system | Componentes | `ErrorMessage` mezclado con `Loading` en el mismo archivo — logica mezclada | `src/components/common/loading.tsx` | Separar en `error-message.tsx` independiente | Pendiente |
| UX-003 | UX | Flujos criticos | No existe flujo de onboarding — el usuario inicia directamente sin tutorial ni explicacion de atajos de teclado | No existe vista, hint ni flag de primer inicio | Considerar hint overlay en primer arranque explicando `1-0`, `Tab`, `q` | Pendiente |
| UX-004 | UX | Navegacion | `account` y `package-info` sin atajo de numero de tecla — solo accesibles via Tab (ciclo completo) | `src/stores/navigation-store.ts:14-17` | Agregar AccountView a `VIEWS` con numero de tecla o documentar el patron en el footer | Pendiente |
| UX-005 | UX | ProfilesView | Error silencioso en `exportCurrent`: el `finally { setMode('list') }` no comunica exito ni fracaso claramente | `src/views/profiles.tsx` — `finally` sin mensaje diferenciado | Agregar mensaje de exito/fracaso antes del `finally` | Pendiente |
| UX-006 | UX | BrewBar | `launchAtLogin` falla silenciosamente en `SettingsView` — toggle oscila sin explicacion (ver SCR-013) | Ver SCR-013 | Ver SCR-013 | Pendiente |
| REL-003 | Release | Distribucion | Sin screenshots ni assets de marketing automatizados — limita la documentacion y el listing | No se encontraron screenshots en el repositorio | Agregar screenshots a README o carpeta `/assets/screenshots/` | Pendiente |
| EP-011 | Endpoints | GitHub Releases | Dos instancias concurrentes de `install-brewbar` comparten `/tmp/BrewBar.app.zip` — puede corromper el ZIP | `brewbar-installer.ts:16` — path constante sin randomizacion | Usar path temporal unico: `os.tmpdir() + '/BrewBar-' + randomUUID() + '.zip'` | Pendiente |
| SCR-014 | Pantallas | SmartCleanupView | `failedNames` inicializado con todos los nombres seleccionados antes de la desinstalacion — si tiene exito queda "sucio" para la siguiente operacion | `src/views/smart-cleanup.tsx:129-130` | Limpiar `failedNames` tras analisis exitoso | Pendiente |
| SCR-015 | Pantallas | ProfilesView | Lista de profiles sin paginacion virtual — en sistemas con muchos perfiles puede exceder la altura del terminal | `src/views/profiles.tsx:250-264` | Aplicar paginacion virtual con `useStdout().rows` | Pendiente |

---

## 3. Estadisticas

### Resumen por severidad

| Severidad | Cantidad | % del total |
|-----------|----------|-------------|
| Critica | 5 | 5.5% |
| Alta | 29 | 32.2% |
| Media | 38 | 42.2% |
| Baja | 38 | 42.2% |
| **Total** | **90** | **100%** |

> Nota: Las referencias cruzadas (hallazgos que aparecen en multiples reportes) se cuentan una sola vez. FE-002 y FE-006/FE-008 se registran como referencias cruzadas a DS-001 y ARQ-007/ACC-002 respectivamente y no suman al total independiente.

### Hallazgos por dominio

| Dominio | Critica | Alta | Media | Baja | Total | Estado general |
|---------|---------|------|-------|------|-------|----------------|
| Seguridad (SEG) | 2 | 0 | 2 | 4 | 8 | Critico |
| Testing / Calidad (QA) | 3 | 7 | 5 | 7 | 22 | Critico |
| Endpoints (EP) | 0 | 5 | 5 | 1 | 11 | Preocupante |
| Arquitectura (ARQ) | 0 | 1 | 6 | 8 | 15 | Preocupante |
| Design system / Acc. (DS, ACC) | 0 | 2 | 5 | 7 | 14 | Preocupante |
| Pantallas (SCR) | 1 | 5 | 4 | 5 | 15 | Preocupante |
| Backend / Persistencia (BK) | 0 | 1 | 4 | 6 | 11 | Preocupante |
| Release (REL) | 1 | 1 | 1 | 1 | 4 | Critico |
| Gobierno (GOV) | 0 | 0 | 3 | 6 | 9 | Aceptable |
| Frontend (FE) | 0 | 0 | 2 | 7 | 9 | Aceptable |
| UX | 0 | 0 | 1 | 5 | 6 | Aceptable |

### Conformidad por dominio auditado

| Seccion | Dominio | Items conformes | Items no conformes / parciales | % Conformidad |
|---------|---------|-----------------|-------------------------------|---------------|
| 00-01 | Ficha e inventario | Todos | Ninguno | 100% |
| 02 | Gobierno | 13 | 8 | 62% |
| 03-04 | Arquitectura y estado | 14 | 17 | 45% |
| 05, 09, 10 | Frontend, motion, tecnico | 18 | 9 | 67% |
| 06 | UX funcional | 21 | 4 | 84% |
| 07-08 | Design system y accesibilidad | 10 | 22 | 31% |
| 11-12 | Backend y persistencia | 22 | 12 | 65% |
| 13 | Seguridad y privacidad | 18 | 8 | 69% |
| 14-15 | Testing y observabilidad | 3 | 25 | 11% |
| 16 | Rendimiento | 10 | 11 | 48% |
| 17-18 | Localizacion y release | 9 | 5 | 64% |
| 19 | Pantallas | 18 | 42 | 30% |
| 20 | Endpoints | 22 | 20 | 52% |

**Media de conformidad global: 57%**

---

## 4. Priorizacion ejecutiva — Top 10

Los siguientes hallazgos deben resolverse antes de cualquier release publico, ordenados por urgencia e impacto:

### #1 — SEG-001: BrewBar sin firma de codigo ni notarizacion (Critica)

**Riesgo:** Todos los usuarios de macOS con Gatekeeper activo (configuracion por defecto desde macOS 10.15 Catalina) reciben un dialogo de bloqueo al intentar abrir BrewBar. La funcionalidad de companion app del producto es completamente inutilizable sin esta correccion. No es un riesgo de datos — es un bloqueante de uso total.

**Accion:** Obtener Apple Developer Program membership. Configurar `CODE_SIGN_IDENTITY`, `DEVELOPMENT_TEAM` como secrets en GitHub Actions. Cambiar el workflow a `xcodebuild archive` + `xcodebuild -exportArchive`. Anadir paso `xcrun notarytool submit` + `xcrun stapler staple`. Ver REL-001 complementariamente.

**Esfuerzo estimado:** Alto (requiere cuenta de desarrollador Apple pagada + configuracion de CI). No tiene workaround.

---

### #2 — SEG-002: Verificacion SHA-256 de BrewBar es codigo muerto (Alta)

**Riesgo:** Los usuarios instalan un binario de BrewBar.app sin ninguna verificacion de integridad. Un ataque de tipo man-in-the-middle o la sustitucion del artefacto en GitHub no seria detectada. El mecanismo existe en el codigo pero nunca ha ejecutado en produccion desde su implementacion.

**Accion:** Agregar en el job `build-brewbar`: `shasum -a 256 BrewBar.app.zip > BrewBar.app.zip.sha256`. Subir ambos archivos al release. Corregir el `catch` en `brewbar-installer.ts:83` para relanzar errores que no sean de red transitoria cuando el archivo checksum existe. Implementar contador de bytes en `pipeline` para que el limite de 200 MB sea efectivo (EP-003). Puede hacerse en paralelo con #1.

**Esfuerzo estimado:** Bajo (cambio de 3-4 lineas en el workflow y 10-15 en el instalador).

---

### #3 — QA-003: `npm run test` es un false-green en CI (Critica)

**Riesgo:** El pipeline de release publica a npm tras ejecutar `npm run test`, pero vitest retorna exit 0 aunque no haya ningun test que ejecutar. Cualquier regresion en el codigo de produccion pasaria el CI sin ser detectada. El modelo de negocio del producto depende de que la logica de licencias funcione correctamente.

**Accion:** Configurar `vitest.config.ts` con `passWithNoTests: false` hasta que exista cobertura minima (QA-023). Implementar inmediatamente los tests de QA-001 y QA-002.

**Esfuerzo estimado:** Bajo para la configuracion de vitest (minutos); Medio para los tests de logica de licencia.

---

### #4 — QA-001: `getDegradationLevel` sin tests (Critica)

**Riesgo:** Esta funcion controla si un usuario Pro puede acceder a funcionalidades de pago durante un periodo offline. Un bug en los rangos de tiempo (0-7d sin degradacion, 7-14d warning, 14-30d limitada, 30+d expirada) podria privar a usuarios Pro de acceso legitimo o dar acceso indefinido a usuarios cuya licencia expiro. Es la logica de negocio mas critica y la que mas beneficio obtiene de tests.

**Accion:** Cubrir todos los rangos de tiempo con tests de fecha inyectada. Verificar que los limites exactos (7d, 14d, 30d) producen el estado correcto. Incluir en el mismo PR los tests de `checkRateLimit` (QA-005).

**Esfuerzo estimado:** Bajo (tests unitarios puros con mocking de fecha).

---

### #5 — EP-001 / EP-002: Respuestas de API sin validacion en runtime (Alta)

**Riesgo:** Las respuestas de Polar.sh y OSV.dev se castean directamente con `as T` sin verificar que los campos criticos existan y tengan el tipo correcto. Un cambio de contrato en Polar.sh podria resultar en `activation.id === undefined` propagandose a `license.json`, corrompiendo la licencia y bloqueando todas las revalidaciones posteriores. Un cambio en OSV.dev podria hacer que todos los paquetes aparezcan como "sin vulnerabilidades" (falso negativo de seguridad via EP-002 / OSV one-by-one).

**Accion:** Implementar `assertPolarActivation(obj)` y `assertPolarValidated(obj)` en `polar-api.ts`. Verificar `Array.isArray(data.results)` en `osv-api.ts`. En el `catch {}` de one-by-one, distinguir rechazo de paquete (400) de error de servidor (5xx).

**Esfuerzo estimado:** Bajo-Medio (funciones de validacion de 10-20 lineas cada una + tests).

---

### #6 — BK-004 / EP-008 / EP-009: Sin timeout en `execBrew` ni validacion de `name` en CLI wrappers (Media)

**Riesgo:** Un proceso `brew info --json=v2 --installed` colgado (por ejemplo durante una actualizacion de Homebrew en paralelo) bloquea el event loop de Node.js indefinidamente, congelando la TUI. Los nombres de paquetes sin validacion en `getFormulaInfo`, `uninstallPackage`, `installPackage` y `upgradePackage` permiten que un nombre como `--force` sea interpretado por brew como un flag, potencialmente ejecutando operaciones no deseadas.

**Accion:** Agregar `{ timeout: 30_000 }` en todas las llamadas a `spawn()` en `execBrew`. Agregar validacion con `PKG_PATTERN` en todos los wrappers que aceptan `name` del usuario antes de pasar a `spawn`.

**Esfuerzo estimado:** Bajo (cambios puntuales de 1-2 lineas por wrapper + 1 linea en `execBrew`).

---

### #7 — QA-001 al QA-014: Ausencia critica de observabilidad (Alta)

**Riesgo:** Sin crash reporting, sin logging estructurado, sin analytics, es imposible conocer la tasa de crashes en produccion, diagnosticar errores de activacion de licencia de usuarios reales, o medir la conversion free → Pro. Para un producto freemium, la conversion es la metrica de negocio fundamental.

**Accion inmediata (alta prioridad):** Integrar `os.Logger` en BrewBar (QA-013) y un wrapper `logger.ts` en TypeScript (QA-012). **Accion a corto plazo:** Integrar Sentry para crash reporting (QA-014). **Accion a medio plazo:** Analytics con opt-in (QA-016).

**Esfuerzo estimado:** Bajo para logging basico; Medio para Sentry; Alto para analytics completo.

---

### #8 — DS-001 / DS-002: `COLORS.ts` no adoptado — 253 literales hex dispersos (Alta)

**Riesgo:** El design system es efectivamente inexistente desde el punto de vista de mantenibilidad. Cualquier cambio de paleta requiere editar 26 archivos manualmente. Los colores como `#F9FAFB` (casi blanco) son ilegibles en terminales con fondo claro, y el problema no puede corregirse en un punto centralizado porque no existe ese punto.

**Accion:** Importar `COLORS` en todos los componentes y vistas. Reemplazar sistematicamente los literales hex. Priorizar los colores de estado: `#EF4444` (error), `#22C55E` (success), `#F59E0B` (warning). Puede hacerse de forma incremental por archivo.

**Esfuerzo estimado:** Medio (trabajo mecanico pero extenso — 26 archivos).

---

### #9 — ACC-001 / ACC-002: Accesibilidad critica en BrewBar (Alta)

**Riesgo:** Los cuatro botones icono principales de BrewBar (Refresh, Settings, Quit, upgrade individual) son inoperables para usuarios de VoiceOver y Voice Control. Voice Control es la tecnologia de accesibilidad mas usada en macOS para usuarios con movilidad reducida. Esto excluye a un segmento de usuarios de la funcionalidad principal de BrewBar.

**Accion:** Agregar `.accessibilityLabel(String(localized: "..."))` a los cuatro botones. Cambiar `.frame(width: 340, height: 420)` a `.frame(width: 340, minHeight: 420)` para Dynamic Type. Resolver tambien DS-009 (tamano de fuente absoluto) en el mismo PR.

**Esfuerzo estimado:** Muy bajo (cambios de 1-2 lineas por boton).

---

### #10 — ARQ-001: Inversion de dependencias lib/ → stores/ (Alta)

**Riesgo:** Cinco modulos de la capa de negocio (`lib/`) importan directamente del store de Zustand, creando un acoplamiento circular que hace imposible testear esos modulos de forma aislada sin montar el store completo. Esto bloquea la implementacion de los tests de integracion requeridos por QA-007 y QA-009.

**Accion:** Refactorizar `history-logger.ts`, `audit-runner.ts`, `cleanup-analyzer.ts`, `profile-manager.ts` y `brewbar-installer.ts` para recibir `{ license, status }` como parametros expliciticos desde la capa de stores/hooks. La capa `lib/license/types.ts` ya define estos tipos.

**Esfuerzo estimado:** Medio (requiere actualizar los callers en los stores y en los hooks, pero el cambio es mecanico).

---

## 5. Veredicto final

### Recomendacion de release

**[ ] Apto para continuar desarrollo**
**[ ] Apto para beta interna**
**[ ] Apto para TestFlight / staging**
**[x] No apto para produccion sin correcciones previas**

El proyecto Brew-TUI v0.2.0 **no es apto para distribucion publica en su estado actual** por dos razones absolutas e independientes entre si:

**Bloqueante 1 — BrewBar sin firma de codigo ni notarizacion (SEG-001):** Todos los usuarios de macOS con Gatekeeper activo (configuracion por defecto del sistema operativo) reciben un dialogo de bloqueo al intentar abrir BrewBar. La companion app del producto es completamente inutilizable. Este es un bloqueante de distribucion total que no tiene workaround para el usuario final.

**Bloqueante 2 — Verificacion de integridad SHA-256 es codigo muerto (SEG-002) + false-green en CI (QA-003):** Los usuarios instalan un binario de BrewBar sin ningun mecanismo de verificacion de integridad funcionando. El pipeline de CI publica a npm tras ejecutar un comando de tests que no ejecuta ningun test. El modelo de negocio freemium opera sobre logica de licencias critica (`getDegradationLevel`) sin ninguna cobertura automatizada.

Mas alla de los bloqueantes, el proyecto tiene una base arquitectonica solida con patrones de manejo de errores, cifrado en reposo y separacion de responsabilidades bien implementados. La mayoria de los hallazgos son deuda tecnica planificable, no riesgos de seguridad inmediatos. Una vez resueltos SEG-001, SEG-002, QA-001, QA-003 y EP-001 (los cinco hallazgos de mayor riesgo combinado), el proyecto puede avanzar a una beta interna controlada.

### Riesgos de salida a produccion

1. **Gatekeeper bloquea BrewBar para todos los usuarios de macOS** — Ver SEG-001
2. **Binario de BrewBar instalado sin verificacion de integridad** — Ver SEG-002, EP-010, EP-011
3. **Logica de degradacion de licencia sin tests — bug podria afectar acceso Pro de usuarios reales** — Ver QA-001, QA-002
4. **Pipeline de CI publica sin garantia de cobertura de tests** — Ver QA-003
5. **Respuestas de Polar.sh sin validacion — corrupcion silenciosa de licencias ante cambios de contrato** — Ver EP-001, EP-003
6. **Falsos negativos de seguridad en OSV one-by-one — paquetes vulnerables aparecen como seguros** — Ver EP-002
7. **`execBrew` sin timeout — proceso brew colgado congela la TUI indefinidamente** — Ver BK-004
8. **Watermark con PII del usuario sin consentimiento explicito en exportacion de perfiles** — Ver SEG-003

### Proximas acciones por prioridad

**Critica — Antes de cualquier release:**
1. Configurar firma de codigo Developer ID y notarizacion en CI (SEG-001, REL-001)
2. Generar `BrewBar.app.zip.sha256` en CI y corregir el instalador (SEG-002, EP-003, EP-007)
3. Implementar tests para `getDegradationLevel` y el flujo de licencia (QA-001, QA-002)
4. Configurar vitest con `passWithNoTests: false` (QA-003, QA-023)
5. Agregar type guards para respuestas de Polar.sh y OSV.dev (EP-001, EP-002)

**Alta — Antes de beta publica:**
6. Agregar timeout en `execBrew` y validacion de `name` en wrappers CLI (BK-004, EP-008, EP-009)
7. Agregar `.accessibilityLabel` en botones icono de BrewBar (ACC-001)
8. Integrar logging estructurado y crash reporting basico (QA-012, QA-013, QA-014)
9. Ampliar cobertura de tests hacia `license-manager.ts`, parsers, `validateProfileName` (QA-004, QA-005, QA-006, QA-020)
10. Refactorizar inversion de dependencias lib/ → stores/ (ARQ-001)

**Media — Iteraciones posteriores:**
11. Adoptar `COLORS.ts` en todos los archivos de vistas (DS-001, DS-002)
12. Extraer componentes reutilizables: `<ResultBanner>`, `<SelectableRow>` (DS-004, DS-005)
13. Implementar cache con TTL para resultados de OSV.dev (ARQ-005)
14. Agregar soporte a Bold Text, Increase Contrast, Dynamic Type en BrewBar (DS-008, DS-009, ACC-002)
15. Integrar analytics con opt-in explicito (QA-016)

---

## 6. Apendice: Matriz de cobertura de dominios

| Seccion | Dominio | Auditor | Reportado | Estado |
|---------|---------|---------|-----------|--------|
| 00 | Ficha de auditoria | project-scanner | Si | Completo |
| 01 | Inventario maestro | project-scanner | Si | Completo |
| 02 | Gobierno del proyecto | governance-auditor | Si | Completo |
| 03 | Arquitectura y limites | architecture-auditor | Si | Completo |
| 04 | Concurrencia y estado | architecture-auditor | Si | Completo |
| 05 | UI estructural | frontend-auditor | Si | Completo |
| 06 | UX funcional | ux-auditor | Si | Completo |
| 07 | Design system | design-auditor | Si | Completo |
| 08 | Accesibilidad | design-auditor | Si | Completo |
| 09 | Motion y percepcion | frontend-auditor | Si | No aplica (sin animaciones) |
| 10 | Frontend tecnico | frontend-auditor | Si | Completo |
| 11 | Backend funcional | backend-auditor | Si | Completo |
| 12 | Persistencia y sincronizacion | backend-auditor | Si | Completo |
| 13 | Seguridad y privacidad | security-auditor | Si | Completo |
| 14 | Testing y calidad | quality-auditor | Si | Completo |
| 15 | Observabilidad y analitica | quality-auditor | Si | Completo |
| 16 | Rendimiento | performance-auditor | Si | Completo |
| 17 | Localizacion | release-auditor | Si | Completo |
| 18 | Release readiness | release-auditor | Si | Completo |
| 19 | Auditoria por pantalla | screen-auditor | Si | Completo (15 pantallas) |
| 20 | Auditoria por endpoint | endpoint-auditor | Si | Completo (9 call sites) |

**Total dominios auditados:** 20 de 20 secciones metodologicas.
**Dominios no auditados:** Ninguno.
**Dominios no aplicables:** Seccion 09 (motion) — el producto no tiene animaciones propias; la ausencia es correcta por arquitectura.

### Cobertura por codebase

| Codebase | Archivos fuente | Lineas de codigo | Vistas auditadas | Features auditadas |
|----------|-----------------|------------------|------------------|--------------------|
| TypeScript / Ink (TUI) | 71 archivos | 6.139 lineas | 12 / 12 | 14 / 14 |
| Swift / SwiftUI (BrewBar) | 12 archivos | 1.235 lineas | 3 / 3 | 6 / 6 |

### Resumen de APIs externas auditadas

| API | Endpoints | Hallazgos criticos | Estado |
|-----|-----------|-------------------|--------|
| Polar.sh | 3 (activate, validate, deactivate) | EP-001, EP-003 | Preocupante |
| OSV.dev | 2 (batch, one-by-one) | EP-002, EP-005, EP-006 | Preocupante |
| GitHub Releases | 2 (zip, sha256) | SEG-002, EP-003, EP-007 | Critico |
| brew CLI (local) | 2 primitivas + 10 wrappers | BK-004, EP-008, EP-009, EP-010 | Preocupante |

---

> Fin del reporte consolidado. Generado automaticamente por report-consolidator (super-audit).
> Brew-TUI v0.2.0 | Commit: 65c7308 | Fecha: 2026-04-23
> Total hallazgos registrados: 90 | Criticos: 5 | Altos: 29 | Medios: 38 | Bajos: 38
