"""Application configuration and paths."""

import os
from pathlib import Path

# Base directory: the ai-companion project root
BASE_DIR = Path(__file__).resolve().parent.parent

# Data directory for SQLite database and local files
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Database path
DB_PATH = DATA_DIR / "companion.db"

# Static files directory
STATIC_DIR = BASE_DIR / "app" / "static"

# Server configuration
HOST = os.environ.get("AI_COMPANION_HOST", "0.0.0.0")
PORT = int(os.environ.get("AI_COMPANION_PORT", "8000"))

# Default personality (used when no personality is configured)
DEFAULT_PERSONALITY = {
    "name": "小助",
    "description": "一个温暖、有趣且忠诚的通用 AI 伙伴。喜欢在手机或电脑上陪你聊天，关心你的生活。",
    "greeting": "嘿！我在呢~ 今天想聊点什么？",
    "tone": "friendly",
    "traits": ["幽默", "耐心", "好奇", "细心"],
    "system_prompt": "",
}

# Default summary schedule (hours between auto-summaries)
DEFAULT_SUMMARY_CONFIG = {
    "enabled": True,
    "interval_hours": 24,
    "min_messages": 10,
}

# Knowledge base settings
KB_CHUNK_SIZE = 500  # characters per text chunk
KB_CHUNK_OVERLAP = 50  # overlap between chunks
KB_MAX_RESULTS = 5  # max search results to return

# Default embedding API config (for knowledge base document chunking)
DEFAULT_EMBEDDING_CONFIG = {
    "provider_url": "",
    "api_key": "",
    "model_name": "",
    "temperature": 0.8,
    "max_tokens": 2048,
}

# AI smart terminal tools registry
TOOL_REGISTRY = {
    "bili_search": {
        "name": "Bilibili Search",
        "description": "Search videos on Bilibili",
        "enabled": True,
        "instruction": (
            "To search Bilibili videos, use:\n"
            'curl -s "https://api.bilibili.com/x/web-interface/search/all/v2?keyword=KEYWORD" '
            "| python3 -c \"import sys,json; data=json.load(sys.stdin); [print(r.get('title',''),r.get('bvid',''),r.get('play','')) for r in data.get('data',{}).get('result',[])[:10]]\""
        ),
    },
    "web_search": {
        "name": "Web Search",
        "description": "Search the web for information",
        "enabled": True,
        "instruction": (
            "To search the web, use:\n"
            'curl -sL "https://www.google.com/search?q=KEYWORD" -H "User-Agent: Mozilla/5.0" | '
            "python3 -c \"import sys; from html.parser import HTMLParser; print(sys.stdin.read()[:2000])\""
        ),
    },
    "file_find": {
        "name": "Find Files",
        "description": "Search for files on device",
        "enabled": True,
        "instruction": (
            "To find files, use:\n"
            'find /sdcard -name "PATTERN" -type f 2>/dev/null | head -20'
        ),
    },
    "install_pkg": {
        "name": "Install Package",
        "description": "Install packages via pkg/pip",
        "enabled": True,
        "instruction": (
            "To install packages, use:\n"
            "pkg install -y PACKAGE_NAME  (for system packages)\n"
            "pip install PACKAGE_NAME  (for Python packages)"
        ),
    },
    "web_fetch": {
        "name": "Fetch Webpage",
        "description": "Download and read webpage content",
        "enabled": True,
        "instruction": (
            "To fetch a webpage, use:\n"
            'curl -sL "URL" -H "User-Agent: Mozilla/5.0" | python3 -c "import sys,html; from html.parser import HTMLParser; '
            'class P(HTMLParser):\n  def __init__(s):\n    super().__init__(); s.t=[]\n  def handle_data(s,d):\n    s.t.append(d)\n'
            'p=P(); p.feed(sys.stdin.read()); print(\" \".join(p.t)[:3000])"'
        ),
    },
}

# Terminal command execution settings
MAX_COMMAND_TIMEOUT = 30  # seconds
BLOCKED_COMMANDS = [
    "rm -rf /",
    "mkfs",
    "dd if=",
    "shutdown",
    "reboot",
    "halt",
    "init 0",
    "init 6",
]

# Upload directory for knowledge base documents and avatars
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Summary keywords for auto-trigger in chat
TERMINAL_TRIGGER_KEYWORDS = [
    "搜索", "查找", "网上", "网页", "网络", "上网",
    "找一下", "帮我找", "查一下", "查查",
    "search", "find", "lookup", "web", "internet", "online",
    "bilibili", "b站", "比站",
]
