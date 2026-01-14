"use client";

import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { createContext, useContext, useState, HTMLAttributes, ReactNode, useRef, useEffect } from "react";

/**
 * DropdownMenu 上下文类型
 */
type DropdownMenuContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/**
 * DropdownMenuItem 组件 Props 接口
 */
export interface DropdownMenuItemProps extends HTMLAttributes<HTMLButtonElement> {
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 危险操作样式
   */
  destructive?: boolean;
}

/**
 * DropdownMenu 组件 Props 接口
 */
export interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 菜单内容
   */
  children: ReactNode;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * DropdownMenuContent 组件 Props 接口
 */
export interface DropdownMenuContentProps extends HTMLAttributes<HTMLUListElement> {
  /**
   * 菜单项列表
   */
  children: ReactNode;
}

/**
 * DropdownMenu 上下文
 */
const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined);

/**
 * 获取 DropdownMenu 上下文
 * @returns DropdownMenu 上下文
 */
const useDropdownMenuContext = () => {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu 组件必须作为 DropdownMenu 的子组件使用");
  }
  return context;
};

/**
 * 下拉菜单容器组件
 * 提供下拉菜单功能
 */
export function DropdownMenu({ children, className, ...props }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 处理点击外部关闭菜单
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={containerRef} className={cn("relative inline-block", className)} {...props}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

/**
 * 下拉菜单触发按钮组件
 */
export function DropdownMenuTrigger({ className, children, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = useDropdownMenuContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "inline-flex items-center justify-center p-2 rounded-md",
        "text-gray-700 hover:bg-gray-100",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "transition-colors duration-200",
        className
      )}
      aria-haspopup="true"
      aria-expanded={open}
      {...props}
    >
      {children || <MoreVertical className="w-4 h-4" />}
    </button>
  );
}

/**
 * 下拉菜单内容组件
 */
export function DropdownMenuContent({ children, className, ...props }: DropdownMenuContentProps) {
  const { open } = useDropdownMenuContext();

  if (!open) {
    return null;
  }

  return (
    <ul
      className={cn(
        "absolute right-0 z-10 min-w-[8rem] py-1",
        "bg-white border border-gray-200 rounded-lg shadow-lg",
        "animate-in fade-in zoom-in-95 duration-200",
        className
      )}
      role="menu"
      {...props}
    >
      {children}
    </ul>
  );
}

/**
 * 下拉菜单项组件
 */
export function DropdownMenuItem({
  disabled = false,
  destructive = false,
  className,
  children,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext();

  return (
    <li role="none">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(false)}
        className={cn(
          "relative flex items-center w-full px-3 py-2 text-sm",
          "focus:outline-none focus:bg-gray-100",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          destructive
            ? "text-red-600 hover:bg-red-50 hover:text-red-700"
            : "text-gray-700 hover:bg-gray-100",
          "transition-colors duration-150",
          className
        )}
        role="menuitem"
        {...props}
      >
        {children}
      </button>
    </li>
  );
}

/**
 * 下拉菜单分隔线组件
 */
export function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLLIElement>) {
  return (
    <li
      role="separator"
      className={cn("my-1 h-px bg-gray-200", className)}
      {...props}
    />
  );
}
