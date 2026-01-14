"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { createContext, useContext, useState, HTMLAttributes, ReactNode, useEffect, useRef } from "react";

/**
 * Dialog 上下文类型
 */
type DialogContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/**
 * Dialog 组件 Props 接口
 */
export interface DialogProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 是否打开
   */
  open?: boolean;
  /**
   * 打开状态变化回调
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * 额外的类名
   */
  className?: string;
  /**
   * 对话框内容
   */
  children: ReactNode;
}

/**
 * DialogHeader 组件 Props 接口
 */
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * DialogTitle 组件 Props 接口
 */
export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

/**
 * DialogDescription 组件 Props 接口
 */
export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

/**
 * DialogContent 组件 Props 接口
 */
export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 对话框内容
   */
  children: ReactNode;
}

/**
 * DialogFooter 组件 Props 接口
 */
export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Dialog 上下文
 */
const DialogContext = createContext<DialogContextType | undefined>(undefined);

/**
 * 获取 Dialog 上下文
 * @returns Dialog 上下文
 */
const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog 组件必须作为 Dialog 的子组件使用");
  }
  return context;
};

/**
 * 对话框容器组件
 * 提供模态对话框功能
 */
export function Dialog({ open: controlledOpen, onOpenChange, className, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  /**
   * 处理 ESC 键关闭
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {open && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-black/50 backdrop-blur-sm",
            "animate-in fade-in duration-200",
            className
          )}
          role="dialog"
          aria-modal="true"
        >
          <DialogContent>{children}</DialogContent>
        </div>
      )}
    </DialogContext.Provider>
  );
}

/**
 * 对话框内容组件
 */
export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const { setOpen } = useDialogContext();
  const contentRef = useRef<HTMLDivElement>(null);

  /**
   * 处理点击外部关闭
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setOpen]);

  return (
    <div
      ref={contentRef}
      className={cn(
        "relative bg-white rounded-lg shadow-xl",
        "max-w-lg w-full mx-4",
        "animate-in zoom-in-95 duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * 对话框头部组件
 */
export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between p-6 pb-4", className)} {...props} />
  );
}

/**
 * 对话框标题组件
 */
export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cn("text-lg font-semibold text-gray-900", className)} {...props} />;
}

/**
 * 对话框描述组件
 */
export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cn("text-sm text-gray-500 mt-1", className)} {...props} />;
}

/**
 * 对话框底部组件
 */
export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 p-6 pt-4", className)} {...props} />
  );
}

/**
 * 对话框关闭按钮组件
 */
export function DialogClose({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDialogContext();

  return (
    <button
      onClick={() => setOpen(false)}
      className={cn(
        "absolute top-4 right-4 p-1 rounded-md",
        "text-gray-400 hover:text-gray-600",
        "transition-colors duration-200",
        className
      )}
      aria-label="关闭"
      {...props}
    >
      <X className="w-4 h-4" />
    </button>
  );
}
