/**
 * 产品吸引力评估API端点
 * v2.6.0 新增 - 基于 product-appeal-analyzer skill
 * POST /api/analysis/appeal
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectionType } from "@/lib/types";
import type { Comment, AppealScore } from "@/lib/types";
import {
  detectIdentitySignals,
  detectObjectionTypes,
} from "@/features/analysis/utils/sentiment-patterns";
import { analysisRateLimiter, checkRateLimit } from "@/lib/rate-limiter";

/**
 * POST - 计算产品吸引力评分
 */
export async function POST(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(analysisRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { comments } = body;

    // 验证输入
    if (!comments || !Array.isArray(comments)) {
      return NextResponse.json(
        { error: "Invalid request: comments array is required" },
        { status: 400 }
      );
    }

    if (comments.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: comments array cannot be empty" },
        { status: 400 }
      );
    }

    // 计算吸引力评分
    const appealScore = calculateAppealScore(comments as Comment[]);

    return NextResponse.json({ appealScore });
  } catch (error) {
    console.error("Appeal analysis error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze product appeal",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 计算产品吸引力评分
 */
function calculateAppealScore(comments: Comment[]): AppealScore {
  const allText = comments.map(c => c.body).join(" ");
  
  // 1. 身份契合度 (Identity Fit)
  const identitySignals = detectIdentitySignals(allText);
  const identityFit = calculateIdentityFit(comments, identitySignals);
  
  // 2. 问题紧急度 (Problem Urgency)  
  const problemUrgency = calculateProblemUrgency(comments);
  
  // 3. 信任信号 (Trust Signals)
  const trustSignals = calculateTrustSignals(comments);
  
  // 4. 综合评分
  const overall = (identityFit + problemUrgency + trustSignals) / 3;
  
  // 5. 检测反对意见
  const objectionMap = new Map<ObjectionType, { count: number; examples: string[] }>();
  
  for (const comment of comments) {
    const objections = detectObjectionTypes(comment.body);
    for (const objection of objections) {
      const key = objection as ObjectionType;
      if (!objectionMap.has(key)) {
        objectionMap.set(key, { count: 0, examples: [] });
      }
      const data = objectionMap.get(key)!;
      data.count++;
      if (data.examples.length < 3) {
        data.examples.push(comment.body);
      }
    }
  }
  
  const objections = Array.from(objectionMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    examples: data.examples,
  }));
  
  // 6. 生成改进建议
  const recommendations = generateRecommendations(
    identityFit,
    problemUrgency,
    trustSignals,
    objections
  );
  
  // 7. 提取目标用户画像
  const targetPersonas = identitySignals.slice(0, 5);
  
  return {
    identityFit: Math.round(identityFit * 10) / 10,
    problemUrgency: Math.round(problemUrgency * 10) / 10,
    trustSignals: Math.round(trustSignals * 10) / 10,
    overall: Math.round(overall * 10) / 10,
    recommendations,
    targetPersonas,
    objections,
  };
}

/**
 * 计算身份契合度 (0-10)
 */
function calculateIdentityFit(
  comments: Comment[],
  identitySignals: string[]
): number {
  // 基础分数
  let score = 5.0;
  
  // 有明确身份信号，加分
  if (identitySignals.length > 0) {
    score += Math.min(identitySignals.length * 0.5, 3);
  }
  
  // 检查正面身份表达
  const positiveIdentityCount = comments.filter(c =>
    /\b(perfect for|exactly what I need|as a .* this is great)\b/i.test(c.body)
  ).length;
  
  score += Math.min(positiveIdentityCount * 0.3, 2);
  
  // 检查负面身份表达
  const negativeIdentityCount = comments.filter(c =>
    /\b(not for me|not my thing|designed for)\b/i.test(c.body)
  ).length;
  
  score -= Math.min(negativeIdentityCount * 0.3, 2);
  
  return Math.max(0, Math.min(10, score));
}

/**
 * 计算问题紧急度 (0-10)
 */
function calculateProblemUrgency(comments: Comment[]): number {
  let score = 5.0;
  
  // 检查紧急关键词
  const urgentKeywords = [
    'urgent', 'critical', 'asap', 'immediately', 'now',
    'desperately', 'must have', 'need this'
  ];
  
  let urgentCount = 0;
  for (const comment of comments) {
    const lowerBody = comment.body.toLowerCase();
    for (const keyword of urgentKeywords) {
      if (lowerBody.includes(keyword)) {
        urgentCount++;
        break;
      }
    }
  }
  
  score += Math.min((urgentCount / comments.length) * 10, 3);
  
  // 检查痛点描述
  const painPointCount = comments.filter(c =>
    /\b(problem|issue|pain|frustrat|annoying|struggle)\b/i.test(c.body)
  ).length;
  
  score += Math.min((painPointCount / comments.length) * 8, 2);
  
  return Math.max(0, Math.min(10, score));
}

/**
 * 计算信任信号 (0-10)
 */
function calculateTrustSignals(comments: Comment[]): number {
  let score = 5.0;
  
  // 检查正面信任信号
  const trustKeywords = [
    'trust', 'reliable', 'legit', 'recommend', 'worth it',
    'love', 'amazing', 'great', 'excellent'
  ];
  
  let trustCount = 0;
  for (const comment of comments) {
    const lowerBody = comment.body.toLowerCase();
    for (const keyword of trustKeywords) {
      if (lowerBody.includes(keyword)) {
        trustCount++;
        break;
      }
    }
  }
  
  score += Math.min((trustCount / comments.length) * 10, 3);
  
  // 检查负面信任信号
  const distrustKeywords = [
    'scam', 'fake', 'sketchy', 'suspicious', 'dont trust',
    'unreliable', 'waste of money'
  ];
  
  let distrustCount = 0;
  for (const comment of comments) {
    const lowerBody = comment.body.toLowerCase();
    for (const keyword of distrustKeywords) {
      if (lowerBody.includes(keyword)) {
        distrustCount++;
        break;
      }
    }
  }
  
  score -= Math.min((distrustCount / comments.length) * 10, 3);
  
  return Math.max(0, Math.min(10, score));
}

/**
 * 生成改进建议
 */
function generateRecommendations(
  identityFit: number,
  problemUrgency: number,
  trustSignals: number,
  objections: AppealScore["objections"]
): string[] {
  const recommendations: string[] = [];
  
  // 基于评分维度生成建议
  if (identityFit < 6) {
    recommendations.push("明确目标用户画像，在营销材料中使用他们的语言和场景");
  }
  
  if (problemUrgency < 6) {
    recommendations.push("强调用户痛点和问题的严重性，突出解决方案的紧迫性");
  }
  
  if (trustSignals < 6) {
    recommendations.push("增加社会证明：客户评价、案例研究、行业认可");
  }
  
  // 基于反对意见生成建议
  const objectionTypes = objections.map(o => o.type);
  
  if (objectionTypes.includes(ObjectionType.VALUE)) {
    recommendations.push("清晰展示ROI和价值主张，提供定价透明度");
  }
  
  if (objectionTypes.includes(ObjectionType.COMPLEXITY)) {
    recommendations.push("简化入门体验，提供交互式演示或免费试用");
  }
  
  if (objectionTypes.includes(ObjectionType.RISK)) {
    recommendations.push("提供退款保证或免费试用期，降低用户尝试风险");
  }
  
  // 如果所有维度都很好
  if (identityFit >= 8 && problemUrgency >= 8 && trustSignals >= 8) {
    recommendations.push("产品吸引力很强！专注于扩大市场触达和优化转化漏斗");
  }
  
  return recommendations;
}

/**
 * GET - 获取API文档
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/analysis/appeal",
    method: "POST",
    description: "Analyze product appeal based on the Desirability Triangle framework",
    version: "2.6.0",
    framework: "Desirability Triangle (Identity Fit + Problem Urgency + Trust Signals)",
    requestBody: {
      comments: "Array<Comment>  // Required: Array of comments to analyze",
    },
    responseBody: {
      appealScore: {
        identityFit: "number  // 0-10 score",
        problemUrgency: "number  // 0-10 score",
        trustSignals: "number  // 0-10 score",
        overall: "number  // Average of three dimensions",
        recommendations: "string[]  // Improvement suggestions",
        targetPersonas: "string[]  // Detected user personas",
        objections: "Array<{ type, count, examples }>  // Detected objections",
      },
    },
  });
}
