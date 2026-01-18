import { useState, useCallback, useRef, useEffect } from "react";
import type { DeepInsightSession, DeepInsight, AnalysisResult, SearchResult } from "@/lib/types";

/**
 * useDeepInsights Hook 返回值接口
 */
interface UseDeepInsightsReturn {
  /**
   * 当前深度洞见会话状态
   */
  session: DeepInsightSession | null;
  /**
   * 开始生成深度洞见
   * @param topics 搜索结果列表
   * @param analysisResult 分析结果
   */
  generateDeepInsights: (topics: SearchResult[], analysisResult: AnalysisResult) => Promise<void>;
  /**
   * 取消当前生成
   */
  cancelGeneration: () => void;
  /**
   * 重置会话状态
   */
  resetSession: () => void;
}

/**
 * 生成唯一会话ID
 * @returns 唯一ID字符串
 */
function generateSessionId(): string {
  return `deep_insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深度洞见生成Hook
 * 管理深度洞见生成状态、结果获取和错误处理
 */
export function useDeepInsights(): UseDeepInsightsReturn {
  const [session, setSession] = useState<DeepInsightSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 更新会话状态
   * @param updates 状态更新对象
   */
  const updateSession = useCallback(
    (updates: Partial<DeepInsightSession>) => {
      setSession((prev) => {
        if (!prev) return null;
        return { ...prev, ...updates };
      });
    },
    []
  );

  /**
   * 开始生成深度洞见
   * @param topics 搜索结果列表
   * @param analysisResult 分析结果
   */
  const generateDeepInsights = useCallback(
    async (topics: SearchResult[], analysisResult: AnalysisResult) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      const newSession: DeepInsightSession = {
        id: generateSessionId(),
        status: "loading",
        progress: 0,
        currentStep: "准备生成深度洞见...",
        result: null,
        error: null,
        createdAt: Date.now(),
        completedAt: null,
      };

      setSession(newSession);

      try {
        updateSession({
          progress: 10,
          currentStep: "正在准备分析数据..."
        });

        if (signal.aborted) return;

        updateSession({
          progress: 30,
          currentStep: "正在调用AI模型生成洞见..."
        });

        const requestBody = {
          topics,
          analysisResult,
          exportData: {
            keywords: analysisResult.keywords,
            sentiments: analysisResult.sentiment,
            insights: analysisResult.insights,
            comments: analysisResult.comments
          }
        };

        const response = await fetch("/api/ai/insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody),
          signal
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "生成深度洞见失败");
        }

        updateSession({
          progress: 70,
          currentStep: "正在解析AI分析结果..."
        });

        const responseData = await response.json();

        console.log("API响应数据:", responseData);
        console.log("AI内容长度:", responseData.data?.length || 0);
        console.log("AI内容预览:", responseData.data?.substring(0, 500) || "无内容");

        if (signal.aborted) return;

        updateSession({
          progress: 90,
          currentStep: "正在格式化洞见报告..."
        });

        const deepInsight: DeepInsight = {
          id: newSession.id,
          createdAt: Date.now(),
          topics,
          content: responseData.data || "",
          keyFindings: [],
          recommendations: [],
          usage: undefined
        };

        const finalSession: DeepInsightSession = {
          ...newSession,
          status: "success",
          progress: 100,
          currentStep: "深度洞见生成完成！",
          result: deepInsight,
          error: null,
          completedAt: Date.now(),
        };

        setSession(finalSession);

      } catch (error) {
        if (!signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : "生成深度洞见时发生未知错误";

          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: "error",
              progress: prev.progress,
              currentStep: errorMessage,
              error: errorMessage,
              completedAt: Date.now(),
            };
          });
        }
      }
    },
    [updateSession]
  );

  /**
   * 取消当前生成
   */
  const cancelGeneration = useCallback(() => {
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
        currentStep: "用户取消了深度洞见生成",
        error: "用户取消了操作",
        completedAt: Date.now(),
      };
    });
  }, []);

  /**
   * 重置会话状态
   */
  const resetSession = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setSession(null);
  }, []);

  /**
   * 组件卸载时清理资源
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    session,
    generateDeepInsights,
    cancelGeneration,
    resetSession,
  };
}