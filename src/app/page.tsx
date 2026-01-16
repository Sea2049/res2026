"use client";

import { useState } from "react";
import { TopicSelection } from "@/features/topic-selection";
import { AnalysisDashboard } from "@/features/analysis";
import type { Subreddit, Post } from "@/lib/types";

/**
 * 首页组件
 * 整合主题筛选和评论分析功能
 */
export default function Home() {
  const [selectedTopics, setSelectedTopics] = useState<(Subreddit | Post)[]>([]);
  const [allSearchResults, setAllSearchResults] = useState<(Subreddit | Post)[]>([]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Reddit Insight Tool</h1>
          <p className="text-gray-600 text-lg">
            发现热门主题，洞察用户痛点
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              <TopicSelection
                onSelectedTopicsChange={(topics) => {
                  setSelectedTopics(topics);
                }}
                onSearchResultsChange={(results) => {
                  setAllSearchResults(results);
                }}
              />
            </div>
          </section>

          <section className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 min-h-[600px]">
              <AnalysisDashboard
                selectedTopics={selectedTopics}
                allSearchResults={allSearchResults}
                onSelectedTopicsChange={setSelectedTopics}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
