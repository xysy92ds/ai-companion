"""Smart terminal API routes: AI-powered command generation and execution."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.smart_terminal_service import (
    get_enabled_tools,
    get_quick_actions,
    smart_execute,
    summarize_with_ai,
    toggle_tool,
)

router = APIRouter(prefix="/api/smart-terminal", tags=["smart-terminal"])


class SmartRequest(BaseModel):
    request: str


class ToolToggleRequest(BaseModel):
    tool_key: str
    enabled: bool


@router.get("/tools")
async def list_tools():
    """List all available smart terminal tools with their enabled state."""
    return {"tools": await get_enabled_tools()}


@router.post("/tools/toggle")
async def toggle_tool_api(req: ToolToggleRequest):
    """Toggle a tool on or off."""
    return await toggle_tool(req.tool_key, req.enabled)


@router.get("/quick-actions")
async def quick_actions():
    """Get predefined quick action templates."""
    return {"actions": await get_quick_actions()}


@router.post("/execute")
async def smart_execute_api(req: SmartRequest):
    """Process a natural language request and execute the generated command."""
    return await smart_execute(req.request)


@router.post("/summarize")
async def summarize_terminal_output(body: dict):
    """Summarize terminal execution output using AI."""
    result = await summarize_with_ai(
        body.get("command", ""),
        body.get("output", ""),
        body.get("error", ""),
        body.get("exit_code", 0)
    )
    return result
