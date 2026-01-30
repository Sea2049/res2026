/**
 * 优先级计算API端点
 * v2.6.0 新增
 * POST /api/analysis/prioritize
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculatePriority,
  calculateBatchPriority,
  generatePrioritySummary,
  sortByPriority,
  groupByPriorityLevel,
} from "@/features/analysis/utils/priority-calculator";
import type { Insight, PriorityResult } from "@/lib/types";
import { analysisRateLimiter, checkRateLimit } from "@/lib/rate-limiter";

/**
 * POST - 计算洞察优先级
 * 
 * Request Body:
 * {
 *   insights: Insight[],
 *   effortMap?: Record<string, number>,  // 可选：每个洞察的实施难度
 *   options?: {
 *     sort?: boolean,      // 是否排序
 *     group?: boolean,     // 是否分组
 *     summary?: boolean    // 是否生成摘要
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(analysisRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { insights, effortMap, options } = body;

    // 验证输入
    if (!insights || !Array.isArray(insights)) {
      return NextResponse.json(
        { error: "Invalid request: insights array is required" },
        { status: 400 }
      );
    }

    if (insights.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: insights array cannot be empty" },
        { status: 400 }
      );
    }

    // 批量计算优先级
    const insightsWithPriority = calculateBatchPriority(
      insights as Insight[],
      effortMap
    );

    // 根据选项处理结果
    let result: {
      insights: Array<Insight & { priority: PriorityResult }>;
      count: number;
      grouped?: Record<string, Array<Insight & { priority: PriorityResult }>>;
      summary?: ReturnType<typeof generatePrioritySummary>;
    } = {
      insights: insightsWithPriority,
      count: insightsWithPriority.length,
    };

    // 排序
    if (options?.sort) {
      result.insights = sortByPriority(insightsWithPriority);
    }

    // 分组
    if (options?.group) {
      result.grouped = groupByPriorityLevel(insightsWithPriority);
    }

    // 摘要
    if (options?.summary) {
      result.summary = generatePrioritySummary(insightsWithPriority);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Priority calculation error:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate priorities",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取优先级计算示例和文档
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/analysis/prioritize",
    method: "POST",
    description: "Calculate priority scores for insights based on impact, frequency, urgency, and effort",
    version: "2.6.0",
    formula: "Priority = (Impact × Frequency × Urgency) / Effort",
    requestBody: {
      insights: "Array<Insight>  // Required: Array of insights to prioritize",
      effortMap: "Record<string, number>  // Optional: Map of insight IDs to effort scores (1-10)",
      options: {
        sort: "boolean  // Optional: Sort by priority (default: false)",
        group: "boolean  // Optional: Group by priority level (default: false)",
        summary: "boolean  // Optional: Include priority summary (default: false)",
      },
    },
    responseBody: {
      insights: "Array<Insight & { priority: PriorityResult }>",
      count: "number",
      grouped: "Record<PriorityLevel, Insight[]>  // If options.group = true",
      summary: "PrioritySummary  // If options.summary = true",
    },
    priorityLevels: {
      critical: "Score >= 5.0",
      high: "Score >= 2.5",
      medium: "Score >= 1.0",
      low: "Score < 1.0",
    },
    example: {
      request: {
        insights: [
          {
            id: "insight_1",
            type: "pain_point",
            title: "性能问题",
            description: "用户反馈加载速度慢",
            confidence: 0.85,
            count: 15,
            severity: "high",
            relatedComments: ["c1", "c2"],
          },
        ],
        effortMap: {
          insight_1: 3,
        },
        options: {
          sort: true,
          summary: true,
        },
      },
      response: {
        insights: [
          {
            id: "insight_1",
            type: "pain_point",
            confidence: 0.85,
            count: 15,
            priority: {
              score: 3.19,
              level: "high",
              params: {
                impact: 12.75,
                frequency: 0.85,
                urgency: 0.75,
                effort: 3,
              },
              recommendedAction: "本周处理：重要的用户痛点",
            },
          },
        ],
        count: 1,
        summary: {
          total: 1,
          byCritical: 0,
          byHigh: 1,
          byMedium: 0,
          byLow: 0,
          avgScore: 3.19,
        },
      },
    },
  });
}
