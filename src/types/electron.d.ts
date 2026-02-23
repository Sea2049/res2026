/**
 * Electron 渲染进程可用 API 类型（Next 构建时可见）
 */
interface ElectronAPI {
  platform: NodeJS.Platform;
  getVersion: () => Promise<string>;
  isElectron: boolean;
  exportPdf: (html: string, defaultFilename: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
