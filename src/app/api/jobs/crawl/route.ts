/**
 * POST /api/jobs/crawl
 * 提交批量采集任务（P0 实现：返回 202，并异步执行抓取/分析任务）
 */

import { NextResponse } from "next/server";
import type { ApiErrorPayload, CreateCrawlJobResponse, CrawlJob } from "@/lib/types";
import {
  validateCreateCrawlJobRequest,
  resolveQosClass,
} from "@/lib/validators/jobs";
import { jobStore } from "@/lib/job-store";
import { jobsCreateRateLimiter, getClientIP } from "@/lib/rate-limiter";

// ==================== 限流（每 IP，10次/分钟）====================

function getCrawlRateLimiter() {
  // 测试环境每次请求都返回新实例，避免模块缓存污染用例
  if (process.env.NODE_ENV === "test") {
    const { RateLimiter } = require("@/lib/rate-limiter") as typeof import("@/lib/rate-limiter");
    return new RateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 10,
      name: "jobs-crawl",
    });
  }
  return jobsCreateRateLimiter;
}

// ==================== 工具函数 ====================

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function now(): string {
  return new Date().toISOString();
}

// ==================== 路由处理 ====================

export async function POST(request: Request): Promise<Response> {
  const requestId = genId("req");

  // ── 限流检查 ────────────────────────────────────────────────────────────
  const clientIp = getClientIP(request);
  const rateResult = getCrawlRateLimiter().check(clientIp);
  if (!rateResult.allowed) {
    const body: ApiErrorPayload = {
      error: {
        code: "RATE_LIMITED",
        message: `请求过于频繁，请在 ${rateResult.retryAfter ?? 60} 秒后重试`,
        retryable: true,
      },
      request_id: requestId,
    };
    return NextResponse.json(body, {
      status: 429,
      headers: {
        "Retry-After": String(rateResult.retryAfter ?? 60),
        "X-RateLimit-Limit": String(rateResult.limit),
        "X-RateLimit-Remaining": String(rateResult.remaining),
        "X-RateLimit-Reset": String(rateResult.resetAt),
      },
    });
  }

  // ── 解析请求体 ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const errBody: ApiErrorPayload = {
      error: {
        code: "INVALID_JOB_CONFIG",
        message: "请求体必须是合法的 JSON",
        retryable: false,
      },
      request_id: requestId,
    };
    return NextResponse.json(errBody, { status: 400 });
  }

  // ── 业务校验 ────────────────────────────────────────────────────────────
  try {
    const validation = validateCreateCrawlJobRequest(body);
    if (!validation.valid) {
      const errBody: ApiErrorPayload = {
        error: {
          code: "INVALID_JOB_CONFIG",
          message: "请求参数校验失败",
          retryable: false,
          details: validation.issues.map((issue) => ({
            field: issue.field,
            rule: issue.rule,
            expected: issue.expected,
            actual: issue.actual,
          })),
        },
        request_id: requestId,
      };
      return NextResponse.json(errBody, { status: 400 });
    }

    const req = body as Record<string, unknown>;
    const resolvedQos = validation.resolved_qos_class ?? resolveQosClass(
      typeof req.target_comments === "number" ? req.target_comments : 1
    );

    // ── 生成任务 ID，构建任务对象 ──────────────────────────────────────────
    const jobId = genId("job");
    const ts = now();

    const job: CrawlJob = {
      job_id: jobId,
      status: "queued",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source: req.source as any,
      target_comments: req.target_comments as number,
      max_comments: req.max_comments as number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      analysis_scope: req.analysis_scope as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qos_class: resolvedQos as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      priority: ((req.priority as string) || "normal") as any,
      filters: req.filters as CrawlJob["filters"],
      progress: {
        raw_fetched: 0,
        unique_normalized: 0,
        analyzed_comments: 0,
        completion_gap: req.target_comments as number,
        duplicate_count: 0,
        invalid_count: 0,
      },
      errors: {
        http_403_count: 0,
        http_429_count: 0,
        retry_count: 0,
      },
      timing: {
        queued_at: ts,
        updated_at: ts,
        elapsed_seconds: 0,
      },
    };

    // ── 持久化到内存存储 ───────────────────────────────────────────────────
    jobStore.set(job);

    // ── 非 test 环境：异步执行任务（不阻塞 202 响应）────────────────────────
    if (process.env.NODE_ENV !== "test") {
      import("@/lib/jobs/runner").then(({ runJob }) => {
        runJob(jobId).catch((e) =>
          console.error("[POST /api/jobs/crawl] runJob failed:", e)
        );
      });
    }

    // ── 构造 202 响应 ──────────────────────────────────────────────────────
    const responseBody: CreateCrawlJobResponse = {
      job_id: jobId,
      status: "queued",
      accepted_config: {
        target_comments: req.target_comments as number,
        max_comments: req.max_comments as number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        analysis_scope: req.analysis_scope as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        qos_class: resolvedQos as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        priority: ((req.priority as string) || "normal") as any,
      },
      limits: {
        max_allowed_comments: 10000,
      },
      links: {
        self: `/api/jobs/${jobId}`,
        results: `/api/jobs/${jobId}/results`,
      },
    };

    return NextResponse.json(responseBody, { status: 202 });
  } catch (err) {
    console.error("[POST /api/jobs/crawl] Unexpected error:", err);
    const errBody: ApiErrorPayload = {
      error: {
        code: "INVALID_JOB_CONFIG",
        message: "服务器内部错误，请稍后重试",
        retryable: true,
      },
      request_id: requestId,
    };
    return NextResponse.json(errBody, { status: 500 });
  }
}
