export { getDb, closeDb } from "./db";
export { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from "./schema";

export {
  createJob,
  getJob,
  updateJobStatus,
  updateJobProgress,
  listJobs,
  cancelJob,
} from "./job-repo";

export type { NormalizedComment } from "./comment-repo";
export {
  saveRawComment,
  saveNormalizedComment,
  getNormalizedComments,
  countNormalizedComments,
} from "./comment-repo";

export type { AnalysisResult, AnalysisSummaryData } from "./analysis-repo";
export {
  saveAnalysisResult,
  getAnalysisResults,
  getJobAnalysisSummary,
} from "./analysis-repo";
