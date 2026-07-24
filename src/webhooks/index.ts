import type { Env, ParsedMail, WebhookConfig } from '../types';
import { sendFeishu } from './feishu';
import { sendTelegram } from './telegram';
import { sendGeneric } from './generic';

export function loadWebhookConfigs(env: Env): WebhookConfig[] {
  const raw = env.WEBHOOKS;

  if (raw === undefined || raw === null || raw === '') return [];

  let parsed: unknown;
  if (typeof raw === 'string') {
    if (!raw.trim()) return [];
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`WEBHOOKS 环境变量不是合法的 JSON：${(err as Error).message}`);
    }
  } else {
    // Cloudflare 控制台里变量类型选 "JSON" 时，env.WEBHOOKS 会被自动解析成数组，不再是字符串
    parsed = raw;
  }

  if (!Array.isArray(parsed)) {
    throw new Error('WEBHOOKS 环境变量必须是一个 JSON 数组');
  }

  return parsed as WebhookConfig[];
}

export async function dispatchToWebhooks(configs: WebhookConfig[], mail: ParsedMail): Promise<void> {
  const results = await Promise.allSettled(
    configs.map((config) => {
      switch (config.type) {
        case 'feishu':
          return sendFeishu(config, mail);
        case 'telegram':
          return sendTelegram(config, mail);
        case 'generic':
          return sendGeneric(config, mail);
        default:
          return Promise.reject(new Error(`未知的 Webhook 类型：${(config as { type: string }).type}`));
      }
    }),
  );

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Webhook #${i} (type=${configs[i]?.type}) 发送失败：`, result.reason);
    }
  });
}
