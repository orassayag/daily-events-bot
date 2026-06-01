import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, LOG_CONFIG } from '../logging/index.js';
import { LogLevel } from '../types/index.js';
import { EMOJIS } from '../constants/index.js';
import { promises as fs } from 'fs';

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Logger', () => {
  let logger: Logger;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    logger = new Logger();
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Reset LOG_CONFIG to default values
    LOG_CONFIG.level = LogLevel.INFO;
    LOG_CONFIG.enableConsole = true;
    LOG_CONFIG.enableFile = true;

    vi.clearAllMocks();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it('should set context correctly', () => {
    logger.setContext('TestContext');
    logger.info('Test message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[TestContext]')
    );
  });

  it('should log debug messages when level is DEBUG', () => {
    LOG_CONFIG.level = LogLevel.DEBUG;
    logger.debug('Debug message');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]')
    );
  });

  it('should not log debug messages when level is INFO', () => {
    LOG_CONFIG.level = LogLevel.INFO;
    logger.debug('Debug message');
    expect(console.log).not.toHaveBeenCalled();
  });

  it('should log info messages', () => {
    LOG_CONFIG.level = LogLevel.INFO;
    logger.info('Info message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
  });

  it('should log warn messages with emoji', () => {
    logger.warn('Warn message');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(EMOJIS.STATUS.WARNING)
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Warn message')
    );
  });

  it('should not double emoji in warn messages', () => {
    logger.warn(`${EMOJIS.STATUS.WARNING} Already has emoji`);
    const call = vi.mocked(console.warn).mock.calls[0][0];
    const emojiCount = (
      call.match(new RegExp(EMOJIS.STATUS.WARNING, 'g')) || []
    ).length;
    expect(emojiCount).toBe(1);
  });

  it('should log error messages with emoji and error details', () => {
    const error = new Error('Test Error');
    error.stack = 'Test Stack';
    logger.error('Error message', error, { extra: 'data' });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(EMOJIS.STATUS.ERROR)
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error message')
    );
  });

  it('should write to file if enabled', async () => {
    LOG_CONFIG.enableFile = true;
    logger.info('File log message');

    // We need to wait for the microtask queue to process the file write
    await logger.flush();

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('app.log'),
      expect.stringContaining('File log message')
    );
  });

  it('should not write to file if disabled', async () => {
    LOG_CONFIG.enableFile = false;
    logger.info('No file log message');

    await logger.flush();

    expect(fs.appendFile).not.toHaveBeenCalled();
  });

  it('should handle file write errors gracefully', async () => {
    LOG_CONFIG.enableFile = true;
    vi.mocked(fs.appendFile).mockRejectedValueOnce(new Error('Write failed'));

    logger.info('Failing file log');
    await logger.flush();

    // The .catch on the promise might run after flush resolves, so wait a bit
    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        'Failed to write log to file:',
        expect.any(Error)
      );
    });
  });

  it('should not double emoji in error messages', () => {
    logger.error(`${EMOJIS.STATUS.ERROR} Already has emoji`, new Error('test'));
    const call = vi.mocked(console.error).mock.calls[0][0];
    const emojiCount = (call.match(new RegExp(EMOJIS.STATUS.ERROR, 'g')) || [])
      .length;
    expect(emojiCount).toBe(1);
  });

  it('should use default level INFO if config level is invalid', () => {
    (LOG_CONFIG as any).level = 'INVALID';
    logger.debug('Debug message');
    logger.info('Info message');
    expect(console.log).not.toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG]')
    );
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
  });

  it('should flush pending writes', async () => {
    LOG_CONFIG.enableFile = true;
    let resolveWrite: (value: void) => void;
    const writePromise = new Promise<void>((resolve) => {
      resolveWrite = resolve;
    });
    vi.mocked(fs.appendFile).mockReturnValue(writePromise as any);

    logger.info('Delayed write');
    const flushPromise = logger.flush();

    resolveWrite!(undefined);
    await flushPromise;

    expect(fs.appendFile).toHaveBeenCalled();
  });
});
