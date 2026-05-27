'use client';

import React from 'react';
import { useAppStore } from '../../store/appStore';
import { TrendingUp, Minus } from 'lucide-react';

export default function TrendingTopics() {
  const { setActiveTab } = useAppStore();

  const topics = [
    { name: '#VisionPro Apps', score: 98, trend: 'up' },
    { name: 'Daily Hustle AI', score: 84, trend: 'up' },
    { name: 'Crypto Mini-docs', score: 71, trend: 'flat' },
  ];

  return (
    <div className="bg-surface-low border border-outline-variant rounded-2xl p-6">
      <h2 className="text-white font-bold text-sm mb-4">Trending Topics</h2>
      <div className="space-y-2">
        {topics.map((topic, index) => (
          <div
            key={index}
            onClick={() => setActiveTab('generator')}
            className="bg-surface-lowest border border-outline-variant px-3.5 py-2.5 rounded-xl flex items-center justify-between group cursor-pointer hover:border-zinc-400 transition-all duration-200"
          >
            <span className="text-xs font-semibold text-on-surface group-hover:text-white">
              {topic.name}
            </span>
            <div className="flex items-center gap-1.5">
              {topic.trend === 'up' ? (
                <>
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">{topic.score}</span>
                </>
              ) : (
                <>
                  <Minus size={12} className="text-on-surface-variant" />
                  <span className="text-[10px] font-bold text-on-surface-variant font-mono">{topic.score}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
