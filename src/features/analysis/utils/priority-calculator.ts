/**
 * 优先级计算工具
 * v2.6.0 新增 - 基于 customer-feedback-analyzer skill
 */

import type { Insight, PriorityCalculationParams, PriorityResult } from "@/lib/types";

/**
 * 计算洞察的优先级分数
 * 公式: Priority = (Impact × Frequency × Urgency) / Effort
 * 
 * @param insight 洞察对象
 * @param effort 实施难度 (1-10，默认5)
 * @returns 优先级结果
 */
export function calculatePriority(
  insight: Insight,
  effort: number = 5
): PriorityResult {
  // 1. 计算影响力 = 评论数 × 情感强度（用置信度作为代理）
  const impact = (insight.count || 0) * insight.confidence;
  
  // 2. 频率 = 置信度
  const frequency = insight.confidence;
  
  // 3. 紧急度 = (严重程度分数 + WISH紧急度) / 2
  const severityScore = getSeverityScore(insight.severity);
  const wishUrgency = insight.urgency ? insight.urgency / 10 : 0.5;
  const urgency = insight.isWish 
    ? (severityScore + wishUrgency) / 2
    : severityScore;
  
  // 4. 计算优先级分数
  const score = (impact * frequency * urgency) / Math.max(effort, 1);
  
  // 5. 确定优先级等级
  const level = getPriorityLevel(score);
  
  // 6. 生成建议行动
  const recommendedAction = getRecommendedAction(level, insight.type);
  
  const params: PriorityCalculationParams = {
    impact,
    frequency,
    urgency,
    effort,
  };
  
  return {
    score: Math.round(score * 100) / 100, // 保留两位小数
    level,
    params,
    recommendedAction,
  };
}

/**
 * 将严重程度转换为数值分数 (0-1)
 */
function getSeverityScore(
  severity?: "low" | "medium" | "high" | "critical"
): number {
  if (!severity) return 0.5;
  
  const scoreMap = {
    low: 0.25,
    medium: 0.5,
    high: 0.75,
    critical: 1.0,
  };
  
  return scoreMap[severity];
}

/**
 * 根据分数确定优先级等级
 */
function getPriorityLevel(
  score: number
): "critical" | "high" | "medium" | "low" {
  if (score >= 5.0) return "critical";
  if (score >= 2.5) return "high";
  if (score >= 1.0) return "medium";
  return "low";
}

/**
 * 根据优先级等级和类型生成建议行动
 */
function getRecommendedAction(
  level: "critical" | "high" | "medium" | "low",
  type: Insight["type"]
): string {
  const actions: Record<string, Record<string, string>> = {
    critical: {
      pain_point: "立即处理：严重影响用户体验的问题",
      feature_request: "优先开发：高需求的核心功能",
      praise: "放大宣传：用户非常喜爱的特性",
      question: "紧急回应：需要立即澄清的常见疑问",
    },
    high: {
      pain_point: "本周处理：重要的用户痛点",
      feature_request: "下个Sprint：高价值功能请求",
      praise: "持续优化：用户认可的方向",
      question: "本周回应：重要的用户疑问",
    },
    medium: {
      pain_point: "本月处理：中等优先级问题",
      feature_request: "Backlog高优先级：考虑加入路线图",
      praise: "保持现状：用户满意的功能",
      question: "定期回应：提供更好的文档说明",
    },
    low: {
      pain_point: "观察跟踪：低影响问题",
      feature_request: "Backlog：长期考虑的功能",
      praise: "记录反馈：继续保持",
      question: "FAQ收录：更新文档即可",
    },
  };
  
  return actions[level][type] || "评估后决定行动方案";
}

/**
 * 批量计算多个洞察的优先级
 */
export function calculateBatchPriority(
  insights: Insight[],
  effortMap?: Record<string, number>
): Array<Insight & { priority: PriorityResult }> {
  return insights.map(insight => {
    const effort = effortMap?.[insight.id] || 5;
    const priority = calculatePriority(insight, effort);
    return {
      ...insight,
      priority,
    };
  });
}

/**
 * 按优先级分数排序洞察
 */
export function sortByPriority(
  insights: Array<Insight & { priority?: PriorityResult }>,
  direction: "asc" | "desc" = "desc"
): Array<Insight & { priority?: PriorityResult }> {
  return [...insights].sort((a, b) => {
    const scoreA = a.priority?.score || 0;
    const scoreB = b.priority?.score || 0;
    return direction === "desc" ? scoreB - scoreA : scoreA - scoreB;
  });
}

/**
 * 按优先级等级分组洞察
 */
export function groupByPriorityLevel(
  insights: Array<Insight & { priority?: PriorityResult }>
): Record<"critical" | "high" | "medium" | "low", Insight[]> {
  const groups = {
    critical: [] as Insight[],
    high: [] as Insight[],
    medium: [] as Insight[],
    low: [] as Insight[],
  };
  
  for (const insight of insights) {
    const level = insight.priority?.level || "low";
    groups[level].push(insight);
  }
  
  return groups;
}

/**
 * 生成优先级摘要统计
 */
export interface PrioritySummary {
  total: number;
  byCritical: number;
  byHigh: number;
  byMedium: number;
  byLow: number;
  avgScore: number;
  topPriority: Insight | null;
}

export function generatePrioritySummary(
  insights: Array<Insight & { priority?: PriorityResult }>
): PrioritySummary {
  const grouped = groupByPriorityLevel(insights);
  const scores = insights
    .map(i => i.priority?.score || 0)
    .filter(s => s > 0);
  
  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0;
  
  const sorted = sortByPriority(insights, "desc");
  
  return {
    total: insights.length,
    byCritical: grouped.critical.length,
    byHigh: grouped.high.length,
    byMedium: grouped.medium.length,
    byLow: grouped.low.length,
    avgScore: Math.round(avgScore * 100) / 100,
    topPriority: sorted[0] || null,
  };
}
