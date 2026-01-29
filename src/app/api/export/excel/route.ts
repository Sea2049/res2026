import { NextRequest, NextResponse } from "next/server";

/**
 * Excel 导出 API
 * 接收 base64 编码的 Excel 文件并返回
 */
export async function POST(request: NextRequest) {
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
