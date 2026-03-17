/**
 * GET /api/jobs/[jobId]
 * 查询任务状态
 */

import { NextResponse } from "next/server";
import type { ApiErrorPayload, GetJobStatusResponse } from "@/lib/types";
import { jobStore } from "@/lib/job-store";
import { jobsPollingRateLimiter, getClientIP } from "@/lib/rate-limiter";

function genRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

    if (!jobId) {
      const errBody: ApiErrorPayload = {
        error: {
          code: "JOB_NOT_FOUND",
          message: "缺少 jobId 参数",
          retryable: false,
        },
        request_id: requestId,
      };
      return NextResponse.json(errBody, { status: 404 });
    }

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

    const responseBody: GetJobStatusResponse = job;
    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error("[GET /api/jobs/[jobId]] Unexpected error:", err);
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
