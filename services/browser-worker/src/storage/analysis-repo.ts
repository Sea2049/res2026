import { getDb } from "./db";

export interface AnalysisResult {
  /** 关联的评论 ID */
  comment_id: string;
  /** 分析版本，默认 "v1" */
  analysis_version: string;
  /** 情感倾向 */
  sentiment: "positive" | "negative" | "neutral" | null;
  /** 关键词列表（JSON 序列化） */
  keywords_json: string | null;
  /** 洞察类型 */
  insight_type: string | null;
  /** 优先级分数 */
  priority: number | null;
  /** 分析时间 */
  analyzed_at: string;
}

export interface AnalysisSummaryData {
  job_id: string;
  total_analyzed: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
    unknown: number;
  };
  insight_type_distribution: Record<string, number>;
  avg_priority: number | null;
  versions: string[];
}

interface AnalysisResultRow {
  id: number;
  comment_id: string;
  analysis_version: string;
  sentiment: string | null;
  keywords_json: string | null;
  insight_type: string | null;
  priority: number | null;
  analyzed_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 保存分析结果，按 (comment_id, analysis_version) 唯一
 * 冲突时替换（重分析场景）
 * ON CONFLICT ... DO UPDATE 在 SQLite 3.24+ 和 PostgreSQL 中均支持
 */
export async function saveAnalysisResult(result: AnalysisResult): Promise<void> {
  const db = getDb();
  await db.run(
    `INSERT INTO analysis_results
       (comment_id, analysis_version, sentiment, keywords_json, insight_type, priority, analyzed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(comment_id, analysis_version) DO UPDATE SET
       sentiment     = excluded.sentiment,
       keywords_json = excluded.keywords_json,
       insight_type  = excluded.insight_type,
       priority      = excluded.priority,
       analyzed_at   = excluded.analyzed_at`,
    [
      result.comment_id,
      result.analysis_version ?? "v1",
      result.sentiment ?? null,
      result.keywords_json ?? null,
      result.insight_type ?? null,
      result.priority ?? null,
      result.analyzed_at ?? nowIso(),
    ]
  );
}

/**
 * 按 job_id 分页查询分析结果（通过 comments_normalized 关联）
 */
export async function getAnalysisResults(
  jobId: string,
  limit = 50,
  cursor?: string
): Promise<AnalysisResult[]> {
  const db = getDb();

  const conditions = ["cn.job_id = ?"];
  const values: unknown[] = [jobId];

  if (cursor) {
    conditions.push("ar.comment_id > ?");
    values.push(cursor);
  }

  values.push(limit);

  const rows = await db.all<AnalysisResultRow>(
    `SELECT ar.comment_id, ar.analysis_version, ar.sentiment,
            ar.keywords_json, ar.insight_type, ar.priority, ar.analyzed_at
     FROM analysis_results ar
     INNER JOIN comments_normalized cn ON cn.comment_id = ar.comment_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ar.comment_id ASC LIMIT ?`,
    values
  );

  return rows.map((r) => ({
    comment_id: r.comment_id,
    analysis_version: r.analysis_version,
    sentiment: r.sentiment as AnalysisResult["sentiment"],
    keywords_json: r.keywords_json,
    insight_type: r.insight_type,
    priority: r.priority,
    analyzed_at: r.analyzed_at,
  }));
}

/**
 * 获取任务级分析汇总数据
 * COUNT(*)/AVG() 在 PostgreSQL 中返回字符串（bigint/numeric），用 Number() 统一转换
 */
export async function getJobAnalysisSummary(
  jobId: string
): Promise<AnalysisSummaryData> {
  const db = getDb();

  // 总数
  const totalRow = await db.get<{ cnt: number | string }>(
    `SELECT COUNT(*) as cnt
     FROM analysis_results ar
     INNER JOIN comments_normalized cn ON cn.comment_id = ar.comment_id
     WHERE cn.job_id = ?`,
    [jobId]
  );
  const totalAnalyzed = Number(totalRow?.cnt ?? 0);

  // 情感分布
  const sentimentRows = await db.all<{
    sentiment: string | null;
    cnt: number | string;
  }>(
    `SELECT ar.sentiment, COUNT(*) as cnt
     FROM analysis_results ar
     INNER JOIN comments_normalized cn ON cn.comment_id = ar.comment_id
     WHERE cn.job_id = ?
     GROUP BY ar.sentiment`,
    [jobId]
  );

  const sentimentDist = { positive: 0, negative: 0, neutral: 0, unknown: 0 };
  for (const row of sentimentRows) {
    const cnt = Number(row.cnt);
    if (row.sentiment === "positive") sentimentDist.positive = cnt;
    else if (row.sentiment === "negative") sentimentDist.negative = cnt;
    else if (row.sentiment === "neutral") sentimentDist.neutral = cnt;
    else sentimentDist.unknown += cnt;
  }

  // 洞察类型分布
  const insightRows = await db.all<{
    insight_type: string;
    cnt: number | string;
  }>(
    `SELECT ar.insight_type, COUNT(*) as cnt
     FROM analysis_results ar
     INNER JOIN comments_normalized cn ON cn.comment_id = ar.comment_id
     WHERE cn.job_id = ? AND ar.insight_type IS NOT NULL
     GROUP BY ar.insight_type`,
    [jobId]
  );

  const insightDist: Record<string, number> = {};
  for (const row of insightRows) {
    insightDist[row.insight_type] = Number(row.cnt);
  }

  // 平均优先级
  const avgRow = await db.get<{ avg_priority: number | string | null }>(
    `SELECT AVG(ar.priority) as avg_priority
     FROM analysis_results ar
     INNER JOIN comments_normalized cn ON cn.comment_id = ar.comment_id
     WHERE cn.job_id = ? AND ar.priority IS NOT NULL`,
    [jobId]
  );
  const avgPriority =
    avgRow?.avg_priority == null ? null : Number(avgRow.avg_priority);

  // 已使用的分析版本
  const versionRows = await db.all<{ analysis_version: string }>(
    `SELECT DISTINCT ar.analysis_version
     FROM analysis_results ar
     INNER JOIN comments_normalized cn ON cn.comment_id = ar.comment_id
     WHERE cn.job_id = ?`,
    [jobId]
  );

  return {
    job_id: jobId,
    total_analyzed: totalAnalyzed,
    sentiment_distribution: sentimentDist,
    insight_type_distribution: insightDist,
    avg_priority: avgPriority,
    versions: versionRows.map((r) => r.analysis_version),
  };
}
