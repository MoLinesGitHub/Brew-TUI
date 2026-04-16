import type { ViewId } from '../types.js';

const PRO_VIEWS = new Set<ViewId>([
  'profiles',
  'smart-cleanup',
  'history',
  'security-audit',
]);

export function isProView(viewId: ViewId): boolean {
  return PRO_VIEWS.has(viewId);
}

export function isFeatureUnlocked(viewId: ViewId, isPro: boolean): boolean {
  if (!isProView(viewId)) return true;
  return isPro;
}
