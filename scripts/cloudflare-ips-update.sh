#!/bin/bash

# =============================================
# Cloudflare IP 地址段自动更新脚本
# 定期从 Cloudflare 获取最新的 IP 地址段
# =============================================

set -e

# 配置
NGINX_CONFIG="/etc/nginx/sites-available/reddit-insight-tool"
TEMP_FILE="/tmp/cloudflare-ips.txt"
BACKUP_DIR="/etc/nginx/backups"

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# 检查权限
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行"
    exit 1
fi

print_info "开始更新 Cloudflare IP 地址段..."

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份当前配置
BACKUP_FILE="${BACKUP_DIR}/nginx-config-$(date +%Y%m%d_%H%M%S).bak"
cp "$NGINX_CONFIG" "$BACKUP_FILE"
print_success "已备份配置: $BACKUP_FILE"

# 获取 Cloudflare IPv4 地址段
print_info "获取 Cloudflare IPv4 地址段..."
curl -s https://www.cloudflare.com/ips-v4 > "${TEMP_FILE}.v4"

# 获取 Cloudflare IPv6 地址段
print_info "获取 Cloudflare IPv6 地址段..."
curl -s https://www.cloudflare.com/ips-v6 > "${TEMP_FILE}.v6"

# 检查是否成功获取
if [ ! -s "${TEMP_FILE}.v4" ] || [ ! -s "${TEMP_FILE}.v6" ]; then
    print_error "获取 Cloudflare IP 失败"
    rm -f "${TEMP_FILE}.v4" "${TEMP_FILE}.v6"
    exit 1
fi

print_success "成功获取 Cloudflare IP 地址段"

# 生成新的 set_real_ip_from 配置
print_info "生成新配置..."

{
    echo "    # Cloudflare IPv4 地址段（自动更新于 $(date)）"
    while read -r ip; do
        echo "    set_real_ip_from $ip;"
    done < "${TEMP_FILE}.v4"
    echo ""
    echo "    # Cloudflare IPv6 地址段"
    while read -r ip; do
        echo "    set_real_ip_from $ip;"
    done < "${TEMP_FILE}.v6"
} > "${TEMP_FILE}.config"

# 更新 Nginx 配置
# 查找并替换 set_real_ip_from 部分
awk '
/# Cloudflare IPv4/ {
    skip=1
    system("cat '"${TEMP_FILE}.config"'")
    next
}
/real_ip_header/ {
    skip=0
}
!skip {
    print
}
' "$NGINX_CONFIG" > "${NGINX_CONFIG}.new"

# 验证新配置
if nginx -t -c /etc/nginx/nginx.conf -q 2>/dev/null; then
    mv "${NGINX_CONFIG}.new" "$NGINX_CONFIG"
    print_success "配置已更新"
    
    # 重载 Nginx
    print_info "重载 Nginx..."
    systemctl reload nginx
    print_success "Nginx 已重载"
    
    # 显示统计
    IPV4_COUNT=$(wc -l < "${TEMP_FILE}.v4")
    IPV6_COUNT=$(wc -l < "${TEMP_FILE}.v6")
    print_success "已添加 $IPV4_COUNT 个 IPv4 地址段和 $IPV6_COUNT 个 IPv6 地址段"
else
    print_error "配置验证失败，已回滚"
    rm "${NGINX_CONFIG}.new"
    exit 1
fi

# 清理临时文件
rm -f "${TEMP_FILE}.v4" "${TEMP_FILE}.v6" "${TEMP_FILE}.config"

# 清理旧备份（保留最近 10 个）
print_info "清理旧备份..."
ls -t "$BACKUP_DIR"/nginx-config-*.bak | tail -n +11 | xargs -r rm
print_success "更新完成！"

echo ""
print_info "提示：可以将此脚本添加到 crontab 定期执行："
echo "  crontab -e"
echo "  0 0 * * 0 /path/to/cloudflare-ips-update.sh  # 每周日凌晨更新"
