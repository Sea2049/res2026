"use client";

import { useState } from "react";
import { TopicSelection } from "@/features/topic-selection";
import type { Subreddit, Post } from "@/lib/types";

/**
 * 已选主题变化回调处理函数
 * @param topics 变化后的已选主题列表
 */
function handleSelectedTopicsChange(topics: (Subreddit | Post)[]): void {
  console.log("已选主题:", topics);
}

/**
 * 首页组件
 * 整合主题筛选和评论分析功能
 */
export default function Home() {
  const [selectedTopics, setSelectedTopics] = useState<(Subreddit | Post)[]>(
    []
  );

  return (
    <main className="min-h-screen bg-reddit-dark">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Reddit Insight Tool</h1>
          <p className="text-gray-300 text-lg">
            发现热门主题，洞察用户痛点
          </p>
        </header>

        <section>
          <div className="bg-reddit-card border border-reddit-border rounded-lg shadow-lg">
            <TopicSelection
              onSelectedTopicsChange={(topics) => {
                handleSelectedTopicsChange(topics);
                setSelectedTopics(topics);
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
