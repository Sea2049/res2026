/**
 * POST /api/jobs/[jobId]/cancel
 * 取消任务
 */

import { NextResponse } from "next/server";
import type { ApiErrorPayload, CancelJobResponse, CancelJobRequest } from "@/lib/types";
import { jobStore } from "@/lib/job-store";

// 终态状态集合（不可取消）
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function genRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function now(): string {
  return new Date().toISOString();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const requestId = genRequestId();

  try {
    const { jobId } = await params;

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

    // 终态任务不可取消 → 409 Conflict
    if (TERMINAL_STATUSES.has(job.status)) {
      const errBody: ApiErrorPayload = {
        error: {
          code: "JOB_ALREADY_FINISHED",
          message: `任务 ${jobId} 已处于终态（${job.status}），无法取消`,
          retryable: false,
        },
        request_id: requestId,
      };
      return NextResponse.json(errBody, { status: 409 });
    }

    // 解析可选的取消原因（忽略解析失败）
    let cancelReq: Partial<CancelJobRequest> = {};
    try {
      cancelReq = (await request.json()) as Partial<CancelJobRequest>;
    } catch {
      // 请求体为空或无效时使用默认值
    }
    void cancelReq; // 当前 P0 实现暂不存储取消原因

    const cancelledAt = now();

    // 更新任务状态为 cancelled
    const updated = jobStore.update(jobId, {
      status: "cancelled",
      timing: {
        ...job.timing,
        finished_at: cancelledAt,
        updated_at: cancelledAt,
        elapsed_seconds: Math.floor(
          (Date.now() - new Date(job.timing.queued_at).getTime()) / 1000
        ),
      },
    });

    const responseBody: CancelJobResponse = {
      job_id: jobId,
      status: "cancelled",
      cancelled_at: cancelledAt,
      final_progress: {
        analyzed_comments: updated?.progress.analyzed_comments ?? 0,
        completion_gap: updated?.progress.completion_gap ?? job.target_comments,
      },
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    console.error("[POST /api/jobs/[jobId]/cancel] Unexpected error:", err);
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
