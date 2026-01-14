"use client";

import { cn } from "@/lib/utils";
import { TopicCard } from "./TopicCard";
import type { Subreddit, Post } from "@/lib/types";

/**
 * TopicList 组件 Props 接口
 */
interface TopicListProps {
  /**
   * 搜索结果列表
   */
  topics: (Subreddit | Post)[];
  /**
   * 已选主题 ID 集合
   */
  selectedTopicIds: Set<string>;
  /**
   * 选择/取消选择主题回调
   */
  onToggleSelect: (topic: Subreddit | Post) => void;
  /**
   * 是否正在加载
   */
  isLoading?: boolean;
  /**
   * 错误信息
   */
  error?: string | null;
  /**
   * 搜索关键词
   */
  searchKeyword?: string;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 搜索结果列表组件
 * 渲染 TopicCard 列表，支持空状态和加载状态
 */
export function TopicList({
  topics,
  selectedTopicIds,
  onToggleSelect,
  isLoading = false,
  error = null,
  searchKeyword = "",
  className,
}: TopicListProps) {
  /**
   * 渲染空状态
   */
  const renderEmptyState = () => {
    if (searchKeyword) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            未找到相关结果
          </h3>
          <p className="text-gray-600">
            尝试使用其他关键词搜索
          </p>
        </div>
      );
    }
    
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          开始搜索主题
        </h3>
        <p className="text-gray-600">
          输入关键词搜索感兴趣的 Subreddit 或 Post
        </p>
      </div>
    );
  };
  
  /**
   * 渲染加载状态
   */
  const renderLoadingState = () => {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-gray-50 animate-pulse"
            aria-hidden="true"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  /**
   * 渲染错误状态
   */
  const renderErrorState = () => {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          搜索失败
        </h3>
        <p className="text-gray-600 mb-4">
          {error || "网络请求失败，请稍后重试"}
        </p>
      </div>
    );
  };
  
  /**
   * 获取搜索结果统计
   */
  const getResultStats = () => {
    const subredditCount = topics.filter(t => "subscriber_count" in t).length;
    const postCount = topics.filter(t => !("subscriber_count" in t)).length;
    
    if (subredditCount > 0 && postCount > 0) {
      return `${subredditCount} 个社区 · ${postCount} 个帖子`;
    } else if (subredditCount > 0) {
      return `${subredditCount} 个社区`;
    } else if (postCount > 0) {
      return `${postCount} 个帖子`;
    }
    return "0 个结果";
  };
  
  /**
   * 渲染主题列表
   */
  const renderTopicList = () => {
    if (topics.length === 0) {
      return renderEmptyState();
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>搜索结果：{getResultStats()}</span>
          <span>已选 {selectedTopicIds.size} 个</span>
        </div>
        
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            isSelected={selectedTopicIds.has(topic.id)}
            onToggleSelect={() => onToggleSelect(topic)}
          />
        ))}
      </div>
    );
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : (
        renderTopicList()
      )}
    </div>
  );
}
