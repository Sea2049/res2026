import type {
  Comment,
  SentimentComment,
  AnalysisResult,
  KeywordCount,
  SentimentResult,
  Insight,
  AnalysisConfig,
} from "./types";

const ENGLISH_STOP_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
  "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
  "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
  "or", "an", "will", "my", "one", "all", "would", "there", "their",
  "what", "so", "up", "out", "if", "about", "who", "get", "which", "go",
  "me", "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could", "them",
  "see", "other", "than", "then", "now", "look", "only", "come", "its", "over",
  "think", "also", "back", "after", "use", "two", "how", "our", "work",
  "first", "well", "way", "even", "new", "want", "because", "any", "these",
  "give", "day", "most", "us", "is", "was", "are", "been", "has", "had",
  "were", "said", "did", "having", "may", "should", "am", "being", "does",
]);

const POSITIVE_KEYWORDS = new Set([
  "good", "great", "amazing", "awesome", "excellent", "best",
  "perfect", "wonderful", "fantastic", "brilliant", "outstanding", "superb",
  "helpful", "thanks", "thank", "appreciate", "nice", "beautiful", "happy",
  "enjoy", "enjoyed", "enjoying", "impressed", "recommend", "recommended",
  "useful", "easy", "simple", "fast", "quick", "reliable", "solid", "smooth",
]);

const NEGATIVE_KEYWORDS = new Set([
  "bad", "terrible", "awful", "horrible", "worst", "hate", "poor",
  "disappointing", "disappointed", "frustrating", "frustrated", "annoying",
  "annoyed", "useless", "broken", "bug", "bugs", "issue", "issues", "problem",
  "problems", "error", "errors", "fail", "failed", "failing", "crash", "crashes",
  "slow", "difficult", "hard", "confusing", "confused", "waste", "sucks",
  "unfortunately", "sadly", "missing", "lack", "lacks", "lacking", "never",
  "cant", "can't", "cannot", "won't", "wont", "doesn't", "dont", "don't",
]);

const PAIN_POINT_INDICATORS = new Set([
  "problem", "issue", "bug", "error", "fail", "broken", "crash", "frustrating",
  "annoying", "difficult", "hard", "impossible", "can't", "cannot", "doesn't",
  "won't", "missing", "lack", "need", "wish", "hope", "should", "would be nice",
]);

const FEATURE_REQUEST_INDICATORS = new Set([
  "feature", "add", "please", "wish", "hope", "would love", "would be great",
  "suggestion", "request", "could you", "can you", "should have", "needs",
  "missing", "lack", "want", "wanted", "hoping", "looking for",
]);

const QUESTION_INDICATORS = new Set([
  "how", "what", "why", "when", "where", "who", "which", "?",
  "can someone", "does anyone", "is there", "help", "question",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(" ").filter((word) => word.length > 0);
}

function removeStopWords(words: string[], minLength: number = 3): string[] {
  return words.filter(
    (word) => !ENGLISH_STOP_WORDS.has(word) && word.length >= minLength
  );
}

function extractKeywords(
  comments: Comment[],
  config: AnalysisConfig
): KeywordCount[] {
  const wordFrequency = new Map<string, number>();

  for (const comment of comments) {
    const tokens = tokenize(comment.body);
    const filteredWords = removeStopWords(tokens, config.minKeywordLength);

    for (const word of filteredWords) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  }

  const keywords: KeywordCount[] = Array.from(wordFrequency.entries())
    .map(([word, count]) => {
      let sentiment: "positive" | "negative" | "neutral" = "neutral";
      if (POSITIVE_KEYWORDS.has(word)) {
        sentiment = "positive";
      } else if (NEGATIVE_KEYWORDS.has(word)) {
        sentiment = "negative";
      }
      return { word, count, sentiment };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, config.topKeywordsCount);

  return keywords;
}

function analyzeSentiment(text: string): {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
} {
  const tokens = tokenize(text);
  let positiveCount = 0;
  let negativeCount = 0;

  for (const token of tokens) {
    if (POSITIVE_KEYWORDS.has(token)) {
      positiveCount++;
    }
    if (NEGATIVE_KEYWORDS.has(token)) {
      negativeCount++;
    }
  }

  const totalSentimentWords = positiveCount + negativeCount;
  if (totalSentimentWords === 0) {
    return { sentiment: "neutral", score: 0 };
  }

  const score = (positiveCount - negativeCount) / totalSentimentWords;

  if (score > 0.2) {
    return { sentiment: "positive", score };
  } else if (score < -0.2) {
    return { sentiment: "negative", score };
  } else {
    return { sentiment: "neutral", score };
  }
}

function analyzeSentimentDistribution(
  comments: SentimentComment[]
): SentimentResult {
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const comment of comments) {
    if (comment.sentiment === "positive") {
      positive++;
    } else if (comment.sentiment === "negative") {
      negative++;
    } else {
      neutral++;
    }
  }

  const total = comments.length || 1;

  return {
    positive,
    negative,
    neutral,
    positivePercentage: Math.round((positive / total) * 100),
    negativePercentage: Math.round((negative / total) * 100),
    neutralPercentage: Math.round((neutral / total) * 100),
  };
}

function detectInsightType(
  text: string
): "pain_point" | "feature_request" | "praise" | "question" | null {
  const lowerText = text.toLowerCase();

  const hasPainPoint = Array.from(PAIN_POINT_INDICATORS).some((indicator) =>
    lowerText.includes(indicator)
  );
  const hasFeatureRequest = Array.from(FEATURE_REQUEST_INDICATORS).some(
    (indicator) => lowerText.includes(indicator)
  );
  const hasQuestion = Array.from(QUESTION_INDICATORS).some((indicator) =>
    lowerText.includes(indicator)
  );

  const sentiment = analyzeSentiment(text);

  if (hasPainPoint && sentiment.sentiment === "negative") {
    return "pain_point";
  }
  if (hasFeatureRequest) {
    return "feature_request";
  }
  if (hasQuestion) {
    return "question";
  }
  if (sentiment.sentiment === "positive" && sentiment.score > 0.5) {
    return "praise";
  }

  return null;
}

function extractInsights(
  comments: SentimentComment[],
  keywords: KeywordCount[],
  config: AnalysisConfig
): Insight[] {
  if (!config.enableInsightDetection) {
    return [];
  }

  const insights: Insight[] = [];
  const insightMap = new Map<
    string,
    {
      type: "pain_point" | "feature_request" | "praise" | "question";
      comments: string[];
      keyword?: string;
    }
  >();

  for (const comment of comments) {
    const insightType = detectInsightType(comment.body);
    if (!insightType) continue;

    const tokens = tokenize(comment.body);
    const relevantKeyword = keywords.find((kw) => tokens.includes(kw.word));

    const key = relevantKeyword
      ? `${insightType}_${relevantKeyword.word}`
      : `${insightType}_general`;

    if (!insightMap.has(key)) {
      insightMap.set(key, {
        type: insightType,
        comments: [],
        keyword: relevantKeyword?.word,
      });
    }

    const insight = insightMap.get(key)!;
    if (insight.comments.length < 5) {
      insight.comments.push(comment.id);
    }
  }

  let idCounter = 1;
  for (const [key, data] of Array.from(insightMap.entries())) {
    if (data.comments.length < 2) continue;

    const typeLabels = {
      pain_point: "用户痛点",
      feature_request: "功能需求",
      praise: "用户赞美",
      question: "常见问题",
    };

    const title = data.keyword
      ? `${typeLabels[data.type]}: ${data.keyword}`
      : typeLabels[data.type];

    const descriptions = {
      pain_point: `发现 ${data.comments.length} 条评论提到相关问题或困难`,
      feature_request: `有 ${data.comments.length} 位用户请求此功能`,
      praise: `${data.comments.length} 位用户对此表示赞赏`,
      question: `${data.comments.length} 位用户询问相关问题`,
    };

    insights.push({
      id: `insight_${idCounter++}`,
      type: data.type,
      title,
      description: descriptions[data.type],
      confidence: Math.min(data.comments.length / 10, 1),
      relatedComments: data.comments,
      keyword: data.keyword,
      count: data.comments.length,
    });
  }

  return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}

export function getInsightTypeStyle(
  type: "pain_point" | "feature_request" | "praise" | "question"
): string {
  const styles = {
    pain_point: "bg-red-50 border-red-200",
    feature_request: "bg-blue-50 border-blue-200",
    praise: "bg-green-50 border-green-200",
    question: "bg-yellow-50 border-yellow-200",
  };
  return styles[type];
}

export function getInsightIconColor(
  type: "pain_point" | "feature_request" | "praise" | "question"
): string {
  const colors = {
    pain_point: "text-red-600",
    feature_request: "text-blue-600",
    praise: "text-green-600",
    question: "text-yellow-600",
  };
  return colors[type];
}

export function analyzeComments(
  comments: Comment[],
  config: AnalysisConfig
): AnalysisResult {
  if (!comments || comments.length === 0) {
    return {
      keywords: [],
      sentiment: {
        positive: 0,
        negative: 0,
        neutral: 0,
        positivePercentage: 0,
        negativePercentage: 0,
        neutralPercentage: 0,
      },
      insights: [],
      comments: [],
    };
  }

  const limitedComments = comments.slice(0, config.maxComments);

  const sentimentComments: SentimentComment[] = limitedComments.map(
    (comment) => {
      const { sentiment, score } = analyzeSentiment(comment.body);
      const tokens = tokenize(comment.body);
      const keywords = removeStopWords(tokens, config.minKeywordLength).slice(
        0,
        5
      );

      return {
        ...comment,
        sentiment,
        sentimentScore: score,
        keywords,
      };
    }
  );

  const keywords = extractKeywords(limitedComments, config);

  const sentiment = analyzeSentimentDistribution(sentimentComments);

  const insights = extractInsights(sentimentComments, keywords, config);

  return {
    keywords,
    sentiment,
    insights,
    comments: sentimentComments,
  };
}
