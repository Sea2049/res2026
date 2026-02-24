import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

/**
 * Alert 变体类型
 */
export type AlertVariant = "default" | "info" | "success" | "warning" | "error";

/**
 * Alert 组件 Props 接口
 */
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 警告提示变体样式
   */
  variant?: AlertVariant;
  /**
   * 是否可关闭
   */
  dismissible?: boolean;
  /**
   * 关闭回调
   */
  onDismiss?: () => void;
}

/**
 * AlertTitle 组件 Props 接口
 */
export interface AlertTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

/**
 * AlertDescription 组件 Props 接口
 */
export interface AlertDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

/**
 * 获取警告提示变体样式
 * @param variant 警告提示变体
 * @returns 样式对象
 */
const getVariantStyles = (variant: AlertVariant) => {
  const variants = {
    default: {
      container: "bg-muted/40 border-border text-foreground",
      icon: Info,
      iconColor: "text-muted-foreground",
    },
    info: {
      container: "bg-reddit-orange/10 border-reddit-orange/30 text-foreground",
      icon: Info,
      iconColor: "text-reddit-orange",
    },
    success: {
      container: "bg-green-500/10 border-green-900/50 text-foreground",
      icon: CheckCircle,
      iconColor: "text-green-400",
    },
    warning: {
      container: "bg-amber-500/10 border-amber-900/50 text-foreground",
      icon: AlertTriangle,
      iconColor: "text-amber-400",
    },
    error: {
      container: "bg-red-500/10 border-red-900/50 text-foreground",
      icon: AlertCircle,
      iconColor: "text-red-400",
    },
  };
  
  return variants[variant] || variants.default;
};

/**
 * 警告提示组件
 * 用于显示信息、警告、错误等提示信息
 */
export const Alert = ({ variant = "default", dismissible = false, onDismiss, className, children, ...props }: AlertProps) => {
  const styles = getVariantStyles(variant);
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-lg border",
        styles.container,
        className
      )}
      role="alert"
      {...props}
    >
      <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", styles.iconColor)} />
      <div className="flex-1">
        {children}
      </div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded-md text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

/**
 * 警告提示标题组件
 */
export const AlertTitle = ({ className, children, ...props }: AlertTitleProps) => {
  return (
    <h5
      className={cn("font-semibold mb-1", className)}
      {...props}
    >
      {children}
    </h5>
  );
};

/**
 * 警告提示描述组件
 */
export const AlertDescription = ({ className, children, ...props }: AlertDescriptionProps) => {
  return (
    <p
      className={cn("text-sm", className)}
      {...props}
    >
      {children}
    </p>
  );
};
