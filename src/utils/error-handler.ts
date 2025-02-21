import { Context } from 'telegraf';

export class BotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
  }
}

export const handleError = (error: unknown, ctx?: Context) => {
  if (error instanceof BotError) {
    console.error(`[${error.code}] ${error.message}`, error.details);
    ctx?.reply(`Error: ${error.message}`).catch(console.error);
  } else {
    console.error('Unexpected error:', error);
    ctx?.reply('An unexpected error occurred').catch(console.error);
  }
};