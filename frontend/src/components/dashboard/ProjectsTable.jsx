'use client';

import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Dropdown, Button } from '@heroui/react';
import { MoreVertical, Play, Edit, Trash2, RefreshCw, AlertTriangle, Film, Calendar } from 'lucide-react';

export default function ProjectsTable() {
  const { projects, deleteProject, setCurrentProject, setActiveTab } = useAppStore();

  const handleSelect = (project, tab = 'editor') => {
    setCurrentProject(project);
    setActiveTab(tab);
  };

  const getStatusBadge = (status) => {
    const configs = {
      draft: { bg: 'bg-surface-container text-on-surface-variant border-outline-variant', text: 'Draft' },
      queued: { bg: 'bg-amber-950/20 text-amber-400 border-amber-500/20', text: 'Queued' },
      rendering: { bg: 'bg-violet-950/20 text-violet-400 border-violet-500/20', text: 'Rendering' },
      completed: { bg: 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20', text: 'Ready' },
      failed: { bg: 'bg-red-950/20 text-red-400 border-red-500/20', text: 'Failed' }
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

  if (projects.length === 0) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-2xl p-8 text-center max-w-xl mx-auto my-6">
        <div className="flex flex-col items-center py-8">
          <div className="h-16 w-16 bg-surface-low rounded-2xl flex items-center justify-center mb-4 text-on-surface-variant border border-outline-variant">
            <Film size={32} />
          </div>
          <h3 className="text-white text-lg font-bold mb-1">No videos generated yet</h3>
          <p className="text-on-surface-variant text-xs max-w-xs mb-6">
            Type in your video prompt, select a voice overlay, and witness script-to-video magic in seconds.
          </p>
          <Button
            onClick={() => setActiveTab('generator')}
            className="bg-white hover:bg-zinc-100 text-black font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg cursor-pointer"
          >
            Start Generating
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-low border border-outline-variant rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Recent Projects</h2>
        <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
          {projects.length} Total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-lowest">
              <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Thumbnail</th>
              <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {projects.map((project) => {
              const isProcessing = project.status === 'rendering' || project.status === 'queued';
              const progress = project.progress ?? 0;

              return (
                <tr key={project.id} className="hover:bg-surface-container transition-colors group">
                  {/* Thumbnail Column */}
                  <td className="px-6 py-4">
                    <div className="w-12 h-20 bg-surface-lowest rounded border border-outline-variant overflow-hidden relative group-hover:border-zinc-500 transition-colors">
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-1 z-10">
                          <span className="text-[10px] font-bold text-white font-mono">{progress}%</span>
                          <div className="w-8 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                            <div className="bg-white h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      )}
                      {project.status === 'failed' && (
                        <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center z-10">
                          <AlertTriangle size={14} className="text-red-400" />
                        </div>
                      )}
                      {project.status === 'completed' && (
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          <Play size={16} className="text-white" />
                        </div>
                      )}
                      
                      {/* Placeholder thumbnail content */}
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-650">
                        <Film size={20} />
                      </div>
                    </div>
                  </td>

                  {/* Title & Metadata Column */}
                  <td className="px-6 py-4">
                    <div className="max-w-[280px] sm:max-w-[400px]">
                      <p className="text-white font-medium text-sm truncate" title={project.topic}>
                        {project.topic}
                      </p>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-on-surface-variant text-[10px] flex items-center gap-1 font-semibold">
                          <Calendar size={10} className="text-on-surface-variant" />
                          {formatDate(project.updatedAt || project.createdAt)}
                        </span>
                        {project.status === 'rendering' && (
                          <span className="text-violet-400 text-[10px] italic truncate">
                            {project.stepStatus || 'Rendering video scenes...'}
                          </span>
                        )}
                        {project.status === 'failed' && (
                          <span className="text-red-400 text-[10px] truncate max-w-[240px]" title={project.error}>
                            Error: {project.error || 'Failed to compile assets'}
                          </span>
                        )}
                        {project.status === 'completed' && (
                          <span className="text-emerald-400 text-[10px] truncate">
                            🏆 {project.metadata?.title || 'Render Complete'}
                          </span>
                        )}
                        {project.status === 'draft' && (
                          <span className="text-on-surface-variant text-[10px] italic">
                            Script generated. Ready to render.
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status badge Column */}
                  <td className="px-6 py-4">
                    {getStatusBadge(project.status)}
                  </td>

                  {/* Actions Dropdown Column */}
                  <td className="px-6 py-4 text-right">
                    <Dropdown>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="text-on-surface-variant hover:text-white hover:bg-surface-container rounded-lg cursor-pointer"
                        title="Actions"
                      >
                        <MoreVertical size={16} />
                      </Button>
                      <Dropdown.Popover className="bg-surface-highest border border-outline-variant text-[#e5e2e1] rounded-xl shadow-2xl p-1 z-50">
                        <Dropdown.Menu
                          aria-label="Project actions"
                          className="focus:outline-none"
                          onAction={(key) => {
                            if (key === 'delete') {
                              deleteProject(project.id);
                            } else if (key === 'watch' || key === 'edit' || key === 'retry' || key === 'progress') {
                              handleSelect(project);
                            }
                          }}
                        >
                          {project.status === 'completed' && (
                            <Dropdown.Item id="watch" textValue="Watch Preview" className="hover:bg-surface-container p-2 rounded-lg cursor-pointer text-xs font-semibold text-emerald-400 flex items-center gap-2">
                              <span className="flex items-center gap-1.5"><Play size={12} /> Watch Preview</span>
                            </Dropdown.Item>
                          )}
                          {project.status === 'draft' && (
                            <Dropdown.Item id="edit" textValue="Review & Render" className="hover:bg-surface-container p-2 rounded-lg cursor-pointer text-xs font-semibold text-violet-400 flex items-center gap-2">
                              <span className="flex items-center gap-1.5"><Edit size={12} /> Review & Render</span>
                            </Dropdown.Item>
                          )}
                          {project.status === 'failed' && (
                            <Dropdown.Item id="retry" textValue="Retry Rendering" className="hover:bg-surface-container p-2 rounded-lg cursor-pointer text-xs font-semibold text-amber-400 flex items-center gap-2">
                              <span className="flex items-center gap-1.5"><RefreshCw size={12} /> Retry Rendering</span>
                            </Dropdown.Item>
                          )}
                          {(project.status === 'rendering' || project.status === 'queued') && (
                            <Dropdown.Item id="progress" textValue="View Live Progress" className="hover:bg-surface-container p-2 rounded-lg cursor-pointer text-xs font-semibold text-violet-400 flex items-center gap-2">
                              <span className="flex items-center gap-1.5"><Edit size={12} /> View Live Progress</span>
                            </Dropdown.Item>
                          )}
                          <Dropdown.Item id="delete" textValue="Delete Project" className="hover:bg-red-950/20 p-2 rounded-lg cursor-pointer text-xs font-semibold text-red-400 flex items-center gap-2 border-t border-outline-variant mt-1">
                            <span className="flex items-center gap-1.5"><Trash2 size={12} /> Delete Project</span>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
