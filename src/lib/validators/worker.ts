/**
 * 内部 Worker 抓取请求校验器
 * 防止 SSRF、敏感头透传等安全风险
 */

import type { InternalFetchRequest } from "../types";

// ==================== 公共接口 ====================

/** 单条校验问题 */
export interface WorkerValidationIssue {
  field: string;
  rule: string;
  message: string;
  expected?: string;
  actual?: string;
}

/** Worker 请求校验结果 */
export interface WorkerValidationResult {
  valid: boolean;
  issues: WorkerValidationIssue[];
}

// ==================== 常量 ====================

/** 允许访问的 Reddit 域名白名单 */
const HOST_ALLOWLIST = new Set([
  "reddit.com",
  "www.reddit.com",
  "old.reddit.com",
  "oauth.reddit.com",
]);

/**
 * 禁止透传的敏感请求头（小写）
 * 防止 credential 泄漏到外部请求
 */
const BLOCKED_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-auth-token",
  "x-api-key",
  "x-access-token",
  "x-session-token",
  "proxy-authorization",
  "www-authenticate",
]);

/**
 * SSRF 内网 IP 段检测正则
 * 覆盖：127.x.x.x / ::1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x,
 *        169.254.x.x (link-local), fc00::/7 (IPv6 ULA)
 */
const SSRF_IP_PATTERNS = [
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
];

const SSRF_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

// ==================== 辅助函数 ====================

/** 生成一条校验问题 */
function issue(
  field: string,
  rule: string,
  message: string,
  opts?: { expected?: string; actual?: string }
): WorkerValidationIssue {
  return { field, rule, message, ...opts };
}

/**
 * 检测主机名或 IP 是否为 RFC 1918 / link-local 等内网地址（SSRF 防护）
 */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (SSRF_HOSTNAMES.has(h)) return true;

  for (const pattern of SSRF_IP_PATTERNS) {
    if (pattern.test(h)) return true;
  }

  return false;
}

/** 检测主机名是否为纯 IP 地址（非域名） */
function isRawIPAddress(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (h.includes(":")) return true;
  return false;
}

// ==================== 主校验函数 ====================

/**
 * 校验内部 Worker 抓取请求
 *
 * @param body 原始请求体
 * @returns 校验结果
 */
export function validateInternalFetchRequest(
  body: unknown
): WorkerValidationResult {
  const issues: WorkerValidationIssue[] = [];

  // 顶层必须是对象
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      valid: false,
      issues: [
        issue("$", "type", "请求体必须是 JSON 对象", {
          expected: "object",
          actual: Array.isArray(body) ? "array" : typeof body,
        }),
      ],
    };
  }

  const req = body as Record<string, unknown>;

  // ── url ───────────────────────────────────────────────────────────────────
  if (typeof req.url !== "string" || req.url.trim() === "") {
    issues.push(
      issue("url", "required", "url 必须是非空字符串", {
        expected: "string",
        actual: typeof req.url,
      })
    );
  } else {
    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(req.url);
    } catch {
      issues.push(
        issue("url", "format", "url 格式不合法", {
          expected: "valid URL",
          actual: req.url,
        })
      );
    }

    if (parsedUrl !== null) {
      // 必须使用 HTTPS
      if (parsedUrl.protocol !== "https:") {
        issues.push(
          issue("url", "protocol", "url 必须使用 https:// 协议", {
            expected: "https:",
            actual: parsedUrl.protocol,
          })
        );
      }

      const hostname = parsedUrl.hostname;

      // SSRF 防护：拒绝内网地址（127.x / 10.x / 172.16-31.x / 192.168.x 等）
      if (isPrivateHost(hostname)) {
        issues.push(
          issue(
            "url",
            "ssrf",
            `url 主机名 "${hostname}" 指向内网地址，禁止访问`,
            {
              expected: "public hostname",
              actual: hostname,
            }
          )
        );
      } else if (isRawIPAddress(hostname) || !HOST_ALLOWLIST.has(hostname)) {
        // 白名单校验
        issues.push(
          issue(
            "url",
            "allowlist",
            `url 主机名 "${hostname}" 不在允许列表中`,
            {
              expected: Array.from(HOST_ALLOWLIST).join(" | "),
              actual: hostname,
            }
          )
        );
      }
    }
  }

  // ── method ────────────────────────────────────────────────────────────────
  if (req.method !== "GET") {
    issues.push(
      issue("method", "enum", `method 必须是 "GET"`, {
        expected: "GET",
        actual: String(req.method),
      })
    );
  }

  // ── timeout_ms ────────────────────────────────────────────────────────────
  if (req.timeout_ms !== undefined) {
    const t = req.timeout_ms;
    if (
      typeof t !== "number" ||
      !Number.isInteger(t) ||
      t < 1000 ||
      t > 60000
    ) {
      issues.push(
        issue("timeout_ms", "range", "timeout_ms 必须是 1000..60000 的整数", {
          expected: "integer 1000..60000",
          actual: String(t),
        })
      );
    }
  }

  // ── headers ───────────────────────────────────────────────────────────────
  if (req.headers !== undefined) {
    if (
      typeof req.headers !== "object" ||
      req.headers === null ||
      Array.isArray(req.headers)
    ) {
      issues.push(
        issue("headers", "type", "headers 必须是键值对对象", {
          expected: "Record<string, string>",
          actual: typeof req.headers,
        })
      );
    } else {
      const headers = req.headers as Record<string, unknown>;
      for (const key of Object.keys(headers)) {
        const normalizedKey = key.toLowerCase();

        // 禁止透传敏感头
        if (BLOCKED_HEADERS.has(normalizedKey)) {
          issues.push(
            issue(
              `headers.${key}`,
              "blocked_header",
              `禁止透传敏感请求头 "${key}"`,
              {
                expected: "non-sensitive header",
                actual: key,
              }
            )
          );
        }

        // 所有 header 值必须是字符串
        if (typeof headers[key] !== "string") {
          issues.push(
            issue(
              `headers.${key}`,
              "type",
              `header 值必须是字符串`,
              {
                expected: "string",
                actual: typeof headers[key],
              }
            )
          );
        }
      }
    }
  }

  // ── strategy_hints ────────────────────────────────────────────────────────
  if (req.strategy_hints !== undefined) {
    if (
      typeof req.strategy_hints !== "object" ||
      req.strategy_hints === null ||
      Array.isArray(req.strategy_hints)
    ) {
      issues.push(
        issue("strategy_hints", "type", "strategy_hints 必须是对象", {
          expected: "object",
          actual: typeof req.strategy_hints,
        })
      );
    } else {
      const hints = req.strategy_hints as Record<string, unknown>;
      if (
        hints.prefer_http_first !== undefined &&
        typeof hints.prefer_http_first !== "boolean"
      ) {
        issues.push(
          issue(
            "strategy_hints.prefer_http_first",
            "type",
            "prefer_http_first 必须是布尔值",
            { expected: "boolean", actual: typeof hints.prefer_http_first }
          )
        );
      }
      if (
        hints.allow_browser_fallback !== undefined &&
        typeof hints.allow_browser_fallback !== "boolean"
      ) {
        issues.push(
          issue(
            "strategy_hints.allow_browser_fallback",
            "type",
            "allow_browser_fallback 必须是布尔值",
            { expected: "boolean", actual: typeof hints.allow_browser_fallback }
          )
        );
      }
    }
  }

  // ── session_key / proxy_profile（可选字符串） ────────────────────────────
  if (req.session_key !== undefined && typeof req.session_key !== "string") {
    issues.push(
      issue("session_key", "type", "session_key 必须是字符串", {
        expected: "string",
        actual: typeof req.session_key,
      })
    );
  }

  if (req.proxy_profile !== undefined && typeof req.proxy_profile !== "string") {
    issues.push(
      issue("proxy_profile", "type", "proxy_profile 必须是字符串", {
        expected: "string",
        actual: typeof req.proxy_profile,
      })
    );
  }

  return { valid: issues.length === 0, issues };
}
