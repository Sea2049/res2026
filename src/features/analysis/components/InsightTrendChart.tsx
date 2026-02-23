import { useMemo } from "react";
import type { Insight, InsightTrendResult } from "@/lib/types";

/**
 * InsightTrendChart 组件 Props 接口
 */
interface InsightTrendChartProps {
  /**
   * 洞察趋势结果列表
   */
  trendResults: InsightTrendResult[];
  /**
   * 洞察列表（用于显示详细信息）
   */
  insights?: Insight[];
  /**
   * 额外的类名
   */
  className?: string;
  /**
   * 高度
   */
  height?: number;
}

/**
 * 趋势图标映射
 */
const TREND_ICONS: Record<Insight["trend"], string> = {
  up: "📈",
  down: "📉",
  stable: "➡️",
};

/**
 * 趋势颜色映射
 */
const TREND_COLORS: Record<Insight["trend"], string> = {
  up: "text-green-600 bg-green-100",
  down: "text-red-600 bg-red-100",
  stable: "text-gray-600 bg-gray-100",
};

/**
 * 洞察趋势图表组件
 * 以列表形式展示洞察趋势，支持展开查看详情
 */
export function InsightTrendChart({
  trendResults,
  insights = [],
  className,
  height = 400,
}: InsightTrendChartProps) {
  // 构建洞察 ID 到洞察对象的映射
  const insightMap = useMemo(() => {
    const map = new Map<string, Insight>();
    for (const insight of insights) {
      map.set(insight.id, insight);
    }
    return map;
  }, [insights]);

  // 统计趋势分布
  const trendDistribution = useMemo(() => {
    const distribution = {
      up: trendResults.filter((r) => r.trend === "up").length,
      down: trendResults.filter((r) => r.trend === "down").length,
      stable: trendResults.filter((r) => r.trend === "stable").length,
    };
    const total = trendResults.length || 1;
    return {
      ...distribution,
      upPercentage: Math.round((distribution.up / total) * 100),
      downPercentage: Math.round((distribution.down / total) * 100),
      stablePercentage: Math.round((distribution.stable / total) * 100),
    };
  }, [trendResults]);

  // 排序趋势结果（上升的在前）
  const sortedResults = useMemo(() => {
    return [...trendResults].sort((a, b) => {
      const order = { up: 0, stable: 1, down: 2 };
      return order[a.trend] - order[b.trend];
    });
  }, [trendResults]);

  if (trendResults.length === 0) {
    return (
      <div
        className={`p-8 text-center text-gray-500 bg-gray-50 rounded-lg ${className || ""}`}
        style={{ height }}
      >
        <p>暂无趋势数据</p>
        <p className="text-sm mt-2">请先执行分析以生成洞察趋势</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className || ""}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">洞察趋势概览</h3>
        <p className="text-sm text-gray-500 mt-1">
          共 {trendResults.length} 个洞察趋势
        </p>
      </div>

      {/* 趋势分布统计 */}
      <div className="p-4 bg-gray-50 border-b" role="region" aria-label="趋势统计">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {trendDistribution.up}
            </div>
            <div className="text-sm text-green-700">上升趋势</div>
            <div className="text-xs text-gray-500 mt-1">
              {trendDistribution.upPercentage}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {trendDistribution.stable}
            </div>
            <div className="text-sm text-gray-700">稳定趋势</div>
            <div className="text-xs text-gray-500 mt-1">
              {trendDistribution.stablePercentage}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {trendDistribution.down}
            </div>
            <div className="text-sm text-red-700">下降趋势</div>
            <div className="text-xs text-gray-500 mt-1">
              {trendDistribution.downPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* 趋势列表 */}
      <div
        className="overflow-auto"
        style={{ maxHeight: height - 200 }}
      >
        <div className="divide-y" role="list" aria-label="洞察趋势列表">
          {sortedResults.map((result) => {
            const insight = insightMap.get(result.insightId);
            if (!insight) return null;

            return (
              <div
                key={result.insightId}
                role="listitem"
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-lg ${TREND_COLORS[result.trend]}`}
                    >
                      {TREND_ICONS[result.trend]}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {insight.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${TREND_COLORS[result.trend]}`}
                        >
                          {result.trend === "up" && `+${result.changePercentage}%`}
                          {result.trend === "down" && `${result.changePercentage}%`}
                          {result.trend === "stable" && "稳定"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>置信度: {Math.round(insight.confidence * 100)}%</span>
                        <span>评论数: {insight.count || 0}</span>
                        {insight.keyword && <span>关键词: {insight.keyword}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      预测: {result.prediction.nextCount} 条
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      预测置信度: {Math.round(result.prediction.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 图例 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span>📈</span>
            <span className="text-gray-600">上升 - 关注度增加</span>
          </div>
          <div className="flex items-center gap-2">
            <span>➡️</span>
            <span className="text-gray-600">稳定 - 保持常态</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📉</span>
            <span className="text-gray-600">下降 - 关注度减少</span>
          </div>
        </div>
      </div>
    </div>
  );
}
