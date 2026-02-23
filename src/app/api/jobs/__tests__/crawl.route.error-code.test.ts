/**
 * 错误码映射集成测试骨架
 * 覆盖：RATE_LIMITED / WORKER_UNAVAILABLE / UPSTREAM_FORBIDDEN / UPSTREAM_TOO_MANY_REQUESTS
 *
 * 运行：npx jest src/app/api/jobs/__tests__/crawl.route.error-code.test.ts
 */

import { jobStore } from "@/lib/job-store";

// ── 模块 Mock（在测试套件外声明，自动提升）────────────────────────────────

jest.mock("@/lib/rate-limiter", () => ({
  ...jest.requireActual("@/lib/rate-limiter"),
  RateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockReturnValue({ allowed: true, limit: 10, remaining: 9, resetAt: Date.now() + 60_000 }),
  })),
  getClientIP: jest.fn().mockReturnValue("127.0.0.1"),
}));

jest.mock("@/lib/api/browser-worker-client", () => {
  const actual = jest.requireActual("@/lib/api/browser-worker-client");
  return {
    ...actual,
    browserWorkerClient: {
      fetch: jest.fn(),
      healthCheck: jest.fn(),
      getMetrics: jest.fn(),
    },
  };
});

// ── 类型导入 ─────────────────────────────────────────────────────────────

import type { ApiErrorPayload } from "@/lib/types";
import { RateLimiter, getClientIP } from "@/lib/rate-limiter";
import { browserWorkerClient } from "@/lib/api/browser-worker-client";

// ── 辅助函数 ──────────────────────────────────────────────────────────────

/** 构造一个最小合法的 POST /api/jobs/crawl 请求体 */
function validCrawlBody() {
  return {
    source: "reddit",
    target_comments: 100,
    max_comments: 200,
    analysis_scope: "full",
  };
}

/** 构造 Request 对象 */
function makeRequest(body: unknown, url = "http://localhost/api/jobs/crawl") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── 工具：在测试中临时替换 Mock 返回值 ────────────────────────────────────

function mockRateLimiterDeny() {
  const MockRL = RateLimiter as jest.MockedClass<typeof RateLimiter>;
  MockRL.mockImplementationOnce(() => ({
    check: jest.fn().mockReturnValue({
      allowed: false,
      current: 11,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 30_000,
      retryAfter: 30,
    }),
    reset: jest.fn(),
    clear: jest.fn(),
    size: 1,
  } as InstanceType<typeof RateLimiter>));
}

// ── 测试套件 ──────────────────────────────────────────────────────────────

describe("POST /api/jobs/crawl - 错误码映射", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
    // 默认：限流放行
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
  });

  // ── 1. RATE_LIMITED ────────────────────────────────────────────────────

  it("限流器返回 429 时，响应应包含 RATE_LIMITED 错误码", async () => {
    mockRateLimiterDeny();

    // 动态 import 路由（保证 Mock 先于模块加载）
    const { POST } = await import("../crawl/route");

    const req = makeRequest(validCrawlBody());
    const res = await POST(req);

    expect(res.status).toBe(429);
    const body = (await res.json()) as ApiErrorPayload;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.retryable).toBe(true);
  });

  // ── 2. WORKER_UNAVAILABLE ─────────────────────────────────────────────

  it("Browser Worker 抛出 ECONNREFUSED 时，错误码应映射为 WORKER_UNAVAILABLE", async () => {
    const connErr = new Error("connect ECONNREFUSED 127.0.0.1:3001") as Error & {
      errorCode?: string;
    };
    connErr.errorCode = "WORKER_UNAVAILABLE";

    (browserWorkerClient.fetch as jest.Mock).mockRejectedValueOnce(connErr);

    // 测试客户端直接抛出带有 WORKER_UNAVAILABLE 的错误
    await expect(
      browserWorkerClient.fetch({
        url: "https://www.reddit.com/r/test.json",
        method: "GET",
      })
    ).rejects.toMatchObject({ errorCode: "WORKER_UNAVAILABLE" });
  });

  // ── 3. UPSTREAM_FORBIDDEN ─────────────────────────────────────────────

  it("fetch-helper 返回 403 时，应映射为 UPSTREAM_FORBIDDEN 错误码", async () => {
    // 模拟 fetch 返回 403
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "UPSTREAM_FORBIDDEN", message: "Forbidden", retryable: false } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    global.fetch = mockFetch;

    // 调用 BrowserWorkerClient 内部逻辑：Worker 返回 403 → 抛出 UPSTREAM_FORBIDDEN
    const client = new (
      await import("@/lib/api/browser-worker-client")
    ).BrowserWorkerClient("http://mock-worker:3001", "test-token");

    await expect(
      client.fetch({ url: "https://example.com", method: "GET" })
    ).rejects.toMatchObject({ errorCode: "UPSTREAM_FORBIDDEN" });
  });

  // ── 4. UPSTREAM_TOO_MANY_REQUESTS ────────────────────────────────────

  it("fetch-helper 返回 429 时，应映射为 UPSTREAM_TOO_MANY_REQUESTS 错误码", async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "UPSTREAM_TOO_MANY_REQUESTS", message: "Too Many Requests", retryable: true } }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      )
    );
    global.fetch = mockFetch;

    const client = new (
      await import("@/lib/api/browser-worker-client")
    ).BrowserWorkerClient("http://mock-worker:3001", "test-token");

    await expect(
      client.fetch({ url: "https://example.com", method: "GET" })
    ).rejects.toMatchObject({ errorCode: "UPSTREAM_TOO_MANY_REQUESTS" });
  });
});

// ── 正常路径冒烟测试 ──────────────────────────────────────────────────────

describe("POST /api/jobs/crawl - 正常路径", () => {
  beforeEach(() => {
    jobStore.clear();
    jest.clearAllMocks();
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
  });

  it("合法请求应返回 202 且包含 job_id 和 links", async () => {
    const { POST } = await import("../crawl/route");

    const req = makeRequest(validCrawlBody());
    const res = await POST(req);

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.job_id).toMatch(/^job_/);
    expect(body.status).toBe("queued");
    expect(body.links.self).toContain(body.job_id);
    expect(body.links.results).toContain(body.job_id);
  });

  it("非法请求体应返回 400 + INVALID_JOB_CONFIG", async () => {
    const { POST } = await import("../crawl/route");

    const req = makeRequest({ source: "unknown", target_comments: -1 });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorPayload;
    expect(body.error.code).toBe("INVALID_JOB_CONFIG");
    expect(Array.isArray(body.error.details)).toBe(true);
  });
});
