import { Telegraf, Context } from 'telegraf';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
import * as cron from 'node-cron';
import {
  ChatMessage,
  DigestCache,
  CommandUsage,
  MessageReactions,
  CACHE_LIFETIME,
  MAX_TOKENS,
  DIGEST_COOLDOWN,
  systemPrompt
} from './utils';
import express from 'express';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Data storage
const chatMessages: Record<string, ChatMessage[]> = {};
const digestCache: Record<string, DigestCache> = {};
const commandUsage: Record<string, CommandUsage> = {};

const app = express();
const port = process.env.PORT || 3000;
const secretPath = `/webhook/${bot.secretPathComponent()}`;

app.use(express.json());

app.post(secretPath, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Command registration
bot.command('start', async (ctx) => {
  await ctx.reply('Hi! I\'m a chat analysis bot. Use commands:\n/digest - create chat analysis\n/status - get saved messages count');
});

bot.command('status', async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const messageCount = chatMessages[chatId]?.length || 0;
    await ctx.reply(`Number of saved messages: ${messageCount}`);
  } catch (error) {
    console.error('Error in status command:', error);
  }
});

bot.command('digest', async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const now = Date.now();

    // Check when the command was last used
    if (commandUsage[chatId]?.lastUsed &&
        now - commandUsage[chatId].lastUsed < DIGEST_COOLDOWN) {
      const minutesLeft = Math.ceil((DIGEST_COOLDOWN - (now - commandUsage[chatId].lastUsed)) / 60000);
      return await ctx.reply(`The command /digest can be used once every 30 minutes. Please wait another ${minutesLeft} minutes.`);
    }

    if (!chatMessages[chatId] || chatMessages[chatId].length === 0) {
      return await ctx.reply('There are no messages in the chat to create a chat analysis.');
    }

    await createDigest(ctx, chatId);

    // Update the last used time of the command
    commandUsage[chatId] = { lastUsed: now };
  } catch (error) {
    console.error('Error in digest command:', error);
  }
});

// Update reaction handler
bot.on('message_reaction', async (ctx) => {
  try {
    const chatId = ctx.chat.id.toString();
    const messageId = ctx.messageReaction.message_id;

    if (!chatMessages[chatId]) return;

    const message = chatMessages[chatId].find(msg => msg.messageId === messageId);
    if (message) {
      const reactions: MessageReactions = { total: 0 };

      // Process new reactions
      if (ctx.messageReaction.new_reaction) {
        ctx.messageReaction.new_reaction.forEach(reaction => {
          const emojiStr = 'type' in reaction && reaction.type === 'custom_emoji'
            ? reaction.custom_emoji_id
            : reaction.type;
          reactions[emojiStr] = (reactions[emojiStr] || 0) + 1;
          reactions.total++;
        });
      }

      // Process removed reactions
      if (ctx.messageReaction.old_reaction) {
        ctx.messageReaction.old_reaction.forEach(reaction => {
          const emojiStr = 'type' in reaction && reaction.type === 'custom_emoji'
            ? reaction.custom_emoji_id
            : reaction.type;
          if (reactions[emojiStr]) {
            reactions[emojiStr]--;
            reactions.total--;
            if (reactions[emojiStr] <= 0) {
              delete reactions[emojiStr];
            }
          }
        });
      }

      message.reactions = reactions;
    }
  } catch (error) {
    console.error('Error processing reaction:', error);
  }
});

// Add message reply handler
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;

  const chatId = ctx.chat.id.toString();
  if (!chatMessages[chatId]) {
    chatMessages[chatId] = [];
  }

  // Check replies
  if (ctx.message.reply_to_message) {
    const repliedMessage = chatMessages[chatId].find(
      msg => msg.messageId === ctx.message.reply_to_message?.message_id
    );
    if (repliedMessage) {
      repliedMessage.replies++;
    }
  }

  chatMessages[chatId].push({
    text: ctx.message.text,
    timestamp: ctx.message.date,
    author: ctx.message.from.username || 'anonymous',
    authorName: ctx.message.from.first_name || ctx.message.from.username || 'Аноним',
    messageId: ctx.message.message_id,
    reactions: { total: 0 },
    replies: 0
  });
});

// Update message formatting for digest
function formatMessagesForDigest(messages: ChatMessage[]): string {
  const sortedMessages = [...messages].sort((a, b) => {
    const aScore = a.reactions.total * 2 + a.replies;
    const bScore = b.reactions.total * 2 + b.replies;
    return bScore - aScore;
  });

  return sortedMessages
    .map(msg => {
      let info = '';
      if (msg.reactions.total > 0) {
        const reactionsList = Object.entries(msg.reactions)
          .filter(([key]) => key !== 'total')
          .map(([emoji, count]) => `${emoji}${count}`)
          .join('');
        info += ` | Reactions: ${reactionsList}`;
      }
      if (msg.replies > 0) {
        info += ` | Replies: ${msg.replies}`;
      }

      if (msg.reactions.total > 0 || msg.replies > 0) {
        return `${msg.authorName}: ${msg.text}${info}`;
      }
      return null;
    })
    .filter(msg => msg !== null)
    .join('\n');
}

// Create digest with caching
async function createDigest(ctx: Context, chatId: string) {
  const currentMessages = chatMessages[chatId];
  const cachedDigest = digestCache[chatId];

  // Check cache relevance
  if (cachedDigest &&
      Date.now() - cachedDigest.timestamp < CACHE_LIFETIME &&
      cachedDigest.messageCount === currentMessages.length) {
    return await ctx.reply('📝 Аналіз чату:\n\n' + cachedDigest.digest);
  }

  const messages = formatMessagesForDigest(currentMessages);

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: messages
      }
    ],
    temperature: 0.7,
    max_tokens: MAX_TOKENS,
  });

  const digest = response.choices[0].message.content;
  if (!digest) {
    throw new Error('Failed to create chat analysis');
  }

  // Save result to cache
  digestCache[chatId] = {
    digest,
    timestamp: Date.now(),
    messageCount: currentMessages.length
  };

  await ctx.reply('📝 Аналіз чату:\n\n' + digest);
}

// Daily digest
cron.schedule('0 20 * * *', async () => {
  for (const chatId in chatMessages) {
    if (chatMessages[chatId].length > 0) {
      try {
        const messages = formatMessagesForDigest(chatMessages[chatId]);
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: messages
            }
          ],
          temperature: 0.7,
          max_tokens: MAX_TOKENS,
        });

        const digest = response.choices[0].message.content;
        if (!digest) throw new Error('Failed to create chat analysis');

        await bot.telegram.sendMessage(chatId, '📝 Аналіз чату:\n\n' + digest);
        chatMessages[chatId] = []; // Clear history after analysis
        delete digestCache[chatId]; // Clear cache
      } catch (error) {
        console.error(`Error in daily chat analysis for chat ${chatId}:`, error);
      }
    }
  }
});

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
    console.error('Error starting bot:', error);
  }
}

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  await startBot();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));