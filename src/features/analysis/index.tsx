"use client";

import { useState } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { useDeepInsights } from "./hooks/useDeepInsights";
import { KeywordCloud } from "./components/KeywordCloud";
import { SentimentChart } from "./components/SentimentChart";
import { InsightCard } from "./components/InsightCard";
import { CommentList } from "./components/CommentList";
import { AnalysisProgress } from "./components/AnalysisProgress";
import { DeepInsights } from "./components/DeepInsights";
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
  const {
    session,
    startAnalysis,
    cancelAnalysis,
    resetAnalysis,
    exportResult,
    exportToExcel,
    exportResultFull,
    exportToExcelFull,
    loadMoreComments,
    hasMoreComments,
    isLoadingMoreComments,
  } = useAnalysis();
  const { session: deepInsightSession, generateDeepInsights, cancelGeneration: cancelDeepInsight, resetSession: resetDeepInsight } =
    useDeepInsights();
  const [activeTab, setActiveTab] = useState<string>("keywords");
  const [selectedSentiment, setSelectedSentiment] = useState<
    "all" | "positive" | "negative" | "neutral"
  >("all");
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const handleStartAnalysis = async () => {
    await startAnalysis(selectedTopics);
  };

  // 通用服务端导出函数
  const serverExport = async (content: string, filename: string, format: string) => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename, format }),
      });
      if (!response.ok) throw new Error('导出失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  const handleExportJson = async () => {
    const data = await exportResultFull("json");
    if (data) {
      const filename = `reddit-insight-analysis-${Date.now()}.json`;
      await serverExport(data, filename, 'json');
    }
  };

  const handleExportCsv = async () => {
    const data = await exportResultFull("csv");
    if (data) {
      const filename = `reddit-insight-keywords-${Date.now()}.csv`;
      await serverExport(data, filename, 'txt'); // CSV 用 txt 格式处理
    }
  };

  const handleExportExcel = async () => {
    const blob = await exportToExcelFull(allSearchResults);
    if (blob) {
      // Excel 是二进制格式，需要特殊处理
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const filename = `reddit-insight-analysis-${Date.now()}.xlsx`;
        try {
          const response = await fetch('/api/export/excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, filename }),
          });
          if (!response.ok) throw new Error('导出失败');
          const resultBlob = await response.blob();
          const url = window.URL.createObjectURL(resultBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Excel导出失败:', error);
          alert('Excel导出失败，请重试');
        }
      };
      reader.readAsDataURL(blob);
    }
  };

  const hasAnalysisResult =
    session?.status === "completed" && session.result;

  return (
    <div className={className} aria-label="分析仪表盘">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground mb-1.5">
          评论分析
        </h2>
        <p className="text-muted-foreground text-sm">
          对选中主题的评论进行深度分析，发现用户痛点和需求洞察
        </p>
      </div>

      {/* 时段提示 */}
      {selectedTopics.length > 0 && !session && (
        <TimePeriodTip />
      )}

      {selectedTopics.length > 0 && !session && (
        <Card className="mb-6 border-l-2 border-l-primary shadow-sm">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
            <div>
              <p className="font-semibold text-foreground text-lg">
                已选择 {selectedTopics.length} 个主题待分析
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                点击"开始分析"按钮获取评论数据并进行分析
              </p>
            </div>
            <Button
              onClick={handleStartAnalysis}
              variant="primary"
              size="lg"
            >
              <Play className="mr-2 h-4 w-4" />
              开始分析
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedTopics.length === 0 && !session && (
        <div className="mb-6 p-12 text-center bg-muted/20 rounded-lg border-2 border-dashed border-border">
          <p className="text-muted-foreground text-lg">
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
                className="border-red-900/50 text-destructive hover:bg-destructive/10"
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
          {session.result.fetchStats?.source === "legacy" && (
            <Alert className="mb-2">
              <Info className="h-4 w-4" />
              <AlertTitle>提示</AlertTitle>
              <AlertDescription>
                当前结果来自本地回退链路（legacy）。该模式通常只抓取基础页评论，可能不如 Jobs 模式完整；建议稍后重试以获取更完整的折叠评论。
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {session.result.fetchStats && (
                <>
                  <Badge variant="outline" className="h-8 text-muted-foreground">
                    帖子总评论 {session.result.fetchStats.totalAvailable}
                  </Badge>
                  <Badge variant="outline" className="h-8 text-muted-foreground">
                    已抓取 {session.result.fetchStats.rawFetched}
                  </Badge>
                  <Badge variant="outline" className="h-8 text-muted-foreground">
                    已分析 {session.result.fetchStats.analyzedComments}
                  </Badge>
                  {session.result.fetchStats.completionGap > 0 && (
                    <Badge variant="warning" className="h-8">
                      缺口 {session.result.fetchStats.completionGap}
                    </Badge>
                  )}
                </>
              )}

              <Badge variant="outline" className="h-8 text-muted-foreground">
                {session.topics.length} 个主题
              </Badge>
              <Badge variant="outline" className="h-8 text-muted-foreground">
                {session.result.fetchStats?.analyzedComments ?? session.result.comments.length} 条评论
              </Badge>
              <Badge variant="outline" className="h-8 text-muted-foreground">
                {session.result.keywords.length} 个关键词
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4">
              <TabsTrigger value="keywords">关键词</TabsTrigger>
              <TabsTrigger value="sentiment">情感</TabsTrigger>
              <TabsTrigger value="insights">洞察</TabsTrigger>
              <TabsTrigger value="deep-insights">AI深度洞见</TabsTrigger>
              <TabsTrigger value="comments">评论</TabsTrigger>
            </TabsList>

            <div className="mt-4">
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

              <TabsContent value="deep-insights" className="space-y-4">
                <DeepInsights
                  session={deepInsightSession}
                  onGenerate={generateDeepInsights}
                  onCancel={cancelDeepInsight}
                  onReset={resetDeepInsight}
                  topics={selectedTopics}
                  analysisResult={session?.result || null}
                />
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
                        hasMore={hasMoreComments}
                        isLoadingMore={isLoadingMoreComments}
                        onLoadMore={loadMoreComments}
                        totalCount={session.result.fetchStats?.analyzedComments}
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

  // 根据状态选择颜色，减少大面积黄底，使用白底+边框强调
  const getAlertStyle = () => {
    switch (timeStatus.status) {
      case "peak":
        return "border-amber-200 bg-amber-50 text-amber-950 border-l-2 border-l-amber-500 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100";
      case "transition":
        return "border-orange-200 bg-orange-50 text-orange-950 border-l-2 border-l-primary dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100";
      default:
        return "border-emerald-200 bg-emerald-50 text-emerald-950 border-l-2 border-l-emerald-500 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100";
    }
  };

  // 根据状态选择图标
  const getIcon = () => {
    switch (timeStatus.status) {
      case "peak":
        return <Moon className="h-5 w-5" aria-hidden="true" />;
      case "transition":
        return <Sunset className="h-5 w-5" aria-hidden="true" />;
      default:
        return <Sun className="h-5 w-5" aria-hidden="true" />;
    }
  };

  return (
    <div className={`mb-4 rounded-lg border p-4 shadow-sm ${getAlertStyle()}`}>
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
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="关闭提示"
              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-current/80 hover:bg-black/5 hover:text-current dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
