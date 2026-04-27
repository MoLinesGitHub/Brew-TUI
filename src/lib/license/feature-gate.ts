import type { ViewId } from '../types.js';

const PRO_VIEWS = new Set<ViewId>([
  'profiles',
  'smart-cleanup',
  'history',
  'rollback',
  'brewfile',
  'sync',
  'security-audit',
]);

// Team-tier views — superset de Pro, requieren licencia Team (o Pro durante lanzamiento)
const TEAM_VIEWS = new Set<ViewId>(['compliance']);

export function isProView(viewId: ViewId): boolean {
  return PRO_VIEWS.has(viewId);
}

export function isTeamView(viewId: ViewId): boolean {
  return TEAM_VIEWS.has(viewId);
}
