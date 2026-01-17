import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名，处理类名冲突
 * @param inputs 类名数组
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 延迟函数，用于模拟异步操作
 * @param ms 延迟毫秒数
 * @returns Promise<void>
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 截断文本并在末尾添加省略号
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * HTML 转义函数，防止 XSS 攻击
 * 将特殊字符转换为 HTML 实体
 * @param unsafe 原始文本
 * @returns 转义后的安全文本
 */
export function escapeHtml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 格式化订阅数显示
 * @param count 订阅数
 * @returns 格式化后的字符串（如：1.2K, 3.4M）
 */
export function formatSubscriberCount(count: number): string {
  if (count === 0) return "0";
  if (count < 1000) return count.toString();
  
  const suffixes = ["", "K", "M", "B"];
  // 1000 -> 1K, 1000000 -> 1M
  // log10(1000) = 3. 3/3 = 1. suffix[1] = K
  const suffixNum = Math.floor(Math.log10(count) / 3);
  
  if (suffixNum >= suffixes.length) return count.toString(); // Should not happen for reasonable numbers

  const shortValue = count / Math.pow(1000, suffixNum);
  
  // Keep 1 decimal place if needed, but remove .0
  // e.g. 1.5K, 10K
  const formatted = shortValue.toFixed(1).replace(/\.0$/, '');
  
  return `${formatted}${suffixes[suffixNum]}`;
}

/**
 * 格式化 Unix 时间戳为相对时间
 * @param timestamp Unix 时间戳（秒）
 * @returns 相对时间字符串（如：2小时前，3天前）
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.floor(now / 1000 - timestamp);
  
  const intervals = {
    年: 31536000,
    月: 2592000,
    周: 604800,
    天: 86400,
    小时: 3600,
    分钟: 60,
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit}前`;
    }
  }
  
  return "刚刚";
}

/**
 * 验证搜索关键词是否有效
 * @param keyword 搜索关键词
 * @returns 是否有效
 */
export function isValidSearchKeyword(keyword: string): boolean {
  if (!keyword || keyword.trim().length === 0) {
    return false;
  }
  if (keyword.length > 100) {
    return false;
  }
  return true;
}

/**
 * 防抖函数返回类型
 */
interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

/**
 * 防抖函数，限制函数调用频率
 * @param func 需要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数，包含 cancel 方法
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  } as DebouncedFunction<T>;
  
  debounced.cancel = function cancel() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

/**
 * 获取情感颜色类名
 * @param sentiment 情感类型
 * @returns 对应的 Tailwind CSS 类名
 */
export function getSentimentColor(
  sentiment: "positive" | "negative" | "neutral"
): string {
  const colors = {
    positive: "bg-green-100 text-green-700",
    negative: "bg-red-100 text-red-700",
    neutral: "bg-gray-100 text-gray-700",
  };
  return colors[sentiment];
}

/**
 * 时间段状态类型
 */
export type TimePeriodStatus = "peak" | "off_peak" | "transition";

/**
 * 检测当前是否处于 Reddit 高峰时段
 * 美国时间白天 (UTC 12:00-24:00) 为高峰时段
 * @returns 是否处于高峰时段
 */
export function isPeakHours(): boolean {
  const now = new Date();
  const utcHours = now.getUTCHours();
  return utcHours >= 12 && utcHours < 24;
}

/**
 * 获取当前时间状态
 * @returns 时间段状态和描述
 */
export function getCurrentTimeStatus(): {
  status: TimePeriodStatus;
  label: string;
  description: string;
  recommendations: string[];
} {
  const now = new Date();
  const utcHours = now.getUTCHours();
  
  // 计算本地时间（大致）
  const localHours = utcHours + 8; // UTC+8 中国时间
  const localHoursNormalized = localHours >= 24 ? localHours - 24 : localHours;
  
  if (utcHours >= 12 && utcHours < 18) {
    // UTC 12:00-18:00 (美国上午到下午，中国晚上 20:00-02:00)
    return {
      status: "peak",
      label: "高峰时段 🌙",
      description: "当前是 Reddit 高峰期（美国白天），API 限流风险较高",
      recommendations: [
        "建议减少同时分析的主题数量（1-2个）",
        "避免频繁刷新和重新分析",
        "如果遇到限流，请等待1-2分钟后重试",
      ],
    };
  } else if (utcHours >= 18 && utcHours < 24) {
    // UTC 18:00-24:00 (美国下午到晚上，中国凌晨 02:00-08:00)
    return {
      status: "transition",
      label: "过渡时段 🌆",
      description: "Reddit 活跃度正在下降，但仍需注意",
      recommendations: [
        "可以正常分析，建议不超过3个主题",
        "注意观察是否触发限流",
      ],
    };
  } else {
    // UTC 0:00-12:00 (美国深夜到上午，中国上午 08:00-20:00)
    return {
      status: "off_peak",
      label: "非高峰时段 ☀️",
      description: "当前是 Reddit 低峰期（美国深夜），API 稳定性最佳",
      recommendations: [
        "适合进行大规模分析（可选择3-5个主题）",
        "可以充分利用系统性能",
      ],
    };
  }
}

/**
 * 根据当前时段获取优化的 API 配置
 * @returns API 调用配置
 */
export function getTimeBasedApiConfig(): {
  maxRetries: number;
  baseRetryDelay: number;
  concurrencyLimit: number;
  requestInterval: number;
} {
  const isPeak = isPeakHours();
  
  return {
    // 高峰期减少重试次数，避免长时间等待
    maxRetries: isPeak ? 3 : 5,
    // 高峰期增加等待时间
    baseRetryDelay: isPeak ? 5000 : 3000,
    // 高峰期降低并发
    concurrencyLimit: isPeak ? 2 : 3,
    // 高峰期添加请求间隔
    requestInterval: isPeak ? 500 : 0,
  };
}
