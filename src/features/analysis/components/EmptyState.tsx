import { Button } from "@/components/ui/button";
import { RefreshCcw, Search, Lightbulb, MessageSquare } from "lucide-react";

/**
 * 空状态类型
 */
export type EmptyStateType =
  | "no-insights"
  | "no-keywords"
  | "no-comments"
  | "no-topics";

/**
 * EmptyState 组件 Props 接口
 */
interface EmptyStateProps {
  /**
   * 空状态类型
   */
  type: EmptyStateType;
  /**
   * 自定义标题
   */
  title?: string;
  /**
   * 自定义描述
   */
  description?: string;
  /**
   * 建议操作按钮
   */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost";
  }>;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 空状态预设配置
 */
const EMPTY_STATE_CONFIG: Record<
  EmptyStateType,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    suggestions: string[];
  }
> = {
  "no-insights": {
    icon: <Lightbulb className="w-16 h-16 text-gray-300" />,
    title: "未检测到明显的用户洞察",
    description: "当前评论中没有检测到明显的用户痛点、需求或建议。这可能是由于：",
    suggestions: [
      "评论数量较少，数据样本不足",
      "话题讨论较为温和，缺乏明确的情感倾向",
      "评论内容较为简短，缺少具体描述",
    ],
  },
  "no-keywords": {
    icon: <Search className="w-16 h-16 text-gray-300" />,
    title: "未提取到关键词",
    description: "分析未能从评论中提取到足够的高频关键词。建议：",
    suggestions: [
      "尝试选择其他热门话题进行分析",
      "选择评论数较多的社区或帖子",
      "调整分析配置，降低关键词长度限制",
    ],
  },
  "no-comments": {
    icon: <MessageSquare className="w-16 h-16 text-gray-300" />,
    title: "未获取到评论数据",
    description: "无法获取到任何评论进行分析。可能的原因：",
    suggestions: [
      "选择的社区或帖子没有评论",
      "Reddit API 请求受限或连接超时",
      "话题内容较为冷门，讨论度不高",
    ],
  },
  "no-topics": {
    icon: <Search className="w-16 h-16 text-gray-300" />,
    title: "请先选择要分析的主题",
    description: "在左侧\"主题筛选\"中搜索并选择要分析的话题，然后点击\"开始分析\"按钮。",
    suggestions: [
      "输入关键词搜索相关社区",
      "搜索热门帖子",
      "浏览推荐话题",
    ],
  },
};

/**
 * 空状态组件
 * 提供友好的空状态显示和引导建议
 */
export function EmptyState({
  type,
  title,
  description,
  actions,
  className,
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-8 text-center ${className || ""}`}
    >
      <div className="mb-6">{config.icon}</div>

      <h3 className="text-xl font-semibold text-gray-900 mb-3">
        {title || config.title}
      </h3>

      <p className="text-gray-600 mb-6 max-w-md">
        {description || config.description}
      </p>

      {config.suggestions.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 max-w-md w-full mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-3 text-left">
            💡 建议：
          </h4>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="flex flex-wrap gap-3 justify-center">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant || "default"}
              className={
                action.variant === "default"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : ""
              }
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 为不同场景预设的快捷操作
 */
export const EmptyStateActions = {
  /**
   * 无洞察时的建议操作
   */
  forNoInsights: (onRetry: () => void, onResetTopics: () => void) => [
    {
      label: "重新分析",
      onClick: onRetry,
      variant: "default" as const,
    },
    {
      label: "更换话题",
      onClick: onResetTopics,
      variant: "outline" as const,
    },
  ],

  /**
   * 无关键词时的建议操作
   */
  forNoKeywords: (onRetry: () => void) => [
    {
      label: "重新分析",
      onClick: onRetry,
      variant: "default" as const,
    },
  ],

  /**
   * 无评论时的建议操作
   */
  forNoComments: (onRetry: () => void, onResetTopics: () => void) => [
    {
      label: "重试",
      onClick: onRetry,
      variant: "default" as const,
    },
    {
      label: "选择其他话题",
      onClick: onResetTopics,
      variant: "outline" as const,
    },
  ],

  /**
   * 无话题时的建议操作
   */
  forNoTopics: () => [
    {
      label: "开始搜索话题",
      onClick: () => {
        // 滚动到搜索区域
        const searchInput = document.querySelector(
          'input[placeholder*="搜索"]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      variant: "default" as const,
    },
  ],
};
