/**
 * 数据库建表语句
 * 支持 SQLite（开发/回退模式）与 PostgreSQL（生产模式）
 */

// ==================== SQLite DDL ====================

export const CREATE_TABLES_SQL = `
-- 任务元数据表
CREATE TABLE IF NOT EXISTS crawl_jobs (
  job_id            TEXT PRIMARY KEY,
  status            TEXT NOT NULL DEFAULT 'queued',
  source            TEXT NOT NULL,
  target_comments   INTEGER NOT NULL DEFAULT 100,
  max_comments      INTEGER NOT NULL DEFAULT 25,
  analysis_scope    TEXT NOT NULL DEFAULT 'full',
  qos_class         TEXT NOT NULL DEFAULT 'batch',
  priority          INTEGER NOT NULL DEFAULT 50,
  idempotency_key   TEXT UNIQUE,
  filters_json      TEXT,
  runtime_json      TEXT,
  progress_json     TEXT,
  errors_json       TEXT,
  queued_at         TEXT NOT NULL,
  started_at        TEXT,
  updated_at        TEXT NOT NULL,
  finished_at       TEXT
);

-- 子任务表（任务拆分的最小执行单元）
CREATE TABLE IF NOT EXISTS crawl_tasks (
  task_id         TEXT PRIMARY KEY,
  job_id          TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  task_key        TEXT NOT NULL,
  subreddit       TEXT NOT NULL,
  post_id         TEXT,
  time_window     TEXT,
  cursor_after    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempt         INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_retry_at   TEXT,
  UNIQUE(job_id, task_key)
);

-- 原始评论 JSON 表
CREATE TABLE IF NOT EXISTS comments_raw (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id                TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  task_id               TEXT NOT NULL,
  comment_id            TEXT NOT NULL,
  raw_json              TEXT NOT NULL,
  request_context_json  TEXT,
  fetched_at            TEXT NOT NULL
);

-- 规范化评论表
CREATE TABLE IF NOT EXISTS comments_normalized (
  comment_id      TEXT PRIMARY KEY,
  job_id          TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  post_id         TEXT NOT NULL,
  subreddit       TEXT NOT NULL,
  author          TEXT NOT NULL,
  body            TEXT NOT NULL,
  created_utc     INTEGER NOT NULL,
  normalized_at   TEXT NOT NULL
);

-- 分析结果表
CREATE TABLE IF NOT EXISTS analysis_results (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id        TEXT NOT NULL,
  analysis_version  TEXT NOT NULL DEFAULT 'v1',
  sentiment         TEXT,
  keywords_json     TEXT,
  insight_type      TEXT,
  priority          REAL,
  analyzed_at       TEXT NOT NULL,
  UNIQUE(comment_id, analysis_version)
);

-- 任务级统计表
CREATE TABLE IF NOT EXISTS job_metrics (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id            TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  crawl_throughput  REAL,
  error_rate        REAL,
  elapsed_ms        INTEGER,
  retry_count       INTEGER DEFAULT 0,
  challenge_hits    INTEGER DEFAULT 0,
  recorded_at       TEXT NOT NULL
);

-- 死信队列表
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id        TEXT NOT NULL,
  task_id       TEXT,
  error_code    TEXT NOT NULL,
  error_message TEXT NOT NULL,
  failed_at     TEXT NOT NULL,
  replay_count  INTEGER NOT NULL DEFAULT 0
);
`;

export const CREATE_INDEXES_SQL = `
-- crawl_jobs 索引
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status     ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_queued_at  ON crawl_jobs(queued_at);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_priority   ON crawl_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_source     ON crawl_jobs(source);

-- crawl_tasks 索引
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_job_id     ON crawl_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_status     ON crawl_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crawl_tasks_retry_at   ON crawl_tasks(next_retry_at);

-- comments_raw 索引
CREATE INDEX IF NOT EXISTS idx_comments_raw_job_id     ON comments_raw(job_id);
CREATE INDEX IF NOT EXISTS idx_comments_raw_comment_id ON comments_raw(comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_raw_fetched_at ON comments_raw(fetched_at);

-- comments_normalized 索引
CREATE INDEX IF NOT EXISTS idx_comments_norm_job_id    ON comments_normalized(job_id);
CREATE INDEX IF NOT EXISTS idx_comments_norm_subreddit ON comments_normalized(subreddit);
CREATE INDEX IF NOT EXISTS idx_comments_norm_post_id   ON comments_normalized(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_norm_author    ON comments_normalized(author);

-- analysis_results 索引
CREATE INDEX IF NOT EXISTS idx_analysis_comment_id  ON analysis_results(comment_id);
CREATE INDEX IF NOT EXISTS idx_analysis_version     ON analysis_results(analysis_version);
CREATE INDEX IF NOT EXISTS idx_analysis_insight     ON analysis_results(insight_type);
CREATE INDEX IF NOT EXISTS idx_analysis_sentiment   ON analysis_results(sentiment);

-- job_metrics 索引
CREATE INDEX IF NOT EXISTS idx_job_metrics_job_id  ON job_metrics(job_id);

-- dead_letter_queue 索引
CREATE INDEX IF NOT EXISTS idx_dlq_job_id    ON dead_letter_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_dlq_failed_at ON dead_letter_queue(failed_at);
`;

// ==================== PostgreSQL DDL ====================
// 主要差异：
//   INTEGER PRIMARY KEY AUTOINCREMENT → BIGSERIAL PRIMARY KEY
//   REAL                              → DOUBLE PRECISION

const POSTGRES_CREATE_TABLES_SQL = `
-- 任务元数据表
CREATE TABLE IF NOT EXISTS crawl_jobs (
  job_id            TEXT PRIMARY KEY,
  status            TEXT NOT NULL DEFAULT 'queued',
  source            TEXT NOT NULL,
  target_comments   INTEGER NOT NULL DEFAULT 100,
  max_comments      INTEGER NOT NULL DEFAULT 25,
  analysis_scope    TEXT NOT NULL DEFAULT 'full',
  qos_class         TEXT NOT NULL DEFAULT 'batch',
  priority          INTEGER NOT NULL DEFAULT 50,
  idempotency_key   TEXT UNIQUE,
  filters_json      TEXT,
  runtime_json      TEXT,
  progress_json     TEXT,
  errors_json       TEXT,
  queued_at         TEXT NOT NULL,
  started_at        TEXT,
  updated_at        TEXT NOT NULL,
  finished_at       TEXT
);

-- 子任务表（任务拆分的最小执行单元）
CREATE TABLE IF NOT EXISTS crawl_tasks (
  task_id         TEXT PRIMARY KEY,
  job_id          TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  task_key        TEXT NOT NULL,
  subreddit       TEXT NOT NULL,
  post_id         TEXT,
  time_window     TEXT,
  cursor_after    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  attempt         INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  next_retry_at   TEXT,
  UNIQUE(job_id, task_key)
);

-- 原始评论 JSON 表
CREATE TABLE IF NOT EXISTS comments_raw (
  id                    BIGSERIAL PRIMARY KEY,
  job_id                TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  task_id               TEXT NOT NULL,
  comment_id            TEXT NOT NULL,
  raw_json              TEXT NOT NULL,
  request_context_json  TEXT,
  fetched_at            TEXT NOT NULL
);

-- 规范化评论表
CREATE TABLE IF NOT EXISTS comments_normalized (
  comment_id      TEXT PRIMARY KEY,
  job_id          TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  post_id         TEXT NOT NULL,
  subreddit       TEXT NOT NULL,
  author          TEXT NOT NULL,
  body            TEXT NOT NULL,
  created_utc     INTEGER NOT NULL,
  normalized_at   TEXT NOT NULL
);

-- 分析结果表
CREATE TABLE IF NOT EXISTS analysis_results (
  id                BIGSERIAL PRIMARY KEY,
  comment_id        TEXT NOT NULL,
  analysis_version  TEXT NOT NULL DEFAULT 'v1',
  sentiment         TEXT,
  keywords_json     TEXT,
  insight_type      TEXT,
  priority          DOUBLE PRECISION,
  analyzed_at       TEXT NOT NULL,
  UNIQUE(comment_id, analysis_version)
);

-- 任务级统计表
CREATE TABLE IF NOT EXISTS job_metrics (
  id                BIGSERIAL PRIMARY KEY,
  job_id            TEXT NOT NULL REFERENCES crawl_jobs(job_id) ON DELETE CASCADE,
  crawl_throughput  DOUBLE PRECISION,
  error_rate        DOUBLE PRECISION,
  elapsed_ms        INTEGER,
  retry_count       INTEGER DEFAULT 0,
  challenge_hits    INTEGER DEFAULT 0,
  recorded_at       TEXT NOT NULL
);

-- 死信队列表
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id            BIGSERIAL PRIMARY KEY,
  job_id        TEXT NOT NULL,
  task_id       TEXT,
  error_code    TEXT NOT NULL,
  error_message TEXT NOT NULL,
  failed_at     TEXT NOT NULL,
  replay_count  INTEGER NOT NULL DEFAULT 0
);
`;

// 索引 DDL 在 SQLite 和 PostgreSQL 中语法相同，复用同一份
const POSTGRES_CREATE_INDEXES_SQL = CREATE_INDEXES_SQL;

// ==================== 驱动感知工厂函数 ====================

/**
 * 按驱动返回建表 SQL
 * PostgreSQL 模式使用 BIGSERIAL 和 DOUBLE PRECISION
 */
export function getCreateTablesSql(driver: "sqlite" | "postgres"): string {
  return driver === "postgres" ? POSTGRES_CREATE_TABLES_SQL : CREATE_TABLES_SQL;
}

/**
 * 按驱动返回建索引 SQL
 * 两种驱动语法相同，统一返回 CREATE_INDEXES_SQL
 */
export function getCreateIndexesSql(driver: "sqlite" | "postgres"): string {
  return driver === "postgres" ? POSTGRES_CREATE_INDEXES_SQL : CREATE_INDEXES_SQL;
}
