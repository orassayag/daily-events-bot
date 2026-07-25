import { describe, it, expect, vi } from 'vitest';
import { DateUtils } from '../utils/index.js';

describe('DateUtils', () => {
  it('should return date info in correct format', () => {
    const info = DateUtils.getJerusalemDateInfo();

    // Check formattedDate (dd/MM/yyyy)
    expect(info.formattedDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);

    // Check fullDateWithDay (dd/MM/yyyy weekday.)
    expect(info.fullDateWithDay).toMatch(/^\d{2}\/\d{2}\/\d{4} .+\.$/);

    // Check year (yyyy)
    expect(info.year).toMatch(/^\d{4}$/);
  });

  it('should be closer to morning at 08:00 Jerusalem time', () => {
    vi.useFakeTimers();
    // 08:00 AM Jerusalem time. Using UTC to ensure consistency.
    // June is IDT (UTC+3)
    const date = new Date('2026-06-08T05:00:00Z'); // 08:00 IDT
    vi.setSystemTime(date);

    expect(DateUtils.isCloserToNight()).toBe(false);
    vi.useRealTimers();
  });

  it('should be closer to night at 17:00 Jerusalem time', () => {
    vi.useFakeTimers();
    // 17:00 Jerusalem time (14:00 UTC)
    const date = new Date('2026-06-08T14:00:00Z');
    vi.setSystemTime(date);

    expect(DateUtils.isCloserToNight()).toBe(true);
    vi.useRealTimers();
  });

  it('should be closer to morning at 01:00 Jerusalem time', () => {
    vi.useFakeTimers();
    const date = new Date('2026-06-08T22:00:00Z'); // 01:00 IDT
    vi.setSystemTime(date);

    expect(DateUtils.isCloserToNight()).toBe(false);
    vi.useRealTimers();
  });

  it('should be closer to night at 23:00 Jerusalem time', () => {
    vi.useFakeTimers();
    const date = new Date('2026-06-08T20:00:00Z'); // 23:00 IDT
    vi.setSystemTime(date);

    expect(DateUtils.isCloserToNight()).toBe(true);
    vi.useRealTimers();
  });

  it('should return the next 7 calendar dates starting from tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T05:00:00Z')); // 08/06/2026 Jerusalem

    expect(DateUtils.getUpcomingFormattedDates(7)).toEqual([
      '09/06/2026',
      '10/06/2026',
      '11/06/2026',
      '12/06/2026',
      '13/06/2026',
      '14/06/2026',
      '15/06/2026',
    ]);
    vi.useRealTimers();
  });

  it('should roll over across month and year boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-30T09:00:00Z')); // 30/12/2026 Jerusalem

    expect(DateUtils.getUpcomingFormattedDates(3)).toEqual([
      '31/12/2026',
      '01/01/2027',
      '02/01/2027',
    ]);
    vi.useRealTimers();
  });
});
