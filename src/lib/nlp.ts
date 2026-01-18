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
 * LRU缓存类
 * 用于缓存词干提取结果,提升性能
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 最小堆类(用于Top-K算法)
 * 维护K个最大元素,比全排序更高效
 */
class MinHeap<T> {
  private heap: T[];
  private compareFn: (a: T, b: T) => number;

  constructor(compareFn: (a: T, b: T) => number) {
    this.heap = [];
    this.compareFn = compareFn;
  }

  private parent(i: number): number {
    return Math.floor((i - 1) / 2);
  }

  private leftChild(i: number): number {
    return 2 * i + 1;
  }

  private rightChild(i: number): number {
    return 2 * i + 2;
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  private heapifyUp(i: number): void {
    while (i > 0 && this.compareFn(this.heap[i], this.heap[this.parent(i)]) < 0) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  private heapifyDown(i: number): void {
    let minIndex = i;
    const left = this.leftChild(i);
    const right = this.rightChild(i);

    if (left < this.heap.length && this.compareFn(this.heap[left], this.heap[minIndex]) < 0) {
      minIndex = left;
    }

    if (right < this.heap.length && this.compareFn(this.heap[right], this.heap[minIndex]) < 0) {
      minIndex = right;
    }

    if (minIndex !== i) {
      this.swap(i, minIndex);
      this.heapifyDown(minIndex);
    }
  }

  push(item: T): void {
    this.heap.push(item);
    this.heapifyUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const root = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.heapifyDown(0);
    return root;
  }

  peek(): T | undefined {
    return this.heap[0];
  }

  size(): number {
    return this.heap.length;
  }

  toArray(): T[] {
    return [...this.heap].sort(this.compareFn);
  }
}

/**
 * Porter Stemmer 简化版词干提取算法(优化版)
 * 用于将单词还原为其词根形式，例如：
 * - "enjoy", "enjoyed", "enjoying" -> "enjoy"
 * - "running", "runs", "ran" -> "run"
 * - "better", "best" -> "good/best"
 * 优化点:添加LRU缓存,避免重复计算
 */
export const stemmer = (function() {
  const stemCache = new LRUCache<string, string>(2000);
  
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

  function stemWord(word: string, depth: number = 0): string {
    if (word.length < 3) {
      return word;
    }

    const cached = stemCache.get(word);
    if (cached !== undefined) {
      return cached;
    }

    if (irregularMap[word]) {
      const result = irregularMap[word]!;
      stemCache.set(word, result);
      return result;
    }

    if (word.length <= 4) {
      stemCache.set(word, word);
      return word;
    }

    for (const rule of suffixRules) {
      if (word.length >= rule.minLength && word.endsWith(rule.suffix)) {
        const stemmed = word.slice(0, -rule.suffix.length) + rule.replace;

        if (stemmed.length >= 3) {
          if (stemmed !== word && depth < 1) {
            const result = stemWord(stemmed, depth + 1);
            stemCache.set(word, result);
            return result;
          }
        }

        stemCache.set(word, stemmed);
        return stemmed;
      }
    }

    stemCache.set(word, word);
    return word;
  }

  return {
    stem: stemWord,
    stemArray: (words: string[]): string[] => {
      return words.map(word => stemWord(word));
    },
  };
})();

/**
 * 贝叶斯置信度计算器
 * 基于贝叶斯定理计算洞察的置信度，考虑多个因素：
 * - 评论数量
 * - 情感强度
 * - 指示词匹配度
 * - 关键词频率
 */
class BayesianConfidenceCalculator {
  /**
   * 计算贝叶斯置信度
   * @param commentCount 相关评论数量
   * @param avgSentimentScore 平均情感分数 (-1 到 1)
   * @param indicatorScore 指示词匹配得分 (0 到 1)
   * @param totalComments 总评论数
   * @returns 置信度 (0 到 1)
   */
  calculate(
    commentCount: number,
    avgSentimentScore: number,
    indicatorScore: number,
    totalComments: number
  ): number {
    // 1. 计算似然比 (Likelihood Ratio)
    const likelihoodRatio = this.calculateLikelihoodRatio(
      commentCount,
      avgSentimentScore,
      indicatorScore
    );

    // 2. 计算先验概率
    const prior = this.getPriorProbability(commentCount, totalComments);

    // 3. 贝叶斯更新: P(H|E) = P(E|H) * P(H) / P(E)
    // 使用对数域计算以避免数值下溢
    const logLikelihood = Math.log(likelihoodRatio + Number.EPSILON);
    const logPrior = Math.log(prior + Number.EPSILON);
    
    // 后验概率的对数
    const logPosterior = logPrior + logLikelihood;
    
    // 转换回概率域并归一化
    let posterior = Math.exp(logPosterior);
    
    // 归一化 (确保在 0 到 1 之间)
    posterior = Math.min(1, Math.max(0, posterior));

    // 4. 应用指示词权重进行最终调整
    const finalConfidence = posterior * (0.7 + indicatorScore * 0.3);

    return Math.min(1, finalConfidence);
  }

  /**
   * 计算似然比
   * @param commentCount 评论数量
   * @param avgSentimentScore 平均情感分数
   * @param indicatorScore 指示词得分
   * @returns 似然比
   */
  private calculateLikelihoodRatio(
    commentCount: number,
    avgSentimentScore: number,
    indicatorScore: number
  ): number {
    // 评论数量的影响（对数增长）
    const countFactor = Math.log1p(commentCount) / Math.log(11);

    // 情感分数的影响
    const sentimentFactor = 1 + Math.abs(avgSentimentScore);

    // 指示词得分的影响
    const indicatorFactor = 1 + indicatorScore;

    // 综合似然比
    return countFactor * sentimentFactor * indicatorFactor;
  }

  /**
   * 获取先验概率
   * 根据评论数量调整先验概率
   * @param commentCount 相关评论数量
   * @param totalComments 总评论数
   * @returns 先验概率
   */
  private getPriorProbability(
    commentCount: number,
    totalComments: number
  ): number {
    // 基础先验
    let prior = 0.5;

    // 根据评论占比调整
    if (totalComments > 0) {
      const ratio = commentCount / totalComments;
      // 使用 sigmoid 函数平滑调整
      const ratioAdjustment = 1 / (1 + Math.exp(-10 * (ratio - 0.1)));
      prior = 0.3 + 0.4 * ratioAdjustment;
    }

    return prior;
  }
}

// 创建单例置信度计算器
const confidenceCalculator = new BayesianConfidenceCalculator();

/**
 * TF-IDF 计算工具类(优化版)
 * 优化点:批量处理文档,避免重复遍历
 */
export class TFIDFCalculator {
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments: number = 0;

  /**
   * 批量添加文档并更新词频(优化版)
   * @param documentsTokens 多个文档的词列表数组
   */
  addDocuments(documentsTokens: string[][]): void {
    for (const tokens of documentsTokens) {
      this.totalDocuments++;
      const tokenSet = new Set(tokens);
      const uniqueTokens = Array.from(tokenSet);
      for (const token of uniqueTokens) {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) || 0) + 1
        );
      }
    }
  }

  /**
   * 添加单个文档并更新词频(保留兼容性)
   * @param tokens 文档的词列表
   */
  addDocument(tokens: string[]): void {
    this.totalDocuments++;
    const tokenSet = new Set(tokens);
    const uniqueTokens = Array.from(tokenSet);
    for (const token of uniqueTokens) {
      this.documentFrequency.set(
        token,
        (this.documentFrequency.get(token) || 0) + 1
      );
    }
  }

  /**
   * 计算 TF-IDF 值
   * @param term 词语
   * @param termFrequency 词频
   * @returns TF-IDF 值
   */
  calculateTFIDF(term: string, termFrequency: number): number {
    const tf = termFrequency;
    const df = this.documentFrequency.get(term) || 1;
    const idf = Math.log(this.totalDocuments / df);
    return tf * idf;
  }

  /**
   * 重置计算器
   */
  reset(): void {
    this.documentFrequency.clear();
    this.totalDocuments = 0;
  }
}

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
  const total = comments.length;
  const batchSize = Math.max(1, Math.floor(total / 10));

  const tfidfCalculator = new TFIDFCalculator();

  const termStats = new Map<
    string,
    {
      tf: number;
      words: Map<string, number>;
      docsWithWord: Set<number>;
    }
  >();

  const allFilteredWords: string[][] = [];

  for (let i = 0; i < comments.length; i++) {
    const comment = comments[i];
    const tokens = tokenize(comment.body);
    const filteredWords = removeStopWords(tokens, config.minKeywordLength);
    
    allFilteredWords.push(filteredWords);

    const wordCounts = new Map<string, number>();
    for (const word of filteredWords) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }

    const wordCountEntries = Array.from(wordCounts.entries());
    for (const [word, count] of wordCountEntries) {
      const stem = stemmer.stem(word);

      if (!termStats.has(stem)) {
        termStats.set(stem, {
          tf: 0,
          words: new Map(),
          docsWithWord: new Set(),
        });
      }

      const stats = termStats.get(stem)!;
      stats.tf += count;
      stats.words.set(word, (stats.words.get(word) || 0) + count);
      stats.docsWithWord.add(i);
    }

    if (onProgress && (i + 1) % batchSize === 0) {
      onProgress({
        stage: "keywords",
        current: i + 1,
        total,
        message: `提取关键词：${i + 1}/${total} 条评论`,
      });
    }
  }

  tfidfCalculator.addDocuments(allFilteredWords);

  type KeywordWithScore = {
    word: string;
    count: number;
    sentiment: "positive" | "negative" | "neutral";
    score: number;
  };

  const minHeap = new MinHeap<KeywordWithScore>((a, b) => a.score - b.score);

  const termStatsEntries = Array.from(termStats.entries());
  for (const [stem, data] of termStatsEntries) {
    let bestWord = stem;
    let maxCount = 0;

    const wordEntries = Array.from(data.words.entries());
    for (const [word, count] of wordEntries) {
      if (count > maxCount) {
        maxCount = count;
        bestWord = word;
      } else if (count === maxCount && word.length < bestWord.length) {
        bestWord = word;
      }
    }

    const tfidf = tfidfCalculator.calculateTFIDF(stem, data.tf);

    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    const wordIsPositive = POSITIVE_KEYWORDS.has(bestWord);
    const wordIsNegative = NEGATIVE_KEYWORDS.has(bestWord);
    
    if (wordIsPositive || (!wordIsPositive && !wordIsNegative && POSITIVE_KEYWORDS.has(stem))) {
      sentiment = "positive";
    } else if (wordIsNegative || (!wordIsPositive && !wordIsNegative && NEGATIVE_KEYWORDS.has(stem))) {
      sentiment = "negative";
    }

    const score = tfidf * (sentiment !== "neutral" ? 1.2 : 1);
    const keyword: KeywordWithScore = {
      word: bestWord,
      count: data.tf,
      sentiment,
      score,
    };

    if (minHeap.size() < config.topKeywordsCount) {
      minHeap.push(keyword);
    } else if (minHeap.peek() && score > minHeap.peek()!.score) {
      minHeap.pop();
      minHeap.push(keyword);
    }
  }

  const keywords: KeywordCount[] = minHeap
    .toArray()
    .reverse()
    .map(({ word, count, sentiment }) => ({
      word,
      count,
      sentiment,
    }));

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
    const stemmedToken = stemmer.stem(token);
    
    let tokenScore = 0;
    const isPositive = POSITIVE_KEYWORDS.has(token);
    const isNegative = NEGATIVE_KEYWORDS.has(token);
    const stemIsPositive = !isPositive && POSITIVE_KEYWORDS.has(stemmedToken);
    const stemIsNegative = !isNegative && NEGATIVE_KEYWORDS.has(stemmedToken);
    
    if (isPositive || stemIsPositive) {
      tokenScore = 1;
    } else if (isNegative || stemIsNegative) {
      tokenScore = -1;
    }

    if (tokenScore !== 0) {
      sentimentWordCount++;
      
      const prevToken = i > 0 ? tokens[i - 1] : null;
      const prevPrevToken = i > 1 ? tokens[i - 2] : null;

      if (prevToken && NEGATORS.has(prevToken)) {
        tokenScore *= -1;
      } else if (prevPrevToken && NEGATORS.has(prevPrevToken)) {
        tokenScore *= -1;
      }

      if (prevToken && INTENSIFIERS.has(prevToken)) {
        tokenScore *= 1.5;
      }
      
      score += tokenScore;
    }
  }

  const normalizedScore = sentimentWordCount > 0 
    ? Math.max(-1, Math.min(1, score / Math.max(1, Math.sqrt(sentimentWordCount)))) 
    : 0;

  if (normalizedScore > 0.15) {
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
      confidence: calculateInsightConfidence(data.type, data.comments.length, comments),
      relatedComments: data.comments,
      keyword: data.keyword,
      count: data.comments.length,
    });
  }

  return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 20);
}

/**
 * 计算洞察的置信度
 * 使用贝叶斯置信度计算器，考虑评论数量、情感强度和指示词匹配度
 * @param insightType 洞察类型
 * @param commentCount 相关评论数量
 * @param allComments 所有评论
 * @returns 置信度 (0 到 1)
 */
function calculateInsightConfidence(
  insightType: "pain_point" | "feature_request" | "praise" | "question",
  commentCount: number,
  allComments: SentimentComment[]
): number {
  // 1. 计算平均情感分数
  let totalSentimentScore = 0;
  let analyzedCount = 0;
  
  for (const comment of allComments) {
    if (comment.sentimentScore !== undefined) {
      totalSentimentScore += comment.sentimentScore;
      analyzedCount++;
    }
  }
  
  const avgSentimentScore = analyzedCount > 0 
    ? totalSentimentScore / analyzedCount 
    : 0;

  // 2. 计算指示词得分
  const indicatorScore = calculateIndicatorScore(insightType);

  // 3. 使用贝叶斯置信度计算器
  return confidenceCalculator.calculate(
    commentCount,
    avgSentimentScore,
    indicatorScore,
    allComments.length
  );
}

/**
 * 根据洞察类型计算指示词得分
 * @param insightType 洞察类型
 * @returns 指示词得分 (0 到 1)
 */
function calculateIndicatorScore(
  insightType: "pain_point" | "feature_request" | "praise" | "question"
): number {
  // 基于各类型指示词的数量和权重计算得分
  switch (insightType) {
    case "pain_point":
      return Math.min(PAIN_POINT_INDICATORS.size / 15, 1);
    case "feature_request":
      return Math.min(FEATURE_REQUEST_INDICATORS.size / 15, 1);
    case "praise":
      return 0.5; // 赞美主要依赖情感分析
    case "question":
      return Math.min(QUESTION_INDICATORS.size / 10, 1);
    default:
      return 0.3;
  }
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
