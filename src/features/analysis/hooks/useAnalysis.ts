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
  FetchStats,
  CrawlJob,
  GetJobResultsSummaryResponse,
  GetJobResultsCommentsResponse,
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
  /**
   * 导出为 Excel 格式
   * @param searchResults 搜索结果数据
   * @returns Excel 文件 Blob
   */
  exportToExcel: (searchResults: SearchResult[]) => Blob | null;

  /**
   * Jobs 结果：分页加载更多评论（cursor）
   */
  loadMoreComments: () => Promise<void>;
  /**
   * 是否还有更多评论可加载（仅 Jobs）
   */
  hasMoreComments: boolean;
  /**
   * 是否正在加载更多评论
   */
  isLoadingMoreComments: boolean;

  /**
   * 导出全量结果（Jobs 会按需拉取 <=1万 条评论）
   */
  exportResultFull: (format: "json" | "csv") => Promise<string | null>;
  /**
   * 导出全量 Excel（Jobs 会按需拉取 <=1万 条评论）
   */
  exportToExcelFull: (searchResults: SearchResult[]) => Promise<Blob | null>;
}

// ==================== 轮询配置 ====================
const POLL_INTERVAL_INITIAL_MS = 1000;
const POLL_INTERVAL_MAX_MS = 5000;
// 原来 3 分钟会导致 Jobs 仍在跑时就回退 legacy（legacy 通常只有 100 条上限）
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // 15 分钟

/**
 * 生成唯一会话 ID
 * @returns 唯一 ID 字符串
 */
function generateSessionId(): string {
  return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 从 topics 构建 POST /api/jobs/crawl 请求体
 */
function buildCrawlRequestBody(
  topics: SearchResult[],
  maxComments: number
): { source: "reddit"; target_comments: number; max_comments: number; analysis_scope: "full"; filters?: { subreddits?: string[]; post_ids?: string[] } } {
  const subreddits: string[] = [];
  const postIds: string[] = [];
  for (const t of topics) {
    if ("subscriber_count" in t) {
      subreddits.push(t.display_name);
    } else {
      postIds.push(t.id);
    }
  }
  const target = Math.min(maxComments * Math.max(1, topics.length), 10000);
  const body: { source: "reddit"; target_comments: number; max_comments: number; analysis_scope: "full"; filters?: { subreddits?: string[]; post_ids?: string[] } } = {
    source: "reddit",
    target_comments: Math.max(1, target),
    max_comments: Math.min(10000, target),
    analysis_scope: "full",
  };
  if (subreddits.length > 0 || postIds.length > 0) {
    body.filters = {};
    if (subreddits.length > 0) body.filters.subreddits = subreddits;
    if (postIds.length > 0) body.filters.post_ids = postIds;
  }
  return body;
}

function estimateTotalComments(topics: SearchResult[]): number {
  const postTotal = topics
    .filter((t): t is Extract<SearchResult, { num_comments: number }> => "num_comments" in t)
    .reduce((sum, t) => sum + (t.num_comments || 0), 0);
  return postTotal > 0 ? postTotal : topics.length * 1000;
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
  const jobIdRef = useRef<string | null>(null);
  const jobsFailureReasonRef = useRef<string | null>(null);
  const workerManagerRef = useRef<ReturnType<typeof getNLPWorkerManager> | null>(null);
  const [commentsNextCursor, setCommentsNextCursor] = useState<string | null>(null);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const configRef = useRef<AnalysisConfig>({
    maxComments: 1000,
    minKeywordLength: 3,
    topKeywordsCount: 100,
    sentimentThreshold: 0.3,
    enableInsightDetection: true,
  });

  const hasMoreComments = !!commentsNextCursor;

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
          return await redditApi.getSubredditComments(topic.display_name, 10, 100);
        } else {
          updateSession({
            currentStep: `正在获取帖子 "${topic.title.substring(0, 30)}..." 的评论...`,
          });
          // 多排序抽样合并，提升 legacy 模式下评论数量（每 sort 约 100 条，5 sort 可超 200）
          const SORTS: Array<"confidence" | "top" | "new" | "controversial" | "old"> = [
            "confidence",
            "top",
            "new",
            "controversial",
            "old",
          ];
          const seen = new Set<string>();
          const merged: { id: string; body: string; author: string; score: number; created_utc: number; parent_id: string }[] = [];
          for (const sort of SORTS) {
            try {
              const comments = await redditApi.getComments(topic.id, topic.subreddit, undefined, sort);
              for (const c of comments) {
                if (c.body?.trim() && !seen.has(c.id)) {
                  seen.add(c.id);
                  merged.push({ id: c.id, body: c.body, author: c.author, score: c.score, created_utc: c.created_utc, parent_id: c.parent_id });
                }
              }
              await new Promise((r) => setTimeout(r, 600));
            } catch {
              // 单个 sort 失败不影响其他
            }
          }
          return merged;
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
        // 设置 60 秒超时（处理 1000 条评论需要更长时间）
        const result = await workerManager.execute<AnalysisResult>(
          comments,
          configRef.current,
          60000
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
   * Jobs 流程：POST crawl -> 轮询状态 -> GET results
   * 失败时返回 null，触发回退
   */
  const runJobsFlow = useCallback(
    async (topics: SearchResult[], signal: AbortSignal): Promise<AnalysisResult | null> => {
      const maxComments = configRef.current.maxComments;
      const body = buildCrawlRequestBody(topics, maxComments);

      updateSession({ currentStep: "正在提交采集任务..." });

      let createRes: Response;
      try {
        createRes = await fetch("/api/jobs/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        });
      } catch (e) {
        jobsFailureReasonRef.current = "提交任务时网络异常，请检查是否已启动 Next 服务与网络连接";
        console.warn("[useAnalysis] Jobs crawl 请求异常:", e);
        return null;
      }

      if (!createRes || !createRes.ok) {
        const status = createRes?.status;
        const errText = createRes ? await createRes.text().catch(() => "") : "";
        console.warn("[useAnalysis] Jobs crawl 请求失败:", status ?? "(无响应)", errText);

        // 429：不要回退到 legacy（legacy 更不完整），直接提示用户等待重试
        if (status === 429) {
          throw createRateLimitError();
        }

        jobsFailureReasonRef.current =
          status === 400
            ? "请求参数校验未通过，请确认选择主题后重试"
            : `服务端返回 ${status}，请查看控制台或稍后重试`;
        return null;
      }

      let createData: { job_id: string };
      try {
        createData = await createRes.json();
      } catch {
        jobsFailureReasonRef.current = "任务创建响应解析失败";
        console.warn("[useAnalysis] Jobs crawl 响应解析失败");
        return null;
      }

      const jobId = createData?.job_id;
      if (!jobId) {
        jobsFailureReasonRef.current = "服务未返回任务 ID";
        console.warn("[useAnalysis] Jobs crawl 未返回 job_id");
        return null;
      }

      jobIdRef.current = jobId;
      updateSession({ currentStep: "任务已提交，轮询中..." });

      // 轮询：初始 1s，退避至 5s，超时约 3 分钟
      let intervalMs = POLL_INTERVAL_INITIAL_MS;
      const startTime = Date.now();
      let job: CrawlJob | null = null;

      while (Date.now() - startTime < POLL_TIMEOUT_MS) {
        if (signal.aborted) return null;
        await new Promise((r) => setTimeout(r, intervalMs));
        if (signal.aborted) return null;

        let statusRes: Response;
        try {
          statusRes = await fetch(`/api/jobs/${jobId}`, { signal });
        } catch (e) {
          jobsFailureReasonRef.current = "轮询任务状态时网络异常";
          console.warn("[useAnalysis] Jobs 状态查询异常:", e);
          return null;
        }
        if (!statusRes.ok) {
          jobsFailureReasonRef.current = `获取任务状态失败 (HTTP ${statusRes.status})`;
          console.warn("[useAnalysis] Jobs 状态查询失败:", statusRes.status);
          return null;
        }
        job = (await statusRes.json()) as CrawlJob;
        if (!job?.job_id) {
          jobsFailureReasonRef.current = "任务状态数据异常";
          return null;
        }

        const status = job.status;
        const progress = job.progress;
        const analyzed = progress?.analyzed_comments ?? 0;
        updateSession({
          progress: Math.min(90, 20 + Math.round((analyzed / (job.target_comments || 1)) * 70)),
          currentStep: `采集进度: ${analyzed} 条评论...`,
        });

        if (status === "completed" || status === "partial_success") {
          break;
        }
        if (status === "failed" || status === "cancelled") {
          const serverMsg = job?.errors?.last_error_message;
          jobsFailureReasonRef.current =
            status === "failed"
              ? serverMsg
                ? `服务端采集失败：${serverMsg}（可配置 HTTP_PROXY 或稍后重试）`
                : "服务端采集失败（常见原因：Reddit 限流/网络不通，请配置 HTTP_PROXY 或稍后重试）"
              : "任务已取消";
          console.warn("[useAnalysis] Jobs 终态异常:", status, serverMsg || "");
          return null;
        }

        intervalMs = Math.min(intervalMs + 500, POLL_INTERVAL_MAX_MS);
      }

      if (!job || (job.status !== "completed" && job.status !== "partial_success")) {
        console.warn("[useAnalysis] Jobs 轮询超时或未完成");
        // 不回退 legacy：这种情况下 legacy 很可能只给 100 条，误导“只能分析100”
        throw createTimeoutError();
      }

      // GET results
      updateSession({ currentStep: "正在获取分析结果..." });
      let resultsRes: Response;
      try {
        resultsRes = await fetch(`/api/jobs/${jobId}/results?view=summary`, { signal });
      } catch (e) {
        jobsFailureReasonRef.current = "获取分析结果时网络异常";
        console.warn("[useAnalysis] Jobs results 请求异常:", e);
        return null;
      }
      if (!resultsRes.ok) {
        jobsFailureReasonRef.current = `获取结果失败 (HTTP ${resultsRes.status})`;
        console.warn("[useAnalysis] Jobs results 请求失败:", resultsRes.status);
        return null;
      }

      const resultsData = (await resultsRes.json()) as GetJobResultsSummaryResponse;
      const summary = resultsData?.summary;
      const analyzedCount = summary?.analyzed_comments ?? job.progress.analyzed_comments ?? 0;

      if (analyzedCount === 0) {
        jobsFailureReasonRef.current = "Jobs 未抓取到任何评论（可能 Reddit 限流或帖子无评论）";
        console.warn("[useAnalysis] Jobs 返回 0 条分析结果，回退");
        return null;
      }

      // 优先使用后端返回的完整 analysis_result
      const serverAnalysis = summary?.analysis_result;
      const dist = summary?.sentiment_distribution ?? { positive: 0, neutral: 0, negative: 0 };
      const total = dist.positive + dist.neutral + dist.negative || 1;
      const sentiment = {
        positive: dist.positive,
        negative: dist.negative,
        neutral: dist.neutral,
        positivePercentage: Math.round((dist.positive / total) * 100),
        negativePercentage: Math.round((dist.negative / total) * 100),
        neutralPercentage: Math.round((dist.neutral / total) * 100),
      };
      const topKeywords = summary?.top_keywords ?? [];
      const keywords = topKeywords.map((word) => ({ word, count: 1, sentiment: "neutral" as const }));
      const insights = (summary?.top_insight_types ?? []).slice(0, 5).map((type, i) => ({
        id: `insight_${i}`,
        type: type as "pain_point" | "feature_request" | "praise" | "question",
        title: String(type),
        description: "",
        confidence: 0.5,
        relatedComments: [],
      }));

      const statsFromSummary = summary?.fetch_stats;
      const fetchStats: FetchStats = {
        totalAvailable: estimateTotalComments(topics),
        rawFetched: statsFromSummary?.raw_fetched ?? job.progress.raw_fetched,
        uniqueNormalized:
          statsFromSummary?.unique_normalized ?? job.progress.unique_normalized,
        analyzedComments:
          statsFromSummary?.analyzed_comments ?? job.progress.analyzed_comments,
        completionGap:
          statsFromSummary?.completion_gap ?? job.progress.completion_gap,
        source: "jobs",
      };

      // P1：summary 不返回完整 comments，单独分页取第一页（提升大结果响应速度）
      let commentsPage: AnalysisResult["comments"] = [];
      try {
        const commentsRes = await fetch(
          `/api/jobs/${jobId}/results?view=comments&limit=100&cursor=0`,
          { signal }
        );
        if (commentsRes.ok) {
          const data = (await commentsRes.json()) as GetJobResultsCommentsResponse;
          commentsPage = Array.isArray(data?.comments) ? data.comments : [];
          setCommentsNextCursor(data?.pagination?.next_cursor ?? null);
        }
      } catch {
        // ignore: comments 失败不阻断整体结果
      }

      const result: AnalysisResult = {
        keywords: serverAnalysis?.keywords ?? keywords,
        sentiment: serverAnalysis?.sentiment ?? sentiment,
        insights: serverAnalysis?.insights ?? insights,
        comments: commentsPage,
        fetchStats,
      };
      return result;
    },
    [updateSession]
  );

  /**
   * 旧链路：redditApi + 本地分析，保证功能不瘫痪
   */
  const runLegacyFlow = useCallback(
    async (topics: SearchResult[], signal: AbortSignal): Promise<AnalysisResult> => {
      let allComments: {
        id: string;
        body: string;
        author: string;
        score: number;
        created_utc: number;
        parent_id: string;
      }[] = [];
      const totalTopics = topics.length;
      const fetchErrors: Array<{ topicId: string; error: Error }> = [];

      for (let i = 0; i < topics.length; i++) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
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
        }
      }

      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (allComments.length === 0) {
        throw createNoDataError(
          fetchErrors.length > 0
            ? "获取评论失败，请检查网络连接或选择其他主题"
            : "未找到可分析的评论，请尝试选择其他主题"
        );
      }

      updateSession({
        status: "analyzing",
        progress: 50,
        currentStep: `获取到 ${allComments.length} 条评论，开始分析...`,
      });
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");

      updateSession({ progress: 60, currentStep: "正在进行情感分析和关键词提取..." });

      let result: AnalysisResult;
      try {
        result = await analyzeWithWorker(allComments);
        if ((!result.comments || result.comments.length === 0) && allComments.length > 0) {
          const recoveredComments = allComments.map((c) => ({
            ...c,
            sentiment: "neutral" as const,
            sentimentScore: 0,
            keywords: [],
          }));
          result = { ...result, comments: recoveredComments };
        }
      } catch (workerError) {
        console.error("Worker 分析失败，回退到主线程分析:", workerError);
        result = analyzeCommentsLib(allComments, configRef.current);
      }

      const fetchStats: FetchStats = {
        totalAvailable: estimateTotalComments(topics),
        rawFetched: allComments.length,
        uniqueNormalized: allComments.length,
        analyzedComments: result.comments.length,
        completionGap: 0,
        source: "legacy",
        legacyFallbackReason: jobsFailureReasonRef.current ?? undefined,
      };
      return { ...result, fetchStats };
    },
    [fetchCommentsForTopic, updateSession, analyzeWithWorker]
  );

  /**
   * 开始分析
   * 优先 Jobs API，失败/不可用时回退到旧链路
   */
  const startAnalysis = useCallback(
    async (topics: SearchResult[]) => {
      setErrorInfo(null);
      if (!topics || topics.length === 0) {
        const error = createInvalidInputError("请先选择要分析的主题");
        setErrorInfo(convertToErrorInfo(error));
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

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      jobIdRef.current = null;
      jobsFailureReasonRef.current = null;
      setCommentsNextCursor(null);
      setIsLoadingMoreComments(false);
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
        let result: AnalysisResult | null = await runJobsFlow(topics, signal);

        if (result === null && !signal.aborted) {
          console.warn("[useAnalysis] Jobs 不可用或失败，回退到旧链路");
          updateSession({ currentStep: "回退到本地采集分析..." });
          result = await runLegacyFlow(topics, signal);
        }

        if (signal.aborted) return;
        if (result) {
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
        }
      } catch (error) {
        if (!signal.aborted) handleError(error);
      }
    },
    [runJobsFlow, runLegacyFlow, handleError]
  );

  /**
   * 取消当前分析
   * 若有 jobId 则调用 /api/jobs/{jobId}/cancel
   */
  const cancelAnalysis = useCallback(async () => {
    const jobId = jobIdRef.current;
    if (jobId) {
      try {
        await fetch(`/api/jobs/${jobId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "operator_request" }),
        });
      } catch (error) {
        console.warn("Jobs cancel 请求失败:", error);
      }
      jobIdRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      const workerManager = getWorkerManager();
      workerManager.cancel();
    } catch (error) {
      console.error("取消 Worker 任务失败:", error);
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
    setErrorInfo(null);
    setCommentsNextCursor(null);
    setIsLoadingMoreComments(false);
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
    setCommentsNextCursor(null);
    setIsLoadingMoreComments(false);
  }, [getWorkerManager]);

  /**
   * Jobs：分页加载更多评论
   */
  const loadMoreComments = useCallback(async (): Promise<void> => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    if (!commentsNextCursor) return;
    if (isLoadingMoreComments) return;

    setIsLoadingMoreComments(true);
    try {
      const res = await fetch(
        `/api/jobs/${jobId}/results?view=comments&limit=100&cursor=${encodeURIComponent(commentsNextCursor)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as GetJobResultsCommentsResponse;
      const next = data?.pagination?.next_cursor ?? null;
      const newComments = Array.isArray(data?.comments) ? data.comments : [];

      setCommentsNextCursor(next);
      setSession((prev) => {
        if (!prev?.result) return prev;
        const existing = Array.isArray(prev.result.comments) ? prev.result.comments : [];
        return {
          ...prev,
          result: {
            ...prev.result,
            comments: [...existing, ...newComments],
          },
        };
      });
    } catch {
      // ignore
    } finally {
      setIsLoadingMoreComments(false);
    }
  }, [commentsNextCursor, isLoadingMoreComments]);

  /**
   * Jobs：拉取全量评论（<=1万）用于导出
   */
  const fetchAllJobCommentsForExport = useCallback(
    async (jobId: string): Promise<AnalysisResult["comments"]> => {
      const res = await fetch(
        `/api/jobs/${jobId}/results?view=comments&full=1`
      );
      if (!res.ok) return [];
      const data = (await res.json()) as GetJobResultsCommentsResponse;
      return Array.isArray(data?.comments) ? data.comments : [];
    },
    []
  );

  /**
   * 导出分析结果
   * @param format 导出格式
   * @returns 导出的数据字符串
   */
  const buildExportString = useCallback(
    (format: "json" | "csv", result: AnalysisResult, topics: SearchResult[]): string | null => {
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
              items: topics.map((topic) => {
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
                }
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
              }),
            },
            statistics: {
              totalComments: result.comments.length,
              totalKeywords: result.keywords.length,
              totalInsights: result.insights.length,
              sentimentDistribution: result.sentiment,
            },
            keywords: result.keywords.map((kw) => ({
              word: kw.word,
              count: kw.count,
              sentiment: kw.sentiment || "neutral",
            })),
            sentiment: {
              distribution: result.sentiment,
              comments: result.comments.map((c) => ({
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
            insights: result.insights.map((insight) => ({
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
        sections.push(`"正面评论",${result.sentiment?.positive || 0}`);
        sections.push(`"负面评论",${result.sentiment?.negative || 0}`);
        sections.push(`"中性评论",${result.sentiment?.neutral || 0}`);
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

        // 5. 评论数据
        sections.push("=== 评论数据 ===");
        sections.push("作者,评分,情感,情感分数,评论内容");
        for (const comment of result.comments) {
          const sentimentLabels = {
            positive: "正面",
            negative: "负面",
            neutral: "中性",
          };
          sections.push(
            `"${comment.author}",${comment.score},"${sentimentLabels[comment.sentiment]}",${comment.sentimentScore.toFixed(2)},"${comment.body.replace(/"/g, '""').substring(0, 500)}"`
          );
        }

        return sections.join("\n");
      }

      return null;
    },
    []
  );

  const exportResult = useCallback(
    (format: "json" | "csv"): string | null => {
      if (!session?.result) {
        return null;
      }

      return buildExportString(format, session.result, session.topics);
    },
    [buildExportString, session]
  );

  const exportResultFull = useCallback(
    async (format: "json" | "csv"): Promise<string | null> => {
      if (!session?.result) return null;
      const jobId = jobIdRef.current;

      // legacy 已是全量；jobs 可能只加载了第一页
      if (session.result.fetchStats?.source === "jobs" && jobId) {
        const comments = await fetchAllJobCommentsForExport(jobId);
        return buildExportString(format, { ...session.result, comments }, session.topics);
      }

      return buildExportString(format, session.result, session.topics);
    },
    [buildExportString, fetchAllJobCommentsForExport, session]
  );

  /**
   * 导出为 Excel 文件（多工作表）
   * @param allSearchResults 所有搜索结果（可选）
   * @returns Blob 对象，可用于下载
   */
  const buildExcelBlob = useCallback(
    (
      result: AnalysisResult,
      topics: SearchResult[],
      allSearchResults?: SearchResult[]
    ): Blob => {

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 1. 所有搜索结果工作表（如果提供）
    if (allSearchResults && allSearchResults.length > 0) {
      const allResultsData = allSearchResults.map((topic, index) => {
        if ("subscriber_count" in topic) {
          return {
            "序号": index + 1,
            "类型": "Subreddit",
            "ID": topic.id,
            "名称": topic.display_name,
            "标题": topic.title,
            "描述": topic.description.substring(0, 200),
            "订阅数": topic.subscriber_count,
            "是否已选": topics.some(t => t.id === topic.id) ? "是" : "否",
            "URL": topic.url,
          };
        } else {
          return {
            "序号": index + 1,
            "类型": "Post",
            "ID": topic.id,
            "标题": topic.title,
            "作者": topic.author,
            "所属社区": topic.subreddit,
            "评分": topic.score,
            "评论数": topic.num_comments,
            "是否已选": topics.some(t => t.id === topic.id) ? "是" : "否",
            "URL": topic.url,
          };
        }
      });
      const allResultsSheet = XLSX.utils.json_to_sheet(allResultsData);
      XLSX.utils.book_append_sheet(workbook, allResultsSheet, "所有搜索结果");
    }

    // 2. 已选主题信息工作表
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
    XLSX.utils.book_append_sheet(workbook, topicsSheet, "已选主题");

    // 3. 统计概览工作表
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

    // 4. 关键词工作表
    const keywordsData = result.keywords.map(kw => ({
      "关键词": kw.word,
      "出现次数": kw.count,
      "情感倾向": kw.sentiment || "neutral",
    }));
    const keywordsSheet = XLSX.utils.json_to_sheet(keywordsData);
    XLSX.utils.book_append_sheet(workbook, keywordsSheet, "关键词");

    // 5. 洞察工作表
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

    // 6. 洞察详细评论工作表
    const insightCommentsData: any[] = [];
    for (const insight of result.insights) {
      // 找到该洞察相关的评论
      const relatedComments = result.comments.filter(c =>
        insight.relatedComments.includes(c.id)
      );
      
      for (const comment of relatedComments) {
        const sentimentLabels = {
          positive: "正面",
          negative: "负面",
          neutral: "中性",
        };
        insightCommentsData.push({
          "洞察类型": typeLabels[insight.type],
          "洞察标题": insight.title,
          "评论作者": comment.author,
          "评论评分": comment.score,
          "情感": sentimentLabels[comment.sentiment],
          "情感分数": comment.sentimentScore.toFixed(2),
          "评论内容": comment.body,
          "评论链接": comment.permalink ? `https://www.reddit.com${comment.permalink}` : "",
        });
      }
    }
    const insightCommentsSheet = XLSX.utils.json_to_sheet(insightCommentsData);
    XLSX.utils.book_append_sheet(workbook, insightCommentsSheet, "洞察详细评论");

    // 7. 情感分析工作表
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
    },
    []
  );

  const exportToExcel = useCallback(
    (allSearchResults?: SearchResult[]): Blob | null => {
      if (!session?.result) return null;
      return buildExcelBlob(session.result, session.topics, allSearchResults);
    },
    [buildExcelBlob, session]
  );

  const exportToExcelFull = useCallback(
    async (allSearchResults: SearchResult[]): Promise<Blob | null> => {
      if (!session?.result) return null;
      const jobId = jobIdRef.current;

      if (session.result.fetchStats?.source === "jobs" && jobId) {
        const comments = await fetchAllJobCommentsForExport(jobId);
        return buildExcelBlob(
          { ...session.result, comments },
          session.topics,
          allSearchResults
        );
      }

      return buildExcelBlob(session.result, session.topics, allSearchResults);
    },
    [buildExcelBlob, fetchAllJobCommentsForExport, session]
  );

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 清理 AbortController
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      } catch (error) {
        console.error('AbortController cleanup 失败:', error);
      }

      // 注意：不要在组件卸载时 terminate Worker
      // Worker 采用全局单例模式，会自动管理生命周期
      // 只需要取消当前任务即可
      try {
        if (workerManagerRef.current) {
          workerManagerRef.current.cancel();
          // 不设置为 null，保持 Worker 实例存活
        }
      } catch (error) {
        console.error('Worker cancel 失败:', error);
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
    loadMoreComments,
    hasMoreComments,
    isLoadingMoreComments,
    exportResultFull,
    exportToExcelFull,
  };
}
