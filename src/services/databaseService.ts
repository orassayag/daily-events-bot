import { injectable, inject } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/index.js';

export interface SentRecord {
  date: string;
  timestamp: number;
}

interface DbData {
  sent: (string | SentRecord)[];
}

@injectable()
export class DatabaseService {
  private dbPath: string = '';

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.logger.setContext('DatabaseService');
  }

  public init(dbPath: string): void {
    this.dbPath = dbPath;
    this.logger.debug('DatabaseService initialized', { dbPath: this.dbPath });
  }

  /**
   * Gets all sent records for a specific date.
   */
  public async getSentRecords(date: string): Promise<SentRecord[]> {
    this.logger.debug(`Getting sent records for date: ${date}`);
    const data = await this.readDb();

    return data.sent.filter(
      (record): record is SentRecord =>
        typeof record !== 'string' && record.date === date
    );
  }

  /**
   * Checks if a date has already been recorded as sent (legacy support).
   */
  public async isDateSent(date: string): Promise<boolean> {
    this.logger.debug(`Checking if date is already sent (legacy): ${date}`);
    const data = await this.readDb();
    const isSent = data.sent.some((record) =>
      typeof record === 'string' ? record === date : record.date === date
    );
    this.logger.debug(`Is date sent: ${isSent}`);
    return isSent;
  }

  /**
   * Adds a date to the sent list with current timestamp.
   */
  public async markDateAsSent(date: string): Promise<void> {
    const timestamp = Date.now();
    this.logger.debug(`Marking date as sent: ${date} at ${timestamp}`);
    const data = await this.readDb();

    data.sent.push({ date, timestamp });
    await this.writeDb(data);

    this.logger.info(
      `${EMOJIS.DATA.DATABASE} Date ${date} marked as sent at ${new Date(timestamp).toISOString()}`
    );
  }

  private async readDb(): Promise<DbData> {
    try {
      this.logger.debug(`Reading database from: ${this.dbPath}`);
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      const content = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      this.logger.debug(
        'Database file not found or invalid, returning empty structure'
      );
      // If file doesn't exist or is invalid, return empty structure
      return { sent: [] };
    }
  }

  private async writeDb(data: DbData): Promise<void> {
    this.logger.debug(`Writing to database: ${this.dbPath}`);
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
