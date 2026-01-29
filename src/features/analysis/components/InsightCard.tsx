import { useState, useMemo, useCallback, memo } from "react";
import type { Insight, SentimentComment } from "@/lib/types";
import { getInsightTypeStyle, getInsightIconColor } from "@/lib/nlp";

/**
 * 洞察类型标签映射
 */
const INSIGHT_TYPE_LABELS: Record<Insight["type"], string> = {
  pain_point: "用户痛点",
  feature_request: "功能需求",
  praise: "用户赞美",
  question: "用户问题",
};

/**
 * 洞察类型描述映射
 */
const INSIGHT_TYPE_DESCRIPTIONS: Record<Insight["type"], string> = {
  pain_point: "用户遇到的问题或不满意的地方",
  feature_request: "用户期望添加或改进的功能",
  praise: "用户表达满意或赞赏的内容",
  question: "用户提出的疑问或求助",
};

/**
 * 洞察类型图标映射
 */
const INSIGHT_TYPE_ICONS: Record<Insight["type"], string> = {
  pain_point: "🔴",
  feature_request: "🔵",
  praise: "🟢",
  question: "🟡",
};

/**
 * 趋势图标映射
 */
const TREND_ICONS: Record<Insight["trend"], string> = {
  up: "📈",
  down: "📉",
  stable: "➡️",
};

/**
 * 趋势标签映射
 */
const TREND_LABELS: Record<Insight["trend"], string> = {
  up: "上升",
  down: "下降",
  stable: "稳定",
};

/**
 * 严重程度标签映射
 */
const SEVERITY_LABELS: Record<Insight["severity"], string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

/**
 * 严重程度颜色映射
 */
const SEVERITY_COLORS: Record<Insight["severity"], string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

/**
 * 子分类标签映射
 * v2.6.0 新增
 */
const SUBTYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  performance: "性能",
  ux_issue: "UX问题",
  pricing: "定价",
  documentation: "文档",
  integration: "集成",
  wish: "愿望",
  general: "通用",
};

/**
 * 子分类图标映射
 * v2.6.0 新增
 */
const SUBTYPE_ICONS: Record<string, string> = {
  bug: "🐛",
  performance: "⚡",
  ux_issue: "🎨",
  pricing: "💰",
  documentation: "📚",
  integration: "🔌",
  wish: "✨",
  general: "📌",
};

/**
 * 优先级等级标签映射
 * v2.6.0 新增
 */
const PRIORITY_LABELS: Record<string, string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

/**
 * 优先级等级颜色映射
 * v2.6.0 新增
 */
const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  low: "bg-green-100 text-green-700 border-green-300",
};

/**
 * InsightCard 组件 Props 接口
 */
interface InsightCardProps {
  /**
   * 洞察数据对象
   */
  insight: Insight;
  /**
   * 所有评论数据，用于展示相关评论
   */
  allComments?: SentimentComment[];
  /**
   * 是否展开显示详情（用于控制完整评论列表）
   */
  isExpanded?: boolean;
  /**
   * 是否显示评论预览（默认 true，显示前 2 条）
   */
  showPreview?: boolean;
  /**
   * 展开状态变化回调
   */
  onExpandChange?: (expanded: boolean) => void;
  /**
   * 卡片点击事件（可选，用于兼容旧版本）
   */
  onClick?: () => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 渲染评论项
 * @param comment 评论数据
 * @param index 索引
 * @returns JSX 元素
 */
function renderCommentItem(comment: SentimentComment, index: number): JSX.Element {
  // 构建 Reddit 评论链接
  const commentUrl = comment.permalink 
    ? `https://www.reddit.com${comment.permalink}`
    : comment.subreddit && comment.link_id
    ? `https://www.reddit.com/r/${comment.subreddit}/comments/${comment.link_id.replace('t3_', '')}/_/${comment.id}`
    : null;

  return (
    <div 
      key={comment.id} 
      className="text-xs bg-gray-50 p-3 rounded border border-gray-100 hover:bg-gray-100 transition-colors"
    >
      <p className="text-gray-700 line-clamp-3">{comment.body}</p>
      <div className="mt-2 flex items-center justify-between text-gray-400 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[9px] font-medium">
            {comment.author.charAt(0).toUpperCase()}
          </span>
          <span>u/{comment.author}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span>▲</span>
            <span>{comment.score}</span>
          </span>
          {commentUrl && (
            <a
              href={commentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span>查看原帖</span>
              <span className="text-[8px]">↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 处理"剩余评论"的展开/收起
 * @param e 鼠标事件
 * @param setShowRemainingComments 设置显示剩余评论的函数
 * @param showRemainingComments 当前显示状态
 */
function handleToggleRemainingComments(
  e: React.MouseEvent,
  setShowRemainingComments: React.Dispatch<React.SetStateAction<boolean>>,
  showRemainingComments: boolean
): void {
  e.stopPropagation();
  setShowRemainingComments(!showRemainingComments);
}

/**
 * 洞察卡片组件
 * 展示分析发现的用户痛点、功能需求、问题或赞美信息
 * 默认展示前 2 条相关评论预览，无需点击即可快速查看
 * 使用 memo 包装以优化性能，避免不必要的重渲染
 */
export const InsightCard = memo(function InsightCard({
  insight,
  allComments = [],
  isExpanded = false,
  showPreview = true,
  onExpandChange,
  onClick,
  className,
}: InsightCardProps) {
  // 内部状态：控制"剩余评论"的展开/收起
  const [showRemainingComments, setShowRemainingComments] = useState(false);

  // 获取洞察类型样式
  const bgColor = useMemo(
    () => getInsightTypeStyle(insight.type),
    [insight.type]
  );
  
  // 获取洞察类型图标颜色
  const iconColor = useMemo(
    () => getInsightIconColor(insight.type),
    [insight.type]
  );

  // 构建评论 ID 映射，用于快速查找
  const commentIdMap = useMemo(() => {
    const map = new Map<string, SentimentComment>();
    for (const comment of allComments) {
      map.set(comment.id, comment);
    }
    return map;
  }, [allComments]);

  // 获取相关评论对象（按洞察中引用的 ID 顺序）
  const relatedCommentsData = useMemo(() => {
    const results: SentimentComment[] = [];
    for (const id of insight.relatedComments) {
      const comment = commentIdMap.get(id);
      if (comment) {
        results.push(comment);
      }
    }
    return results;
  }, [insight.relatedComments, commentIdMap]);

  // 统计找到和未找到的评论数量
  const { foundCount, missingCount } = useMemo(() => {
    const found = new Set<string>();
    const missing: string[] = [];
    for (const id of insight.relatedComments) {
      if (commentIdMap.has(id)) {
        found.add(id);
      } else {
        missing.push(id);
      }
    }
    return {
      foundCount: found.size,
      missingCount: missing.length,
    };
  }, [insight.relatedComments, commentIdMap]);

  // 默认展示前 2 条评论预览
  const previewComments = useMemo(
    () => relatedCommentsData.slice(0, 2),
    [relatedCommentsData]
  );
  
  // 剩余的评论（从第 3 条开始）
  const remainingComments = useMemo(
    () => relatedCommentsData.slice(2),
    [relatedCommentsData]
  );
  
  // 是否有更多评论
  const hasMoreComments = useMemo(
    () => remainingComments.length > 0,
    [remainingComments]
  );
  
  // 剩余评论数量
  const remainingCount = useMemo(
    () => remainingComments.length,
    [remainingComments]
  );

  // 处理展开状态变化
  const handleExpandChange = useCallback(() => {
    if (onExpandChange) {
      onExpandChange(!isExpanded);
    }
  }, [onExpandChange, isExpanded]);

  // 处理卡片点击
  const handleCardClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // 获取洞察类型图标
  const icon = useMemo(
    () => INSIGHT_TYPE_ICONS[insight.type],
    [insight.type]
  );

  // 获取趋势图标
  const trendIcon = useMemo(
    () => insight.trend ? TREND_ICONS[insight.trend] : null,
    [insight.trend]
  );

  // 获取严重程度标签和颜色
  const severityLabel = useMemo(
    () => insight.severity ? SEVERITY_LABELS[insight.severity] : null,
    [insight.severity]
  );
  
  const severityColor = useMemo(
    () => insight.severity ? SEVERITY_COLORS[insight.severity] : null,
    [insight.severity]
  );

  return (
    <div
      className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${className || ""}`}
      onClick={handleCardClick}
    >
      <div className={`p-4 ${bgColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xl ${iconColor}`}>{icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">
                  {INSIGHT_TYPE_LABELS[insight.type]}
                </h4>
                {/* v2.6.0: WISH标记 */}
                {insight.isWish && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded">
                    ✨ WISH
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {INSIGHT_TYPE_DESCRIPTIONS[insight.type]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {insight.count && insight.count > 1 && (
              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                {insight.count} 条
              </span>
            )}
            {/* 严重程度标签 */}
            {severityLabel && (
              <span className={`px-2 py-1 text-xs rounded-full ${severityColor}`}>
                {severityLabel}
              </span>
            )}
            {/* 趋势图标 */}
            {trendIcon && (
              <span className="text-lg" title={`趋势: ${TREND_LABELS[insight.trend!]}`}>
                {trendIcon}
              </span>
            )}
            <span className="text-xs font-medium text-gray-600">
              置信度 {Math.round(insight.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-gray-700 text-sm leading-relaxed font-medium">
          {insight.description}
        </p>
        
        {/* 默认展示评论预览（无需点击即可查看前 2 条） */}
        {showPreview && insight.relatedComments.length > 0 && (
          <div className="mt-4 pt-3 border-t space-y-3">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-2">
              <span>相关评论预览</span>
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
                {foundCount}/{insight.relatedComments.length}
              </span>
              {missingCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px]">
                  {missingCount} 条缺失
                </span>
              )}
            </p>
            <div className="space-y-2">
              {previewComments.length > 0 ? (
                previewComments.map((comment) => renderCommentItem(comment, 0))
              ) : (
                <div className="text-xs text-gray-400 text-center py-4">
                  评论数据加载中或不可用
                </div>
              )}
            </div>
            
            {/* 显示更多评论按钮 */}
            {hasMoreComments && (
              <button
                className="w-full mt-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                onClick={(e) => handleToggleRemainingComments(e, setShowRemainingComments, showRemainingComments)}
              >
                <span>{showRemainingComments ? `收起剩余 ${remainingCount} 条评论` : `查看剩余 ${remainingCount} 条评论`}</span>
                <span className="text-lg">{showRemainingComments ? "▲" : "▼"}</span>
              </button>
            )}
          </div>
        )}

        {/* 剩余评论列表（展开后显示在预览下方） */}
        {showRemainingComments && hasMoreComments && (
          <div className="mt-3 space-y-2">
            {remainingComments.map((comment, index) => renderCommentItem(comment, index + 2))}
          </div>
        )}

        {/* v2.6.0: 标签区域 */}
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.keyword && (
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              关键词: {insight.keyword}
            </span>
          )}
          
          {/* 子分类标签 */}
          {insight.subType && SUBTYPE_LABELS[insight.subType] && (
            <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded flex items-center gap-1">
              <span>{SUBTYPE_ICONS[insight.subType]}</span>
              <span>{SUBTYPE_LABELS[insight.subType]}</span>
            </span>
          )}
          
          {/* 紧急度标签（仅WISH信号） */}
          {insight.urgency !== undefined && insight.isWish && (
            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
              紧急度: {insight.urgency.toFixed(1)}/10
            </span>
          )}
          
          {/* 身份信号 */}
          {insight.identitySignals && insight.identitySignals.length > 0 && (
            <span className="inline-block px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded" title={insight.identitySignals.join(", ")}>
              👤 目标用户: {insight.identitySignals[0]}
              {insight.identitySignals.length > 1 && ` +${insight.identitySignals.length - 1}`}
            </span>
          )}
          
          {/* 反对意见 */}
          {insight.objections && insight.objections.length > 0 && (
            <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
              ⚠️ {insight.objections.length}个反对意见
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
