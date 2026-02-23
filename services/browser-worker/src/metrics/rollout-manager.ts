import { createHash } from "crypto";
import { JobMetrics } from "./metrics-collector";

export type RolloutStage = "internal" | "canary_10" | "canary_30" | "canary_60" | "full";

export interface RolloutConfig {
  stage: RolloutStage;
  browser_worker_enabled_pct: number;
  auto_rollback_on: {
    job_success_rate_below: number;
    analysis_latency_p95_above_ms: number;
  };
}

const STAGE_ORDER: RolloutStage[] = [
  "internal",
  "canary_10",
  "canary_30",
  "canary_60",
  "full",
];

const STAGE_PCT: Record<RolloutStage, number> = {
  internal: 0,
  canary_10: 10,
  canary_30: 30,
  canary_60: 60,
  full: 100,
};

const DEFAULT_AUTO_ROLLBACK = {
  job_success_rate_below: 0.9,
  analysis_latency_p95_above_ms: 900_000,
};

export class RolloutManager {
  private config: RolloutConfig;

  constructor(initialStage: RolloutStage = "internal") {
    this.config = {
      stage: initialStage,
      browser_worker_enabled_pct: STAGE_PCT[initialStage],
      auto_rollback_on: { ...DEFAULT_AUTO_ROLLBACK },
    };
  }

  shouldUseBrowserWorker(requestId: string): boolean {
    const pct = this.config.browser_worker_enabled_pct;
    if (pct <= 0) return false;
    if (pct >= 100) return true;

    const hash = createHash("sha256").update(requestId).digest("hex");
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    return bucket < pct;
  }

  advance(): RolloutStage {
    const currentIdx = STAGE_ORDER.indexOf(this.config.stage);
    const nextIdx = Math.min(currentIdx + 1, STAGE_ORDER.length - 1);
    const nextStage = STAGE_ORDER[nextIdx];
    this.config.stage = nextStage;
    this.config.browser_worker_enabled_pct = STAGE_PCT[nextStage];
    return nextStage;
  }

  checkAutoRollback(metrics: JobMetrics): boolean {
    const { job_success_rate_below, analysis_latency_p95_above_ms } =
      this.config.auto_rollback_on;

    const shouldRollback =
      metrics.job_success_rate < job_success_rate_below ||
      metrics.analysis_latency_p95_ms > analysis_latency_p95_above_ms;

    if (shouldRollback) {
      this.rollback();
    }
    return shouldRollback;
  }

  rollback(): void {
    this.config.stage = "internal";
    this.config.browser_worker_enabled_pct = STAGE_PCT["internal"];
  }

  getStage(): RolloutStage {
    return this.config.stage;
  }

  getConfig(): RolloutConfig {
    return { ...this.config, auto_rollback_on: { ...this.config.auto_rollback_on } };
  }
}

export const rolloutManager = new RolloutManager();
