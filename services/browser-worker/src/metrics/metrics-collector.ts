export interface JobMetrics {
  job_submit_rate: number;
  job_success_rate: number;
  task_retry_rate: number;
  dlq_size: number;
  crawl_comments_per_minute: number;
  analysis_latency_p95_ms: number;
  challenge_detected_rate: number;
  proxy_switch_rate: number;
  queue_wait_p95_by_qos: {
    small: number;
    medium: number;
    large: number;
  };
}

interface WindowEntry {
  timestamp: number;
  value: number;
}

const WINDOW_MS = 60_000;

function computeP95(samples: number[]): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

export class MetricsCollector {
  private windowStart: number = Date.now();

  private jobSubmits: number = 0;
  private jobSuccesses: number = 0;
  private jobFailures: number = 0;
  private taskRetries: number = 0;
  private commentsCrawled: number = 0;
  private challengesDetected: number = 0;
  private proxySwitches: number = 0;
  private dlqSize: number = 0;

  private analysisLatencySamples: number[] = [];
  private queueWaitSamples: Record<"small" | "medium" | "large", number[]> = {
    small: [],
    medium: [],
    large: [],
  };

  recordJobSubmit(): void {
    this.jobSubmits++;
  }

  recordJobCompletion(success: boolean): void {
    if (success) {
      this.jobSuccesses++;
    } else {
      this.jobFailures++;
    }
  }

  recordTaskRetry(): void {
    this.taskRetries++;
  }

  recordCommentsCrawled(count: number): void {
    this.commentsCrawled += count;
  }

  recordAnalysisLatency(ms: number): void {
    this.analysisLatencySamples.push(ms);
  }

  recordChallengeDetected(): void {
    this.challengesDetected++;
  }

  recordProxySwitch(): void {
    this.proxySwitches++;
  }

  recordQueueWait(qosClass: "small" | "medium" | "large", waitMs: number): void {
    this.queueWaitSamples[qosClass].push(waitMs);
  }

  recordDLQSize(size: number): void {
    this.dlqSize = size;
  }

  getMetrics(): JobMetrics {
    const elapsedMinutes = Math.max(
      (Date.now() - this.windowStart) / WINDOW_MS,
      1 / 60
    );

    const totalJobs = this.jobSuccesses + this.jobFailures;
    const totalRequests = this.jobSubmits + this.challengesDetected;

    return {
      job_submit_rate: this.jobSubmits / elapsedMinutes,
      job_success_rate: totalJobs > 0 ? this.jobSuccesses / totalJobs : 1,
      task_retry_rate: this.jobSubmits > 0 ? this.taskRetries / this.jobSubmits : 0,
      dlq_size: this.dlqSize,
      crawl_comments_per_minute: this.commentsCrawled / elapsedMinutes,
      analysis_latency_p95_ms: computeP95(this.analysisLatencySamples),
      challenge_detected_rate:
        totalRequests > 0 ? this.challengesDetected / totalRequests : 0,
      proxy_switch_rate: this.jobSubmits > 0 ? this.proxySwitches / this.jobSubmits : 0,
      queue_wait_p95_by_qos: {
        small: computeP95(this.queueWaitSamples.small),
        medium: computeP95(this.queueWaitSamples.medium),
        large: computeP95(this.queueWaitSamples.large),
      },
    };
  }

  resetWindow(): void {
    this.windowStart = Date.now();
    this.jobSubmits = 0;
    this.jobSuccesses = 0;
    this.jobFailures = 0;
    this.taskRetries = 0;
    this.commentsCrawled = 0;
    this.challengesDetected = 0;
    this.proxySwitches = 0;
    this.analysisLatencySamples = [];
    this.queueWaitSamples = { small: [], medium: [], large: [] };
  }
}

export const metricsCollector = new MetricsCollector();
