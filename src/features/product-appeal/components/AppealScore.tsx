/**
 * 产品吸引力评分组件
 * v2.6.0 新增
 */

"use client";

import React from "react";
import type { AppealScore as AppealScoreType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AppealScoreProps {
  score: AppealScoreType;
}

export function AppealScore({ score }: AppealScoreProps) {
  // 根据分数确定颜色
  const getScoreColor = (value: number): string => {
    if (value >= 8) return "text-green-600";
    if (value >= 6) return "text-blue-600";
    if (value >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (value: number): string => {
    if (value >= 8) return "bg-green-50 border-green-200";
    if (value >= 6) return "bg-blue-50 border-blue-200";
    if (value >= 4) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-4">
      {/* 综合评分 */}
      <Card className={`p-6 ${getScoreBg(score.overall)}`}>
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            产品吸引力综合评分
          </h3>
          <div className={`text-5xl font-bold ${getScoreColor(score.overall)}`}>
            {score.overall.toFixed(1)}
            <span className="text-2xl text-gray-400">/10</span>
          </div>
        </div>
      </Card>

      {/* 三个维度评分 */}
      <div className="grid grid-cols-3 gap-4">
        <ScoreDimension
          label="身份契合度"
          value={score.identityFit}
          icon="👤"
        />
        <ScoreDimension
          label="问题紧急度"
          value={score.problemUrgency}
          icon="⚡"
        />
        <ScoreDimension
          label="信任信号"
          value={score.trustSignals}
          icon="🛡️"
        />
      </div>

      {/* 改进建议 */}
      {score.recommendations.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            改进建议
          </h4>
          <ul className="space-y-2">
            {score.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="mr-2">💡</span>
                <span className="text-gray-600">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 目标用户画像 */}
      {score.targetPersonas.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            目标用户画像
          </h4>
          <div className="flex flex-wrap gap-2">
            {score.targetPersonas.map((persona, index) => (
              <Badge key={index} variant="secondary">
                {persona}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ScoreDimension({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  const getColor = (v: number): string => {
    if (v >= 8) return "text-green-600";
    if (v >= 6) return "text-blue-600";
    if (v >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getBarColor = (v: number): string => {
    if (v >= 8) return "bg-green-500";
    if (v >= 6) return "bg-blue-500";
    if (v >= 4) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="p-4">
      <div className="text-center mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-xs text-gray-600 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${getColor(value)} mb-2`}>
        {value.toFixed(1)}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getBarColor(value)}`}
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </Card>
  );
}
