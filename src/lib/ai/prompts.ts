import type { 
  AnalysisResult, 
  SearchResult, 
  KeywordCount, 
  SentimentResult, 
  Insight, 
  SentimentComment 
} from "@/lib/types";

/**
 * 洞察Prompt生成参数接口
 */
interface InsightPromptParams {
  topics: SearchResult[];
  analysisResult: AnalysisResult;
  exportData?: {
    keywords: KeywordCount[];
    sentiments: SentimentResult;
    insights: Insight[];
    comments: SentimentComment[];
  };
}

/**
 * 格式化主题信息
 * @param topics 搜索结果列表
 * @returns 格式化的主题信息字符串
 */
function formatTopics(topics: SearchResult[]): string {
  if (topics.length === 0) return "无";

  const topicDetails = topics.map((topic, index) => {
    if ("subscriber_count" in topic) {
      return `${index + 1}. [Subreddit] ${topic.display_name}\n   订阅数:${topic.subscriber_count}\n   描述:${topic.description.substring(0, 200)}`;
    } else {
      return `${index + 1}. [Post] ${topic.title}\n   作者:${topic.author}\n   社区:r/${topic.subreddit}\n   评分:${topic.score}|评论:${topic.num_comments}`;
    }
  });

  return topicDetails.join("\n\n");
}

/**
 * 格式化关键词数据
 * @param keywords 关键词列表
 * @returns 格式化的关键词字符串
 */
function formatKeywords(keywords: KeywordCount[]): string {
  if (!keywords || keywords.length === 0) return "无关键词数据";

  const topKeywords = keywords.slice(0, 25);
  const formatted = topKeywords.map((kw, index) => {
    const sentimentLabels: Record<string, string> = {
      positive: "正面",
      negative: "负面",
      neutral: "中性"
    };
    return `${index + 1}.${kw.word}(${kw.count}次,${sentimentLabels[kw.sentiment]})`;
  });

  return formatted.join("\n");
}

/**
 * 格式化情感分析数据
 * @param sentiment 情感分析结果
 * @returns 格式化的情感数据字符串
 */
function formatSentiment(sentiment: SentimentResult | null): string {
  if (!sentiment) return "无情感数据";

  return `情感分布:\n- 正面:${sentiment.positive}条(${sentiment.positivePercentage}%)\n- 负面:${sentiment.negative}条(${sentiment.negativePercentage}%)\n- 中性:${sentiment.neutral}条(${sentiment.neutralPercentage}%)`;
}

/**
 * 格式化洞察数据
 * @param insights 洞察列表
 * @returns 格式化的洞察字符串
 */
function formatInsights(insights: Insight[]): string {
  if (!insights || insights.length === 0) return "无洞察数据";

  const typeLabels: Record<string, string> = {
    pain_point: "用户痛点",
    feature_request: "功能需求",
    praise: "用户赞美",
    question: "用户问题"
  };

  const topInsights = insights.slice(0, 15);
  const formatted = topInsights.map((insight, index) => {
    return `${index + 1}.[${typeLabels[insight.type]}]${insight.title}\n   置信度:${Math.round(insight.confidence * 100)}%\n   相关评论:${insight.relatedComments.length}条\n   描述:${insight.description.substring(0, 150)}`;
  });

  return formatted.join("\n\n");
}

/**
 * 格式化评论样本
 * @param comments 评论列表
 * @returns 格式化的评论样本字符串
 */
function formatCommentSamples(comments: SentimentComment[]): string {
  if (!comments || comments.length === 0) return "无评论数据";

  const samples = comments.slice(0, 20);
  const formatted = samples.map((comment, index) => {
    const sentimentLabels: Record<string, string> = {
      positive: "正面",
      negative: "负面",
      neutral: "中性"
    };
    return `${index + 1}.[${sentimentLabels[comment.sentiment]}]u/${comment.author}(评分:${comment.score})\n   ${comment.body.substring(0, 150)}`;
  });

  return formatted.join("\n\n");
}

/**
 * 生成深度洞见Prompt
 * @param params Prompt生成参数
 * @returns 格式化的Prompt字符串
 */
export function generateInsightPrompt(params: InsightPromptParams): string {
  const { topics, analysisResult, exportData } = params;

  const topicsInfo = formatTopics(topics);
  const keywordsInfo = formatKeywords(analysisResult.keywords);
  const sentimentInfo = formatSentiment(analysisResult.sentiment);
  const insightsInfo = formatInsights(analysisResult.insights);
  const commentsInfo = formatCommentSamples(analysisResult.comments);

  return `你是一位资深的数据分析师和用户体验专家。请基于以下Reddit社区数据，进行深度分析并生成洞察报告。

## 📊 分析数据

### 分析主题
${topicsInfo}

### 基础统计
- 总评论数:${analysisResult.comments.length}条
- 关键词数量:${analysisResult.keywords.length}个
- 洞察数量:${analysisResult.insights.length}个

### 高频关键词(前25个)
${keywordsInfo}

### 情感分布
${sentimentInfo}

### 已识别洞察(前15个)
${insightsInfo}

### 评论样本(前20条)
${commentsInfo}

## 🎯 分析要求

请对上述数据进行深度分析，重点发现：

### 1. 核心发现(3-5个)
- 基于数据的最重要发现
- 每个发现必须有具体数据支撑
- 分析发现的商业价值、用户价值或战略意义
- 解释为什么这个发现重要

### 2. 用户痛点分析
- 深入分析用户遇到的主要问题
- 按影响程度排序(严重/中等/轻微)
- 分析痛点背后的根本原因
- 提供具体的、可操作的解决方案
- 评估每个痛点的业务影响

### 3. 需求趋势预测
- 基于功能需求洞察,预测用户需求的未来趋势
- 识别潜在的功能机会和创新点
- 评估需求的紧迫性(高/中/低)和商业价值
- 分析需求的可行性

### 4. 情感驱动因素
- 深度分析正面评论的驱动因素(什么让用户满意)
- 深度分析负面评论的驱动因素(什么让用户不满)
- 识别影响用户态度的关键因素
- 提供改善用户体验的具体建议

### 5. 行动建议(3-5条)
- 基于以上分析,提供具体可行的行动建议
- 每条建议包含:问题描述、解决方案、预期效果、实施难度、优先级
- 建议要有创新性和实用性
- 评估投入产出比

## 📝 输出格式

请以Markdown格式输出完整的深度洞察报告:

# Reddit社区深度洞察报告

## 一、执行摘要
用200-300字概述本次分析的核心发现和关键建议

## 二、核心发现
### 2.1 发现1
- **发现内容**:详细描述
- **数据支撑**:具体数据和统计
- **价值分析**:商业价值/用户价值/战略意义
- **重要性解释**:为什么这个发现重要

### 2.2 发现2
...

## 三、用户痛点分析
### 3.1 严重程度:高
- **痛点描述**
- **根本原因分析**
- **影响范围**:受影响用户数量/比例
- **解决方案建议**
- **业务影响评估**

### 3.2 严重程度:中
...

## 四、需求趋势预测
### 4.1 趋势1
- **趋势描述**
- **需求分析**:用户为什么需要这个
- **创新点**:这个需求的价值和创新性
- **紧迫性评估**:高/中/低
- **商业价值**:预期的商业回报
- **可行性分析**:实施难度和风险

### 4.2 趋势2
...

## 五、情感驱动因素分析
### 5.1 正面驱动因素
- 主要因素1:分析+数据支持
- 主要因素2:分析+数据支持

### 5.2 负面驱动因素
- 主要因素1:分析+数据支持
- 主要因素2:分析+数据支持

### 5.3 情感改善建议
- 具体的、可操作的改善建议

## 六、行动建议
| 优先级 | 行动建议 | 问题描述 | 解决方案 | 预期效果 | 实施难度 | 投入产出比 |
|--------|----------|----------|----------|----------|----------|-----------|
| 高 | 建议1 | ... | ... | ... | ... | ... |
| 中 | 建议2 | ... | ... | ... | ... | ... |

## 七、总结
- 总结最重要的洞察
- 强调最关键的行动建议
- 展望未来的机会和挑战

请确保分析深入、洞察有力、建议具体可行。`;
}