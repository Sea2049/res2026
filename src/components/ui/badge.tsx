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
    default: "bg-muted/60 text-muted-foreground border-border",
    primary: "bg-primary/15 text-primary border-primary/30",
    secondary: "bg-accent/60 text-accent-foreground border-border",
    success:
      "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-900/60",
    warning:
      "bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-900/60",
    danger:
      "bg-destructive/10 dark:bg-destructive/15 text-destructive dark:text-destructive/90 border-destructive/30 dark:border-destructive/60",
    outline: "bg-transparent text-foreground border-border",
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
