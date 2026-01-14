import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Card 基础组件 Props 接口
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * CardHeader 组件 Props 接口
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * CardTitle 组件 Props 接口
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

/**
 * CardDescription 组件 Props 接口
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

/**
 * CardContent 组件 Props 接口
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * CardFooter 组件 Props 接口
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * 卡片容器组件
 * 提供统一的卡片容器样式
 */
export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * 卡片头部组件
 * 包含标题和描述
 */
export const CardHeader = ({ className, children, ...props }: CardHeaderProps) => {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * 卡片标题组件
 * 显示卡片主标题
 */
export const CardTitle = ({ className, children, ...props }: CardTitleProps) => {
  return (
    <h3
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

/**
 * 卡片描述组件
 * 显示卡片副标题或描述信息
 */
export const CardDescription = ({ className, children, ...props }: CardDescriptionProps) => {
  return (
    <p
      className={cn("text-sm text-gray-500", className)}
      {...props}
    >
      {children}
    </p>
  );
};

/**
 * 卡片内容组件
 * 包含卡片的主要内容
 */
export const CardContent = ({ className, children, ...props }: CardContentProps) => {
  return (
    <div className={cn("p-6 pt-0", className)} {...props}>
      {children}
    </div>
  );
};

/**
 * 卡片底部组件
 * 包含卡片底部的操作按钮或信息
 */
export const CardFooter = ({ className, children, ...props }: CardFooterProps) => {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    >
      {children}
    </div>
  );
};
