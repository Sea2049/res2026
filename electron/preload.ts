import { contextBridge, ipcRenderer } from 'electron';

/**
 * 预加载脚本
 * 通过 contextBridge 安全地暴露 Electron API 到渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** 获取平台信息 */
  platform: process.platform,

  /** 获取应用版本 */
  getVersion: async (): Promise<string> => {
    const version = await ipcRenderer.invoke('get-version');
    return typeof version === 'string' && version.length > 0 ? version : '2.71.0';
  },

  /** 检测是否运行在 Electron 环境 */
  isElectron: true,

  /** 导出 PDF 报告（通过主进程 printToPDF） */
  exportPdf: async (html: string, defaultFilename: string): Promise<{ success: boolean; path?: string; error?: string }> => {
    return ipcRenderer.invoke('export-pdf', html, defaultFilename);
  },

  /** 获取当前主题模式（主进程持久化） */
  getThemeMode: async (): Promise<'light' | 'dark'> => {
    const mode = await ipcRenderer.invoke('get-theme-mode');
    return mode === 'dark' ? 'dark' : 'light';
  },

  /** 设置主题模式（会广播到渲染端并刷新菜单勾选） */
  setThemeMode: async (mode: 'light' | 'dark'): Promise<boolean> => {
    return ipcRenderer.invoke('set-theme-mode', mode);
  },

  /** 监听主进程主题变更（来自菜单切换） */
  onThemeModeChange: (cb: (mode: 'light' | 'dark') => void): (() => void) => {
    const handler = (_event: unknown, mode: 'light' | 'dark') => cb(mode);
    ipcRenderer.on('theme-mode-changed', handler);
    return () => ipcRenderer.removeListener('theme-mode-changed', handler);
  },

  /** 监听主进程请求打开设置（来自菜单） */
  onOpenSettings: (cb: () => void): (() => void) => {
    const handler = () => cb();
    ipcRenderer.on('open-settings', handler);
    return () => ipcRenderer.removeListener('open-settings', handler);
  },
});
