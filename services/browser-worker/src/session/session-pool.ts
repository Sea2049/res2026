import { Browser, BrowserContext } from "playwright";
import { applyStealthScripts } from "../runner/stealth";

export interface SessionInfo {
  id: string;
  context: BrowserContext;
  inUse: boolean;
  createdAt: number;
  requestCount: number;
  lastUsedAt: number;
  needsRotation: boolean;
  sessionKey?: string;
}

const MAX_REQUESTS_PER_SESSION = 500;
const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionPool {
  private sessions: Map<string, SessionInfo> = new Map();
  private sessionKeyMap: Map<string, string> = new Map(); // sessionKey -> sessionId

  constructor(private browser: Browser, private maxSize: number = 3) {}

  private async createSession(sessionKey?: string): Promise<SessionInfo> {
    const context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      timezoneId: "America/New_York",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    await applyStealthScripts(context);

    const id = generateId();
    const info: SessionInfo = {
      id,
      context,
      inUse: false,
      createdAt: Date.now(),
      requestCount: 0,
      lastUsedAt: Date.now(),
      needsRotation: false,
      sessionKey,
    };

    this.sessions.set(id, info);
    if (sessionKey) {
      this.sessionKeyMap.set(sessionKey, id);
    }

    return info;
  }

  private isExpired(info: SessionInfo): boolean {
    const age = Date.now() - info.createdAt;
    return age > SESSION_MAX_AGE_MS || info.requestCount >= MAX_REQUESTS_PER_SESSION;
  }

  async acquire(sessionKey?: string): Promise<SessionInfo> {
    // If sessionKey provided, try to find existing session
    if (sessionKey) {
      const existingId = this.sessionKeyMap.get(sessionKey);
      if (existingId) {
        const existing = this.sessions.get(existingId);
        if (existing && !existing.inUse && !existing.needsRotation && !this.isExpired(existing)) {
          existing.inUse = true;
          existing.lastUsedAt = Date.now();
          return existing;
        }
      }
    }

    // Find a free, non-expired session
    for (const [, info] of this.sessions) {
      if (!info.inUse && !info.needsRotation && !this.isExpired(info)) {
        info.inUse = true;
        info.lastUsedAt = Date.now();
        if (sessionKey) {
          info.sessionKey = sessionKey;
          this.sessionKeyMap.set(sessionKey, info.id);
        }
        return info;
      }
    }

    // Create new session if under limit
    if (this.sessions.size < this.maxSize) {
      const newSession = await this.createSession(sessionKey);
      newSession.inUse = true;
      return newSession;
    }

    // Wait for a free slot (simple busy-wait with backoff)
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200));
      for (const [, info] of this.sessions) {
        if (!info.inUse) {
          info.inUse = true;
          info.lastUsedAt = Date.now();
          return info;
        }
      }
    }

    throw new Error("SessionPool: timed out waiting for a free session");
  }

  release(sessionId: string): void {
    const info = this.sessions.get(sessionId);
    if (!info) return;

    info.inUse = false;
    info.requestCount += 1;
    info.lastUsedAt = Date.now();

    // Mark for rotation if over limits
    if (this.isExpired(info)) {
      info.needsRotation = true;
    }
  }

  async rotate(sessionId: string): Promise<SessionInfo> {
    const old = this.sessions.get(sessionId);
    if (!old) {
      throw new Error(`SessionPool: session ${sessionId} not found`);
    }

    const sessionKey = old.sessionKey;

    // Remove old mappings
    this.sessions.delete(sessionId);
    if (sessionKey) {
      this.sessionKeyMap.delete(sessionKey);
    }

    // Close old context gracefully
    try {
      await old.context.close();
    } catch {
      // ignore
    }

    // Create replacement
    const newSession = await this.createSession(sessionKey);
    return newSession;
  }

  async closeAll(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    for (const [, info] of this.sessions) {
      closePromises.push(
        info.context.close().catch(() => {})
      );
    }
    await Promise.all(closePromises);
    this.sessions.clear();
    this.sessionKeyMap.clear();
  }

  stats(): { total: number; inUse: number; available: number } {
    let inUse = 0;
    for (const [, info] of this.sessions) {
      if (info.inUse) inUse++;
    }
    return {
      total: this.sessions.size,
      inUse,
      available: this.sessions.size - inUse,
    };
  }
}
