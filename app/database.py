"""Database models and initialization using aiosqlite.

Tables:
  - configs: General settings, personality, app preferences, tool switches, summary schedule
  - ai_models: Multiple AI model configurations (chat/terminal/summary/embedding)
  - conversations: Deprecated -- kept for migration, new messages go to conversation_cache
  - conversation_cache: Temporary local chat message cache (auto-summarized into memories)
  - memories: Structured memory entries with forgetting curve and summary source
  - persons: People referenced in conversations (for relationship graph)
  - relationships: Edges between persons
  - schedules: Daily schedule entries
  - commands: Command execution history (manual + AI tool)
  - kb_documents: Knowledge base uploaded documents
  - kb_chunks: Text chunks with embedding vectors for retrieval
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiosqlite

from app.config import DB_PATH

SCHEMA_SQL = """
-- General settings (personality, theme, language, tool switches, summary config)
CREATE TABLE IF NOT EXISTS configs (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '{}'
);

-- AI model configurations (multiple providers per purpose)
CREATE TABLE IF NOT EXISTS ai_models (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL DEFAULT '',           -- user-friendly name e.g. "GPT-4o"
    provider_url  TEXT NOT NULL DEFAULT '',
    api_key       TEXT NOT NULL DEFAULT '',
    model_name    TEXT NOT NULL DEFAULT '',
    temperature   REAL NOT NULL DEFAULT 0.8,
    max_tokens    INTEGER NOT NULL DEFAULT 2048,
    purpose       TEXT NOT NULL DEFAULT 'chat',        -- 'chat' | 'terminal' | 'summary' | 'embedding'
    is_default    INTEGER NOT NULL DEFAULT 0,          -- 1 if default for this purpose
    is_enabled    INTEGER NOT NULL DEFAULT 1,          -- 1 if active
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Legacy conversation table (kept for migration)
CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Temporary conversation cache (auto-summarized into memories periodically)
CREATE TABLE IF NOT EXISTS conversation_cache (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL DEFAULT 'default',  -- grouping key
    role            TEXT NOT NULL,                       -- 'user' | 'assistant' | 'system'
    content         TEXT NOT NULL,
    is_summarized   INTEGER NOT NULL DEFAULT 0,          -- 1 if already included in a summary
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Memories with forgetting curve and summary source tracking
CREATE TABLE IF NOT EXISTS memories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category        TEXT NOT NULL DEFAULT 'general',   -- general/person/event/feeling/plan/consolidation
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    importance      REAL NOT NULL DEFAULT 0.5,          -- 0.0-1.0
    summary_source  TEXT NOT NULL DEFAULT 'manual',     -- 'manual' | 'ai_summary' | 'imported'
    person_id       INTEGER REFERENCES persons(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    last_recalled   TEXT NOT NULL DEFAULT (datetime('now')),
    recall_count    INTEGER NOT NULL DEFAULT 0,
    ease_factor     REAL NOT NULL DEFAULT 2.5,          -- SM-2 algorithm ease factor
    interval        REAL NOT NULL DEFAULT 1.0,          -- days until next review
    next_review     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS persons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '#6366f1',
    icon        TEXT NOT NULL DEFAULT 'person',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS relationships (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_a_id INTEGER NOT NULL REFERENCES persons(id),
    person_b_id INTEGER NOT NULL REFERENCES persons(id),
    relation    TEXT NOT NULL DEFAULT 'friend',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(person_a_id, person_b_id)
);

CREATE TABLE IF NOT EXISTS schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL,            -- YYYY-MM-DD
    time        TEXT,                     -- HH:MM or NULL
    completed   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commands (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    command     TEXT NOT NULL,
    output      TEXT NOT NULL DEFAULT '',
    exit_code   INTEGER NOT NULL DEFAULT 0,
    source      TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'ai_tool'
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kb_documents (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    file_type   TEXT NOT NULL DEFAULT 'txt',
    file_size   INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kb_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content     TEXT NOT NULL,
    embedding   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cache_session ON conversation_cache(session_id);
CREATE INDEX IF NOT EXISTS idx_cache_unsummarized ON conversation_cache(is_summarized) WHERE is_summarized = 0;
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_person ON memories(person_id);
CREATE INDEX IF NOT EXISTS idx_memories_next_review ON memories(next_review);
"""


async def get_db() -> aiosqlite.Connection:
    """Open a new database connection."""
    db = await aiosqlite.connect(str(DB_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db() -> None:
    """Create all tables if they don't exist, and run migrations."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.executescript(SCHEMA_SQL)

        # Migration: add source column to commands if missing
        try:
            cursor = await db.execute("PRAGMA table_info(commands)")
            columns = [row[1] for row in await cursor.fetchall()]
            if "source" not in columns:
                await db.execute("ALTER TABLE commands ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
        except Exception:
            pass

        # Migration: add summary_source to memories if missing
        try:
            cursor = await db.execute("PRAGMA table_info(memories)")
            columns = [row[1] for row in await cursor.fetchall()]
            if "summary_source" not in columns:
                await db.execute("ALTER TABLE memories ADD COLUMN summary_source TEXT NOT NULL DEFAULT 'manual'")
        except Exception:
            pass

        # Migration: create conversation_cache if coming from old version
        try:
            cursor = await db.execute("PRAGMA table_info(conversation_cache)")
            rows = await cursor.fetchall()
            if not rows:
                await db.executescript("""
                    CREATE TABLE IF NOT EXISTS conversation_cache (
                        id              INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id      TEXT NOT NULL DEFAULT 'default',
                        role            TEXT NOT NULL,
                        content         TEXT NOT NULL,
                        is_summarized   INTEGER NOT NULL DEFAULT 0,
                        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
                    );
                    CREATE INDEX IF NOT EXISTS idx_cache_session ON conversation_cache(session_id);
                    CREATE INDEX IF NOT EXISTS idx_cache_unsummarized ON conversation_cache(is_summarized) WHERE is_summarized = 0;
                """)
        except Exception:
            pass

        # Migration: create ai_models if coming from old version
        try:
            cursor = await db.execute("PRAGMA table_info(ai_models)")
            rows = await cursor.fetchall()
            if not rows:
                await db.executescript("""
                    CREATE TABLE IF NOT EXISTS ai_models (
                        id            INTEGER PRIMARY KEY AUTOINCREMENT,
                        name          TEXT NOT NULL DEFAULT '',
                        provider_url  TEXT NOT NULL DEFAULT '',
                        api_key       TEXT NOT NULL DEFAULT '',
                        model_name    TEXT NOT NULL DEFAULT '',
                        temperature   REAL NOT NULL DEFAULT 0.8,
                        max_tokens    INTEGER NOT NULL DEFAULT 2048,
                        purpose       TEXT NOT NULL DEFAULT 'chat',
                        is_default    INTEGER NOT NULL DEFAULT 0,
                        is_enabled    INTEGER NOT NULL DEFAULT 1,
                        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
                    );
                """)
                # Migrate old single api_config into ai_models
                try:
                    config_cursor = await db.execute("SELECT value FROM configs WHERE key = 'api_config'")
                    row = await config_cursor.fetchone()
                    if row:
                        import json as _json
                        old_config = _json.loads(row[0])
                        if old_config.get("provider_url") or old_config.get("api_key"):
                            await db.execute(
                                "INSERT INTO ai_models (name, provider_url, api_key, model_name, temperature, max_tokens, purpose, is_default, is_enabled) "
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                (
                                    "Migrated Chat AI",
                                    old_config.get("provider_url", ""),
                                    old_config.get("api_key", ""),
                                    old_config.get("model_name", ""),
                                    old_config.get("temperature", 0.8),
                                    old_config.get("max_tokens", 2048),
                                    "chat",
                                    1,
                                    1,
                                ),
                            )
                except Exception:
                    pass

                # Migrate old embedding config
                try:
                    config_cursor = await db.execute("SELECT value FROM configs WHERE key = 'embedding_config'")
                    row = await config_cursor.fetchone()
                    if row:
                        import json as _json
                        old_config = _json.loads(row[0])
                        if old_config.get("provider_url") or old_config.get("api_key"):
                            await db.execute(
                                "INSERT INTO ai_models (name, provider_url, api_key, model_name, temperature, max_tokens, purpose, is_default, is_enabled) "
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                (
                                    "Migrated Embedding AI",
                                    old_config.get("provider_url", ""),
                                    old_config.get("api_key", ""),
                                    old_config.get("model_name", ""),
                                    0.1,
                                    2048,
                                    "embedding",
                                    1,
                                    1,
                                ),
                            )
                except Exception:
                    pass
        except Exception:
            pass

        await db.commit()


def now_iso() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat()


# --- Config helpers (legacy, for general settings like personality/theme) ---


async def get_config(key: str, default: dict[str, Any] | None = None) -> dict[str, Any]:
    """Read a JSON config value from the database."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT value FROM configs WHERE key = ?", (key,))
        row = await cursor.fetchone()
        if row is None:
            return default or {}
        return json.loads(row["value"])


async def set_config(key: str, value: dict[str, Any]) -> None:
    """Write (upsert) a JSON config value to the database."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "INSERT INTO configs (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, json.dumps(value, ensure_ascii=False)),
        )
        await db.commit()
