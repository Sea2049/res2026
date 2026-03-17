import express, { Request, Response, NextFunction } from "express";
import { spawn, ChildProcess } from "child_process";
import { getDb, closeDb } from "./storage/db";
import { launchBrowser, closeBrowser } from "./runner/launch";
import { SessionPool } from "./session/session-pool";
import { ProxyPool, ProxyConfig } from "./proxy/proxy-pool";
import { RedditFetcher } from "./runner/reddit-fetcher";
import { Browser } from "playwright";

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
const WORKER_TOKEN = process.env["WORKER_TOKEN"] ?? "";
const USE_XVFB = process.env["USE_XVFB"] === "true";
const MAX_CONCURRENT = parseInt(process.env["MAX_CONCURRENT"] ?? "3", 10);
const SESSION_POOL_SIZE = parseInt(process.env["SESSION_POOL_SIZE"] ?? "3", 10);
const XVFB_DISPLAY = process.env["DISPLAY"] ?? ":99";

let browser: Browser | null = null;
let sessionPool: SessionPool | null = null;
let proxyPool: ProxyPool | null = null;
let fetcher: RedditFetcher | null = null;
let xvfbProcess: ChildProcess | null = null;

// ──────────────────────────────────────────────
// Xvfb startup (Linux only)
// ──────────────────────────────────────────────
async function startXvfb(): Promise<void> {
  if (process.platform === "win32") {
    console.log("[server] Windows platform detected, skipping Xvfb");
    return;
  }

  return new Promise((resolve, reject) => {
    console.log(`[server] Starting Xvfb on display ${XVFB_DISPLAY}`);
    xvfbProcess = spawn("Xvfb", [XVFB_DISPLAY, "-screen", "0", "1920x1080x24"], {
      stdio: "ignore",
      detached: false,
    });

    xvfbProcess.on("error", (err) => {
      console.warn("[server] Xvfb start error:", err.message);
      // Non-fatal: continue without Xvfb
      resolve();
    });

    // Give Xvfb 1 second to initialize
    setTimeout(resolve, 1000);
  });
}

// ──────────────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!WORKER_TOKEN) {
    // No token configured = open (dev mode)
    return next();
  }
  const authHeader = req.headers["authorization"] ?? "";
  if (authHeader !== `Bearer ${WORKER_TOKEN}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ──────────────────────────────────────────────
// Routes
// ──────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    browser: browser?.isConnected() ?? false,
    sessions: sessionPool?.stats() ?? null,
    proxies: proxyPool?.stats() ?? null,
  });
});

// Metrics
app.get("/metrics", requireAuth, (_req, res) => {
  res.json({
    uptime_seconds: process.uptime(),
    memory: process.memoryUsage(),
    sessions: sessionPool?.stats() ?? null,
    proxies: proxyPool?.stats() ?? null,
    available_slots: fetcher?.availableSlots() ?? 0,
    timestamp: new Date().toISOString(),
  });
});

// Internal fetch endpoint
app.post("/internal/fetch", requireAuth, async (req: Request, res: Response) => {
  if (!fetcher) {
    res.status(503).json({ ok: false, error_code: "NOT_READY", error_message: "Worker not initialized" });
    return;
  }

  const { url, options } = req.body as { url?: string; options?: Record<string, unknown> };
  if (!url || typeof url !== "string") {
    res.status(400).json({ ok: false, error_code: "BAD_REQUEST", error_message: "url is required" });
    return;
  }

  try {
    const result = await fetcher.fetch(url, options as Parameters<typeof fetcher.fetch>[1]);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      ok: false,
      url,
      error_code: "INTERNAL_ERROR",
      error_message: err instanceof Error ? err.message : String(err),
    });
  }
});

// ──────────────────────────────────────────────
// Startup
// ──────────────────────────────────────────────
async function start(): Promise<void> {
  // 1. Initialize DB
  console.log("[server] Initializing database...");
  try {
    getDb();
    console.log("[server] Database ready");
  } catch (err) {
    console.error("[server] Database init failed:", err);
    process.exit(1);
  }

  // 2. Start Xvfb if requested
  if (USE_XVFB) {
    await startXvfb();
  }

  // 3. Launch browser
  const headless = !(USE_XVFB && process.platform !== "win32");
  const display = USE_XVFB && process.platform !== "win32" ? XVFB_DISPLAY : undefined;

  console.log(`[server] Launching browser (headless=${headless})...`);
  try {
    browser = await launchBrowser({ headless, display });
    console.log("[server] Browser launched");
  } catch (err) {
    console.error("[server] Browser launch failed:", err);
    process.exit(1);
  }

  // 5b. Initialize ProxyPool first so SessionPool can use it for context proxy
  const rawProxiesEarly = process.env["PROXIES"];
  let proxiesEarly: ProxyConfig[] = [];
  if (rawProxiesEarly) {
    try {
      proxiesEarly = JSON.parse(rawProxiesEarly) as ProxyConfig[];
    } catch {
      console.warn("[server] Failed to parse PROXIES env var, running without proxies");
    }
  }
  proxyPool = new ProxyPool(proxiesEarly);

  // 4. Initialize SessionPool (pass proxyPool so contexts use rotating proxies)
  sessionPool = new SessionPool(browser, SESSION_POOL_SIZE, proxyPool);

  // 5. Initialize ProxyPool from env (already done above for SessionPool)
  const rawProxies = process.env["PROXIES"];
  let proxies: ProxyConfig[] = [];
  if (rawProxies) {
    try {
      proxies = JSON.parse(rawProxies) as ProxyConfig[];
    } catch {
      // already warned above
    }
  }
  // reuse if already initialized, otherwise create fresh
  if (!proxyPool) {
    proxyPool = new ProxyPool(proxies);
  }

  // 6. Initialize RedditFetcher
  fetcher = new RedditFetcher(sessionPool, proxyPool, MAX_CONCURRENT);

  // 7. Start Express server
  app.listen(PORT, () => {
    console.log(`[server] Browser Worker listening on port ${PORT}`);
  });
}

// ──────────────────────────────────────────────
// Graceful shutdown
// ──────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`[server] Received ${signal}, shutting down...`);

  try {
    if (fetcher) await fetcher.shutdown();
  } catch (err) {
    console.error("[server] Error shutting down fetcher:", err);
  }

  try {
    if (browser) await closeBrowser(browser);
  } catch (err) {
    console.error("[server] Error closing browser:", err);
  }

  try {
    if (xvfbProcess) xvfbProcess.kill("SIGTERM");
  } catch {
    // ignore
  }

  closeDb();
  console.log("[server] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});

export { app };
