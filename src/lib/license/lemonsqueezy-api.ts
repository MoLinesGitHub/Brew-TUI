import { hostname } from 'node:os';
import type { LemonSqueezyActivateResponse, LemonSqueezyValidateResponse } from './types.js';

const BASE_URL = 'https://api.lemonsqueezy.com/v1/licenses';

async function post<T>(endpoint: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json() as { error?: string; message?: string };
      if (typeof body.error === 'string') message = body.error;
      else if (typeof body.message === 'string') message = body.message;
    } catch {
      // non-JSON error body — use generic message above
    }
    throw new Error(message);
  }

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
