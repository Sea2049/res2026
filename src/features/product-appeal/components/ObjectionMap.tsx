/**
 * 反对意见映射组件
 * v2.6.0 新增 - 基于 product-appeal-analyzer skill
 */

"use client";

import React from "react";
import { ObjectionType } from "@/lib/types";
import type { AppealScore } from "@/lib/types";
import { Card } from "@/components/ui/card";

interface ObjectionMapProps {
  objections: AppealScore["objections"];
}

// 反对意见的中文标签和描述
const OBJECTION_LABELS: Record<ObjectionType, { label: string; description: string; icon: string }> = {
  [ObjectionType.TRUST]: {
    label: "信任问题",
    description: "用户对产品真实性/安全性存疑",
    icon: "🔒",
  },
  [ObjectionType.SKEPTICISM]: {
    label: "怀疑论",
    description: "用户对承诺持怀疑态度",
    icon: "🤔",
  },
  [ObjectionType.VALUE]: {
    label: "价值感知",
    description: "用户认为价格过高或不值得",
    icon: "💰",
  },
  [ObjectionType.COMPLEXITY]: {
    label: "复杂度担忧",
    description: "用户觉得产品太复杂难用",
    icon: "🧩",
  },
  [ObjectionType.IDENTITY_MISMATCH]: {
    label: "身份不符",
    description: "用户认为产品不适合他们",
    icon: "🎯",
  },
  [ObjectionType.RISK]: {
    label: "风险担忧",
    description: "用户担心产品不能满足需求",
    icon: "⚠️",
  },
  [ObjectionType.PROCRASTINATION]: {
    label: "拖延心理",
    description: "用户打算以后再考虑",
    icon: "⏰",
  },
};

export function ObjectionMap({ objections }: ObjectionMapProps) {
  if (!objections || objections.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p>未检测到明显的反对意见</p>
      </Card>
    );
  }

  // 按数量排序
  const sortedObjections = [...objections].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      {sortedObjections.map((objection) => {
        const info = OBJECTION_LABELS[objection.type];
        const severity = getObjectionSeverity(objection.count);

        return (
          <Card
            key={objection.type}
            className={`p-4 ${getSeverityStyle(severity)}`}
          >
            <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{info.label}</h4>
                  <p className="text-xs text-gray-600">{info.description}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {objection.count}
                </div>
                <div className="text-xs text-gray-500">次提及</div>
              </div>
            </div>

            {/* 示例评论 */}
            {objection.examples.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  示例评论：
                </p>
                <div className="space-y-1">
                  {objection.examples.slice(0, 2).map((example, index) => (
                    <p
                      key={index}
                      className="text-xs text-gray-600 italic pl-3 border-l-2 border-gray-300"
                    >
                      "{example.substring(0, 100)}
                      {example.length > 100 ? "..." : ""}"
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 严重程度指示器 */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">严重程度</span>
                <span className={getSeverityTextColor(severity)}>
                  {getSeverityLabel(severity)}
                </span>
              </div>
              <div
                className="w-full bg-gray-200 rounded-full h-1.5 mt-1"
                role="progressbar"
                aria-valuenow={objection.count}
                aria-valuemin={0}
                aria-valuemax={Math.max(...objections.map(o => o.count))}
                aria-label={`${info.label}严重程度: ${getSeverityLabel(severity)}`}
              >
                <div
                  className={`h-1.5 rounded-full ${getSeverityBarColor(severity)}`}
                  style={{
                    width: `${(objection.count / Math.max(...objections.map(o => o.count))) * 100}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        );
      })}

      {/* 总结卡片 */}
      <Card className="p-4 bg-primary-50 border-reddit-border">
        <h4 className="text-sm font-medium text-reddit-text mb-2">
          💡 如何应对反对意见
        </h4>
        <ul className="space-y-1 text-xs text-primary-700">
          {generateRecommendations(sortedObjections).map((rec, index) => (
            <li key={index}>• {rec}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function getObjectionSeverity(count: number): "low" | "medium" | "high" {
  if (count >= 10) return "high";
  if (count >= 5) return "medium";
  return "low";
}

function getSeverityStyle(severity: "low" | "medium" | "high"): string {
  const styles = {
    low: "bg-yellow-50 border-yellow-200",
    medium: "bg-orange-50 border-orange-200",
    high: "bg-red-50 border-red-200",
  };
  return styles[severity];
}

function getSeverityTextColor(severity: "low" | "medium" | "high"): string {
  const colors = {
    low: "text-yellow-700",
    medium: "text-orange-700",
    high: "text-red-700",
  };
  return colors[severity];
}

function getSeverityBarColor(severity: "low" | "medium" | "high"): string {
  const colors = {
    low: "bg-yellow-500",
    medium: "bg-orange-500",
    high: "bg-red-500",
  };
  return colors[severity];
}

function getSeverityLabel(severity: "low" | "medium" | "high"): string {
  const labels = {
    low: "较低",
    medium: "中等",
    high: "严重",
  };
  return labels[severity];
}

function generateRecommendations(
  objections: AppealScore["objections"]
): string[] {
  const recommendations: string[] = [];
  const types = objections.map(o => o.type);

  if (types.includes(ObjectionType.TRUST)) {
    recommendations.push("增加社会证明：展示客户评价、案例研究");
  }
  if (types.includes(ObjectionType.VALUE)) {
    recommendations.push("明确价值主张：突出ROI和独特优势");
  }
  if (types.includes(ObjectionType.COMPLEXITY)) {
    recommendations.push("简化入门体验：提供免费试用、演示视频");
  }
  if (types.includes(ObjectionType.RISK)) {
    recommendations.push("降低风险感知：提供退款保证、免费试用期");
  }

  return recommendations;
}
