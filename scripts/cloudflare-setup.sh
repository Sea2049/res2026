#!/bin/bash

# =============================================
# Cloudflare + 阿里云 ECS 部署脚本
# 用于快速配置 Nginx 和安全组
# =============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行此脚本"
    exit 1
fi

echo "========================================"
echo "  Cloudflare + 阿里云 ECS 部署脚本"
echo "========================================"
echo ""

# 获取用户输入
read -p "请输入你的域名（例如：example.com）: " DOMAIN
read -p "请输入 SSL 证书文件路径（.pem）: " SSL_CERT
read -p "请输入 SSL 私钥文件路径（.key）: " SSL_KEY

# 验证输入
if [ -z "$DOMAIN" ]; then
    print_error "域名不能为空"
    exit 1
fi

if [ ! -f "$SSL_CERT" ] || [ ! -f "$SSL_KEY" ]; then
    print_error "SSL 证书或私钥文件不存在"
    exit 1
fi

print_info "开始配置..."

# =============================================
# 1. 安装必要软件
# =============================================
print_info "步骤 1/6: 安装必要软件..."

if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
    print_success "Nginx 已安装"
else
    print_success "Nginx 已存在"
fi

if ! command -v docker &> /dev/null; then
    print_warning "Docker 未安装，请先安装 Docker"
    exit 1
else
    print_success "Docker 已安装"
fi

# =============================================
# 2. 配置 SSL 证书
# =============================================
print_info "步骤 2/6: 配置 SSL 证书..."

mkdir -p /etc/nginx/ssl
cp "$SSL_CERT" "/etc/nginx/ssl/${DOMAIN}.pem"
cp "$SSL_KEY" "/etc/nginx/ssl/${DOMAIN}.key"
chmod 600 "/etc/nginx/ssl/${DOMAIN}.key"
print_success "SSL 证书已配置"

# =============================================
# 3. 生成 Nginx 配置
# =============================================
print_info "步骤 3/6: 生成 Nginx 配置..."

cat > "/etc/nginx/sites-available/reddit-insight-tool" << EOF
# =============================================
# Reddit Insight Tool - Nginx 配置
# 适配 Cloudflare CDN + 阿里云 ECS
# 自动生成于 $(date)
# =============================================

upstream app_backend {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate /etc/nginx/ssl/${DOMAIN}.pem;
    ssl_certificate_key /etc/nginx/ssl/${DOMAIN}.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Cloudflare IPv4
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    
    # Cloudflare IPv6
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2c0f:f248::/32;
    set_real_ip_from 2a06:98c0::/29;
    
    real_ip_header CF-Connecting-IP;
    real_ip_recursive on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    access_log /var/log/nginx/reddit-insight-tool.access.log;
    error_log /var/log/nginx/reddit-insight-tool.error.log;
    
    location /_next/static/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    location /api/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
    }
    
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

print_success "Nginx 配置已生成"

# =============================================
# 4. 启用配置
# =============================================
print_info "步骤 4/6: 启用 Nginx 配置..."

# 删除默认配置（如果存在）
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
    print_info "已删除默认配置"
fi

# 创建软链接
ln -sf /etc/nginx/sites-available/reddit-insight-tool /etc/nginx/sites-enabled/

# 测试配置
if nginx -t; then
    print_success "Nginx 配置测试通过"
else
    print_error "Nginx 配置测试失败"
    exit 1
fi

# =============================================
# 5. 重启 Nginx
# =============================================
print_info "步骤 5/6: 重启 Nginx..."

systemctl restart nginx
systemctl enable nginx
print_success "Nginx 已重启并设置为开机自启"

# =============================================
# 6. 配置防火墙（UFW）
# =============================================
print_info "步骤 6/6: 配置防火墙..."

if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    print_success "防火墙规则已配置"
else
    print_warning "UFW 未安装，请手动配置防火墙"
fi

# =============================================
# 完成
# =============================================
echo ""
echo "========================================"
print_success "配置完成！"
echo "========================================"
echo ""
print_info "下一步操作："
echo "  1. 确保 Docker 容器正在运行："
echo "     docker-compose ps"
echo ""
echo "  2. 在 Cloudflare 控制台配置 DNS："
echo "     类型: A"
echo "     名称: @"
echo "     内容: $(curl -s ifconfig.me)"
echo "     代理状态: 已代理（橙色云）"
echo ""
echo "  3. 在 Cloudflare 设置 SSL 模式为 Full (strict)"
echo ""
echo "  4. 测试访问："
echo "     https://${DOMAIN}"
echo ""
print_info "查看日志："
echo "  - Nginx 访问日志: tail -f /var/log/nginx/reddit-insight-tool.access.log"
echo "  - Nginx 错误日志: tail -f /var/log/nginx/reddit-insight-tool.error.log"
echo "  - 应用日志: docker-compose logs -f app"
echo ""
print_success "部署完成！祝你使用愉快 🎉"
