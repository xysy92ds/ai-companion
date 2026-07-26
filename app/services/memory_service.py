"""Memory service v4: storage, retrieval, forgetting curve, AI summary, export/import.

Enhancements:
  - AI-powered memory creation from conversation summaries
  - Memory export/import (JSON format)
  - Enhanced memory search for AI context injection
  - Better statistics and visualization data
  - Summary source tracking (manual / ai_summary / imported)
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any

from app.database import get_db

# --- Memory CRUD ------------------------------------------------------------


async def create_memory(
    category: str = "general",
    title: str = "",
    content: str = "",
    importance: float = 0.5,
    person_id: int | None = None,
    summary_source: str = "manual",
) -> dict:
    """Create a new memory entry."""
    now = datetime.now(timezone.utc).isoformat()
    db = await get_db()
    try:
        cursor = await db.execute(
            """INSERT INTO memories
               (category, title, content, importance, person_id, summary_source,
                created_at, last_recalled, next_review)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (category, title, content, importance, person_id, summary_source,
             now, now, now),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "created"}
    finally:
        await db.close()


async def create_memory_from_summary(
    conversation_ids: list[int],
    summary_content: str,
    importance: float = 0.7,
) -> dict:
    """Create a memory from an AI-generated conversation summary."""
    title = f"对话总结 {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    return await create_memory(
        category="consolidation",
        title=title,
        content=summary_content,
        importance=importance,
        summary_source="ai_summary",
    )


async def get_memories(
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
    order_by: str = "created_at",
    sort_dir: str = "DESC",
) -> list[dict]:
    """List memories with flexible ordering.
    
    order_by: created_at | importance | next_review | recall_count
    sort_dir: ASC | DESC
    """
    db = await get_db()
    try:
        valid_orders = {"created_at", "importance", "next_review", "recall_count", "last_recalled"}
        order_field = order_by if order_by in valid_orders else "created_at"
        direction = "DESC" if sort_dir.upper() == "DESC" else "ASC"
        
        if category:
            cursor = await db.execute(
                f"SELECT * FROM memories WHERE category = ? "
                f"ORDER BY {order_field} {direction} LIMIT ? OFFSET ?",
                (category, limit, offset),
            )
        else:
            cursor = await db.execute(
                f"SELECT * FROM memories ORDER BY {order_field} {direction} LIMIT ? OFFSET ?",
                (limit, offset),
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_memories_by_forgot_risk(limit: int = 20) -> list[dict]:
    """Get memories ordered by forgetting risk (highest risk first)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT *,
                (julianday('now') - julianday(last_recalled)) / MAX(interval, 0.1) as forgot_ratio
               FROM memories
               ORDER BY forgot_ratio DESC
               LIMIT ?""",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_memory(memory_id: int) -> dict | None:
    """Get a single memory by ID."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM memories WHERE id = ?", (memory_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_memory(memory_id: int, updates: dict[str, Any]) -> dict:
    """Update a memory's fields."""
    allowed = {"category", "title", "content", "importance", "summary_source"}
    fields = {k: v for k, v in updates.items() if k in allowed}
    if not fields:
        return {"status": "no_changes"}

    set_clauses = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [memory_id]

    db = await get_db()
    try:
        await db.execute(
            f"UPDATE memories SET {set_clauses} WHERE id = ?",
            values,
        )
        await db.commit()
        return {"status": "updated", "id": memory_id}
    finally:
        await db.close()


async def delete_memory(memory_id: int) -> dict:
    """Delete a memory."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        await db.commit()
        return {"status": "deleted", "id": memory_id}
    finally:
        await db.close()


# --- Export / Import --------------------------------------------------------


async def export_memories() -> dict:
    """Export all memories to a structured dict for backup."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM memories ORDER BY created_at")
        memories = [dict(row) for row in await cursor.fetchall()]
        
        cursor = await db.execute("SELECT * FROM persons ORDER BY created_at")
        persons = [dict(row) for row in await cursor.fetchall()]
        
        cursor = await db.execute("SELECT * FROM relationships ORDER BY created_at")
        relationships = [dict(row) for row in await cursor.fetchall()]
        
        return {
            "version": "3.5",
            "export_time": datetime.now(timezone.utc).isoformat(),
            "memories": memories,
            "persons": persons,
            "relationships": relationships,
        }
    finally:
        await db.close()


async def import_memories(data: dict) -> dict:
    """Import memories from a structured dict."""
    db = await get_db()
    imported = {"memories": 0, "persons": 0, "relationships": 0}
    
    try:
        # Import persons first (memories may reference them)
        for person in data.get("persons", []):
            await db.execute(
                "INSERT INTO persons (name, description, color, icon) VALUES (?, ?, ?, ?)",
                (person.get("name", ""), person.get("description", ""),
                 person.get("color", "#6366f1"), person.get("icon", "person")),
            )
            imported["persons"] += 1
        
        # Import memories with summary_source='imported'
        for mem in data.get("memories", []):
            await db.execute(
                """INSERT INTO memories
                   (category, title, content, importance, summary_source,
                    created_at, last_recalled, next_review, ease_factor, interval)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    mem.get("category", "general"),
                    mem.get("title", ""),
                    mem.get("content", ""),
                    mem.get("importance", 0.5),
                    "imported",
                    mem.get("created_at", datetime.now(timezone.utc).isoformat()),
                    mem.get("last_recalled", datetime.now(timezone.utc).isoformat()),
                    mem.get("next_review", datetime.now(timezone.utc).isoformat()),
                    mem.get("ease_factor", 2.5),
                    mem.get("interval", 1.0),
                ),
            )
            imported["memories"] += 1
        
        # Import relationships
        for rel in data.get("relationships", []):
            try:
                await db.execute(
                    "INSERT INTO relationships (person_a_id, person_b_id, relation) VALUES (?, ?, ?)",
                    (rel.get("person_a_id"), rel.get("person_b_id"), rel.get("relation", "friend")),
                )
                imported["relationships"] += 1
            except Exception:
                pass  # Skip broken relationships
        
        await db.commit()
        return {"status": "imported", "counts": imported}
    finally:
        await db.close()


# --- Enhanced search for AI context injection ------------------------------


async def search_memories_for_ai(query: str, limit: int = 10) -> list[dict]:
    """Search memories for AI context injection.
    
    Returns memories sorted by relevance score (importance + recency + query match).
    """
    db = await get_db()
    try:
        # Simple keyword match in title + content
        like_query = f"%{query}%"
        cursor = await db.execute(
            """SELECT *,
                (CASE WHEN title LIKE ? THEN 2 ELSE 0 END +
                 CASE WHEN content LIKE ? THEN 1 ELSE 0 END +
                 importance * 3 +
                 (1.0 / MAX(julianday('now') - julianday(created_at), 1.0))
                ) as relevance
               FROM memories
               WHERE title LIKE ? OR content LIKE ?
               ORDER BY relevance DESC
               LIMIT ?""",
            (like_query, like_query, like_query, like_query, limit),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


# --- Forgetting curve (SM-2 based) -----------------------------------------


async def recall_memory(memory_id: int, quality: int = 3) -> dict:
    """Recall a memory, updating its review schedule using SM-2 algorithm."""
    quality = max(0, min(5, quality))
    memory = await get_memory(memory_id)
    if not memory:
        return {"error": "memory not found"}

    now = datetime.now(timezone.utc)
    created = datetime.fromisoformat(memory["created_at"])
    last_recalled = datetime.fromisoformat(memory["last_recalled"])

    elapsed_days = max(0.01, (now - created).total_seconds() / 86400)
    stable_interval = max(0.01, memory["interval"])
    retention = math.exp(-elapsed_days / stable_interval)
    retention_pct = round(retention * 100, 1)

    ease = memory["ease_factor"]
    interval = memory["interval"]

    if quality < 3:
        interval = 1.0
        ease = max(1.3, ease - 0.2)
    else:
        ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        ease = max(1.3, ease)
        if interval == 1.0:
            interval = 1.0 * ease
        elif interval < 6:
            interval = 6.0
        else:
            interval = interval * ease

    next_review = (now + timedelta(days=interval)).isoformat()
    recall_count = memory["recall_count"] + 1

    db = await get_db()
    try:
        await db.execute(
            """UPDATE memories
               SET ease_factor = ?, interval = ?, next_review = ?,
                   last_recalled = ?, recall_count = ?
               WHERE id = ?""",
            (ease, interval, next_review, now.isoformat(), recall_count, memory_id),
        )
        await db.commit()
    finally:
        await db.close()

    return {
        "id": memory_id,
        "retention_pct": retention_pct,
        "next_review": next_review,
        "recall_count": recall_count,
        "ease_factor": round(ease, 3),
        "interval_days": round(interval, 2),
    }


async def get_forgetting_curve_data(memory_id: int, days: int = 30) -> list[dict]:
    """Generate forgetting curve data points for visualization."""
    memory = await get_memory(memory_id)
    if not memory:
        return []

    stable_interval = max(0.01, memory["interval"])
    created = datetime.fromisoformat(memory["created_at"])

    data: list[dict] = []
    for d in range(days + 1):
        point_time = created + timedelta(days=d)
        elapsed = max(0.01, (point_time - created).total_seconds() / 86400)
        retention = math.exp(-elapsed / stable_interval) * 100
        data.append({
            "day": d,
            "retention": round(retention, 1),
            "date": point_time.strftime("%Y-%m-%d"),
        })
    return data


async def get_memory_stats() -> dict:
    """Get aggregate memory statistics with enhanced breakdowns."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as count FROM memories")
        total = (await cursor.fetchone())["count"]

        cursor = await db.execute(
            "SELECT category, COUNT(*) as count FROM memories GROUP BY category"
        )
        by_category = {row["category"]: row["count"] for row in await cursor.fetchall()}

        cursor = await db.execute(
            "SELECT summary_source, COUNT(*) as count FROM memories GROUP BY summary_source"
        )
        by_source = {row["summary_source"]: row["count"] for row in await cursor.fetchall()}

        cursor = await db.execute(
            "SELECT AVG(importance) as avg_importance FROM memories"
        )
        avg_importance = (await cursor.fetchone())["avg_importance"] or 0

        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM memories WHERE next_review <= datetime('now')"
        )
        due_for_review = (await cursor.fetchone())["count"]

        # Memory creation timeline (last 7 days)
        cursor = await db.execute(
            """SELECT DATE(created_at) as date, COUNT(*) as count
               FROM memories
               WHERE created_at >= datetime('now', '-7 days')
               GROUP BY DATE(created_at)
               ORDER BY date"""
        )
        timeline = {row["date"]: row["count"] for row in await cursor.fetchall()}

        return {
            "total_memories": total,
            "by_category": by_category,
            "by_source": by_source,
            "avg_importance": round(avg_importance, 3),
            "due_for_review": due_for_review,
            "timeline": timeline,
        }
    finally:
        await db.close()


# --- Persons & relationships -------------------------------------------------


async def create_person(name: str, description: str = "", color: str = "#6366f1", icon: str = "person") -> dict:
    """Create a new person record."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO persons (name, description, color, icon) VALUES (?, ?, ?, ?)",
            (name, description, color, icon),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "created"}
    finally:
        await db.close()


async def get_persons() -> list[dict]:
    """List all persons."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM persons ORDER BY name")
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def update_person(person_id: int, updates: dict[str, Any]) -> dict:
    """Update a person's fields."""
    allowed = {"name", "description", "color", "icon"}
    fields = {k: v for k, v in updates.items() if k in allowed}
    if not fields:
        return {"status": "no_changes"}

    set_clauses = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [person_id]

    db = await get_db()
    try:
        await db.execute(f"UPDATE persons SET {set_clauses} WHERE id = ?", values)
        await db.commit()
        return {"status": "updated", "id": person_id}
    finally:
        await db.close()


async def delete_person(person_id: int) -> dict:
    """Delete a person and their relationships."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM relationships WHERE person_a_id = ? OR person_b_id = ?", (person_id, person_id))
        await db.execute("DELETE FROM persons WHERE id = ?", (person_id,))
        await db.commit()
        return {"status": "deleted", "id": person_id}
    finally:
        await db.close()


async def create_relationship(person_a_id: int, person_b_id: int, relation: str = "friend") -> dict:
    """Create or update a relationship between two persons."""
    db = await get_db()
    try:
        a_id, b_id = min(person_a_id, person_b_id), max(person_a_id, person_b_id)
        await db.execute(
            "INSERT INTO relationships (person_a_id, person_b_id, relation) "
            "VALUES (?, ?, ?) "
            "ON CONFLICT(person_a_id, person_b_id) DO UPDATE SET relation = excluded.relation",
            (a_id, b_id, relation),
        )
        await db.commit()
        return {"status": "created"}
    finally:
        await db.close()


async def get_relationships() -> list[dict]:
    """List all relationships with person names."""
    db = await get_db()
    try:
        cursor = await db.execute(
            """SELECT r.id, r.person_a_id, r.person_b_id, r.relation, r.created_at,
                      pa.name as person_a_name, pb.name as person_b_name,
                      pa.color as person_a_color, pb.color as person_b_color
               FROM relationships r
               JOIN persons pa ON r.person_a_id = pa.id
               JOIN persons pb ON r.person_b_id = pb.id
               ORDER BY r.created_at"""
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def delete_relationship(relationship_id: int) -> dict:
    """Delete a relationship."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM relationships WHERE id = ?", (relationship_id,))
        await db.commit()
        return {"status": "deleted", "id": relationship_id}
    finally:
        await db.close()


async def get_relationship_graph() -> dict:
    """Get the full relationship graph for visualization."""
    persons = await get_persons()
    relationships = await get_relationships()

    nodes = [
        {
            "id": p["id"],
            "label": p["name"],
            "description": p["description"],
            "color": p["color"],
            "icon": p["icon"],
        }
        for p in persons
    ]
    edges = [
        {
            "source": r["person_a_id"],
            "target": r["person_b_id"],
            "label": r["relation"],
        }
        for r in relationships
    ]
    return {"nodes": nodes, "edges": edges}


# --- Schedule ---------------------------------------------------------------


async def create_schedule(title: str, date: str, time: str | None = None, description: str = "") -> dict:
    """Create a new schedule entry."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO schedules (title, description, date, time) VALUES (?, ?, ?, ?)",
            (title, description, date, time),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "created"}
    finally:
        await db.close()


async def get_schedules(date: str | None = None, limit: int = 50) -> list[dict]:
    """List schedules, optionally filtered by date."""
    db = await get_db()
    try:
        if date:
            cursor = await db.execute(
                "SELECT * FROM schedules WHERE date = ? ORDER BY time ASC NULLS LAST, title ASC LIMIT ?",
                (date, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM schedules ORDER BY date DESC, time ASC NULLS LAST LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def toggle_schedule(schedule_id: int) -> dict:
    """Toggle the completion status of a schedule entry."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT completed FROM schedules WHERE id = ?", (schedule_id,))
        row = await cursor.fetchone()
        if not row:
            return {"error": "schedule not found"}

        new_status = 0 if row["completed"] else 1
        await db.execute("UPDATE schedules SET completed = ? WHERE id = ?", (new_status, schedule_id))
        await db.commit()
        return {"id": schedule_id, "completed": new_status}
    finally:
        await db.close()


async def delete_schedule(schedule_id: int) -> dict:
    """Delete a schedule entry."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        await db.commit()
        return {"status": "deleted", "id": schedule_id}
    finally:
        await db.close()


# --- AI-powered memory consolidation ----------------------------------------


async def consolidate_memories_with_ai() -> dict:
    """Use the configured AI API to summarize and consolidate memories."""
    import httpx
    from app.services.chat_service import get_default_chat_model

    model = await get_default_chat_model()
    if not model or not model.get("provider_url"):
        return {"error": "No chat AI model configured"}

    memories = await get_memories(limit=30)
    if not memories:
        return {"error": "no memories to consolidate"}

    memory_text = "\n".join(
        f"- [{m['category']}] {m['title']}: {m['content']}"
        for m in memories
    )

    prompt = (
        "You are a memory consolidation assistant. Analyze the following memories "
        "and create a concise summary highlighting:\n"
        "1. Key recurring themes\n"
        "2. Important facts to remember long-term\n"
        "3. Suggestions for memory organization\n\n"
        f"Memories:\n{memory_text}"
    )

    url = f"{model['provider_url'].rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {model['api_key']}", "Content-Type": "application/json"}
    body = {
        "model": model["model_name"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code != 200:
                return {"error": f"API error {response.status_code}"}

            data = response.json()
            summary = data["choices"][0]["message"]["content"]

            await create_memory(
                category="consolidation",
                title=f"Memory consolidation {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
                content=summary,
                importance=0.9,
                summary_source="ai_summary",
            )

            return {"status": "success", "summary": summary}
    except Exception as exc:
        return {"error": str(exc)}
