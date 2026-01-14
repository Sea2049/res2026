import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Progress 变体类型
 */
export type ProgressVariant = "default" | "success" | "warning" | "danger";

/**
 * Progress 组件 Props 接口
 */
export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 进度值（0-100）
   */
  value: number;
  /**
   * 进度条变体样式
   */
  variant?: ProgressVariant;
  /**
   * 是否显示百分比文本
   */
  showLabel?: boolean;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 获取进度条变体样式
 * @param variant 进度条变体
 * @returns 样式类名字符串
 */
const getVariantClasses = (variant: ProgressVariant): string => {
  const variants = {
    default: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-yellow-500",
    danger: "bg-red-600",
  };
  return variants[variant];
};

/**
 * 进度条组件
 * 用于显示任务进度或加载状态
 */
export const Progress = ({
  value,
  variant = "default",
  showLabel = false,
  className,
  ...props
}: ProgressProps) => {
  /**
   * 确保进度值在 0-100 范围内
   */
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("w-full", className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">进度</span>
          <span className="text-sm font-medium text-gray-900">{clampedValue}%</span>
        </div>
      )}
      <div
        className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            getVariantClasses(variant)
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};
