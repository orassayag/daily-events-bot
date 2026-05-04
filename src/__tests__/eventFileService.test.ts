import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventFileService } from '../services/eventFileService.js';
import fs from 'fs/promises';
import 'reflect-metadata';

vi.mock('fs/promises');

describe('EventFileService', () => {
  let service: EventFileService;
  const folderPath = 'test-folder';

  beforeEach(() => {
    service = new EventFileService();
    service.init(folderPath);
    vi.clearAllMocks();
  });

  it('should extract events for today successfully', async () => {
    const dateInfo = {
      formattedDate: '04/05/2026',
      fullDateWithDay: '04/05/2026 שני.',
      year: '2026',
    };

    const mockFiles = ['event-dates-2026.txt'];
    const mockContent = `04/05/2026 שני.\nEvent 1\nEvent 2\n===\nNext day`;

    vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);
    vi.mocked(fs.readFile).mockResolvedValue(mockContent);
    vi.mocked(fs.access).mockResolvedValue(undefined);

    const result = await service.getEventsForToday(dateInfo);

    expect(result).toContain('04/05/2026 שני.');
    expect(result).toContain('Event 1');
    expect(result).toContain('Event 2');
    expect(result).not.toContain('Next day');
  });

  it('should throw error if folder not found', async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

    await expect(service.getEventsForToday({} as any)).rejects.toThrow(
      'Folder not found',
    );
  });

  it('should throw error if no file found matching year', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    await expect(
      service.getEventsForToday({ year: '2026' } as any),
    ).rejects.toThrow('No file found');
  });

  it('should throw error if more than one file found matching year', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([
      'event-dates-2026.txt',
      'event-dates-2026.txt',
    ] as any);

    await expect(
      service.getEventsForToday({ year: '2026' } as any),
    ).rejects.toThrow('More than one file found');
  });

  it('should throw error if date not found in file', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['event-dates-2026.txt'] as any);
    vi.mocked(fs.readFile).mockResolvedValue('Some other date\nEvent 1');

    await expect(
      service.getEventsForToday({
        fullDateWithDay: '04/05/2026 שני.',
        year: '2026',
      } as any),
    ).rejects.toThrow('not found in file');
  });

  it('should throw error if more than one match for date found in file', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue(['event-dates-2026.txt'] as any);
    vi.mocked(fs.readFile).mockResolvedValue(
      '04/05/2026 שני.\nEvent 1\n04/05/2026 שני.\nEvent 2',
    );

    await expect(
      service.getEventsForToday({
        fullDateWithDay: '04/05/2026 שני.',
        year: '2026',
      } as any),
    ).rejects.toThrow('Found more than 1 match');
  });
});
