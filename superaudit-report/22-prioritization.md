# 22. Priorizacion ejecutiva

> Auditor: report-consolidator | Fecha: 2026-04-23

## Distribucion de hallazgos

| Severidad | Cantidad | % del total |
|-----------|----------|-------------|
| Critica   | 4        | 4.7%        |
| Alta      | 21       | 24.4%       |
| Media     | 36       | 41.9%       |
| Baja      | 25       | 29.1%       |
| **Total** | **86**   | **100%**    |

---

## Criticos — Accion inmediata requerida

Estos hallazgos representan riesgos de caida, perdida de negocio o bloqueo de uso. Deben resolverse ANTES de cualquier release.

| ID | Hallazgo | Riesgo | Accion inmediata |
|----|----------|--------|------------------|
| QA-001 | `npm run test` pasa en vacio con exit 0 — gate de CI false-green | Un release puede publicarse sin ningun test ejecutado, ocultando regresiones completas | Configurar vitest con `--passWithNoTests false` o bloquear el release hasta cobertura minima |
| QA-002 | `getDegradationLevel` sin tests — funcion critica que controla acceso offline Pro (rangos 0-7d, 7-14d, 14-30d, 30+d) | El modelo freemium puede comportarse incorrectamente en produccion sin que ningun test lo detecte | Cubrir todos los rangos de tiempo con tests de fecha inyectada |
| QA-003 | Flujo completo de licencia sin test end-to-end (activate → saveLicense → loadLicense → decrypt → revalidate) | Regresion silenciosa en cualquier paso del flujo de licencia afecta a todos los usuarios Pro | Crear test de integracion con filesystem temporal que cubra el ciclo completo |
| REL-001 | BrewBar.app distribuido sin firma Developer ID ni notarizacion — macOS Gatekeeper bloquea el lanzamiento | El producto es inusable para todos los usuarios que descarguen BrewBar | Obtener Apple Developer Program; agregar firma Developer ID y notarizacion con `xcrun notarytool submit --staple` en CI |
| SCR-001 | SmartCleanupView — deteccion de huerfanos con `brew leaves` puede incluir herramientas del sistema sin advertencia | El usuario podria desinstalar herramientas esenciales creyendo que son huerfanos seguros; operacion irreversible | Agregar advertencia explicita y requerir confirmacion de dos pasos con descripcion del riesgo |

> Nota: SCR-001 fue clasificado como Critica por el screen-auditor; aunque la clasificacion interna del resumen es 4 Criticos (QA-001, QA-002, QA-003, REL-001), SCR-001 queda documentado aqui como hallazgo de maxima urgencia operativa.

---

## Altos — Accion recomendada antes de release

Estos hallazgos afectan flujos clave, calidad percibida o mantenibilidad de forma severa.

| ID | Hallazgo | Riesgo | Accion recomendada |
|----|----------|--------|-------------------|
| SEG-001 | Verificacion SHA-256 de BrewBar es codigo muerto — `.sha256` nunca generado en CI; `catch` descarta el 404 | Binario sustituido en GitHub Releases se instala sin verificacion de integridad | Agregar `shasum -a 256 BrewBar.app.zip > BrewBar.app.zip.sha256` en CI; corregir el `catch` para propagar errores que no sean checksum mismatch |
| SEG-002 | Clave AES-256-GCM embebida en codigo fuente TypeScript y en binario Swift | Bypass del modelo freemium por cualquier usuario con acceso al bundle npm publicado o usando `strings BrewBar` | Documentar como riesgo conocido; incorporar UUID de maquina como componente de la clave para impedir portabilidad |
| ARQ-001 | Cinco modulos de `lib/` importan `useLicenseStore` directamente, invirtiendo la jerarquia de dependencias | Acoplamiento circular entre dominio y estado; impide testing unitario de modulos en aislamiento | Refactorizar para recibir `{ license, status }` como parametros explicitos |
| DS-001 | `COLORS.ts` con 0 importaciones — 253 literales hex hardcodeados en 26 archivos sin cambio alguno | Imposible cambiar la paleta sin editar decenas de archivos; sin sistema de diseno funcional | Importar `COLORS` en todos los componentes; reemplazar hex inline por referencias a tokens |
| ACC-001 | Cuatro botones solo-icono en BrewBar sin `.accessibilityLabel` — inaccesibles para VoiceOver y Voice Control | Usuarios con discapacidad visual o motora no pueden usar funciones clave de BrewBar | Agregar `.accessibilityLabel(String(localized: "..."))` o usar `Label("...", systemImage: "...")` con `.labelStyle(.iconOnly)` |
| ACC-002 | Frame fijo `340x420` en PopoverView bloquea Dynamic Type; `.font(.system(size: 40))` no escala | Texto truncado o invisible para usuarios con texto grande en Accesibilidad del sistema | Cambiar a `frame(width: 340, minHeight: 420)` con altura dinamica; reemplazar `size: 40` por `.font(.largeTitle)` |
| QA-004 | Rate limiting (`checkRateLimit`, `recordAttempt`) sin tests — 5 intentos fallidos deben provocar lockout de 15 min | El mecanismo de proteccion contra fuerza bruta podria estar roto sin deteccion | Verificar lockout tras MAX_ATTEMPTS y reset en caso de exito |
| QA-005 | `validateProfileName` sin tests — prevencion de path traversal sin cobertura | Una vulnerabilidad de path traversal en nombres de perfil podria quedar sin detectar | Cubrir: nombre vacio, longitud maxima, caracteres especiales, `../` traversal |
| QA-006 | AES-256-GCM round-trip sin test — cifrado/descifrado de licencia sin verificacion automatizada | Una regresion en el cifrado romperia el acceso Pro de todos los usuarios sin deteccion | Crear test que encripte y desencripte datos verificando integridad del GCM tag |
| QA-007 | `polar-api.ts` sin mock de red — ninguna llamada a Polar.sh tiene cobertura de test | Cambios en el contrato de Polar.sh o regresiones en el flujo de activacion pasan desapercibidos | Usar `vi.mock` o MSW para simular respuestas: activacion exitosa, clave invalida, red caida |
| QA-008 | Fallback HTTP 400 de OSV one-by-one sin test — rama critica de recuperacion sin cobertura | El fallback podria estar roto, haciendo que el security audit falle completamente | Test que simule HTTP 400 del batch y verifique que se activa `queryOneByOne` |
| QA-009 | `ink-testing-library` instalada sin uso — libreria de tests UI configurada pero sin ningun test escrito | Los componentes criticos (`ConfirmDialog`, `UpgradePrompt`, `AccountView`) no tienen cobertura de regresion | Crear tests de renderizado para componentes criticos |
| QA-010 | Flujo de activacion de licencia sin test de UI | Una regresion en la pantalla de activacion no es detectable automaticamente | Crear test con `ink-testing-library` que verifique estado inicial, activacion, estado Pro |
| QA-011 | Sin logging estructurado — 22 `console.*` dispersas sin metadatos ni niveles | Imposible diagnosticar errores en produccion | Adoptar `pino` o `winston`; o definir un wrapper `logger.ts` con niveles y contexto |
| QA-012 | Swift sin logging — 0 llamadas a `Logger`/`OSLog`/`print` en los 12 archivos de Sources/ | Fallos silenciosos en BrewChecker, SchedulerService y LicenseChecker son indiagnosticables | Integrar `os.Logger` con subsistema `com.molinesdesigns.brewbar` |
| QA-013 | Sin crash reporting en TypeScript ni en BrewBar | Imposible conocer la tasa de crashes en produccion | Integrar `@sentry/node` en TUI y Sentry Swift en BrewBar; configurar carga de dSYM en CI |
| EP-001 | `res.json() as PolarActivation` sin validacion de tipos — `activation.id` puede ser `undefined` | Se guardaria una licencia con `instanceId: undefined`, rompiendo todas las revalidaciones | Agregar `assertPolarActivation(obj)` que verifique que `id` y `license_key.status` son strings |
| EP-002 | `res.json() as PolarValidated` sin validacion — `res.status` puede ser `undefined`, forzando expirado silencioso | Usuarios Pro pierden acceso sin notificacion de error | Agregar `assertPolarValidated(obj)` que verifique `id`, `status` y `customer` |
| EP-003 | `OsvBatchResponse` sin validacion — si `data.results` no es array, resultados se pierden silenciosamente | Paquetes vulnerables no aparecen en la auditoria sin indicacion de fallo | Verificar `Array.isArray(data.results)` y longitud antes de iterar |
| EP-004 | `catch {}` vacio descarta errores HTTP 5xx — paquetes afectados aparecen como "sin vulnerabilidades" | Falso negativo de seguridad: resultados incorrectos dan falsa sensacion de seguridad | Capturar el error; solo omitir en HTTP 400; propagar errores 5xx o de red |
| EP-005 | Limite de 200 MB inefectivo si el servidor omite `Content-Length` | Un binario malicioso de tamano ilimitado podria descargarse e instalarse | Implementar contador de bytes durante el pipeline que aborte si supera el limite |
| REL-002 | `xcodebuild build` en lugar de `xcodebuild archive` — sin `.xcarchive` ni `exportOptions.plist` | El proceso de build no sigue el workflow oficial de Apple; artefacto no reproducible | Cambiar a `xcodebuild archive` seguido de `xcodebuild -exportArchive -exportOptionsPlist` |
| REL-003 | Cobertura de tests insuficiente para release — flujos criticos sin cobertura | Un release puede introducir regresiones en los flujos mas criticos sin deteccion automatica | Ampliar cobertura con tests unitarios e integracion para `license-manager.ts`, `feature-gate.ts`, `brewbar-installer.ts` |
| BK-001 | Clave de cifrado embebida en codigo fuente (cross-ref SEG-002) | Bypass de licencias por cualquier usuario con acceso al bundle | Ver SEG-002 — documentar riesgo conocido; incorporar UUID de maquina en derivacion de clave |
| SCR-002 | Cabeceras de columna hardcodeadas en ingles en InstalledView — incumplimiento de i18n | Los usuarios con idioma espanol ven cabeceras en ingles | Agregar claves `installed_col*` a `en.ts`/`es.ts` y usar `t()` |
| SCR-003 | Fallback de error hardcodeado en ingles en SearchView | Mensaje de error en ingles para usuarios con locale espanol | Reemplazar con `t('search_failed')` y agregar clave a `en.ts`/`es.ts` |
| SCR-004 | Error de `fetchProfiles()` no se muestra en modo `list` — vista aparece vacia sin explicacion | El usuario no recibe feedback cuando la carga inicial de perfiles falla | Agregar `{loadError && <ErrorMessage message={loadError} />}` en la rama de renderizado de lista |
| SCR-005 | Importacion masiva desde perfil sin indicar numero de paquetes a instalar | El usuario no puede hacer una decision informada sobre una operacion que puede instalar decenas de paquetes | Mostrar resumen (N formulae, M casks) antes de iniciar la importacion |
| SCR-006 | Replay de `upgrade-all` desde historial puede actualizar mas paquetes de los originales | El usuario podria actualizar paquetes inesperados | Mostrar en el dialogo que "upgrade-all" actualizara todos los desactualizados al momento de la reproduccion |
| SCR-007 | Fallo en `deactivate()` es silencioso — sin rama `catch` con feedback de error | El usuario no sabe si la desactivacion fallo; queda en estado ambiguo | Agregar `catch(err)` con `setDeactivateError(...)` y mostrar el error al usuario |
| SCR-008 | `PackageInfoView` solo consulta formulas — casks muestran "Not found" sin explicacion | Funcionalidad bloqueada silenciosamente al navegar al detalle de un cask | Detectar si el nombre es un cask y llamar al endpoint correcto |
| SCR-009 | Sin instrumentacion analitica en ninguna de las 15 vistas | Imposible medir engagement, funnel de conversion free→Pro, ni tasas de error | Integrar telemetria ligera con opt-in explicito |

---

## Medios — Planificar en proximas iteraciones

Estos hallazgos afectan consistencia, deuda tecnica o UX de forma relevante pero no bloquean un release interno.

| ID | Hallazgo | Riesgo | Accion recomendada |
|----|----------|--------|-------------------|
| ARQ-002 | `_revalidating` flag booleano no es verdaderamente atomico | Dos revalidaciones concurrentes podrian producir estado inconsistente | Reemplazar el flag por una `Promise` pendiente que actue como mutex real |
| ARQ-003 | `brewUpdate().catch(() => {})` descarta errores de brew update silenciosamente | El usuario trabaja con indices desactualizados sin saberlo | Cambiar a `.catch((err) => { set({ errors: { update: String(err) } }) })` |
| ARQ-004 | `lastFetchedAt` existe pero nunca se usa para invalidacion ni para mostrar timestamp en la UI | El usuario no sabe si los datos son recientes | Leer `lastFetchedAt` en `DashboardView` y vistas de lista para mostrar "ultima actualizacion hace X" |
| ARQ-005 | Sin cache de resultados de OSV.dev — cada navegacion re-consulta OSV completamente | Latencia elevada y consumo innecesario de API | Introducir cache en memoria con TTL de 15-60 min |
| ARQ-006 | Tasks fire-and-forget en botones SwiftUI de BrewBar sin handle ni cancelacion | Si el popover se cierra durante upgrade, la Task no tiene cancelacion | Almacenar Task handles en `@State` y cancelarlos en `.onDisappear` |
| ARQ-007 | `DispatchQueue.global()` mezclado con Swift concurrency en BrewChecker; `OnceGuard` con `NSLock` manual | Mezcla de GCD y Swift concurrency es fragil | Reemplazar con `withTaskGroup` o `Task.sleep` en structured concurrency |
| ARQ-008 | `outdated.tsx` importa `execBrew()` directamente sin pasar por ningun parser ni store | La operacion de pin/unpin es invisible al store y al historial Pro | Crear `pinPackage(name)`/`unpinPackage(name)` en `brew-api.ts` |
| BK-002 | `saveProfile` no atomica — usa `writeFile` directo sin patron tmp+rename | Un corte durante el guardado puede corromper el archivo de perfil | Reemplazar por `writeFile(tmpPath) + rename(tmpPath, finalPath)` |
| BK-003 | Cast sin validacion en `loadLicense` — `JSON.parse(...) as LicenseData` sin type guard | Un archivo `license.json` corrompido puede producir crashes | Agregar `isLicenseData(obj): obj is LicenseData` con verificacion de campos |
| BK-004 | Sin proteccion contra escrituras concurrentes para `history.json` y `profiles/` | Dos instancias de brew-tui pueden corromper datos | Agregar lock de archivo (`proper-lockfile` o equivalente) |
| BK-005 | Licencia almacenada en `~/.brew-tui/license.json` sin usar Keychain | Si el directorio tiene permisos incorrectos, la licencia queda expuesta | Considerar almacenar la license key en Keychain |
| SEG-003 | Watermark invisible con email del usuario embebido via Unicode de ancho cero sin consentimiento | Violacion de privacidad — email transmitido a terceros sin conocimiento del usuario | Notificar al usuario antes de exportar; ofrecer exportacion sin watermark |
| DS-002 | Patron de banner exito/error duplicado 14+ veces sin componente `ResultBanner` | Inconsistencias visuales; mantenimiento costoso | Extraer `<ResultBanner status="success|error" message={...} />` |
| DS-003 | Sin tokens de espaciado — 114 magic numbers en `paddingX/Y`, `gap`, `marginTop/Bottom` en 21 archivos | Inconsistencias de espaciado sin posibilidad de ajuste global | Crear `src/utils/spacing.ts` con escala tokenizada |
| DS-004 | Patron de fila cursor+texto repetido en 6 vistas con colores hardcodeados | Cursor y colores de seleccion inconsistentes entre vistas | Extraer `<SelectableRow isCurrent={bool} label={string} />` |
| DS-005 | Contraste insuficiente: `#6B7280` sobre fondo negro da ~3.5:1, por debajo de WCAG AA 4.5:1 | Texto secundario ilegible para usuarios con baja vision | Reemplazar por gris con ratio >= 4.5:1 |
| ACC-003 | Sin soporte a Bold Text en BrewBar — sin `@Environment(\.legibilityWeight)` | Usuarios con Bold Text activado no ven efecto en BrewBar | Evaluar textos que deberian reforzar su peso |
| ACC-004 | Sin soporte a Increase Contrast — sin `@Environment(\.colorSchemeContrast)` | Usuarios con alto contraste no obtienen beneficio en BrewBar | Agregar variantes de color de alto contraste para elementos de estado critico |
| ACC-005 | `VersionArrow` diferencia versiones solo por color sin ningun otro indicador | Usuarios con daltonismo no pueden distinguir la version instalada de la nueva | Agregar etiquetas textuales ("instalado:", "disponible:") o simbolos contextuales |
| QA-014 | Parsers cubiertos solo parcialmente — faltan `parseInstalledJson`, `parseOutdatedJson`, `parseBrewConfig` | Regresiones en el parsing de datos de brew no son detectadas | Completar cobertura con fixtures reales |
| QA-015 | Funciones canary sin tests — `isProUnlocked()`, `hasProAccess()`, `isLicenseValid()` | Una regresion podria abrir acceso Pro sin licencia | Anadir test que verifique que las canary functions retornan `false` |
| QA-016 | Sourcemaps deshabilitados en produccion | Stack traces del bundle minificado son ininterpretables | Habilitar sourcemaps en artifacts de release o mantenerlos en S3 privado |
| QA-017 | dSYM no preservado en CI | Crashes de BrewBar imposibles de diagnosticar | Incluir dSYM en artifact o subirlo a servicio de symbolication |
| QA-018 | Sin analytics en TUI ni en BrewBar — funnel de conversion free→Pro invisible | Imposible medir retencion, conversion ni uso de features | Integrar analytics con privacidad y opt-in explicito |
| QA-019 | BrewBar sin target XCTest/XCUITest | Las 3 vistas SwiftUI y 3 servicios sin cobertura automatizada | Anadir target de tests y al menos un smoke test de arranque |
| QA-020 | `ConfirmDialog` sin test de aceptacion/rechazo | Una regresion podria permitir acciones destructivas sin confirmacion | Testear que responde correctamente a `y`/`Y` (en) y `s`/`S` (es) |
| QA-021 | `console.error` en `brew-store.ts` gateado por `NODE_ENV !== 'production'` — errores silenciosos en produccion | Errores de fetch de datos de brew invisibles en produccion | Loguear errores no criticos en produccion con referencia opaca |
| EP-006 | `catch` en `revalidate()` agrupa errores de red y de contrato — bugs de integracion quedan ocultos | Un cambio de contrato en Polar.sh activa incorrectamente el grace period | Separar errores de red de errores de validacion |
| EP-007 | Versiones de paquete vacias en queries OSV sin validacion — queries malformadas activan fallback innecesariamente | El fallback one-by-one es mas lento; resultados potencialmente incorrectos | Filtrar paquetes con `version` vacia antes de construir queries |
| EP-008 | Loop secuencial OSV one-by-one sin delay puede exceder rate limits | Escaneos de seguridad podrian fallar sin explicacion clara | Agregar delay de 50-100ms entre peticiones y manejo de HTTP 429 con backoff |
| EP-009 | Non-null assertion `split(/\s+/)[0]!` puede producir `"undefined"` como expected hash | La verificacion SHA-256 falla por error de parsing; el fallo se descarta | Validar que el resultado del split sea 64 caracteres hex |
| EP-010 | Sin validacion del formato del hash extraido — archivo checksum malformado podria pasar la comparacion | Un atacante podria sustituir el binario con hash arbitrario | Agregar validacion `/^[0-9a-f]{64}$/i` del expected hash |
| EP-011 | `name` en multiples endpoints pasa a `spawn` sin validacion — `--force` seria interpretado como flag | Comportamiento inesperado si el nombre de paquete contiene caracteres de flag | Agregar validacion con `PKG_PATTERN` (`/^[\w@./+-]+$/`) |
| EP-012 | Sin timeout en `execBrew` y `streamBrew` — un proceso brew colgado bloquea la TUI indefinidamente | La TUI queda irresponsiva sin posibilidad de cancelacion automatica | Agregar `timeout: 30000` en `execFileAsync`; timeout de 5min en streamBrew |
| SCR-010 | Sin manejo de escenario offline en TUI — errores de red como mensajes CLI crudos | El usuario no puede distinguir error de conectividad de error de brew | Agregar deteccion de error de conectividad y propagar tipo al store |
| SCR-011 | Colores hex hardcodeados — `#F9FAFB` ilegible en terminales con fondo blanco | El producto es ilegible para usuarios con terminales de tema claro | Definir paleta con variantes oscuro/claro |
| SCR-012 | Upgrade masivo confirmado con dialogo generico sin mostrar paquetes afectados | El usuario puede actualizar paquetes que no queria sin informacion previa | Mostrar lista completa de paquetes en el dialogo de "Upgrade All" |
| SCR-013 | Flash de estado vacio en DoctorView — `loading.doctor` no pre-inicializado a `true` | Un frame donde la vista muestra contenido vacio confunde al usuario | Pre-inicializar `loading: { ..., doctor: true }` en el store |
| SCR-014 | Error de `service-action` se resetea en `finally` antes de que el usuario pueda leerlo | El usuario ve brevemente un error que desaparece antes de poder leerlo | Mantener el error hasta que el usuario pulse una tecla |
| SCR-015 | `.font(.system(size: 40))` en `upToDateView` de BrewBar no escala con Dynamic Type | Texto truncado con tallas de fuente grandes (cross-ref ACC-002) | Reemplazar por `.font(.system(.largeTitle))` |
| SCR-016 | Fallo en `SMAppService.register()/unregister()` revierte el toggle silenciosamente | El usuario no sabe que el toggle de "Launch at login" fallo | Agregar `@State var loginError: String?` y mostrar mensaje de error |
| SCR-017 | Sin mensaje diferenciado para error OSV.dev vs error local en SecurityAuditView | El usuario no puede saber si el problema es de su sistema o del servicio externo | Categorizar el error en `useSecurityStore.scan()` para mensaje apropiado |
| GOV-001 | `NSMainStoryboardFile = "Main"` heredado del template de Tuist — la app usa SwiftUI | Ruido en el Info.plist; posible confusion para desarrolladores | Usar `.dictionary(entries:)` para sobrescribir o eliminar la clave |
| GOV-002 | `CFBundleShortVersionString` no definido en `Project.swift` | Los usuarios y el sistema ven version incorrecta del bundle | Agregar `"CFBundleShortVersionString": "$(MARKETING_VERSION)"` |
| GOV-003 | `SWIFT_STRICT_CONCURRENCY` no declarado explicitamente | Un cambio en los defaults podria cambiar el nivel sin que nadie lo note | Agregar `"SWIFT_STRICT_CONCURRENCY": "complete"` en `Project.swift` |
| FE-001 | `ProfilesView` con 267 lineas y 7 modos inline (FSM) sin descomposicion | Archivo dificil de mantener; modos no se pueden testear independientemente | Extraer `<ProfileListMode>`, `<ProfileDetailMode>`, `<ProfileCreateFlow>`, `<ProfileEditFlow>` |
| FE-002 | `COLORS.ts` creado como fix pero nunca importado — 189 literales hex inline (cross-ref DS-001) | Ya cubierto por DS-001; hallazgo especifico del dominio frontend | Ver DS-001 |

---

## Bajos — Backlog de mejora continua

Mejoras recomendables sin impacto grave inmediato.

| ID | Hallazgo | Riesgo | Accion recomendada |
|----|----------|--------|-------------------|
| GOV-004 | `POLAR_ORGANIZATION_ID` embebido en `polar-api.ts` | Identificador publico expuesto en repositorio; impacto de seguridad bajo | Mover a constante de configuracion |
| GOV-005 | ESLint con cobertura minimalista — solo `no-unused-vars` activo | Potenciales bugs que TypeScript strict no cubre | Activar `@typescript-eslint/recommended` |
| GOV-006 | `PrivacyInfo.xcprivacy` pendiente de verificacion post-`tuist generate` | Configuracion correcta pero no verificable sin ejecutar Tuist | Ejecutar `tuist generate` y confirmar inclusion en bundle |
| GOV-007 | Razon `CA92.1` posiblemente incorrecta en `PrivacyInfo.xcprivacy` para `NSPrivacyAccessedAPICategoryUserDefaults` | La razon correcta seria `1C8F.1` para "app functionality" | Cambiar razon a `1C8F.1` |
| ARQ-009 | `previousView` en navigation-store redundante con `viewHistory[-1]` — pueden divergir | Posible inconsistencia de estado en la navegacion | Eliminar `previousView` y derivarlo de `viewHistory` |
| ARQ-010 | Patron `loading/error` repetido en cada vista sin abstraccion | Duplicacion de codigo; inconsistencias potenciales | Crear `<AsyncView>` o hook `useViewState(key)` |
| ARQ-011 | `LemonSqueezyActivateResponse`/`LemonSqueezyValidateResponse` en `lib/license/types.ts` — DTOs del proveedor anterior | Naming obsoleto; confusion entre contratos externos y modelo interno | Mover a `polar-api.ts` y renombrar |
| ARQ-012 | Sin reintentos en `scan()` ni en fetches de brew — fallos transitorios requieren accion manual | UX degradada en conexiones inestables | Implementar retry con backoff exponencial (max 2-3 intentos) |
| FE-003 | Clave composite en `ProgressLog` puede causar parpadeo si dos lineas comparten prefijo de 30 chars | Parpadeo visual durante operaciones largas | Usar indice global monotonicamente creciente como clave |
| FE-004 | `key={j}` en lineas de warning en `DoctorView` — indice de array como clave | Inconsistencia con el patron del resto de la codebase | Usar clave derivada del contenido |
| FE-005 | `Task {}` anonimos en botones de BrewBar sin handle de cancelacion (cross-ref ARQ-006) | Tareas huerfanas si el popover se cierra | Almacenar handle en `@State` y cancelar en `.onDisappear` |
| FE-006 | `.onAppear` en `DoctorView` sin cleanup del fetch async | Si la vista se desmonta, puede producirse setState en componente desmontado | Aplicar patron `mountedRef` ya usado en `package-info.tsx` |
| FE-007 | Ausencia de previews/snapshots para vistas TUI | Sin validacion visual automatizada | Considerar snapshots de texto con `ink-testing-library` |
| FE-008 | BrewBar PopoverView frame fijo puede truncar texto con Dynamic Type (cross-ref ACC-002) | Texto truncado con tallas de fuente grandes | Cambiar a `frame(minHeight: 320, maxHeight: 500)` |
| FE-009 | `app.tsx` mezcla inicializacion de licencia con routing | Legibilidad y testabilidad reducidas | Extraer `<LicenseInitializer>` y `<ViewRouter>` |
| SEG-004 | `hostname()` del equipo transmitido a Polar.sh sin informar al usuario | Nombre del equipo (puede contener nombre del propietario) llega al servidor | Reemplazar con UUID anonimo generado localmente |
| SEG-005 | `softprops/action-gh-release@v2` sin pin por hash SHA | Tag mutable expone el workflow a compromise del repositorio del tercero | Reemplazar con `softprops/action-gh-release@<SHA>` |
| SEG-006 | `checkBundleIntegrity()` falla-abierta — retorna `true` si no puede leer el archivo | La proteccion de integridad se desactiva silenciosamente en errores de lectura | Cambiar a falla-cerrada con log de advertencia |
| SEG-007 | Sin mecanismo de eliminacion de datos del usuario (`brew-tui delete-account`) | No existe flujo para eliminar `~/.brew-tui/`; requerido por App Store | Agregar `brew-tui delete-account` con confirmacion |
| QA-022 | Sin medicion de latencia de APIs externas | Imposible detectar degradacion en Polar.sh o OSV.dev | Anadir `Date.now()` antes/despues de cada llamada en modo debug |
| QA-023 | Fallos de SchedulerService silenciosos — errores en `self.error` sin persistencia | Los fallos del scheduler de BrewBar son invisibles mas alla de la sesion activa | Persistir el ultimo error en `UserDefaults` con timestamp |
| SCR-018 | Sin adaptacion al ancho del terminal en DashboardView — StatCards pueden solaparse en terminales estrechas | Layout roto en terminales con menos de 60 columnas | Importar `useStdout()` y adaptar numero de StatCards por columnas disponibles |
| SCR-019 | AccountView sin atajo de teclado numerico — solo accesible via Tab/Shift+Tab | Descubrimiento dificil de la vista de cuenta | Documentar el atajo en el footer o agregar AccountView con numero de tecla |
| EP-013 | Dos instancias de `install-brewbar` concurrentes comparten `/tmp/BrewBar.app.zip` | Pueden corromperse mutuamente durante la instalacion | Usar path temporal unico con `randomUUID()` |
| BK-006 | Sin migracion de schema implementada — comentario `// Future: add migration logic here` | Un cambio de schema dejara los datos de usuarios v1 ilegibles | Disenar logica de migracion antes de cualquier cambio de schema |
| BK-007 | Sin restriccion de unicidad en perfiles — `saveProfile` sobreescribe silenciosamente | El usuario puede perder datos de un perfil existente | Agregar comprobacion de existencia antes de guardar |
| REL-003 | Cuatro cadenas con `extractionState: stale` en `Localizable.xcstrings` de BrewBar | El catalogo no esta sincronizado con el codigo fuente | Ejecutar `tuist generate` para re-extraer cadenas |
| REL-004 | `CURRENT_PROJECT_VERSION` ausente en `Project.swift` — sin `CFBundleVersion` | Sin numero de build para distinguir entre builds de la misma version | Agregar `"CURRENT_PROJECT_VERSION": "1"` en `Project.swift` |
| REL-005 | Sin screenshots ni assets de marketing automatizados | Limita la documentacion y el listing | Agregar screenshots al README o carpeta `/assets/screenshots/` |
| ACC-006 | Imagenes decorativas en OutdatedListView sin `.accessibilityHidden(true)` | VoiceOver leera "arrow.right" como contenido significativo | Agregar `.accessibilityHidden(true)` |
| ACC-007 | Cabeceras de seccion sin `.accessibilityAddTraits(.isHeader)` en PopoverView y SettingsView | La estructura de la pagina no es accesible para usuarios de VoiceOver | Agregar `.accessibilityAddTraits(.isHeader)` |
| ACC-008 | Sin patron establecido para Reduce Motion en animaciones futuras | Sin guardia si se agregan animaciones | Agregar wrapper de utilidad para `@Environment(\.accessibilityReduceMotion)` |

---

## Mapa de calor por dominio

| Dominio | Critica | Alta | Media | Baja | Total | Estado general |
|---------|---------|------|-------|------|-------|----------------|
| Testing / Calidad (QA) | 3 | 10 | 5 | 5 | 23 | Critico |
| Pantallas (SCR) | 1 | 8 | 9 | 2 | 20 | Critico |
| Endpoints (EP) | 0 | 5 | 6 | 2 | 13 | Preocupante |
| Arquitectura (ARQ) | 0 | 1 | 6 | 4 | 11 | Preocupante |
| Release (REL) | 1 | 2 | 0 | 4 | 7 | Critico |
| Seguridad (SEG) | 0 | 2 | 1 | 4 | 7 | Preocupante |
| Accesibilidad (ACC) | 0 | 2 | 3 | 3 | 8 | Preocupante |
| Design System (DS) | 0 | 1 | 4 | 0 | 5 | Preocupante |
| Backend (BK) | 0 | 1 | 3 | 3 | 7 | Preocupante |
| Frontend (FE) | 0 | 0 | 2 | 7 | 9 | Aceptable |
| Gobierno (GOV) | 0 | 0 | 3 | 4 | 7 | Aceptable |

> **Critico**: uno o mas hallazgos Criticos en el dominio.
> **Preocupante**: sin Criticos pero con uno o mas Altos.
> **Aceptable**: sin Criticos ni Altos; mayoria Media/Baja.
> **Bueno**: sin hallazgos o solo Bajos menores.
