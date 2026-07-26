#!/data/data/com.termux/files/usr/bin/bash
# AI Companion - 数据备份与恢复脚本 v3-beta
# 功能：备份数据库、配置、头像、聊天记录；支持自动备份和恢复

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$HOME/ai-companion"
BACKUP_BASE="$HOME/ai-companion-backups"
REMOTE_BACKUP_DIR="$HOME/ai-companion-remote-backups"
AUTO_BACKUP_INTERVAL_DAYS=7

print_header() {
    echo ""
    echo -e "${CYAN}=================================${NC}"
    echo -e "${CYAN}  AI Companion 数据备份${NC}"
    echo -e "${CYAN}=================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# 获取备份时间戳
get_timestamp() {
    date +%Y%m%d_%H%M%S
}

# 检查项目目录
 check_project() {
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "未找到项目目录: $PROJECT_DIR"
        print_info "请先运行 install.sh 安装项目"
        exit 1
    fi
}

# 创建备份
create_backup() {
    local backup_type="${1:-manual}"
    local timestamp=$(get_timestamp)
    local backup_name="${backup_type}_${timestamp}"
    local backup_path="$BACKUP_BASE/$backup_name"
    
    print_info "正在创建备份: $backup_name"
    
    mkdir -p "$backup_path"
    
    # 1. 备份数据库
    if [ -f "$PROJECT_DIR/data/companion.db" ]; then
        cp "$PROJECT_DIR/data/companion.db" "$backup_path/"
        local db_size=$(du -h "$backup_path/companion.db" | cut -f1)
        print_success "数据库已备份 ($db_size)"
    else
        print_warning "数据库文件不存在，跳过"
    fi
    
    # 2. 备份配置（JSON格式便于查看）
    if [ -f "$PROJECT_DIR/data/companion.db" ]; then
        if command -v sqlite3 &>/dev/null; then
            sqlite3 "$PROJECT_DIR/data/companion.db" "SELECT key, value FROM configs;" > "$backup_path/configs.txt" 2>/dev/null || true
            if [ -s "$backup_path/configs.txt" ]; then
                print_success "配置已导出"
            fi
        fi
    fi
    
    # 3. 备份头像
    if [ -f "$PROJECT_DIR/app/static/assets/ai-avatar.png" ]; then
        cp "$PROJECT_DIR/app/static/assets/ai-avatar.png" "$backup_path/"
        print_success "头像已备份"
    fi
    
    # 4. 备份上传的文档
    if [ -d "$PROJECT_DIR/data/uploads" ]; then
        local upload_count=$(find "$PROJECT_DIR/data/uploads" -type f | wc -l)
        if [ "$upload_count" -gt 0 ]; then
            cp -r "$PROJECT_DIR/data/uploads" "$backup_path/"
            print_success "上传文档已备份 ($upload_count 个文件)"
        fi
    fi
    
    # 5. 备份版本信息
    if [ -f "$PROJECT_DIR/.version" ]; then
        cp "$PROJECT_DIR/.version" "$backup_path/"
    fi
    
    # 6. 创建备份清单
    cat > "$backup_path/backup_info.txt" << EOF
AI Companion 备份
================
备份类型: $backup_type
备份时间: $(date)
时间戳: $timestamp

包含内容:
- 数据库 (companion.db)
- 配置 (configs.txt)
- 头像 (ai-avatar.png)
- 上传文档 (uploads/)

恢复方法:
1. 停止服务: pkill -f uvicorn
2. 恢复数据库: cp companion.db ~/ai-companion/data/
3. 恢复头像: cp ai-avatar.png ~/ai-companion/app/static/assets/
4. 恢复文档: cp -r uploads ~/ai-companion/data/
5. 重启服务: cd ~/ai-companion && ./run.sh
EOF
    
    print_success "备份完成: $backup_path"
    
    # 记录最新备份
    echo "$backup_path" > "$BACKUP_BASE/latest.txt"
    
    # 压缩备份
    print_info "正在压缩备份..."
    cd "$BACKUP_BASE"
    tar czf "${backup_name}.tar.gz" "$backup_name/"
    rm -rf "$backup_name"
    print_success "备份已压缩: ${backup_name}.tar.gz"
    
    # 清理旧备份
    cleanup_old_backups
    
    echo ""
    echo -e "${GREEN}备份文件位置:${NC}"
    echo "  $BACKUP_BASE/${backup_name}.tar.gz"
    echo ""
}

# 清理旧备份
cleanup_old_backups() {
    print_info "清理旧备份..."
    
    # 保留策略：
    # - 最近 7 天的每日备份
    # - 最近 4 周的每周备份
    # - 最近 3 个月的每月备份
    
    cd "$BACKUP_BASE"
    
    # 获取所有备份文件
    local all_backups=($(ls -1t *.tar.gz 2>/dev/null | grep "^backup_\|^auto_\|^manual_" || true))
    local total_count=${#all_backups[@]}
    
    if [ "$total_count" -le 20 ]; then
        print_info "备份数量 ($total_count) 在限制内，无需清理"
        return
    fi
    
    # 删除超过 30 天的自动备份
    local cutoff_date=$(date -d "30 days ago" +%Y%m%d 2>/dev/null || date -v-30d +%Y%m%d 2>/dev/null || echo "19700101")
    
    local deleted=0
    for backup in "${all_backups[@]}"; do
        # 提取日期部分 (backup_YYYYMMDD_HHMMSS.tar.gz -> YYYYMMDD)
        local backup_date=$(echo "$backup" | grep -oP '\d{8}' | head -1)
        
        if [ -n "$backup_date" ] && [ "$backup_date" -lt "$cutoff_date" ]; then
            # 只删除 auto_ 类型的旧备份，保留 manual_ 和 backup_ 类型的
            if [[ "$backup" == auto_* ]]; then
                rm -f "$backup"
                ((deleted++))
            fi
        fi
    done
    
    if [ "$deleted" -gt 0 ]; then
        print_info "已清理 $deleted 个旧自动备份"
    fi
    
    print_success "备份清理完成"
}

# 列出所有备份
list_backups() {
    print_info "可用备份列表:"
    echo ""
    
    if [ ! -d "$BACKUP_BASE" ] || [ -z "$(ls -1 "$BACKUP_BASE"/*.tar.gz 2>/dev/null)" ]; then
        print_warning "没有找到备份"
        return
    fi
    
    local i=1
    for backup in $(ls -1t "$BACKUP_BASE"/*.tar.gz 2>/dev/null); do
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local date=$(echo "$filename" | grep -oP '\d{8}_\d{6}' || echo "unknown")
        local formatted_date=$(echo "$date" | sed 's/\(....\)\(..\)\(..\)_\(..\)\(..\)\(..\)/\1-\2-\3 \4:\5:\6/')
        local type=$(echo "$filename" | cut -d_ -f1)
        
        echo -e "${CYAN}[$i]${NC} $filename"
        echo "    类型: $type | 大小: $size | 时间: $formatted_date"
        echo ""
        ((i++))
    done
}

# 恢复备份
restore_backup() {
    print_info "恢复备份"
    echo ""
    
    # 列出备份
    list_backups
    
    if [ ! -d "$BACKUP_BASE" ] || [ -z "$(ls -1 "$BACKUP_BASE"/*.tar.gz 2>/dev/null)" ]; then
        print_error "没有可用的备份"
        return 1
    fi
    
    echo -e "${YELLOW}请输入要恢复的备份编号 (或按 Ctrl+C 取消):${NC}"
    read -p "> " backup_num
    
    local backups=($(ls -1t "$BACKUP_BASE"/*.tar.gz 2>/dev/null))
    local selected="${backups[$((backup_num - 1))]}"
    
    if [ -z "$selected" ] || [ ! -f "$selected" ]; then
        print_error "无效的备份编号"
        return 1
    fi
    
    local filename=$(basename "$selected")
    print_info "选择的备份: $filename"
    
    # 确认
    echo ""
    echo -e "${RED}警告: 恢复将覆盖当前数据！${NC}"
    read -p "是否继续? (输入 'yes' 确认): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_info "取消恢复"
        return 0
    fi
    
    # 停止服务
    print_info "停止服务..."
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    sleep 2
    
    # 创建当前数据的安全备份
    local safety_backup="$BACKUP_BASE/pre_restore_$(get_timestamp).tar.gz"
    print_info "创建安全备份..."
    cd "$PROJECT_DIR"
    tar czf "$safety_backup" data/ app/static/assets/ai-avatar.png 2>/dev/null || true
    print_success "安全备份已创建: $(basename "$safety_backup")"
    
    # 解压备份
    print_info "解压备份..."
    local temp_dir="/tmp/ai-companion-restore-$(get_timestamp)"
    mkdir -p "$temp_dir"
    tar xzf "$selected" -C "$temp_dir"
    
    # 找到解压后的目录
    local extracted_dir=$(ls -1 "$temp_dir" | head -n1)
    local full_extracted="$temp_dir/$extracted_dir"
    
    # 恢复文件
    if [ -f "$full_extracted/companion.db" ]; then
        mkdir -p "$PROJECT_DIR/data"
        cp "$full_extracted/companion.db" "$PROJECT_DIR/data/"
        print_success "数据库已恢复"
    fi
    
    if [ -f "$full_extracted/ai-avatar.png" ]; then
        cp "$full_extracted/ai-avatar.png" "$PROJECT_DIR/app/static/assets/"
        print_success "头像已恢复"
    fi
    
    if [ -d "$full_extracted/uploads" ]; then
        mkdir -p "$PROJECT_DIR/data"
        rm -rf "$PROJECT_DIR/data/uploads"
        cp -r "$full_extracted/uploads" "$PROJECT_DIR/data/"
        print_success "上传文档已恢复"
    fi
    
    # 清理临时目录
    rm -rf "$temp_dir"
    
    print_success "恢复完成！"
    echo ""
    print_info "请手动启动服务: cd ~/ai-companion && ./run.sh"
}

# 自动备份（用于 cron 定时任务）
auto_backup() {
    print_info "执行自动备份..."
    create_backup "auto"
}

# 导出为 SQL（兼容外部数据库）
export_sql() {
    print_info "导出数据库为 SQL..."
    
    if [ ! -f "$PROJECT_DIR/data/companion.db" ]; then
        print_error "数据库不存在"
        return 1
    fi
    
    if ! command -v sqlite3 &>/dev/null; then
        print_error "未安装 sqlite3 命令"
        pkg install -y sqlite
    fi
    
    local export_file="$BACKUP_BASE/companion_export_$(get_timestamp).sql"
    sqlite3 "$PROJECT_DIR/data/companion.db" ".dump" > "$export_file"
    
    print_success "SQL 导出完成: $export_file"
}

# 设置定时自动备份
setup_auto_backup() {
    print_info "设置自动备份..."
    
    # 检查是否安装了 cron
    if ! command -v crontab &>/dev/null; then
        print_info "安装 cron..."
        pkg install -y cronie
    fi
    
    # 启动 crond
    crond 2>/dev/null || true
    
    # 添加定时任务（每周执行一次）
    local cron_cmd="0 3 * * 0 cd $PROJECT_DIR && ./backup.sh auto >> /tmp/ai-companion-backup.log 2>&1"
    
    # 检查是否已有该任务
    if crontab -l 2>/dev/null | grep -q "ai-companion-backup"; then
        print_info "自动备份任务已存在"
    else
        (crontab -l 2>/dev/null; echo "$cron_cmd # ai-companion-backup") | crontab -
        print_success "自动备份已设置 (每周日 3:00)"
    fi
}

# 显示备份统计
backup_stats() {
    print_info "备份统计"
    echo ""
    
    if [ ! -d "$BACKUP_BASE" ]; then
        print_warning "没有备份目录"
        return
    fi
    
    local total_backups=$(ls -1 "$BACKUP_BASE"/*.tar.gz 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_BASE" 2>/dev/null | cut -f1)
    local latest_backup=$(cat "$BACKUP_BASE/latest.txt" 2>/dev/null || echo "无")
    
    echo -e "${CYAN}总备份数:${NC} $total_backups"
    echo -e "${CYAN}总占用空间:${NC} $total_size"
    echo -e "${CYAN}最新备份:${NC} $(basename "$latest_backup" 2>/dev/null || echo "无")"
    echo ""
    
    if [ "$total_backups" -gt 0 ]; then
        echo -e "${CYAN}备份列表:${NC}"
        ls -1t "$BACKUP_BASE"/*.tar.gz 2>/dev/null | while read f; do
            local name=$(basename "$f")
            local size=$(du -h "$f" | cut -f1)
            echo "  $name ($size)"
        done
    fi
    echo ""
}

# 主函数
main() {
    print_header
    check_project
    
    case "${1:-backup}" in
        backup|create)
            create_backup "manual"
            ;;
        auto)
            auto_backup
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_backup
            ;;
        export)
            export_sql
            ;;
        stats)
            backup_stats
            ;;
        setup)
            setup_auto_backup
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        help|--help|-h)
            echo "用法: $0 [backup|auto|list|restore|export|stats|setup|cleanup]"
            echo ""
            echo "  backup    - 创建手动备份（默认）"
            echo "  auto      - 创建自动备份"
            echo "  list      - 列出所有备份"
            echo "  restore   - 从备份恢复"
            echo "  export    - 导出数据库为 SQL"
            echo "  stats     - 显示备份统计"
            echo "  setup     - 设置定时自动备份"
            echo "  cleanup   - 清理旧备份"
            ;;
        *)
            print_error "未知命令: $1"
            echo "使用 '$0 help' 查看帮助"
            ;;
    esac
}

main "$@"
