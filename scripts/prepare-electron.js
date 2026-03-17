/**
 * Electron 打包前准备脚本
 * 将 Next.js standalone 构建产物复制到 electron-resources 目录
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STANDALONE_SRC = path.join(ROOT, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT, 'public');
const TARGET = path.join(ROOT, 'electron-resources', 'standalone');
const TARGET_STATIC = path.join(TARGET, '.next', 'static');

/**
 * 递归复制目录
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[prepare] 源目录不存在: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 清理目标目录
 */
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[prepare] 已清理: ${dir}`);
  }
}

// 主流程
console.log('[prepare] 开始准备 Electron 打包资源...');

// 1. 检查 standalone 目录是否存在
if (!fs.existsSync(STANDALONE_SRC)) {
  console.error('[prepare] 错误：找不到 .next/standalone 目录。请先运行 npm run build');
  process.exit(1);
}

// 2. 清理并复制 standalone
cleanDir(TARGET);
console.log(`[prepare] 正在复制 standalone -> ${TARGET}`);
copyDirSync(STANDALONE_SRC, TARGET);

// 3. 复制 .next/static 到 standalone/.next/static（Next.js standalone 需要）
if (fs.existsSync(STATIC_SRC)) {
  console.log(`[prepare] 正在复制 .next/static -> ${TARGET_STATIC}`);
  copyDirSync(STATIC_SRC, TARGET_STATIC);
} else {
  console.warn('[prepare] 警告：.next/static 目录不存在');
}

// 4. 复制 public 到 standalone/public
if (fs.existsSync(PUBLIC_SRC)) {
  const targetPublic = path.join(TARGET, 'public');
  console.log(`[prepare] 正在复制 public -> ${targetPublic}`);
  copyDirSync(PUBLIC_SRC, targetPublic);
}

// 5. 清理 standalone 中可能残留的环境变量文件，避免敏感信息被打包
const envFilesToRemove = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.production.local',
  '.env.development.local',
  '.env.test.local',
];
for (const filename of envFilesToRemove) {
  const envPath = path.join(TARGET, filename);
  if (fs.existsSync(envPath)) {
    fs.rmSync(envPath, { force: true });
    console.log(`[prepare] 已移除敏感文件: ${filename}`);
  }
}

console.log('[prepare] Electron 打包资源准备完成！');
console.log(`[prepare] 资源目录: ${TARGET}`);

// 统计文件数
function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      count += countFiles(path.join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

console.log(`[prepare] 总文件数: ${countFiles(TARGET)}`);
