/**
 * 爬取任务请求校验器（零依赖，手写实现）
 * 覆盖 CreateCrawlJobRequest 全部字段的业务规则
 */

import type {
  CreateCrawlJobRequest,
  QosClass,
  CrawlJobConfig,
} from "../types";

// ==================== 公共接口 ====================

/** 单条校验问题描述 */
export interface ValidationIssue {
  field: string;
  rule: string;
  message: string;
  expected?: string;
  actual?: string;
}

/** 校验结果 */
export interface JobValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** 经归一化后的 qos_class（auto 已解析为具体值） */
  resolved_qos_class?: Exclude<QosClass, "auto">;
}

// ==================== 常量 ====================

const VALID_SOURCES = ["reddit"] as const;
const VALID_SCOPES = ["full", "sampled"] as const;
const VALID_QOS = ["small", "medium", "large", "auto"] as const;
const VALID_PRIORITIES = ["low", "normal", "high"] as const;
const VALID_TIME_RANGES = ["hour", "day", "week", "month", "year", "all"] as const;
const VALID_SORT = ["hot", "new", "top", "relevance"] as const;
const VALID_PROXY_STRATEGIES = ["none", "pool", "sticky"] as const;

const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;
const SUBREDDIT_REGEX = /^[a-zA-Z0-9_]{1,50}$/;

// ==================== 辅助函数 ====================

/**
 * 根据目标评论数解析具体的 QoS 等级
 * - small:  1 – 1 000
 * - medium: 1 001 – 5 000
 * - large:  5 001 – 10 000
 */
export function resolveQosClass(
  target_comments: number
): "small" | "medium" | "large" {
  if (target_comments <= 1000) return "small";
  if (target_comments <= 5000) return "medium";
  return "large";
}

/** 生成一条校验问题 */
function issue(
  field: string,
  rule: string,
  message: string,
  opts?: { expected?: string; actual?: string }
): ValidationIssue {
  return { field, rule, message, ...opts };
}

/** 判断是否为安全整数且在范围内 */
function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

// ==================== 主校验函数 ====================

/**
 * 校验创建爬取任务的请求体
 *
 * @param body 原始请求体（来自 JSON.parse 或 req.body）
 * @returns 校验结果，valid=true 时 resolved_qos_class 必定存在
 */
export function validateCreateCrawlJobRequest(
  body: unknown
): JobValidationResult {
  const issues: ValidationIssue[] = [];

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

  // ── source ──────────────────────────────────────────────────────────────
  if (!VALID_SOURCES.includes(req.source as (typeof VALID_SOURCES)[number])) {
    issues.push(
      issue("source", "enum", `source 必须是 "reddit"`, {
        expected: "reddit",
        actual: String(req.source),
      })
    );
  }

  // ── target_comments ─────────────────────────────────────────────────────
  if (!isIntInRange(req.target_comments, 1, 10000)) {
    issues.push(
      issue(
        "target_comments",
        "range",
        "target_comments 必须是 1..10000 的整数",
        {
          expected: "integer 1..10000",
          actual: String(req.target_comments),
        }
      )
    );
  }

  // ── max_comments ─────────────────────────────────────────────────────────
  if (!isIntInRange(req.max_comments, 1, 10000)) {
    issues.push(
      issue("max_comments", "range", "max_comments 必须是 1..10000 的整数", {
        expected: "integer 1..10000",
        actual: String(req.max_comments),
      })
    );
  }

  // ── 交叉规则: target_comments <= max_comments ─────────────────────────
  if (
    typeof req.target_comments === "number" &&
    typeof req.max_comments === "number" &&
    req.target_comments > req.max_comments
  ) {
    issues.push(
      issue(
        "target_comments",
        "cross_field",
        "target_comments 不能大于 max_comments",
        {
          expected: `<= max_comments(${req.max_comments})`,
          actual: String(req.target_comments),
        }
      )
    );
  }

  // ── analysis_scope ───────────────────────────────────────────────────────
  if (!VALID_SCOPES.includes(req.analysis_scope as (typeof VALID_SCOPES)[number])) {
    issues.push(
      issue(
        "analysis_scope",
        "enum",
        `analysis_scope 必须是 "full" 或 "sampled"`,
        {
          expected: "full | sampled",
          actual: String(req.analysis_scope),
        }
      )
    );
  }

  // ── llm_sample_ratio（sampled 模式下必须在 0..1）────────────────────────
  if (req.analysis_scope === "sampled") {
    if (req.llm_sample_ratio !== undefined) {
      const ratio = req.llm_sample_ratio;
      if (
        typeof ratio !== "number" ||
        isNaN(ratio) ||
        ratio < 0 ||
        ratio > 1
      ) {
        issues.push(
          issue(
            "llm_sample_ratio",
            "range",
            "sampled 模式下 llm_sample_ratio 必须在 0..1 之间",
            {
              expected: "number 0..1",
              actual: String(ratio),
            }
          )
        );
      }
    }
    // sampled 模式下建议提供 llm_sample_ratio，但不强制（允许省略）
  }

  // ── qos_class ────────────────────────────────────────────────────────────
  let resolvedQos: Exclude<QosClass, "auto"> | undefined;

  if (req.qos_class !== undefined) {
    if (!VALID_QOS.includes(req.qos_class as (typeof VALID_QOS)[number])) {
      issues.push(
        issue(
          "qos_class",
          "enum",
          `qos_class 必须是 small | medium | large | auto`,
          {
            expected: "small | medium | large | auto",
            actual: String(req.qos_class),
          }
        )
      );
    } else if (req.qos_class === "auto") {
      // auto: 根据 target_comments 归一化
      const tc =
        typeof req.target_comments === "number" ? req.target_comments : 1;
      resolvedQos = resolveQosClass(tc);
    } else {
      resolvedQos = req.qos_class as Exclude<QosClass, "auto">;
    }
  } else {
    // 未提供时默认 auto 归一化
    const tc =
      typeof req.target_comments === "number" ? req.target_comments : 1;
    resolvedQos = resolveQosClass(tc);
  }

  // ── priority ─────────────────────────────────────────────────────────────
  if (
    req.priority !== undefined &&
    !VALID_PRIORITIES.includes(req.priority as (typeof VALID_PRIORITIES)[number])
  ) {
    issues.push(
      issue("priority", "enum", `priority 必须是 low | normal | high`, {
        expected: "low | normal | high",
        actual: String(req.priority),
      })
    );
  }

  // ── idempotency_key ──────────────────────────────────────────────────────
  if (req.idempotency_key !== undefined) {
    if (
      typeof req.idempotency_key !== "string" ||
      !IDEMPOTENCY_KEY_REGEX.test(req.idempotency_key)
    ) {
      issues.push(
        issue(
          "idempotency_key",
          "pattern",
          "idempotency_key 长度必须 8..64，仅允许 [a-zA-Z0-9_-]",
          {
            expected: "/^[a-zA-Z0-9_-]{8,64}$/",
            actual: String(req.idempotency_key),
          }
        )
      );
    }
  }

  // ── filters ──────────────────────────────────────────────────────────────
  if (req.filters !== undefined) {
    if (typeof req.filters !== "object" || req.filters === null || Array.isArray(req.filters)) {
      issues.push(
        issue("filters", "type", "filters 必须是对象", {
          expected: "object",
          actual: Array.isArray(req.filters) ? "array" : typeof req.filters,
        })
      );
    } else {
      const filters = req.filters as Record<string, unknown>;

      // filters.subreddits
      if (filters.subreddits !== undefined) {
        if (!Array.isArray(filters.subreddits)) {
          issues.push(
            issue("filters.subreddits", "type", "filters.subreddits 必须是数组")
          );
        } else {
          if (filters.subreddits.length > 100) {
            issues.push(
              issue(
                "filters.subreddits",
                "maxLength",
                "filters.subreddits 最多 100 个元素",
                {
                  expected: "<= 100",
                  actual: String(filters.subreddits.length),
                }
              )
            );
          }
          for (let i = 0; i < filters.subreddits.length; i++) {
            const sr = filters.subreddits[i];
            if (typeof sr !== "string" || !SUBREDDIT_REGEX.test(sr)) {
              issues.push(
                issue(
                  `filters.subreddits[${i}]`,
                  "pattern",
                  `subreddit 名称必须匹配 /^[a-zA-Z0-9_]{1,50}$/`,
                  {
                    expected: "/^[a-zA-Z0-9_]{1,50}$/",
                    actual: String(sr),
                  }
                )
              );
            }
          }
        }
      }

      // filters.time_range
      if (
        filters.time_range !== undefined &&
        !VALID_TIME_RANGES.includes(
          filters.time_range as (typeof VALID_TIME_RANGES)[number]
        )
      ) {
        issues.push(
          issue(
            "filters.time_range",
            "enum",
            `time_range 必须是 hour | day | week | month | year | all`,
            {
              expected: VALID_TIME_RANGES.join(" | "),
              actual: String(filters.time_range),
            }
          )
        );
      }

      // filters.sort
      if (
        filters.sort !== undefined &&
        !VALID_SORT.includes(filters.sort as (typeof VALID_SORT)[number])
      ) {
        issues.push(
          issue(
            "filters.sort",
            "enum",
            `sort 必须是 hot | new | top | relevance`,
            {
              expected: VALID_SORT.join(" | "),
              actual: String(filters.sort),
            }
          )
        );
      }
    }
  }

  // ── runtime ───────────────────────────────────────────────────────────────
  if (req.runtime !== undefined) {
    if (typeof req.runtime !== "object" || req.runtime === null || Array.isArray(req.runtime)) {
      issues.push(
        issue("runtime", "type", "runtime 必须是对象", {
          expected: "object",
          actual: typeof req.runtime,
        })
      );
    } else {
      const runtime = req.runtime as Record<string, unknown>;

      // runtime.timeout_minutes: 5..240
      if (runtime.timeout_minutes !== undefined) {
        if (!isIntInRange(runtime.timeout_minutes, 5, 240)) {
          issues.push(
            issue(
              "runtime.timeout_minutes",
              "range",
              "timeout_minutes 必须是 5..240 的整数",
              {
                expected: "integer 5..240",
                actual: String(runtime.timeout_minutes),
              }
            )
          );
        }
      }

      // runtime.max_retries: 0..8
      if (runtime.max_retries !== undefined) {
        if (
          typeof runtime.max_retries !== "number" ||
          !Number.isInteger(runtime.max_retries) ||
          runtime.max_retries < 0 ||
          runtime.max_retries > 8
        ) {
          issues.push(
            issue(
              "runtime.max_retries",
              "range",
              "max_retries 必须是 0..8 的整数",
              {
                expected: "integer 0..8",
                actual: String(runtime.max_retries),
              }
            )
          );
        }
      }

      // runtime.proxy_strategy
      if (
        runtime.proxy_strategy !== undefined &&
        !VALID_PROXY_STRATEGIES.includes(
          runtime.proxy_strategy as (typeof VALID_PROXY_STRATEGIES)[number]
        )
      ) {
        issues.push(
          issue(
            "runtime.proxy_strategy",
            "enum",
            `proxy_strategy 必须是 none | pool | sticky`,
            {
              expected: "none | pool | sticky",
              actual: String(runtime.proxy_strategy),
            }
          )
        );
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    resolved_qos_class: issues.length === 0 ? resolvedQos : undefined,
  };
}
