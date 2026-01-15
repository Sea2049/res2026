"use client";

import { useState } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { KeywordCloud } from "./components/KeywordCloud";
import { SentimentChart } from "./components/SentimentChart";
import { InsightCard } from "./components/InsightCard";
import { CommentList } from "./components/CommentList";
import { AnalysisProgress } from "./components/AnalysisProgress";
import type { SearchResult, Insight } from "@/lib/types";

/**
 * AnalysisDashboard 组件 Props 接口
 */
interface AnalysisDashboardProps {
  /**
   * 已选主题列表
   */
  selectedTopics: SearchResult[];
  /**
   * 已选主题变化回调
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
  onSelectedTopicsChange,
  className,
}: AnalysisDashboardProps) {
  const { session, startAnalysis, cancelAnalysis, resetAnalysis, exportResult } =
    useAnalysis();
  const [activeTab, setActiveTab] = useState<
    "keywords" | "sentiment" | "insights" | "comments"
  >("keywords");
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

  const tabs = [
    { id: "keywords", label: "关键词", icon: "🏷️" },
    { id: "sentiment", label: "情感分布", icon: "📊" },
    { id: "insights", label: "洞察", icon: "💡" },
    { id: "comments", label: "评论", icon: "💬" },
  ];

  const hasAnalysisResult =
    session?.status === "completed" && session.result;

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          评论分析
        </h2>
        <p className="text-gray-600 text-sm">
          对选中主题的评论进行深度分析，发现用户痛点和需求洞察
        </p>
      </div>

      {selectedTopics.length > 0 && !session && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">
                已选择 {selectedTopics.length} 个主题待分析
              </p>
              <p className="text-sm text-blue-700 mt-1">
                点击"开始分析"按钮获取评论数据并进行分析
              </p>
            </div>
            <button
              onClick={handleStartAnalysis}
              className="px-6 py-2 bg-reddit-orange text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              开始分析
            </button>
          </div>
        </div>
      )}

      {selectedTopics.length === 0 && !session && (
        <div className="mb-6 p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">
            请先在"主题筛选"中选择要分析的主题
          </p>
        </div>
      )}

      {session && session.status !== "completed" && (
        <AnalysisProgress session={session} onCancel={cancelAnalysis} />
      )}

      {hasAnalysisResult && session.result && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <span className="mr-1">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                导出 JSON
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                导出 CSV
              </button>
              <button
                onClick={resetAnalysis}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                重新分析
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeTab === "keywords" && (
              <div className="lg:col-span-2">
                <KeywordCloud
                  keywords={session.result.keywords}
                  maxKeywords={40}
                  onKeywordClick={(keyword) => {
                    console.log("Clicked keyword:", keyword);
                  }}
                />
              </div>
            )}

            {activeTab === "sentiment" && (
              <div className="lg:col-span-2">
                <SentimentChart sentiment={session.result.sentiment} />
              </div>
            )}

            {activeTab === "insights" && (
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    分析洞察 (
                    {session.result.insights.length > 0
                      ? session.result.insights.length
                      : 0}
                    )
                  </h3>
                  {session.result.insights.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      未检测到明显的用户痛点或需求洞察
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {session.result.insights.slice(0, 6).map((insight) => (
                        <InsightCard
                          key={insight.id}
                          insight={insight}
                          isExpanded={selectedInsight?.id === insight.id}
                          onClick={() =>
                            setSelectedInsight(
                              selectedInsight?.id === insight.id
                                ? null
                                : insight
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "comments" && (
              <div className="lg:col-span-2">
                <CommentList
                  comments={session.result.comments}
                  selectedSentiment={selectedSentiment}
                  onSentimentChange={setSelectedSentiment}
                />
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">分析统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">分析主题数</span>
                <p className="font-semibold text-gray-900">
                  {session.topics.length}
                </p>
              </div>
              <div>
                <span className="text-gray-500">评论总数</span>
                <p className="font-semibold text-gray-900">
                  {session.result.comments.length}
                </p>
              </div>
              <div>
                <span className="text-gray-500">关键词数</span>
                <p className="font-semibold text-gray-900">
                  {session.result.keywords.length}
                </p>
              </div>
              <div>
                <span className="text-gray-500">洞察数</span>
                <p className="font-semibold text-gray-900">
                  {session.result.insights.length}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {session?.status === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-900">分析失败</p>
              <p className="text-sm text-red-700 mt-1">
                {session.error || "发生未知错误"}
              </p>
            </div>
            <button
              onClick={() => {
                resetAnalysis();
                if (selectedTopics.length > 0) {
                  handleStartAnalysis();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              重试
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
