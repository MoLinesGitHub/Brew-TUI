export interface BrewfileSchema {
  version: 1;
  meta: {
    name: string;
    description?: string;
    createdAt: string;   // ISO 8601
    updatedAt: string;   // ISO 8601
  };
  formulae: Array<{
    name: string;
    version?: string;    // pin a versión exacta; omitir = latest
    options?: string[];  // e.g. ["--with-debug"]
  }>;
  casks: Array<{
    name: string;
    version?: string;
  }>;
  taps: string[];
  strictMode?: boolean;  // si true, paquetes extra son violación
}

export interface DriftReport {
  diff: import('../diff-engine/diff.js').BrewDiff;
  score: number;        // 0-100, 100 = fully compliant
  missingPackages: string[];   // en desired, no en actual
  extraPackages: string[];     // en actual, no en desired (solo si strictMode)
  wrongVersions: Array<{ name: string; desired: string; actual: string }>;
}
