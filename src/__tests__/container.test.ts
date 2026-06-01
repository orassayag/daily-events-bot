import { describe, it, expect } from 'vitest';
import { container } from '../di/index.js';
import { TYPES } from '../types/index.js';
import { Logger } from '../logging/index.js';
import {
  TelegramService,
  EventFileService,
  DatabaseService,
} from '../services/index.js';
import { DailyEventsBot } from '../core/index.js';

describe('DI Container', () => {
  it('should have Logger bound and be a singleton', () => {
    const instance1 = container.get<Logger>(TYPES.Logger);
    const instance2 = container.get<Logger>(TYPES.Logger);

    expect(instance1).toBeInstanceOf(Logger);
    expect(instance1).toBe(instance2);
  });

  it('should have TelegramService bound and be a singleton', () => {
    const instance1 = container.get<TelegramService>(TYPES.TelegramService);
    const instance2 = container.get<TelegramService>(TYPES.TelegramService);

    expect(instance1).toBeInstanceOf(TelegramService);
    expect(instance1).toBe(instance2);
  });

  it('should have EventFileService bound and be a singleton', () => {
    const instance1 = container.get<EventFileService>(TYPES.EventFileService);
    const instance2 = container.get<EventFileService>(TYPES.EventFileService);

    expect(instance1).toBeInstanceOf(EventFileService);
    expect(instance1).toBe(instance2);
  });

  it('should have DatabaseService bound and be a singleton', () => {
    const instance1 = container.get<DatabaseService>(TYPES.DatabaseService);
    const instance2 = container.get<DatabaseService>(TYPES.DatabaseService);

    expect(instance1).toBeInstanceOf(DatabaseService);
    expect(instance1).toBe(instance2);
  });

  it('should have DailyEventsBot bound and be a singleton', () => {
    const instance1 = container.get<DailyEventsBot>(TYPES.DailyEventsBot);
    const instance2 = container.get<DailyEventsBot>(TYPES.DailyEventsBot);

    expect(instance1).toBeInstanceOf(DailyEventsBot);
    expect(instance1).toBe(instance2);
  });
});
