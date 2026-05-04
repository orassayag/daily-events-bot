import { injectable } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { DateInfo } from '../types/index.js';

@injectable()
export class EventFileService {
  private folderPath: string = '';

  public init(folderPath: string): void {
    this.folderPath = folderPath;
  }

  /**
   * Reads the event-dates file and extracts the content for today.
   */
  public async getEventsForToday(dateInfo: DateInfo): Promise<string> {
    const { fullDateWithDay, year } = dateInfo;

    // 5.1 Check folder existence
    try {
      await fs.access(this.folderPath);
    } catch {
      throw new Error(`Folder not found: ${this.folderPath}`);
    }

    // 6. Search for the file
    const files = await fs.readdir(this.folderPath);
    const pattern = `event-dates-${year}.txt`;
    const matchingFiles = files.filter((f) => f === pattern);

    if (matchingFiles.length === 0) {
      throw new Error(`No file found matching pattern: ${pattern}`);
    }
    if (matchingFiles.length > 1) {
      throw new Error(`More than one file found matching pattern: ${pattern}`);
    }

    // 7. Read the file
    const filePath = path.join(this.folderPath, matchingFiles[0]);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    // 8. Search for today's date
    const startIndex = lines.findIndex((line) =>
      line.trim().startsWith(fullDateWithDay),
    );
    if (startIndex === -1) {
      throw new Error(`Date "${fullDateWithDay}" not found in file.`);
    }

    const allMatches = lines.filter((line) =>
      line.trim().startsWith(fullDateWithDay),
    );
    if (allMatches.length > 1) {
      throw new Error(
        `Found more than 1 match for "${fullDateWithDay}" in file.`,
      );
    }

    // 9. Extract lines until the separator
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

    return resultLines.join('\n');
  }
}
