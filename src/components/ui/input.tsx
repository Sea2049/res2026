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
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200",
        error && "border-red-500 focus:ring-red-500",
        className
      )}
      {...props}
    />
  );
};
