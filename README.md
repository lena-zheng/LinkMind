# LinkMind

A personal web app for tracking AI news and building a curated knowledge base. It fetches English and Chinese AI updates, generates an in-app briefing, and turns saved links into organized knowledge cards.

## Features

- AI briefing: fetches updates from RSS feeds and web index pages.
- Save to knowledge base: saving a briefing item fetches the original article and organizes it into a knowledge card.
- Add links manually: paste a URL and the app extracts, summarizes, categorizes, and stores it.
- Knowledge base: search and filter by keyword, language, and category.
- Local storage: uses Node's built-in SQLite. Data is stored in `data/ai-briefing.sqlite`.
- Scheduled refresh: while the local server is running, it refreshes every day at 09:00 Asia/Shanghai time.

## Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI Organization

By default, the app uses built-in rules for summaries, categories, and tags. To improve organization quality with an OpenAI-compatible API, set:

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4.1-mini
# Optional: OPENAI_BASE_URL=https://api.openai.com
```

## Commands

```bash
npm run lint
npm run build
```
