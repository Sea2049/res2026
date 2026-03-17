/**
 * T1-Agent-Types: CrawlJob 请求校验器测试骨架
 * 覆盖 A/B/C/D/E 五类场景，共 40+ 用例
 */

import {
  validateCreateCrawlJobRequest,
  resolveQosClass,
  type ValidationIssue,
} from "../jobs";

// ==================== 测试辅助 ====================

/** 最小合法请求体 */
const VALID_BODY = {
  source: "reddit",
  target_comments: 100,
  max_comments: 200,
  analysis_scope: "full",
} as const;

function valid(overrides: Record<string, unknown> = {}) {
  return { ...VALID_BODY, ...overrides };
}

function hasIssue(issues: ValidationIssue[], field: string, rule?: string): boolean {
  return issues.some(
    (i) => i.field === field && (rule === undefined || i.rule === rule)
  );
}

// ==================== A: 合法输入（Happy Path） ====================

describe("A: 合法输入 - validateCreateCrawlJobRequest", () => {
  test("A-01: 最小合法请求体应通过校验", () => {
    const result = validateCreateCrawlJobRequest(VALID_BODY);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("A-02: 完整字段合法请求应通过校验", () => {
    const result = validateCreateCrawlJobRequest({
      source: "reddit",
      target_comments: 500,
      max_comments: 1000,
      analysis_scope: "sampled",
      llm_sample_ratio: 0.5,
      qos_class: "medium",
      priority: "high",
      idempotency_key: "test-key-12345678",
      filters: {
        subreddits: ["programming", "javascript"],
        time_range: "week",
        sort: "hot",
      },
      runtime: {
        timeout_minutes: 30,
        max_retries: 3,
        proxy_strategy: "pool",
      },
    });
    expect(result.valid).toBe(true);
    expect(result.resolved_qos_class).toBe("medium");
  });

  test("A-03: target_comments=1 边界值应通过", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 1, max_comments: 1 }));
    expect(result.valid).toBe(true);
  });

  test("A-04: target_comments=10000 边界值应通过", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 10000, max_comments: 10000 }));
    expect(result.valid).toBe(true);
  });

  test("A-05: qos_class=auto 时应自动归一化为具体值", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 500, max_comments: 1000, qos_class: "auto" }));
    expect(result.valid).toBe(true);
    expect(result.resolved_qos_class).toBe("small");
  });

  test("A-06: qos_class=auto 归一化 medium", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 2000, max_comments: 5000, qos_class: "auto" }));
    expect(result.valid).toBe(true);
    expect(result.resolved_qos_class).toBe("medium");
  });

  test("A-07: qos_class=auto 归一化 large", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 8000, max_comments: 10000, qos_class: "auto" }));
    expect(result.valid).toBe(true);
    expect(result.resolved_qos_class).toBe("large");
  });

  test("A-08: 未提供 qos_class 时应自动归一化", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 300, max_comments: 300 }));
    expect(result.valid).toBe(true);
    expect(result.resolved_qos_class).toBe("small");
  });

  test("A-09: llm_sample_ratio=0 和 1 边界值应通过", () => {
    expect(
      validateCreateCrawlJobRequest(valid({ analysis_scope: "sampled", llm_sample_ratio: 0 })).valid
    ).toBe(true);
    expect(
      validateCreateCrawlJobRequest(valid({ analysis_scope: "sampled", llm_sample_ratio: 1 })).valid
    ).toBe(true);
  });

  test("A-10: idempotency_key 8位最短应通过", () => {
    const result = validateCreateCrawlJobRequest(valid({ idempotency_key: "abcd1234" }));
    expect(result.valid).toBe(true);
  });

  test("A-11: runtime.max_retries=0 边界值应通过", () => {
    const result = validateCreateCrawlJobRequest(valid({ runtime: { max_retries: 0 } }));
    expect(result.valid).toBe(true);
  });

  test("A-12: runtime.timeout_minutes=5 边界最小值应通过", () => {
    const result = validateCreateCrawlJobRequest(valid({ runtime: { timeout_minutes: 5 } }));
    expect(result.valid).toBe(true);
  });
});

// ==================== B: 必填字段缺失 / 类型错误 ====================

describe("B: 必填字段缺失与类型错误", () => {
  test("B-01: 传入 null 应返回 type 错误", () => {
    const result = validateCreateCrawlJobRequest(null);
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "$", "type")).toBe(true);
  });

  test("B-02: 传入数组应返回 type 错误", () => {
    const result = validateCreateCrawlJobRequest([]);
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "$", "type")).toBe(true);
  });

  test("B-03: source 缺失应报错", () => {
    const { source: _s, ...body } = VALID_BODY as Record<string, unknown>;
    const result = validateCreateCrawlJobRequest(body);
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "source", "enum")).toBe(true);
  });

  test("B-04: source='twitter' 非法值应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ source: "twitter" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "source")).toBe(true);
  });

  test("B-05: target_comments 缺失应报错", () => {
    const body = { source: "reddit", max_comments: 100, analysis_scope: "full" };
    const result = validateCreateCrawlJobRequest(body);
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "target_comments", "range")).toBe(true);
  });

  test("B-06: target_comments 为字符串应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: "100" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "target_comments", "range")).toBe(true);
  });

  test("B-07: analysis_scope 缺失应报错", () => {
    const body = { source: "reddit", target_comments: 100, max_comments: 200 };
    const result = validateCreateCrawlJobRequest(body);
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "analysis_scope", "enum")).toBe(true);
  });

  test("B-08: analysis_scope 非法值应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ analysis_scope: "partial" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "analysis_scope")).toBe(true);
  });
});

// ==================== C: 数值范围边界 ====================

describe("C: 数值范围边界校验", () => {
  test("C-01: target_comments=0 应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 0 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "target_comments", "range")).toBe(true);
  });

  test("C-02: target_comments=10001 应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 10001, max_comments: 10001 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "target_comments", "range")).toBe(true);
  });

  test("C-03: target_comments=1.5 浮点数应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ target_comments: 1.5 }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "target_comments", "range")).toBe(true);
  });

  test("C-04: target_comments > max_comments 交叉规则应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ target_comments: 500, max_comments: 300 })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "target_comments", "cross_field")).toBe(true);
  });

  test("C-05: llm_sample_ratio=-0.1 应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ analysis_scope: "sampled", llm_sample_ratio: -0.1 })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "llm_sample_ratio", "range")).toBe(true);
  });

  test("C-06: llm_sample_ratio=1.1 应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ analysis_scope: "sampled", llm_sample_ratio: 1.1 })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "llm_sample_ratio", "range")).toBe(true);
  });

  test("C-07: runtime.timeout_minutes=4 应报错（低于最小值5）", () => {
    const result = validateCreateCrawlJobRequest(valid({ runtime: { timeout_minutes: 4 } }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "runtime.timeout_minutes", "range")).toBe(true);
  });

  test("C-08: runtime.timeout_minutes=241 应报错（超过最大值240）", () => {
    const result = validateCreateCrawlJobRequest(valid({ runtime: { timeout_minutes: 241 } }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "runtime.timeout_minutes", "range")).toBe(true);
  });

  test("C-09: runtime.max_retries=-1 应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ runtime: { max_retries: -1 } }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "runtime.max_retries", "range")).toBe(true);
  });

  test("C-10: runtime.max_retries=9 应报错（超过最大值8）", () => {
    const result = validateCreateCrawlJobRequest(valid({ runtime: { max_retries: 9 } }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "runtime.max_retries", "range")).toBe(true);
  });
});

// ==================== D: 枚举与格式校验 ====================

describe("D: 枚举与格式校验", () => {
  test("D-01: qos_class='xlarge' 非法枚举应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ qos_class: "xlarge" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "qos_class", "enum")).toBe(true);
  });

  test("D-02: priority='urgent' 非法枚举应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ priority: "urgent" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "priority", "enum")).toBe(true);
  });

  test("D-03: idempotency_key 长度7（过短）应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ idempotency_key: "abcd123" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "idempotency_key", "pattern")).toBe(true);
  });

  test("D-04: idempotency_key 含非法字符应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ idempotency_key: "key@with!special" }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "idempotency_key", "pattern")).toBe(true);
  });

  test("D-05: idempotency_key 65位（过长）应报错", () => {
    const result = validateCreateCrawlJobRequest(valid({ idempotency_key: "a".repeat(65) }));
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "idempotency_key", "pattern")).toBe(true);
  });

  test("D-06: filters.subreddits 含非法名称应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ filters: { subreddits: ["valid_sub", "invalid sub!"] } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "filters.subreddits[1]", "pattern")).toBe(true);
  });

  test("D-07: filters.subreddits 超过100个应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ filters: { subreddits: Array.from({ length: 101 }, (_, i) => `sub${i}`) } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "filters.subreddits", "maxLength")).toBe(true);
  });

  test("D-08: filters.time_range='forever' 非法枚举应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ filters: { time_range: "forever" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "filters.time_range", "enum")).toBe(true);
  });

  test("D-09: filters.sort='random' 非法枚举应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ filters: { sort: "random" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "filters.sort", "enum")).toBe(true);
  });

  test("D-10: runtime.proxy_strategy='auto' 非法枚举应报错", () => {
    const result = validateCreateCrawlJobRequest(
      valid({ runtime: { proxy_strategy: "auto" } })
    );
    expect(result.valid).toBe(false);
    expect(hasIssue(result.issues, "runtime.proxy_strategy", "enum")).toBe(true);
  });
});

// ==================== E: resolveQosClass 辅助函数 ====================

describe("E: resolveQosClass 辅助函数", () => {
  test("E-01: 1 => small", () => expect(resolveQosClass(1)).toBe("small"));
  test("E-02: 1000 => small (边界)", () => expect(resolveQosClass(1000)).toBe("small"));
  test("E-03: 1001 => medium (边界)", () => expect(resolveQosClass(1001)).toBe("medium"));
  test("E-04: 5000 => medium (边界)", () => expect(resolveQosClass(5000)).toBe("medium"));
  test("E-05: 5001 => large (边界)", () => expect(resolveQosClass(5001)).toBe("large"));
  test("E-06: 10000 => large (边界)", () => expect(resolveQosClass(10000)).toBe("large"));
  test("E-07: 500 => small", () => expect(resolveQosClass(500)).toBe("small"));
  test("E-08: 3000 => medium", () => expect(resolveQosClass(3000)).toBe("medium"));
  test("E-09: 8000 => large", () => expect(resolveQosClass(8000)).toBe("large"));

  test("E-10: 校验失败时 resolved_qos_class 应为 undefined", () => {
    const result = validateCreateCrawlJobRequest(valid({ source: "twitter" }));
    expect(result.valid).toBe(false);
    expect(result.resolved_qos_class).toBeUndefined();
  });
});
