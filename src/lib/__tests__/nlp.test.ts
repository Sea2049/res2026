import { normalizeText, tokenize, removeStopWords, extractKeywords, analyzeSentiment } from '../nlp';
import { AnalysisConfig } from '../types';

const mockConfig: AnalysisConfig = {
  maxComments: 100,
  minKeywordLength: 3,
  topKeywordsCount: 10,
  sentimentThreshold: 0.2,
  enableInsightDetection: true,
};

describe('NLP Module', () => {
  describe('normalizeText', () => {
    it('should remove URLs', () => {
      expect(normalizeText('Check this link https://example.com/page')).toBe('check this link');
    });

    it('should remove punctuation but keep words', () => {
      expect(normalizeText("Hello, world!")).toBe('hello world');
    });

    it('should remove apostrophes in contractions', () => {
      expect(normalizeText("I can't do that")).toBe('i cant do that');
    });
    
    it('should remove reddit references', () => {
      expect(normalizeText("check r/reactjs and u/someone")).toBe('check and');
    });
  });

  describe('tokenize', () => {
    it('should split text into words', () => {
      expect(tokenize('hello world')).toEqual(['hello', 'world']);
    });

    it('should remove numbers', () => {
      expect(tokenize('I have 2 apples')).toEqual(['i', 'have', 'apples']);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should detect positive sentiment', () => {
      const result = analyzeSentiment('This tool is amazing and helpful');
      expect(result.sentiment).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const result = analyzeSentiment('This is terrible and broken');
      expect(result.sentiment).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should handle negation', () => {
      const result = analyzeSentiment('This is not good');
      // "good" is +1, "not" reverses it to -1.
      expect(result.score).toBeLessThan(0);
    });

    it('should handle intensifiers', () => {
      // 混合情感测试，以避免单词分数饱和
      const normal = analyzeSentiment('It was good but bad');
      // good(1) + bad(-1) = 0
      
      const intense = analyzeSentiment('It was very good but bad');
      // very good(1.5) + bad(-1) = 0.5
      
      expect(intense.score).toBeGreaterThan(normal.score);
    });
  });

  describe('extractKeywords', () => {
    it('should extract and count keywords with stemming', () => {
      const comments = [
        { id: '1', body: 'I enjoy running', author: 'a', score: 1, created_utc: 1, parent_id: '1' },
        { id: '2', body: 'He enjoyed the run', author: 'b', score: 1, created_utc: 1, parent_id: '1' },
      ];
      
      // "enjoy" and "enjoyed" should be stemmed to "enjoy"
      const keywords = extractKeywords(comments, mockConfig);
      const enjoyKeyword = keywords.find(k => k.word === 'enjoy' || k.word === 'enjoyed');
      
      expect(enjoyKeyword).toBeDefined();
      expect(enjoyKeyword?.count).toBe(2);
    });
  });
});
