import type { BrewfileSchema } from './types.js';

/**
 * Minimal YAML serializer/deserializer for BrewfileSchema.
 * No external dependencies — supports only the exact format we emit.
 *
 * Quoting rules: single-quote strings that contain :, #, ', ";
 * start with -, [, {, ?, !, @, &, *, >, |, %, digits, or have
 * leading/trailing whitespace, or are empty.
 * Inside single-quoted YAML, ' is escaped as ''.
 */

const MUST_QUOTE_RE = /[:'"#[\]{}?!@&*>|%]/;
const STARTS_SPECIAL_RE = /^[-\s]|^\d/;

function needsQuoting(s: string): boolean {
  if (s === '') return true;
  if (STARTS_SPECIAL_RE.test(s)) return true;
  if (MUST_QUOTE_RE.test(s)) return true;
  if (s !== s.trimStart() || s !== s.trimEnd()) return true;
  return false;
}

function quote(s: string): string {
  if (!needsQuoting(s)) return s;
  return `'${s.replace(/'/g, "''")}'`;
}

function unquote(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

// ── Serializer ──────────────────────────────────────────────────────────────

export function serializeBrewfile(schema: BrewfileSchema): string {
  const lines: string[] = [];

  lines.push(`version: ${schema.version}`);
  lines.push('meta:');
  lines.push(`  name: ${quote(schema.meta.name)}`);
  if (schema.meta.description !== undefined) {
    lines.push(`  description: ${quote(schema.meta.description)}`);
  }
  lines.push(`  createdAt: ${quote(schema.meta.createdAt)}`);
  lines.push(`  updatedAt: ${quote(schema.meta.updatedAt)}`);

  lines.push('formulae:');
  if (schema.formulae.length === 0) {
    lines.push('  []');
  } else {
    for (const f of schema.formulae) {
      lines.push(`  - name: ${quote(f.name)}`);
      if (f.version !== undefined) {
        lines.push(`    version: ${quote(f.version)}`);
      }
      if (f.options !== undefined && f.options.length > 0) {
        lines.push('    options:');
        for (const opt of f.options) {
          lines.push(`      - ${quote(opt)}`);
        }
      }
    }
  }

  lines.push('casks:');
  if (schema.casks.length === 0) {
    lines.push('  []');
  } else {
    for (const c of schema.casks) {
      lines.push(`  - name: ${quote(c.name)}`);
      if (c.version !== undefined) {
        lines.push(`    version: ${quote(c.version)}`);
      }
    }
  }

  lines.push('taps:');
  if (schema.taps.length === 0) {
    lines.push('  []');
  } else {
    for (const tap of schema.taps) {
      lines.push(`  - ${quote(tap)}`);
    }
  }

  if (schema.strictMode !== undefined) {
    lines.push(`strictMode: ${schema.strictMode}`);
  }

  return lines.join('\n') + '\n';
}

// ── Parser ───────────────────────────────────────────────────────────────────

type ParseContext =
  | 'root'
  | 'meta'
  | 'formulae'
  | 'formulae_item'
  | 'formulae_options'
  | 'casks'
  | 'casks_item'
  | 'taps';

export function parseBrewfile(yaml: string): BrewfileSchema {
  const rawLines = yaml.split('\n');

  // Working state
  let version: number | undefined;
  const meta: Partial<{ name: string; description: string; createdAt: string; updatedAt: string }> = {};
  const formulae: BrewfileSchema['formulae'] = [];
  const casks: BrewfileSchema['casks'] = [];
  const taps: string[] = [];
  let strictMode: boolean | undefined;

  let context: ParseContext = 'root';
  let currentFormula: (typeof formulae)[number] | null = null;
  let currentCask: (typeof casks)[number] | null = null;

  for (const rawLine of rawLines) {
    // Skip blank lines and comments
    const line = rawLine;
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Detect indentation level
    const indent = line.length - line.trimStart().length;

    // Empty inline arrays (formulae: [], casks: [], taps: [])
    if (trimmed.endsWith(': []')) {
      const key = trimmed.slice(0, -4);
      if (key === 'formulae') { context = 'formulae'; continue; }
      if (key === 'casks')    { context = 'casks';    continue; }
      if (key === 'taps')     { context = 'taps';     continue; }
    }

    // Root-level keys (indent === 0, contains ':')
    if (indent === 0) {
      if (trimmed.startsWith('version:')) {
        const val = trimmed.slice('version:'.length).trim();
        version = parseInt(val, 10);
        context = 'root';
        continue;
      }
      if (trimmed === 'meta:') { context = 'meta'; continue; }
      if (trimmed === 'formulae:') { context = 'formulae'; continue; }
      if (trimmed === 'casks:') { context = 'casks'; continue; }
      if (trimmed === 'taps:') { context = 'taps'; continue; }
      if (trimmed.startsWith('strictMode:')) {
        const val = trimmed.slice('strictMode:'.length).trim();
        strictMode = val === 'true';
        context = 'root';
        continue;
      }
      // Unknown root key — skip
      context = 'root';
      continue;
    }

    // ── meta block (indent 2) ──
    if (context === 'meta' && indent === 2) {
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const val = unquote(trimmed.slice(colonIdx + 1));
      if (key === 'name') meta.name = val;
      else if (key === 'description') meta.description = val;
      else if (key === 'createdAt') meta.createdAt = val;
      else if (key === 'updatedAt') meta.updatedAt = val;
      continue;
    }

    // ── formulae block ──
    if (context === 'formulae' || context === 'formulae_item' || context === 'formulae_options') {
      // New formula item: "  - name: value" (indent 2)
      if (indent === 2 && trimmed.startsWith('- name:')) {
        const val = unquote(trimmed.slice('- name:'.length));
        currentFormula = { name: val };
        formulae.push(currentFormula);
        context = 'formulae_item';
        continue;
      }
      // Properties of current formula (indent 4)
      if (indent === 4 && context === 'formulae_item') {
        if (trimmed.startsWith('version:')) {
          if (currentFormula) currentFormula.version = unquote(trimmed.slice('version:'.length));
        } else if (trimmed === 'options:') {
          if (currentFormula) currentFormula.options = [];
          context = 'formulae_options';
        }
        continue;
      }
      // Options items (indent 6): "      - value"
      if (indent === 6 && context === 'formulae_options') {
        if (trimmed.startsWith('- ')) {
          const val = unquote(trimmed.slice(2));
          if (currentFormula?.options) currentFormula.options.push(val);
        }
        continue;
      }
      // If we see something at indent 4 after options, back to formulae_item
      if (indent === 4 && context === 'formulae_options') {
        context = 'formulae_item';
        if (trimmed.startsWith('version:')) {
          if (currentFormula) currentFormula.version = unquote(trimmed.slice('version:'.length));
        }
        continue;
      }
    }

    // ── casks block ──
    if (context === 'casks' || context === 'casks_item') {
      if (indent === 2 && trimmed.startsWith('- name:')) {
        const val = unquote(trimmed.slice('- name:'.length));
        currentCask = { name: val };
        casks.push(currentCask);
        context = 'casks_item';
        continue;
      }
      if (indent === 4 && context === 'casks_item') {
        if (trimmed.startsWith('version:')) {
          if (currentCask) currentCask.version = unquote(trimmed.slice('version:'.length));
        }
        continue;
      }
    }

    // ── taps block (indent 2): "  - value" ──
    if (context === 'taps' && indent === 2 && trimmed.startsWith('- ')) {
      taps.push(unquote(trimmed.slice(2)));
      continue;
    }
  }

  // Validate
  if (version !== 1) {
    throw new Error(`Invalid Brewfile: expected version 1, got ${String(version)}`);
  }
  if (!meta.name) {
    throw new Error('Invalid Brewfile: missing meta.name');
  }
  if (!meta.createdAt || !meta.updatedAt) {
    throw new Error('Invalid Brewfile: missing meta.createdAt or meta.updatedAt');
  }

  const result: BrewfileSchema = {
    version: 1,
    meta: {
      name: meta.name,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    },
    formulae,
    casks,
    taps,
  };

  if (meta.description !== undefined) result.meta.description = meta.description;
  if (strictMode !== undefined) result.strictMode = strictMode;

  return result;
}
