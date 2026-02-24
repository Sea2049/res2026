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

  /**
   * Jobs 模式：是否还有更多评论可加载
   */
  hasMore?: boolean;
  /**
   * Jobs 模式：加载更多回调
   */
  onLoadMore?: () => void;
  /**
   * Jobs 模式：加载更多中
   */
  isLoadingMore?: boolean;
  /**
   * 已分析评论总数（用于展示“已加载/总分析”）
   */
  totalCount?: number;
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
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  totalCount,
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
      <div className={`p-8 text-center text-muted-foreground bg-muted/20 border border-border rounded-lg ${className || ""}`}>
        <p>暂无评论数据</p>
      </div>
    );
  }

  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm ${className || ""}`}>
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground mb-3">评论列表</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["all", "positive", "negative", "neutral"] as const).map((sentiment) => {
            const labels: Record<typeof sentiment, string> = {
              all: "全部",
              positive: "正面",
              negative: "负面",
              neutral: "中性",
            };
            const colors: Record<typeof sentiment, string> = {
              all: "bg-muted/60 text-foreground border-border",
              positive: "bg-emerald-500/10 text-emerald-300 border-emerald-900/60",
              negative: "bg-rose-500/10 text-rose-300 border-rose-900/60",
              neutral: "bg-slate-400/10 text-slate-300 border-slate-800",
            };
            const isActive = selectedSentiment === sentiment;
            const count = sentimentCounts[sentiment];

            return (
              <button
                type="button"
                key={sentiment}
                onClick={() => onSentimentChange?.(sentiment)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive
                    ? `${colors[sentiment]}`
                    : `${colors[sentiment]} opacity-70 hover:opacity-100`
                }`}
              >
                {labels[sentiment]} ({count})
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="搜索评论内容或作者…"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          aria-label="搜索评论内容或作者"
          className="w-full px-3 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-reddit-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-transparent"
        />
      </div>
      <div className="min-h-[12rem] max-h-[min(36rem,70vh)] overflow-y-auto" role="list" aria-label="评论列表">
        {filteredComments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>没有找到匹配的评论</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                role="listitem"
                className="p-4 hover:bg-accent/30 cursor-pointer transition-colors"
                onClick={() => onCommentClick?.(comment)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      u/{comment.author}
                    </span>
                    <span className="text-xs text-muted-foreground">
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
                      <span className="text-xs text-muted-foreground">
                        ▲ {comment.score}
                      </span>
                    )}
                  </div>
                </div>
                {/* dangerouslySetInnerHTML: 已通过 escapeHtml 进行 XSS 防护，仅用于换行符转换 */}
                <p
                  className="text-sm text-foreground/90 line-clamp-3 break-words"
                  dangerouslySetInnerHTML={{
                    __html: escapeHtml(comment.body).replace(/\n/g, "<br/>"),
                  }}
                />
                {comment.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comment.keywords.slice(0, 5).map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-0.5 bg-muted/60 text-muted-foreground text-xs rounded border border-border"
                      >
                        {keyword}
                      </span>
                    ))}
                    {comment.keywords.length > 5 && (
                      <span className="px-2 py-0.5 text-muted-foreground text-xs">
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
        <div className="p-3 border-t border-border bg-muted/20 text-center text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>
              显示 {filteredComments.length} 条（已加载 {comments.length}
              {typeof totalCount === "number" ? ` / 总分析 ${totalCount}` : ""}）
            </span>
            {hasMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="px-3 py-1.5 text-sm rounded-md border border-border bg-background hover:bg-accent/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingMore ? "加载中..." : "加载更多"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
