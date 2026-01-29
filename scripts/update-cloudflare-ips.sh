#!/bin/bash

# =============================================
# Cloudflare IP 自动更新脚本
# 用途：自动更新 Nginx 配置中的 Cloudflare IP 段
# 使用：./update-cloudflare-ips.sh
# 定时任务：0 0 * * 0 /app/scripts/update-cloudflare-ips.sh
# =============================================

set -e

# 配置
NGINX_CONF="/etc/nginx/sites-available/reddit-insight-tool"
NGINX_BACKUP="/etc/nginx/sites-available/reddit-insight-tool.backup"
IPV4_URL="https://www.cloudflare.com/ips-v4"
IPV6_URL="https://www.cloudflare.com/ips-v6"
TEMP_CONF="/tmp/nginx-cloudflare-ips.conf"

echo "=========================================="
echo "Cloudflare IP 更新脚本"
echo "时间: $(date)"
echo "=========================================="

# 检查 Nginx 配置文件是否存在
if [ ! -f "$NGINX_CONF" ]; then
    echo "错误: Nginx 配置文件不存在: $NGINX_CONF"
    exit 1
fi

# 备份当前配置
echo "1. 备份当前配置..."
cp "$NGINX_CONF" "$NGINX_BACKUP"
echo "   备份完成: $NGINX_BACKUP"

# 下载 Cloudflare IP 段
echo "2. 下载 Cloudflare IP 段..."
IPV4_IPS=$(curl -s "$IPV4_URL")
IPV6_IPS=$(curl -s "$IPV6_URL")

if [ -z "$IPV4_IPS" ] || [ -z "$IPV6_IPS" ]; then
    echo "错误: 无法下载 Cloudflare IP 段"
    exit 1
fi

echo "   IPv4 IP 段数量: $(echo "$IPV4_IPS" | wc -l)"
echo "   IPv6 IP 段数量: $(echo "$IPV6_IPS" | wc -l)"

# 生成新的 set_real_ip_from 配置
echo "3. 生成新配置..."
NEW_IP_CONFIG=""

# 添加 IPv4
while IFS= read -r ip; do
    [ -z "$ip" ] && continue
    NEW_IP_CONFIG="${NEW_IP_CONFIG}    set_real_ip_from ${ip};\n"
done <<< "$IPV4_IPS"

# 添加注释
NEW_IP_CONFIG="${NEW_IP_CONFIG}    \n    # IPv6\n"

# 添加 IPv6
while IFS= read -r ip; do
    [ -z "$ip" ] && continue
    NEW_IP_CONFIG="${NEW_IP_CONFIG}    set_real_ip_from ${ip};\n"
done <<< "$IPV6_IPS"

# 替换配置文件中的 IP 段
echo "4. 更新配置文件..."
awk -v new_config="$NEW_IP_CONFIG" '
BEGIN { in_section = 0; printed = 0 }
/# Cloudflare 真实 IP 获取/ { in_section = 1; print; next }
/set_real_ip_from/ { 
    if (in_section && !printed) {
        printf "%s", new_config
        printed = 1
    }
    next 
}
/real_ip_header/ { in_section = 0 }
{ print }
' "$NGINX_CONF" > "$TEMP_CONF"

# 验证新配置
echo "5. 验证配置..."
if nginx -t -c /etc/nginx/nginx.conf 2>&1 | grep -q "test is successful"; then
    echo "   配置验证成功"
else
    echo "错误: 配置验证失败，恢复备份"
    cp "$NGINX_BACKUP" "$NGINX_CONF"
    nginx -t
    exit 1
fi

# 应用新配置
echo "6. 应用新配置..."
mv "$TEMP_CONF" "$NGINX_CONF"

# 重载 Nginx
echo "7. 重载 Nginx..."
if systemctl reload nginx; then
    echo "   Nginx 重载成功"
else
    echo "错误: Nginx 重载失败，恢复备份"
    cp "$NGINX_BACKUP" "$NGINX_CONF"
    systemctl reload nginx
    exit 1
fi

# 清理
rm -f "$TEMP_CONF"

echo "=========================================="
echo "Cloudflare IP 更新完成！"
echo "=========================================="

# 显示当前配置的 IP 数量
IP_COUNT=$(grep -c "set_real_ip_from" "$NGINX_CONF" || true)
echo "当前配置的 IP 段数量: $IP_COUNT"

exit 0
