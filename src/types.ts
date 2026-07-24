export interface Env {
  /**
   * 每一项描述一个转发目标，详见 README。
   * 在 Cloudflare 控制台把变量类型选成 "Text"/Secret 时，这里拿到的是 JSON 字符串；
   * 但如果选成 "JSON" 类型，Cloudflare 会自动解析好，这里拿到的会是数组本身。
   * 两种情况都要兼容。
   */
  WEBHOOKS?: string | WebhookConfig[];
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
