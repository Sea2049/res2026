"use client";

import { useEffect, useMemo, useState } from "react";
import { SettingsDialog } from "@/components/app/SettingsDialog";
import type { ThemeMode } from "@/lib/theme/theme-store";
import {
  applyThemeMode,
  getInitialThemeMode,
  isThemeMode,
  setThemeMode,
  setStoredThemeMode,
} from "@/lib/theme/theme-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getInitialThemeMode());

  const setMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeModeState(mode);
    // 同步到主进程，让菜单 radio 状态一致
    window.electronAPI?.setThemeMode?.(mode);
  };

  useEffect(() => {
    // 初始化主题：优先使用 Electron 主进程存储（菜单切换），否则用 localStorage/default
    let cancelled = false;

    const init = async () => {
      if (window.electronAPI?.getThemeMode) {
        try {
          const fromMain = await window.electronAPI.getThemeMode();
          if (isThemeMode(fromMain)) {
            if (cancelled) return;
            applyThemeMode(fromMain);
            setStoredThemeMode(fromMain);
            setThemeModeState(fromMain);
            return;
          }
        } catch {
          // ignore
        }
      }

      if (cancelled) return;
      const initial = getInitialThemeMode();
      applyThemeMode(initial);
      setStoredThemeMode(initial);
      setThemeModeState(initial);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Electron 菜单触发：主题切换
    const offTheme = window.electronAPI?.onThemeModeChange?.((mode) => {
      if (!isThemeMode(mode)) return;
      setThemeMode(mode);
      setThemeModeState(mode);
    });

    // Electron 菜单触发：打开设置
    const offSettings = window.electronAPI?.onOpenSettings?.(() => {
      setSettingsOpen(true);
    });

    return () => {
      offTheme?.();
      offSettings?.();
    };
  }, []);

  // Dialog 的实现要求 children 自己包含 DialogContent
  const settingsDialog = useMemo(() => {
    return (
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        themeMode={themeMode}
        onThemeModeChange={setMode}
      />
    );
  }, [settingsOpen, themeMode]);

  return (
    <>
      {children}
      {settingsDialog}
    </>
  );
}

