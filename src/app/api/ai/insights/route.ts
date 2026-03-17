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
import { zhipuAI } from "@/lib/ai/zhipu-ai";
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

    const qwenApiKey = process.env.QWEN_API_KEY;
    const zhipuApiKey = process.env.ZHIPU_API_KEY;

    if (!qwenApiKey && !zhipuApiKey) {
      return NextResponse.json(
        { error: "AI API密钥未配置，请设置 QWEN_API_KEY 或 ZHIPU_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    const prompt = generateInsightPrompt({
      topics,
      analysisResult,
      exportData
    });

    const messages: Parameters<typeof qwenAI.chatCompletion>[0]["messages"] = [
      {
        role: "system",
        content: "你是一位顶级商业分析师和用户洞察专家，擅长从海量用户反馈中发现关键问题、隐藏机会和战略洞察。你的分析必须尖锐、直接、一针见血。禁止泛泛而谈，禁止车轱辘话，禁止不痛不痒的结论。每个结论都必须有数据支撑，每个建议都必须可执行。你的用户是追求真相和执行力的决策者，不是来听漂亮话的。"
      },
      {
        role: "user",
        content: prompt
      }
    ];

    let aiResponse: string;
    let usedFallback = false;

    if (qwenApiKey) {
      try {
        aiResponse = await qwenAI.chatCompletion({
          apiKey: qwenApiKey,
          messages,
          model: "qwen3.5-plus",
          temperature: 0.5,
          maxTokens: 10000
        });
      } catch (qwenError) {
        if (!zhipuApiKey) {
          throw qwenError;
        }
        console.warn("Qwen AI 失败，降级到 Zhipu AI:", qwenError instanceof Error ? qwenError.message : qwenError);
        aiResponse = await zhipuAI.chatCompletion({
          apiKey: zhipuApiKey,
          messages,
          model: "glm-4",
          temperature: 0.5,
          maxTokens: 8000
        });
        usedFallback = true;
      }
    } else {
      aiResponse = await zhipuAI.chatCompletion({
        apiKey: zhipuApiKey!,
        messages,
        model: "glm-4",
        temperature: 0.5,
        maxTokens: 8000
      });
      usedFallback = true;
    }

    console.log("AI响应长度:", aiResponse.length);
    console.log("AI响应前500字符:", aiResponse.substring(0, 500));

    return NextResponse.json({
      success: true,
      data: aiResponse,
      ...(usedFallback && { _fallback: true })
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