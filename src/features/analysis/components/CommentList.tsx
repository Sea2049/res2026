import { useState, useMemo } from "react";
import type { SentimentComment } from "@/lib/types";
import { escapeHtml, getSentimentColor, formatTimestamp } from "@/lib/utils";

/**
 * CommentList 组件 Props 接口
 */
interface CommentListProps {
  /**
   * 带情感标签的评论数组
   */
  comments: SentimentComment[];
  /**
   * 当前选中的筛选情感类型
   */
  selectedSentiment?: "all" | "positive" | "negative" | "neutral";
  /**
   * 筛选变化事件
   */
  onSentimentChange?: (sentiment: "all" | "positive" | "negative" | "neutral") => void;
  /**
   * 评论点击事件
   */
  onCommentClick?: (comment: SentimentComment) => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 格式化时间戳为相对时间
 * @param timestamp Unix 时间戳
 * @returns 相对时间字符串
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now / 1000 - timestamp;
  const seconds = Math.floor(diff);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "刚刚";
  } else if (minutes < 60) {
    return `${minutes} 分钟前`;
  } else if (hours < 24) {
    return `${hours} 小时前`;
  } else if (days < 30) {
    return `${days} 天前`;
  } else {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("zh-CN");
  }
}

/**
 * 评论列表组件
 * 展示带情感标签的评论列表，支持筛选和高亮显示
 */
export function CommentList({
  comments,
  selectedSentiment = "all",
  onSentimentChange,
  onCommentClick,
  className,
}: CommentListProps) {
  const [searchKeyword, setSearchKeyword] = useState("");

  const filteredComments = useMemo(() => {
    if (!Array.isArray(comments) || comments.length === 0) {
      return [];
    }

    let result = comments;

    if (selectedSentiment !== "all") {
      result = result.filter((c) => c.sentiment === selectedSentiment);
    }

    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (c) =>
          c.body.toLowerCase().includes(keyword) ||
          c.author.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [comments, selectedSentiment, searchKeyword]);

  const sentimentCounts = useMemo(() => {
    if (!Array.isArray(comments)) {
      return { all: 0, positive: 0, negative: 0, neutral: 0 };
    }
    return {
      all: comments.length,
      positive: comments.filter((c) => c.sentiment === "positive").length,
      negative: comments.filter((c) => c.sentiment === "negative").length,
      neutral: comments.filter((c) => c.sentiment === "neutral").length,
    };
  }, [comments]);

  if (!comments || comments.length === 0) {
    return (
      <div className={`p-8 text-center text-gray-500 bg-gray-50 rounded-lg ${className || ""}`}>
        <p>暂无评论数据</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className || ""}`}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">评论列表</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "positive", "negative", "neutral"] as const).map((sentiment) => {
            const labels: Record<typeof sentiment, string> = {
              all: "全部",
              positive: "正面",
              negative: "负面",
              neutral: "中性",
            };
            const colors: Record<typeof sentiment, string> = {
              all: "bg-gray-100 text-gray-700 border-gray-300",
              positive: "bg-green-100 text-green-700 border-green-300",
              negative: "bg-red-100 text-red-700 border-red-300",
              neutral: "bg-gray-100 text-gray-700 border-gray-300",
            };
            const isActive = selectedSentiment === sentiment;
            const count = sentimentCounts[sentiment];

            return (
              <button
                key={sentiment}
                onClick={() => onSentimentChange?.(sentiment)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-all duration-200 ${
                  isActive
                    ? `${colors[sentiment]} ring-2 ring-offset-1`
                    : `${colors[sentiment]} opacity-60 hover:opacity-100`
                }`}
              >
                {labels[sentiment]} ({count})
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="搜索评论内容或作者..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="max-h-96 overflow-y-auto">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>没有找到匹配的评论</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onCommentClick?.(comment)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      u/{comment.author}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.created_utc)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${getSentimentColor(
                        comment.sentiment
                      )}`}
                    >
                      {comment.sentiment === "positive"
                        ? "正面"
                        : comment.sentiment === "negative"
                        ? "负面"
                        : "中性"}
                    </span>
                    {comment.score > 0 && (
                      <span className="text-xs text-gray-500">
                        ▲ {comment.score}
                      </span>
                    )}
                  </div>
                </div>
                <p
                  className="text-sm text-gray-700 line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: escapeHtml(comment.body).replace(/\n/g, "<br/>"),
                  }}
                />
                {comment.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comment.keywords.slice(0, 5).map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                    {comment.keywords.length > 5 && (
                      <span className="px-2 py-0.5 text-gray-500 text-xs">
                        +{comment.keywords.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {filteredComments.length > 0 && (
        <div className="p-3 border-t bg-gray-50 text-center text-sm text-gray-500">
          显示 {filteredComments.length} 条评论
        </div>
      )}
    </div>
  );
}
