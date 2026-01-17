import { useCallback, useMemo, useState } from "react";
import type { Insight, InsightTrend, InsightTrendResult, InsightFilter, InsightSortOption, InsightSeverity } from "@/lib/types";

/**
 * 洞察趋势分析 Hook 参数接口
 */
interface UseInsightTrendProps {
  /**
   * 初始洞察列表
   */
  initialInsights?: Insight[];
}

/**
 * 洞察趋势分析 Hook 返回值接口
 */
interface UseInsightTrendReturn {
  /**
   * 洞察趋势结果列表
   */
  trendResults: InsightTrendResult[];
  /**
   * 筛选后的洞察列表
   */
  filteredInsights: Insight[];
  /**
   * 洞察统计信息
   */
  statistics: InsightStatistics;
  /**
   * 设置筛选条件
   */
  setFilter: (filter: InsightFilter) => void;
  /**
   * 设置排序方式
   */
  setSortOption: (option: InsightSortOption) => void;
  /**
   * 分析洞察趋势
   */
  analyzeTrends: (insights: Insight[]) => void;
  /**
   * 获取洞察类型的分布
   */
  getTypeDistribution: () => Record<string, number>;
  /**
   * 获取趋势分布
   */
  getTrendDistribution: () => Record<InsightTrend, number>;
}

/**
 * 洞察统计信息接口
 */
interface InsightStatistics {
  total: number;
  byType: Record<string, number>;
  avgConfidence: number;
  highConfidenceCount: number;
  criticalCount: number;
}

/**
 * 洞察趋势分析 Hook
 * 管理洞察的筛选、排序、趋势分析等功能
 */
export function useInsightTrend(
  props: UseInsightTrendProps = {}
): UseInsightTrendReturn {
  const { initialInsights = [] } = props;
  const [filter, setFilter] = useState<InsightFilter>({});
  const [sortOption, setSortOption] = useState<InsightSortOption>({
    field: "confidence",
    direction: "desc",
  });
  const [trendResults, setTrendResults] = useState<InsightTrendResult[]>([]);
  const [insights, setInsights] = useState<Insight[]>(initialInsights);

  /**
   * 分析洞察趋势
   * 基于历史数据预测趋势走向
   */
  const analyzeTrends = useCallback((newInsights: Insight[]) => {
    setInsights(newInsights);

    if (newInsights.length === 0) {
      setTrendResults([]);
      return;
    }

    const results: InsightTrendResult[] = newInsights.map((insight) => {
      // 基于评论数量和置信度计算趋势
      const count = insight.count || 1;
      const confidence = insight.confidence;

      // 简单的趋势计算（实际应用中可基于历史数据）
      let trend: InsightTrend = "stable";
      let changePercentage = 0;

      if (confidence > 0.7 && count > 5) {
        trend = "up";
        changePercentage = Math.round((confidence - 0.5) * 100);
      } else if (confidence < 0.4 && count < 3) {
        trend = "down";
        changePercentage = -Math.round((0.5 - confidence) * 100);
      }

      // 生成预测数据
      const prediction = {
        nextCount: Math.round(count * (1 + (confidence - 0.5) * 0.2)),
        confidence: Math.min(0.9, confidence + 0.1),
      };

      return {
        insightId: insight.id,
        trend,
        changePercentage,
        dataPoints: [],
        prediction,
      };
    });

    setTrendResults(results);
  }, []);

  /**
   * 筛选洞察
   */
  const filteredInsights = useMemo(() => {
    let result = [...insights];

    // 按类型筛选
    if (filter.types && filter.types.length > 0) {
      result = result.filter((insight) => filter.types!.includes(insight.type));
    }

    // 按置信度筛选
    if (filter.minConfidence !== undefined) {
      result = result.filter((insight) => insight.confidence >= filter.minConfidence!);
    }
    if (filter.maxConfidence !== undefined) {
      result = result.filter((insight) => insight.confidence <= filter.maxConfidence!);
    }

    // 按关键词筛选
    if (filter.keywords && filter.keywords.length > 0) {
      result = result.filter(
        (insight) =>
          filter.keywords!.some(
            (keyword) =>
              insight.title.toLowerCase().includes(keyword.toLowerCase()) ||
              insight.description.toLowerCase().includes(keyword.toLowerCase()) ||
              insight.keyword?.toLowerCase().includes(keyword.toLowerCase())
          )
      );
    }

    // 按趋势筛选
    if (filter.trends && filter.trends.length > 0) {
      result = result.filter((insight) => {
        const trendResult = trendResults.find((r) => r.insightId === insight.id);
        return trendResult && filter.trends!.includes(trendResult.trend);
      });
    }

    // 按严重程度筛选
    if (filter.severities && filter.severities.length > 0) {
      result = result.filter((insight) => {
        const severity = insight.severity || getDefaultSeverity(insight);
        return filter.severities!.includes(severity);
      });
    }

    // 按日期范围筛选
    if (filter.dateRange) {
      result = result.filter((insight) => {
        if (!insight.createdAt) return true;
        return (
          insight.createdAt >= filter.dateRange!.start &&
          insight.createdAt <= filter.dateRange!.end
        );
      });
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortOption.field) {
        case "confidence":
          comparison = a.confidence - b.confidence;
          break;
        case "count":
          comparison = (a.count || 0) - (b.count || 0);
          break;
        case "createdAt":
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        case "impactScore":
          comparison = (a.impactScore || 0) - (b.impactScore || 0);
          break;
      }
      return sortOption.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [insights, filter, sortOption, trendResults]);

  /**
   * 获取洞察统计信息
   */
  const statistics = useMemo((): InsightStatistics => {
    const total = filteredInsights.length;

    // 按类型统计
    const byType: Record<string, number> = {};
    for (const insight of filteredInsights) {
      byType[insight.type] = (byType[insight.type] || 0) + 1;
    }

    // 计算平均置信度
    const totalConfidence = filteredInsights.reduce(
      (sum, insight) => sum + insight.confidence,
      0
    );
    const avgConfidence = total > 0 ? totalConfidence / total : 0;

    // 高置信度洞察数量
    const highConfidenceCount = filteredInsights.filter(
      (insight) => insight.confidence >= 0.7
    ).length;

    // 严重问题数量
    const criticalCount = filteredInsights.filter((insight) => {
      const severity = insight.severity || getDefaultSeverity(insight);
      return severity === "critical";
    }).length;

    return {
      total,
      byType,
      avgConfidence,
      highConfidenceCount,
      criticalCount,
    };
  }, [filteredInsights]);

  /**
   * 获取洞察类型分布
   */
  const getTypeDistribution = useCallback(() => {
    const distribution: Record<string, number> = {
      pain_point: 0,
      feature_request: 0,
      praise: 0,
      question: 0,
    };

    for (const insight of filteredInsights) {
      distribution[insight.type]++;
    }

    return distribution;
  }, [filteredInsights]);

  /**
   * 获取趋势分布
   */
  const getTrendDistribution = useCallback(() => {
    const distribution: Record<InsightTrend, number> = {
      up: 0,
      down: 0,
      stable: 0,
    };

    for (const result of trendResults) {
      distribution[result.trend]++;
    }

    return distribution;
  }, [trendResults]);

  return {
    trendResults,
    filteredInsights,
    statistics,
    setFilter,
    setSortOption,
    analyzeTrends,
    getTypeDistribution,
    getTrendDistribution,
  };
}

/**
 * 获取默认严重程度
 * @param insight 洞察对象
 * @returns 严重程度
 */
function getDefaultSeverity(insight: Insight): InsightSeverity {
  if (insight.type === "pain_point" && insight.confidence >= 0.8) {
    return "critical";
  }
  if (insight.type === "pain_point" && insight.confidence >= 0.6) {
    return "high";
  }
  if (insight.type === "pain_point" && insight.confidence >= 0.4) {
    return "medium";
  }
  return "low";
}
