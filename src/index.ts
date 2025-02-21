import { Telegraf } from 'telegraf';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as cron from 'node-cron';
import express from 'express';
import { config } from './config';
import { handleError, BotError } from './utils/error-handler';
import { MessageService } from './services/message.service';
import { CacheService } from './services/cache.service';
import { AnalysisService } from './services/analysis.service';
import { MessageReactions } from './utils/helper';

// Load environment variables first
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Initialize services
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const messageService = new MessageService();
const cacheService = new CacheService();
const analysisService = new AnalysisService(openai, messageService, cacheService);

// Express setup
const app = express();
const secretPath = `/webhook/${bot.secretPathComponent()}`;

app.use(express.json());
app.post(secretPath, (req, res) => bot.handleUpdate(req.body, res));

// Command handlers
bot.command('start', async (ctx) => {
  try {
    await ctx.reply('Hi! I\'m a chat analysis bot. Use commands:\n/digest - create chat analysis\n/status - get saved messages count');
  } catch (error) {
    handleError(error, ctx);
  }
});

bot.command('status', async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const messageCount = messageService.getMessages(chatId).length;
    await ctx.reply(`Number of saved messages: ${messageCount}`);
  } catch (error) {
    handleError(error, ctx);
  }
});

bot.command('digest', async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const messages = messageService.getMessages(chatId);

    if (!messages.length) {
      throw new BotError('There are no messages to analyze', 'NO_MESSAGES');
    }

    const digest = await analysisService.createAnalysis(chatId);
    await ctx.reply('📝 Аналіз чату:\n\n' + digest);
  } catch (error) {
    handleError(error, ctx);
  }
});

// Message handlers
bot.on('message_reaction', async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const messageId = ctx.messageReaction.message_id;

    const reactions: MessageReactions = { total: 0 };

    if (ctx.messageReaction.new_reaction) {
      ctx.messageReaction.new_reaction.forEach(reaction => {
        const emojiStr = 'type' in reaction && reaction.type === 'custom_emoji'
          ? reaction.custom_emoji_id
          : reaction.type;
        reactions[emojiStr] = (reactions[emojiStr] || 0) + 1;
        reactions.total++;
      });
    }

    messageService.updateReactions(chatId, messageId, reactions);
  } catch (error) {
    handleError(error);
  }
});

bot.on('text', async (ctx) => {
  try {
    if (ctx.message.text.startsWith('/')) return;

    const chatId = ctx.chat.id.toString();
    const message = {
      text: ctx.message.text,
      timestamp: ctx.message.date,
      author: ctx.message.from.username || 'anonymous',
      authorName: ctx.message.from.first_name || ctx.message.from.username || 'Anonymous',
      messageId: ctx.message.message_id,
      reactions: { total: 0 },
      replies: 0
    };

    if (ctx.message.reply_to_message) {
      messageService.incrementReplies(chatId, ctx.message.reply_to_message.message_id);
    }

    messageService.addMessage(chatId, message);
  } catch (error) {
    handleError(error);
  }
});

// Daily digest
cron.schedule('0 20 * * *', async () => {
  try {
    for (const chatId of messageService.getActiveChats()) {
      const messages = messageService.getMessages(chatId);
      if (messages.length > 0) {
        const digest = await analysisService.createAnalysis(chatId);
        await bot.telegram.sendMessage(chatId, '📝 Аналіз чату:\n\n' + digest);
        messageService.clearChat(chatId);
        cacheService.clearCache(chatId);
      }
    }
  } catch (error) {
    console.error('Error in daily digest:', error);
  }
});

// Startup
async function startBot() {
  try {
    if (process.env.NODE_ENV === 'production') {
      const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}${secretPath}`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log('Webhook set:', webhookUrl);
    } else {
      await bot.launch();
      console.log('Bot started in polling mode');
    }
  } catch (error) {
    handleError(error);
  }
}

app.listen(config.server.port, '0.0.0.0', async () => {
  console.log(`Server is running on port ${config.server.port}`);
  await startBot();
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));