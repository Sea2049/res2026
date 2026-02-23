/**
 * 任务拆分逻辑
 *
 * 将一个 CrawlJob 拆分为若干 CrawlTaskSplit 子任务：
 * - 每个 subreddit 按配额分配
 * - 每页预估 COMMENTS_PER_PAGE 条评论
 * - task_key 作为幂等键：`${job_id}:${subreddit}:${sort}:${page}`
 */

import type { CrawlJob, JobFilters } from "../../../../src/lib/types";

/** 每个子任务预估采集的评论数 */
export const COMMENTS_PER_TASK = 100;

/** 默认抓取 subreddit */
const DEFAULT_SUBREDDITS = ["all"];

/** 默认排序方式 */
const DEFAULT_SORT = "hot";

export interface CrawlTaskSplit {
  task_id: string;
  job_id: string;
  /** 幂等键：`${job_id}:${subreddit}:${sort}:${page}` */
  task_key: string;
  subreddit?: string;
  sort?: string;
  page: number;
  cursor_after?: string;
  estimated_comments: number;
}

function generateTaskId(): string {
  return (
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : require("crypto").randomUUID()
  );
}

/**
 * 将 CrawlJob 拆分为子任务列表
 *
 * @param job            - 已持久化的 CrawlJob
 * @param filtersOrCount - 可传入 JobFilters（覆盖 job 中可能缺失的 filters），
 *                         或直接传入 commentsPerTask 数字
 * @param commentsPerTask - 每个子任务预估评论数（仅当第二参数为 JobFilters 时生效）
 */
export function splitJob(
  job: CrawlJob,
  filtersOrCount?: JobFilters | number,
  commentsPerTask: number = COMMENTS_PER_TASK
): CrawlTaskSplit[] {
  let filters: JobFilters | undefined;
  let perTask = commentsPerTask;

  if (typeof filtersOrCount === "number") {
    perTask = filtersOrCount;
  } else {
    filters = filtersOrCount;
  }

  const subreddits =
    (filters?.subreddits ?? []).length > 0
      ? filters!.subreddits!
      : DEFAULT_SUBREDDITS;

  const sort = filters?.sort ?? DEFAULT_SORT;
  const targetComments = job.target_comments;

  // 每个 subreddit 分配的配额（向上取整，确保总量不低于 target）
  const quotaPerSubreddit = Math.ceil(targetComments / subreddits.length);

  const tasks: CrawlTaskSplit[] = [];

  for (const subreddit of subreddits) {
    const pagesNeeded = Math.ceil(quotaPerSubreddit / perTask);

    for (let page = 1; page <= pagesNeeded; page++) {
      const task_key = `${job.job_id}:${subreddit}:${sort}:${page}`;
      // 最后一页可能不足 commentsPerTask
      const remaining = quotaPerSubreddit - (page - 1) * perTask;
      const estimated_comments = Math.min(perTask, remaining);

      tasks.push({
        task_id: generateTaskId(),
        job_id: job.job_id,
        task_key,
        subreddit,
        sort,
        page,
        estimated_comments,
      });
    }
  }

  return tasks;
}
