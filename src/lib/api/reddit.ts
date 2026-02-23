import type { 
  Subreddit, 
  Post, 
  Comment,
  RedditChild,
  RedditSubredditData,
  RedditPostData,
  RedditCommentData,
  RedditListingResponse
} from "../types";
import { getTimeBasedApiConfig } from "../utils";

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
 * 优先使用服务端 API Routes（支持代理），失败时回退到 CORS 代理
 */
class RedditApiClient {
  private baseUrl = "https://www.reddit.com";
  // 服务端 API 地址
  private serverApiUrl = "/api/reddit";
  // 回退用 CORS 代理（从环境变量读取或使用默认值）
  private proxyUrl = process.env.NEXT_PUBLIC_CORS_PROXY_URL || "https://api.codetabs.com/v1/proxy?quest=";

  /**
   * 通用 Fetch 方法，支持重试和 AbortSignal
   * 优先使用服务端 API，失败时回退到 CORS 代理
   */
  private async fetchWithRetry(url: string, options: RequestInit = {}, retries?: number): Promise<Response> {
    const timeConfig = getTimeBasedApiConfig();
    const effectiveRetries = retries ?? timeConfig.maxRetries;
    
    // 优先尝试服务端 API
    const proxyUrl = `${this.proxyUrl}${encodeURIComponent(url)}`;
    const headers = {
      'Accept': 'application/json',
      ...options.headers,
    };
    
    try {
      const response = await fetch(proxyUrl, { ...options, headers });

      if (response.status === 429) {
        if (effectiveRetries > 0) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : timeConfig.baseRetryDelay;
          console.warn(`Rate limited. Retrying in ${waitTime}ms... (${effectiveRetries} attempts remaining)`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.fetchWithRetry(url, options, effectiveRetries - 1);
        } else {
          throw new Error("API 请求过于频繁 (429)，请稍后再试");
        }
      }

      if (!response.ok) {
        if (effectiveRetries > 0 && response.status >= 500) {
          const waitTime = timeConfig.baseRetryDelay / 2;
          console.warn(`Server error ${response.status}. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this.fetchWithRetry(url, options, effectiveRetries - 1);
        }
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
   * 通过服务端 API 获取数据
   */
  private async fetchViaServerApi(endpoint: string, params: Record<string, string>, signal?: AbortSignal): Promise<Response> {
    const searchParams = new URLSearchParams(params);
    const url = `${this.serverApiUrl}/${endpoint}?${searchParams.toString()}`;
    
    const response = await fetch(url, { signal });
    if (!response.ok) {
      // 尝试从响应体提取服务端错误详情
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error || '';
      } catch {
        // 忽略解析失败
      }
      throw new Error(detail || `服务端请求失败 (${response.status})`);
    }
    return response;
  }

  /**
   * 搜索 Subreddits
   * @param query 搜索关键词
   * @param signal AbortSignal 用于取消请求
   * @returns Promise<Subreddit[]> 搜索结果列表
   */
  async searchSubreddits(query: string, signal?: AbortSignal): Promise<Subreddit[]> {
    try {
      console.log("正在搜索 Subreddits:", query);
      
      // 优先使用服务端 API
      const response = await this.fetchViaServerApi('search', {
        q: query,
        type: 'subreddit',
        limit: '20'
      }, signal);
      
      console.log("响应状态:", response.status);
      
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        console.warn("API 返回空结果");
        return [];
      }
      
      const results = data.data.children.map((item: RedditChild) => {
        const subredditData = item.data as RedditSubredditData;
        return {
          id: subredditData.id,
          name: subredditData.name,
          display_name: subredditData.display_name,
          title: subredditData.title,
          description: subredditData.public_description || '',
          subscriber_count: subredditData.subscribers || 0,
          url: subredditData.url,
        };
      });
      
      console.log(`找到 ${results.length} 个 Subreddits`);
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("搜索 Subreddits 失败:", error);
      const msg = error instanceof Error ? error.message : "搜索 Subreddits 失败";
      throw new Error(`搜索社区失败: ${msg}`);
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
      console.log("正在搜索 Posts:", query);

      // 构建服务端 API 参数
      const params: Record<string, string> = {
        q: query,
        type: 'post',
        sort: sortBy,
        limit: limit.toString(),
      };
      
      if (timeRange !== "all") {
        params.t = timeRange;
      }
      
      if (subreddit) {
        params.subreddit = subreddit;
      }

      const response = await this.fetchViaServerApi('search', params, signal);
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        console.warn("API 返回空结果");
        return [];
      }
      
      const results = data.data.children.map((item: RedditChild) => {
        const postData = item.data as RedditPostData;
        return {
          id: postData.id,
          title: postData.title,
          selftext: postData.selftext,
          author: postData.author,
          subreddit: postData.subreddit,
          score: postData.score,
          num_comments: postData.num_comments,
          created_utc: postData.created_utc,
          url: postData.url,
        };
      });
      
      console.log(`找到 ${results.length} 个 Posts`);
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error("搜索 Posts 失败:", error);
      const msg = error instanceof Error ? error.message : "搜索 Posts 失败";
      throw new Error(`搜索帖子失败: ${msg}`);
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
      console.log("正在获取评论:", postId, subreddit);

      // 使用服务端 API 获取评论
      const response = await this.fetchViaServerApi('comments', {
        subreddit,
        postId,
      }, signal);
      const data = await response.json();
      
      const comments: Comment[] = [];

      const extractComments = (listing: RedditChild[]) => {
        for (const item of listing) {
          if (item.kind === "t1" && item.data) {
            const commentData = item.data as RedditCommentData;
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
            if (commentData.replies && typeof commentData.replies !== 'string' && commentData.replies.data) {
              extractComments(commentData.replies.data.children as RedditChild[]);
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
      console.log("正在获取 Subreddit 帖子:", subreddit, limit);

      // 使用服务端 API 获取帖子
      const response = await this.fetchViaServerApi('subreddit', {
        subreddit,
        limit: limit.toString(),
      }, signal);
      const data = await response.json();
      
      if (!data.data || !data.data.children) {
        return [];
      }
      
      return data.data.children.map((item: RedditChild) => {
        const postData = item.data as RedditPostData;
        return {
          id: postData.id,
          title: postData.title,
          selftext: postData.selftext,
          author: postData.author,
          subreddit: postData.subreddit,
          score: postData.score,
          num_comments: postData.num_comments,
          created_utc: postData.created_utc,
          url: postData.url,
        };
      });
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

    const timeConfig = getTimeBasedApiConfig();
    const allComments: Comment[] = [];
    const chunks = [];
    for (let i = 0; i < posts.length; i += timeConfig.concurrencyLimit) {
      chunks.push(posts.slice(i, i + timeConfig.concurrencyLimit));
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
        
        // 根据时段添加请求间隔
        if (timeConfig.requestInterval > 0) {
          await new Promise(resolve => setTimeout(resolve, timeConfig.requestInterval));
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
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
