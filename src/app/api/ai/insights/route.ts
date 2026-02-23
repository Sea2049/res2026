/**
 * @swagger
 * /api/ai/insights:
 *   post:
 *     summary: 生成 AI 深度洞察
 *     description: 基于分析结果调用通义千问（QWEN）生成深度洞察报告
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topics
 *               - analysisResult
 *             properties:
 *               topics:
 *                 type: array
 *                 description: 分析的主题列表（Subreddit 或 Post）
 *                 items:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Subreddit'
 *                     - $ref: '#/components/schemas/RedditPost'
 *               analysisResult:
 *                 type: object
 *                 description: NLP 分析结果
 *                 properties:
 *                   keywords:
 *                     type: array
 *                     items:
 *                       type: object
 *                   sentiment:
 *                     type: object
 *                   insights:
 *                     type: array
 *                   comments:
 *                     type: array
 *               exportData:
 *                 type: object
 *                 description: 可选的导出数据
 *     responses:
 *       200:
 *         description: AI 生成的洞察报告
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: string
 *                   description: Markdown 格式的洞察报告
 *       400:
 *         description: 缺少必要参数
 *       429:
 *         description: 请求过于频繁（10次/分钟）
 *       500:
 *         description: AI 服务错误或 API 密钥未配置
 */

import { NextRequest, NextResponse } from "next/server";
import { qwenAI } from "@/lib/ai/qwen-ai";
import { generateInsightPrompt } from "@/lib/ai/prompts";
import type { 
  AnalysisResult, 
  SearchResult, 
  KeywordCount, 
  SentimentResult, 
  Insight, 
  SentimentComment 
} from "@/lib/types";
import { aiRateLimiter, checkRateLimit } from "@/lib/rate-limiter";

/**
 * 请求体验证接口
 */
interface GenerateInsightsRequest {
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
 * 深度洞见API路由
 * POST /api/ai/insights
 * 接收分析结果数据，调用通义千问(QWEN)生成深度洞见
 */
export async function POST(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(aiRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body: GenerateInsightsRequest = await request.json();

    const { topics, analysisResult, exportData } = body;

    if (!analysisResult || !topics) {
      return NextResponse.json(
        { error: "缺少必要参数：analysisResult 和 topics" },
        { status: 400 }
      );
    }

    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "通义千问API密钥未配置" },
        { status: 500 }
      );
    }

    const prompt = generateInsightPrompt({
      topics,
      analysisResult,
      exportData
    });

    const aiResponse = await qwenAI.chatCompletion({
      apiKey,
      messages: [
        {
          role: "system",
          content: "你是一个专业的数据分析师和社区洞察专家，擅长从Reddit评论数据中发现用户痛点、需求趋势和商业机会。请进行深入分析，提供有洞察力的建议和结论。输出要完整详尽。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "qwen3.5-plus",
      temperature: 0.7,
      maxTokens: 8000
    });

    console.log("AI响应长度:", aiResponse.length);
    console.log("AI响应前500字符:", aiResponse.substring(0, 500));

    return NextResponse.json({
      success: true,
      data: aiResponse
    });

  } catch (error) {
    console.error("深度洞见生成失败:", error);

    const errorMessage = error instanceof Error ? error.message : "未知错误";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}