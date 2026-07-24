import PostalMime from 'postal-mime';
import type { ParsedMail } from './types';

/** 单条消息正文的最大字符数，超出部分会被截断，避免超出各 Webhook 的消息长度限制 */
const MAX_BODY_LENGTH = 8000;

/**
 * 邮件只有 HTML 正文时的极简转纯文本处理：
 * postal-mime 已经处理好了字符编码（charset）与 quoted-printable/base64 解码，
 * 这里只需要去标签、还原少量 HTML 实体即可。
 */
function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
    .join('\n')
    .trim();
}

function truncate(text: string): string {
  if (text.length <= MAX_BODY_LENGTH) return text;
  return `${text.slice(0, MAX_BODY_LENGTH)}\n...(内容过长，已截断)`;
}

export async function parseMail(raw: ReadableStream<Uint8Array>): Promise<ParsedMail> {
  const email = await PostalMime.parse(raw);

  const bodyText = email.text?.trim()
    ? email.text.trim()
    : email.html
      ? htmlToText(email.html)
      : '(无正文内容)';

  return {
    subject: email.subject?.trim() || '(无主题)',
    fromName: email.from?.name?.trim() || '',
    fromAddress: email.from?.address?.trim() || '未知发件人',
    text: truncate(bodyText),
    date: email.date,
  };
}
