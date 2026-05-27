'use client';

import React from 'react';
import { useAppStore } from '../../store/appStore';

export default function StatsWidget() {
  const { user } = useAppStore();

  const formattedCredits = user?.credits > 9999 ? 'Unlimited' : (user?.credits ?? 0);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Views Widget */}
      <div className="bg-surface-low border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-24">
        <div>
          <p className="text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider">Views</p>
          <p className="text-2xl font-bold text-white mt-1">12.4k</p>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono">+12% vs LY</span>
      </div>

      {/* Watch Time Widget */}
      <div className="bg-surface-low border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-24">
        <div>
          <p className="text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider">Watch Time</p>
          <p className="text-2xl font-bold text-white mt-1">342h</p>
        </div>
        <span className="text-[10px] text-on-surface-variant font-mono">Total</span>
      </div>

      {/* Credits Widget */}
      <div className="bg-surface-low border border-outline-variant p-4 rounded-xl flex flex-col justify-between h-24">
        <div>
          <p className="text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider">Credits</p>
          <p className="text-2xl font-bold text-white mt-1">{formattedCredits}</p>
        </div>
        <span className="text-[10px] text-on-surface-variant font-mono">Remaining</span>
      </div>
    </div>
  );
}
