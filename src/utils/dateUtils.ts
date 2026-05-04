import { DateInfo } from '../types/index.js';

export class DateUtils {
  /**
   * Gets the current date and day in Jerusalem time.
   */
  public static getJerusalemDateInfo(): DateInfo {
    const now = new Date();
    
    // Format for dd/MM/yyyy
    const dateFormatter = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    // Format for weekday (e.g., "שני")
    const weekdayFormatter = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long',
    });

    const formattedDate = dateFormatter.format(now).replace(/\./g, '/'); // Ensure / separator
    const weekday = weekdayFormatter.format(now).replace('יום ', '');
    const fullDateWithDay = `${formattedDate} ${weekday}.`;
    const year = new Intl.DateTimeFormat('en-US', { 
      timeZone: 'Asia/Jerusalem', 
      year: 'numeric' 
    }).format(now);

    return { formattedDate, fullDateWithDay, year };
  }
}
