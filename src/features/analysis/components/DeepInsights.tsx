import { useState } from "react";
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

  const handleGenerate = async () => {
    if (!analysisResult || topics.length === 0) return;
    await onGenerate(topics, analysisResult);
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
            基于GLM-4模型的深度分析，提供用户痛点、需求趋势和行动建议
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
                <div className="border rounded-lg p-6 bg-gray-50 max-h-[800px] overflow-y-auto">
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm font-semibold text-blue-800 mb-2">调试信息</p>
                    <p className="text-xs text-blue-700">内容长度: {session.result.content?.length || 0} 字符</p>
                  </div>
                  <SimpleMarkdownRenderer content={session.result.content} />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([session.result.content], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `deep-insights-${session.result.id}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  导出Markdown
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}