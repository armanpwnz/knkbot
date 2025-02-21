import { CACHE_LIFETIME, DigestCache } from '../utils/helper';

export class CacheService {
  private cache: Record<string, DigestCache> = {};

  setCache(chatId: string, digest: string, messageCount: number) {
    this.cache[chatId] = {
      digest,
      timestamp: Date.now(),
      messageCount
    };
  }

  getCache(chatId: string, currentMessageCount: number): string | null {
    const cached = this.cache[chatId];
    if (cached &&
        Date.now() - cached.timestamp < CACHE_LIFETIME &&
        cached.messageCount === currentMessageCount) {
      return cached.digest;
    }
    return null;
  }

  clearCache(chatId: string) {
    delete this.cache[chatId];
  }
}