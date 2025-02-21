# Chat Analysis Bot

A Telegram bot that creates bilingual chat analysis using OpenAI GPT.

## Features

- On-demand chat analysis
- Automatic daily analysis
- Tracking reactions and message replies
- Bilingual analysis (Ukrainian and Russian)
- Real-time message processing
- Caching system for optimized performance

## Installation

1. Clone the repository
2. Install dependencies (npm install)
3. Create a `.env` file with the following variables:

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENAI_API_KEY=your_openai_api_key

4. Start the bot (npm run dev)

## Usage

1. Start the bot using the command `/start`
2. Use the `/digest` command to create a chat analysis
3. Use the `/status` command to get the number of saved messages


## Production

The bot is configured to run on Render.com. It uses webhooks in production and polling in development mode.

### Environment Variables for Production

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Set to 'production'
- `RENDER_EXTERNAL_URL`: Your Render deployment URL

## Commands

- `/start` - Start the bot and see available commands
- `/digest` - Create a chat analysis (limited to once every 30 minutes)
- `/status` - Check the number of saved messages

## Technical Details

- Built with Node.js and TypeScript
- Uses Telegraf.js for Telegram Bot API
- OpenAI GPT-3.5 for analysis generation
- Express.js for webhook handling
- Automatic daily analysis at 20:00 UTC