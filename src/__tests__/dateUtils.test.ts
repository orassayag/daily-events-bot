import { describe, it, expect } from 'vitest';
import { DateUtils } from '../utils/dateUtils.js';

describe('DateUtils', () => {
  it('should return date info in correct format', () => {
    const info = DateUtils.getJerusalemDateInfo();
    
    // Check formattedDate (dd/MM/yyyy)
    expect(info.formattedDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    
    // Check fullDateWithDay (dd/MM/yyyy weekday.)
    expect(info.fullDateWithDay).toMatch(/^\d{2}\/\d{2}\/\d{4} .+\.$/);
    
    // Check year (yyyy)
    expect(info.year).toMatch(/^\d{4}$/);
    expect(info.year).toBe(new Date().getFullYear().toString());
  });
});
