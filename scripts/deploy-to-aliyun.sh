#!/bin/bash

# =============================================
# 一键部署到阿里云 ECS 脚本
# 从本地推送代码到服务器并自动部署
# =============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 配置（请根据实际情况修改）
SERVER_IP="${1:-your-server-ip}"
SERVER_USER="${2:-root}"
SERVER_PATH="/opt/res2026"
SSH_KEY="${3:-~/.ssh/id_rsa}"

# 验证参数
if [ "$SERVER_IP" = "your-server-ip" ]; then
    print_error "请提供服务器 IP 地址"
    echo ""
    echo "使用方法："
    echo "  $0 <服务器IP> [用户名] [SSH密钥路径]"
    echo ""
    echo "示例："
    echo "  $0 123.456.789.0"
    echo "  $0 123.456.789.0 root ~/.ssh/id_rsa"
    exit 1
fi

echo "========================================"
echo "  一键部署到阿里云 ECS"
echo "========================================"
echo ""
print_info "目标服务器: ${SERVER_USER}@${SERVER_IP}"
print_info "部署路径: ${SERVER_PATH}"
echo ""

# 检查 SSH 连接
print_info "检查 SSH 连接..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 "${SERVER_USER}@${SERVER_IP}" "echo 'SSH连接成功'" > /dev/null 2>&1; then
    print_success "SSH 连接正常"
else
    print_error "无法连接到服务器，请检查："
    echo "  1. 服务器 IP 是否正确"
    echo "  2. SSH 密钥是否正确"
    echo "  3. 服务器是否允许 SSH 连接"
    exit 1
fi

# 确认部署
read -p "是否继续部署？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "部署已取消"
    exit 0
fi

# =============================================
# 步骤 1：本地构建检查
# =============================================
print_info "步骤 1/5: 检查本地环境..."

if [ ! -f "package.json" ]; then
    print_error "当前目录不是项目根目录"
    exit 1
fi

print_success "项目结构验证通过"

# =============================================
# 步骤 2：推送代码到服务器
# =============================================
print_info "步骤 2/5: 推送代码到服务器..."

# 创建临时压缩包（排除不必要的文件）
TEMP_FILE="/tmp/res2026-deploy-$(date +%s).tar.gz"
print_info "创建部署包..."

tar -czf "$TEMP_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='dist-build' \
    --exclude='coverage' \
    --exclude='*.log' \
    .

print_success "部署包已创建: $TEMP_FILE"

# 上传到服务器
print_info "上传到服务器..."
scp -i "$SSH_KEY" "$TEMP_FILE" "${SERVER_USER}@${SERVER_IP}:/tmp/"
print_success "上传完成"

# 清理本地临时文件
rm "$TEMP_FILE"

# =============================================
# 步骤 3：在服务器上解压并部署
# =============================================
print_info "步骤 3/5: 在服务器上部署..."

ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" << 'EOF'
set -e

echo "解压部署包..."
mkdir -p /opt/res2026
cd /opt/res2026

# 备份当前版本
if [ -d ".git" ]; then
    echo "备份当前版本..."
    BACKUP_DIR="/opt/backups/res2026-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r .env.production.local docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
    echo "已备份到: $BACKUP_DIR"
fi

# 解压新版本
tar -xzf /tmp/res2026-deploy-*.tar.gz -C /opt/res2026/
rm /tmp/res2026-deploy-*.tar.gz

echo "部署包已解压"
EOF

print_success "服务器部署完成"

# =============================================
# 步骤 4：构建和启动 Docker 容器
# =============================================
print_info "步骤 4/5: 构建和启动容器..."

ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" << 'EOF'
set -e

cd /opt/res2026

# 检查环境变量文件
if [ ! -f ".env.production.local" ]; then
    echo "警告: .env.production.local 不存在，使用默认配置"
    cp .env.production.cloudflare .env.production.local 2>/dev/null || cp .env.production .env.production.local
fi

# 停止旧容器
echo "停止旧容器..."
docker-compose down 2>/dev/null || true

# 构建新镜像
echo "构建新镜像..."
docker-compose build --no-cache

# 启动容器
echo "启动容器..."
docker-compose up -d

# 等待容器启动
echo "等待容器启动..."
sleep 5

# 检查容器状态
echo "检查容器状态..."
docker-compose ps

# 检查应用健康状态
echo "检查应用健康状态..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✓ 应用已成功启动"
else
    echo "✗ 应用启动失败，请检查日志"
    docker-compose logs --tail=50 app
    exit 1
fi
EOF

print_success "容器已启动"

# =============================================
# 步骤 5：验证部署
# =============================================
print_info "步骤 5/5: 验证部署..."

# 获取服务器上的容器状态
CONTAINER_STATUS=$(ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" "cd ${SERVER_PATH} && docker-compose ps -q app | xargs docker inspect -f '{{.State.Status}}'")

if [ "$CONTAINER_STATUS" = "running" ]; then
    print_success "容器运行正常"
else
    print_error "容器状态异常: $CONTAINER_STATUS"
    exit 1
fi

# =============================================
# 完成
# =============================================
echo ""
echo "========================================"
print_success "部署完成！"
echo "========================================"
echo ""
print_info "后续操作："
echo "  1. 查看应用日志："
echo "     ssh ${SERVER_USER}@${SERVER_IP} 'cd ${SERVER_PATH} && docker-compose logs -f app'"
echo ""
echo "  2. 访问应用（如果已配置域名）："
echo "     https://yourdomain.com"
echo ""
echo "  3. 清除 Cloudflare 缓存（如需要）："
echo "     在 Cloudflare 控制台清除缓存"
echo ""
print_success "部署成功！🎉"
