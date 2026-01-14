import type { Insight } from "@/lib/types";
import { getInsightTypeStyle, getInsightIconColor } from "@/lib/nlp";

/**
 * InsightCard 组件 Props 接口
 */
interface InsightCardProps {
  /**
   * 洞察数据对象
   */
  insight: Insight;
  /**
   * 是否展开显示详情
   */
  isExpanded?: boolean;
  /**
   * 卡片点击事件
   */
  onClick?: () => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 洞察卡片组件
 * 展示分析发现的用户痛点、功能需求、问题或赞美信息
 */
export function InsightCard({
  insight,
  isExpanded = false,
  onClick,
  className,
}: InsightCardProps) {
  const bgColor = getInsightTypeStyle(insight.type);
  const iconColor = getInsightIconColor(insight.type);

  const typeLabels: Record<Insight["type"], string> = {
    pain_point: "用户痛点",
    feature_request: "功能需求",
    praise: "用户赞美",
    question: "用户问题",
  };

  const typeDescriptions: Record<Insight["type"], string> = {
    pain_point: "用户遇到的问题或不满意的地方",
    feature_request: "用户期望添加或改进的功能",
    praise: "用户表达满意或赞赏的内容",
    question: "用户提出的疑问或求助",
  };

  const icons: Record<Insight["type"], string> = {
    pain_point: "🔴",
    feature_request: "🔵",
    praise: "🟢",
    question: "🟡",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${className || ""}`}
      onClick={onClick}
    >
      <div className={`p-4 ${bgColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xl ${iconColor}`}>{icons[insight.type]}</span>
            <div>
              <h4 className="font-semibold">
                {typeLabels[insight.type]}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {typeDescriptions[insight.type]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {insight.count && insight.count > 1 && (
              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                {insight.count} 条
              </span>
            )}
            <span className="text-xs font-medium text-gray-600">
              置信度 {Math.round(insight.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {insight.description}
        </p>
        {isExpanded && insight.relatedComments.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 mb-2">
              涉及 {insight.relatedComments.length} 条评论
            </p>
          </div>
        )}
        {insight.keyword && (
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              关键词: {insight.keyword}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
