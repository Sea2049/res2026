"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * 搜索历史记录 Hook 返回值接口
 */
interface UseSearchHistoryReturn {
  /**
   * 搜索历史记录列表
   */
  history: string[];
  /**
   * 添加搜索记录
   * @param keyword 搜索关键词
   */
  addToHistory: (keyword: string) => void;
  /**
   * 清空历史记录
   */
  clearHistory: () => void;
  /**
   * 删除指定的历史记录
   * @param keyword 要删除的关键词
   */
  removeFromHistory: (keyword: string) => void;
}

/**
 * 搜索历史记录 Hook
 * 管理用户的搜索历史，支持本地存储
 */
export function useSearchHistory(maxHistorySize: number = 10): UseSearchHistoryReturn {
  const [history, setHistory] = useState<string[]>([]);

  /**
   * 从本地存储加载历史记录
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reddit_search_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.error("加载搜索历史失败:", error);
    }
  }, []);

  /**
   * 添加搜索记录到历史
   * @param keyword 搜索关键词
   */
  const addToHistory = useCallback(
    (keyword: string) => {
      if (!keyword || keyword.trim().length === 0) {
        return;
      }

      setHistory((prev) => {
        const trimmedKeyword = keyword.trim();
        const newHistory = [trimmedKeyword, ...prev.filter((item) => item !== trimmedKeyword)];
        const limitedHistory = newHistory.slice(0, maxHistorySize);

        try {
          localStorage.setItem("reddit_search_history", JSON.stringify(limitedHistory));
        } catch (error) {
          console.error("保存搜索历史失败:", error);
        }

        return limitedHistory;
      });
    },
    [maxHistorySize]
  );

  /**
   * 清空历史记录
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem("reddit_search_history");
    } catch (error) {
      console.error("清空搜索历史失败:", error);
    }
  }, []);

  /**
   * 删除指定的历史记录
   * @param keyword 要删除的关键词
   */
  const removeFromHistory = useCallback((keyword: string) => {
    setHistory((prev) => {
      const newHistory = prev.filter((item) => item !== keyword);
      try {
        localStorage.setItem("reddit_search_history", JSON.stringify(newHistory));
      } catch (error) {
        console.error("删除搜索历史失败:", error);
      }
      return newHistory;
    });
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}
