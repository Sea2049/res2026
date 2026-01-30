/**
 * @swagger
 * /api/export/pdf:
 *   post:
 *     summary: 导出 PDF 文件
 *     description: 接收 Base64 编码的 PDF 文件并返回带正确 Content-Type 的响应
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 编码的 PDF 文件内容
 *               filename:
 *                 type: string
 *                 description: 导出文件名（可选，默认自动生成）
 *     responses:
 *       200:
 *         description: PDF 文件下载
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: 缺少 PDF 数据
 *       429:
 *         description: 请求过于频繁（20次/分钟）
 *       500:
 *         description: 导出失败
 */

import { NextRequest, NextResponse } from "next/server";
import { exportRateLimiter, checkRateLimit } from "@/lib/rate-limiter";
export async function POST(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(exportRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { base64, filename } = body;

    if (!base64) {
      return NextResponse.json(
        { error: "缺少 PDF 数据" },
        { status: 400 }
      );
    }

    const finalFilename = filename || `AI-Deep-Insights-Report-${Date.now()}.pdf`;

    // 将 base64 转换为 Buffer
    const pdfBuffer = Buffer.from(base64, 'base64');

    // 返回 PDF 文件
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(finalFilename)}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF导出失败:", error);
    return NextResponse.json(
      { error: "PDF导出失败: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
