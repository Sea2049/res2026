import { JobMetrics } from "./metrics-collector";

export interface SLOStatus {
  passing: boolean;
  violations: string[];
  metrics: JobMetrics;
}

export function checkSLO(metrics: JobMetrics): SLOStatus {
  const violations: string[] = [];

  if (metrics.job_success_rate < 0.95) {
    violations.push(
      `[P0] job_success_rate ${(metrics.job_success_rate * 100).toFixed(1)}% < 95%`
    );
  }

  if (metrics.challenge_detected_rate > 0.08) {
    violations.push(
      `[P0] challenge_detected_rate ${(metrics.challenge_detected_rate * 100).toFixed(1)}% > 8%`
    );
  }

  if (metrics.analysis_latency_p95_ms > 900_000) {
    violations.push(
      `[P0] analysis_latency_p95_ms ${metrics.analysis_latency_p95_ms}ms > 900000ms (15min)`
    );
  }

  return {
    passing: violations.length === 0,
    violations,
    metrics,
  };
}
