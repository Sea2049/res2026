import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Separator 方向类型
 */
export type SeparatorOrientation = "horizontal" | "vertical";

/**
 * Separator 组件 Props 接口
 */
export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 分隔线方向
   */
  orientation?: SeparatorOrientation;
}

/**
 * 获取分隔线样式类名
 * @param orientation 分隔线方向
 * @returns 样式类名字符串
 */
const getOrientationClasses = (orientation: SeparatorOrientation): string => {
  const orientations = {
    horizontal: "h-px w-full",
    vertical: "h-full w-px",
  };
  return orientations[orientation];
};

/**
 * 分隔线组件
 * 用于在内容之间创建视觉分隔
 */
export const Separator = ({ orientation = "horizontal", className, ...props }: SeparatorProps) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-gray-200",
        getOrientationClasses(orientation),
        className
      )}
      {...props}
    />
  );
};
