"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 搜索排序方式
 */
export type SearchSortBy = "relevance" | "hot" | "new" | "top";

/**
 * 搜索时间范围
 */
export type SearchTimeRange = "all" | "hour" | "day" | "week" | "month" | "year";

/**
 * 高级搜索选项接口
 */
export interface AdvancedSearchOptions {
  /**
   * 排序方式
   */
  sortBy: SearchSortBy;
  /**
   * 时间范围
   */
  timeRange: SearchTimeRange;
  /**
   * 结果数量限制
   */
  limit: number;
  /**
   * 是否只搜索 Subreddit
   */
  subredditOnly: boolean;
  /**
   * 是否只搜索 Post
   */
  postOnly: boolean;
}

/**
 * 导出类型别名
 */
export type SearchOptions = AdvancedSearchOptions;

/**
 * AdvancedSearchOptions 组件 Props 接口
 */
interface AdvancedSearchOptionsProps {
  /**
   * 当前搜索选项
   */
  options: AdvancedSearchOptions;
  /**
   * 选项变化回调
   */
  onOptionsChange: (options: AdvancedSearchOptions) => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 高级搜索选项组件
 * 提供排序、时间范围、结果数量等高级搜索选项
 */
export function AdvancedSearchOptions({
  options,
  onOptionsChange,
  className,
}: AdvancedSearchOptionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * 处理排序方式变化
   * @param sortBy 排序方式
   */
  const handleSortByChange = (sortBy: SearchSortBy) => {
    onOptionsChange({ ...options, sortBy });
  };

  /**
   * 处理时间范围变化
   * @param timeRange 时间范围
   */
  const handleTimeRangeChange = (timeRange: SearchTimeRange) => {
    onOptionsChange({ ...options, timeRange });
  };

  /**
   * 处理结果数量变化
   * @param limit 结果数量
   */
  const handleLimitChange = (limit: number) => {
    onOptionsChange({ ...options, limit });
  };

  /**
   * 处理搜索类型变化
   * @param type 搜索类型
   */
  const handleTypeChange = (type: "all" | "subreddit" | "post") => {
    onOptionsChange({
      ...options,
      subredditOnly: type === "subreddit",
      postOnly: type === "post",
    });
  };

  /**
   * 切换展开/收起状态
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const sortOptions = [
    { value: "relevance" as SearchSortBy, label: "相关性" },
    { value: "hot" as SearchSortBy, label: "热度" },
    { value: "new" as SearchSortBy, label: "最新" },
    { value: "top" as SearchSortBy, label: "最佳" },
  ];

  const timeRangeOptions = [
    { value: "all" as SearchTimeRange, label: "全部时间" },
    { value: "hour" as SearchTimeRange, label: "过去一小时" },
    { value: "day" as SearchTimeRange, label: "过去一天" },
    { value: "week" as SearchTimeRange, label: "过去一周" },
    { value: "month" as SearchTimeRange, label: "过去一月" },
    { value: "year" as SearchTimeRange, label: "过去一年" },
  ];

  const limitOptions = [10, 20, 50, 100];

  return (
    <div className={cn("space-y-4", className)}>
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="advanced-options-panel"
      >
        <span>高级搜索选项</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isExpanded ? "rotate-180" : ""
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div
          id="advanced-options-panel"
          className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              搜索类型
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleTypeChange("all")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors",
                  !options.subredditOnly && !options.postOnly
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                )}
                aria-pressed={!options.subredditOnly && !options.postOnly}
              >
                全部
              </button>
              <button
                onClick={() => handleTypeChange("subreddit")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors",
                  options.subredditOnly
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                )}
                aria-pressed={options.subredditOnly}
              >
                仅社区
              </button>
              <button
                onClick={() => handleTypeChange("post")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm transition-colors",
                  options.postOnly
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                )}
                aria-pressed={options.postOnly}
              >
                仅帖子
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              排序方式
            </label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortByChange(option.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm transition-colors",
                    options.sortBy === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  )}
                  aria-pressed={options.sortBy === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              时间范围
            </label>
            <div className="flex flex-wrap gap-2">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeRangeChange(option.value)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm transition-colors",
                    options.timeRange === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  )}
                  aria-pressed={options.timeRange === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              结果数量
            </label>
            <div className="flex flex-wrap gap-2">
              {limitOptions.map((limit) => (
                <button
                  key={limit}
                  onClick={() => handleLimitChange(limit)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm transition-colors",
                    options.limit === limit
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  )}
                  aria-pressed={options.limit === limit}
                >
                  {limit}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
