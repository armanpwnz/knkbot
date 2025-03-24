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

export const CACHE_LIFETIME = 5 * 60 * 1000; // 5 minutes in milliseconds
export const MAX_TOKENS = 10000;
export const DIGEST_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

export const systemPrompt = `Ти - професійний аналітик чату. Створи структурований дайджест групової розмови.

1. 📊 ЗАГАЛЬНА СТАТИСТИКА:
- Кількість активних учасників
- Загальна кількість повідомлень
- Найактивніші учасники (топ-3)

2. 🎯 ОСНОВНІ ТЕМИ ТА ПІДСУМКИ:
- Виділи 3-5 головних тем обговорення
- Коротко підсумуй ключові моменти кожної теми
- Познач важливі рішення або висновки

3. 💬 НАЙЦІКАВІШІ МОМЕНТИ:
- Повідомлення з найбільшою кількістю реакцій
- Повідомлення, які викликали найактивніші обговорення
- Цікаві діалоги або дискусії

Формат виводу:
- Використовуй емодзі для візуального розділення
- Зберігай лаконічність (максимум 2-3 речення на кожен пункт)
- Додавай цитати важливих повідомлень за необхідності
`;