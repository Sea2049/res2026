import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Badge 变体类型
 */
export type BadgeVariant = "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "outline";

/**
 * Badge 组件 Props 接口
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * 标签变体样式
   */
  variant?: BadgeVariant;
}

/**
 * 获取标签变体样式类名
 * @param variant 标签变体
 * @returns 样式类名字符串
 */
const getVariantClasses = (variant: BadgeVariant): string => {
  const variants = {
    default: "bg-gray-100 text-gray-800 border-gray-200",
    primary: "bg-blue-100 text-blue-800 border-blue-200",
    secondary: "bg-purple-100 text-purple-800 border-purple-200",
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    outline: "bg-transparent text-gray-800 border-gray-300",
  };
  return variants[variant];
};

/**
 * 标签组件
 * 用于显示状态、分类或元信息的小型标签
 */
export const Badge = ({ variant = "default", className, children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getVariantClasses(variant),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
