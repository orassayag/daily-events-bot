import { injectable, inject } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import { DateInfo, TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import { EMOJIS } from '../constants/index.js';
import { DateUtils } from '../utils/index.js';

const NEXT_WEEK_DAYS = 7;

/**
 * A day-block header in the main section: a date immediately followed by a single
 * weekday token ending in a period (e.g. `04/05/2026 שני.`). These are the date-item
 * titles the next-week scanner must ignore.
 */
const DATE_ITEM_TITLE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}\s+\S+\./;

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

    const lines = await this.readEventFileLines(year);

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
   * Scans the whole events document for any date that falls within the next 7 days
   * (Jerusalem time) and returns the referencing lines under a "NEXT WEEKS EVENTS"
   * section. Date-item title lines (the `dd/MM/yyyy <day>.` day-block headers in the
   * main section) are intentionally excluded — only dates scraped from inside a date
   * item's content or from outside the date items (the top section) are reported.
   */
  public async getNextWeekEvents(dateInfo: DateInfo): Promise<string> {
    const { year } = dateInfo;
    this.logger.debug('Scanning document for next-week events');

    const lines = await this.readEventFileLines(year);

    const upcomingDates = DateUtils.getUpcomingFormattedDates(NEXT_WEEK_DAYS);
    const upcomingDateSet = new Set(upcomingDates);

    const eventsSeparatorIndex = lines.findIndex((line) =>
      line.trim().includes('#EVENTS#')
    );

    const matchesByDate = new Map<string, string[]>();

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '' || trimmed.includes('#EVENTS#')) {
        continue;
      }
      if (trimmed.startsWith('===') || trimmed.startsWith('###')) {
        continue;
      }

      const inMainSection =
        eventsSeparatorIndex === -1 || i > eventsSeparatorIndex;
      if (inMainSection && DATE_ITEM_TITLE_PATTERN.test(trimmed)) {
        continue;
      }

      for (const canonicalDate of this.extractCanonicalDates(trimmed)) {
        if (!upcomingDateSet.has(canonicalDate)) {
          continue;
        }
        const existing = matchesByDate.get(canonicalDate) ?? [];
        if (!existing.includes(trimmed)) {
          existing.push(trimmed);
        }
        matchesByDate.set(canonicalDate, existing);
      }
    }

    const reportLines: string[] = [];
    const emittedLines = new Set<string>();
    for (const canonicalDate of upcomingDates) {
      const dateLines = matchesByDate.get(canonicalDate);
      if (!dateLines) {
        continue;
      }
      for (const dateLine of dateLines) {
        if (!emittedLines.has(dateLine)) {
          emittedLines.add(dateLine);
          reportLines.push(dateLine);
        }
      }
    }

    if (reportLines.length === 0) {
      this.logger.debug('No next-week events found');
      return '';
    }

    this.logger.info(
      `${EMOJIS.DATA.DATE} Found ${reportLines.length} next-week event line(s)`
    );
    return `\nNEXT WEEKS EVENTS:\n${reportLines.join('\n')}`;
  }

  /**
   * Resolves the single `event-dates-<year>.txt` file in the daily folder and returns
   * its lines. Throws if the folder is missing, or no/multiple matching files exist.
   */
  private async readEventFileLines(year: string): Promise<string[]> {
    try {
      await fs.access(this.folderPath);
    } catch {
      const error = new Error(`Folder not found: ${this.folderPath}`);
      this.logger.error('Events folder access failed', error);
      throw error;
    }

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

    const filePath = path.join(this.folderPath, matchingFiles[0]);
    this.logger.debug(`Reading events from: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split(/\r?\n/);
  }

  /**
   * Extracts every `dd/MM/yyyy` (or `d/M/yy`) date token from a line and returns each as
   * a canonical zero-padded `dd/MM/yyyy` string. Tokens embedded in a longer number are
   * ignored via the digit/slash boundaries, and out-of-range day/month values are dropped.
   */
  private extractCanonicalDates(line: string): string[] {
    const rawDates = line.match(
      /(?<![\d/])\d{1,2}\/\d{1,2}\/\d{2,4}(?![\d/])/g
    );
    if (!rawDates) {
      return [];
    }

    const canonicalDates: string[] = [];
    for (const rawDate of rawDates) {
      const [rawDay, rawMonth, rawYear] = rawDate.split('/');
      const day = parseInt(rawDay, 10);
      const month = parseInt(rawMonth, 10);
      if (day < 1 || day > 31 || month < 1 || month > 12) {
        continue;
      }
      const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
      canonicalDates.push(
        `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      );
    }
    return canonicalDates;
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
