/**
 * 情感分析模式定义
 * 基于 reddit-sentiment-analysis skill 的最佳实践
 */

/**
 * WISH信号检测模式
 * 用于识别用户的愿望、期望和功能请求
 */
export const WISH_PATTERNS = {
  // 直接愿望表达
  directWish: [
    /\bi\s+wish\s+/i,
    /\bwish\s+they\s+/i,
    /\bwish\s+it\s+/i,
    /\bwould\s+be\s+(better|great|nice|cool|awesome)\s+if/i,
    /\bwould\s+love\s+(to|if)/i,
    /\bi'd\s+like\s+(to|if)/i,
    /\bi\s+want\s+/i,
    /\bi\s+need\s+/i,
  ],
  
  // 应该做的事
  shouldStatements: [
    /\bthey\s+should\s+/i,
    /\bshould\s+(add|include|have|implement|fix|improve)/i,
    /\bneeds?\s+to\s+(add|include|have|implement|fix|improve)/i,
    /\bmust\s+(add|include|have|implement|fix|improve)/i,
  ],
  
  // 缺失/不足表达
  lackingStatements: [
    /\b(needs?|lacking|missing)\s+(more|better)/i,
    /\b(doesn't|does\s+not|don't|do\s+not)\s+have/i,
    /\bwithout\s+/i,
    /\bno\s+(way\s+to|option\s+to|ability\s+to)/i,
  ],
  
  // 期待/希望
  hopeStatements: [
    /\bhope\s+(they|it|you)\s+(add|implement|fix|include)/i,
    /\bwaiting\s+for\s+/i,
    /\blooking\s+forward\s+to\s+/i,
    /\bcan't\s+wait\s+(for|until)/i,
  ],
  
  // 如果...就好了
  conditionalWish: [
    /\bif\s+only\s+/i,
    /\bwouldn't\s+it\s+be\s+(nice|great|cool|better)/i,
    /\bimagine\s+if\s+/i,
  ],
};

/**
 * 子分类检测模式
 * 基于 customer-feedback-analyzer skill
 */
export const SUBTYPE_PATTERNS = {
  // Bug相关
  bug: [
    /\b(bug|error|crash|broken|doesn't\s+work|not\s+working)/i,
    /\b(issue|problem|glitch|fail)/i,
    /\b(throws?\s+error|exception)/i,
  ],
  
  // 性能相关
  performance: [
    /\b(slow|lag|laggy|performance|speed)/i,
    /\b(takes?\s+forever|takes?\s+too\s+long)/i,
    /\b(freezes?|freezing|hang)/i,
    /\b(memory|cpu|resource)/i,
  ],
  
  // UX/UI相关
  uxIssue: [
    /\b(confus(ing|ed)|hard\s+to\s+(use|understand|find))/i,
    /\b(ui|ux|interface|design)/i,
    /\b(unintuitive|clunky|awkward)/i,
    /\b(navigation|layout|menu)/i,
  ],
  
  // 价格相关
  pricing: [
    /\b(price|pricing|cost|expensive|cheap)/i,
    /\b(pay|payment|subscription|fee)/i,
    /\b(worth\s+it|value|money)/i,
    /\b(too\s+much|overpriced|affordable)/i,
  ],
  
  // 文档相关
  documentation: [
    /\b(documentation|docs|guide|tutorial|help)/i,
    /\b(how\s+to|instructions|manual)/i,
    /\b(unclear|not\s+documented|no\s+docs)/i,
  ],
  
  // 集成相关
  integration: [
    /\b(integrat(e|ion)|connect|api|plugin)/i,
    /\b(compatibility|compatible|support)/i,
    /\b(third[- ]party|external)/i,
  ],
};

/**
 * Identity Fit 信号模式
 * 基于 product-appeal-analyzer skill
 */
export const IDENTITY_PATTERNS = {
  // 自我认同表达
  selfIdentification: [
    /\bi'm\s+a\s+/i,
    /\bas\s+a\s+/i,
    /\bi\s+am\s+/i,
    /\bwe\s+(are|'re)\s+/i,
  ],
  
  // 群体归属
  groupBelonging: [
    /\bpeople\s+like\s+(me|us)/i,
    /\b(users?|customers?)\s+like\s+(me|us)/i,
    /\bfor\s+(developers|designers|gamers|professionals)/i,
  ],
  
  // 使用场景
  useCase: [
    /\bin\s+my\s+(work|job|business|company)/i,
    /\bfor\s+my\s+(team|project|startup)/i,
    /\bwhen\s+(i|we)\s+/i,
  ],
};

/**
 * 反对意见检测模式
 * 基于 product-appeal-analyzer skill 的7类反对意见
 */
export const OBJECTION_PATTERNS = {
  // 1. 信任问题："Is this legit?"
  trust: [
    /\bis\s+this\s+(legit|real|scam|fake)/i,
    /\b(trustworthy|reliable|safe|secure)/i,
    /\b(sketchy|suspicious|shady)/i,
    /\bcan\s+i\s+trust/i,
  ],
  
  // 2. 怀疑论："I've tried things before"
  skepticism: [
    /\bi'?ve?\s+(tried|seen|heard)\s+/i,
    /\b(tried\s+before|been\s+there)/i,
    /\b(overhyped|overrated)/i,
    /\btoo\s+good\s+to\s+be\s+true/i,
  ],
  
  // 3. 价值感知："Too expensive"
  value: [
    /\btoo\s+(expensive|costly|pricey)/i,
    /\bnot\s+worth\s+(it|the\s+money)/i,
    /\b(overpriced|expensive)/i,
    /\b(cheaper|free)\s+alternatives?/i,
  ],
  
  // 4. 复杂度："Too complicated"
  complexity: [
    /\btoo\s+(complicated|complex|difficult|hard)/i,
    /\b(steep\s+learning\s+curve)/i,
    /\b(confusing|overwhelming)/i,
    /\b(not\s+simple|not\s+easy)/i,
  ],
  
  // 5. 身份不符："Not for people like me"
  identityMismatch: [
    /\bnot\s+for\s+(me|us|people\s+like\s+me)/i,
    /\b(too\s+advanced|too\s+basic)/i,
    /\bdesigned\s+for\s+/i,
    /\bnot\s+(my|our)\s+(thing|style)/i,
  ],
  
  // 6. 风险担忧："What if it doesn't work?"
  risk: [
    /\bwhat\s+if\s+(it|this)\s+doesn't\s+work/i,
    /\b(worried|concerned)\s+about/i,
    /\b(guarantee|refund|money[- ]back)/i,
    /\b(safe|risk)/i,
  ],
  
  // 7. 拖延："I'll do it later"
  procrastination: [
    /\b(later|tomorrow|someday|eventually)/i,
    /\bno\s+(rush|hurry|urgency)/i,
    /\bwhen\s+i\s+(have\s+time|get\s+around\s+to\s+it)/i,
    /\bnot\s+(now|yet|right\s+now)/i,
  ],
};

/**
 * 检测文本中是否包含WISH信号
 */
export function detectWishSignal(text: string): boolean {
  const normalizedText = text.toLowerCase();
  
  // 检查所有WISH模式
  for (const patternGroup of Object.values(WISH_PATTERNS)) {
    for (const pattern of patternGroup) {
      if (pattern.test(normalizedText)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 检测洞察的子类型
 */
export function detectSubType(text: string): string | null {
  const normalizedText = text.toLowerCase();
  
  // 按优先级检测子类型
  for (const [subtype, patterns] of Object.entries(SUBTYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        return subtype;
      }
    }
  }
  
  return null;
}

/**
 * 检测Identity Fit信号
 */
export function detectIdentitySignals(text: string): string[] {
  const signals: string[] = [];
  const normalizedText = text.toLowerCase();
  
  // 提取自我认同表达
  const selfIdMatch = text.match(/(?:i'm|i am|as)\s+a\s+([a-z\s]+)/i);
  if (selfIdMatch) {
    signals.push(selfIdMatch[1].trim());
  }
  
  // 提取群体归属
  const groupMatch = text.match(/people\s+like\s+(?:me|us)|(?:for|as)\s+([a-z\s]+)/i);
  if (groupMatch && groupMatch[1]) {
    signals.push(groupMatch[1].trim());
  }
  
  return signals.filter(s => s.length > 0);
}

/**
 * 检测反对意见类型
 */
export function detectObjectionTypes(text: string): string[] {
  const objections: string[] = [];
  const normalizedText = text.toLowerCase();
  
  for (const [type, patterns] of Object.entries(OBJECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedText)) {
        objections.push(type);
        break; // 每种类型只记录一次
      }
    }
  }
  
  return objections;
}

/**
 * 计算WISH信号的紧急度分数 (0-10)
 * 基于关键词强度和频率
 */
export function calculateWishUrgency(text: string, frequency: number): number {
  const normalizedText = text.toLowerCase();
  let urgencyScore = 5; // 基础分数
  
  // 强烈愿望词提升分数
  const strongWishWords = [
    'desperately', 'really need', 'must have', 'critical', 
    'urgent', 'asap', 'immediately', 'now'
  ];
  
  for (const word of strongWishWords) {
    if (normalizedText.includes(word)) {
      urgencyScore += 1.5;
    }
  }
  
  // 频率影响
  if (frequency > 10) urgencyScore += 2;
  else if (frequency > 5) urgencyScore += 1;
  
  // 限制在0-10范围
  return Math.min(10, Math.max(0, urgencyScore));
}
