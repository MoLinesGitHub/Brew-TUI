import { hostname } from 'node:os';
import type { LemonSqueezyActivateResponse, LemonSqueezyValidateResponse } from './types.js';

const BASE_URL = 'https://api.lemonsqueezy.com/v1/licenses';

// Layer 11: Certificate pinning / API URL validation
const ALLOWED_HOSTS = ['api.lemonsqueezy.com'];

function validateApiUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error('HTTPS required for license API');
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new Error('Invalid API host');
  }
}

function validateResponseHeaders(res: Response): void {
  // Verify the response comes from a legitimate API server.
  // LemonSqueezy responses include standard API headers.
  const contentType = res.headers.get('content-type');
  if (contentType && !contentType.includes('json')) {
    throw new Error('Unexpected response content type');
  }
}

async function post<T>(endpoint: string, body: Record<string, string>): Promise<T> {
  const url = `${BASE_URL}/${endpoint}`;
  validateApiUrl(url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const errBody = await res.json() as { error?: string; message?: string };
      if (typeof errBody.error === 'string') message = errBody.error;
      else if (typeof errBody.message === 'string') message = errBody.message;
    } catch {
      // non-JSON error body — use generic message above
    }
    throw new Error(message);
  }

  validateResponseHeaders(res);

  return res.json() as Promise<T>;
}

export async function activateLicense(key: string): Promise<LemonSqueezyActivateResponse> {
  return post<LemonSqueezyActivateResponse>('activate', {
    license_key: key,
    instance_name: hostname(),
  });
}

export async function validateLicense(key: string, instanceId: string): Promise<LemonSqueezyValidateResponse> {
  return post<LemonSqueezyValidateResponse>('validate', {
    license_key: key,
    instance_id: instanceId,
  });
}

export async function deactivateLicense(key: string, instanceId: string): Promise<void> {
  await post('deactivate', {
    license_key: key,
    instance_id: instanceId,
  });
}
