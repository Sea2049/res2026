/**
 * 产品吸引力分析Hook
 * v2.6.0 新增 - 基于 product-appeal-analyzer skill
 */

import { useState, useCallback } from "react";
import type { Comment, AppealScore, ObjectionType } from "@/lib/types";

interface AppealAnalysisState {
  loading: boolean;
  error: string | null;
  result: AppealScore | null;
}

/**
 * 产品吸引力分析Hook
 */
export function useAppealAnalysis() {
  const [state, setState] = useState<AppealAnalysisState>({
    loading: false,
    error: null,
    result: null,
  });

  /**
   * 分析评论的产品吸引力
   */
  const analyzeAppeal = useCallback(async (comments: Comment[]) => {
    if (!comments || comments.length === 0) {
      setState({
        loading: false,
        error: "没有可分析的评论",
        result: null,
      });
      return;
    }

    setState({
      loading: true,
      error: null,
      result: null,
    });

    try {
      const response = await fetch("/api/analysis/appeal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comments }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      setState({
        loading: false,
        error: null,
        result: data.appealScore,
      });
    } catch (error) {
      console.error("Appeal analysis error:", error);
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "分析失败",
        result: null,
      });
    }
  }, []);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      result: null,
    });
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    result: state.result,
    analyzeAppeal,
    reset,
  };
}
