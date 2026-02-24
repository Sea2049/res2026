"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ThemeMode } from "@/lib/theme/theme-store";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  themeMode,
  onThemeModeChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>外观与主题</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">主题</div>
              <div className="text-sm text-muted-foreground">参考 Reddit 官方配色的浅色/深色模式</div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={themeMode === "light" ? "primary" : "outline"}
                size="sm"
                onClick={() => onThemeModeChange("light")}
                aria-pressed={themeMode === "light"}
              >
                浅色
              </Button>
              <Button
                type="button"
                variant={themeMode === "dark" ? "primary" : "outline"}
                size="sm"
                onClick={() => onThemeModeChange("dark")}
                aria-pressed={themeMode === "dark"}
              >
                深色
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

