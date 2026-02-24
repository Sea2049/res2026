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
    default: "bg-muted text-foreground hover:bg-muted/80",
    // 避免依赖固定色阶，统一走语义 token（支持 Light/Dark）
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85",
    secondary: "bg-accent text-accent-foreground hover:bg-accent/80",
    ghost: "bg-transparent text-foreground hover:bg-accent/50",
    outline: "border border-border bg-transparent text-foreground hover:bg-accent/50",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
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
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-lg font-medium",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        getVariantClasses(variant),
        getSizeClasses(size),
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
};
