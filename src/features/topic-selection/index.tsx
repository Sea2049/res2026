"use client";

import { useState, useEffect } from "react";
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
   * 搜索结果变化回调
   */
  onSearchResultsChange?: (results: (Subreddit | Post)[]) => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 主题筛选组件
 * 整合搜索输入框、搜索结果列表、历史记录、高级搜索选项和主题选择功能
 */
export function TopicSelection({ 
  onSelectedTopicsChange, 
  onSearchResultsChange,
  className 
}: TopicSelectionProps) {
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
    selectAll,
    deselectAll,
    clearResults,
    clearSelectedTopics,
  } = useTopicSearch();

  const { history, addToHistory, clearHistory, removeFromHistory } = useSearchHistory(10);

  const [showSuggestions, setShowSuggestions] = useState(false);

  /**
   * 当搜索结果变化时，通知父组件
   */
  useEffect(() => {
    onSearchResultsChange?.(results);
  }, [results, onSearchResultsChange]);

  /**
   * 当已选主题变化时，通知父组件
   */
  const handleToggleSelect = (topic: Subreddit | Post) => {
    const isSelecting = !selectedTopicIds.has(topic.id);
    
    toggleSelectTopic(topic);
    
    // 计算新的已选主题列表
    const newSelectedTopics = isSelecting
      ? [...selectedTopics, topic]
      : selectedTopics.filter(t => t.id !== topic.id);
    
    onSelectedTopicsChange?.(newSelectedTopics);
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

  /**
   * 处理全选
   */
  const handleSelectAll = () => {
    const unselectedResults = results.filter(t => !selectedTopicIds.has(t.id));
    if (unselectedResults.length > 0) {
      selectAll();
      onSelectedTopicsChange?.([...selectedTopics, ...unselectedResults]);
    }
  };

  /**
   * 处理取消全选
   */
  const handleDeselectAll = () => {
    if (selectedTopicIds.size > 0) {
      deselectAll();
      onSelectedTopicsChange?.([]);
    }
  };

  /**
   * 获取当前搜索结果的子集信息
   */
  const getCurrentResultInfo = () => {
    const subredditCount = results.filter(t => "subscriber_count" in t).length;
    const postCount = results.filter(t => !("subscriber_count" in t)).length;
    
    if (subredditCount > 0 && postCount > 0) {
      return `${subredditCount} 个社区，${postCount} 个帖子`;
    } else if (subredditCount > 0) {
      return `${subredditCount} 个社区`;
    } else if (postCount > 0) {
      return `${postCount} 个帖子`;
    }
    return "0 个结果";
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

        {results.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-600">
              当前结果：{getCurrentResultInfo()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                全选
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={handleDeselectAll}
                disabled={isLoading || selectedTopicIds.size === 0}
                className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                取消全选
              </button>
            </div>
          </div>
        )}

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
