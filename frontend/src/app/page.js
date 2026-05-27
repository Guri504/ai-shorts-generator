'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import Dashboard from '../components/Dashboard';
import Generator from '../components/Generator';
import Editor from '../components/Editor';
import SocialMedia from '../components/SocialMedia';
import Auth from '../components/Auth';
import MergeClips from '../components/MergeClips';
import ReplaceAudio from '../components/ReplaceAudio';
import TrimAudio from '../components/TrimAudio';
import ThumbnailStudio from '../components/ThumbnailStudio';
import YoutubeShortsGenerator from '../components/YoutubeShortsGenerator';
import InstagramReelsGenerator from '../components/InstagramReelsGenerator';
import LinkedinPostGenerator from '../components/LinkedinPostGenerator';
import { Video, Film, Key, AlertTriangle, Coins, LogOut, User, Layers, Music, Scissors, Image, Search, Bell, Menu, X, LayoutGrid, Share2 } from 'lucide-react';
import { Popover, Button } from '@heroui/react';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    fetchSettings,
    fetchProjects,
    settings,
    isAuthenticated,
    user,
    logout,
    fetchYouTubeAccounts
  } = useAppStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      // Bootstrap configurations and pull project lists
      fetchSettings();
      fetchProjects();
      fetchYouTubeAccounts();
    }
  }, [fetchSettings, fetchProjects, fetchYouTubeAccounts, isAuthenticated, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'generator':
        return <Generator />;
      case 'youtube-shorts':
        return <YoutubeShortsGenerator />;
      case 'instagram-reels':
        return <InstagramReelsGenerator />;
      case 'linkedin-post':
        return <LinkedinPostGenerator />;
      case 'editor':
        return <Editor />;
      case 'social-media':
        return <SocialMedia />;
      case 'merge-clips':
        return <MergeClips />;
      case 'replace-audio':
        return <ReplaceAudio />;
      case 'trim-audio':
        return <TrimAudio />;
      case 'thumbnails':
        return <ThumbnailStudio />;
      default:
        return <Dashboard />;
    }
  };

  const apps = [
    { id: 'dashboard', name: 'My Videos', icon: Video, color: 'text-blue-500 bg-blue-50/70' },
    { id: 'generator', name: 'Create Video', icon: Film, color: 'text-violet-500 bg-violet-50/70' },
    { id: 'youtube-shorts', name: 'YouTube Shorts', icon: Video, color: 'text-red-500 bg-red-50/20' },
    { id: 'instagram-reels', name: 'Instagram Reels', icon: Film, color: 'text-pink-555 bg-pink-50/70' },
    { id: 'linkedin-post', name: 'LinkedIn Post', icon: Layers, color: 'text-blue-400 bg-blue-50/70' },
    { id: 'merge-clips', name: 'Merge Clips', icon: Layers, color: 'text-emerald-500 bg-emerald-50/70' },
    { id: 'replace-audio', name: 'Replace Audio', icon: Music, color: 'text-pink-500 bg-pink-50/70' },
    { id: 'trim-audio', name: 'Trim Audio', icon: Scissors, color: 'text-amber-500 bg-amber-50/70' },
    { id: 'thumbnails', name: 'Thumbnail Studio', icon: Image, color: 'text-cyan-500 bg-cyan-50/70' },
    { id: 'social-media', name: 'Social Media', icon: Share2, color: 'text-rose-500 bg-rose-50/70' },
  ];

  return (
    <div className="flex flex-col flex-grow min-h-screen h-screen overflow-hidden bg-background text-on-background">

      {/* MAIN VIEW AREA */}
      <main className="flex-grow bg-background flex flex-col h-full overflow-y-auto">

        {/* STICKY TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-[100] bg-surface-lowest border-b border-outline-variant px-10 h-16 flex justify-between items-center shrink-0">
          
          {/* Brand Logo & Switcher & Navigation Links */}
          <div className="flex items-center gap-6 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tighter text-white">ShortsAI</span>
            </div>

            {/* Workspace Switcher */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-surface-high border border-outline-variant cursor-pointer hover:bg-surface-highest transition-colors">
              <span className="font-mono uppercase tracking-wider text-[10px] text-on-surface-variant">Creator Workspace</span>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6 ml-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`font-semibold text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer pb-1 ${
                  activeTab === 'dashboard' ? 'text-white border-b-2 border-white' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('generator')}
                className={`font-semibold text-[10px] uppercase tracking-widest transition-all duration-200 cursor-pointer pb-1 ${
                  activeTab === 'generator' ? 'text-white border-b-2 border-white' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                Projects
              </button>
            </nav>
          </div>

          {/* Right Header Section */}
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative group hidden lg:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search projects..."
                className="bg-surface-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-xs text-on-surface w-64 focus:outline-none focus:border-white transition-all placeholder:text-on-surface-variant/50"
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="p-2 text-on-surface-variant hover:text-white transition-colors relative cursor-pointer" title="Notifications">
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-white rounded-full"></span>
              </button>

              {/* Apps Trigger Popover */}
              <Popover isOpen={isAppsOpen} onOpenChange={setIsAppsOpen}>
                <Popover.Trigger>
                  <Button
                    variant="light"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:bg-surface-high rounded transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    <LayoutGrid size={16} />
                    <span className="hidden sm:inline">Apps</span>
                  </Button>
                </Popover.Trigger>
                <Popover.Content className="w-[320px] p-4 bg-surface-highest border border-outline rounded-2xl shadow-xl z-[150] focus:outline-none text-on-surface">
                  <Popover.Dialog className="outline-none">
                    {/* Suite Header */}
                    <div className="px-1 pb-2.5 mb-3 border-b border-outline-variant flex items-center justify-between">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ShortsAI Suite</span>
                    </div>

                    {/* Apps Grid */}
                    <div className="grid grid-cols-3 gap-1">
                      {apps.map((app) => {
                        const Icon = app.icon;
                        const isActive = activeTab === app.id;
                        return (
                          <button
                            key={app.id}
                            onClick={() => {
                              setActiveTab(app.id);
                              setIsAppsOpen(false);
                            }}
                            className={`group flex flex-col items-center justify-center text-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer border ${
                              isActive
                                ? 'bg-surface-high text-white border-outline-variant shadow-sm font-semibold'
                                : 'border-transparent hover:bg-surface-low text-on-surface-variant hover:text-white'
                            }`}
                          >
                            <div className={`h-11 w-11 rounded-xl flex items-center justify-center mb-1.5 transition-transform duration-200 group-hover:scale-105 relative ${
                              isActive ? 'bg-surface-container text-white' : 'bg-surface-lowest text-on-surface-variant'
                            }`}>
                              <Icon size={20} />
                              {app.id === 'social-media' && !settings.hasGeminiKey && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-[#353534] flex items-center justify-center animate-pulse" />
                              )}
                            </div>
                            <span className="text-[10px] font-bold tracking-tight line-clamp-2 leading-tight">
                              {app.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Account & Status info */}
                    <div className="pt-3 mt-3 border-t border-outline-variant space-y-3">
                      {/* User profile card */}
                      <div className="bg-surface-lowest border border-outline-variant rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-inner">
                        <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                          <div className="h-6.5 w-6.5 rounded-lg bg-surface-high text-white flex items-center justify-center font-black">
                            {user?.name ? user.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="truncate max-w-[130px] leading-tight text-white" title={user?.name || user?.email}>
                              {user?.name || user?.email}
                            </span>
                            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider leading-none mt-0.5">
                              {user?.plan || 'Free'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            logout();
                            setIsAppsOpen(false);
                          }}
                          className="p-1.5 hover:bg-surface-high text-red-400 hover:text-red-300 rounded-lg transition-colors cursor-pointer"
                          title="Logout Session"
                        >
                          <LogOut size={16} />
                        </button>
                      </div>

                      {/* Status badges */}
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-on-surface-variant bg-surface-lowest p-2 rounded-xl border border-outline-variant">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className={`h-1.5 w-1.5 rounded-full ${settings.hasGeminiKey ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                          <span>Gemini: {settings.hasGeminiKey ? 'Active' : 'Missing'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className={`h-1.5 w-1.5 rounded-full ${settings.hasPexelsKey ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span>Pexels: {settings.hasPexelsKey ? 'Ready' : 'Fallback'}</span>
                        </div>
                      </div>
                    </div>
                  </Popover.Dialog>
                </Popover.Content>
              </Popover>

              {/* Quick Create Button */}
              <button
                onClick={() => setActiveTab('generator')}
                className="bg-white hover:opacity-90 active:scale-95 text-black font-bold px-4 py-1.5 rounded text-xs transition-all cursor-pointer hidden sm:block"
              >
                Quick Create
              </button>

              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant bg-surface-high flex items-center justify-center font-bold text-white text-xs select-none">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT CONTENT */}
        <div className="flex-grow p-4 md:p-10 w-full max-w-container-max mx-auto space-y-6">
          {/* Global Key Warning Alert Banner */}
          {!settings.hasGeminiKey && activeTab !== 'social-media' && (
            <div className="w-full p-3 bg-red-950/20 border border-red-500/20 rounded-xl flex items-center justify-between text-red-400 text-xs shadow-sm">
              <span className="flex items-center gap-2 font-medium">
                <AlertTriangle size={16} />
                Setup is incomplete! Gemini API Key is missing.
              </span>
              <button
                onClick={() => setActiveTab('social-media')}
                className="px-3 py-1 bg-white hover:bg-zinc-200 text-black rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition"
              >
                View Status
              </button>
            </div>
          )}

          {/* ACTIVE MAIN VIEW PANEL */}
          <div className="w-full">
            {renderActiveView()}
          </div>
        </div>
      </main>

    </div>
  );
}
