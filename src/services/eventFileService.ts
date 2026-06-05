import { injectable, inject } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { DateInfo, TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/index.js';

@injectable()
export class EventFileService {
  private folderPath: string = '';
  private actionsReportPath: string = '';
  private scanContactsReportPath: string = '';
  private backupReportPath: string = '';
  private projectsUpdatesReportPath: string = '';

  private readonly BOT_NAME_MAPPING: Record<string, string> = {
    'Node Watchdog': 'NodeWatchdog',
    'Contacts Scan Maintainer': 'ContactsScanner',
    'Backups Manager': 'BackupsManager',
    'Auto Packages Updater': 'A_PackagesUpdater',
    'Daily Events Bot': 'DailyEventsBot',
    'Sync Daily Documents': 'SyncDailyDocs',
    'Repos Scan Reporter': 'ReposReporter',
    'Global Package Updater': 'G_PackagesUpdater',
    'Series & Movies': 'Series&Movies',
  };

  constructor(@inject(TYPES.Logger) private logger: Logger) {
    this.logger.setContext('EventFileService');
  }

  public init(
    folderPath: string,
    actionsReportPath: string,
    scanContactsReportPath: string,
    backupReportPath: string,
    projectsUpdatesReportPath: string
  ): void {
    this.folderPath = folderPath;
    this.actionsReportPath = actionsReportPath;
    this.scanContactsReportPath = scanContactsReportPath;
    this.backupReportPath = backupReportPath;
    this.projectsUpdatesReportPath = projectsUpdatesReportPath;
    this.logger.debug('EventFileService initialized', {
      folderPath: this.folderPath,
      actionsReportPath: this.actionsReportPath,
      scanContactsReportPath: this.scanContactsReportPath,
      backupReportPath: this.backupReportPath,
      projectsUpdatesReportPath: this.projectsUpdatesReportPath,
    });
  }

  /**
   * Reads the event-dates file and extracts the content for today.
   */
  public async getEventsForToday(dateInfo: DateInfo): Promise<string> {
    const { fullDateWithDay, year, formattedDate } = dateInfo;
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

    // 8. Find #EVENTS# separator and scan top section
    const eventsSeparatorIndex = lines.findIndex((line) =>
      line.trim().includes('#EVENTS#')
    );
    const topSectionLines: string[] = [];

    if (eventsSeparatorIndex !== -1) {
      this.logger.debug('Scanning top section before #EVENTS#');
      const possibleDateFormats = this.getPossibleDateFormats(formattedDate);

      for (let i = 0; i < eventsSeparatorIndex; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        const matchingFormat = possibleDateFormats.find((format) =>
          trimmed.includes(format)
        );

        if (matchingFormat) {
          topSectionLines.push(line);
          // Check if subsequent lines are part of this event (e.g. start with '-')
          let j = i + 1;
          while (j < eventsSeparatorIndex) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            if (
              nextTrimmed.startsWith('-') &&
              !possibleDateFormats.some((f) => nextTrimmed.includes(f))
            ) {
              topSectionLines.push(nextLine);
              j++;
              i = j - 1; // Skip these lines in the outer loop
            } else if (nextTrimmed === '') {
              j++; // Skip empty lines but keep looking
            } else {
              break;
            }
          }
        }
      }
    }

    // 9. Search for today's date in the main section
    const startIndex = lines.findIndex(
      (line, index) =>
        index > eventsSeparatorIndex && line.trim().startsWith(fullDateWithDay)
    );
    if (startIndex === -1) {
      const error = new Error(`Date "${fullDateWithDay}" not found in file.`);
      this.logger.error('Date not found in events file', error);
      throw error;
    }

    const allMatches = lines.filter(
      (line, index) =>
        index > eventsSeparatorIndex && line.trim().startsWith(fullDateWithDay)
    );
    if (allMatches.length > 1) {
      const error = new Error(
        `Found more than 1 match for "${fullDateWithDay}" in file.`
      );
      this.logger.error('Ambiguous date in events file', error);
      throw error;
    }

    // 10. Extract lines until the separator
    this.logger.debug('Extracting event lines');
    const resultLines: string[] = [];
    resultLines.push(lines[startIndex]);

    // Add lines from top section right after the date title
    if (topSectionLines.length > 0) {
      resultLines.push(...topSectionLines);
    }

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

  /**
   * Reads the ACTIONS_REPORT.txt file and extracts the #FOR-BOT# section.
   */
  public async getActionsReport(): Promise<string> {
    this.logger.debug(
      `Fetching actions report from: ${this.actionsReportPath}`
    );

    const reportContent = await this.extractForBotSection(
      this.actionsReportPath
    );
    if (!reportContent) {
      return '';
    }

    return `\nTASKS:\n${reportContent}`;
  }

  /**
   * Reads additional report files and extracts the #FOR-BOT# section for each.
   */
  public async getTasksDetailsReport(): Promise<string> {
    this.logger.debug('Fetching tasks details reports');

    const reports = [
      { path: this.scanContactsReportPath, name: 'SCAN_CONTACTS_REPORT.txt' },
      { path: this.backupReportPath, name: 'BACKUP_REPORT.txt' },
      {
        path: this.projectsUpdatesReportPath,
        name: 'PROJECTS_UPDATES_REPORT.txt',
      },
    ];

    const sections: string[] = [];

    for (const report of reports) {
      const content = await this.extractForBotSection(report.path);
      if (content) {
        sections.push(`\n${report.name}\n${content}`);
      }
    }

    if (sections.length === 0) {
      return '';
    }

    return `\nTASKS-DETAILS:\n${sections.join('\n')}`;
  }

  /**
   * Helper to extract the #FOR-BOT# section from a file.
   */
  private async extractForBotSection(filePath: string): Promise<string> {
    try {
      await fs.access(filePath);
    } catch {
      this.logger.warn(`File not found at: ${filePath}. Skipping.`);
      return '';
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    const separator = '#FOR-BOT#';
    const separatorIndex = lines.lastIndexOf(separator);

    if (separatorIndex === -1) {
      this.logger.debug(`Separator "${separator}" not found in: ${filePath}`);
      return '';
    }

    // Extract everything after the separator
    const reportLines = lines.slice(separatorIndex + 1);

    // Clean up empty lines at the beginning and end
    while (reportLines.length > 0 && reportLines[0].trim() === '') {
      reportLines.shift();
    }
    while (
      reportLines.length > 0 &&
      reportLines[reportLines.length - 1].trim() === ''
    ) {
      reportLines.pop();
    }

    if (reportLines.length === 0) {
      return '';
    }

    // Replace long names with shorter versions
    const processedLines = reportLines.map((line) => {
      let updatedLine = line;
      for (const [longName, shortName] of Object.entries(
        this.BOT_NAME_MAPPING
      )) {
        updatedLine = updatedLine.split(longName).join(shortName);
      }
      return updatedLine;
    });

    return processedLines.join('\n');
  }

  /**
   * Generates possible date formats for matching in the top section.
   */
  private getPossibleDateFormats(formattedDate: string): string[] {
    const [dd, mm, yyyy] = formattedDate.split('/');
    const d = parseInt(dd, 10).toString();
    const m = parseInt(mm, 10).toString();
    const yy = yyyy.slice(-2);

    const formats = [
      `${dd}/${mm}/${yyyy}`,
      `${d}/${mm}/${yyyy}`,
      `${dd}/${m}/${yyyy}`,
      `${d}/${m}/${yyyy}`,
      `${dd}/${mm}/${yy}`,
      `${d}/${mm}/${yy}`,
      `${dd}/${m}/${yy}`,
      `${d}/${m}/${yy}`,
    ];

    return [...new Set(formats)];
  }
}
