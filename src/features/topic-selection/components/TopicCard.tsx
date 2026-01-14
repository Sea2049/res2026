"use client";

import { cn } from "@/lib/utils";
import { escapeHtml, truncateText, formatSubscriberCount, formatTimestamp } from "@/lib/utils";
import type { Subreddit, Post } from "@/lib/types";

/**
 * TopicCard 组件 Props 接口
 */
interface TopicCardProps {
  /**
   * 主题数据（Subreddit 或 Post）
   */
  topic: Subreddit | Post;
  /**
   * 是否被选中
   */
  isSelected?: boolean;
  /**
   * 选择状态变化回调
   */
  onToggleSelect?: () => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 主题卡片组件
 * 显示 Subreddit 或 Post 信息，支持选择/取消选择
 */
export function TopicCard({ topic, isSelected = false, onToggleSelect, className }: TopicCardProps) {
  const isSubreddit = "subscriber_count" in topic;
  
  /**
   * 判断主题类型
   */
  const topicType = isSubreddit ? "subreddit" : "post";
  
  /**
   * 获取主题标题
   */
  const getTopicTitle = (): string => {
    if (isSubreddit) {
      return escapeHtml(topic.title || topic.display_name);
    }
    return escapeHtml(topic.title);
  };
  
  /**
   * 获取主题描述或内容
   */
  const getTopicDescription = (): string => {
    if (isSubreddit) {
      return escapeHtml(truncateText(topic.description || "暂无描述", 150));
    }
    return escapeHtml(truncateText(topic.selftext || topic.title, 150));
  };
  
  /**
   * 获取主题元信息
   */
  const getTopicMeta = (): string => {
    if (isSubreddit) {
      return `${formatSubscriberCount(topic.subscriber_count)} 订阅者`;
    }
    return `${topic.score} 点赞 · ${topic.num_comments} 评论 · ${formatTimestamp(topic.created_utc)}`;
  };
  
  /**
   * 获取主题链接
   */
  const getTopicUrl = (): string => {
    if (isSubreddit) {
      return `https://www.reddit.com${topic.url}`;
    }
    return topic.url;
  };
  
  /**
   * 获取主题类型标签文本
   */
  const getTypeLabel = (): string => {
    return isSubreddit ? "社区" : "帖子";
  };
  
  /**
   * 获取主题类型标签颜色
   */
  const getTypeLabelColor = (): string => {
    return isSubreddit ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
  };
  
  /**
   * 处理卡片点击
   */
  const handleCardClick = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLAnchorElement) {
      return;
    }
    onToggleSelect?.();
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "p-4 border rounded-lg cursor-pointer",
        "hover:shadow-md transition-shadow duration-200",
        "bg-white",
        isSelected && "ring-2 ring-blue-500 bg-blue-50",
        className
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggleSelect?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-2 py-0.5 text-xs font-medium rounded", getTypeLabelColor())}>
              {getTypeLabel()}
            </span>
            <h3 className="font-semibold text-gray-900 truncate">
              {getTopicTitle()}
            </h3>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {getTopicDescription()}
          </p>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{getTopicMeta()}</span>
            {isSubreddit && (
              <span className="text-gray-400">r/{escapeHtml(topic.name)}</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            aria-label={`选择${getTypeLabel()}`}
          />
          <a
            href={getTopicUrl()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 hover:text-blue-800"
            aria-label={`打开${getTypeLabel()}链接`}
          >
            查看详情
          </a>
        </div>
      </div>
    </div>
  );
}
