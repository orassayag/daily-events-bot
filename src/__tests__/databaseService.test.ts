import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseService } from '../services/databaseService.js';
import fs from 'fs/promises';
import path from 'path';
import 'reflect-metadata';

vi.mock('fs/promises');

describe('DatabaseService', () => {
  let service: DatabaseService;
  const dbPath = 'test/db/days.json';

  beforeEach(() => {
    service = new DatabaseService();
    service.init(dbPath);
    vi.clearAllMocks();
  });

  it('should return false if date is not in sent list', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ sent: ['2026-05-01'] }));
    
    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(false);
  });

  it('should return true if date is in sent list', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ sent: ['2026-05-04'] }));
    
    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(true);
  });

  it('should return false and handle error if file does not exist', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    
    const result = await service.isDateSent('2026-05-04');
    expect(result).toBe(false);
    expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(dbPath), { recursive: true });
  });

  it('should mark date as sent if not already present', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ sent: ['2026-05-01'] }));
    
    await service.markDateAsSent('2026-05-04');
    
    expect(fs.writeFile).toHaveBeenCalledWith(
      dbPath,
      expect.stringContaining('2026-05-04'),
      'utf-8'
    );
  });

  it('should not write to file if date is already marked as sent', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ sent: ['2026-05-04'] }));
    
    await service.markDateAsSent('2026-05-04');
    
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
