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
});
