#!/bin/bash

# =============================================
# 手动配置 Nginx for Cloudflare
# 在服务器上直接运行此脚本
# =============================================

set -e

echo "======================================"
echo "  Cloudflare Nginx 配置脚本"
echo "======================================"
echo ""

# 获取域名
read -p "请输入域名（如 example.com）: " DOMAIN
read -p "请输入 SSL 证书路径（.pem）: " SSL_CERT
read -p "请输入 SSL 私钥路径（.key）: " SSL_KEY

if [ -z "$DOMAIN" ]; then
    echo "错误: 域名不能为空"
    exit 1
fi

echo ""
echo "开始配置..."

# 1. 创建 SSL 目录
echo "创建 SSL 目录..."
mkdir -p /etc/nginx/ssl

# 2. 复制 SSL 证书（如果提供）
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo "复制 SSL 证书..."
    cp "$SSL_CERT" "/etc/nginx/ssl/${DOMAIN}.pem"
    cp "$SSL_KEY" "/etc/nginx/ssl/${DOMAIN}.key"
    chmod 600 "/etc/nginx/ssl/${DOMAIN}.key"
    echo "✓ SSL 证书已配置"
else
    echo "警告: SSL 证书文件不存在，将使用占位符"
    echo "请稍后手动配置 SSL 证书"
fi

# 3. 创建 Nginx 配置
echo "创建 Nginx 配置..."
cat > /etc/nginx/sites-available/reddit-insight-tool << EOF
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
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Cloudflare IP 地址段
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
    
    real_ip_header CF-Connecting-IP;
    real_ip_recursive on;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    access_log /var/log/nginx/reddit-insight-tool.access.log;
    error_log /var/log/nginx/reddit-insight-tool.error.log;
    
    location /_next/static/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    location /api/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
    }
    
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo "✓ Nginx 配置已创建"

# 4. 启用配置
echo "启用 Nginx 配置..."
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/reddit-insight-tool /etc/nginx/sites-enabled/

# 5. 测试配置
echo "测试 Nginx 配置..."
if nginx -t; then
    echo "✓ Nginx 配置测试通过"
    
    # 6. 重启 Nginx
    echo "重启 Nginx..."
    systemctl restart nginx
    systemctl enable nginx
    echo "✓ Nginx 已重启"
else
    echo "✗ Nginx 配置测试失败"
    exit 1
fi

echo ""
echo "======================================"
echo "✓ 配置完成！"
echo "======================================"
echo ""
echo "下一步："
echo "1. 在 Cloudflare 配置 DNS："
echo "   类型: A, 名称: @, 内容: $(curl -s ifconfig.me), 代理: 已代理"
echo ""
echo "2. 设置 SSL 模式为 Full (strict)"
echo ""
echo "3. 测试访问: https://${DOMAIN}"
echo ""
