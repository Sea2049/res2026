import { getDb } from "./db";
import type {
  CrawlJob,
  CrawlJobConfig,
  JobStatus,
  CrawlJobProgress,
} from "../../../../src/lib/types";

/**
 * 生成唯一任务 ID（格式: job_<uuid>）
 * 使用内置 crypto.randomUUID 避免引入额外依赖
 */
function generateJobId(): string {
  const uuid =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : // Node 14 fallback
        require("crypto").randomUUID();
  return `job_${uuid}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ==================== Row <-> Domain 转换 ====================

interface CrawlJobRow {
  job_id: string;
  status: string;
  source: string;
  target_comments: number;
  max_comments: number;
  analysis_scope: string;
  qos_class: string;
  priority: number;
  idempotency_key: string | null;
  filters_json: string | null;
  runtime_json: string | null;
  progress_json: string | null;
  errors_json: string | null;
  queued_at: string;
  started_at: string | null;
  updated_at: string;
  finished_at: string | null;
}

function rowToJob(row: CrawlJobRow): CrawlJob {
  return {
    jobId: row.job_id,
    status: row.status as JobStatus,
    source: row.source,
    targetComments: row.target_comments,
    maxComments: row.max_comments,
    analysisScope: row.analysis_scope as CrawlJob["analysisScope"],
    qosClass: row.qos_class as CrawlJob["qosClass"],
    priority: row.priority,
    idempotencyKey: row.idempotency_key ?? undefined,
    filtersJson: row.filters_json ?? undefined,
    runtimeJson: row.runtime_json ?? undefined,
    progressJson: row.progress_json ?? undefined,
    errorsJson: row.errors_json ?? undefined,
    queuedAt: row.queued_at,
    startedAt: row.started_at ?? undefined,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

// ==================== Public API ====================

/**
 * 创建任务，自动生成 job_id；幂等键冲突时返回已有任务
 */
export async function createJob(config: CrawlJobConfig): Promise<CrawlJob> {
  const db = getDb();
  const now = nowIso();

  // 幂等键检查
  if (config.idempotencyKey) {
    const existing = await db.get<CrawlJobRow>(
      "SELECT * FROM crawl_jobs WHERE idempotency_key = ?",
      [config.idempotencyKey]
    );
    if (existing) {
      return rowToJob(existing);
    }
  }

  const jobId = generateJobId();
  const filtersJson = config.filters ? JSON.stringify(config.filters) : null;

  await db.run(
    `INSERT INTO crawl_jobs (
      job_id, status, source, target_comments, max_comments,
      analysis_scope, qos_class, priority, idempotency_key,
      filters_json, queued_at, updated_at
    ) VALUES (
      ?, 'queued', ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )`,
    [
      jobId,
      config.source,
      config.targetComments,
      config.maxComments ?? 25,
      config.analysisScope ?? "full",
      config.qosClass ?? "batch",
      config.priority ?? 50,
      config.idempotencyKey ?? null,
      filtersJson,
      now,
      now,
    ]
  );

  return (await getJob(jobId))!;
}

/**
 * 按 job_id 查询任务
 */
export async function getJob(jobId: string): Promise<CrawlJob | null> {
  const db = getDb();
  const row = await db.get<CrawlJobRow>(
    "SELECT * FROM crawl_jobs WHERE job_id = ?",
    [jobId]
  );
  return row ? rowToJob(row) : null;
}

/**
 * 更新任务状态，支持附加字段
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra?: Partial<CrawlJob>
): Promise<void> {
  const db = getDb();
  const now = nowIso();

  const setClauses: string[] = ["status = ?", "updated_at = ?"];
  const values: unknown[] = [status, now];

  if (status === "running" && !extra?.startedAt) {
    setClauses.push("started_at = COALESCE(started_at, ?)");
    values.push(now);
  }
  if (status === "completed" || status === "failed" || status === "cancelled") {
    setClauses.push("finished_at = COALESCE(finished_at, ?)");
    values.push(now);
  }
  if (extra?.errorsJson !== undefined) {
    setClauses.push("errors_json = ?");
    values.push(extra.errorsJson);
  }
  if (extra?.runtimeJson !== undefined) {
    setClauses.push("runtime_json = ?");
    values.push(extra.runtimeJson);
  }

  values.push(jobId);
  await db.run(
    `UPDATE crawl_jobs SET ${setClauses.join(", ")} WHERE job_id = ?`,
    values
  );
}

/**
 * 更新任务进度
 */
export async function updateJobProgress(
  jobId: string,
  progress: CrawlJobProgress
): Promise<void> {
  const db = getDb();
  await db.run(
    "UPDATE crawl_jobs SET progress_json = ?, updated_at = ? WHERE job_id = ?",
    [JSON.stringify(progress), nowIso(), jobId]
  );
}

/**
 * 分页查询任务列表（基于 queued_at cursor 分页）
 */
export async function listJobs(
  filter?: { status?: JobStatus },
  limit = 20,
  cursor?: string
): Promise<CrawlJob[]> {
  const db = getDb();

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter?.status) {
    conditions.push("status = ?");
    values.push(filter.status);
  }
  if (cursor) {
    conditions.push("queued_at < ?");
    values.push(cursor);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  values.push(limit);

  const rows = await db.all<CrawlJobRow>(
    `SELECT * FROM crawl_jobs ${where} ORDER BY queued_at DESC LIMIT ?`,
    values
  );

  return rows.map(rowToJob);
}

/**
 * 取消任务，将错误原因写入 errors_json
 */
export async function cancelJob(jobId: string, reason: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) return;

  const errors: string[] = [];
  try {
    const existing = job.errorsJson ? JSON.parse(job.errorsJson) : [];
    if (Array.isArray(existing)) errors.push(...existing);
  } catch {
    // ignore parse error
  }
  errors.push(`cancelled: ${reason}`);

  await updateJobStatus(jobId, "cancelled", {
    errorsJson: JSON.stringify(errors),
  });
}
