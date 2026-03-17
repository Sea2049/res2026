/**
 * GET /api/jobs/[jobId]/results
 * 查询任务分析结果
 * 支持 query 参数：view（summary/items，默认 summary）、limit（默认 20）、cursor
 * P0：从 job-results-store 返回真实 summary/items
 */

import { NextResponse } from "next/server";
import type {
  ApiErrorPayload,
  GetJobResultsSummaryResponse,
  GetJobResultsItemsResponse,
  GetJobResultsCommentsResponse,
  AnalysisSummary,
} from "@/lib/types";
import { jobStore } from "@/lib/job-store";
import { jobResultsStore } from "@/lib/job-results-store";
import { jobsPollingRateLimiter, getClientIP } from "@/lib/rate-limiter";

function genRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** 从 analysis_result 构建 summary 视图 */
function buildSummary(
  jobId: string,
  status: string,
  progress: { analyzed_comments: number },
  record: ReturnType<typeof jobResultsStore.getMeta>
): GetJobResultsSummaryResponse {
  const baseSummary: AnalysisSummary = {
    analyzed_comments: progress.analyzed_comments,
    sentiment_distribution: {
      positive: 0,
      neutral: 0,
      negative: 0,
    },
    top_keywords: [],
    top_insight_types: [],
  };

  if (!record) {
    return {
      job_id: jobId,
      status: status as GetJobResultsSummaryResponse["status"],
      summary: baseSummary,
      pagination: { next_cursor: null },
    };
  }

  const ar = record.analysis_result_summary;
  const fs = record.fetch_stats;

  const summary: AnalysisSummary = {
    analyzed_comments: record.progress.analyzed_comments,
    sentiment_distribution: ar?.sentiment
      ? {
          positive: ar.sentiment.positive,
          neutral: ar.sentiment.neutral,
          negative: ar.sentiment.negative,
        }
      : baseSummary.sentiment_distribution,
    top_keywords: ar?.keywords?.slice(0, 15).map((k) => k.word) ?? [],
    top_insight_types:
      ar?.insights?.slice(0, 10).map((i) => i.type) ?? [],
    fetch_stats: fs,
    analysis_result: ar
      ? {
          ...ar,
          comments: [], // P1：summary 不返回完整 comments，避免大 payload
        }
      : undefined,
  };

  return {
    job_id: jobId,
    status: record.status as GetJobResultsSummaryResponse["status"],
    summary,
    pagination: { next_cursor: null },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const requestId = genRequestId();

  // ── 限流检查（轮询专用，60次/分钟）────────────────────────────────────────
  const clientIp = getClientIP(request);
  const rateResult = jobsPollingRateLimiter.check(clientIp);
  if (!rateResult.allowed) {
    const errBody: ApiErrorPayload = {
      error: {
        code: "RATE_LIMITED",
        message: `请求过于频繁，请在 ${rateResult.retryAfter ?? 60} 秒后重试`,
        retryable: true,
      },
      request_id: requestId,
    };
    return NextResponse.json(errBody, {
      status: 429,
      headers: {
        "Retry-After": String(rateResult.retryAfter ?? 60),
        "X-RateLimit-Limit": String(rateResult.limit),
        "X-RateLimit-Remaining": String(rateResult.remaining),
        "X-RateLimit-Reset": String(rateResult.resetAt),
      },
    });
  }

  try {
    const { jobId } = await params;
    const { searchParams } = new URL(request.url);

    const view = (searchParams.get("view") ?? "summary") as "summary" | "items" | "comments";
    const full = searchParams.get("full") === "1";
    const defaultLimit = full && view === "comments" ? 10000 : 20;
    const rawLimit = parseInt(searchParams.get("limit") ?? String(defaultLimit), 10) || defaultLimit;
    const limit = full && view === "comments"
      ? Math.min(rawLimit, 10000)
      : Math.min(rawLimit, 100);
    const cursor = searchParams.get("cursor") ?? undefined;

    const job = jobStore.get(jobId);
    if (!job) {
      const errBody: ApiErrorPayload = {
        error: {
          code: "JOB_NOT_FOUND",
          message: `任务 ${jobId} 不存在`,
          retryable: false,
        },
        request_id: requestId,
      };
      return NextResponse.json(errBody, { status: 404 });
    }

    const meta = jobResultsStore.getMeta(jobId);

    if (view === "items") {
      const { items, next_cursor } = jobResultsStore.getItems(
        jobId,
        limit,
        cursor ?? undefined
      );
      const responseBody: GetJobResultsItemsResponse = {
        job_id: jobId,
        items: items.map(({ body, ...rest }) => rest),
        pagination: { next_cursor },
      };
      return NextResponse.json(responseBody, { status: 200 });
    }

    if (view === "comments") {
      const { comments, next_cursor } = jobResultsStore.getComments(
        jobId,
        limit,
        cursor ?? undefined
      );
      const responseBody: GetJobResultsCommentsResponse = {
        job_id: jobId,
        comments,
        pagination: { next_cursor },
      };
      return NextResponse.json(responseBody, { status: 200 });
    }

    const responseBody = buildSummary(
      jobId,
      job.status,
      job.progress,
      meta
    );
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error("[GET /api/jobs/[jobId]/results] Unexpected error:", err);
    const errBody: ApiErrorPayload = {
      error: {
        code: "JOB_NOT_FOUND",
        message: "服务器内部错误，请稍后重试",
        retryable: true,
      },
      request_id: requestId,
    };
    return NextResponse.json(errBody, { status: 500 });
  }
}
