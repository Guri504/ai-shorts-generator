'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import Dashboard from '../components/Dashboard';
import Generator from '../components/Generator';
import Editor from '../components/Editor';
import Settings from '../components/Settings';
import Auth from '../components/Auth';
import MergeClips from '../components/MergeClips';
import ReplaceAudio from '../components/ReplaceAudio';
import TrimAudio from '../components/TrimAudio';
import ThumbnailStudio from '../components/ThumbnailStudio';
import { Video, Film, Key, AlertTriangle, Coins, LogOut, User, Layers, Music, Scissors, Image, Search, Bell, Menu, X } from 'lucide-react';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      case 'editor':
        return <Editor />;
      case 'settings':
        return <Settings />;
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

  return (
    <div className="flex flex-col md:flex-row flex-grow min-h-screen md:h-screen md:overflow-hidden bg-slate-50 text-slate-800">

      {/* Mobile Sidebar backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* FIXED LEFT SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-6 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 shrink-0 md:h-screen overflow-y-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>

        {/* Top: Logo and items */}
        <div className="space-y-8">
          <div className="flex items-center justify-between gap-2.5 px-2">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-violet-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20 font-black">
                ⚡
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                ShortsAI
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'dashboard'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Video size={16} />
              My Videos
            </button>

            <button
              onClick={() => { setActiveTab('generator'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'generator'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Film size={16} />
              Create Video
            </button>

            <button
              onClick={() => { setActiveTab('merge-clips'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'merge-clips'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Layers size={16} />
              Merge Clips
            </button>

            <button
              onClick={() => { setActiveTab('replace-audio'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'replace-audio'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Music size={16} />
              Replace Audio
            </button>

            <button
              onClick={() => { setActiveTab('trim-audio'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'trim-audio'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Scissors size={16} />
              Trim Audio
            </button>

            <button
              onClick={() => { setActiveTab('thumbnails'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'thumbnails'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Image size={16} />
              Thumbnail Studio
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={`w-full flex justify-between items-center px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${activeTab === 'settings'
                  ? 'bg-violet-50 text-violet-600 shadow-sm border border-violet-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <span className="flex items-center gap-3">
                <Key size={16} />
                API Settings
              </span>
              {!settings.hasGeminiKey && (
                <AlertTriangle size={14} className="text-amber-500 animate-pulse animate-infinite" />
              )}
            </button>
          </nav>
        </div>

        {/* Bottom Status Panel */}
        <div className="mt-8 pt-4 border-t border-slate-100 px-1 space-y-4">
          {/* User Profile Card */}
          <div className="bg-slate-50/80 border border-slate-200/50 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <div className="h-6 w-6 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-black">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="truncate max-w-[130px]" title={user?.name || user?.email}>{user?.name || user?.email}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-between">
              <span>Account Type:</span>
              <span className="capitalize font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100/55">{user?.plan || 'Free'}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-semibold">
            <div className="flex items-center justify-between text-slate-500">
              <span>Gemini API:</span>
              {settings.hasGeminiKey ? (
                <span className="text-emerald-500 font-bold">● Active</span>
              ) : (
                <span className="text-red-500 font-bold">● Missing</span>
              )}
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Pexels Stock:</span>
              {settings.hasPexelsKey ? (
                <span className="text-emerald-500 font-bold">● Ready</span>
              ) : (
                <span className="text-amber-500 font-bold">● Fallback</span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 border border-red-100 hover:bg-red-100/70 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut size={14} />
            Logout Session
          </button>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-grow bg-slate-100 flex flex-col h-full md:h-screen overflow-y-auto">

        {/* STICKY TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shadow-sm gap-4">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden cursor-pointer shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search scripts, renders, thumbnails..."
              className="w-full bg-slate-55/60 border border-slate-200 focus:border-violet-500 focus:bg-white rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Credits indicator badge */}
            <div className="flex items-center gap-1.5 bg-amber-50/70 border border-amber-200/60 px-3.5 py-1.5 rounded-xl text-xs font-bold">
              <Coins size={14} className="text-amber-500" />
              <span className="text-slate-500">Credits:</span>
              <span className="text-amber-600">{user?.credits > 9999 ? 'Unlimited' : (user?.credits ?? 0)}</span>
            </div>

            {/* Notifications */}
            <button className="h-8.5 w-8.5 rounded-xl bg-slate-100/50 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition relative cursor-pointer">
              <Bell size={16} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 bg-violet-600 rounded-full"></span>
            </button>

            {/* Avatar Dropdown wrapper */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="h-8.5 w-8.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-violet-500/20">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'SaaS User'}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{user?.plan || 'Free Plan'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN VIEWPORT CONTENT */}
        <div className="flex-grow p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
          {/* Global Key Warning Alert Banner */}
          {!settings.hasGeminiKey && activeTab !== 'settings' && (
            <div className="w-full p-3 bg-red-50 border border-red-150 rounded-xl flex items-center justify-between text-red-600 text-xs shadow-sm">
              <span className="flex items-center gap-2 font-medium">
                <AlertTriangle size={16} />
                Setup is incomplete! Gemini API Key is missing.
              </span>
              <button
                onClick={() => setActiveTab('settings')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider cursor-pointer transition"
              >
                Configure Now
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
