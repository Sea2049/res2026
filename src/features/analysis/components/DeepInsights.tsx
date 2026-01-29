import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, AlertCircle, Download, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import type { DeepInsightSession, SearchResult, AnalysisResult } from "@/lib/types";

/**
 * DeepInsights 组件 Props 接口
 */
interface DeepInsightsProps {
  /**
   * 深度洞见会话状态
   */
  session: DeepInsightSession | null;
  /**
   * 开始生成深度洞见
   * @param topics 搜索结果列表
   * @param analysisResult 分析结果
   */
  onGenerate: (topics: SearchResult[], analysisResult: AnalysisResult) => Promise<void>;
  /**
   * 取消生成
   */
  onCancel: () => void;
  /**
   * 重置会话
   */
  onReset: () => void;
  /**
   * 额外的类名
   */
  className?: string;
  /**
   * 搜索结果列表（用于生成）
   */
  topics: SearchResult[];
  /**
   * 分析结果（用于生成）
   */
  analysisResult: AnalysisResult | null;
}

/**
 * 简单的Markdown渲染组件
 * @param content Markdown内容
 * @returns 渲染后的JSX元素
 */
function SimpleMarkdownRenderer({ content }: { content: string }) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  const lines = content.split("\n");
  const renderedContent: JSX.Element[] = [];
  let currentSection: string[] = [];
  let currentSectionIndex = 0;
  let inCodeBlock = false;

  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        currentSection.push(line);
      } else {
        currentSection.push(line);
        renderedContent.push(
          <pre key={`code-${i}`} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4 text-sm">
            <code>{currentSection.join("\n")}</code>
          </pre>
        );
        currentSection = [];
      }
      continue;
    }

    if (inCodeBlock) {
      currentSection.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      if (currentSection.length > 0) {
        renderedContent.push(
          <div key={`section-${i}`} className="mb-6">
            {currentSection.map((l, idx) => (
              <p key={idx} className="mb-2 text-gray-700">{l}</p>
            ))}
          </div>
        );
        currentSection = [];
      }
      renderedContent.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold mb-4 mt-6 text-gray-900">
          {line.replace("# ", "")}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      if (currentSection.length > 0) {
        renderedContent.push(
          <div key={`section-${i}`} className="mb-6">
            {currentSection.map((l, idx) => (
              <p key={idx} className="mb-2 text-gray-700">{l}</p>
            ))}
          </div>
        );
        currentSection = [];
      }
      renderedContent.push(
        <h2 key={`h2-${i}`} className="text-xl font-semibold mb-3 mt-5 text-gray-800">
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      if (currentSection.length > 0) {
        renderedContent.push(
          <div key={`section-${i}`} className="mb-4">
            {currentSection.map((l, idx) => (
              <p key={idx} className="mb-2 text-gray-700">{l}</p>
            ))}
          </div>
        );
        currentSection = [];
      }
      renderedContent.push(
        <h3 key={`h3-${i}`} className="text-lg font-medium mb-2 mt-4 text-gray-800">
          {line.replace("### ", "")}
        </h3>
      );
    } else if (line.startsWith("|") && line.endsWith("|")) {
      if (currentSection.length > 0) {
        renderedContent.push(
          <div key={`section-${i}`} className="mb-4">
            {currentSection.map((l, idx) => (
              <p key={idx} className="mb-2 text-gray-700">{l}</p>
            ))}
          </div>
        );
        currentSection = [];
      }
      renderedContent.push(
        <div key={`table-${i}`} className="my-4 overflow-x-auto">
          <table className="min-w-full border-collapse">
            <tbody>
              <tr key={i}>
                {line.split("|").filter(cell => cell.trim()).map((cell, idx) => (
                  <td key={idx} className="border border-gray-300 px-4 py-2 text-sm font-semibold bg-gray-50">
                    {cell.trim()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      );
    } else if (line.startsWith("- ")) {
      if (currentSection.length > 0) {
        renderedContent.push(
          <div key={`section-${i}`} className="mb-4">
            {currentSection.map((l, idx) => (
              <p key={idx} className="mb-2 text-gray-700">{l}</p>
            ))}
          </div>
        );
        currentSection = [];
      }
      renderedContent.push(
        <li key={`li-${i}`} className="mb-2 ml-4 text-gray-700">
          {line.replace("- ", "")}
        </li>
      );
    } else if (line.trim() === "") {
      if (currentSection.length > 0) {
        renderedContent.push(
          <div key={`section-${i}`} className="mb-4">
            {currentSection.map((l, idx) => (
              <p key={idx} className="mb-2 text-gray-700">{l}</p>
            ))}
          </div>
        );
        currentSection = [];
      }
    } else {
      currentSection.push(line);
    }
  }

  if (currentSection.length > 0) {
    renderedContent.push(
      <div key={`section-final`} className="mb-4">
        {currentSection.map((l, idx) => (
          <p key={idx} className="mb-2 text-gray-700">{l}</p>
        ))}
      </div>
    );
  }

  return <div className="prose prose-sm max-w-none">{renderedContent}</div>;
}

/**
 * 深度洞见组件
 * 展示AI生成的深度分析报告
 */
export function DeepInsights({
  session,
  onGenerate,
  onCancel,
  onReset,
  className,
  topics,
  analysisResult,
}: DeepInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!analysisResult || topics.length === 0) return;
    await onGenerate(topics, analysisResult);
  };

  /**
   * 生成时间戳文件名
   */
  const generateFileName = () => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return `AI-Deep-Insights-Report-${dateStr}-${timeStr}.pdf`;
  };

  /**
   * 将 Markdown 转换为 HTML（逐行处理，支持表格）
   */
  const markdownToHtml = (markdown: string): string => {
    const lines = markdown.split('\n');
    const htmlLines: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let isHeaderRow = true;
    
    const processTableCell = (cell: string) => {
      return cell.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    };
    
    const flushTable = () => {
      if (tableRows.length === 0) return;
      
      let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11px;">';
      
      tableRows.forEach((row, rowIndex) => {
        tableHtml += '<tr>';
        row.forEach((cell) => {
          if (rowIndex === 0) {
            // 表头
            tableHtml += `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: 600; text-align: left;">${processTableCell(cell)}</th>`;
          } else {
            // 表格内容
            tableHtml += `<td style="border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top;">${processTableCell(cell)}</td>`;
          }
        });
        tableHtml += '</tr>';
      });
      
      tableHtml += '</table>';
      htmlLines.push(tableHtml);
      tableRows = [];
      isHeaderRow = true;
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 检测表格行（以 | 开头和结尾）
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        // 检查是否是分隔行（如 |---|---|---|）
        if (/^\|[\s\-:|]+\|$/.test(trimmedLine)) {
          // 这是表头和内容之间的分隔行，跳过
          isHeaderRow = false;
          continue;
        }
        
        inTable = true;
        // 解析表格单元格
        const cells = trimmedLine
          .slice(1, -1) // 移除首尾的 |
          .split('|')
          .map(cell => cell.trim());
        tableRows.push(cells);
      } else {
        // 不是表格行，如果之前在表格中则输出表格
        if (inTable) {
          flushTable();
          inTable = false;
        }
        
        if (trimmedLine === '') {
          htmlLines.push('<div style="height: 8px;"></div>');
        } else if (trimmedLine === '---') {
          htmlLines.push('<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;">');
        } else if (trimmedLine.startsWith('### ')) {
          const text = trimmedLine.slice(4);
          htmlLines.push(`<h3 style="font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; color: #1a1a1a;">${text}</h3>`);
        } else if (trimmedLine.startsWith('## ')) {
          const text = trimmedLine.slice(3);
          htmlLines.push(`<h2 style="font-size: 16px; font-weight: 600; margin: 20px 0 10px 0; color: #1a1a1a;">${text}</h2>`);
        } else if (trimmedLine.startsWith('# ')) {
          const text = trimmedLine.slice(2);
          htmlLines.push(`<h1 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: #1a1a1a;">${text}</h1>`);
        } else if (trimmedLine.startsWith('- ')) {
          const text = trimmedLine.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          htmlLines.push(`<div style="margin: 6px 0 6px 16px; line-height: 1.6; color: #333;">• ${text}</div>`);
        } else {
          const text = trimmedLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          htmlLines.push(`<p style="margin: 8px 0; line-height: 1.6; color: #333;">${text}</p>`);
        }
      }
    }
    
    // 处理末尾可能存在的表格
    if (inTable) {
      flushTable();
    }
    
    return htmlLines.join('\n');
  };

  /**
   * 下载 PDF（使用浏览器打印功能，最可靠的方案）
   */
  const handleDownloadPdf = async () => {
    if (!session?.result?.content) return;
    
    setIsExporting(true);
    try {
      const filename = generateFileName();
      const contentHtml = markdownToHtml(session.result.content);
      
      // 创建一个新窗口用于打印
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        alert('请允许弹出窗口以导出 PDF');
        setIsExporting(false);
        return;
      }
      
      // 写入完整的 HTML 文档
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${filename}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }
            body {
              font-family: 'Microsoft YaHei', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              color: #333;
              font-size: 11px;
              line-height: 1.5;
              padding: 15px;
              max-width: 100%;
            }
            h1 { font-size: 16px; font-weight: bold; margin: 18px 0 8px 0; color: #1a1a1a; }
            h2 { font-size: 14px; font-weight: 600; margin: 16px 0 6px 0; color: #1a1a1a; }
            h3 { font-size: 12px; font-weight: 600; margin: 12px 0 4px 0; color: #1a1a1a; }
            p { margin: 6px 0; }
            hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
            .list-item { margin: 4px 0 4px 16px; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #333; }
            .header-title { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
            .header-time { color: #666; font-size: 10px; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 9px; }
            /* 表格样式 */
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; page-break-inside: avoid; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f5f5f5; font-weight: 600; }
            tr:nth-child(even) { background: #fafafa; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              table { page-break-inside: avoid; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-title">AI 深度洞见报告</div>
            <div class="header-time">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
          </div>
          <div class="content">${contentHtml}</div>
          <div class="footer">由 Reddit Insight Tool 生成</div>
          <div class="no-print" style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center;">
            <p style="margin-bottom: 15px; font-size: 14px;">请使用浏览器的打印功能保存为 PDF：</p>
            <p style="color: #666;">按 <strong>Ctrl+P</strong> (Windows) 或 <strong>Cmd+P</strong> (Mac)</p>
            <p style="color: #666; margin-top: 10px;">在打印对话框中选择 <strong>"另存为 PDF"</strong> 或 <strong>"Microsoft Print to PDF"</strong></p>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // 等待内容加载完成后自动打开打印对话框
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败: ' + (error instanceof Error ? error.message : '请重试'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <CardTitle>AI深度洞见</CardTitle>
            </div>
            <div className="flex gap-2">
              {!session && analysisResult && (
                <Button
                  onClick={handleGenerate}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  生成深度洞见
                </Button>
              )}
              {session && session.status !== "loading" && (
                <Button
                  onClick={onReset}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新生成
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            基于通义千问(QWEN-Plus)模型的深度分析，提供用户痛点、需求趋势和行动建议
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!session && !analysisResult && (
            <div className="text-center py-12 text-gray-500">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>请先完成基础分析，然后点击"生成深度洞见"按钮</p>
            </div>
          )}

          {session && session.status === "loading" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{session.currentStep}</span>
                <span>{session.progress}%</span>
              </div>
              <Progress value={session.progress} className="w-full" />
              <div className="flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
              </div>
              <div className="text-center text-sm text-gray-500">
                AI正在分析数据，这可能需要10-30秒...
              </div>
              <Button
                onClick={onCancel}
                variant="outline"
                size="sm"
                className="w-full"
              >
                取消生成
              </Button>
            </div>
          )}

          {session && session.status === "error" && (
            <Alert variant="error" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>生成失败</AlertTitle>
              <AlertDescription>
                {session.error || "发生未知错误"}
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    variant="outline"
                    className="bg-white hover:bg-red-50 text-red-600 border-red-200"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重试
                  </Button>
                  <Button
                    onClick={onReset}
                    variant="outline"
                    size="sm"
                  >
                    关闭
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {session && session.status === "success" && session.result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    已完成
                  </span>
                  <span>
                    生成于 {new Date(session.result.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {isExpanded && (
                <div 
                  ref={reportRef}
                  className="border rounded-lg p-6 bg-white max-h-[800px] overflow-y-auto print:max-h-none print:overflow-visible"
                >
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded print:hidden">
                    <p className="text-sm font-semibold text-blue-800 mb-2">调试信息</p>
                    <p className="text-xs text-blue-700">内容长度: {session.result.content?.length || 0} 字符</p>
                  </div>
                  <SimpleMarkdownRenderer content={session.result.content} />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成PDF中...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      下载PDF报告
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}