"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * TopicSearchInput 组件 Props 接口
 */
interface TopicSearchInputProps {
  /**
   * 搜索关键词
   */
  value: string;
  /**
   * 搜索关键词变化回调
   */
  onChange: (value: string) => void;
  /**
   * 搜索触发回调
   */
  onSearch: () => void;
  /**
   * 是否正在加载
   */
  isLoading?: boolean;
  /**
   * 占位符文本
   */
  placeholder?: string;
  /**
   * 额外的类名
   */
  className?: string;
  /**
   * 搜索历史记录
   */
  searchHistory?: string[];
  /**
   * 点击历史记录回调
   */
  onHistoryClick?: (keyword: string) => void;
  /**
   * 清空历史记录回调
   */
  onClearHistory?: () => void;
  /**
   * 删除历史记录回调
   */
  onRemoveHistory?: (keyword: string) => void;
}

/**
 * 主题搜索输入框组件
 * 提供搜索输入框，支持输入验证、回车键搜索、历史记录和键盘导航
 */
export function TopicSearchInput({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = "输入关键词搜索 Subreddit 或 Post...",
  className,
  searchHistory = [],
  onHistoryClick,
  onClearHistory,
  onRemoveHistory,
}: TopicSearchInputProps) {
  const [error, setError] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * 清除错误信息
   */
  useEffect(() => {
    if (value.trim()) {
      setError("");
    }
  }, [value]);

  /**
   * 点击外部关闭历史记录下拉框
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
        setHistoryIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * 处理输入变化
   * @param e 输入事件
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    if (newValue.length > 100) {
      setError("关键词长度不能超过 100 个字符");
      return;
    }
    
    setError("");
    onChange(newValue);
    setHistoryIndex(-1);
  };

  /**
   * 处理搜索按钮点击
   */
  const handleSearchClick = () => {
    if (!value.trim()) {
      setError("请输入搜索关键词");
      return;
    }
    setShowHistory(false);
    setHistoryIndex(-1);
    onSearch();
  };

  /**
   * 处理回车键按下
   * @param e 键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 如果有搜索历史且下拉框显示，处理上下键导航
    if (showHistory && searchHistory.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistoryIndex((prev) => 
          prev < searchHistory.length - 1 ? prev + 1 : prev
        );
        return;
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistoryIndex((prev) => prev > 0 ? prev - 1 : -1);
        return;
      }
      
      if (e.key === "Enter" && historyIndex >= 0) {
        e.preventDefault();
        const selectedKeyword = searchHistory[historyIndex];
        onChange(selectedKeyword);
        setShowHistory(false);
        setHistoryIndex(-1);
        onHistoryClick?.(selectedKeyword);
        return;
      }
      
      if (e.key === "Escape") {
        e.preventDefault();
        setShowHistory(false);
        setHistoryIndex(-1);
        return;
      }
    }

    // 默认回车键搜索
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchClick();
    }
  };

  /**
   * 处理输入框聚焦
   */
  const handleFocus = () => {
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  /**
   * 处理历史记录点击
   * @param keyword 历史记录关键词
   */
  const handleHistoryItemClick = (keyword: string) => {
    onChange(keyword);
    setShowHistory(false);
    setHistoryIndex(-1);
    onHistoryClick?.(keyword);
  };

  /**
   * 处理删除历史记录项
   * @param e 事件对象
   * @param keyword 要删除的关键词
   */
  const handleRemoveHistoryItem = (
    e: React.MouseEvent,
    keyword: string
  ) => {
    e.stopPropagation();
    onRemoveHistory?.(keyword);
  };

  /**
   * 获取高亮的历史记录项
   */
  const getHighlightedHistoryItem = (index: number) => {
    return index === historyIndex;
  };

  return (
    <div className={cn("relative", className)}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            className={cn(
              "flex-1 px-4 py-2 border rounded-lg",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-red-500"
            )}
            disabled={isLoading}
            aria-label="搜索输入框"
            aria-invalid={!!error}
            aria-describedby={error ? "search-error" : undefined}
            aria-expanded={showHistory}
            aria-controls="search-history-dropdown"
            autoComplete="off"
          />
          <button
            onClick={handleSearchClick}
            disabled={isLoading || !value.trim()}
            className={cn(
              "px-6 py-2 bg-reddit-orange text-white rounded-lg",
              "hover:bg-orange-600 active:bg-orange-700",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-colors duration-200"
            )}
            aria-label="搜索按钮"
          >
            {isLoading ? "搜索中..." : "搜索"}
          </button>
        </div>
        {error && (
          <p id="search-error" className="text-red-500 text-sm" role="alert">
            {error}
          </p>
        )}
      </div>

      {showHistory && searchHistory.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-history-dropdown"
          className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto"
          role="listbox"
          aria-label="搜索历史"
        >
          <div className="p-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              搜索历史
            </span>
            <button
              onClick={() => {
                setShowHistory(false);
                setHistoryIndex(-1);
                onClearHistory?.();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
              aria-label="清空历史记录"
            >
              清空
            </button>
          </div>
          <ul role="list">
            {searchHistory.map((keyword, index) => (
              <li
                key={keyword}
                role="option"
                className={cn(
                  "px-3 py-2 cursor-pointer flex items-center justify-between group",
                  "hover:bg-gray-100",
                  getHighlightedHistoryItem(index) && "bg-blue-100"
                )}
                onClick={() => handleHistoryItemClick(keyword)}
                onMouseEnter={() => setHistoryIndex(index)}
                aria-selected={getHighlightedHistoryItem(index)}
              >
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {keyword}
                </span>
                <button
                  onClick={(e) => handleRemoveHistoryItem(e, keyword)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-opacity"
                  aria-label={`删除 ${keyword}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
