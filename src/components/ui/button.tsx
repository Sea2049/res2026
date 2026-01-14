import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * 按钮变体类型
 */
export type ButtonVariant = "default" | "primary" | "secondary" | "ghost" | "outline" | "destructive";

/**
 * 按钮尺寸类型
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Button 组件 Props 接口
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * 按钮变体样式
   */
  variant?: ButtonVariant;
  /**
   * 按钮尺寸
   */
  size?: ButtonSize;
  /**
   * 是否显示加载状态
   */
  loading?: boolean;
  /**
   * 是否全宽
   */
  fullWidth?: boolean;
}

/**
 * 获取按钮变体样式类名
 * @param variant 按钮变体
 * @returns 样式类名字符串
 */
const getVariantClasses = (variant: ButtonVariant): string => {
  const variants = {
    default: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    secondary: "bg-gray-600 text-white hover:bg-gray-700",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-900",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50 text-gray-900",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  return variants[variant];
};

/**
 * 获取按钮尺寸样式类名
 * @param size 按钮尺寸
 * @returns 样式类名字符串
 */
const getSizeClasses = (size: ButtonSize): string => {
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };
  return sizes[size];
};

/**
 * 按钮组件
 * 提供多种样式和尺寸的按钮，支持加载状态
 */
export const Button = ({
  variant = "default",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        getVariantClasses(variant),
        getSizeClasses(size),
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};
