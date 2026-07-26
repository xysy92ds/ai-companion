"""Settings API routes v4: multi-model config, personality, theme, avatar, language, summary config."""

from __future__ import annotations

import json

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

import httpx

from app.config import DEFAULT_EMBEDDING_CONFIG, DEFAULT_PERSONALITY, STATIC_DIR
from app.database import get_config, set_config, get_db
from app.services.chat_service import get_ai_models

router = APIRouter(prefix="/api/settings", tags=["settings"])


# --- Personality -----------------------------------------------------------


class PersonalityModel(BaseModel):
    name: str = ""
    description: str = ""
    greeting: str = ""
    tone: str = "friendly"
    traits: list[str] = []
    system_prompt: str = ""


@router.get("/personality")
async def get_personality():
    """Get the current personality configuration."""
    return await get_config("personality", DEFAULT_PERSONALITY)


@router.post("/personality")
async def update_personality(personality: PersonalityModel):
    """Update the personality configuration."""
    await set_config("personality", personality.dict())
    return {"status": "saved"}


# --- Theme ----------------------------------------------------------------


@router.get("/theme")
async def get_theme():
    """Get the current theme preference."""
    return await get_config("theme", {"mode": "dark"})


@router.post("/theme")
async def set_theme(body: dict):
    """Set the theme preference."""
    await set_config("theme", body)
    return {"status": "saved"}


# --- Language -------------------------------------------------------------


@router.get("/language")
async def get_language():
    """Get the current language preference."""
    return await get_config("language", {"lang": "zh-CN"})


@router.post("/language")
async def set_language(body: dict):
    """Set the language preference."""
    lang = body.get("lang", "zh-CN")
    if lang not in ("zh-CN", "en"):
        lang = "zh-CN"
    await set_config("language", {"lang": lang})
    return {"status": "saved", "lang": lang}


# --- Summary Config -------------------------------------------------------


@router.get("/summary-config")
async def get_summary_config():
    """Get auto-summary configuration."""
    from app.config import DEFAULT_SUMMARY_CONFIG
    return await get_config("summary_config", DEFAULT_SUMMARY_CONFIG)


@router.post("/summary-config")
async def update_summary_config(body: dict):
    """Update auto-summary configuration."""
    await set_config("summary_config", body)
    return {"status": "saved"}


@router.post("/summary-trigger")
async def trigger_summary():
    """Manually trigger conversation summary."""
    from app.services.chat_service import summarize_conversations_with_ai
    return await summarize_conversations_with_ai()


# --- Embedding Config (v4) -----------------------------------------------


@router.get("/embedding-config")
async def get_embedding_config():
    """Get the embedding API configuration for knowledge base."""
    return await get_config("embedding_config", DEFAULT_EMBEDDING_CONFIG)


@router.post("/embedding-config")
async def update_embedding_config(body: dict):
    """Update the embedding API configuration."""
    # v4: validate and save embedding config to configs table
    allowed = {"provider_url", "api_key", "model_name", "temperature", "max_tokens", "use_for_memory"}
    config = {k: v for k, v in body.items() if k in allowed}
    if "temperature" in config:
        config["temperature"] = float(config["temperature"])
    if "max_tokens" in config:
        config["max_tokens"] = int(config["max_tokens"])
    await set_config("embedding_config", config)
    return {"status": "saved"}


# --- Multi-Model Management -----------------------------------------------


class AIModelCreate(BaseModel):
    name: str = ""
    provider_url: str = ""
    api_key: str = ""
    model_name: str = ""
    temperature: float = 0.8
    max_tokens: int = 2048
    purpose: str = "chat"  # 'chat' | 'terminal' | 'summary' | 'embedding'
    is_default: int = 0
    is_enabled: int = 1


@router.get("/models")
async def list_models(purpose: str | None = None):
    """List all AI models, optionally filtered by purpose."""
    return {"models": await get_ai_models(purpose)}


@router.get("/models/{model_id}")
async def get_model(model_id: int):
    """Get a single model by ID."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT * FROM ai_models WHERE id = ?", (model_id,))
        row = await cursor.fetchone()
        return dict(row) if row else {"error": "not found"}
    finally:
        await db.close()


@router.post("/models")
async def add_model(model: AIModelCreate):
    """Add a new AI model."""
    db = await get_db()
    try:
        # If setting as default for this purpose, unset other defaults
        if model.is_default:
            await db.execute(
                "UPDATE ai_models SET is_default = 0 WHERE purpose = ?",
                (model.purpose,),
            )
        
        cursor = await db.execute(
            """INSERT INTO ai_models
               (name, provider_url, api_key, model_name, temperature, max_tokens, purpose, is_default, is_enabled)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (model.name, model.provider_url, model.api_key, model.model_name,
             model.temperature, model.max_tokens, model.purpose, model.is_default, model.is_enabled),
        )
        await db.commit()
        return {"id": cursor.lastrowid, "status": "created"}
    finally:
        await db.close()


@router.put("/models/{model_id}")
async def edit_model(model_id: int, body: dict):
    """Update an AI model."""
    db = await get_db()
    try:
        # Handle default toggle
        if body.get("is_default") and body.get("purpose"):
            await db.execute(
                "UPDATE ai_models SET is_default = 0 WHERE purpose = ?",
                (body["purpose"],),
            )
        
        allowed = {"name", "provider_url", "api_key", "model_name", "temperature", "max_tokens", "purpose", "is_default", "is_enabled"}
        fields = {k: v for k, v in body.items() if k in allowed}
        # v4: properly coerce numeric fields to prevent sqlite type issues
        if "temperature" in fields:
            fields["temperature"] = float(fields["temperature"])
        if "max_tokens" in fields:
            fields["max_tokens"] = int(fields["max_tokens"])
        if "is_default" in fields:
            fields["is_default"] = int(fields["is_default"])
        if "is_enabled" in fields:
            fields["is_enabled"] = int(fields["is_enabled"])
        if not fields:
            return {"status": "no_changes"}
        
        set_clauses = ", ".join(f"{k} = ?" for k in fields)
        values = list(fields.values()) + [model_id]
        
        await db.execute(f"UPDATE ai_models SET {set_clauses} WHERE id = ?", values)
        await db.commit()
        return {"status": "updated", "id": model_id}
    finally:
        await db.close()


@router.get("/models/{model_id}/test")
async def test_model(model_id: int):
    """v4: Test if a model is reachable by sending a simple hello request."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT provider_url, api_key, model_name, temperature, max_tokens FROM ai_models WHERE id = ?",
            (model_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return {"reachable": False, "error": "Model not found"}

        provider_url = row["provider_url"].rstrip("/")
        api_key = row["api_key"]
        model_name = row["model_name"]
        temperature = float(row.get("temperature", 0.8))
        max_tokens = int(row.get("max_tokens", 16))

        url = f"{provider_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": model_name,
            "messages": [{"role": "user", "content": "hello"}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, headers=headers, json=body)
                if response.status_code == 200:
                    data = response.json()
                    reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    return {"reachable": True, "reply_preview": reply[:200]}
                else:
                    text = response.text[:200]
                    return {"reachable": False, "error": f"HTTP {response.status_code}: {text}"}
        except httpx.ConnectError:
            return {"reachable": False, "error": "Connection error"}
        except httpx.TimeoutException:
            return {"reachable": False, "error": "Request timeout"}
        except Exception as exc:
            return {"reachable": False, "error": str(exc)}
    finally:
        await db.close()


@router.delete("/models/{model_id}")
async def delete_model(model_id: int):
    """Delete an AI model."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM ai_models WHERE id = ?", (model_id,))
        await db.commit()
        return {"status": "deleted", "id": model_id}
    finally:
        await db.close()


# --- Legacy single-config compatibility (redirects to models) ---------------


@router.get("/api-config")
async def get_api_config():
    """Get the default chat API configuration (legacy compat)."""
    models = await get_ai_models("chat")
    if not models:
        return {"provider_url": "", "api_key": "", "model_name": "", "temperature": 0.8, "max_tokens": 2048}
    m = models[0]
    masked_key = m["api_key"]
    return {
        "provider_url": m["provider_url"],
        "api_key": m["api_key"],
        "api_key_masked": masked_key[:4] + "***" + masked_key[-4:] if len(masked_key) > 8 else "***",
        "model_name": m["model_name"],
        "temperature": m["temperature"],
        "max_tokens": m["max_tokens"],
    }


@router.post("/api-config")
async def update_api_config(body: dict):
    """Update the default chat API configuration (legacy compat)."""
    db = await get_db()
    try:
        # Find default chat model
        cursor = await db.execute(
            "SELECT id FROM ai_models WHERE purpose = 'chat' AND is_default = 1 LIMIT 1"
        )
        row = await cursor.fetchone()
        if row:
            await db.execute(
                "UPDATE ai_models SET provider_url = ?, api_key = ?, model_name = ?, temperature = ?, max_tokens = ? WHERE id = ?",
                (body.get("provider_url", ""), body.get("api_key", ""), body.get("model_name", ""),
                 body.get("temperature", 0.8), body.get("max_tokens", 2048), row["id"]),
            )
        else:
            # Create default chat model
            await db.execute(
                """INSERT INTO ai_models (name, provider_url, api_key, model_name, temperature, max_tokens, purpose, is_default, is_enabled)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                ("Chat AI", body.get("provider_url", ""), body.get("api_key", ""), body.get("model_name", ""),
                 body.get("temperature", 0.8), body.get("max_tokens", 2048), "chat", 1, 1),
            )
        await db.commit()
        return {"status": "saved"}
    finally:
        await db.close()


# --- Status ---------------------------------------------------------------


@router.get("/status")
async def get_status():
    """Check if any chat API is configured and reachable."""
    models = await get_ai_models("chat")
    is_configured = any(m.get("provider_url") and m.get("api_key") and m.get("model_name") for m in models)
    model_name = models[0].get("model_name", "") if models else ""
    return {
        "api_configured": is_configured,
        "model_name": model_name,
        "model_count": len(models),
    }


# --- Avatar upload ----------------------------------------------------------


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...)):
    """Upload a custom AI avatar image."""
    if not file.filename:
        return {"error": "No filename provided"}

    ext = file.filename.split(".")[-1].lower()
    if ext not in ("png", "jpg", "jpeg"):
        return {"error": "Only png/jpg/jpeg supported"}

    avatar_path = STATIC_DIR / "assets" / "ai-avatar.png"
    content = await file.read()
    avatar_path.write_bytes(content)

    return {"status": "saved", "path": "/static/assets/ai-avatar.png"}
