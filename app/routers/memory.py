"""Memory API routes: memories, persons, relationships, schedules, forgetting curve."""

from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.memory_service import (
    consolidate_memories_with_ai,
    create_memory,
    create_person,
    create_relationship,
    create_schedule,
    delete_memory,
    delete_person,
    delete_relationship,
    delete_schedule,
    get_forgetting_curve_data,
    get_memory,
    get_memory_stats,
    get_memories,
    get_relationship_graph,
    get_relationships,
    get_schedules,
    recall_memory,
    toggle_schedule,
    update_memory,
    update_person,
)

router = APIRouter(prefix="/api/memory", tags=["memory"])


# --- Memory models ---------------------------------------------------------


class MemoryCreate(BaseModel):
    category: str = "general"
    title: str = ""
    content: str = ""
    importance: float = 0.5
    person_id: int | None = None


class MemoryUpdate(BaseModel):
    category: str | None = None
    title: str | None = None
    content: str | None = None
    importance: float | None = None


# --- Memory endpoints ------------------------------------------------------


@router.post("/export")
async def export_memories_api():
    """Export all memories as JSON."""
    from app.services.memory_service import export_memories
    return await export_memories()


@router.post("/import")
async def import_memories_api(body: dict):
    """Import memories from JSON."""
    from app.services.memory_service import import_memories
    return await import_memories(body)


@router.post("/search-for-ai")
async def search_memories_ai(query: str = "", limit: int = 10):
    """Search memories for AI context injection."""
    from app.services.memory_service import search_memories_for_ai
    return {"results": await search_memories_for_ai(query, limit)}


@router.get("/list")
async def list_memories(
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
    order_by: str = "created_at",
    sort_dir: str = "DESC",
):
    return {"memories": await get_memories(category, limit, offset, order_by, sort_dir)}


@router.get("/{memory_id}")
async def get_single_memory(memory_id: int):
    memory = await get_memory(memory_id)
    if not memory:
        return {"error": "not found"}
    return memory


@router.post("/")
async def add_memory(mem: MemoryCreate):
    return await create_memory(
        category=mem.category,
        title=mem.title,
        content=mem.content,
        importance=mem.importance,
        person_id=mem.person_id,
    )


@router.put("/{memory_id}")
async def edit_memory(memory_id: int, updates: MemoryUpdate):
    return await update_memory(memory_id, {k: v for k, v in updates.dict().items() if v is not None})


@router.delete("/{memory_id}")
async def remove_memory(memory_id: int):
    return await delete_memory(memory_id)


@router.post("/{memory_id}/recall")
async def recall(memory_id: int, quality: int = 3):
    """Recall a memory and update its forgetting curve."""
    return await recall_memory(memory_id, quality)


@router.get("/{memory_id}/curve")
async def forgetting_curve(memory_id: int, days: int = 30):
    """Get forgetting curve data for visualization."""
    return {"data": await get_forgetting_curve_data(memory_id, days)}


@router.get("/stats/summary")
async def memory_stats():
    """Get aggregate memory statistics."""
    return await get_memory_stats()


@router.post("/consolidate")
async def consolidate():
    """Consolidate memories using AI API."""
    return await consolidate_memories_with_ai()


# --- Person models ---------------------------------------------------------


class PersonCreate(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"
    icon: str = "person"


class PersonUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    icon: str | None = None


@router.get("/persons/list")
async def list_persons():
    return {"persons": await get_persons()}


@router.post("/persons/")
async def add_person(person: PersonCreate):
    return await create_person(person.name, person.description, person.color, person.icon)


@router.put("/persons/{person_id}")
async def edit_person(person_id: int, updates: PersonUpdate):
    return await update_person(person_id, {k: v for k, v in updates.dict().items() if v is not None})


@router.delete("/persons/{person_id}")
async def remove_person(person_id: int):
    return await delete_person(person_id)


# --- Relationship models ---------------------------------------------------


class RelationshipCreate(BaseModel):
    person_a_id: int
    person_b_id: int
    relation: str = "friend"


@router.get("/relationships/list")
async def list_relationships():
    return {"relationships": await get_relationships()}


@router.post("/relationships/")
async def add_relationship(rel: RelationshipCreate):
    return await create_relationship(rel.person_a_id, rel.person_b_id, rel.relation)


@router.delete("/relationships/{relationship_id}")
async def remove_relationship(relationship_id: int):
    return await delete_relationship(relationship_id)


@router.get("/relationships/graph")
async def relationship_graph():
    """Get the full relationship graph for visualization."""
    return await get_relationship_graph()


# --- Schedule models -------------------------------------------------------


class ScheduleCreate(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    time: str | None = None
    description: str = ""


@router.get("/schedules/list")
async def list_schedules(date: str | None = None, limit: int = 50):
    return {"schedules": await get_schedules(date, limit)}


@router.post("/schedules/")
async def add_schedule(sched: ScheduleCreate):
    return await create_schedule(sched.title, sched.date, sched.time, sched.description)


@router.post("/schedules/{schedule_id}/toggle")
async def toggle_sched(schedule_id: int):
    return await toggle_schedule(schedule_id)


@router.delete("/schedules/{schedule_id}")
async def remove_schedule(schedule_id: int):
    return await delete_schedule(schedule_id)
