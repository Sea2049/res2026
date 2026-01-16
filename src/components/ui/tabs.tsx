"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext, useState, HTMLAttributes, ReactNode, useEffect } from "react";

/**
 * Tabs 上下文类型
 */
type TabsContextType = {
  activeTab: string;
  setActiveTab: (value: string) => void;
  defaultValue?: string;
};

/**
 * Tabs 上下文
 */
const TabsContext = createContext<TabsContextType | undefined>(undefined);

/**
 * Tabs 组件 Props 接口
 */
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue'> {
  /**
   * 默认激活的标签页值
   */
  defaultValue?: string;
  /**
   * 受控模式下的激活标签页值
   */
  value?: string;
  /**
   * 标签页切换回调
   */
  onValueChange?: (value: string) => void;
  /**
   * 标签页内容
   */
  children: ReactNode;
}

/**
 * TabsList 组件 Props 接口
 */
export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * TabsTrigger 组件 Props 接口
 */
export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  /**
   * 标签页值
   */
  value: string;
}

/**
 * TabsContent 组件 Props 接口
 */
export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 标签页值
   */
  value: string;
}

/**
 * 获取 Tabs 上下文
 * @returns Tabs 上下文
 */
const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs 组件必须作为 Tabs 的子组件使用");
  }
  return context;
};

/**
 * 标签页容器组件
 * 管理标签页的状态和内容
 */
export const Tabs = ({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) => {
  const [activeTab, setActiveTabState] = useState(value || defaultValue || "");

  // 受控模式下同步 value 属性
  useEffect(() => {
    if (value !== undefined) {
      setActiveTabState(value);
    }
  }, [value]);

  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setActiveTabState(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, defaultValue }}>
      <div className={cn("", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * 标签页列表组件
 * 包含所有标签页触发按钮
 */
export const TabsList = ({ className, children, ...props }: TabsListProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-gray-100 p-1",
        className
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * 标签页触发按钮组件
 * 点击切换到对应的标签页内容
 */
export const TabsTrigger = ({ value, className, children, ...props }: TabsTriggerProps) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * 标签页内容组件
 * 显示对应标签页的内容
 */
export const TabsContent = ({ value, className, children, ...props }: TabsContentProps) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      className={cn("mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};
