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

export const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes in milliseconds
export const MAX_TOKENS = 3500;
export const DIGEST_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

export const systemPrompt = `Створи двомовний аналіз чату (українською та російською). Опиши:
- Контекст та розвиток розмови
- Основні теми обговорення та їхній підсумок
- Взаємодію учасників (хто активно залучений, як змінювалася динаміка)
- Емоції та реакції (які моменти викликали найбільше обговорення)
- Найбільш обговорювані повідомлення
- Цікаві цитати у форматі:
  "Автор: текст"
  Replies: (якщо є цікаві відповіді)

[Твій аналіз українською]

-------------------

📝 Анализ чата (на русском):
[Твой анализ на русском]

📌 Важливо:
- Зберігай мову оригінальних цитат
- Уникай сухого переліку, пиши у стилі журналістського огляду або блогу
- Виділяй ключові теми та цікаві моменти у тексті`;