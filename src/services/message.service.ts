import { ChatMessage, MessageReactions } from '../utils/helper';

export class MessageService {
  private chatMessages: Record<string, ChatMessage[]> = {};

  addMessage(chatId: string, message: ChatMessage) {
    if (!this.chatMessages[chatId]) {
      this.chatMessages[chatId] = [];
    }
    this.chatMessages[chatId].push(message);
  }

  getMessages(chatId: string): ChatMessage[] {
    return this.chatMessages[chatId] || [];
  }

  updateReactions(chatId: string, messageId: number, reactions: MessageReactions) {
    const message = this.findMessage(chatId, messageId);
    if (message) {
      message.reactions = reactions;
    }
  }

  incrementReplies(chatId: string, messageId: number) {
    const message = this.findMessage(chatId, messageId);
    if (message) {
      message.replies++;
    }
  }

  private findMessage(chatId: string, messageId: number): ChatMessage | undefined {
    return this.chatMessages[chatId]?.find(msg => msg.messageId === messageId);
  }

  getActiveChats(): string[] {
    return Object.keys(this.chatMessages);
  }

  clearChat(chatId: string) {
    this.chatMessages[chatId] = [];
  }
}