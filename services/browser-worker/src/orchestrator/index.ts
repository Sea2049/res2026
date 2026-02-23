/**
 * 编排层（Orchestrator）模块统一出口
 */

// 消息队列
export type { QueueMessage } from "../queue/in-memory-queue";
export { InMemoryQueue } from "../queue/in-memory-queue";

// 任务拆分
export type { CrawlTaskSplit } from "./job-splitter";
export { splitJob, COMMENTS_PER_TASK } from "./job-splitter";

// QoS 调度器
export type { QosLevel } from "./job-scheduler";
export { JobScheduler } from "./job-scheduler";

// WorkerPool 接口
export type { RawComment, FetchResult, FetchOptions, WorkerPool } from "./worker-pool";

// 任务运行器
export { JobRunner, createJobRunner } from "./job-runner";
