import { NextRequest, NextResponse } from "next/server";

/**
 * 导出文件 API
 * 通过服务端返回文件，确保文件名和格式正确
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filename, format } = body;

    if (!content || !filename) {
      return NextResponse.json(
        { error: "缺少必要参数" },
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
