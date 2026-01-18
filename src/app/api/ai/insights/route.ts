import { NextRequest, NextResponse } from "next/server";
import { zhipuAI } from "@/lib/ai/zhipu-ai";
import { generateInsightPrompt } from "@/lib/ai/prompts";
import type { AnalysisResult, SearchResult } from "@/lib/types";

/**
 * 请求体验证接口
 */
interface GenerateInsightsRequest {
  topics: SearchResult[];
  analysisResult: AnalysisResult;
  exportData?: {
    keywords: any[];
    sentiments: any;
    insights: any[];
    comments: any[];
  };
}

/**
 * 深度洞见API路由
 * POST /api/ai/insights
 * 接收分析结果数据，调用GLM-4生成深度洞见
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateInsightsRequest = await request.json();

    const { topics, analysisResult, exportData } = body;

    if (!analysisResult || !topics) {
      return NextResponse.json(
        { error: "缺少必要参数：analysisResult 和 topics" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "智谱AI API密钥未配置" },
        { status: 500 }
      );
    }

    const prompt = generateInsightPrompt({
      topics,
      analysisResult,
      exportData
    });

    const aiResponse = await zhipuAI.chatCompletion({
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
      model: "glm-4.7",
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