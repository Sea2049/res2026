/**
 * 自包含轻量版评论分析器，不依赖 Next.js 运行时。
 * 内联关键词词典、情感分析和洞察类型检测逻辑。
 */

import type { NormalizedComment } from "../storage/comment-repo";

export const ANALYSIS_VERSION = "1.0.0";

// ─── 词典 ───────────────────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  "great", "love", "awesome", "excellent", "perfect", "helpful",
  "amazing", "good", "best", "fantastic", "nice", "easy", "fast",
  "smooth", "solid", "clean", "simple", "useful", "enjoy", "enjoyed",
  "wonderful", "superb", "brilliant", "liked", "works", "pleased",
  "impressed", "recommend", "reliable", "happy", "glad",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "hate", "broken", "expensive", "slow",
  "bug", "bugs", "error", "errors", "crash", "crashes", "fail", "failed",
  "failing", "poor", "worst", "horrible", "useless", "frustrating",
  "annoying", "issue", "issues", "problem", "problems", "difficult",
  "confusing", "garbage", "trash", "sucks", "disappointed", "waste",
  "ugly", "messy", "stuck", "missing", "lacks", "lacking",
]);

const STOP_WORDS = new Set([
  "the", "is", "a", "an", "in", "on", "at", "to", "of", "and", "or",
  "but", "it", "this", "that", "with", "for", "as", "be", "was", "are",
  "were", "been", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "not", "no", "so",
  "if", "then", "than", "from", "by", "up", "about", "into", "through",
  "during", "its", "their", "your", "my", "our", "his", "her", "we",
  "they", "you", "he", "she", "me", "him", "us", "them", "who",
  "what", "when", "where", "how", "why", "which", "just", "also",
  "get", "got", "go", "went", "come", "came", "use", "used", "using",
  "make", "made", "take", "took", "see", "saw", "know", "think", "want",
  "really", "actually", "basically", "like", "very", "more", "still",
  "even", "now", "here", "there", "too", "one", "two", "out", "well",
  "back", "need", "get", "say", "said", "way", "new", "time",
]);

// ─── 接口 ────────────────────────────────────────────────────────────────────

export interface CommentAnalysisResult {
  comment_id: string;
  sentiment: "positive" | "neutral" | "negative";
  sentiment_score: number;
  keywords: string[];
  insight_type:
    | "pain_point"
    | "feature_request"
    | "objection"
    | "praise"
    | "question"
    | "other";
  priority: "critical" | "high" | "medium" | "low";
  analysis_version: string;
}

// ─── 内部工具函数 ─────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w));
}

function calcSentiment(tokens: string[]): {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
} {
  let positive = 0;
  let negative = 0;

  for (const token of tokens) {
    if (POSITIVE_WORDS.has(token)) positive++;
    if (NEGATIVE_WORDS.has(token)) negative++;
  }

  const rawDiff = positive - negative;
  const denominator = Math.max(Math.sqrt(positive + negative), 1);
  const score = Math.max(-1, Math.min(1, rawDiff / denominator));

  if (score > 0.15) return { sentiment: "positive", score };
  if (score < -0.15) return { sentiment: "negative", score };
  return { sentiment: "neutral", score: 0 };
}

function extractTopKeywords(tokens: string[], topN = 10): string[] {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    if (!STOP_WORDS.has(token) && token.length >= 3) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function detectInsightType(
  text: string
): CommentAnalysisResult["insight_type"] {
  const lower = text.toLowerCase();

  // feature_request: 愿望/功能请求信号（优先检测）
  if (
    /\bwish\b|\bwould be great\b|\bfeature request\b|\bplease add\b|\bwould love\b|\bwould be nice\b|\bplease implement\b/i.test(
      lower
    )
  ) {
    return "feature_request";
  }

  // pain_point: 错误/故障信号
  if (
    /\bdon't work\b|\bdoesn't work\b|\bnot work\b|\bnot working\b|\bbroken\b|\bfail\b|\bfailed\b|\berror\b|\bbug\b/i.test(
      lower
    )
  ) {
    return "pain_point";
  }

  // objection: 转折词信号
  if (/\bbut\b|\bhowever\b|\balthough\b|\binstead\b|\brather\b/i.test(lower)) {
    return "objection";
  }

  // praise: 正面词信号
  if (
    /\blove\b|\bgreat\b|\bamazing\b|\bperfect\b|\bexcellent\b|\bawesome\b/i.test(
      lower
    )
  ) {
    return "praise";
  }

  // question: 疑问词或问号
  if (/\bhow\b|\bwhy\b|\bwhat\b|\bwhen\b|\bwhere\b|\?/.test(lower)) {
    return "question";
  }

  return "other";
}

function determinePriority(
  insightType: CommentAnalysisResult["insight_type"],
  sentiment: CommentAnalysisResult["sentiment"],
  sentimentScore: number
): CommentAnalysisResult["priority"] {
  // pain_point + 强负面情感 → critical
  if (
    insightType === "pain_point" &&
    sentiment === "negative" &&
    sentimentScore < -0.5
  ) {
    return "critical";
  }

  if (insightType === "pain_point" || insightType === "feature_request") {
    return "high";
  }

  if (insightType === "objection") {
    return "medium";
  }

  return "low";
}

// ─── 主分析函数 ───────────────────────────────────────────────────────────────

export function analyzeComment(
  comment: NormalizedComment
): CommentAnalysisResult {
  const tokens = tokenize(comment.body);
  const { sentiment, score } = calcSentiment(tokens);
  const keywords = extractTopKeywords(tokens, 10);
  const insight_type = detectInsightType(comment.body);
  const priority = determinePriority(insight_type, sentiment, score);

  return {
    comment_id: comment.comment_id,
    sentiment,
    sentiment_score: score,
    keywords,
    insight_type,
    priority,
    analysis_version: ANALYSIS_VERSION,
  };
}
