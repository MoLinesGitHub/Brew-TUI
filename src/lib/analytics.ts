import { access, readFile, writeFile } from 'node:fs/promises';
import { ANALYTICS_CONSENT_PATH, ensureDataDirs } from './data-dir.js';
import { logger } from '../utils/logger.js';

// QA-008: minimum-viable analytics seam. The taxonomy is fixed here so callers
// cannot invent ad-hoc event names that drift over time. The runtime is a
// no-op until consent is granted AND a sink is registered, which keeps the
// default "you ship the binary, no data leaves the machine" promise.
//
// Two layers of guard:
//   1. Disk-persisted user consent (granted | denied | unknown)
//   2. An injected sink — if nobody attaches one, events vanish
// Both must be true to emit. Built-in: a debug sink that prints under LOG_LEVEL=debug.

export type AnalyticsEvent =
  | 'activation_started'
  | 'activation_completed'
  | 'activation_failed'
  | 'feature_viewed'
  | 'upgrade_prompt_shown'
  | 'upgrade_completed'
  | 'security_scan_started'
  | 'security_scan_completed'
  | 'profile_applied'
  | 'rollback_invoked';

export type ConsentStatus = 'granted' | 'denied' | 'unknown';

interface AnalyticsSink {
  track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void;
}

let cachedConsent: ConsentStatus | null = null;
let registeredSink: AnalyticsSink | null = null;

export async function getConsent(): Promise<ConsentStatus> {
  if (cachedConsent) return cachedConsent;
  try {
    await access(ANALYTICS_CONSENT_PATH);
    const raw = (await readFile(ANALYTICS_CONSENT_PATH, 'utf-8')).trim();
    if (raw === 'granted' || raw === 'denied') {
      cachedConsent = raw;
      return raw;
    }
  } catch { /* file absent → unknown */ }
  cachedConsent = 'unknown';
  return 'unknown';
}

export async function setConsent(status: 'granted' | 'denied'): Promise<void> {
  await ensureDataDirs();
  await writeFile(ANALYTICS_CONSENT_PATH, status, { encoding: 'utf-8', mode: 0o600 });
  cachedConsent = status;
}

export function registerSink(sink: AnalyticsSink): void {
  registeredSink = sink;
}

export function track(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>,
): void {
  // No await on getConsent — track() must be synchronous so call sites do not
  // turn into async functions just for telemetry. We read the cached value
  // and silently drop the event if consent has not been resolved yet.
  if (cachedConsent !== 'granted') return;
  if (!registeredSink) return;
  try {
    registeredSink.track(event, props);
  } catch (err) {
    logger.debug('analytics sink threw', { event, error: String(err) });
  }
}

export function _resetAnalyticsForTests(): void {
  cachedConsent = null;
  registeredSink = null;
}

// Debug sink, used when LOG_LEVEL=debug is set. Real backend integration
// (Plausible, PostHog, Sentry breadcrumbs, etc.) would replace this in a
// future PR — see QA-008 in the audit for the discussion of options.
export const debugSink: AnalyticsSink = {
  track(event, props) {
    logger.debug(`analytics: ${event}`, props ?? {});
  },
};
