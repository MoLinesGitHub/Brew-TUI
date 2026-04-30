import { describe, expect, it } from 'vitest';
import { isProView, isTeamView } from './feature-gate.js';
import type { ViewId } from '../types.js';

// These sets encode the freemium contract surfaced through the UI: every Pro
// view must be flagged Pro and every Team view must be flagged Team. A regression
// here silently grants free users access to a paid feature, so test the full
// matrix instead of a sample.

const FREE_VIEWS: ViewId[] = [
  'dashboard',
  'installed',
  'search',
  'outdated',
  'package-info',
  'services',
  'doctor',
  'account',
];

const PRO_VIEWS: ViewId[] = [
  'profiles',
  'smart-cleanup',
  'history',
  'rollback',
  'brewfile',
  'sync',
  'security-audit',
];

const TEAM_VIEWS: ViewId[] = ['compliance'];

describe('feature-gate: isProView', () => {
  it.each(PRO_VIEWS)('flags %s as Pro', (view) => {
    expect(isProView(view)).toBe(true);
  });

  it.each(FREE_VIEWS)('does not flag %s as Pro', (view) => {
    expect(isProView(view)).toBe(false);
  });

  it.each(TEAM_VIEWS)('does not flag Team view %s as Pro', (view) => {
    expect(isProView(view)).toBe(false);
  });
});

describe('feature-gate: isTeamView', () => {
  it.each(TEAM_VIEWS)('flags %s as Team', (view) => {
    expect(isTeamView(view)).toBe(true);
  });

  it.each([...PRO_VIEWS, ...FREE_VIEWS])('does not flag %s as Team', (view) => {
    expect(isTeamView(view)).toBe(false);
  });
});
