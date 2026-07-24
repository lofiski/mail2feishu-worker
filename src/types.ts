export interface Env {
  /** JSON 数组字符串，每一项描述一个转发目标，详见 README */
  WEBHOOKS?: string;
}

export type WebhookConfig =
  | { type: 'feishu'; url: string; secret?: string }
  | {
      type: 'telegram';
      botToken: string;
      chatId: string | number;
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    }
  | { type: 'generic'; url: string; headers?: Record<string, string> };

export interface ParsedMail {
  subject: string;
  fromName: string;
  fromAddress: string;
  text: string;
  date?: string;
}
