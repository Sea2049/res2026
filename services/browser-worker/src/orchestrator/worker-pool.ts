export interface RawComment {
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
  replies?: RawComment[];
}

export interface FetchOptions {
  timeout?: number;         // ms, default 30000
  sessionKey?: string;      // pin request to a specific session
  forceHttp?: boolean;      // skip browser fallback
  forceBrowser?: boolean;   // skip HTTP, go straight to browser
  limit?: number;           // comment limit, default 100
  signal?: AbortSignal;     // cancellation signal; when aborted, fetch returns immediately
}

export interface FetchResult {
  ok: boolean;
  url: string;
  status_code?: number;
  comments?: RawComment[];
  challenge_detected?: boolean;
  challenge_type?: string;
  error_code?: string;
  error_message?: string;
  fetched_via?: "http" | "browser";
  duration_ms?: number;
}

export interface WorkerPool {
  fetch(url: string, options?: FetchOptions): Promise<FetchResult>;
  availableSlots(): number;
  shutdown(): Promise<void>;
}
