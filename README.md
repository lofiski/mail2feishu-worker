# mail2feishu-worker

Cloudflare Email Workers：接收 Cloudflare Email Routing 转发来的邮件，解析出**正文**和**发件人信息**，并推送到一个或多个 Webhook（飞书自定义机器人 / Telegram Bot / 任意通用 Webhook）。

## 功能

- 支持在环境变量中配置**多个**转发目标，类型可混合（飞书、Telegram、通用 Webhook）。
- 只提取邮件正文和发件人信息（含主题，方便识别邮件内容），忽略附件等其他信息。
- 使用 [postal-mime](https://github.com/postalsys/postal-mime) 解析原始邮件，自动处理字符编码（charset）、`quoted-printable` / `base64` 等编码方式，避免中文乱码。
- 正文过长会自动截断，避免超出各 IM 平台的消息长度限制。
- 某个 Webhook 发送失败不会影响其他 Webhook（并行发送，独立捕获错误）。

## 目录结构

```
src/
  index.ts           # Worker 入口：email() 处理邮件事件，fetch() 提供健康检查页
  mail-parser.ts      # 邮件解析（postal-mime），HTML 兜底转纯文本、长度截断
  types.ts             # 类型定义
  webhooks/
    index.ts           # 读取 WEBHOOKS 环境变量、按类型分发
    feishu.ts           # 飞书自定义机器人（支持可选签名校验）
    telegram.ts          # Telegram Bot sendMessage
    generic.ts            # 通用 Webhook（POST JSON）
```

## 环境变量配置：`WEBHOOKS`

所有转发目标统一配置在一个环境变量 `WEBHOOKS` 中，值为 JSON 数组字符串，每一项代表一个目标：

```json
[
  { "type": "feishu", "url": "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx", "secret": "可选，飞书机器人签名校验密钥" },
  { "type": "telegram", "botToken": "123456:ABC-DEF...", "chatId": "123456789", "parseMode": "HTML" },
  { "type": "generic", "url": "https://example.com/webhook", "headers": { "Authorization": "Bearer xxx" } }
]
```

字段说明：

| 类型 | 必填字段 | 可选字段 | 说明 |
| --- | --- | --- | --- |
| `feishu` | `url` | `secret` | `url` 为飞书自定义机器人 Webhook 地址；如果机器人开启了“签名校验”，把密钥填入 `secret` |
| `telegram` | `botToken`, `chatId` | `parseMode`（默认 `HTML`） | `botToken` 从 [@BotFather](https://t.me/BotFather) 获取；`chatId` 是接收消息的用户/群/频道 ID |
| `generic` | `url` | `headers` | 会以 `POST` 发送 JSON：`{ subject, from: { name, address }, text, date }`，可用于自建服务或其他不内置支持的平台 |

> `WEBHOOKS` 建议在 Cloudflare 控制台以 **Secret**（而非明文环境变量）方式配置，因为其中包含机器人密钥等敏感信息。

## 部署步骤

### 1. 推送到 GitHub

```bash
cd mail2feishu-worker
git init
git add .
git commit -m "init: mail2feishu-worker"
git branch -M main
git remote add origin <你的仓库地址>
git push -u origin main
```

### 2. 在 Cloudflare 控制台导入仓库

1. 进入 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Import a repository**，选择刚才推送的 GitHub 仓库。
2. 构建设置保持默认即可（本项目已包含 `wrangler.toml`，Cloudflare 会自动识别）。
3. 部署完成后，进入该 Worker → **Settings** → **Variables and Secrets**，新增一个 **Secret**：
   - Name: `WEBHOOKS`
   - Value: 上面示例的 JSON 数组（改成你自己的真实配置）
4. 保存后触发一次重新部署使变量生效。

### 3. 配置 Email Routing 把邮件转发到该 Worker

1. Cloudflare Dashboard → 选择你的域名 → **Email** → **Email Routing**。
2. 如果尚未启用，先按提示完成 MX 记录等配置。
3. 在 **Routing rules** 中添加规则（可以是某个具体地址，也可以是 Catch-all 地址）：
   - Action 选择 **Send to a Worker**
   - Worker 选择 `mail2feishu-worker`
4. 保存规则。此后发到该地址的邮件都会触发 Worker 的 `email()` 处理函数。

### 4. 验证

给配置好的邮箱地址发一封测试邮件，正常情况下几秒内飞书 / Telegram 就会收到一条包含主题、发件人、正文的消息。如果没收到，可以在 Cloudflare Dashboard 的 Worker → **Logs**（或 `wrangler tail`）中查看错误日志。

## 本地开发

```bash
npm install
cp .dev.vars.example .dev.vars   # 按需修改其中的 WEBHOOKS
npm run dev
```

邮件事件（`email()`）无法通过普通浏览器请求触发，建议直接用 `wrangler tail` 观察线上真实邮件的处理日志；也可以针对 `src/mail-parser.ts` / `src/webhooks/*.ts` 单独写脚本，用一份 `.eml` 测试文件调用 `PostalMime.parse()` 验证解析逻辑。

## 常用命令

```bash
npm run typecheck   # TypeScript 类型检查
npm run dev          # 本地开发（wrangler dev）
npm run deploy        # 手动部署（一般用不到，Git 导入后会自动部署）
```
