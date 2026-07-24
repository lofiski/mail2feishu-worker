import type { ParsedMail, WebhookConfig } from '../types';

type GenericConfig = Extract<WebhookConfig, { type: 'generic' }>;

export async function sendGeneric(config: GenericConfig, mail: ParsedMail): Promise<void> {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers ?? {}),
    },
    body: JSON.stringify({
      subject: mail.subject,
      from: {
        name: mail.fromName,
        address: mail.fromAddress,
      },
      text: mail.text,
      date: mail.date,
    }),
  });

  if (!res.ok) {
    throw new Error(`通用 Webhook 请求失败：${res.status} ${await res.text()}`);
  }
}
