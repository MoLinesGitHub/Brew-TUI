type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'warn';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => shouldLog('debug') && console.debug(`[DEBUG] ${msg}`, ctx || ''),
  info: (msg: string, ctx?: Record<string, unknown>) => shouldLog('info') && console.info(`[INFO] ${msg}`, ctx || ''),
  warn: (msg: string, ctx?: Record<string, unknown>) => shouldLog('warn') && console.warn(`[WARN] ${msg}`, ctx || ''),
  error: (msg: string, ctx?: Record<string, unknown>) => shouldLog('error') && console.error(`[ERROR] ${msg}`, ctx || ''),
};
