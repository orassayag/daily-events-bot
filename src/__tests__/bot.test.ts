import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DailyEventsBot } from '../core/index.js';
import {
  TelegramService,
  EventFileService,
  DatabaseService,
} from '../services/index.js';
import 'reflect-metadata';

describe('DailyEventsBot', () => {
  let bot: DailyEventsBot;
  let telegramService: TelegramService;
  let eventFileService: EventFileService;
  let databaseService: DatabaseService;
  let logger: any;

  beforeEach(() => {
    // We can get instances from the container or create new ones
    // For unit testing the bot, we should mock its dependencies
    logger = {
      setContext: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    telegramService = {
      init: vi.fn(),
      validateBot: vi.fn(),
      validateChat: vi.fn(),
      sendMessage: vi.fn(),
    } as any;

    eventFileService = {
      init: vi.fn(),
      getEventsForToday: vi.fn(),
    } as any;

    databaseService = {
      init: vi.fn(),
      isDateSent: vi.fn().mockResolvedValue(false),
      markDateAsSent: vi.fn(),
    } as any;

    process.env.BOT_USERNAME = 'test-bot';
    process.env.TARGET_USERNAME = 'test-target';
    process.env.TOKEN = 'test-token';
    process.env.CHAT_ID = 'test-chat-id';

    bot = new DailyEventsBot(
      telegramService,
      eventFileService,
      databaseService,
      logger
    );
  });

  it('should run the bot successfully', async () => {
    vi.mocked(eventFileService.getEventsForToday).mockResolvedValue(
      'Events text'
    );

    const result = await bot.run();

    expect(result).toBe(true);
    expect(databaseService.isDateSent).toHaveBeenCalled();
    expect(telegramService.validateBot).toHaveBeenCalledWith('test-bot');
    expect(telegramService.validateChat).toHaveBeenCalledWith('test-target');
    expect(eventFileService.getEventsForToday).toHaveBeenCalled();
    expect(telegramService.sendMessage).toHaveBeenCalledWith('Events text');
    expect(databaseService.markDateAsSent).toHaveBeenCalled();
  });

  it('should return false if message for today was already sent', async () => {
    vi.mocked(databaseService.isDateSent).mockResolvedValue(true);

    const result = await bot.run();

    expect(result).toBe(false);
    expect(telegramService.sendMessage).not.toHaveBeenCalled();
  });

  it('should throw error if environment variables are missing', () => {
    delete process.env.BOT_USERNAME;

    // The constructor calls validateEnv
    expect(() => {
      new DailyEventsBot(
        telegramService,
        eventFileService,
        databaseService,
        logger
      );
    }).toThrow(/Missing environment variables/);
  });

  it('should throw error if something fails', async () => {
    vi.mocked(telegramService.validateChat).mockRejectedValue(
      new Error('Failed')
    );

    await expect(bot.run()).rejects.toThrow('Failed');
  });
});
