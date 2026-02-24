export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "res2026.themeMode";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function getStoredThemeMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  // Also hint native UI on Windows (scrollbar/inputs).
  root.style.colorScheme = mode === "dark" ? "dark" : "light";
}

export function getDefaultThemeMode(): ThemeMode {
  // 用户确认：默认浅色
  return "light";
}

export function getInitialThemeMode(): ThemeMode {
  return getStoredThemeMode() ?? getDefaultThemeMode();
}

export function setThemeMode(mode: ThemeMode): void {
  applyThemeMode(mode);
  setStoredThemeMode(mode);
  window.dispatchEvent(new CustomEvent("res2026:themeModeChanged", { detail: mode }));
}

export function onThemeModeChanged(
  listener: (mode: ThemeMode) => void
): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent;
    const mode = custom.detail;
    if (isThemeMode(mode)) listener(mode);
  };
  window.addEventListener("res2026:themeModeChanged", handler as EventListener);
  return () => window.removeEventListener("res2026:themeModeChanged", handler as EventListener);
}

