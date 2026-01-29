/**
 * 情感模式检测测试
 * v2.6.0
 */

import {
  detectWishSignal,
  detectSubType,
  detectIdentitySignals,
  detectObjectionTypes,
  calculateWishUrgency,
} from "../sentiment-patterns";

describe("sentiment-patterns", () => {
  describe("detectWishSignal", () => {
    it("应该检测到直接愿望表达", () => {
      expect(detectWishSignal("I wish they would add this feature")).toBe(true);
      expect(detectWishSignal("Would be better if it had dark mode")).toBe(true);
      expect(detectWishSignal("I want this functionality")).toBe(true);
    });

    it("应该检测到should语句", () => {
      expect(detectWishSignal("They should implement this")).toBe(true);
      expect(detectWishSignal("This needs to be added")).toBe(true);
    });

    it("应该检测到缺失表达", () => {
      expect(detectWishSignal("It's lacking a proper search function")).toBe(true);
      expect(detectWishSignal("Missing the ability to export")).toBe(true);
    });

    it("对于非愿望表达应返回false", () => {
      expect(detectWishSignal("This is great!")).toBe(false);
      expect(detectWishSignal("I have a question")).toBe(false);
    });
  });

  describe("detectSubType", () => {
    it("应该检测bug相关内容", () => {
      expect(detectSubType("This is a bug that crashes the app")).toBe("bug");
      expect(detectSubType("Getting error when I try to save")).toBe("bug");
    });

    it("应该检测性能相关内容", () => {
      expect(detectSubType("It's very slow and laggy")).toBe("performance");
      expect(detectSubType("Takes forever to load")).toBe("performance");
    });

    it("应该检测UX问题", () => {
      expect(detectSubType("The interface is confusing")).toBe("uxIssue");
      expect(detectSubType("Hard to find the settings")).toBe("uxIssue");
    });

    it("应该检测价格相关内容", () => {
      expect(detectSubType("It's too expensive for what it offers")).toBe("pricing");
      expect(detectSubType("Not worth the subscription price")).toBe("pricing");
    });

    it("对于不匹配的内容应返回null", () => {
      expect(detectSubType("This is a general comment")).toBe(null);
    });
  });

  describe("detectIdentitySignals", () => {
    it("应该提取自我认同表达", () => {
      const signals = detectIdentitySignals("As a developer, I find this useful");
      expect(signals).toContain("developer");
    });

    it("应该提取多个身份信号", () => {
      const signals = detectIdentitySignals(
        "I'm a small business owner and people like me need this"
      );
      expect(signals.length).toBeGreaterThan(0);
    });

    it("对于无身份信号的文本应返回空数组", () => {
      const signals = detectIdentitySignals("This is a great product");
      expect(signals).toEqual([]);
    });
  });

  describe("detectObjectionTypes", () => {
    it("应该检测信任问题", () => {
      const objections = detectObjectionTypes("Is this legit or a scam?");
      expect(objections).toContain("trust");
    });

    it("应该检测价值感知问题", () => {
      const objections = detectObjectionTypes("Too expensive for what you get");
      expect(objections).toContain("value");
    });

    it("应该检测复杂度担忧", () => {
      const objections = detectObjectionTypes("This looks too complicated");
      expect(objections).toContain("complexity");
    });

    it("应该检测多个反对意见", () => {
      const objections = detectObjectionTypes(
        "It's too expensive and too complicated"
      );
      expect(objections.length).toBeGreaterThanOrEqual(2);
    });

    it("对于无反对意见的文本应返回空数组", () => {
      const objections = detectObjectionTypes("This is perfect");
      expect(objections).toEqual([]);
    });
  });

  describe("calculateWishUrgency", () => {
    it("应该为高频率愿望返回更高分数", () => {
      const text = "I desperately need this feature now";
      const highFreq = calculateWishUrgency(text, 15);
      const lowFreq = calculateWishUrgency(text, 2);
      expect(highFreq).toBeGreaterThan(lowFreq);
    });

    it("应该为包含紧急词的文本返回更高分数", () => {
      const urgent = calculateWishUrgency("I urgently need this asap", 5);
      const normal = calculateWishUrgency("I need this", 5);
      expect(urgent).toBeGreaterThan(normal);
    });

    it("应该返回0-10范围内的分数", () => {
      const score = calculateWishUrgency("I wish they would add this", 5);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });
});
