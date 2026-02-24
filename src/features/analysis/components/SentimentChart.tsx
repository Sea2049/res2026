import type { SentimentResult } from "@/lib/types";

/**
 * SentimentChart 组件 Props 接口
 */
interface SentimentChartProps {
  /**
   * 情感分析结果数据
   */
  sentiment: SentimentResult;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 情感分布图表组件
 * 以柱状图形式展示正面、中性、负面评论的比例分布
 */
export function SentimentChart({ sentiment, className }: SentimentChartProps) {
  if (!sentiment) {
    return (
      <div className={`p-8 text-center text-muted-foreground bg-muted/20 border border-border rounded-lg ${className || ""}`}>
        <p>暂无情感数据</p>
      </div>
    );
  }

  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const hasData = total > 0;

  const positiveWidth = hasData ? `${sentiment.positivePercentage}%` : "0%";
  const negativeWidth = hasData ? `${sentiment.negativePercentage}%` : "0%";
  const neutralWidth = hasData ? `${sentiment.neutralPercentage}%` : "0%";

  return (
    <div className={`bg-card border border-border p-6 rounded-lg shadow-sm ${className || ""}`}>
      <h3 className="text-lg font-semibold text-foreground mb-4">情感分布</h3>
      <div className="space-y-4">
        <div
          className="relative h-8 bg-muted rounded-full overflow-hidden flex"
          role="img"
          aria-label={`情感分析图表: 正面 ${sentiment.positivePercentage}%, 中性 ${sentiment.neutralPercentage}%, 负面 ${sentiment.negativePercentage}%`}
        >
          <div
            className="h-full bg-green-500 transition-[width] duration-500 flex items-center justify-center"
            style={{ width: positiveWidth }}
            aria-label={`正面 ${sentiment.positivePercentage}%`}
          >
            {sentiment.positivePercentage >= 8 && (
              <span className="text-xs text-white font-medium">
                {sentiment.positivePercentage}%
              </span>
            )}
          </div>
          <div
            className="h-full bg-slate-500 transition-[width] duration-500 flex items-center justify-center"
            style={{ width: neutralWidth }}
            aria-label={`中性 ${sentiment.neutralPercentage}%`}
          >
            {sentiment.neutralPercentage >= 8 && (
              <span className="text-xs text-white font-medium">
                {sentiment.neutralPercentage}%
              </span>
            )}
          </div>
          <div
            className="h-full bg-red-500 transition-[width] duration-500 flex items-center justify-center"
            style={{ width: negativeWidth }}
            aria-label={`负面 ${sentiment.negativePercentage}%`}
          >
            {sentiment.negativePercentage >= 8 && (
              <span className="text-xs text-white font-medium">
                {sentiment.negativePercentage}%
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-green-500/10 border border-green-900/50 rounded-lg">
            <div className="text-2xl font-bold text-green-300">{sentiment.positive}</div>
            <div className="text-sm text-green-200/90">正面评论</div>
          </div>
          <div className="p-3 bg-muted/20 border border-border rounded-lg">
            <div className="text-2xl font-bold text-foreground">{sentiment.neutral}</div>
            <div className="text-sm text-muted-foreground">中性评论</div>
          </div>
          <div className="p-3 bg-red-500/10 border border-red-900/50 rounded-lg">
            <div className="text-2xl font-bold text-red-300">{sentiment.negative}</div>
            <div className="text-sm text-red-200/90">负面评论</div>
          </div>
        </div>
        {hasData && (
          <div className="text-center text-sm text-muted-foreground pt-2 border-t border-border">
            共分析 {total} 条评论
          </div>
        )}
      </div>
    </div>
  );
}
