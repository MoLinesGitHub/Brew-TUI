import type { ViewId } from '../types.js';

const PRO_VIEWS = new Set<ViewId>([
  'profiles',
  'smart-cleanup',
  'history',
  'rollback',
  'brewfile',
  'security-audit',
]);

export function isProView(viewId: ViewId): boolean {
  return PRO_VIEWS.has(viewId);
}
