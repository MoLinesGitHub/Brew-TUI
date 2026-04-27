import type { BrewSnapshot } from '../state-snapshot/snapshot.js';

export interface BrewDiff {
  added: Array<{ name: string; version: string; type: 'formula' | 'cask' | 'tap' }>;
  removed: Array<{ name: string; version: string; type: 'formula' | 'cask' | 'tap' }>;
  upgraded: Array<{ name: string; from: string; to: string; type: 'formula' | 'cask' }>;
  downgraded: Array<{ name: string; from: string; to: string; type: 'formula' | 'cask' }>;
}

// Temporary — replaced in Phase 2 when brewfile module is implemented
interface BrewfileSchema {
  formulae: Array<{ name: string; version?: string }>;
  casks: Array<{ name: string; version?: string }>;
  taps: string[];
  strictMode?: boolean;
}

/** Compare two Homebrew version strings segment by segment.
 *  Returns positive if a > b, negative if a < b, 0 if equal.
 *
 *  Handles Homebrew-specific formats: `1.2.3_1` (revision suffix),
 *  date-based (`2024.05.20`), and alpha/rc segments compared lexically
 *  when they cannot be parsed as integers.
 */
function compareVersions(a: string, b: string): number {
  // Split on `.` to get segments; within each segment handle `_N` revision.
  const splitSegment = (seg: string): [number, number] => {
    const underIdx = seg.indexOf('_');
    if (underIdx !== -1) {
      const main = parseInt(seg.slice(0, underIdx), 10);
      const rev = parseInt(seg.slice(underIdx + 1), 10);
      return [isNaN(main) ? -1 : main, isNaN(rev) ? 0 : rev];
    }
    const n = parseInt(seg, 10);
    return [isNaN(n) ? -1 : n, 0];
  };

  const aParts = a.split('.');
  const bParts = b.split('.');
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aSeg = aParts[i] ?? '0';
    const bSeg = bParts[i] ?? '0';

    const [aMain, aRev] = splitSegment(aSeg);
    const [bMain, bRev] = splitSegment(bSeg);

    // Fall back to lexical comparison when segments are non-numeric on both sides
    if (aMain === -1 && bMain === -1) {
      const cmp = aSeg.localeCompare(bSeg);
      if (cmp !== 0) return cmp;
      continue;
    }
    // Treat non-numeric as lower than any numeric
    const aVal = aMain === -1 ? -1 : aMain;
    const bVal = bMain === -1 ? -1 : bMain;

    if (aVal !== bVal) return aVal - bVal;
    if (aRev !== bRev) return aRev - bRev;
  }

  return 0;
}

function diffPackages<T extends { name: string; version: string }>(
  base: T[],
  current: T[],
  type: 'formula' | 'cask',
  result: BrewDiff,
): void {
  const baseMap = new Map(base.map((p) => [p.name, p.version]));
  const currentMap = new Map(current.map((p) => [p.name, p.version]));

  for (const [name, version] of currentMap) {
    if (!baseMap.has(name)) {
      result.added.push({ name, version, type });
    } else {
      const baseVersion = baseMap.get(name)!;
      if (version !== baseVersion) {
        const cmp = compareVersions(version, baseVersion);
        if (cmp > 0) {
          result.upgraded.push({ name, from: baseVersion, to: version, type });
        } else {
          result.downgraded.push({ name, from: baseVersion, to: version, type });
        }
      }
    }
  }

  for (const [name, version] of baseMap) {
    if (!currentMap.has(name)) {
      result.removed.push({ name, version, type });
    }
  }
}

export function diffSnapshots(base: BrewSnapshot, current: BrewSnapshot): BrewDiff {
  const result: BrewDiff = { added: [], removed: [], upgraded: [], downgraded: [] };

  diffPackages(base.formulae, current.formulae, 'formula', result);
  diffPackages(base.casks, current.casks, 'cask', result);

  const baseSet = new Set(base.taps);
  const currentSet = new Set(current.taps);

  for (const tap of currentSet) {
    if (!baseSet.has(tap)) result.added.push({ name: tap, version: '', type: 'tap' });
  }
  for (const tap of baseSet) {
    if (!currentSet.has(tap)) result.removed.push({ name: tap, version: '', type: 'tap' });
  }

  return result;
}

/** Compare a desired Brewfile schema against the actual installed snapshot.
 *
 *  - Packages in desired but not in actual → added
 *  - Packages in actual but not in desired → removed (only when strictMode=true)
 *  - Packages in both, desired.version defined and differs from actual → upgraded/downgraded
 *  - Taps follow the same logic (no version concept)
 */
export function diffDesiredActual(desired: BrewfileSchema, actual: BrewSnapshot): BrewDiff {
  const result: BrewDiff = { added: [], removed: [], upgraded: [], downgraded: [] };
  const strict = desired.strictMode === true;

  function processPackages(
    desiredPkgs: Array<{ name: string; version?: string }>,
    actualPkgs: Array<{ name: string; version: string }>,
    type: 'formula' | 'cask',
  ): void {
    const actualMap = new Map(actualPkgs.map((p) => [p.name, p.version]));
    const desiredNames = new Set(desiredPkgs.map((p) => p.name));

    for (const pkg of desiredPkgs) {
      const actualVersion = actualMap.get(pkg.name);
      if (actualVersion === undefined) {
        // Package missing from actual — mark as added (needs to be installed)
        result.added.push({ name: pkg.name, version: pkg.version ?? '', type });
      } else if (pkg.version !== undefined && pkg.version !== actualVersion) {
        const cmp = compareVersions(pkg.version, actualVersion);
        if (cmp > 0) {
          result.upgraded.push({ name: pkg.name, from: actualVersion, to: pkg.version, type });
        } else {
          result.downgraded.push({ name: pkg.name, from: actualVersion, to: pkg.version, type });
        }
      }
    }

    if (strict) {
      for (const pkg of actualPkgs) {
        if (!desiredNames.has(pkg.name)) {
          // Extra package in actual not in desired — mark as removed (violation)
          result.removed.push({ name: pkg.name, version: pkg.version, type });
        }
      }
    }
  }

  processPackages(desired.formulae, actual.formulae, 'formula');
  processPackages(desired.casks, actual.casks, 'cask');

  // Taps
  const actualTapSet = new Set(actual.taps);
  const desiredTapSet = new Set(desired.taps);

  for (const tap of desiredTapSet) {
    if (!actualTapSet.has(tap)) {
      result.added.push({ name: tap, version: '', type: 'tap' });
    }
  }

  if (strict) {
    for (const tap of actualTapSet) {
      if (!desiredTapSet.has(tap)) {
        result.removed.push({ name: tap, version: '', type: 'tap' });
      }
    }
  }

  return result;
}
