export interface LicenseData {
  key: string;
  instanceId: string;
  status: 'active' | 'expired' | 'inactive';
  customerEmail: string;
  customerName: string;
  plan: 'pro' | 'team';
  activatedAt: string;
  expiresAt: string | null;
  lastValidatedAt: string;
}

export interface LicenseFile {
  version: 1;
  license?: LicenseData | null; // legacy unencrypted
  hmac?: string; // legacy
  encrypted?: string; // AES-256-GCM encrypted license JSON
  iv?: string;
  tag?: string;
}

export type LicenseStatus = 'free' | 'pro' | 'team' | 'expired' | 'validating';

export interface PolarActivateResponse {
  activated: boolean;
  error: string | null;
  license_key: {
    id: number;
    status: string;
    key: string;
    activation_limit: number;
    activations_count: number;
    expires_at: string | null;
  };
  instance: { id: string };
  meta: { customer_name: string; customer_email: string };
}

export interface PolarValidateResponse {
  valid: boolean;
  error: string | null;
  license_key: {
    id: number;
    status: string;
    key: string;
    expires_at: string | null;
  };
  instance: { id: string };
}

export type ProFeatureId = 'profiles' | 'smart-cleanup' | 'history' | 'security-audit';
