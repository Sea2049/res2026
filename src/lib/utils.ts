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
  const suffixNum = Math.floor(("" + Math.floor(count)).length / 3);
  
  let shortValue: number;
  const shortNum = count % 1000 !== 0;
  
  for (let i = suffixNum ? 2 : 1; i < (suffixNum ? 3 : 2); i++) {
    shortValue = parseFloat((suffixNum !== 0 ? count / Math.pow(1000, i) : count / Math.pow(1000, i)).toPrecision(3));
    if (shortValue % 1 !== 0) {
      shortValue = Math.floor(shortValue * 10) / 10;
    }
    if (shortValue < 1000) {
      return shortValue + suffixes[i];
    }
  }
  return count.toString();
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
 * 防抖函数，限制函数调用频率
 * @param func 需要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
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
