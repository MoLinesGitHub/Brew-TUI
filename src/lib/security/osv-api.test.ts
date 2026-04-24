import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock fetch-timeout
const mockFetch = vi.fn();
vi.mock('../fetch-timeout.js', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockFetch(...args),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('queryVulnerabilities (QA-008)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('returns vulnerabilities for a successful batch query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            vulns: [
              {
                id: 'CVE-2024-1234',
                summary: 'Test vulnerability',
                severity: [{ type: 'CVSS_V3', score: '7.5' }],
                affected: [],
                references: [{ url: 'https://example.com' }],
              },
            ],
          },
        ],
      }),
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    const result = await queryVulnerabilities([{ name: 'openssl', version: '3.0.0' }]);

    expect(result.size).toBe(1);
    expect(result.get('openssl')).toHaveLength(1);
    expect(result.get('openssl')![0]!.id).toBe('CVE-2024-1234');
    expect(result.get('openssl')![0]!.severity).toBe('HIGH');
  });

  it('returns empty map when no vulnerabilities found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ vulns: [] }] }),
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    const result = await queryVulnerabilities([{ name: 'safe-pkg', version: '1.0.0' }]);

    expect(result.size).toBe(0);
  });

  it('filters packages with empty versions (EP-007)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ vulns: [] }] }),
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    await queryVulnerabilities([
      { name: 'valid', version: '1.0.0' },
      { name: 'empty', version: '' },
      { name: 'whitespace', version: '  ' },
    ]);

    // Should only send query for 'valid' package
    const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body as string);
    expect(callBody.queries).toHaveLength(1);
    expect(callBody.queries[0].package.name).toBe('valid');
  });

  it('falls back to one-by-one on HTTP 400 with multiple packages (QA-008)', async () => {
    // The fallback condition is `res.status === 400 && queries.length > 1`
    // So we need at least 2 packages for the fallback to trigger.

    // First call: batch with 2 packages returns 400
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    // Second + third calls: individual queries succeed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ vulns: [{ id: 'CVE-2024-5678', summary: 'Test' }] }],
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ vulns: [] }],
      }),
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    const result = await queryVulnerabilities([
      { name: 'pkg1', version: '1.0.0' },
      { name: 'pkg2', version: '2.0.0' },
    ]);

    // Should have called fetch 3 times: batch(400) + individual(pkg1) + individual(pkg2)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.size).toBe(1);
    expect(result.has('pkg1')).toBe(true);
  });

  it('throws on HTTP 400 with single package (no fallback possible)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    await expect(
      queryVulnerabilities([{ name: 'pkg1', version: '1.0.0' }]),
    ).rejects.toThrow('OSV API error: 400');
  });

  it('throws on invalid response structure (EP-003)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ not_results: 'bad data' }),
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    await expect(
      queryVulnerabilities([{ name: 'pkg1', version: '1.0.0' }]),
    ).rejects.toThrow('Invalid OSV API response');
  });

  it('throws on HTTP 500 server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { queryVulnerabilities } = await import('./osv-api.js');
    await expect(
      queryVulnerabilities([{ name: 'pkg1', version: '1.0.0' }]),
    ).rejects.toThrow('OSV API error: 500');
  });

  it('skips all packages if all have empty versions', async () => {
    const { queryVulnerabilities } = await import('./osv-api.js');
    const result = await queryVulnerabilities([
      { name: 'a', version: '' },
      { name: 'b', version: '' },
    ]);

    expect(result.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
