'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Card, Button, ProgressBar, Chip } from '@heroui/react';
import { Video, Edit2, Play, Trash2, Calendar, Film, Layers, ArrowRight, RefreshCw, Sparkles, Clock, Coins } from 'lucide-react';

export default function Dashboard() {
  const { projects, isLoadingProjects, fetchProjects, setCurrentProject, setActiveTab, deleteProject, user } = useAppStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSelect = (project, tab = 'editor') => {
    setCurrentProject(project);
    setActiveTab(tab);
  };

  const getStatusChip = (status) => {
    const configs = {
      draft: { bg: 'bg-slate-100 text-slate-700 border-slate-200/50', text: 'Script Draft' },
      queued: { bg: 'bg-amber-50 text-amber-700 border-amber-200/60', text: 'Queued' },
      rendering: { bg: 'bg-violet-50 text-violet-700 border-violet-200/60', text: 'Rendering' },
      completed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', text: 'Ready' },
      failed: { bg: 'bg-red-50 text-red-700 border-red-200/60', text: 'Failed' }
    };
    const cfg = configs[status] || configs.draft;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${cfg.bg}`}>
        {cfg.text}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Premium Light Skeleton Loader Grid
  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto py-4 px-2 space-y-8 animate-pulse">
        <div className="h-44 w-full bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="h-20 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((idx) => (
            <Card key={idx} className="border border-slate-200 bg-white h-[280px] p-5 space-y-6 rounded-3xl">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-6 w-36 bg-slate-200 rounded-lg" />
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="h-4 w-24 bg-slate-200 rounded-lg" />
              </div>
              <div className="h-12 w-full bg-slate-200 rounded-xl" />
              <div className="flex justify-between items-center pt-4">
                <div className="h-8 w-8 bg-slate-200 rounded-lg" />
                <div className="h-8 w-28 bg-slate-200 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4 space-y-6 sm:space-y-8">
      
      {/* PREMIUM LANDING-STYLE HERO AREA */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-violet-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-500/10 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="space-y-3 z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none">
            Create Viral AI Shorts
          </h1>
          <p className="text-violet-100/90 text-sm md:text-base max-w-md font-medium leading-relaxed">
            Generate cinematic videos, thumbnails, captions and edits in seconds.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 z-10 shrink-0 w-full sm:w-auto">
          <Button 
            onClick={() => setActiveTab('generator')}
            className="shadow-lg shadow-black/10 bg-white hover:bg-slate-50 font-bold text-violet-700 flex items-center justify-center gap-1.5 px-6 py-5 rounded-xl text-xs transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <Sparkles size={14} /> Create New Short
          </Button>
        </div>
      </div>

      {/* METRIC OVERVIEW WIDGETS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="border border-slate-200/80 bg-white shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shrink-0">
            <Film size={18} />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Shorts</h4>
            <p className="text-xl font-black text-slate-800 mt-0.5">{projects.length}</p>
          </div>
        </div>

        <div className="border border-slate-200/80 bg-white shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <Play size={18} />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Completed Ready</h4>
            <p className="text-xl font-black text-slate-800 mt-0.5">{projects.filter(p => p.status === 'completed').length}</p>
          </div>
        </div>

        <div className="border border-slate-200/80 bg-white shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Rendering Active</h4>
            <p className="text-xl font-black text-slate-800 mt-0.5">{projects.filter(p => p.status === 'rendering' || p.status === 'queued').length}</p>
          </div>
        </div>

        <div className="border border-slate-200/80 bg-white shadow-sm p-4 flex items-center gap-4 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
            <Edit2 size={18} />
          </div>
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Draft Scripts</h4>
            <p className="text-xl font-black text-slate-800 mt-0.5">{projects.filter(p => p.status === 'draft').length}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER CONTENT */}
      <div>
        <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-1.5 px-1">
          📁 Recent Projects
        </h2>

        {projects.length === 0 ? (
          /* Empty State */
          <Card className="glow-card border-none bg-white p-8 text-center max-w-xl mx-auto mt-6">
            <div className="flex flex-col items-center py-8">
              <div className="h-16 w-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4 text-violet-500 border border-violet-100">
                <Video size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No videos generated yet</h3>
              <p className="text-slate-500 text-xs max-w-xs mb-6">
                Type in your video prompt, select a voice overlay, and witness script-to-video magic in seconds.
              </p>
              <Button 
                onClick={() => setActiveTab('generator')}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-lg shadow-violet-500/10 cursor-pointer flex items-center gap-2"
              >
                Start Generating <ArrowRight size={14} />
              </Button>
            </div>
          </Card>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="glow-card border-none bg-white flex flex-col justify-between h-[280px] p-5"
              >
                <div className="flex flex-col justify-between flex-grow space-y-4">
                  {/* Card Title & Date */}
                  <div className="flex justify-between items-start gap-4 p-0">
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="font-bold text-base text-slate-800 truncate w-full" title={project.topic}>
                        {project.topic}
                      </h3>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-semibold">
                        <Calendar size={12} className="text-violet-500" />
                        {formatDate(project.updatedAt || project.createdAt)}
                      </span>
                    </div>
                    {getStatusChip(project.status)}
                  </div>

                  {/* Attributes & Progress */}
                  <div className="flex-grow flex flex-col justify-start space-y-3">
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                      <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold text-[10px]">
                        <Layers size={10} className="text-violet-500" />
                        {project.scenes?.length || 0} Scenes
                      </span>
                      <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 font-semibold text-[10px] capitalize">
                        <Video size={10} className="text-emerald-500" />
                        {project.voiceLanguage}
                      </span>
                    </div>

                    {/* Progress Bar (Rendering & Queued states) */}
                    {(project.status === 'rendering' || project.status === 'queued') && (
                      <div className="space-y-2 mt-1 w-full bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                        <ProgressBar 
                          aria-label="Rendering progress"
                          value={project.progress} 
                          className="w-full"
                        >
                          <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1 font-mono uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Clock size={10} className="text-violet-500" /> Progress</span>
                            <span className="font-bold text-violet-600">{project.progress}%</span>
                          </div>
                          <ProgressBar.Track className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden border-none">
                            <ProgressBar.Fill className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300" />
                          </ProgressBar.Track>
                        </ProgressBar>
                        <p className="text-[9px] text-slate-500 truncate italic font-medium">
                          {project.stepStatus}
                        </p>
                      </div>
                    )}
                    
                    {project.status === 'failed' && (
                      <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-[10px] text-red-600 mt-2 line-clamp-2">
                        ⚠️ Error: {project.error || 'Failed during processing.'}
                      </div>
                    )}

                    {project.status === 'completed' && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-2 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                        🏆 {project.metadata?.title}
                      </p>
                    )}

                    {project.status === 'draft' && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 font-semibold">
                        📝 Script is generated. Ready to render.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex justify-between items-center gap-2 border-t border-slate-100 p-0 pt-3 mt-3 shrink-0 flex-wrap">
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="light"
                    onClick={() => deleteProject(project.id)}
                    title="Delete project"
                    className="hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </Button>

                  <div className="flex gap-2">
                    {project.status === 'completed' && (
                      <Button 
                        size="sm"
                        onClick={() => handleSelect(project)}
                        className="font-bold flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100/60 rounded-xl text-[10px] cursor-pointer"
                      >
                        <Play size={12} /> Watch Preview
                      </Button>
                    )}
                    
                    {project.status === 'draft' && (
                      <Button 
                        size="sm"
                        onClick={() => handleSelect(project)}
                        className="bg-violet-600 hover:bg-violet-700 text-white font-bold flex items-center gap-1 rounded-xl text-[10px] shadow-sm shadow-violet-500/10 cursor-pointer"
                      >
                        <Edit2 size={12} /> Review & Render
                      </Button>
                    )}

                    {project.status === 'failed' && (
                      <Button 
                        size="sm"
                        onClick={() => handleSelect(project)}
                        className="font-bold flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100/60 rounded-xl text-[10px] cursor-pointer"
                      >
                        <RefreshCw size={12} /> Retry Rendering
                      </Button>
                    )}

                    {(project.status === 'rendering' || project.status === 'queued') && (
                      <Button 
                        size="sm"
                        onClick={() => handleSelect(project)}
                        className="bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-100/70 font-bold flex items-center gap-1 rounded-xl text-[10px] cursor-pointer"
                      >
                        View Live Progress
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
