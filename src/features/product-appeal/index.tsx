/**
 * 产品吸引力评估模块
 * v2.6.0 新增 - 基于 product-appeal-analyzer skill
 */

"use client";

import React from "react";
import { AppealScore } from "./components/AppealScore";
import { ObjectionMap } from "./components/ObjectionMap";
import { useAppealAnalysis } from "./hooks/useAppealAnalysis";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Comment } from "@/lib/types";

interface ProductAppealProps {
  comments: Comment[];
  onClose?: () => void;
}

export function ProductAppeal({ comments, onClose }: ProductAppealProps) {
  const { loading, error, result, analyzeAppeal, reset } = useAppealAnalysis();

  React.useEffect(() => {
    if (comments && comments.length > 0 && !result && !loading) {
      analyzeAppeal(comments);
    }
  }, [comments, result, loading, analyzeAppeal]);

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center">
          <Spinner className="w-12 h-12 mb-4" />
          <p className="text-gray-600">正在分析产品吸引力...</p>
          <p className="text-sm text-gray-500 mt-2">
            分析用户反馈中的身份契合度、问题紧急度和信任信号
          </p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <h3 className="text-red-800 font-medium mb-2">分析失败</h3>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <div className="flex gap-2">
          <Button onClick={() => analyzeAppeal(comments)} variant="default">
            重试
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              关闭
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="p-6">
        <p className="text-gray-600 text-center">暂无吸引力分析数据</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">产品吸引力评估</h2>
          <p className="text-sm text-gray-600 mt-1">
            基于 {comments.length} 条评论的综合分析
          </p>
        </div>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            关闭
          </Button>
        )}
      </div>

      {/* 评分卡片 */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          吸引力评分
        </h3>
        <AppealScore score={result} />
      </section>

      {/* 反对意见映射 */}
      {result.objections && result.objections.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            反对意见分析
          </h3>
          <ObjectionMap objections={result.objections} />
        </section>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            reset();
            analyzeAppeal(comments);
          }}
          variant="outline"
        >
          重新分析
        </Button>
      </div>
    </div>
  );
}

// 导出组件和hooks
export { AppealScore, ObjectionMap, useAppealAnalysis };
