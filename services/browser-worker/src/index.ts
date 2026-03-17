// Runner
export { launchBrowser, closeBrowser, DEFAULT_ARGS } from "./runner/launch";
export type { LaunchOptions } from "./runner/launch";

export { createContextWithFingerprint, generateFingerprint } from "./runner/fingerprint";
export type { GeneratedFingerprint, CreateContextOptions } from "./runner/fingerprint";

export { RedditFetcher } from "./runner/reddit-fetcher";

// Session
export { SessionPool } from "./session/session-pool";
export type { SessionInfo } from "./session/session-pool";
export { ContextStore } from "./session/context-store";

// Proxy
export { ProxyPool } from "./proxy/proxy-pool";
export type { ProxyConfig } from "./proxy/proxy-pool";

// Detection
export { detectChallenge, detectChallengeFromResponse } from "./detection/challenge-detector";
export type { ChallengeType, ChallengeResult } from "./detection/challenge-detector";
export { CaptchaSolver } from "./detection/captcha-solver";

// Orchestrator interfaces
export type { WorkerPool, FetchResult, FetchOptions, RawComment } from "./orchestrator/worker-pool";

// Storage
export { getDb, closeDb } from "./storage/db";
