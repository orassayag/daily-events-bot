export interface EnvConfig {
  BOT_USERNAME: string;
  TARGET_USERNAME: string;
  TOKEN: string;
  CHAT_ID: string;
}

export interface DateInfo {
  formattedDate: string;
  fullDateWithDay: string;
  year: string;
}

export interface TelegramBotInfo {
  ok: boolean;
  result: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
  description?: string;
}

export interface TelegramChatInfo {
  ok: boolean;
  result: {
    title?: string;
    username?: string;
  };
  description?: string;
}

export interface TelegramUpdatesResponse {
  ok: boolean;
  result: TelegramUpdate[];
  description?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
}

export interface TelegramMessage {
  text?: string;
  chat: {
    id: number;
    title?: string;
    username?: string;
  };
}
