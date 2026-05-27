'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import StatsWidget from './dashboard/StatsWidget';
import QuickActions from './dashboard/QuickActions';
import ProjectsTable from './dashboard/ProjectsTable';
import LiveActivity from './dashboard/LiveActivity';
import TrendingTopics from './dashboard/TrendingTopics';
import DashboardFooter from './dashboard/DashboardFooter';

export default function Dashboard() {
  const { projects, isLoadingProjects, fetchProjects } = useAppStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Cinematic Dark Skeleton Loader
  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="space-y-8 animate-pulse text-on-background">
        {/* Welcome & Stats Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-7 space-y-3">
            <div className="h-10 w-64 bg-surface-low rounded-lg" />
            <div className="h-5 w-96 bg-surface-low/80 rounded-lg" />
          </div>
          <div className="lg:col-span-5 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-24 bg-surface-low border border-outline-variant rounded-xl" />
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="h-28 bg-surface-low border border-outline-variant rounded-2xl" />
          ))}
        </div>

        {/* Table & Timeline Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-[360px] bg-surface-low border border-outline-variant rounded-2xl" />
          <div className="lg:col-span-4 space-y-6">
            <div className="h-[180px] bg-surface-low border border-outline-variant rounded-2xl" />
            <div className="h-[160px] bg-surface-low border border-outline-variant rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-on-background">
      
      {/* Welcome & Stats Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        <div className="lg:col-span-7 space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, Creator
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">
            Your AI studio is ready. What are we making today?
          </p>
        </div>
        <div className="lg:col-span-5">
          <StatsWidget />
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section>
        <QuickActions />
      </section>

      {/* Main Split Grid (Recent Projects + Timelines) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <ProjectsTable />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <LiveActivity />
          <TrendingTopics />
        </div>
      </section>

      {/* Quotas & Operations Footer */}
      <DashboardFooter />

    </div>
  );
}
