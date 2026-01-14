"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useState, useRef, useEffect, ReactNode } from "react";

/**
 * Tooltip 组件 Props 接口
 */
export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  /**
   * 工具提示内容
   */
  content: ReactNode;
  /**
   * 提示位置
   */
  placement?: "top" | "bottom" | "left" | "right";
  /**
   * 延迟显示时间（毫秒）
   */
  delay?: number;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 获取提示位置样式
 * @param placement 提示位置
 * @returns 位置样式类名
 */
const getPlacementClasses = (placement: string): string => {
  const placements = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  return placements[placement as keyof typeof placements] || placements.top;
};

/**
 * 获取箭头位置样式
 * @param placement 提示位置
 * @returns 箭头位置样式类名
 */
const getArrowClasses = (placement: string): string => {
  const arrows = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-full",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-full",
    right: "left-0 top-1/2 -translate-y-1/2 -translate-x-full",
  };
  return arrows[placement as keyof typeof arrows] || arrows.top;
};

/**
 * 工具提示组件
 * 提供鼠标悬停时的提示信息
 */
export function Tooltip({
  content,
  placement = "top",
  delay = 200,
  className,
  children,
  ...props
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 处理鼠标进入
   */
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShow(true);
      setTimeout(() => setVisible(true), 10);
    }, delay);
  };

  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
    setVisible(false);
  };

  /**
   * 清理定时器
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className={cn("relative inline-block", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
      {show && (
        <div
          className={cn(
            "absolute z-50 px-2 py-1 text-xs text-white",
            "bg-gray-900 rounded shadow-lg",
            "whitespace-nowrap",
            getPlacementClasses(placement),
            visible ? "opacity-100" : "opacity-0",
            "transition-opacity duration-200"
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 rotate-45",
              getArrowClasses(placement)
            )}
          />
        </div>
      )}
    </div>
  );
}
