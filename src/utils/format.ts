import { t } from '../i18n/index.js';

export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp || !isFinite(timestamp)) return t('time_justNow');
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 0) return t('time_justNow');
  if (diff < 60) return t('time_justNow');
  if (diff < 3600) return t('time_minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time_hoursAgo', { n: Math.floor(diff / 3600) });
  if (diff < 2592000) return t('time_daysAgo', { n: Math.floor(diff / 86400) });
  return t('time_monthsAgo', { n: Math.floor(diff / 2592000) });
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '\u2026';
}
