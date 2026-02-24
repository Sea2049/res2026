/**
 * Jobs 异步执行器
 * P0：非 test 环境下，crawl 提交后由此模块异步执行抓取 + NLP 分析 + 结果存储
 */

import type { Comment, RedditChild, RedditCommentData, RedditMoreData } from "@/lib/types";
import { fetchWithBrowserWorkerFallback } from "@/lib/api/fetch-helper";
import { analyzeComments } from "@/lib/nlp";
import { defaultAnalysisConfig } from "@/lib/types";
import { jobStore } from "@/lib/job-store";
import {
  jobResultsStore,
  type FetchStats,
  type StoredAnalysisItem,
} from "@/lib/job-results-store";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/** 默认 subreddit（无 filters 时使用） */
const DEFAULT_SUBREDDITS = ["AskReddit"];
const DEFAULT_COMMENT_LIMIT = 100;

const REDDIT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MORECHILDREN_CHUNK_SIZE = 100;
const MORECHILDREN_MAX_ROUNDS_PER_POST = 30;
const MORECHILDREN_MAX_RETRIES = 4;
const MORECHILDREN_BASE_DELAY_MS = 2000;
const MORECHILDREN_MAX_DELAY_MS = 30000;

// ==================== Reddit 抓取 ====================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 从 Reddit 数组响应中递归提取 t1 评论，并收集 kind:"more" 的 children ids。
 * morechildren 的 children 为不带 t1_ 前缀的 comment id。
 */
function extractCommentsAndMore(
  children: RedditChild[],
  subreddit: string,
  outComments: Comment[],
  outMoreChildrenIds: string[]
): void {
  for (const item of children) {
    if (item.kind === "t1" && item.data) {
      const d = item.data as RedditCommentData;
      if (d.body && d.author !== "[deleted]") {
        outComments.push({
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
      if (
        d.replies &&
        typeof d.replies !== "string" &&
        d.replies?.data?.children
      ) {
        extractCommentsAndMore(
          d.replies.data.children as RedditChild[],
          subreddit,
          outComments,
          outMoreChildrenIds
        );
      }
      continue;
    }

    if (item.kind === "more" && item.data) {
      const d = item.data as RedditMoreData;
      if (Array.isArray(d.children) && d.children.length > 0) {
        for (const id of d.children) {
          if (typeof id === "string" && id) outMoreChildrenIds.push(id);
        }
      }
    }
  }
}

function getProxyDispatcher(): ProxyAgent | undefined {
  const proxyUrl = process.env.HTTP_PROXY || "";
  if (!proxyUrl) return undefined;
  try {
    return new ProxyAgent(proxyUrl);
  } catch {
    return undefined;
  }
}

async function fetchMoreChildrenThings(
  linkId: string,
  childrenIds: string[],
  sort: string
): Promise<RedditChild[]> {
  const dispatcher = getProxyDispatcher();
  const form = new URLSearchParams();
  form.set("link_id", linkId);
  form.set("children", childrenIds.join(","));
  form.set("api_type", "json");
  form.set("sort", sort);
  form.set("depth", "0");

  const res = await undiciFetch("https://www.reddit.com/api/morechildren.json", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": REDDIT_UA,
    },
    body: form.toString(),
    dispatcher,
  });

  if (res.status === 429) {
    const err = new Error("Reddit rate limited (429)") as Error & { status?: number };
    err.status = 429;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`morechildren HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  // undici Response supports json()
  const json = (await res.json()) as any;
  const things = json?.json?.data?.things;
  return Array.isArray(things) ? (things as RedditChild[]) : [];
}

async function fetchMoreChildrenThingsWithRetry(
  linkId: string,
  childrenIds: string[],
  sort: string
): Promise<RedditChild[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MORECHILDREN_MAX_RETRIES; attempt++) {
    try {
      return await fetchMoreChildrenThings(linkId, childrenIds, sort);
    } catch (e) {
      lastError = e;
      const status = (e as any)?.status;
      if (status === 429 && attempt < MORECHILDREN_MAX_RETRIES) {
        const delay = Math.min(
          MORECHILDREN_BASE_DELAY_MS * Math.pow(2, attempt),
          MORECHILDREN_MAX_DELAY_MS
        );
        await sleep(delay);
        continue;
      }
      break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** 抓取单帖评论 */
async function fetchPostComments(
  subreddit: string,
  postId: string,
  limit = DEFAULT_COMMENT_LIMIT
): Promise<{ comments: Comment[]; more_children_ids: string[]; link_id: string; subreddit: string }> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(postId)}.json?limit=${limit}&sort=confidence`;
  const res = await fetchWithBrowserWorkerFallback(url, {
    useBrowserWorker: true,
  });
  const data = await res.json();

  const comments: Comment[] = [];
  const moreChildrenIds: string[] = [];
  if (Array.isArray(data) && data[1]?.data?.children) {
    extractCommentsAndMore(
      data[1].data.children as RedditChild[],
      subreddit,
      comments,
      moreChildrenIds
    );
  }
  return { comments, more_children_ids: moreChildrenIds, link_id: `t3_${postId}`, subreddit };
}

/** 按 post_id 直接抓取评论（不依赖 subreddit） */
async function fetchPostCommentsById(
  postId: string,
  limit = DEFAULT_COMMENT_LIMIT
): Promise<{ comments: Comment[]; more_children_ids: string[]; link_id: string; subreddit: string }> {
  const url = `https://www.reddit.com/comments/${encodeURIComponent(postId)}.json?limit=${limit}&sort=confidence`;
  const res = await fetchWithBrowserWorkerFallback(url, {
    useBrowserWorker: true,
  });
  const data = await res.json();

  const comments: Comment[] = [];
  const moreChildrenIds: string[] = [];
  const fallbackSubreddit =
    data?.[0]?.data?.children?.[0]?.data?.subreddit ?? "";

  if (Array.isArray(data) && data[1]?.data?.children) {
    extractCommentsAndMore(
      data[1].data.children as RedditChild[],
      fallbackSubreddit,
      comments,
      moreChildrenIds
    );
  }
  return {
    comments,
    more_children_ids: moreChildrenIds,
    link_id: `t3_${postId}`,
    subreddit: fallbackSubreddit,
  };
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
        const fetched = await fetchPostCommentsById(postId);
        rawFetched += fetched.comments.length;
        for (const c of fetched.comments) {
          if (!seenIds.has(c.id) && c.body?.trim()) {
            seenIds.add(c.id);
            allComments.push(c);
            if (allComments.length >= targetComments) break;
          }
        }

        // 尝试展开折叠评论（kind:"more"）
        if (
          allComments.length < targetComments &&
          Array.isArray(fetched.more_children_ids) &&
          fetched.more_children_ids.length > 0
        ) {
          const pending: string[] = [...fetched.more_children_ids];
          const pendingSet = new Set(pending);
          let rounds = 0;

          while (
            pending.length > 0 &&
            allComments.length < targetComments &&
            rounds < MORECHILDREN_MAX_ROUNDS_PER_POST
          ) {
            rounds++;
            const chunk = pending.splice(0, MORECHILDREN_CHUNK_SIZE);
            for (const id of chunk) pendingSet.delete(id);

            try {
              const things = await fetchMoreChildrenThingsWithRetry(
                fetched.link_id,
                chunk,
                "confidence"
              );
              const moreComments: Comment[] = [];
              const moreIds: string[] = [];
              extractCommentsAndMore(
                things as RedditChild[],
                fetched.subreddit,
                moreComments,
                moreIds
              );

              rawFetched += moreComments.length;
              for (const c of moreComments) {
                if (!seenIds.has(c.id) && c.body?.trim()) {
                  seenIds.add(c.id);
                  allComments.push(c);
                  if (allComments.length >= targetComments) break;
                }
              }

              for (const id of moreIds) {
                if (!pendingSet.has(id)) {
                  pendingSet.add(id);
                  pending.push(id);
                }
              }
            } catch (e) {
              console.warn(
                `[jobs/runner] morechildren failed for post ${postId}, degrade to base listing:`,
                e
              );
              break;
            }

            await sleep(600);
          }
        }

        await sleep(600);
      } catch (e) {
        console.warn(`[jobs/runner] fetch comments failed by post_id ${postId}:`, e);
      }
    }

    // 无 post_ids 时才按 subreddit 抓取（避免引入非选中帖子）
    if (postIds.length === 0) {
      for (const sub of subreddits) {
        if (allComments.length >= targetComments) break;

        const posts = await fetchSubredditPosts(sub, 15);
        for (const post of posts) {
          if (allComments.length >= targetComments) break;
          try {
            const fetched = await fetchPostComments(post.subreddit, post.id);
            rawFetched += fetched.comments.length;
            for (const c of fetched.comments) {
              if (!seenIds.has(c.id) && c.body?.trim()) {
                seenIds.add(c.id);
                allComments.push(c);
                if (allComments.length >= targetComments) break;
              }
            }

            if (
              allComments.length < targetComments &&
              Array.isArray(fetched.more_children_ids) &&
              fetched.more_children_ids.length > 0
            ) {
              const pending: string[] = [...fetched.more_children_ids];
              const pendingSet = new Set(pending);
              let rounds = 0;

              while (
                pending.length > 0 &&
                allComments.length < targetComments &&
                rounds < MORECHILDREN_MAX_ROUNDS_PER_POST
              ) {
                rounds++;
                const chunk = pending.splice(0, MORECHILDREN_CHUNK_SIZE);
                for (const id of chunk) pendingSet.delete(id);

                try {
                  const things = await fetchMoreChildrenThingsWithRetry(
                    fetched.link_id,
                    chunk,
                    "confidence"
                  );
                  const moreComments: Comment[] = [];
                  const moreIds: string[] = [];
                  extractCommentsAndMore(
                    things as RedditChild[],
                    fetched.subreddit,
                    moreComments,
                    moreIds
                  );

                  rawFetched += moreComments.length;
                  for (const c of moreComments) {
                    if (!seenIds.has(c.id) && c.body?.trim()) {
                      seenIds.add(c.id);
                      allComments.push(c);
                      if (allComments.length >= targetComments) break;
                    }
                  }

                  for (const id of moreIds) {
                    if (!pendingSet.has(id)) {
                      pendingSet.add(id);
                      pending.push(id);
                    }
                  }
                } catch (e) {
                  console.warn(
                    `[jobs/runner] morechildren failed for post ${post.subreddit}/${post.id}, degrade to base listing:`,
                    e
                  );
                  break;
                }

                await sleep(600);
              }
            }

            await sleep(600);
          } catch (e) {
            console.warn(`[jobs/runner] fetch comments failed ${post.subreddit}/${post.id}:`, e);
          }
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
