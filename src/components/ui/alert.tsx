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
      container: "bg-gray-50 border-gray-200 text-gray-900",
      icon: Info,
      iconColor: "text-gray-500",
    },
    info: {
      container: "bg-blue-50 border-blue-200 text-blue-900",
      icon: Info,
      iconColor: "text-blue-500",
    },
    success: {
      container: "bg-green-50 border-green-200 text-green-900",
      icon: CheckCircle,
      iconColor: "text-green-500",
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 text-yellow-900",
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
    },
    error: {
      container: "bg-red-50 border-red-200 text-red-900",
      icon: AlertCircle,
      iconColor: "text-red-500",
    },
  };
  return variants[variant];
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
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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
