import { MessageService } from './message.service';
import { CacheService } from './cache.service';
import { systemPrompt, MAX_TOKENS, ChatMessage } from '../utils/helper';
import OpenAI from 'openai';

export class AnalysisService {
  constructor(
    private openai: OpenAI,
    private messageService: MessageService,
    private cacheService: CacheService
  ) {}

  async createAnalysis(chatId: string): Promise<string> {
    const messages = this.messageService.getMessages(chatId);
    const cachedDigest = this.cacheService.getCache(chatId, messages.length);

    if (cachedDigest) {
      return cachedDigest;
    }

    const formattedMessages = this.formatMessages(messages);
    const digest = await this.generateAnalysis(formattedMessages);

    this.cacheService.setCache(chatId, digest, messages.length);
    return digest;
  }

  private formatMessages(messages: ChatMessage[]): string {
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

  private async generateAnalysis(messages: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: messages }
      ],
      temperature: 0.7,
      max_tokens: MAX_TOKENS,
    });

    const digest = response.choices[0].message.content;
    if (!digest) {
      throw new Error('Failed to create chat analysis');
    }
    return digest;
  }
}