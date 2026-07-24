import type { Env } from './types';
import { parseMail } from './mail-parser';
import { loadWebhookConfigs, dispatchToWebhooks } from './webhooks';

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    let configs;
    try {
      configs = loadWebhookConfigs(env);
    } catch (err) {
      console.error('WEBHOOKS 配置解析失败：', err);
      return;
    }

    if (configs.length === 0) {
      console.warn('未配置任何 Webhook（WEBHOOKS 环境变量为空），邮件已忽略');
      return;
    }

    let mail;
    try {
      mail = await parseMail(message.raw);
    } catch (err) {
      console.error('邮件解析失败：', err);
      return;
    }

    await dispatchToWebhooks(configs, mail);
  },

  async fetch(): Promise<Response> {
    return new Response(
      'mail2feishu-worker 正在运行。\n请在 Cloudflare 控制台的 Email Routing 中，将目标地址的路由动作设置为 "发送到 Worker" 并选择本 Worker。',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  },
};
