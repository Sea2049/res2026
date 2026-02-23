import { WorkerPool, FetchResult, FetchOptions, RawComment } from "../orchestrator/worker-pool";
import { SessionPool, SessionInfo } from "../session/session-pool";
import { ProxyPool } from "../proxy/proxy-pool";
import { detectChallenge } from "../detection/challenge-detector";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_LIMIT = 100;

interface RedditApiChild {
  kind: string;
  data: RedditCommentData;
}

interface RedditCommentData {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  parent_id: string;
  link_id: string;
  subreddit: string;
  permalink: string;
  depth?: number;
  replies?: { data?: { children?: RedditApiChild[] } } | string;
}

export class RedditFetcher implements WorkerPool {
  private activeSlots: number = 0;

  constructor(
    private sessionPool: SessionPool,
    private proxyPool: ProxyPool,
    private maxConcurrent: number = 3
  ) {}

  async fetch(url: string, options?: FetchOptions): Promise<FetchResult> {
    const start = Date.now();

    if (options?.forceBrowser) {
      return this.fetchWithBrowser(url, options, start);
    }

    // Try HTTP first
    const httpResult = await this.fetchHttp(url, options);
    if (httpResult.ok && !httpResult.challenge_detected) {
      return httpResult;
    }

    if (options?.forceHttp) {
      return httpResult;
    }

    // Browser fallback
    return this.fetchWithBrowser(url, options, start);
  }

  private async fetchWithBrowser(
    url: string,
    options: FetchOptions | undefined,
    start: number
  ): Promise<FetchResult> {
    if (this.activeSlots >= this.maxConcurrent) {
      // Wait for slot
      const deadline = Date.now() + (options?.timeout ?? DEFAULT_TIMEOUT);
      while (this.activeSlots >= this.maxConcurrent && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (this.activeSlots >= this.maxConcurrent) {
        return {
          ok: false,
          url,
          error_code: "NO_SLOTS",
          error_message: "No available browser slots",
          duration_ms: Date.now() - start,
        };
      }
    }

    this.activeSlots++;
    let sessionInfo: SessionInfo | null = null;

    try {
      sessionInfo = await this.sessionPool.acquire(options?.sessionKey);
      const result = await this.fetchBrowser(url, sessionInfo, options);
      return { ...result, duration_ms: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        url,
        error_code: "BROWSER_ERROR",
        error_message: err instanceof Error ? err.message : String(err),
        fetched_via: "browser",
        duration_ms: Date.now() - start,
      };
    } finally {
      if (sessionInfo) {
        this.sessionPool.release(sessionInfo.id);
        // Rotate if needed
        if (sessionInfo.needsRotation) {
          this.sessionPool.rotate(sessionInfo.id).catch(() => {});
        }
      }
      this.activeSlots--;
    }
  }

  private async fetchHttp(url: string, options?: FetchOptions): Promise<FetchResult> {
    const start = Date.now();
    const jsonUrl = this.toJsonUrl(url, options?.limit ?? DEFAULT_LIMIT);
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(jsonUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timer);

      const text = await response.text();
      const challenge = detectChallenge(text, response.status);

      if (challenge.detected) {
        return {
          ok: false,
          url,
          status_code: response.status,
          challenge_detected: true,
          challenge_type: challenge.type,
          fetched_via: "http",
          duration_ms: Date.now() - start,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          url,
          status_code: response.status,
          error_code: "HTTP_ERROR",
          error_message: `HTTP ${response.status}`,
          fetched_via: "http",
          duration_ms: Date.now() - start,
        };
      }

      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        return {
          ok: false,
          url,
          status_code: response.status,
          error_code: "PARSE_ERROR",
          error_message: "Failed to parse JSON response",
          fetched_via: "http",
          duration_ms: Date.now() - start,
        };
      }

      const comments = this.parseRedditComments(json);
      return {
        ok: true,
        url,
        status_code: response.status,
        comments,
        fetched_via: "http",
        duration_ms: Date.now() - start,
      };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          url,
          error_code: "TIMEOUT",
          error_message: "HTTP fetch timed out",
          fetched_via: "http",
          duration_ms: Date.now() - start,
        };
      }
      return {
        ok: false,
        url,
        error_code: "NETWORK_ERROR",
        error_message: err instanceof Error ? err.message : String(err),
        fetched_via: "http",
        duration_ms: Date.now() - start,
      };
    }
  }

  private async fetchBrowser(
    url: string,
    sessionInfo: SessionInfo,
    options?: FetchOptions
  ): Promise<FetchResult> {
    const start = Date.now();
    const jsonUrl = this.toJsonUrl(url, options?.limit ?? DEFAULT_LIMIT);
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

    const page = await sessionInfo.context.newPage();

    try {
      const response = await page.goto(jsonUrl, {
        waitUntil: "domcontentloaded",
        timeout,
      });

      if (!response) {
        return {
          ok: false,
          url,
          error_code: "NO_RESPONSE",
          error_message: "Browser navigation returned no response",
          fetched_via: "browser",
        };
      }

      const statusCode = response.status();

      // Wait for content to render
      await page.waitForSelector("body", { timeout: 10_000 });

      const bodyText = await page.evaluate(() => document.body.innerText);
      const challenge = detectChallenge(bodyText, statusCode);

      if (challenge.detected) {
        return {
          ok: false,
          url,
          status_code: statusCode,
          challenge_detected: true,
          challenge_type: challenge.type,
          fetched_via: "browser",
        };
      }

      let json: unknown;
      try {
        json = JSON.parse(bodyText);
      } catch {
        // Try extracting pre-rendered JSON from page
        const preText = await page.evaluate(() => {
          const pre = document.querySelector("pre");
          return pre ? pre.textContent : null;
        });
        if (preText) {
          try {
            json = JSON.parse(preText);
          } catch {
            return {
              ok: false,
              url,
              status_code: statusCode,
              error_code: "PARSE_ERROR",
              error_message: "Failed to parse browser JSON response",
              fetched_via: "browser",
            };
          }
        } else {
          return {
            ok: false,
            url,
            status_code: statusCode,
            error_code: "PARSE_ERROR",
            error_message: "No parseable JSON found in browser response",
            fetched_via: "browser",
          };
        }
      }

      const comments = this.parseRedditComments(json);
      return {
        ok: true,
        url,
        status_code: statusCode,
        comments,
        fetched_via: "browser",
        duration_ms: Date.now() - start,
      };
    } finally {
      await page.close().catch(() => {});
    }
  }

  private toJsonUrl(url: string, limit: number): string {
    // Ensure the URL ends with .json and has proper query params
    let jsonUrl = url.replace(/\/?$/, ".json");
    if (!jsonUrl.includes(".json")) {
      jsonUrl += ".json";
    }
    const separator = jsonUrl.includes("?") ? "&" : "?";
    return `${jsonUrl}${separator}limit=${limit}&raw_json=1`;
  }

  private parseRedditComments(jsonBody: unknown): RawComment[] {
    const comments: RawComment[] = [];

    try {
      // Reddit returns an array: [post_listing, comments_listing]
      const body = jsonBody as unknown[];
      const listings = Array.isArray(body) ? body : [body];

      for (const listing of listings) {
        const l = listing as { data?: { children?: RedditApiChild[] } };
        if (l?.data?.children) {
          this.extractComments(l.data.children, comments);
        }
      }
    } catch {
      // Return what we have
    }

    return comments;
  }

  private extractComments(children: RedditApiChild[], out: RawComment[], depth: number = 0): void {
    for (const child of children) {
      if (child.kind !== "t1") continue; // t1 = comment

      const d = child.data;
      const comment: RawComment = {
        id: d.id,
        author: d.author ?? "[deleted]",
        body: d.body ?? "",
        score: d.score ?? 0,
        created_utc: d.created_utc ?? 0,
        parent_id: d.parent_id ?? "",
        link_id: d.link_id ?? "",
        subreddit: d.subreddit ?? "",
        permalink: d.permalink ?? "",
        depth,
        replies: [],
      };

      // Recurse into replies
      if (d.replies && typeof d.replies === "object") {
        const repliesData = (d.replies as { data?: { children?: RedditApiChild[] } }).data;
        if (repliesData?.children) {
          this.extractComments(repliesData.children, comment.replies!, depth + 1);
        }
      }

      out.push(comment);
    }
  }

  availableSlots(): number {
    return Math.max(0, this.maxConcurrent - this.activeSlots);
  }

  async shutdown(): Promise<void> {
    await this.sessionPool.closeAll();
  }
}
