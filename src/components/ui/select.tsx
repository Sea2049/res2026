"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { createContext, useContext, useState, HTMLAttributes, ReactNode, useRef, useEffect } from "react";

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
          {selectedLabel || <span className="text-gray-400">{placeholder}</span>}
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
        "bg-white border border-gray-300 rounded-lg",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-colors duration-200",
        className
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
      {...props}
    >
      {children}
      <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
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
  const { value, onChange, disabled } = useSelectContext();

  return (
    <ul
      className={cn(
        "absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg",
        "max-h-60 overflow-auto",
        className
      )}
      role="listbox"
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
      onClick={() => !disabled && onChange(value)}
      className={cn(
        "relative flex items-center px-3 py-2 cursor-pointer",
        "transition-colors duration-150",
        isSelected
          ? "bg-blue-50 text-blue-900"
          : "text-gray-900 hover:bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      <span className="flex-1">{label}</span>
      {isSelected && <Check className="w-4 h-4 ml-2 text-blue-600" />}
    </li>
  );
}
