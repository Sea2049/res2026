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
 * 根据输入关键词提供搜索建议，使用防抖优化性能，支持智能建议生成
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
   * 生成智能搜索建议
   * 根据关键词类型生成不同类别的建议
   */
  const generatedSuggestions = useMemo(() => {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    const lowerKeyword = keyword.toLowerCase().trim();
    const suggestions: string[] = [];

    // 技术类关键词建议
    const techKeywords = [
      "javascript", "typescript", "python", "java", "react", "vue", "angular",
      "node.js", "docker", "kubernetes", "aws", "azure", "machine learning",
      "data science", "web development", "mobile development", "devops"
    ];

    // 兴趣爱好类关键词建议
    const hobbyKeywords = [
      "gaming", "photography", "cooking", "fitness", "travel", "music",
      "movies", "books", "art", "writing", "cooking", "sports", "cars"
    ];

    // 通用前缀建议
    const prefixes = [
      "how to", "best", "top", "guide", "tutorial", "tips", "tricks",
      "help", "what is", "why", "vs", "review", "comparison"
    ];

    // 通用后缀建议
    const suffixes = [
      "for beginners", "tutorial", "guide", "tips", "best practices",
      "examples", "vs", "alternatives", "problems", "solutions"
    ];

    // 根据关键词类型生成建议
    const isTechKeyword = techKeywords.some(kw => lowerKeyword.includes(kw));
    const isHobbyKeyword = hobbyKeywords.some(kw => lowerKeyword.includes(kw));

    // 生成前缀建议
    prefixes.forEach(prefix => {
      const suggestion = `${prefix} ${keyword}`;
      if (suggestion.length <= 50) {
        suggestions.push(suggestion);
      }
    });

    // 生成后缀建议
    suffixes.forEach(suffix => {
      const suggestion = `${keyword} ${suffix}`;
      if (suggestion.length <= 50) {
        suggestions.push(suggestion);
      }
    });

    // 如果是技术关键词，添加相关技术建议
    if (isTechKeyword) {
      techKeywords.forEach(tech => {
        if (tech !== lowerKeyword && tech.includes(lowerKeyword) && suggestions.length < 10) {
          suggestions.push(tech);
        }
      });
    }

    // 如果是兴趣爱好关键词，添加相关兴趣建议
    if (isHobbyKeyword) {
      hobbyKeywords.forEach(hobby => {
        if (hobby !== lowerKeyword && hobby.includes(lowerKeyword) && suggestions.length < 10) {
          suggestions.push(hobby);
        }
      });
    }

    // 如果是通用词，添加热门分类建议
    if (!isTechKeyword && !isHobbyKeyword && keyword.length >= 3) {
      const popularCategories = [
        ...techKeywords.slice(0, 3),
        ...hobbyKeywords.slice(0, 3)
      ];
      popularCategories.forEach(cat => {
        if (cat.includes(lowerKeyword) || lowerKeyword.includes(cat)) {
          suggestions.push(`${keyword} ${cat}`);
        }
      });
    }

    // 去重并限制数量
    return Array.from(new Set(suggestions))
      .filter(s => s.length > keyword.length) // 过滤掉与关键词相同的建议
      .slice(0, 8);
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
