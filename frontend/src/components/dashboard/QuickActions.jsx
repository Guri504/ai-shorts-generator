'use client';

import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Plus, Image, Mic, TrendingUp } from 'lucide-react';

export default function QuickActions() {
  const { setActiveTab } = useAppStore();

  const actions = [
    {
      title: 'Create New Short',
      desc: 'Start from scratch or template',
      icon: Plus,
      theme: 'bg-white text-black',
      onClick: () => setActiveTab('generator'),
    },
    {
      title: 'Gen Thumbnail',
      desc: 'AI-driven viral click-bait',
      icon: Image,
      theme: 'bg-background text-on-background border border-outline-variant',
      onClick: () => setActiveTab('thumbnails'),
    },
    {
      title: 'Voiceover',
      desc: 'Clone voice or use AI',
      icon: Mic,
      theme: 'bg-background text-on-background border border-outline-variant',
      onClick: () => setActiveTab('replace-audio'),
    },
    {
      title: 'Open Analytics',
      desc: 'Deep dive into performance',
      icon: TrendingUp,
      theme: 'bg-background text-on-background border border-outline-variant',
      onClick: () => setActiveTab('dashboard'), // stays on dashboard
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((act, index) => {
        const Icon = act.icon;
        return (
          <button
            key={index}
            onClick={act.onClick}
            className="group bg-surface-low border border-outline-variant p-6 rounded-2xl hover:border-white transition-all duration-300 flex flex-col gap-4 text-left cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${act.theme}`}>
              <Icon size={18} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">{act.title}</h3>
              <p className="text-on-surface-variant text-xs mt-1 leading-relaxed">{act.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
