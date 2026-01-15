import type { Subreddit, Post, Comment } from "../types";

/**
 * 搜索排序方式
 */
export type SearchSortBy = "relevance" | "hot" | "new" | "top";

/**
 * 搜索时间范围
 */
export type SearchTimeRange = "all" | "hour" | "day" | "week" | "month" | "year";

/**
 * Reddit API 客户端
 * 提供与 Reddit API 交互的方法
 */
class RedditApiClient {
  private baseUrl = "https://www.reddit.com";

  /**
   * 通用 Fetch 方法，支持重试和 AbortSignal
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        if (retries > 0) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000; // 默认等待 2 秒
          console.warn(`Rate limited. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.fetchWithRetry(url, options, retries - 1);
        } else {
          throw new Error("API 请求过于频繁 (429)，请稍后再试");
        }
      }

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error; // 直接抛出 AbortError，不进行重试
      }
      throw error;
    }
  }

  /**
   * 搜索 Subreddits
   * @param query 搜索关键词
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Subreddit[]> 搜索结果列表
   */
  async searchSubreddits(query: string, signal?: AbortSignal): Promise<Subreddit[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/subreddit_autocomplete_v2.json?query=${encodeURIComponent(query)}&include_over_18=false`,
        { signal }
      );
      
      const data = await response.json();
      
      return data.children.map((item: any) => ({
        id: item.data.id,
        name: item.data.name,
        display_name: item.data.display_name,
        title: item.data.title,
        description: item.data.public_description,
        subscriber_count: item.data.subscribers,
        url: item.data.url,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("搜索 Subreddits 失败:", error);
      return [];
    }
  }

  /**
   * 搜索 Posts
   * @param query 搜索关键词
   * @param subreddit 可选，指定 Subreddit
   * @param sortBy 排序方式
   * @param timeRange 时间范围
   * @param limit 结果数量限制
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Post[]> 搜索结果列表
   */
  async searchPosts(
    query: string,
    subreddit?: string,
    sortBy: SearchSortBy = "relevance",
    timeRange: SearchTimeRange = "all",
    limit: number = 20,
    signal?: AbortSignal
  ): Promise<Post[]> {
    try {
      let endpoint = `${this.baseUrl}/search.json?q=${encodeURIComponent(query)}&sort=${sortBy}&limit=${limit}`;
      
      if (timeRange !== "all") {
        endpoint += `&t=${timeRange}`;
      }
      
      if (subreddit) {
        endpoint += `&restrict_sr=true&sr=${encodeURIComponent(subreddit)}`;
      }

      const response = await this.fetchWithRetry(endpoint, { signal });
      
      const data = await response.json();
      
      return data.data.children.map((item: any) => ({
        id: item.data.id,
        title: item.data.title,
        selftext: item.data.selftext,
        author: item.data.author,
        subreddit: item.data.subreddit,
        score: item.data.score,
        num_comments: item.data.num_comments,
        created_utc: item.data.created_utc,
        url: item.data.url,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("搜索 Posts 失败:", error);
      return [];
    }
  }

  /**
   * 获取 Post 的评论
   * @param postId Post ID
   * @param subreddit Subreddit 名称
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Comment[]> 评论列表
   */
  async getComments(postId: string, subreddit: string, signal?: AbortSignal): Promise<Comment[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/r/${subreddit}/comments/${postId}.json?limit=100&sort=confidence`,
        { signal }
      );
      
      const data = await response.json();
      const comments: Comment[] = [];

      const extractComments = (listing: any[]) => {
        for (const item of listing) {
          if (item.kind === "t1" && item.data) {
            const commentData = item.data;
            if (commentData.body && commentData.author) {
              comments.push({
                id: commentData.id,
                author: commentData.author,
                body: commentData.body,
                score: commentData.score,
                created_utc: commentData.created_utc,
                parent_id: commentData.parent_id,
              });
            }
            if (commentData.replies && commentData.replies.data) {
              extractComments(commentData.replies.data.children);
            }
          }
        }
      };

      if (Array.isArray(data) && data[1]) {
        extractComments(data[1].data.children);
      }

      return comments;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("获取评论失败:", error);
      return [];
    }
  }

  /**
   * 获取 Subreddit 的热门帖子
   * @param subreddit Subreddit 名称
   * @param limit 返回数量限制
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Post[]> 帖子列表
   */
  async getSubredditPosts(subreddit: string, limit: number = 10, signal?: AbortSignal): Promise<Post[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/r/${subreddit}/hot.json?limit=${limit}&sort=hot`,
        { signal }
      );
      
      const data = await response.json();
      
      return data.data.children.map((item: any) => ({
        id: item.data.id,
        title: item.data.title,
        selftext: item.data.selftext,
        author: item.data.author,
        subreddit: item.data.subreddit,
        score: item.data.score,
        num_comments: item.data.num_comments,
        created_utc: item.data.created_utc,
        url: item.data.url,
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("获取 Subreddit 帖子失败:", error);
      return [];
    }
  }

  /**
   * 获取多个帖子的评论
   * @param posts 帖子数组
   * @param maxComments 每个帖子获取的最大评论数
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Comment[]> 所有评论的合并列表
   */
  async getMultiplePostComments(posts: Post[], maxComments: number = 100, signal?: AbortSignal): Promise<Comment[]> {
    if (!Array.isArray(posts) || posts.length === 0) {
      return [];
    }

    const allComments: Comment[] = [];
    // 并行请求，但限制并发数可能更好，这里简单处理
    const promises = posts.slice(0, 10).map(async (post) => {
      const comments = await this.getComments(post.id, post.subreddit, signal);
      return comments.slice(0, maxComments);
    });
    
    try {
      const results = await Promise.all(promises);
      for (const comments of results) {
        allComments.push(...comments);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("批量获取评论失败:", error);
    }
    
    return allComments;
  }

  /**
   * 获取 Subreddit 热门帖子的评论
   * @param subreddit Subreddit 名称
   * @param postLimit 热门帖子数量限制
   * @param commentLimit 每个帖子的评论数量限制
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Comment[]> 评论列表
   */
  async getSubredditComments(
    subreddit: string,
    postLimit: number = 5,
    commentLimit: number = 50,
    signal?: AbortSignal
  ): Promise<Comment[]> {
    try {
      const posts = await this.getSubredditPosts(subreddit, postLimit, signal);
      if (posts.length === 0) {
        return [];
      }
      const comments = await this.getMultiplePostComments(posts, commentLimit, signal);
      return comments;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("获取 Subreddit 评论失败:", error);
      return [];
    }
  }
}

/**
 * Reddit API 客户端单例
 */
export const redditApi = new RedditApiClient();
