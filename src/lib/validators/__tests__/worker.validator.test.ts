/**
 * T1-Agent-Types: Worker 请求校验器测试骨架
 * 覆盖 URL 安全、SSRF 防护、敏感头拦截等场景
 */

import {
  validateInternalFetchRequest,
  type WorkerValidationIssue,
} from "../worker";

// ==================== 测试辅助 ====================

/** 最小合法请求体 */
const VALID_BODY = {
  url: "https://www.reddit.com/r/programming.json",
  method: "GET",
} as const;

function valid(overrides: Record<string, unknown> = {}) {
  return { ...VALID_BODY, ...overrides };
}

function hasIssue(
  issues: WorkerValidationIssue[],
  field: string,
  rule?: string
): boolean {
  return issues.some(
    (i) => i.field === field && (rule === undefined || i.rule === rule)
  );
}

function hasIssueContaining(
  issues: WorkerValidationIssue[],
  fieldPrefix: string
): boolean {
  return issues.some((i) => i.field.startsWith(fieldPrefix));
}

// ==================== A: 合法输入（Happy Path） ====================

describe("A: 合法输入 - validateInternalFetchRequest", () => {
  test("A-01: 最小合法请求应通过", () => {
    const result = validateInternalFetchRequest(VALID_BODY);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("A-02: reddit.com 应通过白名单", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://reddit.com/api/v1/access_token" }));
    expect(result.valid).toBe(true);
  });

  test("A-03: old.reddit.com 应通过白名单", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://old.reddit.com/r/news.json" }));
    expect(result.valid).toBe(true);
  });

  test("A-04: oauth.reddit.com 应通过白名单", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://oauth.reddit.com/r/all" }));
    expect(result.valid).toBe(true);
  });

  test("A-05: 带 timeout_ms 合法值应通过", () => {
    const result = validateInternalFetchRequest(valid({ timeout_ms: 5000 }));
    expect(result.valid).toBe(true);
  });

  test("A-06: timeout_ms 边界最小值 1000 应通过", () => {
    const result = validateInternalFetchRequest(valid({ timeout_ms: 1000 }));
    expect(result.valid).toBe(true);
  });

  test("A-07: timeout_ms 边界最大值 60000 应通过", () => {
    const result = validateInternalFetchRequest(valid({ timeout_ms: 60000 }));
    expect(result.valid).toBe(true);
  });

  test("A-08: 携带安全请求头应通过", () => {
    const result = validateInternalFetchRequest(
      valid({
        headers: {
          "User-Agent": "TestAgent/1.0",
          "Accept": "application/json",
        },
      })
    );
    expect(result.valid).toBe(true);
  });

  test("A-09: strategy_hints 合法值应通过", () => {
    const result = validateInternalFetchRequest(
      valid({
        strategy_hints: {
          prefer_http_first: true,
          allow_browser_fallback: false,
        },
      })
    );
    expect(result.valid).toBe(true);
  });

  test("A-10: 携带 session_key 和 proxy_profile 应通过", () => {
    const result = validateInternalFetchRequest(
      valid({ session_key: "sess_abc", proxy_profile: "us-west" })
    );
    expect(result.valid).toBe(true);
  });
});

// ==================== B: URL 协议与格式校验 ====================

describe("B: URL 协议与格式校验", () => {
  test("B-01: http:// 协议应报错（必须 https）", () => {
    const result = validateInternalFetchRequest(valid({ url: "http://www.reddit.com/r/all.json" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "protocol")).toBe(true);
  });

  test("B-02: ftp:// 协议应报错", () => {
    const result = validateInternalFetchRequest(valid({ url: "ftp://www.reddit.com/file.json" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "protocol")).toBe(true);
  });

  test("B-03: 格式完全非法的 URL 应报错", () => {
    const result = validateInternalFetchRequest(valid({ url: "not-a-url" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "format")).toBe(true);
  });

  test("B-04: 空字符串 URL 应报错", () => {
    const result = validateInternalFetchRequest(valid({ url: "" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "required")).toBe(true);
  });

  test("B-05: url 为数字类型应报错", () => {
    const result = validateInternalFetchRequest(valid({ url: 12345 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "required")).toBe(true);
  });
});

// ==================== C: SSRF 防护 ====================

describe("C: SSRF 防护", () => {
  test("C-01: 127.0.0.1 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://127.0.0.1/api" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-02: localhost 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://localhost/api" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-03: 10.0.0.1 内网 IP 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://10.0.0.1/api" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-04: 172.16.0.1 内网 IP 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://172.16.0.1/api" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-05: 172.31.255.255 内网 IP 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://172.31.255.255/api" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-06: 192.168.1.100 内网 IP 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://192.168.1.100/api" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-07: 169.254.0.1 链路本地地址应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://169.254.0.1/metadata" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });

  test("C-08: 非白名单外网域名应被白名单拦截（非 SSRF）", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://evil.com/steal" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "allowlist")).toBe(true);
  });

  test("C-09: AWS 元数据端点 169.254.169.254 应被 SSRF 拦截", () => {
    const result = validateInternalFetchRequest(valid({ url: "https://169.254.169.254/latest/meta-data/" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(true);
  });
});

// ==================== D: 敏感头拦截 ====================

describe("D: 敏感请求头拦截", () => {
  test("D-01: authorization 头应被拦截", () => {
    const result = validateInternalFetchRequest(
      valid({ headers: { authorization: "Bearer token123" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssueContaining(result.issues, "headers.authorization")).toBe(true);
  });

  test("D-02: cookie 头应被拦截", () => {
    const result = validateInternalFetchRequest(
      valid({ headers: { cookie: "session=abc" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssueContaining(result.issues, "headers.cookie")).toBe(true);
  });

  test("D-03: x-auth-token 头应被拦截", () => {
    const result = validateInternalFetchRequest(
      valid({ headers: { "x-auth-token": "secret" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssueContaining(result.issues, "headers.x-auth-token")).toBe(true);
  });

  test("D-04: Authorization 大写变体也应被拦截（大小写不敏感）", () => {
    const result = validateInternalFetchRequest(
      valid({ headers: { Authorization: "Bearer token" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssueContaining(result.issues, "headers.Authorization")).toBe(true);
  });

  test("D-05: x-api-key 头应被拦截", () => {
    const result = validateInternalFetchRequest(
      valid({ headers: { "x-api-key": "key123" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssueContaining(result.issues, "headers.x-api-key")).toBe(true);
  });
});

// ==================== E: 其他字段与边界 ====================

describe("E: 其他字段与边界校验", () => {
  test("E-01: method='POST' 应报错", () => {
    const result = validateInternalFetchRequest(valid({ method: "POST" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "method", "enum")).toBe(true);
  });

  test("E-02: method='DELETE' 应报错", () => {
    const result = validateInternalFetchRequest(valid({ method: "DELETE" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "method", "enum")).toBe(true);
  });

  test("E-03: timeout_ms=999 低于最小值应报错", () => {
    const result = validateInternalFetchRequest(valid({ timeout_ms: 999 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "timeout_ms", "range")).toBe(true);
  });

  test("E-04: timeout_ms=60001 超出最大值应报错", () => {
    const result = validateInternalFetchRequest(valid({ timeout_ms: 60001 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "timeout_ms", "range")).toBe(true);
  });

  test("E-05: timeout_ms=5000.5 浮点数应报错", () => {
    const result = validateInternalFetchRequest(valid({ timeout_ms: 5000.5 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "timeout_ms", "range")).toBe(true);
  });

  test("E-06: headers 为数组类型应报错", () => {
    const result = validateInternalFetchRequest(valid({ headers: ["a", "b"] }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "headers", "type")).toBe(true);
  });

  test("E-07: strategy_hints.prefer_http_first 为字符串应报错", () => {
    const result = validateInternalFetchRequest(
      valid({ strategy_hints: { prefer_http_first: "yes" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "strategy_hints.prefer_http_first", "type")).toBe(true);
  });

  test("E-08: session_key 为数字应报错", () => {
    const result = validateInternalFetchRequest(valid({ session_key: 12345 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "session_key", "type")).toBe(true);
  });

  test("E-09: 传入 null 应返回 type 错误", () => {
    const result = validateInternalFetchRequest(null);
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "$", "type")).toBe(true);
  });

  test("E-10: 172.32.0.1 不在内网段应通过（但会被白名单拦截）", () => {
    // 172.32.x.x 不在 172.16-31.x.x 范围内，属于公网 IP
    // 但仍会被白名单拦截（非 reddit.com 域名）
    const result = validateInternalFetchRequest(valid({ url: "https://172.32.0.1/api" }));
    expect(result.valid).toBe(false);
    // 应该触发 allowlist 而非 ssrf 错误
    expect(hasIssue(result.issues, "url", "ssrf")).toBe(false);
  });
});
