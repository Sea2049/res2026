import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Spinner 尺寸类型
 */
export type SpinnerSize = "sm" | "md" | "lg" | "xl";

/**
 * Spinner 颜色类型
 */
export type SpinnerColor = "default" | "primary" | "white" | "gray";

/**
 * Spinner 组件 Props 接口
 */
export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 加载动画尺寸
   */
  size?: SpinnerSize;
  /**
   * 加载动画颜色
   */
  color?: SpinnerColor;
}

/**
 * 获取加载动画尺寸样式
 * @param size 加载动画尺寸
 * @returns 尺寸样式对象
 */
const getSizeStyles = (size: SpinnerSize): { width: string; height: string; borderWidth: string } => {
  const sizes = {
    sm: { width: "16px", height: "16px", borderWidth: "2px" },
    md: { width: "24px", height: "24px", borderWidth: "3px" },
    lg: { width: "32px", height: "32px", borderWidth: "3px" },
    xl: { width: "48px", height: "48px", borderWidth: "4px" },
  };
  return sizes[size];
};

/**
 * 获取加载动画颜色样式
 * @param color 加载动画颜色
 * @returns 颜色类名字符串
 */
const getColorClasses = (color: SpinnerColor): string => {
  const colors = {
    default: "border-gray-300 border-t-blue-600",
    primary: "border-blue-200 border-t-blue-600",
    white: "border-white/30 border-t-white",
    gray: "border-gray-200 border-t-gray-600",
  };
  return colors[color];
};

/**
 * 加载动画组件
 * 用于显示加载状态的旋转动画
 */
export const Spinner = ({ size = "md", color = "default", className, ...props }: SpinnerProps) => {
  const sizeStyles = getSizeStyles(size);
  const colorClasses = getColorClasses(color);

  return (
    <div
      className={cn(
        "inline-block rounded-full animate-spin",
        colorClasses,
        className
      )}
      style={{
        width: sizeStyles.width,
        height: sizeStyles.height,
        borderWidth: sizeStyles.borderWidth,
      }}
      role="status"
      aria-label="加载中"
      {...props}
    />
  );
};
