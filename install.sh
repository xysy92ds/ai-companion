#!/data/data/com.termux/files/usr/bin/bash
# AI Companion v4 - 全自动安装脚本（Termux 专版）
# 修复项：
#   1. 增加自动拉取代码能力（git clone / curl / wget）
#   2. 增加 Termux 系统更新提示（解决 git-curl 符号表问题）
#   3. 去掉 pip --upgrade（Termux 禁止）
#   4. 自动修复 h11/uvicorn 兼容性
#   5. 更好的错误处理和回退策略

set -e

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_NAME="AI Companion"
PROJECT_DIR="$HOME/ai-companion"
GITHUB_REPO="https://github.com/xysy92ds/ai-companion.git"
GITEE_REPO="https://gitee.com/xysy92ds/ai-companion.git"
RELEASE_URL="https://github.com/xysy92ds/ai-companion/releases/download/v4/ai-companion-v4.tar.gz"

echo -e "${CYAN}================================${NC}"
echo -e "${CYAN}  $PROJECT_NAME v4 安装脚本${NC}"
echo -e "${CYAN}================================${NC}"
echo ""

# ========== 工具函数 ==========
print_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
print_err() { echo -e "${RED}[ERR]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# ========== 步骤1: 检查基础环境 ==========
print_info "[步骤 1/6] 检查基础环境..."

if ! command -v python &>/dev/null; then
    print_warn "未安装 Python，正在安装..."
    pkg install -y python
fi
print_ok "Python: $(python --version 2>&1 | awk '{print $2}')"

if ! command -v pip &>/dev/null; then
    print_warn "未安装 pip，正在修复..."
    python -m ensurepip --upgrade 2>/dev/null || pkg install -y python-pip
fi
print_ok "pip 已安装"

if ! command -v git &>/dev/null; then
    print_warn "未安装 Git，正在安装..."
    pkg install -y git
fi
print_ok "Git 已安装"

# ========== 关键修复: 检查 Termux 系统更新 ==========
print_info "[关键检查] 检查 Termux 包是否最新..."

# 检查 git 和 curl 是否版本兼容（这是反馈报告中的问题二）
GIT_OK=true
if ! git --version &>/dev/null 2>&1; then
    GIT_OK=false
elif ! /data/data/com.termux/files/usr/libexec/git-core/git-remote-https --version &>/dev/null 2>&1; then
    GIT_OK=false
fi

if [ "$GIT_OK" != "true" ]; then
    print_warn "检测到 Git/Curl 可能版本不匹配（Termux 常见问题）"
    print_warn "建议先执行系统更新:"
    echo ""
    echo "  pkg update && pkg upgrade -y"
    echo "  # 或换国内镜像:"
    echo "  termux-change-repo"
    echo "  pkg update && apt full-upgrade -y"
    echo ""
    echo -e "${YELLOW}是否立即执行系统更新？[y/N]${NC}"
    read -r answer
    if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
        print_info "正在更新系统..."
        pkg update -y && pkg upgrade -y
        print_ok "系统更新完成"
    else
        print_warn "跳过系统更新，如果后续报错请手动更新"
    fi
fi
echo ""

# ========== 步骤2: 获取项目代码 ==========
print_info "[步骤 2/6] 获取项目代码..."

if [ -d "$PROJECT_DIR" ]; then
    print_warn "检测到已存在项目目录"
    cd "$PROJECT_DIR"
    
    if [ -d ".git" ]; then
        print_info "正在从 GitHub 更新..."
        if git pull origin main 2>/dev/null || git pull origin master 2>/dev/null; then
            print_ok "代码已更新到最新"
        else
            print_warn "git pull 失败，保留现有代码"
        fi
    else
        print_warn "非 git 仓库，检查是否为解压包..."
        if [ -f "app/main.py" ] && [ -f "requirements.txt" ]; then
            print_ok "检测到完整项目文件，跳过下载"
        else
            print_err "项目目录不完整，建议删除后重新安装"
            echo -e "${YELLOW}是否删除旧目录并重新安装？[y/N]${NC}"
            read -r answer
            if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
                cd ~
                rm -rf "$PROJECT_DIR"
            else
                exit 1
            fi
        fi
    fi
else
    print_info "未检测到项目，开始自动下载..."
    
    # 尝试 git clone（优先）
    if command -v git &>/dev/null; then
        print_info "尝试 git clone..."
        if git clone "$GITHUB_REPO" "$PROJECT_DIR" 2>/dev/null; then
            print_ok "GitHub 克隆成功"
        elif git clone "$GITEE_REPO" "$PROJECT_DIR" 2>/dev/null; then
            print_ok "Gitee 镜像克隆成功"
        else
            print_warn "git clone 失败，尝试 curl 下载 release 包..."
        fi
    fi
    
    # 如果 git 失败，尝试 curl / wget 下载 release
    if [ ! -d "$PROJECT_DIR" ]; then
        if command -v curl &>/dev/null; then
            print_info "尝试 curl 下载 release..."
            cd /tmp
            if curl -L "$RELEASE_URL" -o ai-companion-v4.tar.gz 2>/dev/null; then
                print_ok "下载成功"
                cd ~
                tar xzf /tmp/ai-companion-v4.tar.gz
                print_ok "解压完成"
            else
                print_err "curl 下载失败"
            fi
        elif command -v wget &>/dev/null; then
            print_info "尝试 wget 下载 release..."
            cd /tmp
            if wget "$RELEASE_URL" -O ai-companion-v4.tar.gz 2>/dev/null; then
                print_ok "下载成功"
                cd ~
                tar xzf /tmp/ai-companion-v4.tar.gz
                print_ok "解压完成"
            else
                print_err "wget 下载失败"
            fi
        fi
    fi
    
    # 如果都失败了，给出手动安装指导
    if [ ! -d "$PROJECT_DIR" ]; then
        print_err "自动下载全部失败！"
        echo ""
        echo -e "${YELLOW}请手动获取代码：${NC}"
        echo "  方法1: git clone $GITHUB_REPO ~/ai-companion"
        echo "  方法2: 下载 release 包到手机，用 MT管理器解压到 ~/ai-companion"
        echo ""
        exit 1
    fi
fi
echo ""

# ========== 步骤3: 安装 Python 依赖 ==========
print_info "[步骤 3/6] 安装 Python 依赖..."

cd "$PROJECT_DIR"

# Termux 禁止 pip --upgrade，直接跳过
print_info "跳过 pip 自升级（Termux 限制）"

# 检查是否已安装核心依赖
NEEDS_INSTALL=false
for pkg in fastapi uvicorn httpx aiosqlite pydantic; do
    if ! python -c "import $pkg" 2>/dev/null; then
        NEEDS_INSTALL=true
        break
    fi
done

if [ "$NEEDS_INSTALL" = true ]; then
    print_info "检测到缺失依赖，开始安装..."
    if pip install -r requirements.txt; then
        print_ok "依赖安装成功"
    else
        print_err "批量安装失败，尝试逐个安装..."
        pip install fastapi==0.95.2 uvicorn==0.23.2 || true
        pip install httpx==0.27.2 aiosqlite==0.20.0 || true
        pip install pydantic==1.10.26 python-multipart==0.0.12 || true
        pip install PyPDF2==3.0.1 || true
        
        # 检查是否都装上了
        ALL_OK=true
        for pkg in fastapi uvicorn httpx aiosqlite pydantic; do
            if ! python -c "import $pkg" 2>/dev/null; then
                print_err "$pkg 安装失败"
                ALL_OK=false
            fi
        done
        
        if [ "$ALL_OK" != "true" ]; then
            print_err "部分依赖安装失败，请检查网络或手动安装"
            exit 1
        fi
    fi
else
    print_ok "核心依赖已安装，跳过"
fi
echo ""

# ========== 步骤4: 修复 h11/uvicorn 兼容性 ==========
print_info "[步骤 4/6] 修复 h11/uvicorn 兼容性..."

H11_FIXED=false
if python -c "
import h11
v = h11.__version__
if v == '0.13.0' or v.startswith('0.12'):
    exit(0)
exit(1)
" 2>/dev/null; then
    H11_FIXED=true
fi

if [ "$H11_FIXED" != "true" ]; then
    print_warn "h11 版本不兼容，降级到 0.13.0..."
    pip install 'h11==0.13.0' --force-reinstall 2>/dev/null || pip install 'h11==0.13.0'
    
    # 验证
    if python -c "import h11; print(h11.__version__)" 2>/dev/null | grep -q "0.13"; then
        print_ok "h11 已降级到 0.13.0"
    else
        print_warn "h11 降级可能未完全成功，如果启动报错请手动执行:"
        echo "  pip install 'h11==0.13.0' --force-reinstall"
    fi
else
    print_ok "h11 版本已兼容"
fi
echo ""

# ========== 步骤5: 设置权限 ==========
print_info "[步骤 5/6] 设置权限..."
cd "$PROJECT_DIR"
chmod +x run.sh install.sh manager.sh update.sh backup.sh 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true
print_ok "权限设置完成"
echo ""

# ========== 步骤6: 初始化数据库 ==========
print_info "[步骤 6/6] 初始化数据库..."
cd "$PROJECT_DIR"
export PYTHONPATH="$PROJECT_DIR"

if python -c "
import asyncio
from app.database import init_db
async def main():
    await init_db()
asyncio.run(main())
" 2>/dev/null; then
    print_ok "数据库初始化成功"
else
    print_warn "数据库初始化未成功（将在首次启动时自动重试）"
fi
echo ""

# ========== 完成 ==========
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${CYAN}启动命令:${NC}"
echo "  cd ~/ai-companion && ./run.sh"
echo ""
echo -e "${CYAN}访问地址:${NC}"
echo "  http://localhost:8000"
echo ""

# 询问是否立即启动
echo -e "${YELLOW}是否立即启动服务？[y/N]${NC}"
read -r answer
if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    cd "$PROJECT_DIR"
    ./run.sh
else
    echo -e "${BLUE}稍后启动: cd ~/ai-companion && ./run.sh${NC}"
fi
