// Runner
export { launchBrowser, closeBrowser, DEFAULT_ARGS } from "./runner/launch";
export type { LaunchOptions } from "./runner/launch";

export { applyStealthScripts } from "./runner/stealth";

export { RedditFetcher } from "./runner/reddit-fetcher";

// Session
export { SessionPool } from "./session/session-pool";
export type { SessionInfo } from "./session/session-pool";

// Proxy
export { ProxyPool } from "./proxy/proxy-pool";
export type { ProxyConfig } from "./proxy/proxy-pool";

// Detection
export { detectChallenge, detectChallengeFromResponse } from "./detection/challenge-detector";
export type { ChallengeType, ChallengeResult } from "./detection/challenge-detector";

// Orchestrator interfaces
export type { WorkerPool, FetchResult, FetchOptions, RawComment } from "./orchestrator/worker-pool";

// Storage
export { getDb, closeDb } from "./storage/db";
