import type { ParsedMail, WebhookConfig } from '../types';

type FeishuConfig = Extract<WebhookConfig, { type: 'feishu' }>;

/**
 * 飞书自定义机器人的签名校验算法：
 * key = `${timestamp}\n${secret}`，对空字符串做 HMAC-SHA256 后 Base64 编码。
 * 参考：https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
 */
async function sign(secret: string, timestamp: number): Promise<string> {
  const stringToSign = `${timestamp}\n${secret}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(stringToSign),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new Uint8Array());
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function sendFeishu(config: FeishuConfig, mail: ParsedMail): Promise<void> {
  const from = mail.fromName ? `${mail.fromName} <${mail.fromAddress}>` : mail.fromAddress;
  const text = `📧 新邮件通知\n主题：${mail.subject}\n发件人：${from}\n\n${mail.text}`;

  const payload: Record<string, unknown> = {
    msg_type: 'text',
    content: { text },
  };

  if (config.secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    payload.timestamp = timestamp;
    payload.sign = await sign(config.secret, timestamp);
  }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`飞书 Webhook 请求失败：${res.status} ${await res.text()}`);
  }

  const result = await res.json<{ code?: number; msg?: string }>();
  if (result.code) {
    throw new Error(`飞书 Webhook 返回错误：code=${result.code} msg=${result.msg}`);
  }
}
