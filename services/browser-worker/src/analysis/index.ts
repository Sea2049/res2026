export type { RawCommentData } from "./normalizer";
export { normalizeComment } from "./normalizer";

export type { CommentAnalysisResult } from "./comment-analyzer";
export { analyzeComment, ANALYSIS_VERSION } from "./comment-analyzer";

export type { AggregatedInsights } from "./insight-aggregator";
export { aggregateInsights, toAnalysisSummary } from "./insight-aggregator";

export type { CommentRepo, AnalysisRepo } from "./analysis-consumer";
export { AnalysisConsumer } from "./analysis-consumer";
