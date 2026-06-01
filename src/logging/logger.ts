import { promises as fs } from 'fs';
import { join } from 'path';
import { LogLevel, LogEntry } from '../types/index.js';
import { LOG_CONFIG } from './config/index.js';
import { EMOJIS } from '../constants/index.js';
import { injectable } from 'inversify';

@injectable()
export class Logger {
  private context: string = 'App';
  private pendingWrites: Set<Promise<void>> = new Set();

  setContext(context: string): void {
    this.context = context;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    const withEmoji = message.startsWith(EMOJIS.STATUS.WARNING)
      ? message
      : `${EMOJIS.STATUS.WARNING} ${message}`;
    this.log(LogLevel.WARN, withEmoji, data);
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    const withEmoji = message.startsWith(EMOJIS.STATUS.ERROR)
      ? message
      : `${EMOJIS.STATUS.ERROR} ${message}`;
    this.log(LogLevel.ERROR, withEmoji, {
      ...data,
      error: error?.message,
      stack: error?.stack,
    });
  }

  /**
   * Waits for all pending file writes to complete.
   */
  async flush(): Promise<void> {
    if (this.pendingWrites.size > 0) {
      await Promise.allSettled(Array.from(this.pendingWrites));
    }
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
    };

    if (LOG_CONFIG.enableConsole && this.shouldLog(level)) {
      const formattedMessage = `[${level.toUpperCase()}] [${this.context}] ${message}`;
      if (level === LogLevel.ERROR) {
        console.error(formattedMessage);
      } else if (level === LogLevel.WARN) {
        console.warn(formattedMessage);
      } else {
        console.log(formattedMessage);
      }
    }

    if (LOG_CONFIG.enableFile) {
      const writePromise = this.writeToFile(entry);
      this.pendingWrites.add(writePromise);
      writePromise
        .catch((err) => {
          console.error('Failed to write log to file:', err);
        })
        .finally(() => {
          this.pendingWrites.delete(writePromise);
        });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
    };
    const configLevel = LOG_CONFIG.level.toLowerCase() as LogLevel;
    const configLevelValue = levels[configLevel] ?? 1;
    return levels[level] >= configLevelValue;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    const logFilePath = join(process.cwd(), LOG_CONFIG.logDir, 'app.log');
    const logLine = JSON.stringify(entry) + '\n';
    await fs.mkdir(join(process.cwd(), LOG_CONFIG.logDir), {
      recursive: true,
    });
    await fs.appendFile(logFilePath, logLine);
  }
}
