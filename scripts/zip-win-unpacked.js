/**
 * 将 dist/win-unpacked 打成 zip，便于发给他人（解压即用，无需安装）
 * 使用方式：先 npm run electron:build，再 npm run electron:build:zip
 * 若报错「文件被占用」，请先关闭正在运行的 Reddit Insight Tool 再重试。
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const version = pkg.version;
const distDir = path.join(root, 'dist');
const unpackedDir = path.join(distDir, 'win-unpacked');
const zipName = `RedditInsightTool-${version}-win64.zip`;
const zipPath = path.join(distDir, zipName);

if (!fs.existsSync(unpackedDir)) {
  console.error('[zip] 错误：dist/win-unpacked 不存在，请先运行 npm run electron:build');
  process.exit(1);
}

// Windows 10+ 自带 tar，支持 -a 生成 zip，避免 PowerShell Compress-Archive 的文件占用问题
const isWin = process.platform === 'win32';
const zipPathNorm = path.normalize(zipPath);
const unpackedNorm = path.normalize(unpackedDir);

try {
  if (isWin) {
    execSync(`tar -a -c -f "${zipPathNorm}" -C "${unpackedNorm}" .`, {
      stdio: 'inherit',
      cwd: root,
      shell: true,
    });
  } else {
    execSync(`cd "${unpackedNorm}" && zip -r "${zipPathNorm}" .`, {
      stdio: 'inherit',
      shell: true,
    });
  }
  if (fs.existsSync(zipPath)) {
    const stat = fs.statSync(zipPath);
    const mb = (stat.size / (1024 * 1024)).toFixed(1);
    console.log('[zip] 已生成: ' + zipPath + ' (' + mb + ' MB)');
    console.log('[zip] 可将此压缩包发给他人，对方解压后运行「Reddit Insight Tool.exe」即可使用（免安装）。');
  } else {
    console.error('[zip] 压缩未生成文件，请关闭本应用后重试。');
    process.exit(1);
  }
} catch (e) {
  console.error('[zip] 压缩失败:', e.message);
  console.error('[zip] 若提示文件被占用，请先关闭 Reddit Insight Tool 再执行 npm run electron:build:zip');
  process.exit(1);
}
