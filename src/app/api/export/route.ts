/**
 * @swagger
 * /api/export:
 *   post:
 *     summary: 导出文本文件
 *     description: 将内容导出为 Markdown、TXT 或 JSON 文件，自动添加 UTF-8 BOM
 *     tags: [Export]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - filename
 *             properties:
 *               content:
 *                 type: string
 *                 description: 文件内容（最大10MB）
 *                 maxLength: 10485760
 *               filename:
 *                 type: string
 *                 description: 文件名（不含路径遍历符号）
 *               format:
 *                 type: string
 *                 enum: [md, txt, json]
 *                 description: 导出格式
 *                 default: txt
 *     responses:
 *       200:
 *         description: 文件下载
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 *           text/plain:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: 参数验证失败
 *       429:
 *         description: 请求过于频繁（20次/分钟）
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  validateFilename, 
  validateExportFormat,
  validateNonEmptyString,
  VALID_EXPORT_FORMATS 
} from "@/lib/validators";
import { exportRateLimiter, checkRateLimit } from "@/lib/rate-limiter";
export async function POST(request: NextRequest) {
  // 限流检查
  const rateLimitResponse = checkRateLimit(exportRateLimiter, request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { content, filename, format } = body;

    // 验证 content
    if (!validateNonEmptyString(content, 10 * 1024 * 1024)) { // 最大 10MB
      return NextResponse.json(
        { error: "缺少内容或内容过大（最大10MB）" },
        { status: 400 }
      );
    }

    // 验证 filename
    if (!validateFilename(filename)) {
      return NextResponse.json(
        { error: "文件名无效（不允许包含特殊字符或路径遍历符号）" },
        { status: 400 }
      );
    }

    // 验证 format
    if (format && !validateExportFormat(format)) {
      return NextResponse.json(
        { error: `导出格式无效。可选值: ${VALID_EXPORT_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // 根据格式设置 Content-Type
    let contentType = "text/plain; charset=utf-8";
    let finalFilename = filename;

    switch (format) {
      case "md":
        contentType = "text/markdown; charset=utf-8";
        if (!finalFilename.endsWith(".md")) {
          finalFilename += ".md";
        }
        break;
      case "txt":
        contentType = "text/plain; charset=utf-8";
        if (!finalFilename.endsWith(".txt")) {
          finalFilename += ".txt";
        }
        break;
      case "json":
        contentType = "application/json; charset=utf-8";
        if (!finalFilename.endsWith(".json")) {
          finalFilename += ".json";
        }
        break;
      default:
        contentType = "text/plain; charset=utf-8";
        if (!finalFilename.endsWith(".txt")) {
          finalFilename += ".txt";
        }
    }

    // 添加 UTF-8 BOM 以确保中文正确显示
    const BOM = "\uFEFF";
    const fileContent = BOM + content;

    // 创建响应，设置正确的 headers
    const response = new NextResponse(fileContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(finalFilename)}`,
        "Cache-Control": "no-cache",
      },
    });

    return response;
  } catch (error) {
    console.error("导出文件失败:", error);
    return NextResponse.json(
      { error: "导出失败" },
      { status: 500 }
    );
  }
}
