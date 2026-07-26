#!/data/data/com.termux/files/usr/bin/bash
# AI Companion - 管理器 v3-beta
# 提供一个交互式菜单来管理应用

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$HOME/ai-companion"

print_header() {
    clear 2>/dev/null || true
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     AI Companion v3-beta 管理器      ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# 检查服务状态
check_status() {
    if pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
        echo -e "${GREEN}运行中${NC}"
        return 0
    else
        echo -e "${RED}已停止${NC}"
        return 1
    fi
}

# 显示主菜单
show_menu() {
    print_header
    
    local status=$(check_status)
    
    echo -e "${CYAN}状态:${NC} $status"
    echo ""
    echo -e "${YELLOW}【安装与启动】${NC}"
    echo "  1) 首次安装 / 重新安装"
    echo "  2) 启动服务"
    echo "  3) 停止服务"
    echo "  4) 重启服务"
    echo ""
    echo -e "${YELLOW}【更新与维护】${NC}"
    echo "  5) 检查更新"
    echo "  6) 执行更新"
    echo "  7) 回滚到上一版本"
    echo ""
    echo -e "${YELLOW}【数据管理】${NC}"
    echo "  8) 创建备份"
    echo "  9) 查看备份列表"
    echo " 10) 从备份恢复"
    echo " 11) 查看备份统计"
    echo ""
    echo -e "${YELLOW}【浏览器与快捷方式】${NC}"
    echo " 12) 在浏览器中打开应用"
    echo " 13) 添加到主屏幕 (PWA)"
    echo ""
    echo -e "${YELLOW}【其他】${NC}"
    echo " 14) 查看日志"
    echo " 15) 清理临时文件"
    echo " 16) 关于"
    echo ""
    echo "  0) 退出"
    echo ""
}

# 等待用户按键
wait_key() {
    echo ""
    read -p "按回车键继续..."
}

# 执行命令并显示结果
run_cmd() {
    local cmd="$1"
    local desc="$2"
    
    echo ""
    print_info "正在执行: $desc"
    echo ""
    
    if eval "$cmd"; then
        print_success "$desc 完成"
    else
        print_error "$desc 失败"
    fi
    
    wait_key
}

# 安装/重装
option_install() {
    print_header
    echo -e "${YELLOW}首次安装 / 重新安装${NC}"
    echo ""
    echo "这将自动："
    echo "  • 检查并安装系统依赖 (python, git)"
    echo "  • 从 GitHub 下载最新代码"
    echo "  • 安装 Python 依赖（自动处理版本冲突）"
    echo "  • 设置权限并启动服务"
    echo ""
    read -p "是否继续? (y/n): " confirm
    
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        if [ -f "$PROJECT_DIR/install.sh" ]; then
            cd "$PROJECT_DIR" && ./install.sh
        else
            print_error "未找到 install.sh"
            print_info "请确保项目已正确下载"
        fi
    fi
    wait_key
}

# 启动服务
option_start() {
    print_header
    if pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
        print_info "服务已在运行"
    else
        print_info "正在启动服务..."
        cd "$PROJECT_DIR"
        termux-wake-lock 2>/dev/null || true
        nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/ai-companion.log 2>&1 &
        sleep 2
        
        if pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
            print_success "服务已启动"
            print_info "访问: http://localhost:8000"
        else
            print_error "启动失败"
            print_info "查看日志: cat /tmp/ai-companion.log"
        fi
    fi
    wait_key
}

# 停止服务
option_stop() {
    print_header
    print_info "正在停止服务..."
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    termux-wake-unlock 2>/dev/null || true
    print_success "服务已停止"
    wait_key
}

# 重启服务
option_restart() {
    option_stop
    option_start
}

# 在浏览器打开
option_open_browser() {
    print_header
    print_info "正在打开浏览器..."
    
    # 检查服务是否运行
    if ! pgrep -f "uvicorn app.main:app" >/dev/null 2>&1; then
        print_warning "服务未运行，先启动服务..."
        option_start
        sleep 3
    fi
    
    # 尝试多种方式打开
    if command -v termux-open >/dev/null 2>&1; then
        termux-open "http://localhost:8000" 2>/dev/null && print_success "已打开浏览器"
    else
        am start -a android.intent.action.VIEW -d "http://localhost:8000" 2>/dev/null && print_success "已打开浏览器"
    fi
    
    wait_key
}

# 查看日志
option_logs() {
    print_header
    if [ -f "/tmp/ai-companion.log" ]; then
        echo -e "${CYAN}最近日志 (最后 50 行):${NC}"
        echo ""
        tail -n 50 /tmp/ai-companion.log
    else
        print_info "暂无日志"
    fi
    wait_key
}

# 关于
option_about() {
    print_header
    echo -e "${CYAN}AI Companion v3-beta${NC}"
    echo ""
    echo "一个手机端可运行的 AI 伙伴应用"
    echo ""
    echo -e "${CYAN}功能:${NC}"
    echo "  • AI 聊天（外接 API）"
    echo "  • 记忆系统（遗忘曲线、关系图）"
    echo "  • 知识库（向量检索）"
    echo "  • 智能终端（自然语言执行命令）"
    echo "  • 中英双语切换"
    echo "  • 多主题切换"
    echo ""
    echo -e "${CYAN}技术栈:${NC}"
    echo "  后端: Python 3.14 / FastAPI 0.95.2"
    echo "  前端: 原生 PWA"
    echo "  数据库: SQLite"
    echo ""
    echo -e "${CYAN}仓库:${NC} https://github.com/xysy92ds/ai-companion"
    echo ""
    wait_key
}

# 主循环
main() {
    while true; do
        show_menu
        read -p "请选择操作 [0-16]: " choice
        
        case $choice in
            1) option_install ;;
            2) option_start ;;
            3) option_stop ;;
            4) option_restart ;;
            5) run_cmd "cd $PROJECT_DIR && ./update.sh check" "检查更新" ;;
            6) run_cmd "cd $PROJECT_DIR && ./update.sh update" "执行更新" ;;
            7) run_cmd "cd $PROJECT_DIR && ./update.sh rollback" "版本回滚" ;;
            8) run_cmd "cd $PROJECT_DIR && ./backup.sh backup" "创建备份" ;;
            9) run_cmd "cd $PROJECT_DIR && ./backup.sh list" "查看备份列表" ;;
            10) run_cmd "cd $PROJECT_DIR && ./backup.sh restore" "从备份恢复" ;;
            11) run_cmd "cd $PROJECT_DIR && ./backup.sh stats" "备份统计" ;;
            12) option_open_browser ;;
            13) 
                print_header
                print_info "请手动操作:"
                echo "  1. 在 Chrome 中打开 http://localhost:8000"
                echo "  2. 点击菜单 (三个点)"
                echo "  3. 选择 '添加到主屏幕'"
                wait_key
                ;;
            14) option_logs ;;
            15) 
                print_header
                print_info "清理临时文件..."
                rm -f /tmp/ai-companion*.log
                rm -rf /tmp/ai-companion-restore-*
                print_success "清理完成"
                wait_key
                ;;
            16) option_about ;;
            0)
                print_header
                echo -e "${GREEN}感谢使用 AI Companion！${NC}"
                echo ""
                exit 0
                ;;
            *)
                print_error "无效选项"
                sleep 1
                ;;
        esac
    done
}

# 如果没有参数，显示菜单
if [ $# -eq 0 ]; then
    main
else
    # 支持命令行参数
    case "$1" in
        install) option_install ;;
        start) option_start ;;
        stop) option_stop ;;
        restart) option_restart ;;
        update) run_cmd "cd $PROJECT_DIR && ./update.sh update" "执行更新" ;;
        backup) run_cmd "cd $PROJECT_DIR && ./backup.sh backup" "创建备份" ;;
        open) option_open_browser ;;
        logs) option_logs ;;
        *)
            echo "用法: $0 [install|start|stop|restart|update|backup|open|logs]"
            exit 1
            ;;
    esac
fi
