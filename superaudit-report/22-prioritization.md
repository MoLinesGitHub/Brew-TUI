# 22. Priorizacion ejecutiva

> Auditor: report-consolidator | Fecha: 2026-04-23

## Top 10 issues a resolver (orden de impacto)

### 1. Clave de cifrado hardcodeada (SEG-001) — Critica
**Que:** Las claves AES-256-GCM estan en texto claro en el bundle npm y en el binario Swift.
**Por que:** Invalida todo el modelo de proteccion de licencias Pro. Cualquiera puede forjar un `license.json` valido.
**Esfuerzo:** Alto (rediseno del sistema de licencias con tokens opacos firmados server-side).
**Accion inmediata:** Desactivar source maps (`sourcemap: false` en tsup) para reducir la exposicion.

### 2. Cobertura de tests 0% (QA-001) — Critica
**Que:** Cero tests en ambos codebases. CI publica a npm sin ningun gate de calidad.
**Por que:** Operaciones destructivas (uninstall, upgrade masivo, activacion de pago) sin red de seguridad.
**Esfuerzo:** Medio-Alto (crear suite progresivamente, empezar por license-manager y parsers).
**Accion inmediata:** Agregar `npm run test` como paso obligatorio en CI antes de `npm publish`.

### 3. Sin timeouts en fetch (BK-001) — Critica
**Que:** Ninguna llamada `fetch()` tiene `AbortSignal.timeout()`. Un servidor colgado bloquea la app indefinidamente.
**Por que:** La TUI se congela sin posibilidad de cancelacion; impacto directo en UX.
**Esfuerzo:** Bajo (crear helper `fetchWithTimeout` y aplicar en 7 sitios).
**Accion inmediata:** Implementar hoy — es el fix con mejor ratio impacto/esfuerzo.

### 4. BrewBar sin firma ni notarizacion (SEG-003 + GOV-004)  — Critica
**Que:** BrewBar se distribuye sin Developer ID, sin notarize, sin App Sandbox, sin PrivacyInfo.xcprivacy.
**Por que:** Gatekeeper bloquea la app para todos los usuarios; incumple requisitos Apple desde 2024.
**Esfuerzo:** Medio (requiere cuenta Apple Developer $99/year + configurar CI).
**Accion inmediata:** Registrar en Apple Developer Program si no esta hecho.

### 5. Descarga BrewBar sin verificacion (SEG-004) — Critica
**Que:** El instalador descarga y extrae un ZIP sin verificar checksum ni firma.
**Por que:** Vector MITM — un binario malicioso se instala en `/Applications/` sin validacion.
**Esfuerzo:** Bajo (agregar SHA-256 check post-descarga + verificar codesign).
**Accion inmediata:** Publicar checksums junto a cada release; verificar en `brewbar-installer.ts`.

### 6. Licencia MIT incompatible con freemium (GOV-001) — Critica
**Que:** MIT permite redistribuir el codigo Pro-gate sin restricciones.
**Por que:** Cualquier usuario puede eliminar las verificaciones de licencia y redistribuir.
**Esfuerzo:** Bajo (cambiar licencia) pero requiere decision de negocio.
**Accion inmediata:** Evaluar BSL 1.1 o Commons Clause para la capa Pro.

### 7. Deactivate silencia errores (SEG-005) — Critica
**Que:** La desactivacion borra la licencia local aunque falle la API; el slot queda huerfano en Polar.
**Por que:** El usuario pierde acceso Pro sin posibilidad de recuperacion automatica.
**Esfuerzo:** Bajo (agregar retry + no borrar local hasta confirmar remoto).
**Accion inmediata:** Fix directo en `license-manager.ts:257-261`.

### 8. Anti-debug bypass trivial (SEG-002) — Critica
**Que:** `VITEST=1 brew-tui` desactiva toda la proteccion anti-debug.
**Por que:** Bypass de 1 variable de entorno para desactivar el sistema de proteccion.
**Esfuerzo:** Bajo (eliminar bypass por env var; usar flag de compilacion).
**Accion inmediata:** Fix directo en `anti-debug.ts:11`.

### 9. goBack() es ping-pong (UI-001) — Alta
**Que:** Esc solo alterna entre 2 vistas en vez de hacer pop del historial real.
**Por que:** Navegacion frustrante; el usuario no puede retroceder mas de 1 nivel.
**Esfuerzo:** Bajo (reimplementar como pop de `viewHistory`).
**Accion inmediata:** Fix directo en `navigation-store.ts:35-42`.

### 10. BrewBar "Open Brew-TUI" hardcodea Terminal.app (UI-005) — Alta
**Que:** NSAppleScript hardcodea Terminal; falla silenciosamente en iTerm2/Warp/Ghostty.
**Por que:** Funcion principal del menubar inutilizable para muchos usuarios de macOS.
**Esfuerzo:** Bajo-Medio (picker de terminal en Settings o deteccion automatica).
**Accion inmediata:** Usar `NSWorkspace` para lanzar el terminal por defecto del sistema.

---

## Distribucion por esfuerzo

| Esfuerzo | Items | IDs |
|----------|-------|-----|
| Bajo (< 1 dia) | 6 | BK-001, SEG-004, SEG-005, SEG-002, UI-001, GOV-001 |
| Medio (1-3 dias) | 3 | SEG-003, QA-001 (inicio), UI-005 |
| Alto (> 3 dias) | 1 | SEG-001 (rediseno licencias) |

## Recomendacion de sprint

**Sprint 1 (1 semana):** Items 3, 5, 7, 8, 9 — todos de esfuerzo bajo con impacto critico/alto.
**Sprint 2 (2 semanas):** Items 2, 4, 10 — requieren mas trabajo pero son fundamentales.
**Sprint 3 (1-2 semanas):** Items 1, 6 — decisiones de arquitectura y negocio.
