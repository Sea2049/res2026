import fs from "fs";
import path from "path";

const DEFAULT_STORE_DIR = "./context-states";
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Persists Playwright storageState (cookies + localStorage) between
 * session rotations so each new context can inherit anonymous Reddit
 * cookies and Cloudflare Clearance tokens, reducing challenge frequency.
 */
export class ContextStore {
  private readonly storeDir: string;

  constructor(storeDir?: string) {
    this.storeDir = storeDir ?? process.env["CONTEXT_STORE_DIR"] ?? DEFAULT_STORE_DIR;
    fs.mkdirSync(this.storeDir, { recursive: true });
  }

  /** Derive a safe filesystem path for the given sessionKey. */
  pathFor(sessionKey: string): string {
    const safe = sessionKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.storeDir, `${safe}.json`);
  }

  /** Persist storageState to disk. */
  async save(sessionKey: string, state: object): Promise<void> {
    const filePath = this.pathFor(sessionKey);
    fs.writeFileSync(filePath, JSON.stringify(state));
  }

  /**
   * Returns the file path if a valid state file exists for sessionKey,
   * otherwise undefined.
   */
  load(sessionKey: string): string | undefined {
    const p = this.pathFor(sessionKey);
    return fs.existsSync(p) ? p : undefined;
  }

  /** Delete the persisted state for sessionKey (e.g. after corruption). */
  delete(sessionKey: string): void {
    const p = this.pathFor(sessionKey);
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore – file may not exist
    }
  }

  /**
   * Remove state files older than maxAgeMs (default 24 h).
   * Call periodically (e.g. on startup) to prevent unbounded disk growth.
   */
  clean(maxAgeMs: number = DEFAULT_MAX_AGE_MS): void {
    try {
      const now = Date.now();
      const entries = fs.readdirSync(this.storeDir);
      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue;
        const filePath = path.join(this.storeDir, entry);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // non-fatal
    }
  }
}
