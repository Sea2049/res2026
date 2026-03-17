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
