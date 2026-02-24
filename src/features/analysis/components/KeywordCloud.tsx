import type { KeywordCount } from "@/lib/types";

/**
 * KeywordCloud 组件 Props 接口
 */
interface KeywordCloudProps {
  /**
   * 关键词统计数据
   */
  keywords: KeywordCount[];
  /**
   * 最大显示的关键词数量
   */
  maxKeywords?: number;
  /**
   * 额外的类名
   */
  className?: string;
  /**
   * 关键词点击事件
   */
  onKeywordClick?: (keyword: KeywordCount) => void;
}

/**
 * 根据关键词频率计算字体大小
 * @param count 关键词出现次数
 * @param maxCount 最大出现次数
 * @param minSize 最小字体大小
 * @param maxSize 最大字体大小
 * @returns 字体大小
 */
function calculateFontSize(
  count: number,
  maxCount: number,
  minSize: number = 12,
  maxSize: number = 36
): number {
  if (maxCount === 0) return minSize;
  const ratio = count / maxCount;
  return Math.round(minSize + ratio * (maxSize - minSize));
}

/**
 * 根据关键词情感返回颜色类名
 * @param sentiment 情感类别
 * @returns 颜色类名
 */
function getSentimentColor(sentiment?: "positive" | "negative" | "neutral"): string {
  switch (sentiment) {
    case "positive":
      return "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-400/15 dark:text-emerald-300";
    case "negative":
      return "border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-900/60 dark:bg-rose-400/15 dark:text-rose-300";
    case "neutral":
      return "border-slate-200 bg-slate-500/10 text-slate-700 dark:border-slate-800 dark:bg-slate-400/10 dark:text-slate-300";
    default:
      return "border-border bg-background/40 text-foreground/80";
  }
}

/**
 * 关键词云组件
 * 以标签云的形式展示高频关键词，大小和颜色反映词频和情感
 */
export function KeywordCloud({
  keywords,
  maxKeywords = 30,
  className,
  onKeywordClick,
}: KeywordCloudProps) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className={`p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-border ${className || ""}`}>
        <p>暂无关键词数据</p>
        <p className="text-sm mt-2">请先执行分析以生成关键词</p>
      </div>
    );
  }

  const displayKeywords = keywords.slice(0, maxKeywords);
  const maxCount = Math.max(...displayKeywords.map((k) => k.count), 1);

  return (
    <div className={`${className || ""}`}>
      <div className="flex min-h-[180px] flex-wrap items-center justify-center gap-2 sm:gap-3" aria-label="关键词云">
        {displayKeywords.map((keyword) => {
          const fontSize = calculateFontSize(keyword.count, maxCount);
          const sentimentColor = getSentimentColor(keyword.sentiment);

          return (
            <button
              type="button"
              key={keyword.word}
              className={`inline-flex select-none items-center rounded-full border px-3 py-1.5 font-medium leading-none transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 ${sentimentColor}`}
              style={{
                fontSize: `${fontSize}px`,
              }}
              title={`出现 ${keyword.count} 次${keyword.sentiment ? ` | 情感: ${keyword.sentiment}` : ""}`}
              aria-label={`关键词: ${keyword.word}, 出现 ${keyword.count} 次${keyword.sentiment ? `, 情感: ${keyword.sentiment}` : ""}`}
              onClick={() => onKeywordClick?.(keyword)}
            >
              {keyword.word}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span>正面</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span>负面</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-500"></span>
          <span>中性</span>
        </div>
      </div>
    </div>
  );
}
