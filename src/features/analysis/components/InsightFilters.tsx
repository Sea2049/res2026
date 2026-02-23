import { useCallback, useState } from "react";
import type { Insight, InsightFilter, InsightTrend, InsightSeverity } from "@/lib/types";

/**
 * InsightFilters 组件 Props 接口
 */
interface InsightFiltersProps {
  /**
   * 当前筛选条件
   */
  filter: InsightFilter;
  /**
   * 筛选条件变化回调
   */
  onFilterChange: (filter: InsightFilter) => void;
  /**
   * 所有洞察（用于获取筛选选项）
   */
  insights?: Insight[];
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 洞察类型选项
 */
const INSIGHT_TYPE_OPTIONS = [
  { value: "pain_point", label: "用户痛点" },
  { value: "feature_request", label: "功能需求" },
  { value: "praise", label: "用户赞美" },
  { value: "question", label: "用户问题" },
];

/**
 * 趋势选项
 */
const TREND_OPTIONS: { value: InsightTrend; label: string }[] = [
  { value: "up", label: "📈 上升" },
  { value: "stable", label: "➡️ 稳定" },
  { value: "down", label: "📉 下降" },
];

/**
 * 严重程度选项
 */
const SEVERITY_OPTIONS: { value: InsightSeverity; label: string }[] = [
  { value: "critical", label: "🔴 严重" },
  { value: "high", label: "🟠 高" },
  { value: "medium", label: "🟡 中" },
  { value: "low", label: "⚪ 低" },
];

/**
 * 置信度范围预设
 */
const CONFIDENCE_PRESETS = [
  { label: "全部", min: undefined, max: undefined },
  { label: "高置信度 (≥70%)", min: 0.7, max: undefined },
  { label: "中高置信度 (≥50%)", min: 0.5, max: undefined },
  { label: "中置信度 (30%-70%)", min: 0.3, max: 0.7 },
  { label: "低置信度 (<30%)", min: undefined, max: 0.3 },
];

/**
 * 子分类选项
 * v2.6.0 新增
 */
const SUBTYPE_OPTIONS = [
  { value: "bug", label: "🐛 Bug", icon: "🐛" },
  { value: "performance", label: "⚡ 性能", icon: "⚡" },
  { value: "ux_issue", label: "🎨 UX问题", icon: "🎨" },
  { value: "pricing", label: "💰 定价", icon: "💰" },
  { value: "documentation", label: "📚 文档", icon: "📚" },
  { value: "integration", label: "🔌 集成", icon: "🔌" },
  { value: "wish", label: "✨ 愿望", icon: "✨" },
];

/**
 * 洞察筛选组件
 * 提供多维度筛选和搜索功能
 */
export function InsightFilters({
  filter,
  onFilterChange,
  insights = [],
  className,
}: InsightFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showWishOnly, setShowWishOnly] = useState(false);
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);

  // 处理类型筛选变化
  const handleTypeChange = useCallback(
    (type: Insight["type"], checked: boolean) => {
      const currentTypes = filter.types || [];
      let newTypes: Insight["type"][];
      if (checked) {
        newTypes = [...currentTypes, type];
      } else {
        newTypes = currentTypes.filter((t) => t !== type);
      }
      onFilterChange({ ...filter, types: newTypes.length > 0 ? newTypes : undefined });
    },
    [filter, onFilterChange]
  );

  // 处理趋势筛选变化
  const handleTrendChange = useCallback(
    (trend: InsightTrend, checked: boolean) => {
      const currentTrends = filter.trends || [];
      let newTrends: InsightTrend[];
      if (checked) {
        newTrends = [...currentTrends, trend];
      } else {
        newTrends = currentTrends.filter((t) => t !== trend);
      }
      onFilterChange({ ...filter, trends: newTrends.length > 0 ? newTrends : undefined });
    },
    [filter, onFilterChange]
  );

  // 处理严重程度筛选变化
  const handleSeverityChange = useCallback(
    (severity: InsightSeverity, checked: boolean) => {
      const currentSeverities = filter.severities || [];
      let newSeverities: InsightSeverity[];
      if (checked) {
        newSeverities = [...currentSeverities, severity];
      } else {
        newSeverities = currentSeverities.filter((s) => s !== severity);
      }
      onFilterChange({
        ...filter,
        severities: newSeverities.length > 0 ? newSeverities : undefined,
      });
    },
    [filter, onFilterChange]
  );

  // 处理置信度预设变化
  const handleConfidencePresetChange = useCallback(
    (preset: typeof CONFIDENCE_PRESETS[0]) => {
      onFilterChange({
        ...filter,
        minConfidence: preset.min,
        maxConfidence: preset.max,
      });
    },
    [filter, onFilterChange]
  );

  // 处理关键词搜索
  const handleSearch = useCallback(() => {
    if (searchKeyword.trim()) {
      const keywords = filter.keywords || [];
      if (!keywords.includes(searchKeyword.trim())) {
        onFilterChange({
          ...filter,
          keywords: [...keywords, searchKeyword.trim()],
        });
      }
      setSearchKeyword("");
    }
  }, [searchKeyword, filter, onFilterChange]);

  // 处理关键词删除
  const handleKeywordRemove = useCallback(
    (keyword: string) => {
      const keywords = filter.keywords || [];
      onFilterChange({
        ...filter,
        keywords: keywords.filter((k) => k !== keyword),
      });
    },
    [filter, onFilterChange]
  );

  // v2.6.0: 处理子分类筛选变化
  const handleSubTypeChange = useCallback(
    (subType: string, checked: boolean) => {
      let newSubTypes: string[];
      if (checked) {
        newSubTypes = [...selectedSubTypes, subType];
      } else {
        newSubTypes = selectedSubTypes.filter((s) => s !== subType);
      }
      setSelectedSubTypes(newSubTypes);
      // 注意：这里需要扩展InsightFilter类型以支持subTypes
      // 目前作为临时方案，可以通过keywords传递
    },
    [selectedSubTypes]
  );

  // v2.6.0: 处理WISH信号筛选
  const handleWishFilterChange = useCallback(
    (checked: boolean) => {
      setShowWishOnly(checked);
      // 注意：这里需要扩展InsightFilter类型以支持wishOnly
      // 目前作为临时方案在使用时通过组件内部状态过滤
    },
    []
  );

  // 清除所有筛选
  const handleClearAll = useCallback(() => {
    setSearchKeyword("");
    setShowWishOnly(false);
    setSelectedSubTypes([]);
    onFilterChange({});
  }, [onFilterChange]);

  // 获取活跃的筛选器数量
  const activeFilterCount =
    (filter.types?.length || 0) +
    (filter.trends?.length || 0) +
    (filter.severities?.length || 0) +
    (filter.keywords?.length || 0) +
    (filter.minConfidence !== undefined ? 1 : 0) +
    (showWishOnly ? 1 : 0) +
    selectedSubTypes.length;

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className || ""}`}>
      {/* 筛选器头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">洞察筛选</h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-primary-100 text-reddit-orange text-xs rounded-full">
                {activeFilterCount} 个筛选器
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                清除筛选
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-reddit-orange hover:text-primary-700"
            >
              {isExpanded ? "收起" : "展开"}
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="输入关键词搜索..."
            aria-label="搜索洞察"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-reddit-orange"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-reddit-orange text-white rounded-lg text-sm hover:bg-primary-700"
          >
            搜索
          </button>
        </div>

        {/* 已选关键词标签 */}
        {filter.keywords && filter.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {filter.keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full"
              >
                {keyword}
                <button
                  onClick={() => handleKeywordRemove(keyword)}
                  className="hover:text-primary-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 筛选选项（可展开） */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 洞察类型筛选 */}
          <div role="group" aria-label="洞察类型筛选">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              洞察类型
            </h4>
            <div className="flex flex-wrap gap-2">
              {INSIGHT_TYPE_OPTIONS.map((option) => {
                const isChecked = filter.types?.includes(option.value as Insight["type"]);
                return (
                  <label
                    key={option.value}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked || false}
                      onChange={(e) =>
                        handleTypeChange(option.value as Insight["type"], e.target.checked)
                      }
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* 置信度预设 */}
          <div role="group" aria-label="置信度筛选">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              置信度
            </h4>
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE_PRESETS.map((preset, index) => {
                const isActive =
                  filter.minConfidence === preset.min &&
                  filter.maxConfidence === preset.max;
                return (
                  <button
                    key={index}
                    onClick={() => handleConfidencePresetChange(preset)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 趋势筛选 */}
          <div role="group" aria-label="趋势筛选">
            <h4 className="text-sm font-medium text-gray-700 mb-2">趋势</h4>
            <div className="flex flex-wrap gap-2">
              {TREND_OPTIONS.map((option) => {
                const isChecked = filter.trends?.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked || false}
                      onChange={(e) =>
                        handleTrendChange(option.value, e.target.checked)
                      }
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* 严重程度筛选 */}
          <div role="group" aria-label="严重程度筛选">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              严重程度
            </h4>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((option) => {
                const isChecked = filter.severities?.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked || false}
                      onChange={(e) =>
                        handleSeverityChange(option.value, e.target.checked)
                      }
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* v2.6.0: 子分类筛选 */}
          <div role="group" aria-label="子分类筛选">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              子分类
            </h4>
            <div className="flex flex-wrap gap-2">
              {SUBTYPE_OPTIONS.map((option) => {
                const isChecked = selectedSubTypes.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                      isChecked
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        handleSubTypeChange(option.value, e.target.checked)
                      }
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* v2.6.0: WISH信号筛选 */}
          <div role="group" aria-label="特殊标记筛选">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              特殊标记
            </h4>
            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                  showWishOnly
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={showWishOnly}
                  onChange={(e) => handleWishFilterChange(e.target.checked)}
                  className="sr-only"
                />
                ✨ 仅显示WISH信号
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
