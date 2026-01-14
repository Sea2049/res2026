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
      return "text-green-600";
    case "negative":
      return "text-red-600";
    case "neutral":
      return "text-gray-600";
    default:
      return "text-gray-700";
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
      <div className={`p-8 text-center text-gray-500 bg-gray-50 rounded-lg ${className || ""}`}>
        <p>暂无关键词数据</p>
        <p className="text-sm mt-2">请先执行分析以生成关键词</p>
      </div>
    );
  }

  const displayKeywords = keywords.slice(0, maxKeywords);
  const maxCount = Math.max(...displayKeywords.map((k) => k.count), 1);

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm ${className || ""}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">关键词云</h3>
      <div className="flex flex-wrap gap-3">
        {displayKeywords.map((keyword) => {
          const fontSize = calculateFontSize(keyword.count, maxCount);
          const sentimentColor = getSentimentColor(keyword.sentiment);

          return (
            <span
              key={keyword.word}
              className={`inline-block px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${sentimentColor} bg-opacity-10`}
              style={{
                fontSize: `${fontSize}px`,
                backgroundColor: keyword.sentiment
                  ? `var(--${keyword.sentiment}-bg, #f3f4f6)`
                  : "#f3f4f6",
              }}
              title={`出现 ${keyword.count} 次${keyword.sentiment ? ` | 情感: ${keyword.sentiment}` : ""}`}
              onClick={() => onKeywordClick?.(keyword)}
            >
              {keyword.word}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
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
