'use client';

import Link from 'next/link';

export default function DashboardFooter() {
  return (
    <footer className="pt-6 border-t border-outline-variant mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
      {/* Storage and render stats */}
      <div className="flex gap-6">
        <p>Storage: 24.5 GB / 100 GB</p>
        <p>Monthly Render Limit: 45 / 500</p>
      </div>

      {/* Policies and live systems status */}
      <div className="flex gap-6 items-center">
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        <a href="#" className="hover:text-white transition-colors">Terms</a>
        <div className="flex items-center gap-1.5 bg-surface-lowest px-2.5 py-1 rounded-lg border border-outline-variant">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-on-surface">All Systems Operational</span>
        </div>
      </div>
    </footer>
  );
}
