'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Card, Button, ProgressBar, Chip } from '@heroui/react';
import { Video, Edit2, Play, Trash2, Calendar, Film, Layers, ArrowRight, RefreshCw, Sparkles, Clock } from 'lucide-react';

export default function Dashboard() {
  const { projects, isLoadingProjects, fetchProjects, setCurrentProject, setActiveTab, deleteProject } = useAppStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSelect = (project, tab = 'editor') => {
    setCurrentProject(project);
    setActiveTab(tab);
  };

  const getStatusChip = (status) => {
    const configs = {
      draft: { color: 'default', text: 'Draft / Script' },
      queued: { color: 'warning', text: 'Queued' },
      rendering: { color: 'primary', text: 'Rendering' },
      completed: { color: 'success', text: 'Ready' },
      failed: { color: 'danger', text: 'Failed' }
    };
    const cfg = configs[status] || configs.draft;
    return (
      <Chip 
        color={cfg.color} 
        size="sm" 
        variant="flat" 
        className="capitalize font-semibold border border-white/5"
      >
        {cfg.text}
      </Chip>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Premium Skeleton Loader Grid
  if (isLoadingProjects && projects.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-9 w-48 bg-slate-900 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-slate-900 rounded-lg animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-slate-900 rounded-lg animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} className="border border-slate-900 bg-slate-950/60 flex flex-col justify-between h-[280px] p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="h-6 w-32 bg-slate-900 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-slate-900 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-24 bg-slate-900 rounded animate-pulse" />
              </div>
              <div className="h-12 w-full bg-slate-900 rounded-lg animate-pulse" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-8 w-8 bg-slate-900 rounded-lg animate-pulse" />
                <div className="h-8 w-28 bg-slate-900 rounded-lg animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      {/* Header section with metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 p-6 rounded-2xl border border-slate-900/60 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-100 flex items-center gap-2">
            <Film className="text-violet-500" />
            My Dashboard
          </h1>
          <p className="text-slate-400 text-sm">
            Manage, edit, and export your viral short-form video projects.
          </p>
        </div>
        <Button 
          color="secondary"
          onClick={() => setActiveTab('generator')}
          className="shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 font-semibold flex items-center gap-1.5 px-6 py-5 rounded-xl transition-all duration-300 hover:scale-[1.02]"
        >
          <Sparkles size={16} /> Create New Short
        </Button>
      </div>

      {projects.length === 0 ? (
        /* Empty State */
        <Card className="glow-card border-none bg-slate-950/40 p-8 text-center max-w-xl mx-auto mt-12">
          <Card.Content className="flex flex-col items-center py-8">
            <div className="h-16 w-16 bg-slate-900/60 rounded-full flex items-center justify-center mb-4 text-violet-500 border border-violet-800/30">
              <Video size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">No Videos Generated Yet</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-6">
              Enter a topic and generate your first viral script, scene breakdown, and vertical video clip in just one click.
            </p>
            <Button 
              color="secondary"
              onClick={() => setActiveTab('generator')}
              className="bg-violet-600 hover:bg-violet-700 font-semibold"
              endContent={<ArrowRight size={16} />}
            >
              Start Generating
            </Button>
          </Card.Content>
        </Card>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="glow-card border-none bg-slate-950/60 flex flex-col justify-between h-[280px] p-5 transition-all duration-300 hover:scale-[1.01] hover:border-violet-500/20"
            >
              <Card.Header className="flex justify-between items-start gap-4 p-0 pb-2">
                <div className="flex flex-col overflow-hidden">
                  <h3 className="font-bold text-base text-slate-100 truncate w-full" title={project.topic}>
                    {project.topic}
                  </h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-semibold">
                    <Calendar size={12} className="text-violet-400" />
                    {formatDate(project.updatedAt || project.createdAt)}
                  </span>
                </div>
                {getStatusChip(project.status)}
              </Card.Header>
              
              <Card.Content className="p-0 py-2 flex flex-col justify-between flex-grow">
                <div className="flex items-center gap-3 text-slate-300 text-xs my-1">
                  <span className="flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800/40 font-mono">
                    <Layers size={12} className="text-violet-400" />
                    {project.scenes?.length || 0} Scenes
                  </span>
                  <span className="flex items-center gap-1 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800/40 font-mono capitalize">
                    <Video size={12} className="text-emerald-400" />
                    {project.voiceLanguage}
                  </span>
                </div>

                {/* Progress bar active rendering */}
                {(project.status === 'rendering' || project.status === 'queued') && (
                  <div className="space-y-2 mt-3 w-full bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
                    <ProgressBar 
                      aria-label="Rendering progress"
                      value={project.progress} 
                      className="w-full"
                    >
                      <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1 font-mono uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Clock size={10} className="text-violet-400" /> Progress</span>
                        <ProgressBar.Output className="font-bold text-violet-400" />
                      </div>
                      <ProgressBar.Track className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                        <ProgressBar.Fill className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300" />
                      </ProgressBar.Track>
                    </ProgressBar>
                    <p className="text-[10px] text-slate-400 truncate italic font-medium">
                      {project.stepStatus}
                    </p>
                  </div>
                )}
                
                {project.status === 'failed' && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-[10px] text-red-400 mt-2 line-clamp-2">
                    ⚠️ Error: {project.error || 'Failed during processing.'}
                  </div>
                )}

                {project.status === 'completed' && (
                  <p className="text-xs text-slate-300 line-clamp-2 mt-2 font-semibold bg-violet-950/10 p-3 rounded-xl border border-violet-900/20">
                    🏆 {project.metadata?.title}
                  </p>
                )}

                {project.status === 'draft' && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-2 italic bg-slate-900/20 p-3 rounded-xl border border-slate-850">
                    📝 Script generated. Ready to render.
                  </p>
                )}
              </Card.Content>

              <Card.Footer className="flex justify-between items-center gap-2 border-t border-slate-900/60 p-0 pt-3">
                <Button
                  isIconOnly
                  size="sm"
                  color="danger"
                  variant="light"
                  onClick={() => deleteProject(project.id)}
                  title="Delete project"
                  className="hover:bg-red-950/20 text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </Button>

                <div className="flex gap-2">
                  {project.status === 'completed' && (
                    <Button 
                      size="sm"
                      color="success"
                      variant="flat"
                      onClick={() => handleSelect(project)}
                      className="font-bold flex items-center gap-1 border border-emerald-800/40 text-emerald-400"
                    >
                      <Play size={12} /> Watch Preview
                    </Button>
                  )}
                  
                  {project.status === 'draft' && (
                    <Button 
                      size="sm"
                      color="secondary"
                      onClick={() => handleSelect(project)}
                      className="bg-violet-600 hover:bg-violet-700 font-bold flex items-center gap-1"
                    >
                      <Edit2 size={12} /> Review & Render
                    </Button>
                  )}

                  {project.status === 'failed' && (
                    <Button 
                      size="sm"
                      color="warning"
                      variant="flat"
                      onClick={() => handleSelect(project)}
                      className="font-bold flex items-center gap-1 border border-amber-800/40 text-amber-400"
                    >
                      <RefreshCw size={12} /> Retry Rendering
                    </Button>
                  )}

                  {(project.status === 'rendering' || project.status === 'queued') && (
                    <Button 
                      size="sm"
                      color="secondary"
                      variant="flat"
                      onClick={() => handleSelect(project)}
                      className="font-bold flex items-center gap-1"
                    >
                      View Live Progress
                    </Button>
                  )}
                </div>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
