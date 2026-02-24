import { app, BrowserWindow, shell, Menu, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess, execFileSync } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';

const PORT = 3001;
const HOST = '127.0.0.1';
const isDev = process.env.ELECTRON_DEV === 'true';

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;
let logLines: string[] = [];

type ThemeMode = 'light' | 'dark';
let currentThemeMode: ThemeMode = 'light';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function getThemeConfigPath(): string {
  return path.join(app.getPath('userData'), 'theme-config.json');
}

function getThemeModeFromStore(): ThemeMode {
  try {
    const configPath = getThemeConfigPath();
    if (!fs.existsSync(configPath)) return 'light';
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { themeMode?: unknown };
    return isThemeMode(parsed?.themeMode) ? parsed.themeMode : 'light';
  } catch {
    return 'light';
  }
}

function setThemeModeToStore(mode: ThemeMode) {
  try {
    const configPath = getThemeConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ themeMode: mode }, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

function broadcastThemeMode(mode: ThemeMode) {
  currentThemeMode = mode;
  setThemeModeToStore(mode);
  // 刷新菜单 radio 勾选状态
  createMenu();
  if (mainWindow) {
    mainWindow.webContents.send('theme-mode-changed', mode);
  }
}

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logLines.push(line);
  console.log(line);
}

function getLogPath(): string {
  return path.join(app.getPath('userData'), 'startup.log');
}

function flushLog(): void {
  try {
    fs.writeFileSync(getLogPath(), logLines.join('\n'), 'utf-8');
  } catch {}
}

/**
 * 获取用户数据目录
 */
function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * 查找系统 Node.js 可执行文件（备选方案）
 */
function findSystemNode(): string | null {
  const candidates = process.platform === 'win32'
    ? [
        'node',
        'node.exe',
        path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'nodejs', 'node.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'nodejs', 'node.exe'),
        path.join(process.env['LOCALAPPDATA'] || '', 'Programs', 'nodejs', 'node.exe'),
      ]
    : ['node'];

  for (const p of candidates) {
    try {
      execFileSync(p, ['-e', 'process.exit(0)'], { stdio: 'ignore', timeout: 3000 });
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 获取 Next.js standalone 服务器路径
 */
function getServerPath(): string {
  if (isDev) {
    return path.join(app.getAppPath(), '.next', 'standalone', 'server.js');
  }
  return path.join(process.resourcesPath, 'standalone', 'server.js');
}

/**
 * 获取 Next.js standalone 的工作目录
 */
function getServerCwd(): string {
  if (isDev) {
    return path.join(app.getAppPath(), '.next', 'standalone');
  }
  return path.join(process.resourcesPath, 'standalone');
}

/**
 * 检测本地常见代理端口，返回第一个可用的代理地址
 */
function detectLocalProxy(): string | null {
  const commonPorts = [7897, 7890, 7891, 1080, 10808, 10809];
  const net = require('net');
  for (const port of commonPorts) {
    try {
      const socket = new net.Socket();
      socket.setTimeout(300);
      const connected = new Promise<boolean>((resolve) => {
        socket.connect(port, '127.0.0.1', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
      });
      // 同步检测不太好做，改用文件标记或直接用已知端口
      // 这里用简单的同步 TCP 探测
      const child = require('child_process');
      const result = child.spawnSync('node', ['-e', `
        const s = require('net').createConnection({host:'127.0.0.1',port:${port},timeout:500});
        s.on('connect',()=>{console.log('OK');s.destroy()});
        s.on('error',()=>{console.log('FAIL');process.exit(1)});
        s.on('timeout',()=>{console.log('FAIL');s.destroy();process.exit(1)});
      `], { timeout: 2000, encoding: 'utf-8' });
      if (result.stdout?.trim() === 'OK') {
        return `http://127.0.0.1:${port}`;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * 构建 Next.js 服务器需要的环境变量
 */
function buildServerEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(PORT),
    HOSTNAME: HOST,
    // Electron 桌面版跳过邀请码校验
    DISABLE_INVITE_CHECK: 'true',
    RUNTIME_TARGET: 'electron',
  };

  // 如果用户在 userData 目录放了自定义 .env，加载它
  const userEnvPath = path.join(getUserDataPath(), '.env');
  if (fs.existsSync(userEnvPath)) {
    log('加载用户环境变量: ' + userEnvPath);
    const lines = fs.readFileSync(userEnvPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.substring(0, eqIndex).trim();
          const value = trimmed.substring(eqIndex + 1).trim();
          env[key] = value;
        }
      }
    }
  } else {
    log('未找到用户环境变量文件: ' + userEnvPath);
    // 自动创建 .env 模板，方便用户配置 AI 功能
    try {
      const template = [
        '# Reddit Insight Tool 配置文件',
        '# 通义千问 API 配置（用于 AI 深度洞见功能）',
        '# 获取 API Key: https://bailian.console.aliyun.com/',
        '# QWEN_API_KEY=sk-your-api-key-here',
        '',
        '# 本地代理（如 Clash，可选）',
        '# HTTP_PROXY=http://127.0.0.1:7897',
      ].join('\n');
      fs.writeFileSync(userEnvPath, template, 'utf-8');
      log('已创建 .env 模板文件: ' + userEnvPath);
    } catch (e) {
      log('创建 .env 模板失败: ' + String(e));
    }
  }

  // 检查 AI 功能所需的 API Key 是否已配置
  if (env.QWEN_API_KEY) {
    log('QWEN_API_KEY 已配置');
  } else {
    log('警告: QWEN_API_KEY 未配置，AI 深度洞见功能将不可用。请在以下路径配置: ' + userEnvPath);
  }

  // 自动检测本地代理（Clash 等），如果没有手动配置 HTTP_PROXY
  if (!env.HTTP_PROXY) {
    const proxy = detectLocalProxy();
    if (proxy) {
      env.HTTP_PROXY = proxy;
      log('自动检测到本地代理: ' + proxy);
    }
  } else {
    log('使用用户配置的代理: ' + env.HTTP_PROXY);
  }

  return env;
}

/**
 * 等待 Next.js 服务器就绪
 */
function waitForServer(maxRetries = 60, interval = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const check = () => {
      const req = http.get(`http://${HOST}:${PORT}/`, (res) => {
        // 任何响应都认为服务器已启动（包括重定向到 /invite）
        res.resume();
        resolve();
      });

      req.on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error(`Next.js 服务器在 ${maxRetries * interval / 1000} 秒内未能启动`));
        } else {
          setTimeout(check, interval);
        }
      });

      req.setTimeout(2000, () => {
        req.destroy();
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Next.js 服务器启动超时'));
        } else {
          setTimeout(check, interval);
        }
      });
    };

    check();
  });
}

/**
 * 用给定的 Node 运行时启动 server.js
 */
function spawnServer(
  nodeBin: string,
  serverPath: string,
  serverCwd: string,
  env: NodeJS.ProcessEnv,
  extraEnv?: Record<string, string>,
): ChildProcess {
  const merged = { ...env, ...(extraEnv || {}) };
  log(`spawn: ${nodeBin} ${serverPath}`);
  log(`  cwd = ${serverCwd}`);
  if (extraEnv) log(`  extraEnv = ${JSON.stringify(extraEnv)}`);

  const child = spawn(nodeBin, [serverPath], {
    cwd: serverCwd,
    env: merged,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  child.stdout?.on('data', (data: Buffer) => {
    log(`[Next.js stdout] ${data.toString().trim()}`);
  });
  child.stderr?.on('data', (data: Buffer) => {
    log(`[Next.js stderr] ${data.toString().trim()}`);
  });
  child.on('error', (err) => {
    log(`[spawn error] ${err.message}`);
  });
  child.on('exit', (code) => {
    log(`[Next.js exit] code=${code}`);
  });

  return child;
}

/**
 * 启动 Next.js 服务器子进程（带双重策略）
 */
function startNextServer(): void {
  if (isDev) {
    log('开发模式 - 假设 Next.js dev server 已运行在端口 ' + PORT);
    return;
  }

  const serverPath = getServerPath();
  const serverCwd = getServerCwd();

  if (!fs.existsSync(serverPath)) {
    log('找不到 Next.js 服务器文件: ' + serverPath);
    app.quit();
    return;
  }

  log('服务器路径: ' + serverPath);
  log('工作目录: ' + serverCwd);
  log('process.execPath: ' + process.execPath);

  const env = buildServerEnv();

  // 策略 1：用系统 Node.js（如果可用），这是最可靠的方式
  const systemNode = findSystemNode();
  if (systemNode) {
    log('找到系统 Node.js: ' + systemNode);
    nextProcess = spawnServer(systemNode, serverPath, serverCwd, env);
  } else {
    // 策略 2：用 Electron 自身作为 Node 运行时
    log('未找到系统 Node.js，使用 ELECTRON_RUN_AS_NODE 模式');
    nextProcess = spawnServer(
      process.execPath,
      serverPath,
      serverCwd,
      env,
      { ELECTRON_RUN_AS_NODE: '1' },
    );
  }
}

/**
 * 停止 Next.js 服务器子进程
 */
function stopNextServer(): void {
  if (nextProcess) {
    console.log('[Electron] 正在停止 Next.js 服务器...');
    // Windows 下使用 taskkill 确保子进程树被终止
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(nextProcess.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
    } else {
      nextProcess.kill('SIGTERM');
    }
    nextProcess = null;
  }
}

/**
 * 创建应用菜单
 */
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开数据目录',
          click: () => {
            shell.openPath(getUserDataPath());
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        {
          label: '主题',
          submenu: [
            {
              label: '浅色',
              type: 'radio',
              checked: currentThemeMode === 'light',
              click: () => broadcastThemeMode('light'),
            },
            {
              label: '深色',
              type: 'radio',
              checked: currentThemeMode === 'dark',
              click: () => broadcastThemeMode('dark'),
            },
            { type: 'separator' },
            {
              label: '设置…',
              accelerator: 'CmdOrCtrl+,',
              click: () => {
                if (mainWindow) mainWindow.webContents.send('open-settings');
              },
            },
          ],
        },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 Reddit Insight Tool',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于',
              message: 'Reddit Insight Tool',
              detail: `版本: 2.71.0\n\n发现热门主题，洞察用户痛点，智能优先级分析。\n\n使用 Reddit 公开 JSON API，仅供个人本地使用。`,
            });
          },
        },
        {
          label: 'GitHub 仓库',
          click: () => {
            shell.openExternal('https://github.com/Sea2049/res2026');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 创建主窗口
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Reddit Insight Tool',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // 确保渲染端拿到初始主题（避免监听器注册时机导致丢消息）
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-mode-changed', currentThemeMode);
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme-mode-changed', currentThemeMode);
    }
  });

  // 外部链接在默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  ipcMain.handle('get-version', () => app.getVersion());

  // 初始化主题（默认浅色），并允许渲染端读取/写入主进程持久化设置
  currentThemeMode = getThemeModeFromStore();
  ipcMain.handle('get-theme-mode', () => currentThemeMode);
  ipcMain.handle('set-theme-mode', (_event, mode: unknown) => {
    if (!isThemeMode(mode)) return false;
    broadcastThemeMode(mode);
    return true;
  });

  ipcMain.handle('export-pdf', async (_event, html: string, defaultFilename: string) => {
    try {
      const win = BrowserWindow.getFocusedWindow() ?? mainWindow;
      const opts = {
        title: '保存 PDF 报告',
        defaultPath: path.join(app.getPath('documents'), defaultFilename),
        filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      };
      const saveResult = win
        ? await dialog.showSaveDialog(win, opts)
        : await dialog.showSaveDialog(opts);

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, error: 'cancelled' };
      }

      const pdfWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      await pdfWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      );

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { top: 0.47, bottom: 0.47, left: 0.47, right: 0.47 },
      });

      pdfWindow.destroy();

      fs.writeFileSync(saveResult.filePath, pdfBuffer);
      shell.showItemInFolder(saveResult.filePath);

      return { success: true, path: saveResult.filePath };
    } catch (error) {
      log('PDF导出失败: ' + String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  createMenu();

  log('应用启动, version=' + app.getVersion());
  log('resourcesPath=' + process.resourcesPath);
  log('appPath=' + app.getAppPath());
  log('userData=' + getUserDataPath());

  startNextServer();

  try {
    log('等待 Next.js 服务器就绪...');
    await waitForServer();
    log('Next.js 服务器已就绪');
    flushLog();
    createWindow();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log('启动失败: ' + errMsg);
    flushLog();
    dialog.showErrorBox(
      '启动失败',
      `无法启动内置服务器。\n\n错误: ${errMsg}\n\n日志文件: ${getLogPath()}\n\n最后 10 行日志:\n${logLines.slice(-10).join('\n')}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopNextServer();
  app.quit();
});

app.on('before-quit', () => {
  stopNextServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
