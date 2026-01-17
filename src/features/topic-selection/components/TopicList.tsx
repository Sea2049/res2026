"use client";

import { useMemo, memo, useCallback } from "react";
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
  /**
   * 是否显示分类分组
   */
  showGrouping?: boolean;
}

/**
 * 搜索结果分类分组接口
 */
interface TopicGroup {
  type: "subreddit" | "post";
  label: string;
  icon: string;
  items: (Subreddit | Post)[];
}

/**
 * 搜索结果列表组件
 * 渲染 TopicCard 列表，支持空状态、加载状态和分类分组显示
 * 使用 React.memo 优化渲染性能
 */
export const TopicList = memo(function TopicList({
  topics,
  selectedTopicIds,
  onToggleSelect,
  isLoading = false,
  error = null,
  searchKeyword = "",
  className,
  showGrouping = true,
}: TopicListProps) {
  /**
   * 对搜索结果进行分类分组
   */
  const topicGroups = useMemo((): TopicGroup[] => {
    if (!showGrouping) return [];

    const subreddits = topics.filter(t => "subscriber_count" in t) as Subreddit[];
    const posts = topics.filter(t => !("subscriber_count" in t)) as Post[];

    const groups: TopicGroup[] = [];

    if (subreddits.length > 0) {
      groups.push({
        type: "subreddit",
        label: "社区",
        icon: "👨‍👩‍👧‍👦",
        items: subreddits,
      });
    }

    if (posts.length > 0) {
      groups.push({
        type: "post",
        label: "帖子",
        icon: "📝",
        items: posts,
      });
    }

    return groups;
  }, [topics, showGrouping]);

  /**
   * 渲染空状态
   */
  const renderEmptyState = useCallback(() => {
    if (searchKeyword) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            未找到相关结果
          </h3>
          <p className="text-gray-300">
            尝试使用其他关键词搜索
          </p>
        </div>
      );
    }
    
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-lg font-semibold text-white mb-2">
          开始搜索主题
        </h3>
        <p className="text-gray-300">
          输入关键词搜索感兴趣的 Subreddit 或 Post
        </p>
      </div>
    );
  }, [searchKeyword]);
  
  /**
   * 渲染加载状态
   */
  const renderLoadingState = useCallback(() => {
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
  }, []);
  
  /**
   * 渲染错误状态
   */
  const renderErrorState = useCallback(() => {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-white mb-2">
          搜索失败
        </h3>
        <p className="text-gray-300 mb-4">
          {error || "网络请求失败，请稍后重试"}
        </p>
      </div>
    );
  }, [error]);
  
  /**
   * 获取搜索结果统计
   */
  const getResultStats = useCallback(() => {
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
  }, [topics]);
  
  /**
   * 渲染主题列表（无分组）
   */
  const renderTopicList = useCallback(() => {
    if (topics.length === 0) {
      return renderEmptyState();
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-300">
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
  }, [topics, selectedTopicIds, onToggleSelect, renderEmptyState, getResultStats]);

  /**
   * 渲染分组主题列表
   */
  const renderGroupedTopicList = useCallback(() => {
    if (topics.length === 0) {
      return renderEmptyState();
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between text-sm text-gray-300">
          <span>搜索结果：{getResultStats()}</span>
          <span>已选 {selectedTopicIds.size} 个</span>
        </div>

        {topicGroups.map((group) => (
          <div key={group.type} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <span>{group.icon}</span>
              <span>{group.label}</span>
              <span className="text-gray-500">({group.items.length})</span>
            </div>
            
            <div className="space-y-3">
              {group.items.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  isSelected={selectedTopicIds.has(topic.id)}
                  onToggleSelect={() => onToggleSelect(topic)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }, [topics, topicGroups, selectedTopicIds, onToggleSelect, renderEmptyState, getResultStats]);
  
  return (
    <div className={cn("space-y-4", className)}>
      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : showGrouping ? (
        renderGroupedTopicList()
      ) : (
        renderTopicList()
      )}
    </div>
  );
});
