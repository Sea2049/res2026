"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Subreddit } from "@/lib/types";
import { debounce } from "@/lib/utils";

/**
 * SearchSuggestions 组件 Props 接口
 */
interface SearchSuggestionsProps {
  /**
   * 搜索关键词
   */
  keyword: string;
  /**
   * 建议选择回调
   */
  onSuggestionSelect: (suggestion: string) => void;
  /**
   * 是否正在加载
   */
  isLoading?: boolean;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 搜索建议/自动完成组件
 * 根据输入关键词提供搜索建议，使用防抖优化性能
 */
export function SearchSuggestions({
  keyword,
  onSuggestionSelect,
  isLoading = false,
  className,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 生成搜索建议
   * 使用 useMemo 优化性能，避免重复计算
   */
  const generatedSuggestions = useMemo(() => {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    const lowerKeyword = keyword.toLowerCase();
    const suggestions: string[] = [];

    const prefixes = [
      "how to", "best", "top", "guide", "tutorial",
      "tips", "tricks", "help", "what is", "why"
    ];

    prefixes.forEach(prefix => {
      suggestions.push(`${prefix} ${keyword}`);
    });

    const suffixes = [
      "for beginners", "tutorial", "guide", "tips",
      "best practices", "examples", "vs", "vs"
    ];

    suffixes.forEach(suffix => {
      suggestions.push(`${keyword} ${suffix}`);
    });

    const commonTopics = [
      "javascript", "python", "gaming", "cooking",
      "fitness", "travel", "photography", "music",
      "movies", "books", "technology", "science"
    ];

    commonTopics.forEach(topic => {
      if (topic.includes(lowerKeyword)) {
        suggestions.push(topic);
      }
    });

    return Array.from(new Set(suggestions)).slice(0, 8);
  }, [keyword]);

  /**
   * 防抖更新建议列表
   * 避免频繁更新导致性能问题
   */
  const debouncedUpdateSuggestions = useMemo(
    () => debounce((newSuggestions: string[]) => {
      setSuggestions(newSuggestions);
    }, 300),
    []
  );

  /**
   * 当生成的建议变化时，更新显示
   */
  useEffect(() => {
    debouncedUpdateSuggestions(generatedSuggestions);
  }, [generatedSuggestions, debouncedUpdateSuggestions]);

  /**
   * 重置选中索引
   */
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  /**
   * 处理键盘导航
   * @param e 键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  };

  /**
   * 处理建议点击
   * @param suggestion 建议文本
   */
  const handleSuggestionClick = (suggestion: string) => {
    onSuggestionSelect(suggestion);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto",
        className
      )}
      role="listbox"
      aria-label="搜索建议"
    >
      {isLoading ? (
        <div className="p-4 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm">加载建议中...</p>
        </div>
      ) : (
        <ul role="list">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              role="option"
              className={cn(
                "px-4 py-2 cursor-pointer transition-colors",
                "hover:bg-blue-50",
                selectedIndex === index && "bg-blue-100"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              aria-selected={selectedIndex === index}
            >
              <span className="text-sm text-gray-700">
                {suggestion}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
