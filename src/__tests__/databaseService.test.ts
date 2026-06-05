import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '../services/index.js';
import fs from 'fs/promises';
import path from 'path';
import 'reflect-metadata';

vi.mock('fs/promises');

describe('DatabaseService', () => {
  let service: DatabaseService;
  const dbPath = 'test/db/days.json';
  let logger: any;

  beforeEach(() => {
    logger = {
      setContext: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    service = new DatabaseService(logger);
    service.init(dbPath);
    vi.clearAllMocks();
  });

  it('should return false if date is not in sent list', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ sent: [{ date: '2026-05-01', timestamp: 12345 }] })
    );

    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(false);
  });

  it('should return true if date is in sent list', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ sent: [{ date: '2026-05-04', timestamp: 12345 }] })
    );

    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(true);
  });

  it('should support legacy string format in isDateSent', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({ sent: ['2026-05-04'] })
    );

    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(true);
  });

  it('should get sent records for a specific date', async () => {
    const records = [
      { date: '2026-05-04', timestamp: 1000 },
      { date: '2026-05-04', timestamp: 2000 },
      { date: '2026-05-01', timestamp: 500 },
    ];
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ sent: records }));

    const result = await service.getSentRecords('2026-05-04');
    expect(result).toHaveLength(2);
    expect(result[0].timestamp).toBe(1000);
    expect(result[1].timestamp).toBe(2000);
  });

  it('should return false and handle error if file does not exist', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(false);
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(dbPath), {
      recursive: true,
    });
  });

  it('should mark date as sent', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ sent: [] }));

    await service.markDateAsSent('2026-05-04');

    expect(fs.writeFile).toHaveBeenCalledWith(
      dbPath,
      expect.stringContaining('"date": "2026-05-04"'),
      'utf-8'
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      dbPath,
      expect.stringContaining('"timestamp":'),
      'utf-8'
    );
  });
});
