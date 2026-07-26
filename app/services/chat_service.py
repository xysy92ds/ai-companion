"""AI chat service v4: multi-model, cached conversations, auto-summarize, terminal triggers.

Enhancements:
  - Multi-model support: chat/terminal/summary each with separate AI config
  - Conversation cache: messages stored locally, periodically summarized into memories
  - Auto-summary: configurable interval, AI summarizes and saves to memory system
  - Terminal triggers: chat AI can invoke smart terminal tools
  - Better memory injection: search_memories_for_ai returns relevance-ranked results
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import AsyncGenerator

import httpx

from app.config import DEFAULT_SUMMARY_CONFIG, DEFAULT_PERSONALITY, TERMINAL_TRIGGER_KEYWORDS
from app.database import get_db, get_config, set_config


# --- Multi-model configuration ----------------------------------------------


async def get_ai_models(purpose: str | None = None) -> list[dict]:
    """Get all AI model configs. If purpose given, filter by purpose."""
    db = await get_db()
    try:
        if purpose:
            cursor = await db.execute(
                "SELECT * FROM ai_models WHERE purpose = ? AND is_enabled = 1 ORDER BY is_default DESC, id",
                (purpose,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM ai_models WHERE is_enabled = 1 ORDER BY purpose, is_default DESC, id"
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_default_chat_model() -> dict | None:
    """Get the default enabled chat model."""
    models = await get_ai_models("chat")
    return models[0] if models else None


async def get_default_terminal_model() -> dict | None:
    """Get the default enabled terminal model (fallback to chat if not set)."""
    models = await get_ai_models("terminal")
    if models:
        return models[0]
    return await get_default_chat_model()


async def get_default_summary_model() -> dict | None:
    """Get the default enabled summary model (fallback to chat if not set)."""
    models = await get_ai_models("summary")
    if models:
        return models[0]
    return await get_default_chat_model()


# --- Personality ------------------------------------------------------------


async def get_personality() -> dict:
    """Retrieve the current personality configuration from the database."""
    return await get_config("personality", DEFAULT_PERSONALITY)


# --- Conversation cache -----------------------------------------------------


async def save_conversation(role: str, content: str, session_id: str = "default") -> None:
    """Save a message to the local conversation cache."""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO conversation_cache (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content),
        )
        await db.commit()
    finally:
        await db.close()


async def get_conversation_history(session_id: str = "default", limit: int = 20) -> list[dict]:
    """Retrieve recent cached conversation messages."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, role, content, created_at FROM conversation_cache "
            "WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit),
        )
        rows = await cursor.fetchall()
        return list(reversed([dict(row) for row in rows]))
    finally:
        await db.close()


async def get_cached_conversations(session_id: str = "default", limit: int = 50) -> list[dict]:
    """Get all cached conversations for this session (unsummarized first)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM conversation_cache WHERE session_id = ? ORDER BY id",
            (session_id,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def mark_conversations_summarized(session_id: str = "default") -> None:
    """Mark all conversations in session as summarized."""
    db = await get_db()
    try:
        await db.execute(
            "UPDATE conversation_cache SET is_summarized = 1 WHERE session_id = ?",
            (session_id,),
        )
        await db.commit()
    finally:
        await db.close()


async def get_unsummarized_count(session_id: str = "default") -> int:
    """Count how many messages are not yet summarized."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM conversation_cache WHERE session_id = ? AND is_summarized = 0",
            (session_id,),
        )
        row = await cursor.fetchone()
        return row["count"] if row else 0
    finally:
        await db.close()


async def clear_conversation_cache() -> None:
    """Clear all conversation cache (only clears after summaries are saved)."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM conversation_cache WHERE is_summarized = 1")
        await db.commit()
    finally:
        await db.close()


# --- Summary schedule -------------------------------------------------------


async def get_summary_config() -> dict:
    """Get auto-summary configuration."""
    return await get_config("summary_config", DEFAULT_SUMMARY_CONFIG)


async def set_summary_config(config: dict) -> None:
    """Set auto-summary configuration."""
    await set_config("summary_config", config)


async def should_trigger_summary() -> bool:
    """Check if enough messages accumulated to trigger auto-summary."""
    config = await get_summary_config()
    if not config.get("enabled", True):
        return False

    min_messages = config.get("min_messages", 10)
    unsummarized = await get_unsummarized_count()
    return unsummarized >= min_messages


async def summarize_conversations_with_ai(session_id: str = "default") -> dict:
    """Call AI to summarize recent conversations and save as a memory."""
    model = await get_default_summary_model()
    if not model or not model.get("provider_url"):
        return {"error": "No summary AI model configured"}

    conversations = await get_cached_conversations(session_id)
    if not conversations:
        return {"error": "No conversations to summarize"}

    # Filter only unsummarized messages
    unsummarized = [c for c in conversations if not c.get("is_summarized")]
    if len(unsummarized) < 3:
        return {"error": "Not enough new messages to summarize"}

    # Build conversation text
    convo_text = "\n".join(
        f"{c['role']}: {c['content'][:200]}"
        for c in unsummarized
    )

    prompt = (
        "Summarize the following conversation into a concise memory. "
        "Extract key facts, decisions, and themes. Use the user's language. "
        "Output ONLY the summary text, no extra explanation.\n\n"
        f"Conversation:\n{convo_text}"
    )

    url = f"{model['provider_url'].rstrip('/')}/chat/completions"
    headers = {"Authorization": f"Bearer {model['api_key']}", "Content-Type": "application/json"}
    body = {
        "model": model["model_name"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 800,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code != 200:
                return {"error": f"API error {response.status_code}"}

            data = response.json()
            summary = data["choices"][0]["message"]["content"]

            # Save as memory
            from app.services.memory_service import create_memory_from_summary

            result = await create_memory_from_summary(
                conversation_ids=[c["id"] for c in unsummarized],
                summary_content=summary,
                importance=0.7,
            )

            # Mark as summarized
            await mark_conversations_summarized(session_id)

            return {
                "status": "success",
                "summary": summary,
                "memory_id": result.get("id"),
                "message_count": len(unsummarized),
            }
    except Exception as exc:
        return {"error": str(exc)}


# --- System prompt with memory injection -----------------------------------


def build_system_prompt(personality: dict, recent_memories: list[dict] | None = None) -> str:
    """Build a system prompt that embeds personality and recent memories."""
    parts: list[str] = []

    name = personality.get("name", "AI")
    description = personality.get("description", "")
    greeting = personality.get("greeting", "")
    tone = personality.get("tone", "friendly")
    traits = personality.get("traits", [])

    parts.append(f"Your name is {name}.")
    if description:
        parts.append(f"Character: {description}")
    if traits:
        parts.append(f"Personality traits: {', '.join(traits)}.")
    parts.append(f"Tone: {tone}.")
    if greeting:
        parts.append(f"Greeting style: {greeting}")

    # Inject recent memories
    if recent_memories:
        memory_lines: list[str] = []
        for m in recent_memories[-10:]:
            memory_lines.append(f"- [{m.get('category', 'general')}] {m.get('title', '')}: {m.get('content', '')}")
        parts.append("Here are some memories you have (use naturally, don't recite):\n" + "\n".join(memory_lines))

    parts.append("Be warm, natural and conversational. Use the user's language.")
    parts.append("When you need to search the web or find files, you can invoke terminal tools.")
    return "\n".join(parts)


async def get_recent_memories(limit: int = 10) -> list[dict]:
    """Fetch recent memories sorted by importance and recency."""
    from app.services.memory_service import get_memories

    return await get_memories(limit=limit, order_by="importance")


# --- Terminal trigger detection --------------------------------------------


def should_trigger_terminal(message: str) -> bool:
    """Detect if the user's message implies a need to use the terminal."""
    msg_lower = message.lower()
    for kw in TERMINAL_TRIGGER_KEYWORDS:
        if kw.lower() in msg_lower:
            return True
    return False


async def execute_terminal_in_chat(user_request: str) -> dict:
    """Trigger the smart terminal from within chat and return summarized results."""
    from app.services.smart_terminal_service import smart_execute_with_summary

    result = await smart_execute_with_summary(user_request)
    return result


# --- Main streaming chat ---------------------------------------------------


async def stream_chat(user_message: str, session_id: str = "default") -> AsyncGenerator[str, None]:
    """Send a message to the AI API and yield streaming response chunks.
    
    Flow:
      1. Save user message to cache
      2. Check if terminal trigger needed
      3. If triggered: execute terminal, inject results into system prompt
      4. Call AI API with streaming
      5. Save AI response to cache
      6. Check if should auto-summarize
    """
    model = await get_default_chat_model()
    personality = await get_personality()
    recent_memories = await get_recent_memories()

    # v4: SSE format helper
    def _sse(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    # Save user message
    await save_conversation("user", user_message, session_id)

    # Terminal trigger: check if user wants internet search
    terminal_result: dict | None = None
    if should_trigger_terminal(user_message):
        yield _sse({"type": "system", "content": "[正在联网搜索...]"})  # v4: SSE format
        terminal_result = await execute_terminal_in_chat(user_message)
        if terminal_result.get("error"):
            yield _sse({"type": "system", "content": f"[搜索失败: {terminal_result['error']}]"})
        elif terminal_result.get("summary"):
            yield _sse({"type": "system", "content": "[搜索结果已获取]"})  # v4: SSE format
        else:
            yield _sse({"type": "system", "content": "[未获取到有用结果]"})  # v4: SSE format

    # Build system prompt
    system_prompt = build_system_prompt(personality, recent_memories)

    # Build message list
    history = await get_conversation_history(session_id, limit=20)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    # Inject terminal result if available
    if terminal_result and terminal_result.get("summary"):
        terminal_context = (
            f"You just searched the internet for the user. Here are the results:\n"
            f"{terminal_result['summary']}\n\n"
            f"Please summarize this in your own words as if you're telling the user what you found. "
            f"Use a friendly, conversational tone. Don't read out raw data."
        )
        messages.append({"role": "system", "content": terminal_context})

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Ensure user message is the last one
    if not messages or messages[-1]["role"] != "user":
        messages.append({"role": "user", "content": user_message})

    if not model or not model.get("provider_url") or not model.get("api_key"):
        yield _sse({"type": "error", "content": "未配置聊天 AI。请先在设置中添加至少一个聊天模型。"})
        return

    provider_url = model["provider_url"].rstrip("/")
    api_key = model["api_key"]
    model_name = model["model_name"]
    temperature = float(model.get("temperature", 0.8))
    max_tokens = int(model.get("max_tokens", 2048))

    url = f"{provider_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    full_response = ""

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0)) as client:
            async with client.stream("POST", url, headers=headers, json=body) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield _sse({"type": "error", "content": f"API 返回 {response.status_code}: {error_text.decode()[:200]}"})
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_response += content
                                    yield _sse({"type": "content", "content": content})
                        except json.JSONDecodeError:
                            continue

    except httpx.ConnectError:
        yield _sse({"type": "error", "content": f"无法连接到 {provider_url}。请检查网络和 URL。"})
        return
    except httpx.TimeoutException:
        yield _sse({"type": "error", "content": "请求超时。请重试或减少 max_tokens。"})
        return
    except Exception as exc:
        yield _sse({"type": "error", "content": str(exc)})
        return

    # Save assistant response
    if full_response:
        await save_conversation("assistant", full_response, session_id)

        # Check for memory extraction
        await maybe_extract_memory(user_message, full_response, personality)

        # Check if should auto-summarize
        if await should_trigger_summary():
            summary_result = await summarize_conversations_with_ai(session_id)
            if summary_result.get("status") == "success":
                # Optionally notify user
                pass  # Silent summary for now


# --- Heuristic memory extraction -------------------------------------------


async def maybe_extract_memory(user_message: str, ai_response: str, personality: dict) -> None:
    """Heuristic: save notable things as memories."""
    keywords = [
        "remember", "记住", "别忘了", "我的", "我叫", "我喜欢", "我不喜欢",
        "明天", "今天", "生日", "计划", "要去做", "记得",
    ]

    message_lower = user_message.lower()
    should_save = any(kw.lower() in message_lower for kw in keywords)

    if should_save:
        from app.services.memory_service import create_memory

        await create_memory(
            category="general",
            title=user_message[:50],
            content=f"用户说: {user_message}\nAI回复: {ai_response[:200]}",
            importance=0.7,
            summary_source="manual",
        )
