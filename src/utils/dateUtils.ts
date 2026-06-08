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
      year: 'numeric',
    }).format(now);

    return { formattedDate, fullDateWithDay, year };
  }

  /**
   * Checks if the current time in Jerusalem is closer to the morning (06:30) or the night (18:00).
   * @returns {boolean} True if closer to 18:00, false if closer to 06:30.
   */
  public static isCloserToNight(): boolean {
    const now = new Date();

    // Get current time in Jerusalem
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hours = parseInt(
      parts.find((p) => p.type === 'hour')?.value || '0',
      10
    );
    const minutes = parseInt(
      parts.find((p) => p.type === 'minute')?.value || '0',
      10
    );

    const currentMinutes = hours * 60 + minutes;
    const morningMinutes = 6 * 60 + 30; // 06:30
    const nightMinutes = 18 * 60; // 18:00

    const distToMorning = Math.abs(currentMinutes - morningMinutes);
    const distToNight = Math.abs(currentMinutes - nightMinutes);

    return distToNight < distToMorning;
  }
}
