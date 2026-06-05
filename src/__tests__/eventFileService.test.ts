import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventFileService } from '../services/index.js';
import fs from 'fs/promises';
import 'reflect-metadata';

vi.mock('fs/promises');

describe('EventFileService', () => {
  let service: EventFileService;
  const folderPath = 'test-folder';
  let logger: any;

  beforeEach(() => {
    logger = {
      setContext: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    service = new EventFileService(logger);
    service.init(folderPath, 'test-actions-report.txt');
    vi.clearAllMocks();
  });

  it('should extract actions report successfully', async () => {
    const mockContent = `
Some random content
#FOR-BOT#
Task 1 - 10:00
Task 2 - 11:00
`;

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(mockContent);

    const result = await service.getActionsReport();

    expect(result).toContain('TASKS:');
    expect(result).toContain('Task 1 - 10:00');
    expect(result).toContain('Task 2 - 11:00');
    expect(result).not.toContain('Some random content');
    expect(result).not.toContain('#FOR-BOT#');
  });

  it('should shorten names in actions report successfully', async () => {
    const mockContent = `
#FOR-BOT#
Node Watchdog = OK
Contacts Scan Maintainer = FAILED
Backups Manager = OK
Auto Packages Updater = OK
Daily Events Bot = OK
Sync Daily Documents = OK
Repos Scan Reporter = OK
Global Package Updater = OK
Series & Movies = OK
`;

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(mockContent);

    const result = await service.getActionsReport();

    expect(result).toContain('NodeWatchdog = OK');
    expect(result).toContain('ContactsScanner = FAILED');
    expect(result).toContain('BackupsManager = OK');
    expect(result).toContain('A_PackagesUpdater = OK');
    expect(result).toContain('DailyEventsBot = OK');
    expect(result).toContain('SyncDailyDocs = OK');
    expect(result).toContain('ReposReporter = OK');
    expect(result).toContain('G_PackagesUpdater = OK');
    expect(result).toContain('Series&Movies = OK');
  });

  it('should return empty string if actions report file not found', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

    const result = await service.getActionsReport();

    expect(result).toBe('');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Actions report file not found')
    );
  });

  it('should return empty string if separator not found in actions report', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue('No separator here');

    const result = await service.getActionsReport();

    expect(result).toBe('');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Separator "#FOR-BOT#" not found')
    );
  });

  it('should extract events for today successfully', async () => {
    const dateInfo = {
      formattedDate: '01/01/2024',
      fullDateWithDay: '01/01/2024 Monday.',
      year: '2024',
    };

    const mockFiles = ['event-dates-2024.txt'];
    const mockContent = `01/01/2024 Monday.\nTask 1\nTask 2\n===\nNext day`;

    vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
    vi.mocked(fs.readFile).mockResolvedValue(mockContent);
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await service.getEventsForToday(dateInfo);

    expect(result).toContain('01/01/2024 Monday.');
    expect(result).toContain('Task 1');
    expect(result).toContain('Task 2');
    expect(result).not.toContain('Next day');
  });

  it('should extract events from top section and main section', async () => {
    const dateInfo = {
      formattedDate: '02/02/2024',
      fullDateWithDay: '02/02/2024 Friday.',
      year: '2024',
    };

    const mockFiles = ['event-dates-2024.txt'];
    const mockContent = `
2/2/2024 Dummy top event 1
- Dummy subtitle for top event 1
02/2/2024 -Dummy top event 2
Dummy prefix 02/02/24
-Dummy top event 3 description

#EVENTS#

02/02/2024 Friday.
-Main task 1. *
-Main task 2 - Day 55. *
===
`;

    vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
    vi.mocked(fs.readFile).mockResolvedValue(mockContent);
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await service.getEventsForToday(dateInfo);

    const lines = result.split('\n');
    expect(lines[0]).toBe('02/02/2024 Friday.');
    expect(lines[1]).toBe('2/2/2024 Dummy top event 1');
    expect(lines[2]).toBe('- Dummy subtitle for top event 1');
    expect(lines[3]).toBe('02/2/2024 -Dummy top event 2');
    expect(lines[4]).toBe('Dummy prefix 02/02/24');
    expect(lines[5]).toBe('-Dummy top event 3 description');
    expect(lines[6]).toBe('-Main task 1. *');
    expect(lines[7]).toBe('-Main task 2 - Day 55. *');
  });

  it('should throw error if folder not found', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

    await expect(service.getEventsForToday({} as any)).rejects.toThrow(
      'Folder not found'
    );
  });

  it('should throw error if no file found matching year', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    await expect(
      service.getEventsForToday({ year: '2024' } as any)
    ).rejects.toThrow('No file found');
  });

  it('should throw error if more than one file found matching year', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([
      'event-dates-2024.txt',
      'event-dates-2024.txt',
    ] as any);

    await expect(
      service.getEventsForToday({ year: '2024' } as any)
    ).rejects.toThrow('More than one file found');
  });

  it('should throw error if date not found in file', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['event-dates-2024.txt'] as any);
    vi.mocked(fs.readFile).mockResolvedValue('Some other date\nTask 1');

    await expect(
      service.getEventsForToday({
        fullDateWithDay: '01/01/2024 Monday.',
        year: '2024',
      } as any)
    ).rejects.toThrow('not found in file');
  });

  it('should throw error if more than one match for date found in file', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['event-dates-2024.txt'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      '01/01/2024 Monday.\nTask 1\n01/01/2024 Monday.\nTask 2'
    );

    await expect(
      service.getEventsForToday({
        fullDateWithDay: '01/01/2024 Monday.',
        year: '2024',
      } as any)
    ).rejects.toThrow('Found more than 1 match');
  });
});
