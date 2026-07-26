#!/data/data/com.termux/files/usr/bin/bash
# AI Companion - 自动更新脚本 v3-beta
# 功能：检测更新、备份数据、自动升级、版本回滚

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$HOME/ai-companion"
GITHUB_REPO="https://github.com/xysy92ds/ai-companion.git"
BACKUP_DIR="$HOME/ai-companion-backups"
VERSION_FILE="$PROJECT_DIR/.version"

print_header() {
    echo ""
    echo -e "${CYAN}=================================${NC}"
    echo -e "${CYAN}  AI Companion 自动更新${NC}"
    echo -e "${CYAN}=================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# 获取当前版本
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "unknown"
    fi
}

# 获取远程最新版本
get_remote_version() {
    # 尝试从 GitHub 获取最新 release 标签
    local version=$(curl -s "https://api.github.com/repos/xysy92ds/ai-companion/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$version" ] || [ "$version" = "null" ]; then
        echo "unknown"
    else
        echo "$version"
    fi
}

# 检查是否需要更新
check_update() {
    print_info "正在检查更新..."
    
    local current=$(get_current_version)
    local remote=$(get_remote_version)
    
    print_info "当前版本: $current"
    print_info "最新版本: $remote"
    
    if [ "$current" = "$remote" ] || [ "$remote" = "unknown" ]; then
        if [ "$remote" = "unknown" ]; then
            print_warning "无法获取远程版本，跳过更新检查"
            return 1
        fi
        print_success "当前已是最新版本"
        return 1
    fi
    
    print_info "发现新版本: $remote"
    return 0
}

# 备份数据
backup_data() {
    print_info "正在备份数据..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="backup_${timestamp}"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    # 备份数据库
    if [ -d "$PROJECT_DIR/data" ]; then
        cp -r "$PROJECT_DIR/data" "$backup_path/"
        print_success "数据库已备份"
    fi
    
    # 备份配置（从数据库导出）
    if [ -f "$PROJECT_DIR/data/companion.db" ]; then
        # 使用 sqlite3 导出配置表
        if command -v sqlite3 &>/dev/null; then
            sqlite3 "$PROJECT_DIR/data/companion.db" ".dump configs" > "$backup_path/configs.sql" 2>/dev/null || true
        fi
    fi
    
    # 备份头像
    if [ -f "$PROJECT_DIR/app/static/assets/ai-avatar.png" ]; then
        cp "$PROJECT_DIR/app/static/assets/ai-avatar.png" "$backup_path/"
        print_success "头像已备份"
    fi
    
    # 备份版本信息
    echo "$(get_current_version)" > "$backup_path/version.txt"
    
    print_success "备份完成: $backup_path"
    echo "$backup_path" > "$BACKUP_DIR/latest_backup.txt"
    
    # 清理旧备份（保留最近 10 个）
    local backup_count=$(ls -1 "$BACKUP_DIR" | grep "^backup_" | wc -l)
    if [ "$backup_count" -gt 10 ]; then
        ls -1t "$BACKUP_DIR" | grep "^backup_" | tail -n +11 | while read old_backup; do
            rm -rf "$BACKUP_DIR/$old_backup"
        done
        print_info "已清理旧备份"
    fi
}

# 执行更新
perform_update() {
    print_info "正在执行更新..."
    
    cd "$PROJECT_DIR"
    
    # 停止服务
    print_info "停止当前服务..."
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    sleep 2
    
    # 保存当前版本用于回滚
    local current_version=$(get_current_version)
    echo "$current_version" > "$PROJECT_DIR/.version.backup"
    
    # 拉取最新代码
    print_info "拉取最新代码..."
    if git pull origin main; then
        print_success "代码更新完成"
    else
        print_error "git pull 失败"
        print_info "尝试重置并重新拉取..."
        git fetch origin
        git reset --hard origin/main
        print_success "代码已重置到最新版本"
    fi
    
    # 更新依赖
    print_info "更新依赖..."
    pip install -r requirements.txt --no-cache-dir
    print_success "依赖更新完成"
    
    # 更新版本文件
    local new_version=$(get_remote_version)
    echo "$new_version" > "$VERSION_FILE"
    
    print_success "更新完成！新版本: $new_version"
}

# 回滚到上一个版本
rollback() {
    print_warning "正在回滚到上一个版本..."
    
    if [ ! -f "$PROJECT_DIR/.version.backup" ]; then
        print_error "没有找到备份版本信息，无法回滚"
        return 1
    fi
    
    local backup_version=$(cat "$PROJECT_DIR/.version.backup")
    print_info "回滚到版本: $backup_version"
    
    # 恢复数据库
    local latest_backup=$(cat "$BACKUP_DIR/latest_backup.txt" 2>/dev/null || echo "")
    if [ -n "$latest_backup" ] && [ -d "$latest_backup" ]; then
        if [ -d "$latest_backup/data" ]; then
            rm -rf "$PROJECT_DIR/data"
            cp -r "$latest_backup/data" "$PROJECT_DIR/"
            print_success "数据已恢复"
        fi
        
        if [ -f "$latest_backup/ai-avatar.png" ]; then
            cp "$latest_backup/ai-avatar.png" "$PROJECT_DIR/app/static/assets/"
            print_success "头像已恢复"
        fi
    fi
    
    # 恢复版本标记
    echo "$backup_version" > "$VERSION_FILE"
    
    print_success "回滚完成"
}

# 更新并启动
update_and_start() {
    if check_update; then
        echo ""
        read -p "是否执行更新? (y/n): " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            backup_data
            if perform_update; then
                print_info "正在重启服务..."
                cd "$PROJECT_DIR"
                ./run.sh &
                print_success "服务已重启"
                print_info "请访问: http://localhost:8000"
            else
                print_error "更新失败，尝试回滚..."
                rollback
            fi
        else
            print_info "取消更新"
        fi
    fi
}

# 主函数
main() {
    print_header
    
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "未找到项目目录，请先运行 install.sh"
        exit 1
    fi
    
    case "${1:-check}" in
        check)
            check_update
            ;;
        update)
            update_and_start
            ;;
        backup)
            backup_data
            ;;
        rollback)
            rollback
            ;;
        *)
            echo "用法: $0 [check|update|backup|rollback]"
            echo ""
            echo "  check    - 检查是否有更新"
            echo "  update   - 执行更新（自动备份并重启）"
            echo "  backup   - 仅备份数据"
            echo "  rollback - 回滚到上一个版本"
            ;;
    esac
}

main "$@"
