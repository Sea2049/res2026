"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { redditApi } from "@/lib/api/reddit";
import { analyzeComments } from "@/lib/nlp";
import type {
  SearchResult,
  AnalysisSession,
  AnalysisResult,
  AnalysisConfig,
  defaultAnalysisConfig,
} from "@/lib/types";

/**
 * useAnalysis Hook 返回值接口
 */
interface UseAnalysisReturn {
  /**
   * 当前分析会话状态
   */
  session: AnalysisSession | null;
  /**
   * 开始分析
   * @param topics 要分析的主题列表
   */
  startAnalysis: (topics: SearchResult[]) => Promise<void>;
  /**
   * 取消当前分析
   */
  cancelAnalysis: () => void;
  /**
   * 重置分析状态
   */
  resetAnalysis: () => void;
  /**
   * 导出分析结果
   * @param format 导出格式 (json/csv)
   * @returns 导出数据
   */
  exportResult: (format: "json" | "csv") => string | null;
}

/**
 * 生成唯一会话 ID
 * @returns 唯一 ID 字符串
 */
function generateSessionId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 主题搜索 Hook
 * 管理评论分析状态、结果获取和导出功能
 */
export function useAnalysis(): UseAnalysisReturn {
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const configRef = useRef<AnalysisConfig>({
    maxComments: 500,
    minKeywordLength: 3,
    topKeywordsCount: 30,
    sentimentThreshold: 0.3,
    enableInsightDetection: true,
  });

  /**
   * 更新会话状态
   * @param updates 状态更新对象
   */
  const updateSession = useCallback(
    (updates: Partial<AnalysisSession>) => {
      setSession((prev) => {
        if (!prev) return null;
        return { ...prev, ...updates };
      });
    },
    []
  );

  /**
   * 获取 Subreddit 或 Post 的评论
   * @param topic 主题对象
   * @returns 评论数组
   */
  const fetchCommentsForTopic = useCallback(
    async (
      topic: SearchResult
    ): Promise<
      { id: string; body: string; author: string; score: number; created_utc: number; parent_id: string }[]
    > => {
      if ("subscriber_count" in topic) {
        updateSession({
          currentStep: `正在获取社区 r/${topic.display_name} 的评论...`,
        });
        return await redditApi.getSubredditComments(topic.display_name, 5, 50);
      } else {
        updateSession({
          currentStep: `正在获取帖子 "${topic.title.substring(0, 30)}..." 的评论...`,
        });
        const comments = await redditApi.getComments(topic.id, topic.subreddit);
        return comments;
      }
    },
    [updateSession]
  );

  /**
   * 开始分析
   * 获取所有选中主题的评论并进行分析
   * @param topics 要分析的主题列表
   */
  const startAnalysis = useCallback(
    async (topics: SearchResult[]) => {
      if (!topics || topics.length === 0) {
        setSession({
          id: generateSessionId(),
          topics: [],
          status: "error",
          progress: 0,
          currentStep: "请先选择要分析的主题",
          result: null,
          error: "没有选择任何主题",
          createdAt: Date.now(),
          completedAt: null,
        });
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      const newSession: AnalysisSession = {
        id: generateSessionId(),
        topics,
        status: "fetching",
        progress: 0,
        currentStep: "准备开始获取评论数据...",
        result: null,
        error: null,
        createdAt: Date.now(),
        completedAt: null,
      };

      setSession(newSession);

      try {
        let allComments: {
          id: string;
          body: string;
          author: string;
          score: number;
          created_utc: number;
          parent_id: string;
        }[] = [];
        const totalTopics = topics.length;

        for (let i = 0; i < topics.length; i++) {
          if (signal.aborted) {
            return;
          }

          const topic = topics[i];
          const progress = Math.round(((i + 0.5) / totalTopics) * 50);
          updateSession({ progress, currentStep: `正在处理第 ${i + 1}/${totalTopics} 个主题...` });

          try {
            const comments = await fetchCommentsForTopic(topic);
            allComments = [...allComments, ...comments];
          } catch (error) {
            console.error(`获取主题 ${topic.id} 评论失败:`, error);
          }
        }

        if (signal.aborted) {
          return;
        }

        if (allComments.length === 0) {
          updateSession({
            status: "error",
            progress: 100,
            currentStep: "未能获取到任何评论",
            error: "未找到可分析的评论，请尝试选择其他主题",
          });
          return;
        }

        updateSession({
          status: "analyzing",
          progress: 50,
          currentStep: `获取到 ${allComments.length} 条评论，正在分析...`,
        });

        if (signal.aborted) {
          return;
        }

        const delay = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms));
        let currentProgress = 50;
        const progressInterval = setInterval(() => {
          if (currentProgress < 90) {
            currentProgress += 2;
            updateSession({ progress: currentProgress });
          }
        }, 200);

        await delay(500);

        const result = analyzeComments(allComments, configRef.current);

        clearInterval(progressInterval);

        if (signal.aborted) {
          return;
        }

        const finalSession: AnalysisSession = {
          ...newSession,
          status: "completed",
          progress: 100,
          currentStep: "分析完成！",
          result,
          error: null,
          completedAt: Date.now(),
        };

        setSession(finalSession);
      } catch (error) {
        if (!signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : "分析过程中发生未知错误";
          console.error("分析失败:", error);
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: "error",
              progress: 100,
              currentStep: "分析失败",
              error: errorMessage,
              completedAt: Date.now(),
            };
          });
        }
      }
    },
    [fetchCommentsForTopic, updateSession]
  );

  /**
   * 取消当前分析
   */
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: "error",
        progress: prev.progress,
        currentStep: "用户取消分析",
        error: "用户取消了分析操作",
        completedAt: Date.now(),
      };
    });
  }, []);

  /**
   * 重置分析状态
   */
  const resetAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSession(null);
  }, []);

  /**
   * 导出分析结果
   * @param format 导出格式
   * @returns 导出的数据字符串
   */
  const exportResult = useCallback(
    (format: "json" | "csv"): string | null => {
      if (!session?.result) {
        return null;
      }

      const { result } = session;

      if (format === "json") {
        return JSON.stringify(
          {
            analysisDate: new Date().toISOString(),
            topicsCount: session.topics.length,
            statistics: {
              totalComments: result.comments.length,
              sentimentDistribution: result.sentiment,
            },
            topKeywords: result.keywords.slice(0, 20),
            insights: result.insights,
          },
          null,
          2
        );
      }

      if (format === "csv") {
        let csv = "关键词,出现次数,情感\n";
        for (const keyword of result.keywords) {
          const sentiment = keyword.sentiment || "neutral";
          csv += `"${keyword.word}",${keyword.count},${sentiment}\n`;
        }
        return csv;
      }

      return null;
    },
    [session]
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    session,
    startAnalysis,
    cancelAnalysis,
    resetAnalysis,
    exportResult,
  };
}
