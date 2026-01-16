import type {
  Comment,
  SentimentComment,
  AnalysisResult,
  KeywordCount,
  SentimentResult,
  Insight,
  AnalysisConfig,
  AnalysisProgressCallback,
} from "./types";

const ENGLISH_STOP_WORDS = new Set([
  // 基础停用词 (原核心词汇)
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

  // 扩展停用词 (副词和连接词)
  "really", "actually", "probably", "maybe", "perhaps", "certainly",
  "always", "never", "often", "sometimes", "usually", "ever", "already",
  "still", "yet", "again", "once", "here", "there", "where", "why", "how",
  "now", "then", "once", "soon", "later", "early", "before", "after",
  "above", "below", "between", "under", "over", "through", "during",
  "about", "around", "near", "far", "away", "inside", "outside",

  // 代词
  "everything", "something", "nothing", "anything", "everyone", "someone",
  "anyone", "nobody", "everybody", "each", "both", "few", "many", "much",
  "other", "another", "such", "whatever", "whoever", "wherever", "whenever",

  // 介词和连词
  "until", "while", "although", "though", "however", "whether", "either",
  "neither", "unless", "since", "because", "before", "after", "since",
  "till", "unto", "upon", "versus", "via", "per", "sans",

  // 动词 (常用弱动词)
  "get", "got", "getting", "make", "made", "making", "put", "putting",
  "let", "lets", "letting", "say", "said", "saying", "go", "goes", "went",
  "going", "take", "took", "taking", "see", "saw", "seeing", "come", "came",
  "coming", "want", "wanted", "wanting", "use", "used", "using", "find",
  "found", "finding", "give", "gave", "giving", "tell", "told", "telling",
  "work", "worked", "working", "call", "called", "calling", "try", "tried",
  "trying", "ask", "asked", "asking", "need", "needed", "needing", "feel",
  "felt", "feeling", "become", "became", "becoming", "leave", "left", "leaving",

  // 数字和单位
  "one", "two", "three", "four", "five", "first", "second", "third",
  "number", "numbers", "times", "time", "years", "year", "months", "month",
  "weeks", "week", "days", "day", "hours", "hour", "minutes", "minute",

  // 常见无意义词
  "thing", "things", "stuff", "lot", "lots", "kind", "sort", "way", "ways",
  "place", "places", "case", "cases", "point", "points", "part", "parts",
  "end", "ends", "side", "sides", "area", "areas", "world", "life", "live",
  "bit", "bits", "whole", "half", "halves", "group", "groups", "part",
  "start", "started", "starting", "thing", "things", "fact", "facts",

  // 社交媒体常用词
  "post", "posts", "comment", "comments", "thread", "threads", "subreddit",
  "reddit", "user", "users", "upvotes", "downvotes", "vote", "votes",
  "repost", "reposts", "share", "shares", "link", "links", "edit", "edits",

  // 网络用语
  "lol", "lmao", "wtf", "omg", "imo", "imho", "fyi", "btw", "tbh", "rn",
  "afaik", "idk", "etc", "eg", "ie", "vs", "etc",

  // 常见填充词
  "actually", "basically", "literally", "honestly", "simply",
  "totally", "completely", "exactly", "surely", "apparently", "obviously", "clearly",
]);

/**
 * Porter Stemmer 简化版词干提取算法
 * 用于将单词还原为其词根形式，例如：
 * - "enjoy", "enjoyed", "enjoying" -> "enjoy"
 * - "running", "runs", "ran" -> "run"
 * - "better", "best" -> "good/best"
 */
export const stemmer = (function() {
  // 常见的不规则动词词根映射
  const irregularMap: Record<string, string> = {
    "ate": "eat", "be": "be", "became": "become", "begun": "begin",
    "bent": "bend", "broke": "break", "brought": "bring",
    "built": "build", "burnt": "burn", "bought": "buy", "caught": "catch",
    "chose": "choose", "came": "come", "cost": "cost", "cut": "cut",
    "dealt": "deal", "did": "do", "done": "do", "drew": "draw",
    "driven": "drive", "drove": "drive", "drunk": "drink", "eaten": "eat",
    "fallen": "fall", "fell": "fall", "fed": "feed", "felt": "feel",
    "fought": "fight", "found": "find", "fled": "flee", "flown": "fly",
    "flew": "fly", "forgot": "forget", "forgotten": "forget", "forgave": "forgive",
    "frozen": "freeze", "froze": "freeze", "gave": "give", "gone": "go",
    "got": "get", "gotten": "get", "grew": "grow", "grown": "grow",
    "had": "have", "heard": "hear", "held": "hold", "hid": "hide",
    "hidden": "hide", "hurt": "hurt", "kept": "keep", "knew": "know",
    "known": "know", "laid": "lay", "led": "lead", "left": "leave",
    "lent": "lend", "let": "let", "lain": "lie", "lit": "light",
    "lost": "lose", "made": "make", "meant": "mean", "met": "meet",
    "paid": "pay", "put": "put", "ran": "run", "read": "read",
    "rode": "ride", "ridden": "ride", "rose": "rise", "rung": "ring",
    "said": "say", "saw": "see", "seen": "see",
    "sent": "send", "set": "set", "shone": "shine",
    "shook": "shake", "shaken": "shake", "shot": "shoot", "showed": "show",
    "shown": "show", "shut": "shut", "sung": "sing", "sank": "sink",
    "sat": "sit", "slept": "sleep", "slid": "slide", "sold": "sell",
    "sang": "sing", "spoke": "speak",
    "spoken": "speak", "spent": "spend", "spun": "spin",
    "spread": "spread", "sprang": "spring", "sprung": "spring",
    "stood": "stand", "stole": "steal", "stolen": "steal", "stuck": "stick",
    "stung": "sting", "stank": "stink", "stunk": "stink", "swore": "swear", "sworn": "swear",
    "swept": "sweep", "swam": "swim", "swum": "swim",
    "taught": "teach", "told": "tell", "thought": "think",
    "threw": "throw", "thrown": "throw", "tore": "tear", "torn": "tear",
    "took": "take", "taken": "take", "trod": "tread", "trodden": "tread",
    "understood": "understand", "went": "go", "won": "win", "wore": "wear",
    "worn": "wear", "wrote": "write", "written": "write",
  };

  // 常见词缀列表 (后缀, 替换规则)
  const suffixRules = [
    // 最高级
    { suffix: "iest", replace: "y", minLength: 4 },
    { suffix: "est", replace: "", minLength: 4 },
    // 比较级
    { suffix: "ier", replace: "y", minLength: 4 },
    { suffix: "er", replace: "", minLength: 4 },
    // 动词ing
    { suffix: "ing", replace: "", minLength: 5 },
    { suffix: "ingly", replace: "", minLength: 6 },
    // 动词过去式/过去分词
    { suffix: "ed", replace: "", minLength: 4 },
    { suffix: "edly", replace: "y", minLength: 5 },
    // 复数
    { suffix: "es", replace: "", minLength: 4 },
    { suffix: "s", replace: "", minLength: 4 },
    // 名词后缀
    { suffix: "ment", replace: "", minLength: 5 },
    { suffix: "ness", replace: "", minLength: 5 },
    { suffix: "ful", replace: "", minLength: 5 },
    { suffix: "less", replace: "", minLength: 5 },
    { suffix: "able", replace: "", minLength: 5 },
    { suffix: "ible", replace: "", minLength: 5 },
    { suffix: "ous", replace: "", minLength: 5 },
    { suffix: "ive", replace: "", minLength: 5 },
    { suffix: "ize", replace: "", minLength: 5 },
    { suffix: "ise", replace: "", minLength: 5 },
    { suffix: "ation", replace: "e", minLength: 6 },
    { suffix: "ition", replace: "e", minLength: 6 },
    { suffix: "ator", replace: "e", minLength: 5 },
    { suffix: "al", replace: "", minLength: 4 },
    { suffix: "ial", replace: "", minLength: 4 },
    { suffix: "ual", replace: "", minLength: 4 },
    // 副词后缀
    { suffix: "ly", replace: "", minLength: 4 },
  ];

  function stemWord(word: string): string {
    if (word.length < 3) {
      return word;
    }

    // 检查不规则动词
    if (irregularMap[word]) {
      return irregularMap[word]!;
    }

    // 检查非常短的词
    if (word.length <= 4) {
      return word;
    }

    // 应用词缀规则
    for (const rule of suffixRules) {
      if (word.length >= rule.minLength && word.endsWith(rule.suffix)) {
        const stemmed = word.slice(0, -rule.suffix.length) + rule.replace;

        // 确保词干不会太短
        if (stemmed.length >= 3) {
          // 递归检查是否还需要进一步词干提取
          if (stemmed !== word) {
            return stemWord(stemmed);
          }
        }

        return stemmed;
      }
    }

    return word;
  }

  return {
    stem: stemWord,
    stemArray: (words: string[]): string[] => {
      return words.map(word => stemWord(word));
    },
  };
})();

const POSITIVE_KEYWORDS = new Set([
  // 通用正面词
  "good", "great", "amazing", "awesome", "excellent", "best", "better",
  "perfect", "wonderful", "fantastic", "brilliant", "outstanding", "superb",
  "helpful", "thanks", "thank", "appreciate", "nice", "beautiful", "happy",
  "enjoy", "enjoyed", "enjoying", "impressed", "recommend", "recommended",
  "useful", "easy", "simple", "fast", "quick", "reliable", "solid", "smooth",
  "love", "loved", "loving", "liked", "cool", "clean", "clear", "smart",
  "safe", "secure", "stable", "worth", "fun", "exciting", "glad", "proud",
  "success", "successful", "solution", "solved", "fixed", "improvement",
]);

const NEGATIVE_KEYWORDS = new Set([
  // 通用负面词
  "bad", "terrible", "awful", "horrible", "worst", "worse", "hate", "hated",
  "poor", "disappointing", "disappointed", "frustrating", "frustrated",
  "annoying", "annoyed", "useless", "broken", "bug", "bugs", "issue", "issues",
  "problem", "problems", "error", "errors", "fail", "failed", "failing",
  "crash", "crashes", "slow", "difficult", "hard", "confusing", "confused",
  "waste", "sucks", "sucked", "stupid", "dumb", "garbage", "trash", "rubbish",
  "unfortunately", "sadly", "missing", "lack", "lacks", "lacking", "never",
  "cant", "cannot", "wont", "doesnt", "dont", "unsafe", "insecure", "unstable",
  "boring", "ugly", "dirty", "slowly", "pain", "painful", "mess", "messy",
  "scam", "scammed", "avoid", "warning", "stopped", "stuck", "frozen",
]);

// 程度副词 (加强语气)
const INTENSIFIERS = new Set([
  "very", "really", "extremely", "absolutely", "totally", "completely",
  "highly", "super", "so", "too", "much", "deeply", "incredibly",
]);

// 否定词 (反转语气)
const NEGATORS = new Set([
  "not", "no", "never", "didnt", "dont", "doesnt", "wont", "cant",
  "wouldnt", "couldnt", "shouldnt", "isnt", "arent", "wasnt", "werent",
  "aint", "cannot", "neither", "nor",
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

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // 移除 URL
    .replace(/https?:\/\/[^\s]+/g, "")
    // 移除 Reddit 用户引用 (u/username) 和子版块引用 (r/subreddit)
    .replace(/\b(u|r)\/[\w-]+\b/g, "")
    // 将撇号去掉 (can't -> cant)，保留单词完整性
    .replace(/['’]/g, "")
    // 移除非单词字符 (保留字母、数字和空格)
    .replace(/[^\w\s]/g, " ")
    // 合并多余空格
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(" ")
    .filter((word) => word.length > 0)
    // 过滤掉纯数字
    .filter((word) => !/^\d+$/.test(word));
}

export function removeStopWords(words: string[], minLength: number = 3): string[] {
  return words.filter(
    (word) => !ENGLISH_STOP_WORDS.has(word) && word.length >= minLength
  );
}

export function extractKeywords(
  comments: Comment[],
  config: AnalysisConfig,
  onProgress?: AnalysisProgressCallback
): KeywordCount[] {
  // stem -> { total: number, words: Map<word, count> }
  const stemMap = new Map<string, { total: number; words: Map<string, number> }>();

  const total = comments.length;
  const batchSize = Math.max(1, Math.floor(total / 10)); // 每 10% 触发一次进度回调

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const tokens = tokenize(comment.body);
    const filteredWords = removeStopWords(tokens, config.minKeywordLength);

    for (const word of filteredWords) {
      const stem = stemmer.stem(word);
      
      if (!stemMap.has(stem)) {
        stemMap.set(stem, { total: 0, words: new Map() });
      }
      
      const entry = stemMap.get(stem)!;
      entry.total++;
      entry.words.set(word, (entry.words.get(word) || 0) + 1);
    }

    // 每处理一定数量的评论触发一次进度回调
    if (onProgress && (i + 1) % batchSize === 0) {
      onProgress({
        stage: "keywords",
        current: i + 1,
        total,
        message: `提取关键词：${i + 1}/${total} 条评论`,
      });
    }
  }

  const keywords: KeywordCount[] = Array.from(stemMap.entries())
    .map(([stem, data]) => {
      // 找出该词干下出现最多次的原词作为代表
      let bestWord = stem;
      let maxCount = 0;
      
      const wordEntries = Array.from(data.words.entries());
      for (const [word, count] of wordEntries) {
        if (count > maxCount) {
          maxCount = count;
          bestWord = word;
        } else if (count === maxCount && word.length < bestWord.length) {
           // 频率相同取短的
           bestWord = word;
        }
      }

      let sentiment: "positive" | "negative" | "neutral" = "neutral";
      if (POSITIVE_KEYWORDS.has(bestWord) || POSITIVE_KEYWORDS.has(stem)) {
        sentiment = "positive";
      } else if (NEGATIVE_KEYWORDS.has(bestWord) || NEGATIVE_KEYWORDS.has(stem)) {
        sentiment = "negative";
      }
      return { word: bestWord, count: data.total, sentiment };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, config.topKeywordsCount);

  // 触发完成进度回调
  if (onProgress) {
    onProgress({
      stage: "keywords",
      current: total,
      total,
      message: `关键词提取完成`,
    });
  }

  return keywords;
}

export function analyzeSentiment(text: string): {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
} {
  const tokens = tokenize(text);
  let score = 0;
  let sentimentWordCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // 尝试原词和词干
    const stemmedToken = stemmer.stem(token);
    
    let tokenScore = 0;
    if (POSITIVE_KEYWORDS.has(token) || POSITIVE_KEYWORDS.has(stemmedToken)) {
      tokenScore = 1;
    } else if (NEGATIVE_KEYWORDS.has(token) || NEGATIVE_KEYWORDS.has(stemmedToken)) {
      tokenScore = -1;
    }

    if (tokenScore !== 0) {
      sentimentWordCount++;
      
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const prevPrevToken = i > 1 ? tokens[i - 2] : null;

      // 检查前一个词是否是否定词
      if (prevToken && NEGATORS.has(prevToken)) {
        tokenScore *= -1;
      }
      // 检查前前一个词是否是否定词 (例如 "did not like")
      else if (prevPrevToken && NEGATORS.has(prevPrevToken)) {
        tokenScore *= -1;
      }

      // 检查前一个词是否是程度副词 (如果在否定词之前，如 "very not good" - 不常见，或者是 "really dont like")
      // 简化逻辑：如果前一个词是程度副词，增强语气
      if (prevToken && INTENSIFIERS.has(prevToken)) {
        // 如果程度副词本身也是否定词 (从未发生?)，或者已经在否定词逻辑里处理了
        // 这里主要处理 "very good" 或 "really bad"
        tokenScore *= 1.5;
      }
      
      score += tokenScore;
    }
  }

  // 归一化分数 (-1 到 1)
  // 使用 sqrt(count) 来防止长评论分数过高，但也给多重情感词更多权重
  const normalizedScore = sentimentWordCount > 0 
    ? Math.max(-1, Math.min(1, score / Math.max(1, Math.sqrt(sentimentWordCount)))) 
    : 0;

  if (normalizedScore > 0.15) { // 稍微降低阈值
    return { sentiment: "positive", score: normalizedScore };
  } else if (normalizedScore < -0.15) {
    return { sentiment: "negative", score: normalizedScore };
  } else {
    return { sentiment: "neutral", score: normalizedScore };
  }
}

function analyzeSentimentDistribution(
  comments: SentimentComment[],
  onProgress?: AnalysisProgressCallback
): SentimentResult {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  const total = comments.length || 1;
  const batchSize = Math.max(1, Math.floor(total / 5)); // 每 20% 触发一次进度回调

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    if (comment.sentiment === "positive") {
      positive++;
    } else if (comment.sentiment === "negative") {
      negative++;
    } else {
      neutral++;
    }

    // 每处理一定数量的评论触发一次进度回调
    if (onProgress && (i + 1) % batchSize === 0) {
      onProgress({
        stage: "sentiment",
        current: i + 1,
        total,
        message: `分析情感：${i + 1}/${total} 条评论`,
      });
    }
  }

  // 触发完成进度回调
  if (onProgress) {
    onProgress({
      stage: "sentiment",
      current: total,
      total,
      message: `情感分析完成`,
    });
  }

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
  config: AnalysisConfig,
  onProgress?: AnalysisProgressCallback
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
  const total = comments.length;
  const batchSize = Math.max(1, Math.floor(total / 10)); // 每 10% 触发一次进度回调

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
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
    if (insight.comments.length < 10) {
      insight.comments.push(comment.id);
    }

    // 每处理一定数量的评论触发一次进度回调
    if (onProgress && (i + 1) % batchSize === 0) {
      onProgress({
        stage: "insights",
        current: i + 1,
        total,
        message: `检测洞察：${i + 1}/${total} 条评论`,
      });
    }
  }

  // 触发完成进度回调
  if (onProgress) {
    onProgress({
      stage: "insights",
      current: total,
      total,
      message: `洞察检测完成`,
    });
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
  config: AnalysisConfig,
  onProgress?: AnalysisProgressCallback
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

  const keywords = extractKeywords(limitedComments, config, onProgress);

  const sentiment = analyzeSentimentDistribution(sentimentComments, onProgress);

  const insights = extractInsights(sentimentComments, keywords, config, onProgress);

  return {
    keywords,
    sentiment,
    insights,
    comments: sentimentComments,
  };
}
