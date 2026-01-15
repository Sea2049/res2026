"use client";

import { useState } from "react";
import { TopicSearchInput } from "./components/TopicSearchInput";
import { TopicList } from "./components/TopicList";
import { AdvancedSearchOptions, type SearchOptions } from "./components/AdvancedSearchOptions";
import { SearchSuggestions } from "./components/SearchSuggestions";
import { useTopicSearch } from "./hooks/useTopicSearch";
import { useSearchHistory } from "./hooks/useSearchHistory";
import type { Subreddit, Post } from "@/lib/types";

/**
 * TopicSelection 组件 Props 接口
 */
interface TopicSelectionProps {
  /**
   * 已选主题变化回调
   */
  onSelectedTopicsChange?: (topics: (Subreddit | Post)[]) => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 主题筛选组件
 * 整合搜索输入框、搜索结果列表、历史记录、高级搜索选项和主题选择功能
 */
export function TopicSelection({ onSelectedTopicsChange, className }: TopicSelectionProps) {
  const {
    keyword,
    results,
    selectedTopicIds,
    selectedTopics,
    isLoading,
    error,
    searchOptions,
    setKeyword,
    setSearchOptions,
    search,
    toggleSelectTopic,
    clearResults,
    clearSelectedTopics,
  } = useTopicSearch();

  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory(10);

  const [showSuggestions, setShowSuggestions] = useState(false);

  /**
   * 当已选主题变化时，通知父组件
   */
  const handleToggleSelect = (topic: Subreddit | Post) => {
    toggleSelectTopic(topic);
    onSelectedTopicsChange?.(selectedTopics);
  };

  /**
   * 处理搜索
   */
  const handleSearch = async () => {
    await search();
    addToHistory(keyword);
    setShowSuggestions(false);
  };

  /**
   * 处理历史记录点击
   */
  const handleHistoryClick = (historyKeyword: string) => {
    setKeyword(historyKeyword);
    setShowSuggestions(false);
  };

  /**
   * 处理建议选择
   */
  const handleSuggestionSelect = (suggestion: string) => {
    setKeyword(suggestion);
    setShowSuggestions(false);
  };

  /**
   * 处理输入变化
   */
  const handleInputChange = (value: string) => {
    setKeyword(value);
    if (value.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            主题筛选
          </h2>
          <p className="text-gray-600 text-sm">
            搜索并选择感兴趣的 Subreddit 或 Post 进行分析
          </p>
        </div>

        <div className="relative">
          <TopicSearchInput
            value={keyword}
            onChange={handleInputChange}
            onSearch={handleSearch}
            isLoading={isLoading}
            searchHistory={history}
            onHistoryClick={handleHistoryClick}
            onClearHistory={clearHistory}
            onRemoveHistory={removeFromHistory}
          />

          {showSuggestions && keyword.length >= 2 && (
            <SearchSuggestions
              keyword={keyword}
              onSuggestionSelect={handleSuggestionSelect}
              isLoading={isLoading}
            />
          )}
        </div>

        <AdvancedSearchOptions
          options={searchOptions}
          onOptionsChange={setSearchOptions}
        />

        {selectedTopics.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-900">
                已选 {selectedTopics.length} 个主题
              </span>
              <button
                onClick={clearSelectedTopics}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                清空已选
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTopics.slice(0, 5).map((topic) => (
                <span
                  key={topic.id}
                  className="inline-flex items-center px-3 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800"
                >
                  {"subscriber_count" in topic ? "社区" : "帖子"}: {topic.title.substring(0, 20)}
                  {topic.title.length > 20 && "..."}
                </span>
              ))}
              {selectedTopics.length > 5 && (
                <span className="inline-flex items-center px-3 py-1 bg-blue-100 border border-blue-300 rounded-full text-sm text-blue-800">
                  +{selectedTopics.length - 5} 更多
                </span>
              )}
            </div>
          </div>
        )}

        <TopicList
          topics={results}
          selectedTopicIds={selectedTopicIds}
          onToggleSelect={handleToggleSelect}
          isLoading={isLoading}
          error={error}
          searchKeyword={keyword}
        />
      </div>
    </div>
  );
}
