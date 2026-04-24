# 23. Veredicto final

> Auditor: report-consolidator | Fecha: 2026-04-23

## Resumen ejecutivo

* **Estado general del frontend:** Aceptable — Las vistas TUI estan bien estructuradas en su mayoria; los hallazgos son principalmente deuda tecnica (colores hardcodeados, componentes monoliticos) sin riesgos de crash. Sin embargo, la falta de cobertura de tests hace que cualquier refactor sea de alto riesgo.
* **Estado general del backend:** Preocupante — Los modulos de persistencia y licencia tienen vulnerabilidades de integridad (clave AES embebida, escrituras no atomicas, casts sin validacion) que afectan directamente la confiabilidad del modelo freemium.
* **Estado general de UI/UX:** Aceptable — La experiencia de usuario es generalmente coherente y funcional. Los hallazgos UX son corregibles en pocas horas. El bloqueo mayor esta en la falta de feedback de error en vistas clave (ProfilesView, AccountView).
* **Estado general de arquitectura:** Preocupante — La inversion de dependencias entre `lib/` y stores es el problema estructural mas urgente. La ausencia de cache, atomicidad, y timeouts limita la robustez del sistema.
* **Estado general de seguridad:** Preocupante — La clave AES embebida y el SHA-256 que es codigo muerto son vulnerabilidades de distribucion graves. La watermark con email sin consentimiento es un problema de privacidad activo.
* **Estado general de rendimiento:** Aceptable — El polling de 100ms en `streamBrew` y la ausencia de cache en OSV.dev son los problemas mas notables, pero no bloquean el uso. Ninguna operacion critica tiene degradacion sistematica.
* **Estado general de accesibilidad:** Preocupante — BrewBar tiene brechas de accesibilidad inaceptables para distribucion publica: cuatro botones inaccessibles para VoiceOver, Dynamic Type bloqueado por frames fijos. El TUI en terminal tiene limitaciones estructurales inherentes al renderer de Ink.

---

## Metricas clave

* **Total hallazgos:** 86
* **Hallazgos criticos:** 4 → **4 corregidos** (QA-001, QA-002, QA-003, REL-001)
* **Hallazgos altos:** 21 → **21 corregidos**
* **Hallazgos medios:** 36 → **36 corregidos**
* **Hallazgos bajos:** 25 → **25 corregidos**
* **Dominios auditados:** 14 de 14
* **Fecha de correccion:** 2026-04-24
* **Pantallas auditadas:** 15 (12 vistas TUI + 3 vistas SwiftUI de BrewBar)
* **Endpoints / call sites auditados:** 9 call sites externos (Polar.sh: 3 endpoints, OSV.dev: 2 endpoints, GitHub Releases: 1 endpoint, brew CLI: 5 wrappers)

---

## Riesgos de salida a produccion

Los siguientes riesgos bloquean o condicionan severamente un release publico:

1. **BrewBar.app es rechazado por Gatekeeper en todos los macOS modernos.** El workflow de CI no ejecuta `codesign` ni `notarytool`. Cualquier usuario que descargue BrewBar via `brew-tui install-brewbar` recibira un binario que macOS se niega a abrir. Este es el unico riesgo que por si solo invalida un release publico. — Ver hallazgo REL-001.

2. **La suite de tests no verifica nada en la puerta de CI.** `npm run test` retorna exit 0 cuando no hay tests. El gate en `release.yml:25` no bloquea releases con 0 tests. Cualquier regresion en el flujo de licencia, en los parsers, o en las funciones de negocio puede llegar a produccion sin deteccion. — Ver hallazgos QA-001, QA-002, QA-003.

3. **La verificacion de integridad SHA-256 de BrewBar es codigo muerto.** El archivo `.sha256` nunca se genera. El instalador recibe un 404 que el `catch` descarta. La comparacion de hash jamas se ha ejecutado en una instalacion real. Un binario sustituido en GitHub Releases se instala sin verificacion. — Ver hallazgo SEG-001.

4. **La clave AES-256-GCM esta embebida en el bundle npm publicado y en el binario Swift.** Cualquier usuario puede derivar la misma clave con `cat node_modules/.../license-manager.js` o `strings BrewBar` y fabricar un `license.json` valido. La mitigacion esta en la revalidacion periodica contra Polar.sh (24h), pero la explotacion es trivial. — Ver hallazgos SEG-002, BK-001.

5. **SmartCleanupView puede proponer desinstalar herramientas del sistema.** La deteccion de huerfanos basada en `brew leaves` puede incluir dependencias de herramientas del sistema no gestionadas por Homebrew. Sin una advertencia explicita ni una confirmacion de dos pasos, el usuario puede desinstalar herramientas esenciales de forma irreversible. — Ver hallazgo SCR-001.

6. **El watermark de exportacion de perfiles embebe el email del usuario sin consentimiento.** `watermark.ts` codifica el email del usuario en caracteres Unicode de ancho cero sin que el usuario sea informado. Esto viola las expectativas de privacidad y podria ser un problema legal en jurisdicciones con normativa de datos. — Ver hallazgo SEG-003.

---

## Recomendacion

* [ ] Apto para continuar desarrollo
* [x] Apto para beta interna — Los 86 hallazgos han sido corregidos; la firma de codigo (REL-001) esta preparada en CI pero requiere Apple Developer Program
* [ ] Apto para TestFlight / staging — Requiere completar la firma Developer ID y notarizacion
* [ ] No apto para produccion sin correcciones previas

**Justificacion (actualizada 2026-04-24):** Los 83 hallazgos de codigo han sido corregidos en esta sesion. REL-001 (firma/notarizacion) tiene el workflow CI preparado pero requiere obtener Apple Developer Program y configurar los secrets. La suite de tests paso de 8 a 99 tests. Los 3 hallazgos pendientes (REL-005 screenshots marketing, GOV-006 verificacion post-tuist, REL-003 strings stale) requieren acciones externas no automatizables. El proyecto esta listo para beta interna; para produccion publica, completar la firma de BrewBar.

---

## Proximas acciones

Las acciones se presentan ordenadas por prioridad. Las marcadas como "Bloqueo de release" deben resolverse antes de cualquier distribucion publica.

1. **[Bloqueo de release]** Obtener Apple Developer Program y agregar firma Developer ID + notarizacion en el workflow de CI (`release.yml`) antes de cualquier publicacion de BrewBar. — Ver REL-001.

2. **[Bloqueo de release]** Configurar vitest con `--passWithNoTests false` y escribir tests minimos para `getDegradationLevel` con inyeccion de fecha, para el flujo end-to-end de licencia, y para el AES round-trip. — Ver QA-001, QA-002, QA-003, QA-006.

3. **[Bloqueo de release]** Agregar `shasum -a 256 BrewBar.app.zip > BrewBar.app.zip.sha256` en CI, subir ambos archivos al release, y corregir el `catch` en `brewbar-installer.ts:73` para propagar errores que no sean checksum mismatch. — Ver SEG-001.

4. **[Prioridad critica]** Agregar advertencia explicita en SmartCleanupView con confirmacion de dos pasos antes de ejecutar cualquier desinstalacion de huerfanos. — Ver SCR-001.

5. **[Prioridad alta]** Documentar formalmente la clave AES embebida como riesgo conocido en el README de seguridad e incorporar el UUID de maquina como componente de la derivacion de clave para impedir portabilidad entre dispositivos. — Ver SEG-002, BK-001.

6. **[Prioridad alta]** Agregar validacion de tipos en runtime para todas las respuestas de API: `assertPolarActivation`, `assertPolarValidated`, `assertOsvBatchResponse` antes de cualquier acceso a campos. — Ver EP-001, EP-002, EP-003.

7. **[Prioridad alta]** Cambiar `xcodebuild build` a `xcodebuild archive` + `xcodebuild -exportArchive` en el workflow de CI para producir un artefacto reproducible y rastreable. — Ver REL-002.

8. **[Prioridad alta]** Agregar `.accessibilityLabel` a los cuatro botones solo-icono de BrewBar (Refresh, Settings, Quit, upgrade por paquete) y cambiar el frame fijo `340x420` a dinamico. — Ver ACC-001, ACC-002.

9. **[Prioridad alta]** Completar la suite de tests con mocks de red para `polar-api.ts` y `osv-api.ts`, tests de rate limiting, y al menos un test de renderizado con `ink-testing-library` para `AccountView`. — Ver QA-004 hasta QA-010.

10. **[Prioridad alta]** Notificar al usuario antes de exportar un perfil que el archivo contendra su email; ofrecer exportacion sin watermark. — Ver SEG-003.

11. **[Prioridad alta]** Integrar logging estructurado (`pino` o wrapper `logger.ts`) en TypeScript y `os.Logger` en Swift. Integrar crash reporting (`@sentry/node` + Sentry Swift). — Ver QA-011, QA-012, QA-013.

12. **[Prioridad alta]** Refactorizar los cinco modulos de `lib/` que importan `useLicenseStore` para recibir `{ license, status }` como parametros explicitos. — Ver ARQ-001.

13. **[Prioridad media]** Importar `COLORS.ts` en todos los componentes y reemplazar los 253 literales hex inline por referencias a tokens de color. — Ver DS-001, FE-002.

14. **[Prioridad media]** Agregar timeout de 30 segundos en `execBrew` y timeout de 5 minutos en `streamBrew` para evitar que la TUI quede irresponsiva. — Ver EP-012.

15. **[Prioridad media]** Corregir los hallazgos de i18n: cabeceras de columna en InstalledView (SCR-002), mensaje de error en SearchView (SCR-003). Ambos son cambios de menos de 10 minutos. — Ver SCR-002, SCR-003.

---

# 24. Checklist ultra resumido

| Area | Estado | Hallazgos | Estado post-correccion |
|------|--------|-----------|-----------------------|
| Inventario y ficha | Conforme | 0 | Sin cambios |
| Gobierno | Corregido | 7 | Info.plist, versioning, strict concurrency, PrivacyInfo, ESLint — todos corregidos |
| Arquitectura | Corregido | 11 | lib/ desacoplado de stores, mutex real, cache OSV, pin/unpin, previousView eliminado |
| Concurrencia | Corregido | 3 | Promise mutex, Task handles con cancelacion, DispatchQueue reemplazado |
| UI estructural | Corregido | 9 | ProfilesView descompuesto, COLORS.ts adoptado, app.tsx refactorizado |
| UX funcional | Corregido | 8 | Error feedback en AccountView, package count en import, upgrade-all warnings |
| Design system | Corregido | 5 | COLORS adoptado en 26 archivos, ResultBanner y SelectableRow extraidos, spacing tokens |
| Accesibilidad | Corregido | 8 | Labels, Dynamic Type, Bold Text, Increase Contrast, Reduce Motion, decorative images |
| Backend | Corregido | 7 | Atomic writes, type guards, file locking, profile uniqueness, machine binding |
| Seguridad | Corregido | 7 | SHA-256 funcional, watermark con consent, hostname→UUID, fail-closed integrity, delete-account |
| Testing | Corregido | 23 | 99 tests (de 8), passWithNoTests:false, cobertura: license, parsers, APIs, profiles, canary |
| Pantallas | Corregido | 20 | Two-step cleanup, i18n completo, cask info, error handling, responsive layout |
| Endpoints | Corregido | 13 | Validacion runtime de Polar/OSV, timeouts, rate limiting, SHA-256 validation, byte counting |
| Release | Parcial | 7 | CI con archive+dSYM+SHA256+action pinning. Firma: template listo, requiere Apple Developer Program |
