/**
 * 优先级计算器测试
 * v2.6.0
 */

import {
  calculatePriority,
  calculateBatchPriority,
  sortByPriority,
  groupByPriorityLevel,
  generatePrioritySummary,
} from "../priority-calculator";
import type { Insight } from "@/lib/types";

describe("priority-calculator", () => {
  const mockInsight: Insight = {
    id: "test-1",
    type: "pain_point",
    title: "测试洞察",
    description: "测试描述",
    confidence: 0.8,
    count: 10,
    relatedComments: ["c1", "c2"],
    severity: "high",
  };

  describe("calculatePriority", () => {
    it("应该计算基础优先级分数", () => {
      const result = calculatePriority(mockInsight, 5);
      
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("level");
      expect(result).toHaveProperty("params");
      expect(result).toHaveProperty("recommendedAction");
      
      expect(result.score).toBeGreaterThan(0);
    });

    it("较低的effort应该产生更高的优先级", () => {
      const highEffort = calculatePriority(mockInsight, 10);
      const lowEffort = calculatePriority(mockInsight, 2);
      
      expect(lowEffort.score).toBeGreaterThan(highEffort.score);
    });

    it("应该为严重洞察返回更高优先级", () => {
      const criticalInsight = { ...mockInsight, severity: "critical" as const };
      const lowInsight = { ...mockInsight, severity: "low" as const };
      
      const criticalResult = calculatePriority(criticalInsight, 5);
      const lowResult = calculatePriority(lowInsight, 5);
      
      expect(criticalResult.score).toBeGreaterThan(lowResult.score);
    });

    it("应该正确分类优先级等级", () => {
      const highPriorityInsight = {
        ...mockInsight,
        count: 50,
        confidence: 0.9,
        severity: "critical" as const,
      };
      
      const result = calculatePriority(highPriorityInsight, 2);
      expect(["critical", "high"]).toContain(result.level);
    });
  });

  describe("calculateBatchPriority", () => {
    it("应该为多个洞察计算优先级", () => {
      const insights: Insight[] = [
        mockInsight,
        { ...mockInsight, id: "test-2", count: 5 },
        { ...mockInsight, id: "test-3", count: 15 },
      ];
      
      const results = calculateBatchPriority(insights);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty("priority");
      });
    });

    it("应该使用自定义effort映射", () => {
      const insights: Insight[] = [mockInsight];
      const effortMap = { "test-1": 8 };
      
      const results = calculateBatchPriority(insights, effortMap);
      
      expect(results[0].priority.params.effort).toBe(8);
    });
  });

  describe("sortByPriority", () => {
    it("应该按降序排序", () => {
      const insights = [
        { ...mockInsight, id: "1", priority: { score: 2 } as any },
        { ...mockInsight, id: "2", priority: { score: 5 } as any },
        { ...mockInsight, id: "3", priority: { score: 3 } as any },
      ];
      
      const sorted = sortByPriority(insights, "desc");
      
      expect(sorted[0].id).toBe("2");
      expect(sorted[2].id).toBe("1");
    });

    it("应该按升序排序", () => {
      const insights = [
        { ...mockInsight, id: "1", priority: { score: 2 } as any },
        { ...mockInsight, id: "2", priority: { score: 5 } as any },
        { ...mockInsight, id: "3", priority: { score: 3 } as any },
      ];
      
      const sorted = sortByPriority(insights, "asc");
      
      expect(sorted[0].id).toBe("1");
      expect(sorted[2].id).toBe("2");
    });
  });

  describe("groupByPriorityLevel", () => {
    it("应该按优先级等级分组", () => {
      const insights = [
        { ...mockInsight, id: "1", priority: { level: "critical" } as any },
        { ...mockInsight, id: "2", priority: { level: "high" } as any },
        { ...mockInsight, id: "3", priority: { level: "low" } as any },
      ];
      
      const grouped = groupByPriorityLevel(insights);
      
      expect(grouped.critical).toHaveLength(1);
      expect(grouped.high).toHaveLength(1);
      expect(grouped.low).toHaveLength(1);
      expect(grouped.medium).toHaveLength(0);
    });
  });

  describe("generatePrioritySummary", () => {
    it("应该生成优先级摘要", () => {
      const insights = [
        { ...mockInsight, id: "1", priority: { score: 5, level: "critical" } as any },
        { ...mockInsight, id: "2", priority: { score: 3, level: "high" } as any },
        { ...mockInsight, id: "3", priority: { score: 1, level: "low" } as any },
      ];
      
      const summary = generatePrioritySummary(insights);
      
      expect(summary.total).toBe(3);
      expect(summary.byCritical).toBe(1);
      expect(summary.byHigh).toBe(1);
      expect(summary.byLow).toBe(1);
      expect(summary.avgScore).toBeGreaterThan(0);
      expect(summary.topPriority).toBeDefined();
      expect(summary.topPriority?.id).toBe("1");
    });
  });
});
