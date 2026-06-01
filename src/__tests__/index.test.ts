import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from 'vitest';
import { container } from '../di/index.js';
import { TYPES } from '../types/index.js';

// Mock the dependencies
vi.mock('../di/index.js', () => {
  const mockLogger = {
    setContext: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };
  const mockBot = {
    run: vi.fn(),
  };
  const mockContainer = {
    get: vi.fn((type) => {
      if (type === 'Logger' || type === TYPES?.Logger) return mockLogger;
      if (type === 'DailyEventsBot' || type === TYPES?.DailyEventsBot)
        return mockBot;
      return null;
    }),
  };
  return {
    container: mockContainer,
    TYPES: {
      Logger: 'Logger',
      DailyEventsBot: 'DailyEventsBot',
    },
  };
});

vi.mock('../utils/fetchUtils.js', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
}));

describe('index.ts', () => {
  let mockExit: any;
  let mockLogger: any;
  let mockBot: any;
  let main: any;

  beforeAll(async () => {
    vi.useFakeTimers();
    const mod = await import('../index.js');
    main = mod.main;
  });

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as any);
    mockLogger = container.get(TYPES.Logger);
    mockBot = container.get(TYPES.DailyEventsBot);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  it('should run the bot successfully on first attempt', async () => {
    mockBot.run.mockResolvedValue(undefined);

    try {
      await main();
    } catch (e: any) {
      if (!e.message.includes('process.exit(0)')) throw e;
    }

    expect(mockBot.run).toHaveBeenCalledTimes(1);
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should retry and eventually succeed', async () => {
    mockBot.run
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce(undefined);

    try {
      await main();
    } catch (e: any) {
      if (!e.message.includes('process.exit(0)')) throw e;
    }

    expect(mockBot.run).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Retry attempt 2/10...')
    );
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it('should exit with 1 after max retries exhausted', async () => {
    mockBot.run.mockRejectedValue(new Error('Persistent error'));

    try {
      await main();
    } catch (e: any) {
      if (!e.message.includes('process.exit(1)')) throw e;
    }

    expect(mockBot.run).toHaveBeenCalledTimes(10);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('All retry attempts exhausted.')
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
