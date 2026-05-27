'use client';

import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Radio } from 'lucide-react';

export default function LiveActivity() {
  const { projects } = useAppStore();

  // Find processing projects
  const activeRenders = projects.filter(
    (p) => p.status === 'rendering' || p.status === 'queued'
  );

  return (
    <div className="bg-surface-low border border-outline-variant rounded-2xl p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-white font-bold text-sm">Live Activity</h2>
        <Radio size={16} className="text-violet-500 animate-pulse" />
      </div>

      <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
        {/* Active Renders */}
        {activeRenders.map((proj) => (
          <div key={proj.id} className="flex gap-3">
            <div className="w-1 h-10 bg-white rounded-full mt-1 shrink-0"></div>
            <div>
              <p className="text-xs text-white font-medium truncate max-w-[200px]" title={proj.topic}>
                Rendering: {proj.topic}
              </p>
              <p className="text-[9px] text-on-surface-variant font-mono mt-0.5 uppercase tracking-wider">
                {proj.stepStatus || 'Processing...'} • {proj.progress}%
              </p>
            </div>
          </div>
        ))}

        {/* Fallback/Mock logs */}
        <div className="flex gap-3">
          <div className="w-1 h-10 bg-emerald-500 rounded-full mt-1 shrink-0"></div>
          <div>
            <p className="text-xs text-zinc-300">Auto-subtitles module ready</p>
            <p className="text-[9px] text-on-surface-variant font-mono mt-0.5 uppercase tracking-wider">
              SUBTITLE GEN • Ready
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-1 h-10 bg-outline-variant rounded-full mt-1 shrink-0"></div>
          <div>
            <p className="text-xs text-zinc-400">Workspace sync successful</p>
            <p className="text-[9px] text-on-surface-variant font-mono mt-0.5 uppercase tracking-wider">
              SYSTEM • 5m ago
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-1 h-10 bg-outline-variant rounded-full mt-1 shrink-0"></div>
          <div>
            <p className="text-xs text-zinc-400">ShortsAI model v3.0 initialized</p>
            <p className="text-[9px] text-on-surface-variant font-mono mt-0.5 uppercase tracking-wider">
              AI ENGINE • 12m ago
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
