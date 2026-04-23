import { hostname } from 'node:os';
import type { LemonSqueezyActivateResponse, LemonSqueezyValidateResponse } from './types.js';
import { fetchWithTimeout } from '../fetch-timeout.js';

const BASE_URL = 'https://api.polar.sh/v1/customer-portal/license-keys';

// ── CONFIGURE: Replace with your Polar organization ID ──
// Found at: polar.sh/dashboard → Settings → General
export const POLAR_ORGANIZATION_ID = 'b8f245c0-d116-4457-92fb-1bda47139f82';

// Layer 11: API URL validation
function validateApiUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new Error('HTTPS required for license API');
  }
  if (!parsed.hostname.endsWith('polar.sh')) {
    throw new Error('Invalid API host');
  }
}

// Raw Polar response shapes
interface PolarActivation {
  id: string; // activation_id
  license_key: {
    status: string;
    expires_at: string | null;
  };
}

interface PolarValidated {
  id: string;
  status: string; // 'granted' | 'revoked' | 'disabled'
  expires_at: string | null;
  customer: {
    email: string | null;
    name: string | null;
  };
  activation: { id: string } | null;
}

async function post<T>(endpoint: string, body: Record<string, unknown>, expectEmpty = false): Promise<T> {
  const url = `${BASE_URL}/${endpoint}`;
  validateApiUrl(url);

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 15_000);

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const errBody = await res.json() as { detail?: string; error?: string; message?: string };
      if (typeof errBody.detail === 'string') message = errBody.detail;
      else if (typeof errBody.error === 'string') message = errBody.error;
      else if (typeof errBody.message === 'string') message = errBody.message;
    } catch {
      // non-JSON error body — use generic message above
    }
    throw new Error(message);
  }

  if (expectEmpty || res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function activateLicense(key: string): Promise<LemonSqueezyActivateResponse> {
  const activation = await post<PolarActivation>('activate', {
    key,
    organization_id: POLAR_ORGANIZATION_ID,
    label: hostname(),
  });

  // Polar's activate response doesn't include customer info — fetch it via validate
  let customerEmail = '';
  let customerName = '';
  try {
    const validated = await post<PolarValidated>('validate', {
      key,
      organization_id: POLAR_ORGANIZATION_ID,
      activation_id: activation.id,
    });
    customerEmail = validated.customer?.email ?? '';
    customerName = validated.customer?.name ?? '';
  } catch {
    // customer info is non-critical — activation still succeeds
  }

  return {
    activated: true,
    error: null,
    instance: { id: activation.id },
    license_key: {
      id: 0,
      status: activation.license_key.status,
      key,
      activation_limit: 0,
      activations_count: 0,
      expires_at: activation.license_key.expires_at,
    },
    meta: { customer_email: customerEmail, customer_name: customerName },
  };
}

export async function validateLicense(key: string, instanceId: string): Promise<LemonSqueezyValidateResponse> {
  const res = await post<PolarValidated>('validate', {
    key,
    organization_id: POLAR_ORGANIZATION_ID,
    activation_id: instanceId,
  });

  const notExpired = res.expires_at === null || new Date(res.expires_at) > new Date();
  const valid = res.status === 'granted' && notExpired;

  return {
    valid,
    error: valid ? null : `License ${res.status}`,
    license_key: {
      id: 0,
      status: res.status,
      key,
      expires_at: res.expires_at,
    },
    instance: { id: instanceId },
  };
}

export async function deactivateLicense(key: string, instanceId: string): Promise<void> {
  await post<void>(
    'deactivate',
    { key, organization_id: POLAR_ORGANIZATION_ID, activation_id: instanceId },
    true,
  );
}
