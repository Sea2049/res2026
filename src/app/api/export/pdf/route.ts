import { NextRequest, NextResponse } from "next/server";
import { exportRateLimiter, checkRateLimit } from "@/lib/rate-limiter";

/**
 * PDF 导出 API
 * 接收前端生成的 PDF（base64）并返回带正确文件名的响应
 */
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
