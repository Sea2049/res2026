/**
 * Jobs 异步执行器
 * P0：非 test 环境下，crawl 提交后由此模块异步执行抓取 + NLP 分析 + 结果存储
 */

import type { Comment, RedditChild, RedditCommentData } from "@/lib/types";
import { fetchWithBrowserWorkerFallback } from "@/lib/api/fetch-helper";
import { analyzeComments } from "@/lib/nlp";
import { defaultAnalysisConfig } from "@/lib/types";
import { jobStore } from "@/lib/job-store";
import {
  jobResultsStore,
  type FetchStats,
  type StoredAnalysisItem,
} from "@/lib/job-results-store";

/** 默认 subreddit（无 filters 时使用） */
const DEFAULT_SUBREDDITS = ["AskReddit"];
const DEFAULT_COMMENT_LIMIT = 500;

// ==================== Reddit 抓取 ====================

/** 从 Reddit 数组响应中递归提取 t1 评论 */
function extractCommentsFromListing(
  children: RedditChild[],
  subreddit: string,
  out: Comment[]
): void {
  for (const item of children) {
    if (item.kind === "t1" && item.data) {
      const d = item.data as RedditCommentData;
      if (d.body && d.author !== "[deleted]") {
        out.push({
          id: d.id,
          author: d.author,
          body: d.body,
          score: d.score ?? 0,
          created_utc: d.created_utc ?? d.created,
          parent_id: d.parent_id ?? "",
          subreddit: d.subreddit ?? subreddit,
          link_id: d.link_id,
          permalink: d.permalink,
        });
      }
      if (d.replies && typeof d.replies !== "string" && d.replies?.data?.children) {
        extractCommentsFromListing(
          d.replies.data.children as RedditChild[],
          subreddit,
          out
        );
      }
    }
  }
}

/** 抓取单帖评论 */
async function fetchPostComments(
  subreddit: string,
  postId: string,
  limit = DEFAULT_COMMENT_LIMIT
): Promise<Comment[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(postId)}.json?limit=${limit}&sort=confidence`;
  const res = await fetchWithBrowserWorkerFallback(url, {
    useBrowserWorker: true,
  });
  const data = await res.json();

  const comments: Comment[] = [];
  if (Array.isArray(data) && data[1]?.data?.children) {
    extractCommentsFromListing(
      data[1].data.children as RedditChild[],
      subreddit,
      comments
    );
  }
  return comments;
}

/** 按 post_id 直接抓取评论（不依赖 subreddit） */
async function fetchPostCommentsById(
  postId: string,
  limit = DEFAULT_COMMENT_LIMIT
): Promise<Comment[]> {
  const url = `https://www.reddit.com/comments/${encodeURIComponent(postId)}.json?limit=${limit}&sort=confidence`;
  const res = await fetchWithBrowserWorkerFallback(url, {
    useBrowserWorker: true,
  });
  const data = await res.json();

  const comments: Comment[] = [];
  const fallbackSubreddit =
    data?.[0]?.data?.children?.[0]?.data?.subreddit ?? "";

  if (Array.isArray(data) && data[1]?.data?.children) {
    extractCommentsFromListing(
      data[1].data.children as RedditChild[],
      fallbackSubreddit,
      comments
    );
  }
  return comments;
}

/** 抓取 subreddit 热门帖 */
async function fetchSubredditPosts(
  subreddit: string,
  limit: number
): Promise<Array<{ id: string; subreddit: string }>> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}&sort=hot`;
  const res = await fetchWithBrowserWorkerFallback(url, {
    useBrowserWorker: true,
  });
  const data = await res.json();

  const posts: Array<{ id: string; subreddit: string }> = [];
  const children = data?.data?.children ?? [];
  for (const item of children) {
    if (item.kind === "t3" && item.data) {
      posts.push({
        id: item.data.id,
        subreddit: item.data.subreddit ?? subreddit,
      });
    }
  }
  return posts;
}

// ==================== 主执行逻辑 ====================

/**
 * 将 SentimentComment 转为 API 的 AnalysisItem 格式
 */
function toAnalysisItem(
  c: { id: string; body: string; sentiment: string; keywords: string[]; subreddit?: string; link_id?: string; created_utc: number }
): StoredAnalysisItem {
  const postId = c.link_id?.replace("t3_", "") ?? "";
  const insightType = "general"; // 可后续接入 detectInsightType
  return {
    comment_id: c.id,
    subreddit: c.subreddit ?? "",
    post_id: postId,
    created_utc: c.created_utc,
    body: c.body,
    analysis: {
      sentiment: c.sentiment as "positive" | "neutral" | "negative",
      keywords: c.keywords ?? [],
      insight_type: insightType,
      priority: "medium",
    },
  };
}

/**
 * 异步执行任务：抓取评论 → NLP 分析 → 存储结果
 * 不阻塞调用方，错误时更新 job 状态为 failed
 */
export async function runJob(jobId: string): Promise<void> {
  const job = jobStore.get(jobId);
  if (!job) {
    console.warn(`[jobs/runner] Job ${jobId} not found, skip`);
    return;
  }
  if (job.status !== "queued") {
    console.warn(`[jobs/runner] Job ${jobId} status=${job.status}, skip`);
    return;
  }

  const ts = () => new Date().toISOString();
  jobStore.update(jobId, {
    status: "running",
    timing: {
      ...job.timing,
      started_at: ts(),
      updated_at: ts(),
      elapsed_seconds: 0,
    },
  });

  const subreddits = job.filters?.subreddits ?? DEFAULT_SUBREDDITS;
  const postIds = job.filters?.post_ids ?? [];
  const targetComments = Math.min(job.target_comments, job.max_comments);
  const seenIds = new Set<string>();
  const allComments: Comment[] = [];
  let rawFetched = 0;

  try {
    // 优先按指定 post_ids 抓取，确保“选中的帖子”能被优先分析
    for (const postId of postIds) {
      if (allComments.length >= targetComments) break;
      try {
        const comments = await fetchPostCommentsById(postId);
        rawFetched += comments.length;
        for (const c of comments) {
          if (!seenIds.has(c.id) && c.body?.trim()) {
            seenIds.add(c.id);
            allComments.push(c);
            if (allComments.length >= targetComments) break;
          }
        }
        await new Promise((r) => setTimeout(r, 600));
      } catch (e) {
        console.warn(`[jobs/runner] fetch comments failed by post_id ${postId}:`, e);
      }
    }

    // 如果指定 post_ids 还不足目标，再按 subreddit 扩采
    for (const sub of subreddits) {
      if (allComments.length >= targetComments) break;

      const posts = await fetchSubredditPosts(sub, 15);
      for (const post of posts) {
        if (allComments.length >= targetComments) break;
        try {
          const comments = await fetchPostComments(post.subreddit, post.id);
          rawFetched += comments.length;
          for (const c of comments) {
            if (!seenIds.has(c.id) && c.body?.trim()) {
              seenIds.add(c.id);
              allComments.push(c);
              if (allComments.length >= targetComments) break;
            }
          }
          await new Promise((r) => setTimeout(r, 600));
        } catch (e) {
          console.warn(`[jobs/runner] fetch comments failed ${post.subreddit}/${post.id}:`, e);
        }
      }
    }

    const uniqueNormalized = allComments.length;
    const config = {
      ...defaultAnalysisConfig,
      maxComments: Math.min(uniqueNormalized, job.max_comments),
    };

    const analysisResult = analyzeComments(allComments, config);
    const analyzedComments = analysisResult.comments.length;

    const items: StoredAnalysisItem[] = analysisResult.comments.map((c) =>
      toAnalysisItem({
        id: c.id,
        body: c.body,
        sentiment: c.sentiment,
        keywords: c.keywords ?? [],
        subreddit: c.subreddit,
        link_id: c.link_id,
        created_utc: c.created_utc,
      })
    );

    const fetchStats: FetchStats = {
      raw_fetched: rawFetched,
      unique_normalized: uniqueNormalized,
      analyzed_comments: analyzedComments,
      completion_gap: Math.max(0, targetComments - analyzedComments),
    };

    const status = analyzedComments >= targetComments * 0.5 ? "completed" : "partial_success";
    jobStore.update(jobId, {
      status,
      progress: {
        raw_fetched: rawFetched,
        unique_normalized: uniqueNormalized,
        analyzed_comments: analyzedComments,
        completion_gap: fetchStats.completion_gap,
        duplicate_count: rawFetched - uniqueNormalized,
        invalid_count: 0,
      },
      timing: {
        ...job.timing,
        finished_at: ts(),
        updated_at: ts(),
        elapsed_seconds: Math.floor(
          (Date.now() - new Date(job.timing.queued_at).getTime()) / 1000
        ),
      },
    });

    jobResultsStore.set({
      job_id: jobId,
      status,
      progress: {
        raw_fetched: rawFetched,
        unique_normalized: uniqueNormalized,
        analyzed_comments: analyzedComments,
        completion_gap: fetchStats.completion_gap,
        duplicate_count: rawFetched - uniqueNormalized,
        invalid_count: 0,
      },
      analysis_result: analysisResult,
      fetch_stats: fetchStats,
      items,
      completed_at: ts(),
    });
  } catch (err) {
    console.error(`[jobs/runner] Job ${jobId} failed:`, err);
    const msg = err instanceof Error ? err.message : String(err);
    jobStore.update(jobId, {
      status: "failed",
      errors: {
        ...job.errors,
        last_error_code: "UPSTREAM_FORBIDDEN",
      },
      timing: {
        ...job.timing,
        finished_at: ts(),
        updated_at: ts(),
      },
    });
    jobResultsStore.set({
      job_id: jobId,
      status: "failed",
      progress: job.progress,
      analysis_result: null,
      fetch_stats: {
        raw_fetched: job.progress.raw_fetched,
        unique_normalized: job.progress.unique_normalized,
        analyzed_comments: job.progress.analyzed_comments,
        completion_gap: job.progress.completion_gap,
      },
      items: [],
      error_message: msg,
      completed_at: ts(),
    });
  }
}
