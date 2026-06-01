import { injectable, inject } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/index.js';

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
   * Checks if a date has already been recorded as sent.
   */
  public async isDateSent(date: string): Promise<boolean> {
    this.logger.debug(`Checking if date is already sent: ${date}`);
    const data = await this.readDb();
    const isSent = data.sent.includes(date);
    this.logger.debug(`Is date sent: ${isSent}`);
    return isSent;
  }

  /**
   * Adds a date to the sent list.
   */
  public async markDateAsSent(date: string): Promise<void> {
    this.logger.debug(`Marking date as sent: ${date}`);
    const data = await this.readDb();
    if (!data.sent.includes(date)) {
      data.sent.push(date);
      await this.writeDb(data);
      this.logger.info(
        `${EMOJIS.DATA.DATABASE} Date ${date} marked as sent in database`
      );
    } else {
      this.logger.debug(`Date ${date} was already marked as sent`);
    }
  }

  private async readDb(): Promise<{ sent: string[] }> {
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

  private async writeDb(data: { sent: string[] }): Promise<void> {
    this.logger.debug(`Writing to database: ${this.dbPath}`);
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
