"""Terminal service: execute shell commands in the Termux environment.

Safety:
  - Blocks dangerous commands (rm -rf /, mkfs, dd, shutdown, etc.)
  - Enforces a timeout to prevent hanging
  - Records all executions in the command history table
"""

from __future__ import annotations

import asyncio
import shlex
from datetime import datetime, timezone

import httpx

from app.config import BLOCKED_COMMANDS, MAX_COMMAND_TIMEOUT
from app.database import get_db


def is_command_safe(command: str) -> bool:
    """Check if a command contains blocked patterns."""
    cmd_lower = command.lower().strip()
    for blocked in BLOCKED_COMMANDS:
        if blocked.lower() in cmd_lower:
            return False
    return True


async def execute_command(command: str) -> dict:
    """Execute a shell command and return the output.

    Args:
        command: The shell command string to execute.

    Returns:
        A dict with output, exit_code, and timestamp.
    """
    now = datetime.now(timezone.utc).isoformat()

    if not command.strip():
        return {"error": "empty command", "output": "", "exit_code": -1}

    if not is_command_safe(command):
        msg = "blocked: command matches a blocked pattern"
        await save_command_history(command, msg, -1)
        return {"error": msg, "output": msg, "exit_code": -1}

    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=MAX_COMMAND_TIMEOUT
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            msg = f"timeout: command exceeded {MAX_COMMAND_TIMEOUT}s limit"
            await save_command_history(command, msg, -1)
            return {"error": msg, "output": msg, "exit_code": -1}

        # v4: improved output handling - normalize whitespace and preserve ordering
        output_parts: list[str] = []
        if stdout:
            decoded = stdout.decode("utf-8", errors="replace")
            # Remove trailing whitespace per line but keep structure
            decoded = "\n".join(line.rstrip() for line in decoded.splitlines())
            output_parts.append(decoded)
        if stderr:
            decoded = stderr.decode("utf-8", errors="replace")
            decoded = "\n".join(line.rstrip() for line in decoded.splitlines())
            output_parts.append(f"[stderr]\n{decoded}")
        output = "\n".join(output_parts)

        exit_code = proc.returncode if proc.returncode is not None else -1

        await save_command_history(command, output, exit_code)
        return {
            "output": output,
            "exit_code": exit_code,
            "timestamp": now,
            "command": command,
        }

    except Exception as exc:
        msg = f"error: {exc}"
        await save_command_history(command, msg, -1)
        return {"error": msg, "output": msg, "exit_code": -1}


def _is_termux() -> bool:
    """Check if running in a Termux environment."""
    import os

    return "com.termux" in os.environ.get("PREFIX", "")


async def save_command_history(command: str, output: str, exit_code: int) -> None:
    """Save a command execution to the history table."""
    # Truncate very long outputs
    if len(output) > 10000:
        output = output[:10000] + "\n... [truncated]"
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO commands (command, output, exit_code) VALUES (?, ?, ?)",
            (command, output, exit_code),
        )
        await db.commit()
    finally:
        await db.close()


async def get_command_history(limit: int = 50) -> list[dict]:
    """Retrieve command execution history."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, command, output, exit_code, created_at FROM commands "
            "ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


# v4: new AI summarization for terminal output


async def execute_command_with_summary(command: str, summary_model: dict | None = None) -> dict:
    """Execute a shell command and return an AI-generated natural language summary.

    Args:
        command: The shell command to run.
        summary_model: AI model dict with provider_url, api_key, model_name.
                       If None, falls back to terminal or chat default.

    Returns:
        Dict with raw output and a 'summary' field describing what was done.
    """
    result = await execute_command(command)

    # If execution failed or summary model not configured, return raw result
    if result.get("error") or not summary_model or not summary_model.get("provider_url"):
        result["summary"] = result.get("output", "")
        return result

    raw_output = result.get("output", "")
    if not raw_output.strip():
        result["summary"] = "The command produced no output."
        return result

    prompt = (
        "You are a helpful assistant summarizing terminal output for a user. "
        "Describe in one or two sentences what this command did and what the key result was. "
        "Be concise and natural. Do not include technical jargon unless necessary. "
        f"\n\nCommand: {command}\n\nOutput:\n{raw_output[:4000]}"
    )

    url = f"{summary_model['provider_url'].rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {summary_model['api_key']}",
        "Content-Type": "application/json",
    }
    body = {
        "model": summary_model["model_name"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": float(summary_model.get("temperature", 0.7)),
        "max_tokens": int(summary_model.get("max_tokens", 256)),
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code == 200:
                data = response.json()
                summary = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                result["summary"] = summary.strip() or raw_output[:500]
            else:
                # Fallback to raw output truncated if AI fails
                result["summary"] = raw_output[:500]
    except Exception:
        result["summary"] = raw_output[:500]

    return result
