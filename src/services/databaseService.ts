import { injectable } from 'inversify';
import fs from 'fs/promises';
import path from 'path';

@injectable()
export class DatabaseService {
  private dbPath: string = '';

  public init(dbPath: string): void {
    this.dbPath = dbPath;
  }

  /**
   * Checks if a date has already been recorded as sent.
   */
  public async isDateSent(date: string): Promise<boolean> {
    const data = await this.readDb();
    return data.sent.includes(date);
  }

  /**
   * Adds a date to the sent list.
   */
  public async markDateAsSent(date: string): Promise<void> {
    const data = await this.readDb();
    if (!data.sent.includes(date)) {
      data.sent.push(date);
      await this.writeDb(data);
    }
  }

  private async readDb(): Promise<{ sent: string[] }> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      const content = await fs.readFile(this.dbPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty structure
      return { sent: [] };
    }
  }

  private async writeDb(data: { sent: string[] }): Promise<void> {
    await fs.writeFile(this.dbPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
