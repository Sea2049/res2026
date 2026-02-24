import { cn } from "@/lib/utils";

/**
 * Input 组件 Props 接口
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * 是否显示错误状态
   */
  error?: boolean;
}

/**
 * 输入框组件
 * 提供统一的输入框样式，支持错误状态
 */
export const Input = ({ className, error, type = "text", ...props }: InputProps) => {
  return (
    <input
      type={type}
      aria-invalid={error || undefined}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200",
        error && "border-destructive focus-visible:ring-destructive",
        className
      )}
      {...props}
    />
  );
};
