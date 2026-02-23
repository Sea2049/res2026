/**
 * Browser Worker 服务统一调用客户端
 * 封装 /internal/fetch、/health、/metrics 三个端点
 */

import type {
  InternalFetchRequest,
  InternalFetchResponse,
  ApiErrorPayload,
  ErrorCode,
} from "../types";

// ==================== 配置 ====================

const WORKER_URL = process.env.BROWSER_WORKER_URL || "http://localhost:3001";
const WORKER_TOKEN = process.env.BROWSER_WORKER_TOKEN || "";
const DEFAULT_TIMEOUT_MS = 30_000;

// ==================== 工具 ====================

/**
 * 生成唯一请求 ID
 */
function genRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * 将网络层异常映射为 WORKER_UNAVAILABLE 错误
 */
function makeWorkerUnavailableError(cause: unknown): Error & { errorCode: ErrorCode } {
  const err = new Error(
    `Browser Worker unavailable: ${cause instanceof Error ? cause.message : String(cause)}`
  ) as Error & { errorCode: ErrorCode };
  err.errorCode = "WORKER_UNAVAILABLE";
  return err;
}

// ==================== 客户端类 ====================

export class BrowserWorkerClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl = WORKER_URL, token = WORKER_TOKEN) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  // ── 私有工具 ─────────────────────────────────────────────────────────────

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Request-Id": genRequestId(),
      ...extra,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * 带超时的 fetch 封装
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = DEFAULT_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      // ECONNREFUSED / AbortError / 其他网络异常 → WORKER_UNAVAILABLE
      throw makeWorkerUnavailableError(err);
    } finally {
      clearTimeout(timerId);
    }
  }

  // ── 公开方法 ──────────────────────────────────────────────────────────────

  /**
   * 调用内部 /internal/fetch 接口
   */
  async fetch(req: InternalFetchRequest): Promise<InternalFetchResponse> {
    const url = `${this.baseUrl}/internal/fetch`;
    let response: Response;

    try {
      response = await this.fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: this.buildHeaders(),
          body: JSON.stringify(req),
        },
        req.timeout_ms ?? DEFAULT_TIMEOUT_MS
      );
    } catch (err) {
      // 网络异常已由 fetchWithTimeout 包装
      throw err;
    }

    if (!response.ok) {
      // 尝试解析 Worker 返回的错误码
      let errorCode: ErrorCode = "WORKER_UNAVAILABLE";
      let errorMessage = `Worker returned HTTP ${response.status}`;
      try {
        const payload = (await response.json()) as Partial<ApiErrorPayload>;
        if (payload?.error?.code) {
          errorCode = payload.error.code as ErrorCode;
          errorMessage = payload.error.message ?? errorMessage;
        }
      } catch {
        // 忽略 JSON 解析失败
      }
      const err = new Error(errorMessage) as Error & { errorCode: ErrorCode };
      err.errorCode = errorCode;
      throw err;
    }

    return response.json() as Promise<InternalFetchResponse>;
  }

  /**
   * 健康检查
   * 返回 true 表示 Worker 正常运行
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/health`,
        {
          method: "GET",
          headers: this.buildHeaders(),
        },
        5_000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 获取 Worker 运行指标
   */
  async getMetrics(): Promise<Record<string, unknown>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/metrics`,
        {
          method: "GET",
          headers: this.buildHeaders(),
        },
        10_000
      );
      if (!response.ok) return {};
      return response.json() as Promise<Record<string, unknown>>;
    } catch {
      return {};
    }
  }
}

// 进程级单例
export const browserWorkerClient = new BrowserWorkerClient();
