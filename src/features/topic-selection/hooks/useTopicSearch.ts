"use client";

import { useState, useCallback, useRef } from "react";
import { redditApi } from "@/lib/api/reddit";
import type { Subreddit, Post } from "@/lib/types";
import { isValidSearchKeyword } from "@/lib/utils";

/**
 * 搜索结果类型
 */
export type SearchResult = Subreddit | Post;

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
export interface SearchOptions {
  sortBy: SearchSortBy;
  timeRange: SearchTimeRange;
  limit: number;
  subredditOnly: boolean;
  postOnly: boolean;
}

/**
 * useTopicSearch Hook 返回值接口
 */
interface UseTopicSearchReturn {
  /**
   * 搜索关键词
   */
  keyword: string;
  /**
   * 搜索结果列表
   */
  results: SearchResult[];
  /**
   * 已选主题 ID 集合
   */
  selectedTopicIds: Set<string>;
  /**
   * 已选主题列表
   */
  selectedTopics: SearchResult[];
  /**
   * 是否正在加载
   */
  isLoading: boolean;
  /**
   * 错误信息
   */
  error: string | null;
  /**
   * 搜索选项
   */
  searchOptions: SearchOptions;
  /**
   * 设置搜索关键词
   */
  setKeyword: (keyword: string) => void;
  /**
   * 设置搜索选项
   */
  setSearchOptions: (options: SearchOptions) => void;
  /**
   * 执行搜索
   */
  search: () => Promise<void>;
  /**
   * 切换主题选择状态
   */
  toggleSelectTopic: (topic: SearchResult) => void;
  /**
   * 清空搜索结果
   */
  clearResults: () => void;
  /**
   * 清空已选主题
   */
  clearSelectedTopics: () => void;
}

/**
 * 默认搜索选项
 */
const defaultSearchOptions: SearchOptions = {
  sortBy: "relevance",
  timeRange: "all",
  limit: 20,
  subredditOnly: false,
  postOnly: false,
};

/**
 * 主题搜索 Hook
 * 管理搜索状态、搜索结果、已选主题和高级搜索选项
 */
export function useTopicSearch(): UseTopicSearchReturn {
  const [keyword, setKeyword] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchOptions, setSearchOptions] = useState<SearchOptions>(defaultSearchOptions);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 执行搜索
   * 根据搜索选项执行搜索，支持排序、时间范围等参数
   */
  const search = useCallback(async () => {
    if (!isValidSearchKeyword(keyword)) {
      setError("请输入有效的搜索关键词");
      return;
    }

    setIsLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      let searchResults: SearchResult[] = [];

      if (!searchOptions.postOnly) {
        const subreddits = await redditApi.searchSubreddits(keyword, signal);
        searchResults = [...searchResults, ...subreddits.slice(0, searchOptions.limit)];
      }

      if (!searchOptions.subredditOnly) {
        const posts = await redditApi.searchPosts(
          keyword,
          undefined,
          searchOptions.sortBy,
          searchOptions.timeRange,
          searchOptions.limit,
          signal
        );
        searchResults = [...searchResults, ...posts.slice(0, searchOptions.limit)];
      }

      if (!signal.aborted) {
        setResults(searchResults);
      }
    } catch (err) {
      if (!signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : "搜索失败，请稍后重试";
        setError(errorMessage);
        console.error("搜索失败:", err);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [keyword, searchOptions]);

  /**
   * 切换主题选择状态
   * @param topic 要切换选择状态的主题
   */
  const toggleSelectTopic = useCallback((topic: SearchResult) => {
    setSelectedTopicIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(topic.id)) {
        newSet.delete(topic.id);
      } else {
        newSet.add(topic.id);
      }
      return newSet;
    });
  }, []);

  /**
   * 清空搜索结果
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  /**
   * 清空已选主题
   */
  const clearSelectedTopics = useCallback(() => {
    setSelectedTopicIds(new Set());
  }, []);

  /**
   * 计算已选主题列表
   */
  const selectedTopics = results.filter((topic) => selectedTopicIds.has(topic.id));

  return {
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
  };
}
