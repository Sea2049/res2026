/**
 * @swagger
 * /api/export/excel:
 *   post:
 *     summary: 导出 Excel 文件
 *     description: 接收 Base64 编码的 Excel 文件并返回带正确 Content-Type 的响应
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - base64
 *               - filename
 *             properties:
 *               base64:
 *                 type: string
 *                 description: Base64 编码的 Excel 文件内容
 *               filename:
 *                 type: string
 *                 description: 导出文件名
 *     responses:
 *       200:
 *         description: Excel 文件下载
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: 缺少必要参数
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

    if (!base64 || !filename) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 将 base64 转换为 Buffer
    const buffer = Buffer.from(base64, 'base64');

    // 创建响应
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-cache",
      },
    });

    return response;
  } catch (error) {
    console.error("Excel导出失败:", error);
    return NextResponse.json(
      { error: "导出失败" },
      { status: 500 }
    );
  }
}
