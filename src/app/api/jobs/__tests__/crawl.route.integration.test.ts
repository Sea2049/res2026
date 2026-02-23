/**
 * @jest-environment node
 *
 * Gate3 集成测试 — 覆盖 4 个 Jobs API 路由的完整场景
 *
 * 覆盖范围（plan §9.13 Gate3 要求）：
 *   - POST /api/jobs/crawl      (提交任务)
 *   - GET  /api/jobs/[jobId]    (查询状态)
 *   - GET  /api/jobs/[jobId]/results (查询结果)
 *   - POST /api/jobs/[jobId]/cancel  (取消任务)
 *   - 端到端 happy path：提交 → 查询状态 → 查询摘要 → 取消
 *
 * 运行：npx jest src/app/api/jobs/__tests__/crawl.route.integration.test.ts
 */

// ── 模块 Mock（必须在所有 import 前声明，Jest 会自动提升） ─────────────────

jest.mock("@/lib/rate-limiter", () => ({
  ...jest.requireActual("@/lib/rate-limiter"),
  RateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockReturnValue({
      allowed: true,
      current: 1,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    }),
    reset: jest.fn(),
    clear: jest.fn(),
    size: 0,
  })),
  getClientIP: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/api/browser-worker-client", () => ({
  browserWorkerClient: {
    fetch: jest.fn(),
    healthCheck: jest.fn(),
    getMetrics: jest.fn(),
  },
  BrowserWorkerClient: jest.fn(),
}));

// ── 依赖导入 ──────────────────────────────────────────────────────────────

import type { ApiErrorPayload, CreateCrawlJobResponse } from "@/lib/types";
import { jobStore } from "@/lib/job-store";
import { RateLimiter } from "@/lib/rate-limiter";

// ── 辅助函数 ──────────────────────────────────────────────────────────────

/** 构造最小合法请求体（支持字段覆盖） */
function makeValidPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: "reddit",
    target_comments: 100,
    max_comments: 200,
    analysis_scope: "full",
    ...overrides,
  };
}

/** 构造 POST /api/jobs/crawl 请求 */
function makePostRequest(body: unknown, url = "http://localhost/api/jobs/crawl"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** 构造 GET 请求 */
function makeGetRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

/**
 * 断言 ApiErrorPayload 结构完整：error.code / message / retryable / request_id 均存在
 */
function expectApiError(body: unknown, expectedCode: string): void {
  const payload = body as ApiErrorPayload;
  expect(payload).toHaveProperty("error");
  expect(payload).toHaveProperty("request_id");
  expect(typeof payload.request_id).toBe("string");
  expect(payload.request_id.length).toBeGreaterThan(0);
  expect(payload.error).toHaveProperty("code", expectedCode);
  expect(payload.error).toHaveProperty("message");
  expect(typeof payload.error.message).toBe("string");
  expect(payload.error).toHaveProperty("retryable");
  expect(typeof payload.error.retryable).toBe("boolean");
}

/** 重置限流 Mock 为"放行"状态 */
function resetRateLimiterToAllow(): void {
  (RateLimiter as jest.MockedClass<typeof RateLimiter>).mockImplementation(() => ({
    check: jest.fn().mockReturnValue({
      allowed: true,
      current: 1,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    }),
    reset: jest.fn(),
    clear: jest.fn(),
    size: 0,
  } as InstanceType<typeof RateLimiter>));
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/jobs/crawl
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/jobs/crawl", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
    resetRateLimiterToAllow();
  });

  it("happy path: 合法请求返回 202 + job_id + links", async () => {
    const { POST } = await import("../crawl/route");

    const res = await POST(makePostRequest(makeValidPayload()));

    expect(res.status).toBe(202);
    const body = (await res.json()) as CreateCrawlJobResponse;
    expect(body.job_id).toMatch(/^job_/);
    expect(body.status).toBe("queued");
    expect(body.links).toBeDefined();
    expect(body.links.self).toContain(body.job_id);
    expect(body.links.results).toContain(body.job_id);
    expect(body.accepted_config.target_comments).toBe(100);
    expect(body.accepted_config.max_comments).toBe(200);
  });

  it("无效请求: target_comments=0 返回 400 + INVALID_JOB_CONFIG", async () => {
    const { POST } = await import("../crawl/route");

    const res = await POST(makePostRequest(makeValidPayload({ target_comments: 0 })));

    expect(res.status).toBe(400);
    const body = await res.json();
    expectApiError(body, "INVALID_JOB_CONFIG");
  });

  it("无效请求: target_comments > max_comments 返回 400 + INVALID_JOB_CONFIG", async () => {
    const { POST } = await import("../crawl/route");

    const res = await POST(
      makePostRequest(makeValidPayload({ target_comments: 500, max_comments: 100 }))
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expectApiError(body, "INVALID_JOB_CONFIG");
    // 应有 details 数组指出交叉字段错误
    const payload = body as ApiErrorPayload;
    expect(Array.isArray(payload.error.details)).toBe(true);
    const crossIssue = (payload.error.details as Array<{ field: string; rule: string }>)
      .find((d) => d.rule === "cross_field");
    expect(crossIssue).toBeDefined();
  });

  it("返回的 ApiErrorPayload 结构完整: error.code/message/retryable/request_id 均存在", async () => {
    const { POST } = await import("../crawl/route");

    // 发送完全非法的请求体（source 无效）
    const res = await POST(
      makePostRequest({ source: "invalid_source", target_comments: -1, max_comments: -1 })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expectApiError(body, "INVALID_JOB_CONFIG");
  });

  it("请求体为非 JSON 时返回 400 + INVALID_JOB_CONFIG", async () => {
    const { POST } = await import("../crawl/route");

    const req = new Request("http://localhost/api/jobs/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json{{{",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expectApiError(body, "INVALID_JOB_CONFIG");
  });

  it("提交后任务被存入 jobStore（可通过 GET 查到）", async () => {
    const { POST } = await import("../crawl/route");

    const res = await POST(makePostRequest(makeValidPayload()));
    expect(res.status).toBe(202);

    const { job_id } = (await res.json()) as CreateCrawlJobResponse;
    const stored = jobStore.get(job_id);
    expect(stored).toBeDefined();
    expect(stored?.status).toBe("queued");
    expect(stored?.target_comments).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/jobs/[jobId]
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/jobs/[jobId]", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
  });

  it("存在的任务返回 200 + CrawlJob 对象", async () => {
    const { GET } = await import("../[jobId]/route");

    // 先提交一个任务以获得真实 job_id
    resetRateLimiterToAllow();
    const { POST } = await import("../crawl/route");
    const postRes = await POST(makePostRequest(makeValidPayload()));
    const { job_id } = (await postRes.json()) as CreateCrawlJobResponse;

    // 查询状态
    const req = makeGetRequest(`http://localhost/api/jobs/${job_id}`);
    const res = await GET(req, { params: Promise.resolve({ jobId: job_id }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBe(job_id);
    expect(body.status).toBe("queued");
    expect(body.progress).toBeDefined();
    expect(body.timing).toBeDefined();
  });

  it("不存在的任务返回 404 + JOB_NOT_FOUND", async () => {
    const { GET } = await import("../[jobId]/route");

    const req = makeGetRequest("http://localhost/api/jobs/nonexistent_job");
    const res = await GET(req, { params: Promise.resolve({ jobId: "nonexistent_job" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectApiError(body, "JOB_NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/jobs/[jobId]/results
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/jobs/[jobId]/results", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
    resetRateLimiterToAllow();
  });

  async function createJob(): Promise<string> {
    const { POST } = await import("../crawl/route");
    const postRes = await POST(makePostRequest(makeValidPayload()));
    const { job_id } = (await postRes.json()) as CreateCrawlJobResponse;
    return job_id;
  }

  it("summary 视图返回 analyzed_comments + sentiment_distribution + top_keywords", async () => {
    const { GET } = await import("../[jobId]/results/route");
    const jobId = await createJob();

    const req = makeGetRequest(`http://localhost/api/jobs/${jobId}/results?view=summary`);
    const res = await GET(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBe(jobId);
    expect(body.summary).toBeDefined();
    expect(typeof body.summary.analyzed_comments).toBe("number");
    expect(body.summary.sentiment_distribution).toBeDefined();
    expect(typeof body.summary.sentiment_distribution.positive).toBe("number");
    expect(typeof body.summary.sentiment_distribution.neutral).toBe("number");
    expect(typeof body.summary.sentiment_distribution.negative).toBe("number");
    expect(Array.isArray(body.summary.top_keywords)).toBe(true);
  });

  it("items 视图返回 items 数组 + pagination", async () => {
    const { GET } = await import("../[jobId]/results/route");
    const jobId = await createJob();

    const req = makeGetRequest(`http://localhost/api/jobs/${jobId}/results?view=items&limit=10`);
    const res = await GET(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBe(jobId);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination).toHaveProperty("next_cursor");
  });

  it("默认视图（不传 view 参数）返回 summary 结构", async () => {
    const { GET } = await import("../[jobId]/results/route");
    const jobId = await createJob();

    const req = makeGetRequest(`http://localhost/api/jobs/${jobId}/results`);
    const res = await GET(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeDefined();
  });

  it("不存在的任务返回 404 + JOB_NOT_FOUND", async () => {
    const { GET } = await import("../[jobId]/results/route");

    const req = makeGetRequest("http://localhost/api/jobs/ghost_job/results");
    const res = await GET(req, { params: Promise.resolve({ jobId: "ghost_job" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectApiError(body, "JOB_NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/jobs/[jobId]/cancel
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/jobs/[jobId]/cancel", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
    resetRateLimiterToAllow();
  });

  async function createJob(): Promise<string> {
    const { POST } = await import("../crawl/route");
    const postRes = await POST(makePostRequest(makeValidPayload()));
    const { job_id } = (await postRes.json()) as CreateCrawlJobResponse;
    return job_id;
  }

  it("queued 状态的任务可以取消，返回 200 + cancelled 状态", async () => {
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");
    const jobId = await createJob();

    const req = new Request(`http://localhost/api/jobs/${jobId}/cancel`, { method: "POST" });
    const res = await cancelPOST(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job_id).toBe(jobId);
    expect(body.status).toBe("cancelled");
    expect(body.cancelled_at).toBeDefined();
    expect(body.final_progress).toBeDefined();
  });

  it("running 状态的任务可以取消，返回 200 + cancelled 状态", async () => {
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");
    const jobId = await createJob();

    // 手动将任务状态置为 running
    jobStore.update(jobId, { status: "running" });

    const req = new Request(`http://localhost/api/jobs/${jobId}/cancel`, { method: "POST" });
    const res = await cancelPOST(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");

    // 验证 jobStore 中的状态也已更新
    const stored = jobStore.get(jobId);
    expect(stored?.status).toBe("cancelled");
  });

  it("已完成任务取消返回 409 + JOB_ALREADY_FINISHED", async () => {
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");
    const jobId = await createJob();

    // 将任务状态置为 completed（终态）
    jobStore.update(jobId, { status: "completed" });

    const req = new Request(`http://localhost/api/jobs/${jobId}/cancel`, { method: "POST" });
    const res = await cancelPOST(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(409);
    const body = await res.json();
    expectApiError(body, "JOB_ALREADY_FINISHED");
  });

  it("已失败任务取消返回 409 + JOB_ALREADY_FINISHED", async () => {
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");
    const jobId = await createJob();

    jobStore.update(jobId, { status: "failed" });

    const req = new Request(`http://localhost/api/jobs/${jobId}/cancel`, { method: "POST" });
    const res = await cancelPOST(req, { params: Promise.resolve({ jobId }) });

    expect(res.status).toBe(409);
    const body = await res.json();
    expectApiError(body, "JOB_ALREADY_FINISHED");
  });

  it("已取消任务再次取消返回 409 + JOB_ALREADY_FINISHED", async () => {
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");
    const jobId = await createJob();

    // 第一次取消
    const req1 = new Request(`http://localhost/api/jobs/${jobId}/cancel`, { method: "POST" });
    await cancelPOST(req1, { params: Promise.resolve({ jobId }) });

    // 第二次取消应返回 409
    const req2 = new Request(`http://localhost/api/jobs/${jobId}/cancel`, { method: "POST" });
    const res2 = await cancelPOST(req2, { params: Promise.resolve({ jobId }) });

    expect(res2.status).toBe(409);
    const body = await res2.json();
    expectApiError(body, "JOB_ALREADY_FINISHED");
  });

  it("不存在的任务返回 404 + JOB_NOT_FOUND", async () => {
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");

    const req = new Request("http://localhost/api/jobs/ghost_job/cancel", { method: "POST" });
    const res = await cancelPOST(req, { params: Promise.resolve({ jobId: "ghost_job" }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expectApiError(body, "JOB_NOT_FOUND");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 端到端 Happy Path — 全链路状态流转
// ═══════════════════════════════════════════════════════════════════════════

describe("端到端 happy path", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
    resetRateLimiterToAllow();
  });

  it("提交 → 查询状态 → 查询摘要 → 取消，全链路状态流转正确", async () => {
    const { POST: crawlPOST } = await import("../crawl/route");
    const { GET: statusGET } = await import("../[jobId]/route");
    const { GET: resultsGET } = await import("../[jobId]/results/route");
    const { POST: cancelPOST } = await import("../[jobId]/cancel/route");

    // ── Step 1: 提交任务 ─────────────────────────────────────────────────
    const postRes = await crawlPOST(
      makePostRequest(
        makeValidPayload({
          target_comments: 500,
          max_comments: 1000,
          analysis_scope: "full",
          priority: "high",
        })
      )
    );
    expect(postRes.status).toBe(202);
    const createBody = (await postRes.json()) as CreateCrawlJobResponse;
    const jobId = createBody.job_id;

    expect(jobId).toMatch(/^job_/);
    expect(createBody.status).toBe("queued");
    expect(createBody.links.self).toBe(`/api/jobs/${jobId}`);
    expect(createBody.links.results).toBe(`/api/jobs/${jobId}/results`);

    // ── Step 2: 查询状态（刚提交，应为 queued）───────────────────────────
    const statusReq = makeGetRequest(`http://localhost/api/jobs/${jobId}`);
    const statusRes = await statusGET(statusReq, {
      params: Promise.resolve({ jobId }),
    });
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.job_id).toBe(jobId);
    expect(statusBody.status).toBe("queued");
    expect(statusBody.progress.analyzed_comments).toBe(0);
    expect(statusBody.target_comments).toBe(500);

    // ── Step 3: 查询摘要（任务尚未执行，返回零值摘要）───────────────────
    const resultsReq = makeGetRequest(`http://localhost/api/jobs/${jobId}/results?view=summary`);
    const resultsRes = await resultsGET(resultsReq, {
      params: Promise.resolve({ jobId }),
    });
    expect(resultsRes.status).toBe(200);
    const resultsBody = await resultsRes.json();
    expect(resultsBody.job_id).toBe(jobId);
    expect(resultsBody.status).toBe("queued");
    expect(resultsBody.summary.analyzed_comments).toBe(0);
    expect(resultsBody.summary.sentiment_distribution).toEqual({
      positive: 0,
      neutral: 0,
      negative: 0,
    });
    expect(Array.isArray(resultsBody.summary.top_keywords)).toBe(true);

    // ── Step 4: 取消任务 ─────────────────────────────────────────────────
    const cancelReq = new Request(`http://localhost/api/jobs/${jobId}/cancel`, {
      method: "POST",
    });
    const cancelRes = await cancelPOST(cancelReq, {
      params: Promise.resolve({ jobId }),
    });
    expect(cancelRes.status).toBe(200);
    const cancelBody = await cancelRes.json();
    expect(cancelBody.job_id).toBe(jobId);
    expect(cancelBody.status).toBe("cancelled");
    expect(cancelBody.cancelled_at).toBeDefined();
    expect(typeof cancelBody.cancelled_at).toBe("string");
    expect(cancelBody.final_progress).toBeDefined();
    expect(typeof cancelBody.final_progress.analyzed_comments).toBe("number");

    // ── Step 5: 验证取消后状态已持久化 ───────────────────────────────────
    const finalStatusReq = makeGetRequest(`http://localhost/api/jobs/${jobId}`);
    const finalStatusRes = await statusGET(finalStatusReq, {
      params: Promise.resolve({ jobId }),
    });
    expect(finalStatusRes.status).toBe(200);
    const finalStatusBody = await finalStatusRes.json();
    expect(finalStatusBody.status).toBe("cancelled");
    expect(finalStatusBody.timing.finished_at).toBeDefined();

    // ── Step 6: 取消后再次取消应返回 409 ─────────────────────────────────
    const cancelReq2 = new Request(`http://localhost/api/jobs/${jobId}/cancel`, {
      method: "POST",
    });
    const cancelRes2 = await cancelPOST(cancelReq2, {
      params: Promise.resolve({ jobId }),
    });
    expect(cancelRes2.status).toBe(409);
    const cancelErr = await cancelRes2.json();
    expectApiError(cancelErr, "JOB_ALREADY_FINISHED");
  });

  it("并发提交多个任务，各任务独立存储不互相干扰", async () => {
    const { POST: crawlPOST } = await import("../crawl/route");

    // 并发提交 3 个任务（确保 target_comments <= max_comments）
    const [res1, res2, res3] = await Promise.all([
      crawlPOST(makePostRequest(makeValidPayload({ target_comments: 100, max_comments: 200 }))),
      crawlPOST(makePostRequest(makeValidPayload({ target_comments: 200, max_comments: 500 }))),
      crawlPOST(makePostRequest(makeValidPayload({ target_comments: 300, max_comments: 500 }))),
    ]);

    expect(res1.status).toBe(202);
    expect(res2.status).toBe(202);
    expect(res3.status).toBe(202);

    const body1 = (await res1.json()) as CreateCrawlJobResponse;
    const body2 = (await res2.json()) as CreateCrawlJobResponse;
    const body3 = (await res3.json()) as CreateCrawlJobResponse;

    // job_id 各不相同
    const ids = new Set([body1.job_id, body2.job_id, body3.job_id]);
    expect(ids.size).toBe(3);

    // 各自的 accepted_config 正确
    expect(body1.accepted_config.target_comments).toBe(100);
    expect(body2.accepted_config.target_comments).toBe(200);
    expect(body3.accepted_config.target_comments).toBe(300);

    // jobStore 中共有 3 条记录
    expect(jobStore.size).toBe(3);
  });
});
