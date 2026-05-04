import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelegramService } from '../services/telegramService.js';
import 'reflect-metadata';

describe('TelegramService', () => {
  let service: TelegramService;
  const token = 'test-token';
  const chatId = 'test-chat-id';

  beforeEach(() => {
    service = new TelegramService();
    service.init(token, chatId);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should validate chat successfully', async () => {
    const mockResponse = {
      ok: true,
      result: { title: 'test-user' },
    };

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as any);

    await expect(service.validateChat('test-user')).resolves.not.toThrow();
  });

  it('should validate bot successfully', async () => {
    const mockResponse = {
      ok: true,
      result: { username: 'test-bot' },
    };

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as any);

    await expect(service.validateBot('test-bot')).resolves.not.toThrow();
  });

  it('should throw error when bot validation fails', async () => {
    const mockResponse = {
      ok: true,
      result: { username: 'wrong-bot' },
    };

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as any);

    await expect(service.validateBot('test-bot')).rejects.toThrow(
      'Bot validation failed',
    );
  });

  it('should throw error when chat validation fails', async () => {
    const mockResponse = {
      ok: true,
      result: { title: 'wrong-user' },
    };

    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    } as any);

    await expect(service.validateChat('test-user')).rejects.toThrow(
      'Chat validation failed',
    );
  });


  it('should send message successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    } as any);

    await service.sendMessage('test message');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('sendMessage'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test message')
      })
    );
  });

  it('should throw error when getMe fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: false, description: 'API Error' })
    } as any);

    await expect(service.validateBot('test-bot')).rejects.toThrow('Failed to get bot info: API Error');
  });

  it('should throw error when getChat fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      json: () => Promise.resolve({ ok: false, description: 'API Error' })
    } as any);

    await expect(service.validateChat('test-user')).rejects.toThrow('Failed to get chat info: API Error');
  });

  it('should throw error when sendMessage fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ ok: false, description: 'Send Error' })
    } as any);

    await expect(service.sendMessage('test message')).rejects.toThrow('Failed to send message: Send Error');
  });
});
