// Интерфейсы
export interface ChatMessage {
  text: string;
  timestamp: number;
  author: string;
  authorName: string;
  messageId: number;
  reactions: MessageReactions;
  replies: number;
}

export interface DigestCache {
  digest: string;
  timestamp: number;
  messageCount: number;
}

export interface CommandUsage {
  lastUsed: number;
}

export interface MessageReactions {
  [key: string]: number; // emoji: count
  total: number;
}

export interface UserActivity {
  messageCount: number;
  name: string;
  username: string;
}

// Константы
export const CACHE_LIFETIME = 5 * 60 * 1000; // 5 минут в миллисекундах
export const MAX_TOKENS = 3500;
export const DIGEST_COOLDOWN = 30 * 60 * 1000; // 30 минут в миллисекундах

// Системный промпт
export const systemPrompt = `Створи двомовний аналіз чату (українською та російською). Опиши:
- Контекст та розвиток розмови
- Взаємодію учасників
- Емоції та реакції
- Найбільш обговорювані повідомлення
- Цікаві цитати (у форматі "Автор: текст" Replies: Y)

📝 Аналіз чату (українською):
[Твій аналіз українською]

-------------------

📝 Анализ чата (на русском):
[Твой анализ на русском]

Важливо:
- Зберігай мову оригінальних цитат
- Уникай сухого переліку
- Створи живу розповідь про спілкування`;