import { injectable, inject } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { DateInfo, TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/index.js';

@injectable()
export class EventFileService {
  private folderPath: string = '';

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.logger.setContext('EventFileService');
  }

  public init(folderPath: string): void {
    this.folderPath = folderPath;
    this.logger.debug('EventFileService initialized', {
      folderPath: this.folderPath,
    });
  }

  /**
   * Reads the event-dates file and extracts the content for today.
   */
  public async getEventsForToday(dateInfo: DateInfo): Promise<string> {
    const { fullDateWithDay, year } = dateInfo;
    this.logger.debug(`Fetching events for: ${fullDateWithDay}`);

    // 5.1 Check folder existence
    try {
      await fs.access(this.folderPath);
    } catch {
      const error = new Error(`Folder not found: ${this.folderPath}`);
      this.logger.error('Events folder access failed', error);
      throw error;
    }

    // 6. Search for the file
    this.logger.debug(`Searching for events file in: ${this.folderPath}`);
    const files = await fs.readdir(this.folderPath);
    const pattern = `event-dates-${year}.txt`;
    const matchingFiles = files.filter((f) => f === pattern);

    if (matchingFiles.length === 0) {
      const error = new Error(`No file found matching pattern: ${pattern}`);
      this.logger.error('Events file not found', error);
      throw error;
    }
    if (matchingFiles.length > 1) {
      const error = new Error(
        `More than one file found matching pattern: ${pattern}`
      );
      this.logger.error('Multiple event files found', error);
      throw error;
    }

    // 7. Read the file
    const filePath = path.join(this.folderPath, matchingFiles[0]);
    this.logger.debug(`Reading events from: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    // 8. Search for today's date
    const startIndex = lines.findIndex((line) =>
      line.trim().startsWith(fullDateWithDay)
    );
    if (startIndex === -1) {
      const error = new Error(`Date "${fullDateWithDay}" not found in file.`);
      this.logger.error('Date not found in events file', error);
      throw error;
    }

    const allMatches = lines.filter((line) =>
      line.trim().startsWith(fullDateWithDay)
    );
    if (allMatches.length > 1) {
      const error = new Error(
        `Found more than 1 match for "${fullDateWithDay}" in file.`
      );
      this.logger.error('Ambiguous date in events file', error);
      throw error;
    }

    // 9. Extract lines until the separator
    this.logger.debug('Extracting event lines');
    const resultLines: string[] = [];
    resultLines.push(lines[startIndex]);

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for separator: at least 3 chars of # or =
      if (trimmed.startsWith('===') || trimmed.startsWith('###')) {
        break;
      }

      resultLines.push(line);
    }

    // Clean up empty lines at the end
    while (
      resultLines.length > 0 &&
      resultLines[resultLines.length - 1].trim() === ''
    ) {
      resultLines.pop();
    }

    this.logger.info(
      `${EMOJIS.DATA.FILE} Successfully extracted ${resultLines.length} lines of events`
    );
    return resultLines.join('\n');
  }
}
