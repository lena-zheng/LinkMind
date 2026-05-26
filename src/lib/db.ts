import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BriefingItem, KnowledgeItem, Language } from "./types";
import { DatabaseSync } from "node:sqlite";

const dbPath = join(process.cwd(), "data", "ai-briefing.sqlite");

type BriefingRow = {
  id: number;
  title: string;
  url: string;
  source: string;
  source_type: string;
  language: Language;
  category: string;
  tags: string;
  summary: string;
  image_url: string | null;
  published_at: string | null;
  fetched_at: string;
  digest_date: string;
  importance_score: number;
  is_favorite: number;
  knowledge_item_id: number | null;
};

type KnowledgeRow = {
  id: number;
  title: string;
  url: string;
  source: string;
  author: string | null;
  published_at: string | null;
  saved_at: string;
  language: Language;
  category: string;
  tags: string;
  summary: string;
  image_url: string | null;
  key_points: string;
  why_it_matters: string;
  use_cases: string;
  raw_content: string;
  ai_notes: string;
};

const globalForDb = globalThis as typeof globalThis & { aiBriefingDb?: DatabaseSync };

function getDatabase() {
  if (!globalForDb.aiBriefingDb) {
    mkdirSync(dirname(dbPath), { recursive: true });
    globalForDb.aiBriefingDb = new DatabaseSync(dbPath);
    globalForDb.aiBriefingDb.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS briefing_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'rss',
        language TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL,
        summary TEXT NOT NULL,
        image_url TEXT,
        published_at TEXT,
        fetched_at TEXT NOT NULL,
        digest_date TEXT NOT NULL,
        importance_score INTEGER NOT NULL DEFAULT 50,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        knowledge_item_id INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS knowledge_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        author TEXT,
        published_at TEXT,
        saved_at TEXT NOT NULL,
        language TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL,
        summary TEXT NOT NULL,
        image_url TEXT,
        key_points TEXT NOT NULL,
        why_it_matters TEXT NOT NULL,
        use_cases TEXT NOT NULL,
        raw_content TEXT NOT NULL,
        ai_notes TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_briefing_date ON briefing_items(digest_date);
      CREATE INDEX IF NOT EXISTS idx_knowledge_saved ON knowledge_items(saved_at);
    `);
  }

  ensureColumn(globalForDb.aiBriefingDb, "briefing_items", "image_url", "TEXT");
  ensureColumn(globalForDb.aiBriefingDb, "knowledge_items", "image_url", "TEXT");
  return globalForDb.aiBriefingDb;
}

const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function toBriefingItem(row: BriefingRow): BriefingItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    sourceType: row.source_type,
    language: row.language,
    category: row.category,
    tags: parseJson<string[]>(row.tags, []),
    summary: row.summary,
    imageUrl: row.image_url,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    digestDate: row.digest_date,
    importanceScore: row.importance_score,
    isFavorite: Boolean(row.is_favorite),
    knowledgeItemId: row.knowledge_item_id,
  };
}

function toKnowledgeItem(row: KnowledgeRow): KnowledgeItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    author: row.author,
    publishedAt: row.published_at,
    savedAt: row.saved_at,
    language: row.language,
    category: row.category,
    tags: parseJson<string[]>(row.tags, []),
    summary: row.summary,
    imageUrl: row.image_url,
    keyPoints: parseJson<string[]>(row.key_points, []),
    whyItMatters: row.why_it_matters,
    useCases: parseJson<string[]>(row.use_cases, []),
    rawContent: row.raw_content,
    aiNotes: row.ai_notes,
  };
}

export function todayInShanghai() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function upsertBriefingItems(
  items: Omit<BriefingItem, "id" | "isFavorite" | "knowledgeItemId">[],
) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO briefing_items
      (title, url, source, source_type, language, category, tags, summary, image_url, published_at, fetched_at, digest_date, importance_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(url) DO UPDATE SET
      title = excluded.title,
      source = excluded.source,
      source_type = excluded.source_type,
      language = excluded.language,
      category = excluded.category,
      tags = excluded.tags,
      summary = excluded.summary,
      image_url = excluded.image_url,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at,
      digest_date = excluded.digest_date,
      importance_score = excluded.importance_score
  `);

  let changed = 0;
  for (const item of items) {
    changed += stmt.run(
      item.title,
      item.url,
      item.source,
      item.sourceType,
      item.language,
      item.category,
      JSON.stringify(item.tags),
      item.summary,
      item.imageUrl,
      item.publishedAt,
      item.fetchedAt,
      item.digestDate,
      item.importanceScore,
    ).changes;
  }

  return changed;
}

export function listBriefingItems(options: {
  date?: string;
  language?: string;
  category?: string;
  limit?: number;
}) {
  const date = options.date || todayInShanghai();
  const rows = getDatabase()
    .prepare(
      `
      SELECT * FROM briefing_items
      WHERE digest_date = ?
        AND (? = 'all' OR language = ?)
        AND (? = 'all' OR category = ?)
      ORDER BY importance_score DESC, COALESCE(published_at, fetched_at) DESC
      LIMIT ?
    `,
    )
    .all(date, options.language || "all", options.language || "all", options.category || "all", options.category || "all", options.limit || 200) as BriefingRow[];

  return rows.map(toBriefingItem);
}

export function getBriefingItem(id: number) {
  const row = getDatabase().prepare("SELECT * FROM briefing_items WHERE id = ?").get(id) as BriefingRow | undefined;
  return row ? toBriefingItem(row) : null;
}

export function upsertKnowledgeItem(item: Omit<KnowledgeItem, "id">) {
  const result = getDatabase()
    .prepare(
      `
      INSERT INTO knowledge_items
        (title, url, source, author, published_at, saved_at, language, category, tags, summary, image_url, key_points, why_it_matters, use_cases, raw_content, ai_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        source = excluded.source,
        author = excluded.author,
        published_at = excluded.published_at,
        saved_at = excluded.saved_at,
        language = excluded.language,
        category = excluded.category,
        tags = excluded.tags,
        summary = excluded.summary,
        image_url = excluded.image_url,
        key_points = excluded.key_points,
        why_it_matters = excluded.why_it_matters,
        use_cases = excluded.use_cases,
        raw_content = excluded.raw_content,
        ai_notes = excluded.ai_notes
    `,
    )
    .run(
      item.title,
      item.url,
      item.source,
      item.author,
      item.publishedAt,
      item.savedAt,
      item.language,
      item.category,
      JSON.stringify(item.tags),
      item.summary,
      item.imageUrl,
      JSON.stringify(item.keyPoints),
      item.whyItMatters,
      JSON.stringify(item.useCases),
      item.rawContent,
      item.aiNotes,
    );

  const row = getDatabase().prepare("SELECT * FROM knowledge_items WHERE url = ?").get(item.url) as KnowledgeRow;
  return { id: Number(row.id || result.lastInsertRowid), item: toKnowledgeItem(row) };
}

export function markBriefingFavorite(briefingId: number, knowledgeItemId: number) {
  getDatabase()
    .prepare("UPDATE briefing_items SET is_favorite = 1, knowledge_item_id = ? WHERE id = ?")
    .run(knowledgeItemId, briefingId);
}

export function listKnowledgeItems(options: { q?: string; language?: string; category?: string; limit?: number }) {
  const q = `%${options.q || ""}%`;
  const rows = getDatabase()
    .prepare(
      `
      SELECT * FROM knowledge_items
      WHERE (? = '%%' OR title LIKE ? OR summary LIKE ? OR raw_content LIKE ? OR tags LIKE ?)
        AND (? = 'all' OR language = ?)
        AND (? = 'all' OR category = ?)
      ORDER BY saved_at DESC
      LIMIT ?
    `,
    )
    .all(q, q, q, q, q, options.language || "all", options.language || "all", options.category || "all", options.category || "all", options.limit || 200) as KnowledgeRow[];

  return rows.map(toKnowledgeItem);
}

export function getKnowledgeItem(id: number) {
  const row = getDatabase().prepare("SELECT * FROM knowledge_items WHERE id = ?").get(id) as KnowledgeRow | undefined;
  return row ? toKnowledgeItem(row) : null;
}
