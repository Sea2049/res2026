"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { createContext, useContext, useState, HTMLAttributes, ReactNode, useRef, useEffect, useCallback } from "react";

/**
 * Select 上下文类型
 */
type SelectContextType<T> = {
  value: T | undefined;
  onChange: (value: T) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
};

/**
 * Select 选项类型
 */
export interface SelectOption<T> {
  /**
   * 选项值
   */
  value: T;
  /**
   * 选项显示文本
   */
  label: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * Select 组件 Props 接口
 */
export interface SelectProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * 当前选中值
   */
  value?: T;
  /**
   * 值变化回调
   */
  onChange?: (value: T) => void;
  /**
   * 选项列表
   */
  options: SelectOption<T>[];
  /**
   * 占位符文本
   */
  placeholder?: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * Select 上下文
 */
const SelectContext = createContext<SelectContextType<any> | undefined>(undefined);

/**
 * 获取 Select 上下文
 * @returns Select 上下文
 */
const useSelectContext = () => {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("Select 组件必须作为 Select 的子组件使用");
  }
  return context;
};

/**
 * 下拉选择器容器组件
 * 提供下拉选择功能
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = "请选择",
  disabled = false,
  className,
  ...props
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 处理点击外部关闭下拉框
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

  /**
   * 处理选项选择
   */
  const handleSelect = (optionValue: T) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  /**
   * 获取当前选中选项的标签
   */
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <SelectContext.Provider value={{ value, onChange: handleSelect, open, setOpen, disabled }}>
      <div ref={containerRef} className={cn("relative w-full", className)} {...props}>
        <SelectTrigger>
          {selectedLabel || <span className="text-muted-foreground">{placeholder}</span>}
        </SelectTrigger>
        {open && <SelectContent options={options} />}
      </div>
    </SelectContext.Provider>
  );
}

/**
 * SelectTrigger 组件 Props 接口
 */
export interface SelectTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  /**
   * 子元素
   */
  children?: ReactNode;
}

/**
 * 选择器触发按钮组件
 */
export function SelectTrigger({ children, className, ...props }: SelectTriggerProps) {
  const { open, setOpen, disabled } = useSelectContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      disabled={disabled}
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 text-left",
        "bg-background border border-input rounded-lg text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors duration-200",
        className
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
      {...props}
    >
      {children}
      <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
    </button>
  );
}

/**
 * SelectContent 组件 Props 接口
 */
export interface SelectContentProps<T> extends HTMLAttributes<HTMLUListElement> {
  /**
   * 选项列表
   */
  options: SelectOption<T>[];
}

/**
 * 选择器内容组件
 * 显示所有可选项
 */
export function SelectContent<T extends string | number>({ options, className, ...props }: SelectContentProps<T>) {
  const { value, onChange, disabled, setOpen } = useSelectContext();
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLUListElement>) => {
    const items = listRef.current?.querySelectorAll('[role="option"]:not([aria-disabled="true"])');
    if (!items || items.length === 0) return;

    const focusedElement = document.activeElement;
    const itemsArray = Array.from(items) as HTMLElement[];
    const currentIndex = itemsArray.indexOf(focusedElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex < itemsArray.length - 1 ? currentIndex + 1 : 0;
      itemsArray[nextIndex].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : itemsArray.length - 1;
      itemsArray[prevIndex].focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedElement && focusedElement instanceof HTMLElement) {
        focusedElement.click();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }, [setOpen]);

  useEffect(() => {
    if (listRef.current) {
      const firstItem = listRef.current.querySelector('[role="option"]') as HTMLElement;
      firstItem?.focus();
    }
  }, []);

  return (
    <ul
      ref={listRef}
      className={cn(
        "absolute z-10 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg",
        "max-h-60 overflow-auto",
        className
      )}
      role="listbox"
      onKeyDown={handleKeyDown}
      {...props}
    >
      {options.map((option) => (
        <SelectItem
          key={option.value}
          value={option.value}
          label={option.label}
          disabled={option.disabled || disabled}
        />
      ))}
    </ul>
  );
}

/**
 * SelectItem 组件 Props 接口
 */
export interface SelectItemProps<T> extends HTMLAttributes<HTMLLIElement> {
  /**
   * 选项值
   */
  value: T;
  /**
   * 选项显示文本
   */
  label: string;
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 选择器选项组件
 */
export function SelectItem<T extends string | number>({ value, label, disabled, className, ...props }: SelectItemProps<T>) {
  const { value: selectedValue, onChange } = useSelectContext();
  const isSelected = value === selectedValue;

  return (
    <li
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onClick={() => !disabled && onChange(value)}
      className={cn(
        "relative flex items-center px-3 py-2 cursor-pointer",
        "transition-colors duration-150",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-accent/50 focus-visible:bg-accent/50",
        "focus-visible:outline-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="flex-1">{label}</span>
      {isSelected && <Check className="w-4 h-4 ml-2 text-reddit-orange" />}
    </li>
  );
}
