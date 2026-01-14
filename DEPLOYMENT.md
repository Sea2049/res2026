# 阿里云部署指南

本指南介绍如何将 Reddit Insight Tool 部署到阿里云 ECS 服务器。

## 📋 目录

- [部署架构](#部署架构)
- [阿里云 ECS 创建](#阿里云-ecs-创建)
- [服务器环境准备](#服务器环境准备)
- [部署步骤](#部署步骤)
- [域名配置](#域名配置)
- [SSL 证书配置](#ssl-证书配置)
- [运维管理](#运维管理)

---

## 🏗 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                        阿里云 ECS                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Docker Container                      │ │
│  │  ┌─────────────────────────────────────────────────┐    │ │
│  │  │           Reddit Insight Tool (Port 3000)       │    │ │
│  │  └─────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Nginx (Port 80/443)                   │ │
│  │         反向代理 + SSL 终止 + 静态资源缓存                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────┴────┐          ┌─────┴─────┐          ┌─────┴─────┐
   │ 用户(HTTP)│          │  用户(HTTPS)│          │  用户(HTTPS)│
   └──────────┘          └───────────┘          └───────────┘
```

## ☁️ 阿里云 ECS 创建

### 1. 购买 ECS 实例

1. 登录 [阿里云 ECS 控制台](https://ecs.console.aliyun.com/)
2. 点击 **实例与镜像** > **实例**
3. 点击 **创建实例**
4. 选择配置：

| 配置项 | 推荐选择 |
|--------|----------|
| **付费模式** | 按量付费（测试）/ 包年包月（生产） |
| **地域** | 选择靠近目标用户的地域 |
| **实例规格** | 2 vCPU 2 GB 以上（推荐 4 vCPU 4 GB） |
| **镜像** | Ubuntu 22.04 LTS 64位 |
| **带宽** | 1 Mbps 起（根据流量调整） |

### 2. 安全组配置

在 ECS 实例页面，点击 **安全组** > **配置规则**，添加以下端口：

| 协议 | 端口范围 | 用途 |
|------|----------|------|
| TCP | 80 | HTTP 服务 |
| TCP | 443 | HTTPS 服务 |
| TCP | 22 | SSH 远程连接 |
| TCP | 3000 | 应用端口（仅内部） |

## 🖥 服务器环境准备

### 1. 连接服务器

```bash
# 使用 SSH 连接（替换为你的公网 IP）
ssh root@你的ECS公网IP
```

### 2. 安装 Docker

```bash
# 更新系统
apt update && apt upgrade -y

# 安装必要依赖
apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -

# 添加 Docker 仓库
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# 安装 Docker
apt update && apt install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
systemctl start docker
systemctl enable docker

# 添加当前用户到 docker 组（免 sudo 执行 docker）
usermod -aG docker $USER
```

### 3. 安装 Docker Compose

```bash
# 下载 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 4. 安装 Nginx（可选）

```bash
# 安装 Nginx
apt install -y nginx

# 启动 Nginx
systemctl start nginx
systemctl enable nginx
```

## 🚀 部署步骤

### 方式一：从 GitHub 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/Sea2049/res2026.git
cd res2026

# 2. 创建环境变量文件
cp .env.production .env.production.local
# 编辑环境变量（可选）
nano .env.production.local

# 3. 构建并启动容器
docker-compose -f docker-compose.yml up -d --build

# 4. 查看启动状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f app
```

### 方式二：使用预构建镜像

```bash
# 1. 创建目录
mkdir -p /app && cd /app

# 2. 下载部署文件
git clone https://github.com/Sea2049/res2026.git
cd res2026

# 3. 只运行容器（不构建）
docker-compose -f docker-compose.yml up -d
```

### 验证部署

```bash
# 检查容器状态
docker-compose ps

# 检查应用健康状态
curl http://localhost:3000

# 查看应用日志
docker-compose logs -f app
```

## 🌐 域名配置

### 1. 域名解析

1. 登录阿里云 [云解析 DNS 控制台](https://dns.console.aliyun.com/)
2. 选择你的域名，点击 **解析设置**
3. 添加记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| A | @ | 你的ECS公网IP | 10分钟 |
| A | www | 你的ECS公网IP | 10分钟 |

### 2. 配置 Nginx 反向代理

创建 `/etc/nginx/sites-available/reddit-insight-tool`：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向到 HTTPS（申请 SSL 后启用）
    # return 301 https://$server_name$request_uri;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/reddit-insight-tool /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

## 🔒 SSL 证书配置

### 方式一：使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 申请证书（自动配置 Nginx）
certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
certbot renew --dry-run
```

### 方式二：使用阿里云 SSL 证书

1. 登录 [SSL 证书控制台](https://yundun.console.aliyun.com/)
2. 购买/申请免费证书
3. 下载证书文件（ Nginx 格式）
4. 上传证书到服务器：

```bash
# 创建证书目录
mkdir -p /etc/nginx/ssl

# 上传证书文件（使用 SCP 或 FTP）
# 将证书文件上传到 /etc/nginx/ssl/

# 编辑 Nginx 配置
nano /etc/nginx/sites-available/reddit-insight-tool
```

添加 HTTPS 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # 强制跳转 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/your-domain.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;
    ssl_session_timeout 5m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 运维管理

### 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看应用日志
docker-compose logs -f app

# 重启应用
docker-compose restart app

# 停止应用
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 更新应用
git pull origin main
docker-compose -f docker-compose.yml up -d --build

# 查看资源使用情况
docker stats
```

### 监控与日志

```bash
# 查看实时日志
docker-compose logs -f --tail=100

# 查看应用健康状态
curl http://localhost:3000/api/health

# 检查磁盘使用
df -h

# 检查 Docker 磁盘使用
docker system df
```

### 备份策略

```bash
# 创建备份脚本
cat > /app/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/app/backups
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份 docker-compose.yml 和环境变量
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    docker-compose.yml \
    .env.production.local

echo "Backup created: $BACKUP_DIR/config_$DATE.tar.gz"
EOF

chmod +x /app/backup.sh

# 添加定时任务（每天凌晨 3 点备份）
crontab -e
# 添加：
# 0 3 * * * /app/backup.sh
```

### 自动更新（Watchtower）

```bash
# 安装 Watchtower（自动检测镜像更新）
docker run -d \
    --name watchtower \
    -v /var/run/docker.sock:/var/run/docker.sock \
    containrrr/watchtower \
    reddit-insight-tool-app-1 \
    --interval 3600  # 每小时检查一次
```

## ❓ 常见问题

### 1. 容器无法启动

```bash
# 查看详细错误
docker-compose logs app

# 检查端口占用
netstat -tlnp | grep 3000
```

### 2. 内存不足

```bash
# 查看内存使用
free -m

# 增加 Swap 分区
dd if=/dev/zero of=/swapfile bs=1M count=2048
mkswap /swapfile
swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab
```

### 3. 构建失败

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

## 📞 技术支持

- **GitHub Issues**: https://github.com/Sea2049/res2026/issues
- **项目文档**: 查看 [README.md](README.md) 和 [FRAMEWORK.md](FRAMEWORK.md)

---

**部署愉快！** 🎉
