import type { AnalysisSession } from "@/lib/types";
import { useState, useEffect } from "react";

/**
 * AnalysisProgress 组件 Props 接口
 */
interface AnalysisProgressProps {
  /**
   * 分析会话状态
   */
  session: AnalysisSession;
  /**
   * 取消分析事件
   */
  onCancel?: () => void;
  /**
   * 额外的类名
   */
  className?: string;
}

/**
 * 步骤映射表
 */
const STEP_LABELS: Record<AnalysisSession["status"], string> = {
  idle: "准备开始",
  fetching: "正在获取数据",
  analyzing: "正在分析",
  completed: "分析完成",
  error: "发生错误",
};

/**
 * 计算预计剩余时间（秒）
 * @param progress 当前进度百分比
 * @param startTime 开始时间戳
 * @returns 预计剩余秒数
 */
function estimateRemainingTime(progress: number, startTime: number): number | null {
  if (progress <= 0 || progress >= 100) return null;
  
  const elapsed = (Date.now() - startTime) / 1000; // 已经过的秒数
  const progressRatio = progress / 100;
  const estimatedTotal = elapsed / progressRatio; // 预计总秒数
  const remaining = estimatedTotal - elapsed;
  
  return Math.max(0, Math.round(remaining));
}

/**
 * 格式化剩余时间
 * @param seconds 剩余秒数
 * @returns 格式化的时间字符串
 */
function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分`;
}

/**
 * 分析进度组件
 * 展示当前分析阶段、进度百分比、详细步骤和预计剩余时间
 */
export function AnalysisProgress({
  session,
  onCancel,
  className,
}: AnalysisProgressProps) {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  
  const isInProgress =
    session.status === "fetching" || session.status === "analyzing";
  const isCompleted = session.status === "completed";
  const isError = session.status === "error";

  // 计算预计剩余时间
  useEffect(() => {
    if (!isInProgress || session.createdAt === 0) {
      setRemainingTime(null);
      return;
    }

    const updateRemainingTime = () => {
      const remaining = estimateRemainingTime(session.progress, session.createdAt);
      setRemainingTime(remaining);
    };

    // 立即计算一次
    updateRemainingTime();

    // 每秒更新一次
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [isInProgress, session.progress, session.createdAt]);

  const getProgressColor = (): string => {
    if (isError) return "bg-red-500";
    if (isCompleted) return "bg-green-500";
    return "bg-blue-500";
  };

  const getStatusIcon = (): { icon: string; color: string } => {
    switch (session.status) {
      case "fetching":
        return { icon: "📥", color: "text-blue-600" };
      case "analyzing":
        return { icon: "🔍", color: "text-purple-600" };
      case "completed":
        return { icon: "✅", color: "text-green-600" };
      case "error":
        return { icon: "❌", color: "text-red-600" };
      default:
        return { icon: "⏳", color: "text-gray-600" };
    }
  };

  const statusInfo = getStatusIcon();

  const getStepDetails = (): { label: string; progress: number; details?: string }[] => {
    const baseProgress = session.progress;

    switch (session.status) {
      case "fetching":
        return [
          { 
            label: "获取评论数据", 
            progress: Math.min(baseProgress, 50),
            details: `正在从 Reddit API 获取评论数据`
          },
          { 
            label: "分析处理", 
            progress: 0,
            details: "等待数据获取完成"
          },
        ];
      case "analyzing":
        // 根据当前进度判断具体在哪个分析步骤
        const analysisProgress = (baseProgress - 50) * 2;
        let details = "";
        let keywordProgress = Math.min(analysisProgress, 33.3);
        let sentimentProgress = analysisProgress > 33.3 ? Math.min((analysisProgress - 33.3) * 1.5, 50) : 0;
        let insightProgress = analysisProgress > 66.6 ? Math.min((analysisProgress - 66.6) * 3, 50) : 0;
        
        if (analysisProgress < 40) {
          details = "提取高频关键词，分析讨论焦点";
        } else if (analysisProgress < 80) {
          details = "分析评论情感倾向";
        } else {
          details = "检测用户痛点和需求洞察";
        }

        return [
          { 
            label: "获取评论数据", 
            progress: 100,
            details: "已完成评论数据获取"
          },
          { 
            label: "分析处理", 
            progress: Math.min(analysisProgress, 50),
            details
          },
        ];
      case "completed":
        return [
          { 
            label: "获取评论数据", 
            progress: 100,
            details: "已完成评论数据获取"
          },
          { 
            label: "分析处理", 
            progress: 100,
            details: "已完成关键词提取、情感分析和洞察检测"
          },
        ];
      default:
        return [
          { 
            label: "准备开始", 
            progress: 0,
            details: "等待开始分析"
          },
          { 
            label: "等待中...", 
            progress: 0,
          },
        ];
    }
  };

  const steps = getStepDetails();

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm ${className || ""}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">分析进度</h3>
        <div className={`flex items-center gap-2 ${statusInfo.color}`}>
          <span className="text-xl">{statusInfo.icon}</span>
          <span className="font-medium">{STEP_LABELS[session.status]}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>总体进度</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{session.progress}%</span>
            {remainingTime !== null && isInProgress && (
              <span className="text-xs text-gray-500">
                预计剩余 {formatRemainingTime(remainingTime)}
              </span>
            )}
          </div>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${session.progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                step.progress === 100
                  ? "bg-green-100 text-green-600"
                  : step.progress > 0
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {step.progress === 100 ? "✓" : index + 1}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span
                  className={
                    step.progress > 0 ? "text-gray-900" : "text-gray-500"
                  }
                >
                  {step.label}
                </span>
                <span
                  className={
                    step.progress > 0 ? "text-gray-600" : "text-gray-400"
                  }
                >
                  {step.progress}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    step.progress === 100
                      ? "bg-green-500"
                      : step.progress > 0
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                  style={{ width: `${step.progress}%` }}
                />
              </div>
              {step.details && step.progress > 0 && (
                <p className="text-xs text-gray-500 mt-1">{step.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {session.currentStep && session.status !== "completed" && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">{session.currentStep}</p>
        </div>
      )}

      {session.error && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-700">{session.error}</p>
        </div>
      )}

      {isInProgress && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消分析
          </button>
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            分析完成！共处理 {session.result?.comments.length || 0} 条评论
          </p>
        </div>
      )}
    </div>
  );
}
