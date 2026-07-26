"""Terminal API routes: execute commands and view history."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.terminal_service import execute_command, get_command_history

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


class CommandRequest(BaseModel):
    command: str


@router.post("/execute")
async def run_command(req: CommandRequest):
    """Execute a shell command and return the result."""
    result = await execute_command(req.command)
    return result


@router.get("/history")
async def command_history(limit: int = 50):
    """Get command execution history."""
    return {"commands": await get_command_history(limit)}
