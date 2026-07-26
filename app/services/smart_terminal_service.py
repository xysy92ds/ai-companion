"""AI smart terminal service v4: independent AI config, fixed execution, auto-summary.

Enhancements:
  - Independent AI model configuration for terminal tasks
  - Better command generation prompt with stronger JSON enforcement
  - Auto-summarize execution output via AI
  - Better error handling and user feedback
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.config import TOOL_REGISTRY
from app.database import get_config, set_config
from app.services.terminal_service import execute_command, is_command_safe
from app.services.chat_service import get_default_terminal_model


async def get_enabled_tools() -> dict[str, dict]:
    """Get all tools with their current enabled state."""
    saved = await get_config("tool_switches", {})
    result: dict[str, dict] = {}
    for key, tool in TOOL_REGISTRY.items():
        enabled = saved.get(key, tool.get("enabled", True))
        result[key] = {**tool, "key": key, "enabled": enabled}
    return result


async def toggle_tool(tool_key: str, enabled: bool) -> dict:
    """Toggle a specific tool on/off."""
    saved = await get_config("tool_switches", {})
    saved[tool_key] = enabled
    await set_config("tool_switches", saved)
    return {"key": tool_key, "enabled": enabled}


def build_tool_prompt(user_request: str, tools: dict[str, dict]) -> str:
    """Build a prompt for the AI to generate a command based on user request."""
    enabled_tools = {k: v for k, v in tools.items() if v.get("enabled", True)}
    if not enabled_tools:
        return ""

    tool_list: list[str] = []
    for key, tool in enabled_tools.items():
        tool_list.append(
            f"### Tool: {tool['name']} (key: {key})\n"
            f"Description: {tool['description']}\n"
            f"Usage:\n{tool['instruction']}"
        )

    prompt = (
        "You are a terminal assistant. The user wants to do something.\n"
        "Based on the user's request, generate the appropriate shell command(s).\n\n"
        f"Available tools:\n\n{''.join(tool_list)}\n\n"
        "Rules:\n"
        "1. Respond with ONLY a JSON object, no markdown, no explanation.\n"
        "2. The JSON format must be EXACTLY:\n"
        '   {"tool": "tool_key", "command": "the shell command to run", '
        '"explanation": "brief explanation of what the command does"}\n'
        "3. Replace KEYWORD/URL/PATTERN with actual values from the user request.\n"
        "4. Keep commands safe and non-destructive.\n"
        f"5. If none of the tools match, respond with EXACTLY:\n"
        '   {"tool": "none", "command": "", "explanation": "No suitable tool available"}\n\n'
        f"User request: {user_request}"
    )
    return prompt


async def smart_execute(user_request: str) -> dict:
    """Process a natural language request and execute the generated command."""
    model = await get_default_terminal_model()
    if not model or not model.get("provider_url"):
        return {
            "error": "Terminal AI is not configured. Set up a terminal model in Settings.",
            "tool": "none",
            "command": "",
        }

    # Get enabled tools
    tools = await get_enabled_tools()
    enabled_count = sum(1 for t in tools.values() if t.get("enabled"))
    if enabled_count == 0:
        return {
            "error": "All tools are disabled. Enable at least one in Settings.",
            "tool": "none",
            "command": "",
        }

    # Ask AI to generate the command
    prompt = build_tool_prompt(user_request, tools)

    url = f"{model['provider_url'].rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {model['api_key']}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model["model_name"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 512,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code != 200:
                return {
                    "error": f"AI API error: {response.status_code}",
                    "tool": "none",
                    "command": "",
                }

            data = response.json()
            ai_content = data["choices"][0]["message"]["content"].strip()

            # Parse AI response as JSON
            cmd_data = _parse_json_response(ai_content)
            if cmd_data.get("_parse_error"):
                return {
                    "error": "AI response could not be parsed",
                    "raw_response": ai_content[:500],
                    "tool": "none",
                    "command": "",
                }

            command = cmd_data.get("command", "").strip()
            tool_key = cmd_data.get("tool", "unknown")
            explanation = cmd_data.get("explanation", "")

            if not command or tool_key == "none":
                return {
                    "tool": tool_key,
                    "command": "",
                    "explanation": explanation or "No suitable command generated.",
                    "output": "",
                    "exit_code": 0,
                }

            # Safety check
            if not is_command_safe(command):
                return {
                    "error": "Generated command was blocked for safety.",
                    "command": command,
                    "explanation": explanation,
                    "tool": tool_key,
                }

            # Execute the command
            result = await execute_command(command)

            # Save command with source='ai_tool'
            from app.database import get_db
            db = await get_db()
            try:
                await db.execute(
                    "INSERT INTO commands (command, output, exit_code, source) VALUES (?, ?, ?, ?)",
                    (command, result.get("output", ""), result.get("exit_code", 0), "ai_tool"),
                )
                await db.commit()
            finally:
                await db.close()

            return {
                "tool": tool_key,
                "command": command,
                "explanation": explanation,
                "output": result.get("output", ""),
                "exit_code": result.get("exit_code", 0),
                "error": result.get("error"),
            }

    except httpx.ConnectError:
        return {"error": "Cannot connect to AI API", "tool": "none", "command": ""}
    except Exception as exc:
        return {"error": str(exc), "tool": "none", "command": ""}


async def summarize_with_ai(command: str, output: str, error: str, exit_code: int) -> dict:
    """Summarize terminal execution output using AI."""
    # If there was an error, return it directly
    if error:
        return {"summary": error, "command": command, "exit_code": exit_code}

    # If output is empty or too short, return a simple message
    if not output.strip():
        return {"summary": "The command produced no output.", "command": command, "exit_code": exit_code}

    # Get terminal model for summary
    model = await get_default_terminal_model()
    if not model or not model.get("provider_url"):
        return {
            "summary": output[:500],
            "command": command,
            "exit_code": exit_code,
        }

    prompt = (
        "You are a helpful assistant summarizing terminal output for a user. "
        "Describe in one or two sentences what this command did and what the key result was. "
        "Be concise and natural. Do not include technical jargon unless necessary. "
        f"\n\nCommand: {command}\n\nOutput:\n{output[:4000]}"
    )

    url = f"{model['provider_url'].rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {model['api_key']}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model["model_name"],
        "messages": [{"role": "user", "content": prompt}],
        "temperature": float(model.get("temperature", 0.7)),
        "max_tokens": int(model.get("max_tokens", 256)),
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code == 200:
                data = response.json()
                summary = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return {
                    "summary": summary.strip() or output[:500],
                    "command": command,
                    "exit_code": exit_code,
                }
            else:
                return {
                    "summary": output[:500],
                    "command": command,
                    "exit_code": exit_code,
                }
    except Exception:
        return {
            "summary": output[:500],
            "command": command,
            "exit_code": exit_code,
        }


async def smart_execute_with_summary(user_request: str) -> dict:
    """Execute terminal and then summarize the result via AI for chat integration."""
    # First, execute normally
    exec_result = await smart_execute(user_request)
    
    if exec_result.get("error") and not exec_result.get("output"):
        return exec_result  # Return early if no output

    # Get terminal model for summary
    model = await get_default_terminal_model()
    if not model or not model.get("provider_url"):
        # No summary available, return raw output
        return {
            **exec_result,
            "summary": f"执行了: {exec_result.get('command', '')}\n结果: {exec_result.get('output', '')[:500]}",
        }

    # Summarize the output
    output = exec_result.get("output", "")
    command = exec_result.get("command", "")
    
    if len(output) < 50:
        # Too short to summarize
        return {
            **exec_result,
            "summary": output,
        }

    summary_prompt = (
        "Summarize the following command output into a concise, natural summary. "
        "Present it as if you're telling a friend what you found. "
        "Don't list raw data. Extract key insights only. "
        "Use the user's language.\n\n"
        f"Command: {command}\n"
        f"Output:\n{output[:3000]}"
    )

    url = f"{model['provider_url'].rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {model['api_key']}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model["model_name"],
        "messages": [{"role": "user", "content": summary_prompt}],
        "temperature": 0.3,
        "max_tokens": 600,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code == 200:
                data = response.json()
                summary = data["choices"][0]["message"]["content"]
                return {
                    **exec_result,
                    "summary": summary,
                }
    except Exception:
        pass

    # Fallback: return truncated output
    return {
        **exec_result,
        "summary": f"[原始输出] {output[:300]}",
    }


def _parse_json_response(ai_content: str) -> dict:
    """Parse AI response, handling various formatting issues."""
    # Remove markdown code fences if present
    if ai_content.startswith("```"):
        lines = ai_content.split("\n")
        ai_content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    try:
        return json.loads(ai_content.strip())
    except json.JSONDecodeError:
        pass

    # Try to extract JSON from text
    start = ai_content.find("{")
    end = ai_content.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(ai_content[start:end])
        except json.JSONDecodeError:
            pass

    return {"_parse_error": True}


async def get_quick_actions() -> list[dict]:
    """Return predefined quick action templates for the UI."""
    tools = await get_enabled_tools()
    actions: list[dict] = []

    quick_templates: list[dict[str, str]] = [
        {"tool": "bili_search", "label": "Search Bilibili", "placeholder": "e.g. AI tutorial videos", "prompt_prefix": "Search Bilibili for: "},
        {"tool": "web_search", "label": "Web Search", "placeholder": "e.g. weather in Shanghai", "prompt_prefix": "Search the web for: "},
        {"tool": "file_find", "label": "Find Files", "placeholder": "e.g. PDF files in Downloads", "prompt_prefix": "Find files matching: "},
        {"tool": "install_pkg", "label": "Install Package", "placeholder": "e.g. ffmpeg", "prompt_prefix": "Install package: "},
        {"tool": "web_fetch", "label": "Fetch Webpage", "placeholder": "e.g. https://example.com", "prompt_prefix": "Fetch and read this webpage: "},
    ]

    for tmpl in quick_templates:
        tool = tools.get(tmpl["tool"])
        if tool and tool.get("enabled"):
            actions.append(tmpl)

    return actions
