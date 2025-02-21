export const config = {
  bot: {
    token: process.env.TELEGRAM_BOT_TOKEN!,
    webhookPath: process.env.WEBHOOK_PATH || '/webhook',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-3.5-turbo',
    maxTokens: 3500,
    temperature: 0.7,
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '0.0.0.0',
  },
  cache: {
    lifetime: 5 * 60 * 1000,
    digestCooldown: 30 * 60 * 1000,
  },
};