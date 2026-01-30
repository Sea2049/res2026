import { NextRequest, NextResponse } from "next/server";
import { 
  validateFilename, 
  validateExportFormat,
  validateNonEmptyString,
  VALID_EXPORT_FORMATS 
} from "@/lib/validators";

/**
 * 导出文件 API
 * 通过服务端返回文件，确保文件名和格式正确
 */
export async function POST(request: NextRequest) {
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
