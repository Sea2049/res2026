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
 * 使用 corsproxy.io 代理服务绕过 CORS 限制
 */
class RedditApiClient {
  private baseUrl = "https://www.reddit.com";
  private proxyUrl = "https://api.corsproxy.io/?";

  /**
   * 通用 Fetch 方法，支持重试和 AbortSignal
   * 通过 CORS 代理发送请求
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    const proxyUrl = `${this.proxyUrl}${encodeURIComponent(url)}`;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      ...options.headers,
    };
    
    try {
      const response = await fetch(proxyUrl, { ...options, headers });

      if (response.status === 429) {
        if (retries > 0) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
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
        throw error;
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
      const url = `${this.baseUrl}/subreddits/search.json?q=${encodeURIComponent(query)}&limit=20`;
      console.log("正在请求 Subreddits:", url);
      
      const response = await this.fetchWithRetry(url, { signal });
      console.log("响应状态:", response.status);
      
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        console.warn("API 返回空结果");
        return [];
      }
      
      const results = data.data.children.map((item: any) => ({
        id: item.data.id,
        name: item.data.name,
        display_name: item.data.display_name,
        title: item.data.title,
        description: item.data.public_description || '',
        subscriber_count: item.data.subscribers || 0,
        url: item.data.url,
      }));
      
      console.log(`找到 ${results.length} 个 Subreddits`);
      return results;
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
      let url = `${this.baseUrl}/search.json?q=${encodeURIComponent(query)}&sort=${sortBy}&limit=${limit}`;
      
      if (timeRange !== "all") {
        url += `&t=${timeRange}`;
      }
      
      if (subreddit) {
        url += `&restrict_sr=true&sr=${encodeURIComponent(subreddit)}`;
      }

      console.log("正在请求 Posts:", url);

      const response = await this.fetchWithRetry(url, { signal });
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        console.warn("API 返回空结果");
        return [];
      }
      
      const results = data.data.children.map((item: any) => ({
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
      
      console.log(`找到 ${results.length} 个 Posts`);
      return results;
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
      const url = `${this.baseUrl}/r/${subreddit}/comments/${postId}.json?limit=100&sort=confidence`;
      console.log("正在请求 Comments:", url);

      const response = await this.fetchWithRetry(url, { signal });
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
                subreddit: commentData.subreddit || subreddit,
                link_id: commentData.link_id,
                permalink: commentData.permalink,
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

      console.log(`找到 ${comments.length} 条评论`);
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
      const url = `${this.baseUrl}/r/${subreddit}/hot.json?limit=${limit}&sort=hot`;
      console.log("正在请求 Subreddit Posts:", url);

      const response = await this.fetchWithRetry(url, { signal });
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        return [];
      }
      
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
    const CONCURRENCY_LIMIT = 3;
    const chunks = [];
    for (let i = 0; i < posts.length; i += CONCURRENCY_LIMIT) {
      chunks.push(posts.slice(i, i + CONCURRENCY_LIMIT));
    }

    try {
      for (const chunk of chunks) {
        if (signal?.aborted) break;
        
        const promises = chunk.map(async (post) => {
          const comments = await this.getComments(post.id, post.subreddit, signal);
          return comments.slice(0, maxComments);
        });

        const results = await Promise.all(promises);
        for (const comments of results) {
          allComments.push(...comments);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
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
