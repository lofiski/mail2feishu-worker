import type { ParsedMail, WebhookConfig } from '../types';

type TelegramConfig = Extract<WebhookConfig, { type: 'telegram' }>;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendTelegram(config: TelegramConfig, mail: ParsedMail): Promise<void> {
  const from = mail.fromName ? `${mail.fromName} <${mail.fromAddress}>` : mail.fromAddress;
  const parseMode = config.parseMode ?? 'HTML';

  const text =
    parseMode === 'HTML'
      ? `📧 <b>新邮件通知</b>\n` +
        `<b>主题：</b>${escapeHtml(mail.subject)}\n` +
        `<b>发件人：</b>${escapeHtml(from)}\n\n` +
        `${escapeHtml(mail.text)}`
      : `📧 新邮件通知\n主题：${mail.subject}\n发件人：${from}\n\n${mail.text}`;

  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      parse_mode: parseMode,
    }),
  });

  if (!res.ok) {
    throw new Error(`Telegram Webhook 请求失败：${res.status} ${await res.text()}`);
  }
}
