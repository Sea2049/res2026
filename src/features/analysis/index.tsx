"use client";

import { useState } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { KeywordCloud } from "./components/KeywordCloud";
import { SentimentChart } from "./components/SentimentChart";
import { InsightCard } from "./components/InsightCard";
import { CommentList } from "./components/CommentList";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { EmptyState, EmptyStateActions } from "./components/EmptyState";
import type { SearchResult, Insight } from "@/lib/types";
import { getCurrentTimeStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Download, RotateCcw, Play, AlertCircle, Info, Sun, Sunset, Moon } from "lucide-react";

/**
 * AnalysisDashboard 组件 Props 接口
 */
interface AnalysisDashboardProps {
  /**
   * 选中的主题列表
   */
  selectedTopics: SearchResult[];
  /**
   * 所有搜索结果（用于导出）
   */
  allSearchResults?: SearchResult[];
  /**
   * 选中主题变化回调
   */
  onSelectedTopicsChange?: (topics: SearchResult[]) => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 分析仪表板组件
 * 整合所有分析功能，提供完整的分析和可视化界面
 */
export function AnalysisDashboard({
  selectedTopics,
  allSearchResults = [],
  onSelectedTopicsChange,
  className,
}: AnalysisDashboardProps) {
  const { session, startAnalysis, cancelAnalysis, resetAnalysis, exportResult, exportToExcel } =
    useAnalysis();
  const [activeTab, setActiveTab] = useState<string>("keywords");
  const [selectedSentiment, setSelectedSentiment] = useState<
    "all" | "positive" | "negative" | "neutral"
  >("all");
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const handleStartAnalysis = async () => {
    await startAnalysis(selectedTopics);
  };

  const handleExportJson = () => {
    const data = exportResult("json");
    if (data) {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reddit-insight-analysis-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportCsv = () => {
    const data = exportResult("csv");
    if (data) {
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reddit-insight-keywords-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportExcel = () => {
    const blob = exportToExcel(allSearchResults);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reddit-insight-analysis-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const hasAnalysisResult =
    session?.status === "completed" && session.result;

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          评论分析
        </h2>
        <p className="text-gray-500 text-sm">
          对选中主题的评论进行深度分析，发现用户痛点和需求洞察
        </p>
      </div>

      {/* 时段提示 */}
      {selectedTopics.length > 0 && !session && (
        <TimePeriodTip />
      )}

      {selectedTopics.length > 0 && !session && (
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="font-semibold text-blue-900 text-lg">
                已选择 {selectedTopics.length} 个主题待分析
              </p>
              <p className="text-sm text-blue-700 mt-1">
                点击"开始分析"按钮获取评论数据并进行分析
              </p>
            </div>
            <Button
              onClick={handleStartAnalysis}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              <Play className="mr-2 h-4 w-4" />
              开始分析
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedTopics.length === 0 && !session && (
        <div className="mb-6 p-12 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg">
            请先在左侧"主题筛选"中选择要分析的主题
          </p>
        </div>
      )}

      {session && session.status !== "completed" && session.status !== "error" && (
        <AnalysisProgress session={session} onCancel={cancelAnalysis} />
      )}

      {session?.status === "error" && (
        <Alert variant="error" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>分析失败</AlertTitle>
          <AlertDescription>
            {session.error || "发生未知错误"}
            <div className="mt-4">
              <Button
                variant="outline"
                className="bg-white hover:bg-red-50 text-red-600 border-red-200"
                onClick={() => {
                  resetAnalysis();
                  if (selectedTopics.length > 0) {
                    handleStartAnalysis();
                  }
                }}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                重试
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {hasAnalysisResult && session.result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Badge variant="outline" className="text-gray-600">
                {session.topics.length} 个主题
              </Badge>
              <Badge variant="outline" className="text-gray-600">
                {session.result.comments.length} 条评论
              </Badge>
              <Badge variant="outline" className="text-gray-600">
                {session.result.keywords.length} 个关键词
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                <Download className="mr-2 h-4 w-4" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={resetAnalysis}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重新分析
              </Button>
            </div>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="keywords">关键词</TabsTrigger>
              <TabsTrigger value="sentiment">情感</TabsTrigger>
              <TabsTrigger value="insights">洞察</TabsTrigger>
              <TabsTrigger value="comments">评论</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="keywords" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>高频关键词</CardTitle>
                    <CardDescription>
                      分析评论中出现频率最高的词汇，反映讨论焦点
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {session.result.keywords.length === 0 ? (
                      <EmptyState
                        type="no-keywords"
                        actions={EmptyStateActions.forNoKeywords(() => {
                          resetAnalysis();
                          if (selectedTopics.length > 0) {
                            handleStartAnalysis();
                          }
                        })}
                        className="py-8"
                      />
                    ) : (
                      <KeywordCloud
                        keywords={session.result.keywords}
                        maxKeywords={50}
                        onKeywordClick={(keyword) => {
                          console.log("Clicked keyword:", keyword);
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>情感分布</CardTitle>
                    <CardDescription>
                      评论的情感倾向统计，了解用户整体态度
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SentimentChart sentiment={session.result.sentiment} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {session.result.insights.length === 0 ? (
                    <div className="col-span-2">
                      <EmptyState
                        type="no-insights"
                        actions={EmptyStateActions.forNoInsights(
                          () => {
                            resetAnalysis();
                            if (selectedTopics.length > 0) {
                              handleStartAnalysis();
                            }
                          },
                          () => {
                            resetAnalysis();
                          }
                        )}
                      />
                    </div>
                  ) : (
                    session.result.insights.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        allComments={session.result?.comments}
                        isExpanded={selectedInsight?.id === insight.id}
                        onClick={() =>
                          setSelectedInsight(
                            selectedInsight?.id === insight.id
                              ? null
                              : insight
                          )
                        }
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>评论列表</CardTitle>
                    <CardDescription>
                      查看原始评论内容，支持按情感筛选
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {session.result.comments.length === 0 ? (
                      <EmptyState
                        type="no-comments"
                        actions={EmptyStateActions.forNoComments(
                          () => {
                            resetAnalysis();
                            if (selectedTopics.length > 0) {
                              handleStartAnalysis();
                            }
                          },
                          () => {
                            resetAnalysis();
                          }
                        )}
                        className="py-8"
                      />
                    ) : (
                      <CommentList
                        comments={session.result.comments}
                        selectedSentiment={selectedSentiment}
                        onSentimentChange={setSelectedSentiment}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}

/**
 * 时段提示组件
 * 根据当前时段显示不同的建议和提示
 */
function TimePeriodTip() {
  const timeStatus = getCurrentTimeStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  // 根据状态选择颜色
  const getAlertStyle = () => {
    switch (timeStatus.status) {
      case "peak":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "transition":
        return "bg-blue-50 border-blue-200 text-blue-800";
      default:
        return "bg-green-50 border-green-200 text-green-800";
    }
  };

  // 根据状态选择图标
  const getIcon = () => {
    switch (timeStatus.status) {
      case "peak":
        return <Moon className="h-5 w-5" />;
      case "transition":
        return <Sunset className="h-5 w-5" />;
      default:
        return <Sun className="h-5 w-5" />;
    }
  };

  return (
    <div className={`mb-4 p-4 rounded-lg border ${getAlertStyle()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm">
              {timeStatus.label}
            </p>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs opacity-60 hover:opacity-100 transition-opacity"
            >
              知道了
            </button>
          </div>
          <p className="text-sm mt-1 opacity-90">
            {timeStatus.description}
          </p>
          <ul className="mt-2 space-y-1">
            {timeStatus.recommendations.map((rec, index) => (
              <li key={index} className="text-xs flex items-start gap-1.5">
                <span className="text-current opacity-50">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
