"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { redditApi } from "@/lib/api/reddit";
import { analyzeComments as analyzeCommentsLib } from "@/lib/nlp";
import { getNLPWorkerManager } from "@/lib/workers/worker-manager";
import * as XLSX from "xlsx";
import {
  normalizeError,
  isAppError,
  createNetworkError,
  createTimeoutError,
  createNoDataError,
  createInvalidInputError,
  createWorkerError,
  createWorkerTimeoutError,
  createRateLimitError,
  createAuthError,
  createNotFoundError,
  createServerError,
  type ErrorType,
} from "@/lib/errors";
import type {
  SearchResult,
  AnalysisSession,
  AnalysisResult,
  AnalysisConfig,
  ErrorInfo,
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
   * 错误信息（用于 UI 展示）
   */
  errorInfo: ErrorInfo | null;
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
 * 将 AppError 转换为 ErrorInfo
 */
function convertToErrorInfo(appError: ReturnType<typeof normalizeError>): ErrorInfo {
  const canRetry = appError.recoveryActions.some(
    (action) => action.autoRecoverable
  );
  const autoRetryAction = appError.recoveryActions.find(
    (action) => action.autoRecoverable && action.autoRecoverDelay
  );

  return {
    type: appError.type,
    code: appError.code,
    userMessage: appError.userMessage,
    severity: appError.severity,
    recoveryActions: appError.recoveryActions,
    canRetry,
    retryDelay: autoRetryAction?.autoRecoverDelay,
  };
}

/**
 * 处理 Reddit API 错误
 */
function handleRedditApiError(error: unknown): ReturnType<typeof normalizeError> {
  const appError = normalizeError(error);

  // 如果已经是 AppError，直接返回
  if (isAppError(appError)) {
    return appError;
  }

  // 根据错误消息判断具体类型
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('429') || message.includes('rate limit')) {
    return createRateLimitError();
  }

  if (message.includes('401') || message.includes('unauthorized')) {
    return createAuthError(error instanceof Error ? error : undefined);
  }

  if (message.includes('404') || message.includes('not found')) {
    return createNotFoundError('主题或社区');
  }

  if (message.includes('5') || message.includes('server')) {
    return createServerError(
      500,
      error instanceof Error ? error : undefined
    );
  }

  if (message.includes('timeout')) {
    return createTimeoutError(error instanceof Error ? error : undefined);
  }

  if (message.includes('network') || message.includes('fetch')) {
    return createNetworkError(error instanceof Error ? error : undefined);
  }

  return appError;
}

/**
 * 主题搜索 Hook
 * 管理评论分析状态、结果获取和导出功能
 * 使用 Web Worker 进行后台计算，避免阻塞 UI
 */
export function useAnalysis(): UseAnalysisReturn {
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const workerManagerRef = useRef<ReturnType<typeof getNLPWorkerManager> | null>(null);
  const configRef = useRef<AnalysisConfig>({
    maxComments: 500,
    minKeywordLength: 3,
    topKeywordsCount: 30,
    sentimentThreshold: 0.3,
    enableInsightDetection: true,
  });

  /**
   * 获取 Worker 管理器实例
   */
  const getWorkerManager = useCallback(() => {
    if (!workerManagerRef.current) {
      workerManagerRef.current = getNLPWorkerManager();
    }
    return workerManagerRef.current;
  }, []);

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
   * 处理错误
   */
  const handleError = useCallback((error: unknown) => {
    const appError = handleRedditApiError(error);
    const info = convertToErrorInfo(appError);

    setErrorInfo(info);

    // 更新会话错误状态
    setSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        status: "error",
        progress: 100,
        currentStep: appError.userMessage,
        error: appError.message,
        completedAt: Date.now(),
      };
    });

    console.error("分析错误:", appError);

    return appError;
  }, []);

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
      try {
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
      } catch (error) {
        // 继续处理，让外层决定是否终止
        throw error;
      }
    },
    [updateSession]
  );

  /**
   * 使用 Worker 进行 NLP 分析
   * @param comments 评论数组
   * @returns 分析结果
   */
  const analyzeWithWorker = useCallback(
    async (
      comments: Array<{
        id: string;
        body: string;
        author: string;
        score: number;
        created_utc: number;
        parent_id: string;
      }>
    ): Promise<AnalysisResult> => {
      const workerManager = getWorkerManager();

      try {
        // 设置 30 秒超时
        const result = await workerManager.execute<AnalysisResult>(
          comments,
          configRef.current,
          30000
        );

        return result;
      } catch (error) {
        // Worker 错误处理
        const message = error instanceof Error ? error.message.toLowerCase() : '';

        if (message.includes('timeout')) {
          throw createWorkerTimeoutError();
        }

        if (message.includes('init') || message.includes('初始化')) {
          throw createWorkerError(
            error instanceof Error ? error : undefined,
            { phase: 'worker_init' }
          );
        }

        throw createWorkerError(
          error instanceof Error ? error : undefined,
          { phase: 'worker_execution' }
        );
      }
    },
    [getWorkerManager]
  );

  /**
   * 开始分析
   * 获取所有选中主题的评论并进行分析
   * @param topics 要分析的主题列表
   */
  const startAnalysis = useCallback(
    async (topics: SearchResult[]) => {
      // 清除之前的错误
      setErrorInfo(null);

      if (!topics || topics.length === 0) {
        const error = createInvalidInputError('请先选择要分析的主题');
        const info = convertToErrorInfo(error);
        setErrorInfo(info);

        setSession({
          id: generateSessionId(),
          topics: [],
          status: "error",
          progress: 0,
          currentStep: error.userMessage,
          result: null,
          error: error.message,
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
        let fetchErrors: Array<{ topicId: string; error: Error }> = [];

        // 获取评论
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
            fetchErrors.push({
              topicId: topic.id,
              error: error instanceof Error ? error : new Error(String(error)),
            });
            // 继续处理其他主题，不完全中断
          }
        }

        if (signal.aborted) {
          return;
        }

        if (allComments.length === 0) {
          const error = createNoDataError(
            fetchErrors.length > 0
              ? '获取评论失败，请检查网络连接或选择其他主题'
              : '未找到可分析的评论，请尝试选择其他主题'
          );
          const info = convertToErrorInfo(error);
          setErrorInfo(info);

          updateSession({
            status: "error",
            progress: 100,
            currentStep: error.userMessage,
            error: error.message,
          });
          return;
        }

        updateSession({
          status: "analyzing",
          progress: 50,
          currentStep: `获取到 ${allComments.length} 条评论，开始分析...`,
        });

        if (signal.aborted) {
          return;
        }

        // 更新进度
        updateSession({
          progress: 60,
          currentStep: '正在进行情感分析和关键词提取...',
        });

        // 使用 Worker 进行分析
        let result: AnalysisResult;
        try {
          result = await analyzeWithWorker(allComments);
          
          // 完整性检查：如果 Worker 返回的 comments 为空但原始数据不为空
          if ((!result.comments || result.comments.length === 0) && allComments.length > 0) {
            console.warn("Worker 返回数据异常 (comments丢失)，尝试修复...");
            
            // 尝试修复：将原始评论转换为 SentimentComment 格式
            const recoveredComments = allComments.map(c => ({
              ...c,
              sentiment: "neutral" as const,
              sentimentScore: 0,
              keywords: []
            }));
            
            result = {
              ...result,
              comments: recoveredComments
            };
            
            console.log("已使用原始评论数据修复 result.comments，数量:", result.comments.length);
          }
        } catch (workerError) {
          console.error("Worker 分析失败，回退到主线程分析:", workerError);
          // 降级：主线程执行
          result = analyzeCommentsLib(allComments, configRef.current);
        }

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
          handleError(error);
        }
      }
    },
    [fetchCommentsForTopic, updateSession, analyzeWithWorker, handleError]
  );

  /**
   * 取消当前分析
   */
  const cancelAnalysis = useCallback(() => {
    // 取消 API 请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 取消 Worker 任务
    try {
      const workerManager = getWorkerManager();
      workerManager.cancel();
    } catch (error) {
      console.error("取消 Worker 任务失败:", error);
    }

    // 更新会话状态
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

    // 清除错误信息
    setErrorInfo(null);
  }, [getWorkerManager]);

  /**
   * 重置分析状态
   */
  const resetAnalysis = useCallback(() => {
    // 取消 API 请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 取消 Worker 任务
    try {
      const workerManager = getWorkerManager();
      workerManager.cancel();
    } catch (error) {
      console.error("取消 Worker 任务失败:", error);
    }

    setSession(null);
    setErrorInfo(null);
  }, [getWorkerManager]);

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

      const { result, topics } = session;

      if (format === "json") {
        return JSON.stringify(
          {
            exportInfo: {
              exportDate: new Date().toISOString(),
              toolVersion: "1.0.0",
              dataSource: "Reddit API",
            },
            topics: {
              count: topics.length,
              items: topics.map(topic => {
                if ("subscriber_count" in topic) {
                  return {
                    type: "subreddit",
                    id: topic.id,
                    name: topic.display_name,
                    title: topic.title,
                    description: topic.description,
                    subscribers: topic.subscriber_count,
                    url: topic.url,
                  };
                } else {
                  return {
                    type: "post",
                    id: topic.id,
                    title: topic.title,
                    author: topic.author,
                    subreddit: topic.subreddit,
                    score: topic.score,
                    numComments: topic.num_comments,
                    url: topic.url,
                  };
                }
              }),
            },
            statistics: {
              totalComments: result.comments.length,
              totalKeywords: result.keywords.length,
              totalInsights: result.insights.length,
              sentimentDistribution: result.sentiment,
            },
            keywords: result.keywords.map(kw => ({
              word: kw.word,
              count: kw.count,
              sentiment: kw.sentiment || "neutral",
            })),
            sentiment: {
              distribution: result.sentiment,
              comments: result.comments.map(c => ({
                id: c.id,
                author: c.author,
                body: c.body,
                score: c.score,
                sentiment: c.sentiment,
                sentimentScore: c.sentimentScore,
                keywords: c.keywords,
                permalink: c.permalink,
              })),
            },
            insights: result.insights.map(insight => ({
              id: insight.id,
              type: insight.type,
              title: insight.title,
              description: insight.description,
              confidence: insight.confidence,
              count: insight.count,
              keyword: insight.keyword,
              relatedComments: insight.relatedComments,
            })),
          },
          null,
          2
        );
      }

      if (format === "csv") {
        const sections: string[] = [];

        // 1. 主题信息
        sections.push("=== 主题信息 ===");
        sections.push("类型,ID,名称/标题,订阅数/评分,评论数,URL");
        for (const topic of topics) {
          if ("subscriber_count" in topic) {
            sections.push(
              `"Subreddit","${topic.id}","${topic.display_name}",${topic.subscriber_count},-,"${topic.url}"`
            );
          } else {
            sections.push(
              `"Post","${topic.id}","${topic.title.replace(/"/g, '""')}",${topic.score},${topic.num_comments},"${topic.url}"`
            );
          }
        }
        sections.push("");

        // 2. 统计概览
        sections.push("=== 统计概览 ===");
        sections.push("指标,数值");
        sections.push(`"总评论数",${result.comments.length}`);
        sections.push(`"总关键词数",${result.keywords.length}`);
        sections.push(`"总洞察数",${result.insights.length}`);
        sections.push(`"正面评论",${result.sentiment.positive}`);
        sections.push(`"负面评论",${result.sentiment.negative}`);
        sections.push(`"中性评论",${result.sentiment.neutral}`);
        sections.push("");

        // 3. 关键词数据
        sections.push("=== 关键词 ===");
        sections.push("关键词,出现次数,情感倾向");
        for (const keyword of result.keywords) {
          const sentiment = keyword.sentiment || "neutral";
          sections.push(`"${keyword.word}",${keyword.count},"${sentiment}"`);
        }
        sections.push("");

        // 4. 洞察数据
        sections.push("=== 洞察 ===");
        sections.push("类型,标题,描述,置信度,相关评论数,关键词");
        for (const insight of result.insights) {
          const typeLabels: Record<typeof insight.type, string> = {
            pain_point: "用户痛点",
            feature_request: "功能需求",
            praise: "用户赞美",
            question: "用户问题",
          };
          sections.push(
            `"${typeLabels[insight.type]}","${insight.title}","${insight.description.replace(/"/g, '""')}",${Math.round(insight.confidence * 100)}%,${insight.relatedComments.length},"${insight.keyword || '-'}"`
          );
        }
        sections.push("");

        // 5. 评论数据（前100条）
        sections.push("=== 评论数据（前100条） ===");
        sections.push("作者,评分,情感,情感分数,评论内容");
        for (const comment of result.comments.slice(0, 100)) {
          const sentimentLabels = {
            positive: "正面",
            negative: "负面",
            neutral: "中性",
          };
          sections.push(
            `"${comment.author}",${comment.score},"${sentimentLabels[comment.sentiment]}",${comment.sentimentScore.toFixed(2)},"${comment.body.replace(/"/g, '""').substring(0, 200)}"`
          );
        }

        return sections.join("\n");
      }

      return null;
    },
    [session]
  );

  /**
   * 导出为 Excel 文件（多工作表）
   * @returns Blob 对象，可用于下载
   */
  const exportToExcel = useCallback((): Blob | null => {
    if (!session?.result) {
      return null;
    }

    const { result, topics } = session;

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 1. 主题信息工作表
    const topicsData = topics.map(topic => {
      if ("subscriber_count" in topic) {
        return {
          "类型": "Subreddit",
          "ID": topic.id,
          "名称": topic.display_name,
          "标题": topic.title,
          "描述": topic.description.substring(0, 100),
          "订阅数": topic.subscriber_count,
          "URL": topic.url,
        };
      } else {
        return {
          "类型": "Post",
          "ID": topic.id,
          "标题": topic.title,
          "作者": topic.author,
          "所属社区": topic.subreddit,
          "评分": topic.score,
          "评论数": topic.num_comments,
          "URL": topic.url,
        };
      }
    });
    const topicsSheet = XLSX.utils.json_to_sheet(topicsData);
    XLSX.utils.book_append_sheet(workbook, topicsSheet, "主题信息");

    // 2. 统计概览工作表
    const statsData = [
      { "指标": "总评论数", "数值": result.comments.length },
      { "指标": "总关键词数", "数值": result.keywords.length },
      { "指标": "总洞察数", "数值": result.insights.length },
      { "指标": "正面评论数", "数值": result.sentiment.positive },
      { "指标": "正面评论占比", "数值": `${result.sentiment.positivePercentage}%` },
      { "指标": "负面评论数", "数值": result.sentiment.negative },
      { "指标": "负面评论占比", "数值": `${result.sentiment.negativePercentage}%` },
      { "指标": "中性评论数", "数值": result.sentiment.neutral },
      { "指标": "中性评论占比", "数值": `${result.sentiment.neutralPercentage}%` },
    ];
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, "统计概览");

    // 3. 关键词工作表
    const keywordsData = result.keywords.map(kw => ({
      "关键词": kw.word,
      "出现次数": kw.count,
      "情感倾向": kw.sentiment || "neutral",
    }));
    const keywordsSheet = XLSX.utils.json_to_sheet(keywordsData);
    XLSX.utils.book_append_sheet(workbook, keywordsSheet, "关键词");

    // 4. 洞察工作表
    const typeLabels: Record<string, string> = {
      pain_point: "用户痛点",
      feature_request: "功能需求",
      praise: "用户赞美",
      question: "用户问题",
    };
    const insightsData = result.insights.map(insight => ({
      "类型": typeLabels[insight.type],
      "标题": insight.title,
      "描述": insight.description,
      "置信度": `${Math.round(insight.confidence * 100)}%`,
      "相关评论数": insight.relatedComments.length,
      "关键词": insight.keyword || "-",
    }));
    const insightsSheet = XLSX.utils.json_to_sheet(insightsData);
    XLSX.utils.book_append_sheet(workbook, insightsSheet, "洞察");

    // 5. 情感分析工作表
    const sentimentLabels = {
      positive: "正面",
      negative: "负面",
      neutral: "中性",
    };
    const commentsData = result.comments.map(comment => ({
      "作者": comment.author,
      "评分": comment.score,
      "情感": sentimentLabels[comment.sentiment],
      "情感分数": comment.sentimentScore.toFixed(2),
      "关键词": comment.keywords.join(", "),
      "评论内容": comment.body.substring(0, 500),
      "链接": comment.permalink ? `https://www.reddit.com${comment.permalink}` : "",
    }));
    const commentsSheet = XLSX.utils.json_to_sheet(commentsData);
    XLSX.utils.book_append_sheet(workbook, commentsSheet, "评论数据");

    // 生成 Excel 文件
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }, [session]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 清理 Worker 资源
      if (workerManagerRef.current) {
        workerManagerRef.current.terminate();
        workerManagerRef.current = null;
      }
    };
  }, []);

  return {
    session,
    errorInfo,
    startAnalysis,
    cancelAnalysis,
    resetAnalysis,
    exportResult,
    exportToExcel,
  };
}
