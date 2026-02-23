export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
  country?: string;
}

interface ProxyState {
  config: ProxyConfig;
  failedAt: number | null;
}

const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export class ProxyPool {
  private proxies: ProxyState[];
  private cursor: number = 0;

  constructor(proxies: ProxyConfig[] = []) {
    this.proxies = proxies.map((config) => ({ config, failedAt: null }));
  }

  next(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;

    const now = Date.now();
    const healthy = this.proxies.filter(
      (p) => p.failedAt === null || now - p.failedAt > FAILURE_COOLDOWN_MS
    );

    if (healthy.length === 0) return null;

    const index = this.cursor % healthy.length;
    this.cursor = (this.cursor + 1) % healthy.length;
    return healthy[index].config;
  }

  markFailed(server: string): void {
    const proxy = this.proxies.find((p) => p.config.server === server);
    if (proxy) {
      proxy.failedAt = Date.now();
    }
  }

  markSuccess(server: string): void {
    const proxy = this.proxies.find((p) => p.config.server === server);
    if (proxy) {
      proxy.failedAt = null;
    }
  }

  stats(): { total: number; healthy: number; failed: number } {
    const now = Date.now();
    const total = this.proxies.length;
    const failed = this.proxies.filter(
      (p) => p.failedAt !== null && now - p.failedAt <= FAILURE_COOLDOWN_MS
    ).length;
    return { total, healthy: total - failed, failed };
  }
}
