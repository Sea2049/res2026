import { getDb } from "./db";

export interface NormalizedComment {
  comment_id: string;
  job_id: string;
  post_id: string;
  subreddit: string;
  author: string;
  body: string;
  created_utc: number;
  normalized_at: string;
}

interface NormalizedCommentRow {
  comment_id: string;
  job_id: string;
  post_id: string;
  subreddit: string;
  author: string;
  body: string;
  created_utc: number;
  normalized_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * 保存原始评论 JSON（每次抓取均记录，便于 replay）
 */
export async function saveRawComment(
  jobId: string,
  taskId: string,
  commentId: string,
  rawJson: unknown,
  context: unknown
): Promise<void> {
  const db = getDb();
  await db.run(
    `INSERT INTO comments_raw (job_id, task_id, comment_id, raw_json, request_context_json, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      jobId,
      taskId,
      commentId,
      JSON.stringify(rawJson),
      context ? JSON.stringify(context) : null,
      nowIso(),
    ]
  );
}

/**
 * 保存规范化评论，幂等（comment_id 冲突时忽略）
 * ON CONFLICT(comment_id) DO NOTHING 在 SQLite 3.24+ 和 PostgreSQL 中均支持
 * @returns true 表示新增，false 表示已存在（幂等跳过）
 */
export async function saveNormalizedComment(
  data: NormalizedComment
): Promise<boolean> {
  const db = getDb();
  const result = await db.run(
    `INSERT INTO comments_normalized
       (comment_id, job_id, post_id, subreddit, author, body, created_utc, normalized_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(comment_id) DO NOTHING`,
    [
      data.comment_id,
      data.job_id,
      data.post_id,
      data.subreddit,
      data.author,
      data.body,
      data.created_utc,
      data.normalized_at ?? nowIso(),
    ]
  );

  return result.rowCount > 0;
}

/**
 * 按 job_id 分页查询规范化评论（基于 comment_id 游标）
 */
export async function getNormalizedComments(
  jobId: string,
  limit = 50,
  cursor?: string
): Promise<NormalizedComment[]> {
  const db = getDb();

  const conditions = ["job_id = ?"];
  const values: unknown[] = [jobId];

  if (cursor) {
    conditions.push("comment_id > ?");
    values.push(cursor);
  }

  values.push(limit);

  const rows = await db.all<NormalizedCommentRow>(
    `SELECT * FROM comments_normalized WHERE ${conditions.join(" AND ")}
     ORDER BY comment_id ASC LIMIT ?`,
    values
  );

  return rows;
}

/**
 * 统计某任务已规范化评论数
 * COUNT(*) 在 PostgreSQL 返回字符串（bigint），用 Number() 统一转换
 */
export async function countNormalizedComments(jobId: string): Promise<number> {
  const db = getDb();
  const row = await db.get<{ cnt: number | string }>(
    "SELECT COUNT(*) as cnt FROM comments_normalized WHERE job_id = ?",
    [jobId]
  );
  return Number(row?.cnt ?? 0);
}
