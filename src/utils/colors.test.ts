import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('colors / NO_COLOR', () => {
  const originalEnv = process.env['NO_COLOR'];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env['NO_COLOR'];
    else process.env['NO_COLOR'] = originalEnv;
    vi.resetModules();
  });

  it('returns the full hex palette when NO_COLOR is unset', async () => {
    delete process.env['NO_COLOR'];
    const { COLORS, NO_COLOR } = await import('./colors.js');
    expect(NO_COLOR).toBe(false);
    expect(COLORS.success).toBe('#22C55E');
    expect(COLORS.error).toBe('#EF4444');
    expect(COLORS.white).toBe('#FFFFFF');
  });

  it('returns empty strings for every token when NO_COLOR=1', async () => {
    process.env['NO_COLOR'] = '1';
    const { COLORS, NO_COLOR } = await import('./colors.js');
    expect(NO_COLOR).toBe(true);
    expect(COLORS.success).toBe('');
    expect(COLORS.error).toBe('');
    expect(COLORS.white).toBe('');
    expect(COLORS.brand).toBe('');
  });

  it('honours any non-empty NO_COLOR value (per spec)', async () => {
    process.env['NO_COLOR'] = 'true';
    const { NO_COLOR } = await import('./colors.js');
    expect(NO_COLOR).toBe(true);
  });

  it('treats empty NO_COLOR as not requested', async () => {
    process.env['NO_COLOR'] = '';
    const { NO_COLOR, COLORS } = await import('./colors.js');
    expect(NO_COLOR).toBe(false);
    expect(COLORS.success).toBe('#22C55E');
  });
});
