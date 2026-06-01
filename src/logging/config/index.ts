import { LogLevel } from '../../types/index.js';

export const LOG_CONFIG = {
  level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  logDir: 'logs',
  maxFileSize: 10 * 1024 * 1024,
  logRetentionDays: 30,
  enableConsole: true,
  enableFile: true,
};
