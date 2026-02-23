import type { AnalysisSummary } from "../../../../src/lib/types";
import type { NormalizedComment } from "../storage/comment-repo";
import type { CommentAnalysisResult } from "./comment-analyzer";

export interface AggregatedInsights {
  job_id: string;
  analyzed_count: number;
  sentiment_distribution: { positive: number; neutral: number; negative: number };
  top_keywords: string[];
  top_insight_types: string[];
  /** pain_point 类型评论 body 片段，最多 5 条，每条截断为 200 字符 */
  pain_points_sample: string[];
  /** feature_request 类型评论 body 片段，最多 5 条，每条截断为 200 字符 */
  feature_requests_sample: string[];
}

/**
 * 聚合单个任务的所有分析结果。
 */
export function aggregateInsights(
  jobId: string,
  results: CommentAnalysisResult[],
  comments: NormalizedComment[]
): AggregatedInsights {
  const sentimentDist = { positive: 0, neutral: 0, negative: 0 };
  const keywordFreq = new Map<string, number>();
  const insightTypeCount = new Map<string, number>();
  const painPointIds: string[] = [];
  const featureRequestIds: string[] = [];

  for (const r of results) {
    // 累计情感分布
    sentimentDist[r.sentiment]++;

    // 累计关键词词频
    for (const kw of r.keywords) {
      keywordFreq.set(kw, (keywordFreq.get(kw) ?? 0) + 1);
    }

    // 累计洞察类型
    insightTypeCount.set(
      r.insight_type,
      (insightTypeCount.get(r.insight_type) ?? 0) + 1
    );

    if (r.insight_type === "pain_point") painPointIds.push(r.comment_id);
    if (r.insight_type === "feature_request") featureRequestIds.push(r.comment_id);
  }

  // 按词频降序取 Top-20 关键词
  const top_keywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  // 按出现次数降序取 Top-5 洞察类型
  const top_insight_types = Array.from(insightTypeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type]) => type);

  // 建立 comment_id → body 映射，用于提取样本
  const bodyMap = new Map<string, string>(
    comments.map((c) => [c.comment_id, c.body])
  );

  const toSample = (ids: string[]): string[] =>
    ids
      .slice(0, 5)
      .map((id) => bodyMap.get(id) ?? "")
      .filter(Boolean)
      .map((body) => body.slice(0, 200));

  return {
    job_id: jobId,
    analyzed_count: results.length,
    sentiment_distribution: sentimentDist,
    top_keywords,
    top_insight_types,
    pain_points_sample: toSample(painPointIds),
    feature_requests_sample: toSample(featureRequestIds),
  };
}

/**
 * 将聚合结果转换为主项目 AnalysisSummary 类型（供 API 层使用）。
 */
export function toAnalysisSummary(agg: AggregatedInsights): AnalysisSummary {
  return {
    analyzed_comments: agg.analyzed_count,
    sentiment_distribution: {
      positive: agg.sentiment_distribution.positive,
      neutral: agg.sentiment_distribution.neutral,
      negative: agg.sentiment_distribution.negative,
    },
    top_keywords: agg.top_keywords,
    top_insight_types: agg.top_insight_types,
  };
}
