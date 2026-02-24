/**
 * Electron API 类型声明
 * 供渲染进程中的 TypeScript 代码使用
 */
interface ElectronAPI {
  /** 当前操作系统平台 */
  platform: NodeJS.Platform;

  /** 获取应用版本号 */
  getVersion: () => Promise<string>;

  /** 是否运行在 Electron 桌面环境中 */
  isElectron: boolean;

  /** 导出 PDF 报告（通过主进程 printToPDF） */
  exportPdf: (html: string, defaultFilename: string) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;

  /** 获取当前主题模式（主进程持久化） */
  getThemeMode?: () => Promise<"light" | "dark">;

  /** 设置主题模式（同步到主进程 + 更新菜单） */
  setThemeMode?: (mode: "light" | "dark") => Promise<boolean>;

  /** 监听主进程主题变更（来自菜单） */
  onThemeModeChange?: (cb: (mode: "light" | "dark") => void) => () => void;

  /** 监听主进程打开设置（来自菜单） */
  onOpenSettings?: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
