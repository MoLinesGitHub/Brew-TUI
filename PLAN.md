# Brew-TUI · Plan de Evolución — Power Release

> Objetivo: convertir Brew-TUI + BrewBar en la herramienta indispensable de gestión
> de entorno macOS para developers individuales y equipos técnicos.
> 6 features en 5 fases. Estado base: v0.4.1.

---

## Decisiones bloqueantes — confirmar antes de Phase 2/3

| # | Decisión | Recomendación | Alternativa |
|---|---|---|---|
| D1 | Backend sync (Phase 3) | **iCloud Drive** — Mac-native, zero infra, privacidad por defecto | GitHub Gist (requiere token) / brewtui-api custom (coste infra) |
| D2 | Formato Brewfile declarativo | **YAML** — legible, dev-friendly, sin deps pesadas | TOML / JSON |
| D3 | Modelo B2B Compliance | **Team tier en Polar** — per-seat, €X/seat/mes | Org license plana / add-on al Pro individual |
| D4 | CVE polling a escala | **Proxy via brewtui-api** con cache 1h compartido | OSV.dev directo (riesgo rate-limit con >1k usuarios) |
| D5 | Cifrado datos sincronizados | **Reusar AES-256-GCM** del módulo license existente | Diseño nuevo |

D1, D2, D3 bloquean Phase 3-4. D4 bloquea producción de Phase 1 a escala. D5 es técnico, recomendación firme: reusar.

---

## Phase 0 · Infraestructura compartida
> Prerequisito de P2+. No shipeable solo — foundation interna.

### Módulos nuevos

**`src/lib/state-snapshot/`**
```ts
// snapshot.ts
export interface BrewSnapshot {
  capturedAt: string          // ISO 8601
  formulae: Array<{ name: string; version: string; pinned: boolean }>
  casks: Array<{ name: string; version: string }>
  taps: string[]
}
export async function captureSnapshot(): Promise<BrewSnapshot>
export async function saveSnapshot(s: BrewSnapshot, label?: string): Promise<void>
export async function loadSnapshots(): Promise<BrewSnapshot[]>
```
Almacén: `~/.brew-tui/snapshots/` (JSON comprimido).

**`src/lib/diff-engine/`**
```ts
// diff.ts
export interface BrewDiff {
  added:   Array<{ name: string; version: string; type: 'formula'|'cask'|'tap' }>
  removed: Array<{ name: string; version: string; type: 'formula'|'cask'|'tap' }>
  upgraded: Array<{ name: string; from: string; to: string; type: 'formula'|'cask' }>
  downgraded: Array<{ name: string; from: string; to: string; type: 'formula'|'cask' }>
}
export function diffSnapshots(base: BrewSnapshot, current: BrewSnapshot): BrewDiff
export function diffDesiredActual(desired: BrewfileSchema, actual: BrewSnapshot): BrewDiff
```

**BrewBar: extensión `SchedulerService.swift`**
Añadir task slots `cveMonitor` y `syncDriftCheck` al scheduler existente.
Status badge unificado en menubar: `[N↑] [M⚠] [K⟳]` (outdated / vulnerable / sync-drift).

**Tests Phase 0:** snapshot round-trip, diff correctness (add/remove/upgrade/downgrade), snapshot persistence.

---

## Phase 1 · Quick Wins — Ship rápido, impacto inmediato
> Independientes de P0. Se pueden desarrollar en paralelo con P0.

---

### Feature 1: CVE Real-time — BrewBar Security Guardian [Pro]

**Files:**
- New: `menubar/BrewBar/Sources/Services/SecurityMonitor.swift`
- New: `menubar/BrewBar/Sources/Models/CVEAlert.swift`
- Modify: `menubar/BrewBar/Sources/App/SchedulerService.swift` — añadir tarea `cveMonitor`
- Modify: `menubar/BrewBar/Sources/App/AppDelegate.swift` — badge count, notification handler
- Modify: `menubar/BrewBar/Resources/Localizable.xcstrings` — strings CVE en/es

**Flujo:**
```
SchedulerService (cada 1h) → SecurityMonitor
  → brew list --json → paquetes instalados
  → [D4: OSV directo o proxy] → batch query
  → diff vs cache anterior (~/.brew-tui/cve-cache.json)
  → si nuevos CVEs críticos/altos → UNUserNotificationCenter
  → actualizar badge count en menubar icon
  → acción en notificación: open brew-tui a security-audit view
```

**CVEAlert.swift:**
```swift
struct CVEAlert: Codable, Identifiable {
  let id: String          // CVE-XXXX-XXXXX
  let packageName: String
  let severity: Severity  // critical / high / medium / low
  let summary: String
  let publishedAt: Date
  enum Severity: String, Codable { case critical, high, medium, low }
}
```

**BrewBar i18n:** ~8 strings nuevas (notificación title/body, badge tooltip, settings label).
**Depends on:** D4 (estrategia polling). Funciona sin P0.
**Risk:** OSV rate-limit — mitigado con D4. Falso positivo si usuario ya actualizó: resolver comparando versión instalada vs versión parcheada en CVE.
**Test surface:** SecurityMonitor mock OSV, dedup alerts, badge count logic, cache hit/miss.

---

### Feature 2: Impact Analysis — Pre-upgrade Intelligence [Pro]

**Files:**
- New: `src/lib/impact/impact-analyzer.ts`
- New: `src/lib/impact/types.ts`
- Modify: `src/lib/brew-api.ts` — `getUpgradeImpact(name)`
- Modify: `src/views/outdated.tsx` — panel impact al seleccionar paquete
- Modify: `src/i18n/en.ts` + `es.ts` — prefix `impact.*` (~15 keys)

**`impact/types.ts`:**
```ts
export interface UpgradeImpact {
  package: string
  fromVersion: string
  toVersion: string
  directDeps: string[]           // brew deps <pkg>
  reverseDeps: string[]          // brew deps --installed --include-requirements <pkg>  
  estimatedRisk: 'low'|'medium'|'high'
  riskReasons: string[]          // e.g. "openssl es dep de 23 formulae instaladas"
}
```

**Lógica de riesgo:**
- `high`: reverseDeps > 10 o paquete en lista crítica (`openssl`, `python`, `node`, `ruby`, `sqlite`)
- `medium`: reverseDeps 3-10 o major version bump
- `low`: reverseDeps < 3 y patch/minor bump

**UX en OutdatedView:**
- Al seleccionar un paquete → panel derecho muestra `UpgradeImpact` con árbol visual ASCII
- Indicador de riesgo coloreado (COLORS.error / warning / success)
- "Actualizar de todas formas" / "Posponer" / "Pin"

**Depends on:** Nada de P0. Usa `brew deps` (ya disponible en brew-cli).
**Risk:** `brew deps` lento para árboles grandes — cachear resultado por sesión.
**Test surface:** impact-analyzer con deps mock, clasificación de riesgo, integración brew-api.

---

## Phase 2 · Local Advanced
> Usa P0 (snapshot + diff). Implementar tras Phase 0 completo.

---

### Feature 3: Rollback Inteligente [Pro]

**Files:**
- New: `src/lib/rollback/rollback-engine.ts`
- New: `src/lib/rollback/types.ts`
- New: `src/views/rollback.tsx`
- New: `src/stores/rollback-store.ts`
- Modify: `src/lib/types.ts` — añadir `'rollback'` a ViewId union
- Modify: `src/stores/navigation-store.ts` — VIEWS array
- Modify: `src/app.tsx` — route case
- Modify: `src/components/layout/footer.tsx` / `header.tsx`
- Modify: `src/lib/license/feature-gate.ts` — añadir a PRO_VIEWS
- Modify: `src/i18n/en.ts` + `es.ts` — prefix `rollback.*` (~20 keys)

**`rollback/types.ts`:**
```ts
export interface RollbackTarget {
  packageName: string
  targetVersion: string
  currentVersion: string
  packageType: 'formula' | 'cask'
  strategy: RollbackStrategy
  available: boolean
  unavailableReason?: string
}

export type RollbackStrategy =
  | 'bottle-cache'      // versión en ~/.cache/Homebrew/downloads
  | 'versioned-formula' // formula@version existe en homebrew-core
  | 'pin-only'          // no restaurable, solo pin para evitar futuras upgrades
  | 'unavailable'       // ni bottle ni formula versionada

export interface RollbackResult {
  success: boolean
  packageName: string
  fromVersion: string
  toVersion: string
  strategy: RollbackStrategy
  error?: string
}
```

**Flujo:**
```
RollbackView → historial de snapshots (P0)
  → seleccionar snapshot anterior
  → diffSnapshots(snapshot, current) → lista de downgrades posibles
  → para cada paquete: detectStrategy()
    → bottle en cache? → brew install --force-bottle
    → formula@version? → brew install formula@N
    → solo pin? → brew pin + warn
    → unavailable? → warn + skip
  → confirmación con lista de acciones
  → ejecutar con streamBrew() + ProgressLog
  → capturar nuevo snapshot post-rollback
```

**Depends on:** P0 (snapshots + diff). History-store existente para listar eventos.
**Risk:** Bottle cache expira — detectStrategy() debe verificar disponibilidad real antes de prometer rollback. Casks raramente tienen bottles versionados — warn explícito.
**Test surface:** detectStrategy() con mock filesystem, rollback result parsing, strategy priority.

---

### Feature 4: Declarative Brewfile [Pro]

**Files:**
- New: `src/lib/brewfile/brewfile-manager.ts`
- New: `src/lib/brewfile/types.ts`
- New: `src/lib/brewfile/yaml-serializer.ts`
- New: `src/views/brewfile.tsx`
- New: `src/stores/brewfile-store.ts`
- Modify: `src/lib/types.ts` — `'brewfile'` en ViewId
- Modify nav + routes + footer + header + feature-gate
- Modify `src/i18n/en.ts` + `es.ts` — prefix `brewfile.*` (~25 keys)

**`brewfile/types.ts`:**
```ts
export interface BrewfileSchema {
  version: 1
  meta: { name: string; description?: string; createdAt: string; updatedAt: string }
  formulae: Array<{
    name: string
    version?: string     // pin a versión exacta, omitir = latest
    options?: string[]   // e.g. ["--with-debug"]
  }>
  casks: Array<{ name: string; version?: string }>
  taps: string[]
}

export interface DriftReport {
  diff: BrewDiff
  score: number          // 0-100, 100 = fully compliant
  missingPackages: string[]
  extraPackages: string[]
  wrongVersions: Array<{ name: string; desired: string; actual: string }>
}
```

**UX BrewfileView:**
- Panel izquierdo: editor del Brewfile deseado (lista editable con j/k, a=add, d=delete)
- Panel derecho: DriftReport en tiempo real (diff vs estado actual)
- Score badge: `▓▓▓▓░ 82% compliant`
- Acción `r` = reconciliar (aplica cambios para alcanzar estado deseado)
- Exportar a `.brewfile.yaml` / importar desde archivo

**Depends on:** P0 (diff-engine para DriftReport). D2 (formato YAML confirmado).
**Risk:** Reconciliación puede ser destructiva (desinstalar extras) — siempre pedir confirmación explícita con lista de acciones. Nunca auto-reconciliar.
**Test surface:** YAML parse/serialize round-trip, DriftReport correctness, score cálculo.

---

## Phase 3 · Sync Cross-machine
> Bloqueado en D1. Usa P0 + Feature 4 (Brewfile como unidad de sync).

---

### Feature 5: Cross-machine Sync [Pro]

**Files:**
- New: `src/lib/sync/sync-engine.ts`
- New: `src/lib/sync/backends/icloud-backend.ts` (y/o `gist-backend.ts`)
- New: `src/lib/sync/conflict-resolver.ts`
- New: `src/lib/sync/types.ts`
- New: `src/views/sync.tsx`
- New: `src/stores/sync-store.ts`
- Modify: `src/lib/types.ts` — `'sync'` en ViewId
- Modify nav + routes + footer + header + feature-gate
- Modify: `src/lib/data-dir.ts` — añadir `syncDir()`
- Modify: `menubar/BrewBar/Sources/Services/SecurityMonitor.swift` → nuevo `SyncMonitor.swift`
- Modify: `menubar/BrewBar/Sources/App/AppDelegate.swift` — badge sync-drift
- Modify: `src/i18n/en.ts` + `es.ts` — prefix `sync.*` (~30 keys)

**`sync/types.ts`:**
```ts
export type SyncBackend = 'icloud' | 'gist'

export interface SyncConfig {
  backend: SyncBackend
  machineId: string       // de ~/.brew-tui/machine-id
  machineName: string     // hostname
  enabled: boolean
  lastSync?: string       // ISO 8601
}

export interface SyncEnvelope {
  schemaVersion: 1
  machines: Record<string, MachineState>
}

export interface MachineState {
  machineId: string
  machineName: string
  updatedAt: string
  brewfile: BrewfileSchema        // estado deseado (F4)
  snapshot: BrewSnapshot          // estado actual (P0)
  profiles: ProfileExport[]       // pro feature existente
}

export type ConflictResolution = 'use-local' | 'use-remote' | 'merge-union' | 'defer'

export interface SyncConflict {
  packageName: string
  localVersion: string
  remoteVersion: string
  localMachine: string
  remoteMachine: string
}
```

**iCloud backend:**
- Path: `~/Library/Mobile Documents/com~apple~CloudDocs/BrewTUI/sync.json`
- Cifrado con AES-256-GCM reutilizando módulo de license (D5)
- No requiere API externa, autenticación automática

**Conflict resolution policy:**
- Formulae añadidas en ambas: `merge-union` automático
- Versiones diferentes: prompt al usuario con `ConflictResolverDialog`
- Taps: `merge-union` automático
- Brewfile name/meta conflicts: `use-local` + log

**BrewBar SyncMonitor:**
- Task en SchedulerService cada 15min: leer sync.json, comparar con estado local
- Si drift > 0 → badge `⟳N` en menubar icon
- Notificación opcional: "Mac Pro tiene 3 paquetes que tu MacBook no tiene"

**Depends on:** P0, F4 (BrewfileSchema), D1 (backend), D5 (cifrado).
**Risk:** iCloud sync delay (eventual consistency) → nunca asumir sync instantáneo, mostrar `lastSync` timestamp siempre. Conflict en primer sync si 2 Macs ya tienen estados divergentes — onboarding wizard que resuelve conflictos explícitamente.
**Test surface:** SyncEnvelope serialize/deserialize, conflict detection, merge-union logic, iCloud path resolution.

---

## Phase 4 · Team Compliance
> Usa P0 + F4 (BrewfileSchema como base de policy). Requiere D3.

---

### Feature 6: Team Compliance — B2B [Team tier]

**Files:**
- New: `src/lib/compliance/compliance-checker.ts`
- New: `src/lib/compliance/policy-export.ts`
- New: `src/lib/compliance/types.ts`
- New: `src/views/compliance.tsx`
- New: `src/stores/compliance-store.ts`
- Modify: `src/lib/types.ts` — `'compliance'` en ViewId
- Modify: `src/lib/license/feature-gate.ts` — TEAM_VIEWS (nuevo set)
- Modify nav + routes + footer + header
- Modify: `menubar/BrewBar/Sources/App/AppDelegate.swift` — badge compliance
- Modify: `src/i18n/en.ts` + `es.ts` — prefix `compliance.*` (~25 keys)

**`compliance/types.ts`:**
```ts
export interface PolicyFile {
  version: 1
  meta: { teamName: string; maintainer: string; createdAt: string }
  required: Array<{
    name: string
    minVersion?: string     // semver constraint, e.g. ">=3.11"
    maxVersion?: string
    type: 'formula' | 'cask'
  }>
  forbidden: Array<{ name: string; type: 'formula' | 'cask'; reason?: string }>
  requiredTaps: string[]
  strictMode: boolean     // si true, cualquier paquete no en required es violación
}

export interface ComplianceReport {
  compliant: boolean
  score: number           // 0-100
  violations: ComplianceViolation[]
  timestamp: string
}

export interface ComplianceViolation {
  severity: 'error' | 'warning'
  type: 'missing' | 'forbidden' | 'wrong-version' | 'extra-package'
  packageName: string
  detail: string
}
```

**Flujo:**
```
ComplianceView
  → importar policy.brewpolicy (JSON) desde URL / archivo
  → complianceChecker.check(policy, currentSnapshot)
  → ComplianceReport con score y lista de violations
  → acción "Auto-remediar" (instala missing, desinstala forbidden tras confirm)
  → exportar reporte como JSON / texto para PR comments

PolicyExport (para tech leads):
  → generar policy.brewpolicy desde estado actual
  → marcar como required/optional interactivamente
  → compartir via URL (si D3 usa brewtui-api) o archivo
```

**Privacy:** El policy file no contiene datos del usuario — solo nombres de paquetes y versiones. El reporte de compliance es local-only salvo exportación explícita. Documentar en README.

**BrewBar badge:** `✓` verde (compliant) / `⚠N` naranja (N violations) / `-` (no policy cargada).

**Licensing:** `TEAM_VIEWS` set separado de `PRO_VIEWS`. `isTeam()` check en license-store análogo a `isPro()`. Team tier en Polar con precio por seat.

**Depends on:** P0 (snapshot para check), F4 (BrewfileSchema reutilizable como base de policy). D3 (modelo B2B).
**Risk:** "Forbidden package" puede romperse si el paquete es dependencia implícita — el checker debe distinguir paquetes instalados explícitamente vs como dependencia (`brew list --formula -1` vs `brew leaves`). Compliance privacy: no exfiltrar lista de paquetes sin consentimiento explícito.
**Test surface:** compliance-checker con policy mock, score calculation, all violation types, strictMode.

---

## Phase 5 · Integration & Polish

- Conectar CVE alerts (F1) con Rollback (F3): desde la notificación CVE → rollback a versión parcheada
- Conectar Impact Analysis (F2) con Brewfile (F4): al reconciliar, mostrar impact de cada cambio
- Conectar Sync (F5) con Compliance (F6): el policy file puede sincronizarse vía iCloud junto al Brewfile
- Dashboard unificado en BrewBar: un solo panel con estado de todos los módulos
- `brew-tui status` CLI subcommand actualizado con sync-state + compliance-score
- i18n: revisión completa en/es de todos los strings nuevos
- Documentación: README actualizado con feature matrix Free/Pro/Team

---

## Secuencia de implementación optimizada

```
[AHORA]  Phase 0 (infra) ──────────────────────────────────────────┐
         Phase 1 Feature 1 (CVE BrewBar)  ── paralelo con P0 ───── │
         Phase 1 Feature 2 (Impact TUI)   ── paralelo con P0 ───── │
                                                                     ▼
[P0 done] Phase 2 Feature 3 (Rollback)   ─────────────────────────┐│
           Phase 2 Feature 4 (Brewfile)   ─────────────────── paralelo
                                                                     ▼
[D1+D2 confirmados] Phase 3 Feature 5 (Sync) ──────────────────────┐
                                                                     ▼
[D3 confirmado]     Phase 4 Feature 6 (Compliance) ────────────────┐
                                                                     ▼
                    Phase 5 (Integration) ──────────────────────────
```

## Estimación de esfuerzo

| Phase | Features | Esfuerzo estimado | Ship parcial posible |
|---|---|---|---|
| P0 | Infra compartida | 2-3 días | No (interna) |
| P1 | CVE + Impact | 4-5 días | **Sí — v0.5.0** |
| P2 | Rollback + Brewfile | 6-8 días | **Sí — v0.6.0** |
| P3 | Sync | 5-7 días | **Sí — v0.7.0** |
| P4 | Compliance | 4-6 días | **Sí — v0.8.0** |
| P5 | Integration | 3-4 días | **v1.0.0** |

**Total estimado: 6-7 semanas a ritmo sostenido.**

P1 solo ya justifica el Pro tier para nuevos usuarios y da argumento de seguridad en marketing.
P2 convierte Brew-TUI en herramienta de producción seria.
P3+P4 abren el canal B2B/Team.

---

## Stop points si se corta scope

- **v0.5.0 (P0+P1):** CVE real-time + Impact analysis — pitch de seguridad sólido, Pro tier justificado
- **v0.6.0 (+P2):** Rollback + Brewfile — diferenciación técnica clara vs brew CLI raw
- **v1.0.0 (+P3+P4+P5):** Suite completa — producto con argumento B2B
