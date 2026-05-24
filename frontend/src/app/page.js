'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import Dashboard from '../components/Dashboard';
import Generator from '../components/Generator';
import Editor from '../components/Editor';
import Settings from '../components/Settings';
import { Video, Film, Key, Sliders, AlertTriangle } from 'lucide-react';

export default function Page() {
  const { activeTab, setActiveTab, fetchSettings, fetchProjects, settings } = useAppStore();

  useEffect(() => {
    // Bootstrap configurations and pull project lists
    fetchSettings();
    fetchProjects();
  }, [fetchSettings, fetchProjects]);

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-grow min-h-screen bg-slate-950 text-slate-100">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-950/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-900/60 p-5 flex flex-col justify-between shrink-0">
        
        {/* Top: Logo and items */}
        <div className="space-y-8">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/20">
              ⚡
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-violet-400 to-emerald-400 bg-clip-text text-transparent">
              ShortsAI
            </span>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-violet-600/10 text-violet-400 border-l-3 border-violet-500 pl-2'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`}
            >
              <Video size={18} />
              My Videos
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'generator'
                  ? 'bg-violet-600/10 text-violet-400 border-l-3 border-violet-500 pl-2'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`}
            >
              <Film size={18} />
              Create Video
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex justify-between items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-violet-600/10 text-violet-400 border-l-3 border-violet-500 pl-2'
                  : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <Key size={18} />
                API Settings
              </span>
              {!settings.hasGeminiKey && (
                <AlertTriangle size={14} className="text-yellow-500 animate-pulse" />
              )}
            </button>
          </nav>
        </div>

        {/* Bottom Status Panel */}
        <div className="mt-8 pt-4 border-t border-slate-900/80 px-2 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Gemini API:</span>
            {settings.hasGeminiKey ? (
              <span className="text-green-500 font-bold flex items-center gap-1">● Ready</span>
            ) : (
              <span className="text-red-500 font-bold flex items-center gap-1">● Missing</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Pexels Stock:</span>
            {settings.hasPexelsKey ? (
              <span className="text-green-500 font-bold flex items-center gap-1">● Active</span>
            ) : (
              <span className="text-yellow-500 font-bold flex items-center gap-1">● Fallback</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 italic text-center mt-2">
            Personal Use Only
          </div>
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="flex-grow bg-slate-950 p-6 md:p-10 overflow-y-auto">
        {/* Global Key Warning Alert Banner */}
        {!settings.hasGeminiKey && activeTab !== 'settings' && (
          <div className="max-w-4xl mx-auto mb-6 p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center justify-between text-red-400 text-xs">
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} />
              Setup is incomplete! Gemini API Key is missing.
            </span>
            <button 
              onClick={() => setActiveTab('settings')}
              className="px-2.5 py-1 bg-red-900/20 hover:bg-red-900/40 rounded-md border border-red-800 text-[10px] font-bold uppercase tracking-wider"
            >
              Configure Now
            </button>
          </div>
        )}

        {renderActiveView()}
      </main>

    </div>
  );
}
