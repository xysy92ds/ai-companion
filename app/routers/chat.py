"""Chat API routes v4: cached conversations, streaming, summary trigger."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.chat_service import get_conversation_history, stream_chat, summarize_conversations_with_ai

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"


@router.get("/history")
async def get_history(session_id: str = "default", limit: int = 50):
    """Get recent conversation history from cache."""
    messages = await get_conversation_history(session_id=session_id, limit=limit)
    return {"messages": messages}


@router.post("/send")
async def send_message(req: ChatRequest):
    """Send a message and get streaming AI response."""
    return StreamingResponse(
        stream_chat(req.message, req.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/history")
async def clear_history(session_id: str = "default"):
    """Clear conversation cache for a session."""
    from app.database import get_db
    db = await get_db()
    try:
        await db.execute("DELETE FROM conversation_cache WHERE session_id = ?", (session_id,))
        await db.commit()
        return {"status": "cleared"}
    finally:
        await db.close()


@router.post("/summary")
async def manual_summary(session_id: str = "default"):
    """Manually trigger conversation summary."""
    return await summarize_conversations_with_ai(session_id)
