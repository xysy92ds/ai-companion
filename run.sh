#!/data/data/com.termux/files/usr/bin/bash
# AI Companion v4 - 一键启动脚本
# 修复: 绕过 uvicorn CLI 的 click/h11 兼容性问题，使用 python app/main.py 启动

cd "$(dirname "$0")"

# 防止设备休眠
termux-wake-lock 2>/dev/null || true

# 检查 Python
if ! command -v python &>/dev/null; then
    echo "[错误] 未找到 Python。请先运行 ./install.sh"
    exit 1
fi

# 检查核心依赖
NEEDS_INSTALL=false
python -c "import fastapi" 2>/dev/null || NEEDS_INSTALL=true
python -c "import uvicorn" 2>/dev/null || NEEDS_INSTALL=true
python -c "import httpx" 2>/dev/null || NEEDS_INSTALL=true
python -c "import aiosqlite" 2>/dev/null || NEEDS_INSTALL=true
python -c "import pydantic" 2>/dev/null || NEEDS_INSTALL=true

if [ "$NEEDS_INSTALL" = true ]; then
    echo "========================================"
    echo "  首次运行: 正在安装依赖..."
    echo "  这可能需要几分钟"
    echo "========================================"
    pip install -r requirements.txt
    if [ $? -ne 0 ]; then
        echo ""
        echo "[错误] 依赖安装失败！请手动执行:"
        echo "  pip install fastapi==0.95.2 uvicorn==0.23.2"
        echo "  pip install httpx==0.27.2 aiosqlite==0.20.0"
        echo "  pip install pydantic==1.10.26 python-multipart==0.0.12"
        echo "  pip install PyPDF2==3.0.1"
        exit 1
    fi
    echo "依赖安装成功！"
fi

# ========== 关键修复: h11 兼容性检查 ==========
# uvicorn 0.23.2 + h11 0.14+ 不兼容，启动前自动修复
python -c "
import h11
v = h11.__version__
if v not in ('0.13.0', '0.12.0'):
    import sys
    print(f'[警告] h11 {v} 与 uvicorn 0.23.2 不兼容')
    print('[提示] 请运行: pip install h11==0.13.0')
    sys.exit(1)
" 2>/dev/null || {
    echo "[警告] 检测到 h11 版本不兼容，正在自动修复..."
    pip install 'h11==0.13.0' --force-reinstall 2>/dev/null
}

# 设置环境
export PYTHONPATH="$(pwd)"
export AI_COMPANION_HOST="0.0.0.0"
export AI_COMPANION_PORT="8000"

echo "================================"
echo "  AI Companion v4 启动中..."
echo "  访问: http://localhost:8000"
echo "================================"
echo ""

# ========== 关键修复: 绕过 uvicorn CLI，直接用 Python 启动 ==========
# python -m uvicorn 会经过 click CLI 解析参数，h11 新版本会报错
# 直接用 python app/main.py 启动，避开 click，app/main.py 末尾有 uvicorn.run()
python app/main.py
