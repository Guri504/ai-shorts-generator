'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, BACKEND_URL } from '../store/appStore';
import { Button } from '@heroui/react';
import {
  Play, Copy, Download, Save, Film, HelpCircle, Check,
  AlertCircle, RefreshCw, GripHorizontal, Sparkles, Image, Video, Wand2, Layers, Trash2, XCircle
} from 'lucide-react';

export default function Editor() {
  const {
    currentProject,
    saveProjectEdits,
    reorderScenes,
    renderProject,
    regenerateScene,
    setActiveTab,
    renderLogs,
    renderEta,
    renderSpeed,
    currentStage,
    currentScene,
    cancelRender,
    deleteScene,
    voices = [],
    fetchVoices,
    previewVoice,
    token,
    youtubeAccounts = [],
    fetchYouTubeAccounts,
    uploadToYouTube,
    isUploadingYouTube
  } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scenes, setScenes] = useState([]);
  
  // Inspector right tab state
  const [rightTab, setRightTab] = useState('render'); // 'render' | 'voice' | 'outro'

  // Voice & Audio locally edited states
  const [voiceName, setVoiceName] = useState('');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState('+0Hz');
  const [voiceVolume, setVoiceVolume] = useState('+0%');

  // Auto-switch inspector tab when build starts
  useEffect(() => {
    if (currentProject) {
      if (currentProject.status === 'rendering' || currentProject.status === 'queued') {
        setRightTab('render');
      }
    }
  }, [currentProject?.status]);

  // CTA Outro settings states
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaStyle, setCtaStyle] = useState('auto');
  const [ctaLanguage, setCtaLanguage] = useState('auto');
  const [ctaDuration, setCtaDuration] = useState('5');

  const [previewText, setPreviewText] = useState('Hello, this is a preview of the selected voice.');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [audioObj, setAudioObj] = useState(null);
  const [playingPreviewName, setPlayingPreviewName] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [copiedField, setCopiedField] = useState(''); // '', 'title', 'desc', 'tags'
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // YouTube publishing states
  const [selectedYoutubeId, setSelectedYoutubeId] = useState('');
  const [ytUploadSuccess, setYtUploadSuccess] = useState('');
  const [ytUploadError, setYtUploadError] = useState('');
  const [showYtModal, setShowYtModal] = useState(false);
  const [modalUploadType, setModalUploadType] = useState('short'); // 'short' | 'video'
  const [modalPrivacyStatus, setModalPrivacyStatus] = useState('public'); // 'public' | 'private'

  // Fetch voice list and youtube integrations on editor mount
  useEffect(() => {
    if (voices && voices.length === 0) {
      fetchVoices();
    }
    fetchYouTubeAccounts();
  }, [voices, fetchVoices, fetchYouTubeAccounts]);

  // Set default YouTube channel selection when list loads
  useEffect(() => {
    if (youtubeAccounts.length > 0 && !selectedYoutubeId) {
      setSelectedYoutubeId(youtubeAccounts[0]._id || youtubeAccounts[0].channelId);
    }
  }, [youtubeAccounts, selectedYoutubeId]);

  // Load project details into form states
  useEffect(() => {
    if (currentProject) {
      setTitle(currentProject.metadata?.title || '');
      setDescription(currentProject.metadata?.description || '');
      setHashtags(currentProject.metadata?.hashtags?.join(' ') || '');
      setScenes(currentProject.scenes || []);
      setVoiceName(currentProject.voiceName || (
        currentProject.voiceLanguage === 'english'
          ? (currentProject.voiceGender === 'male' ? 'en-US-GuyNeural' : 'en-US-AriaNeural')
          : (currentProject.voiceGender === 'male' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural')
      ));
      setVoiceSpeed(currentProject.voiceSpeed || 1.0);
      setVoicePitch(currentProject.voicePitch || '+0Hz');
      setVoiceVolume(currentProject.voiceVolume || '+0%');

      // Load CTA Ending Outro settings
      setCtaEnabled(currentProject.ctaSettings?.enabled ?? true);
      setCtaStyle(currentProject.ctaSettings?.style || 'auto');
      setCtaLanguage(currentProject.ctaSettings?.language || 'auto');
      setCtaDuration(String(currentProject.ctaSettings?.duration || 5));
    }
  }, [currentProject]);

  // Cleanup active audio preview on unmount
  useEffect(() => {
    return () => {
      if (audioObj) {
        audioObj.pause();
      }
    };
  }, [audioObj]);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-slate-400">Select a project from the dashboard or create a new one.</p>
        <Button onClick={() => setActiveTab('dashboard')} className="mt-4 bg-violet-600">Back to Dashboard</Button>
      </div>
    );
  }

  // Handle playing and toggling voice preview
  const handlePreviewVoice = async (vName) => {
    if (playingPreviewName === vName) {
      if (audioObj) {
        audioObj.pause();
      }
      setPlayingPreviewName(null);
      return;
    }

    setIsPreviewLoading(true);
    const res = await previewVoice(vName, previewText, voiceSpeed);
    setIsPreviewLoading(false);

    if (res.success) {
      if (audioObj) {
        audioObj.pause();
      }
      const audio = new Audio(res.previewUrl);
      setAudioObj(audio);
      setPlayingPreviewName(vName);
      audio.play();
      audio.onended = () => {
        setPlayingPreviewName(null);
      };
    } else {
      alert(res.error || 'Failed to play voice preview');
    }
  };

  // Handle saving edits
  const handleSaveEdits = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    // Parse hashtags
    const parsedHashtags = hashtags
      .split(/\s+/)
      .map(tag => tag.replace(/#/g, '').trim())
      .filter(tag => tag.length > 0);

    const res = await saveProjectEdits(currentProject.id, {
      metadata: {
        title,
        description,
        hashtags: parsedHashtags
      },
      scenes,
      voiceName,
      voiceSpeed: parseFloat(voiceSpeed),
      voicePitch,
      voiceVolume,
      ctaSettings: {
        enabled: ctaEnabled,
        style: ctaStyle,
        language: ctaLanguage,
        duration: parseInt(ctaDuration, 10),
        intensity: 'energetic'
      }
    });

    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Specific handler to save CTA outro configurations
  const handleSaveCtaSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const parsedHashtags = hashtags
      .split(/\s+/)
      .map(tag => tag.replace(/#/g, '').trim())
      .filter(tag => tag.length > 0);

    const res = await saveProjectEdits(currentProject.id, {
      metadata: {
        title,
        description,
        hashtags: parsedHashtags
      },
      scenes,
      voiceName,
      voiceSpeed: parseFloat(voiceSpeed),
      voicePitch,
      voiceVolume,
      ctaSettings: {
        enabled: ctaEnabled,
        style: ctaStyle,
        language: ctaLanguage,
        duration: parseInt(ctaDuration, 10),
        intensity: 'energetic'
      }
    });

    setIsSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      alert(res.error || 'Failed to save outro settings');
    }
  };

  const handleSceneChange = (index, field, value) => {
    const updated = [...scenes];
    updated[index] = { ...updated[index], [field]: value };
    setScenes(updated);
  };

  // Trigger Video Rendering
  const handleStartRender = async () => {
    setRenderError('');
    await handleSaveEdits();

    const res = await renderProject(currentProject.id);
    if (!res.success) {
      setRenderError(res.error || 'Failed to start rendering.');
    }
  };

  // Trigger targeted Voice-Only Partial Video Rendering
  const handleVoiceOnlyRender = async () => {
    setRenderError('');
    await handleSaveEdits();

    const res = await renderProject(currentProject.id, { renderType: 'voice_only' });
    if (!res.success) {
      setRenderError(res.error || 'Failed to start quick update.');
    }
  };

  // Trigger targeted single-scene asset regeneration
  const handleRegenScene = async (sceneNumber, type) => {
    setRenderError('');
    await handleSaveEdits();

    const res = await regenerateScene(currentProject.id, sceneNumber, type);
    if (!res.success) {
      setRenderError(res.error || `Failed to regenerate Scene ${sceneNumber}.`);
    }
  };

  // Trigger YouTube video publishing
  const handleYoutubePublish = async (privacyStatus = 'public', uploadType = 'short') => {
    setYtUploadError('');
    setYtUploadSuccess('');

    if (!selectedYoutubeId) {
      setYtUploadError('Please select a YouTube channel to upload to.');
      return;
    }

    const res = await uploadToYouTube(currentProject.id, selectedYoutubeId, privacyStatus, uploadType);
    if (res.success) {
      setYtUploadSuccess(res.message || 'Video uploaded to YouTube successfully!');
    } else {
      setYtUploadError(res.error || 'Failed to upload video to YouTube.');
    }
  };

  // Drag and Drop handlers for timeline
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('dragIndex', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    if (isNaN(dragIndex) || dragIndex === targetIndex) return;

    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(dragIndex, 1);
    newScenes.splice(targetIndex, 0, draggedScene);

    // Save state locally and call backend update
    setScenes(newScenes);
    await reorderScenes(currentProject.id, newScenes);
  };

  // Copy helper
  const handleCopyText = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const countClips = (type) => {
    return scenes.filter(s => s.clipType === type).length;
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 sm:py-6 sm:px-4 space-y-6 sm:space-y-8 text-slate-200">
      {/* Back navigation & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#1c1b1b] border border-[#444748] p-4 rounded-3xl shadow-md">
        <Button
          variant="bordered"
          onClick={() => setActiveTab('dashboard')}
          className="text-slate-300 border-[#444748] hover:border-violet-500 hover:text-violet-400 transition-colors rounded-xl text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer"
        >
          ← Back to Dashboard
        </Button>
        <div className="text-right">
          <span className="text-[10px] sm:text-xs bg-[#131313] border border-[#444748] text-slate-400 px-3 py-1 rounded-full font-mono uppercase truncate max-w-[200px] sm:max-w-none inline-block">
            Project ID: {currentProject.id}
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">

        {/* LEFT COLUMN: EDIT METADATA & SCENES */}
        <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
          <div className="bg-[#1c1b1b] border border-[#444748] p-5 shadow-md rounded-3xl space-y-4">
            <div className="pb-2 px-0 pt-0 border-b border-[#444748]/60">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                YouTube SEO Metadata
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">YouTube Shorts Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                  className="border border-[#444748] rounded-xl bg-[#131313] px-4 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:border-white focus:outline-none transition-all w-full disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">SEO Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                  className="border border-[#444748] rounded-xl bg-[#131313] px-4 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:border-white focus:outline-none transition-all w-full disabled:opacity-50 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Hashtags (separated by space)</label>
                <input
                  type="text"
                  placeholder="Space secrets fact viral"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                  className="border border-[#444748] rounded-xl bg-[#131313] px-4 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:border-white focus:outline-none transition-all w-full disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Scenes Editors */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-violet-500" />
                Script & Scene Breakdown
              </h2>
              {(currentProject.status === 'draft' || currentProject.status === 'failed' || currentProject.status === 'completed') && (
                <Button
                  size="sm"
                  color="secondary"
                  onClick={handleSaveEdits}
                  isLoading={isSaving}
                  className="bg-[#c8a2c8] text-black font-extrabold hover:bg-violet-400 flex items-center gap-1.5 shadow-lg shadow-violet-500/10 rounded-xl px-4"
                >
                  {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                  {saveSuccess ? 'Saved!' : 'Save Script Edits'}
                </Button>
              )}
            </div>

            {scenes.map((scene, idx) => (
              <div key={idx} className="border border-[#444748] bg-[#1c1b1b] p-5 shadow-md rounded-3xl transition-all duration-200 hover:border-[#8e9192]">
                <div className="flex justify-between items-center pb-3 border-b border-[#444748]/60 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-violet-400 bg-violet-500/10 border border-violet-500/20 h-7 w-7 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-slate-400 capitalize">
                      Duration: {scene.duration ? `${parseFloat(scene.duration).toFixed(1)}s` : 'Pending'}
                    </span>
                    {currentProject.status === 'draft' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete Scene ${idx + 1}?`)) {
                            await deleteScene(currentProject.id, scene.sceneNumber);
                          }
                        }}
                        title="Delete Scene"
                        className="hover:bg-red-500/10 text-red-500 h-7 w-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Select Clip Type & Regenerate Actions */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col min-w-[100px]">
                      <span className="text-[8px] text-slate-500 font-bold uppercase mb-0.5">Source</span>
                      <select
                        value={scene.clipType}
                        onChange={(e) => handleSceneChange(idx, 'clipType', e.target.value)}
                        disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                        className="premium-select w-full text-[11px] py-1 border border-[#444748] rounded-xl px-2.5 bg-[#131313] text-slate-200 font-semibold cursor-pointer focus:outline-none focus:border-white"
                      >
                        <option value="Stock" className="bg-[#1c1b1b] text-slate-200">Pexels Stock</option>
                        <option value="AI" className="bg-[#1c1b1b] text-slate-200">AI generated</option>
                      </select>
                    </div>

                    {/* Single Scene Regeneration Menu */}
                    {(currentProject.status === 'completed' || currentProject.status === 'draft' || currentProject.status === 'failed') && (
                      <div className="flex flex-col min-w-[120px]">
                        <span className="text-[8px] text-slate-550 font-bold uppercase mb-0.5">Regenerate</span>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleRegenScene(scene.sceneNumber, e.target.value);
                            }
                          }}
                          className="premium-select w-full text-[11px] py-1 border border-amber-500/30 rounded-xl px-2.5 bg-amber-500/10 text-amber-400 font-semibold cursor-pointer focus:outline-none focus:border-amber-500"
                        >
                          <option value="" disabled className="bg-[#1c1b1b] text-slate-400">Select...</option>
                          <option value="all" className="bg-[#1c1b1b] text-amber-400 font-bold">🔄 Whole Scene</option>
                          <option value="clip" className="bg-[#1c1b1b] text-slate-200">🎬 Visual Clip</option>
                          <option value="voice" className="bg-[#1c1b1b] text-slate-200">🎙️ Voiceover</option>
                          <option value="subtitles" className="bg-[#1c1b1b] text-slate-200">📝 Subtitles</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Voice Narration (Hindi / Hinglish / English)</label>
                    <textarea
                      rows={2}
                      value={scene.narration}
                      onChange={(e) => handleSceneChange(idx, 'narration', e.target.value)}
                      disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                      className="border border-[#444748] rounded-xl bg-[#131313] px-4 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:border-white focus:outline-none transition-all w-full disabled:opacity-50 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Visual Prompt (For AI clip generation)</label>
                    <textarea
                      rows={2}
                      value={scene.visualPrompt}
                      onChange={(e) => handleSceneChange(idx, 'visualPrompt', e.target.value)}
                      disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                      className="border border-[#444748] rounded-xl bg-[#131313] px-4 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:border-white focus:outline-none transition-all w-full disabled:opacity-50 resize-none"
                    />
                  </div>

                  {scene.clipType === 'Stock' && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Stock Search Keyword</label>
                      <input
                        type="text"
                        value={scene.stockSearchKeyword || ''}
                        onChange={(e) => handleSceneChange(idx, 'stockSearchKeyword', e.target.value)}
                        disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                        className="border border-[#444748] rounded-xl bg-[#131313] px-4 py-2.5 text-slate-200 placeholder-slate-500 text-xs focus:border-white focus:outline-none transition-all w-full disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* RIGHT COLUMN: UNIFIED INSPECTOR PANEL WITH TABS */}
        <div className="lg:col-span-5 flex flex-col justify-start order-1 lg:order-2">
          
          <div className="bg-[#1c1b1b] border border-[#444748] rounded-3xl p-6 shadow-xl sticky top-6 flex flex-col gap-5">
            {/* Inspector Tab Switcher */}
            <div className="flex bg-[#131313] p-1 rounded-xl border border-[#444748]">
              <button
                type="button"
                onClick={() => setRightTab('render')}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wide py-2 rounded-lg transition-all cursor-pointer text-center ${
                  rightTab === 'render'
                    ? 'bg-[#1c1b1b] text-white border border-[#444748] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎥 Compile
              </button>
              <button
                type="button"
                onClick={() => setRightTab('voice')}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wide py-2 rounded-lg transition-all cursor-pointer text-center ${
                  rightTab === 'voice'
                    ? 'bg-[#1c1b1b] text-white border border-[#444748] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🎙️ Audio
              </button>
              <button
                type="button"
                onClick={() => setRightTab('outro')}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wide py-2 rounded-lg transition-all cursor-pointer text-center ${
                  rightTab === 'outro'
                    ? 'bg-[#1c1b1b] text-white border border-[#444748] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✨ Outro
              </button>
            </div>

            {/* TAB CONTENT 1: COMPILE & PUBLISH */}
            {rightTab === 'render' && (
              <div className="space-y-5">
                {/* 1.1 DRAFT STATE */}
                {currentProject.status === 'draft' && (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mb-3 border border-amber-500/20">
                        <Film size={24} />
                      </div>
                      <h3 className="text-base font-bold text-white">Approve & Compile Short</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Decide scene details, customize scripts, and queue the project for compilation.
                      </p>
                    </div>

                    <div className="p-4 bg-[#131313] border border-[#444748]/60 rounded-xl space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Scene Cost breakdown</h4>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-350 font-medium">Cinematic AI Clips (Gemini Flow):</span>
                        <span className="font-bold text-violet-400">{countClips('AI')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-350 font-medium">Stock Footage (Pexels / Free):</span>
                        <span className="font-bold text-emerald-400">{countClips('Stock')}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-xs text-violet-300 flex gap-2 font-medium">
                      <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-violet-400" />
                      <p className="leading-normal">
                        <strong>Intelligent Credit Optimization</strong> uses stock clips for normal visuals, reserving Gemini Flow credits strictly for impossible or highly expressive prompts.
                      </p>
                    </div>

                    {renderError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold">
                        {renderError}
                      </div>
                    )}

                    <Button
                      color="secondary"
                      size="lg"
                      onClick={handleStartRender}
                      className="w-full font-bold shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 py-6 text-white cursor-pointer rounded-xl text-xs uppercase tracking-wider"
                      endContent={<Play size={16} />}
                    >
                      Approve & Render Video
                    </Button>
                  </div>
                )}

                {/* 1.2 RENDERING / QUEUED STATE */}
                {(currentProject.status === 'rendering' || currentProject.status === 'queued') && (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 bg-violet-500/10 text-violet-400 rounded-full flex items-center justify-center mb-4 border border-violet-500/20 relative">
                        <div className="absolute inset-0 rounded-full border-t-2 border-violet-400 animate-spin" />
                        <Film size={26} />
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {currentProject.status === 'queued' ? 'Queued for Rendering' : 'Compiling Your Short'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Track dynamic synthesis progress, Edge TTS alignments, and FFmpeg concatenations in real-time.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-450">
                          <span>Compilation Progress</span>
                          <span className="font-bold text-violet-400">{currentProject.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-[#131313] border border-[#444748] h-3.5 rounded-full overflow-hidden p-[2px]">
                          <div 
                            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
                            style={{ width: `${currentProject.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Dynamic Render Stats */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-[#131313] p-2.5 rounded-lg border border-[#444748]">
                        <div className="text-left font-semibold">
                          ⏳ Est. Remaining: <span className="text-amber-400 font-bold">{renderEta ? `${renderEta}s` : 'Calculating...'}</span>
                        </div>
                        <div className="text-right font-semibold">
                          ⚡ Render Speed: <span className="text-violet-400 font-bold">{renderSpeed ? `${renderSpeed}s/sc` : 'Estimating...'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Real-time Logs Terminal */}
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide">Live Compilation Terminal Logs</span>
                      <div className="bg-[#0e0e0e] border border-[#444748] rounded-xl p-4 font-mono text-[11px] text-slate-350 space-y-1.5 h-[160px] overflow-y-auto shadow-inner">
                        <p className="text-slate-550">&gt; Starting render connection...</p>
                        <p className="text-slate-550">&gt; Status: {currentProject.stepStatus}</p>
                        {renderLogs.map((log, lIdx) => (
                          <p key={lIdx} className={
                            log.stage === 'complete' ? 'text-emerald-400 font-bold' :
                              (log.stage === 'failed' ? 'text-rose-400' : 'text-slate-300')
                          }>
                            ✓ {log.text}
                          </p>
                        ))}
                        {renderLogs.length === 0 && (
                          <p className="text-slate-600 italic">&gt; Awaiting render process logs stream...</p>
                        )}
                      </div>
                    </div>

                    {/* Cancel Process Option */}
                    <Button
                      color="danger"
                      variant="flat"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Are you sure you want to cancel the generation process? This will stop compiling immediately.")) {
                          await cancelRender(currentProject.id);
                        }
                      }}
                      className="w-full font-bold flex items-center justify-center gap-2 border border-red-950 text-red-400 hover:bg-red-950/20 transition-colors rounded-xl cursor-pointer"
                      endContent={<XCircle size={16} />}
                    >
                      Cancel Rendering / Stop Process
                    </Button>
                  </div>
                )}

                {/* 1.3 RENDER FAILED STATE */}
                {currentProject.status === 'failed' && (
                  <div className="space-y-5">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle size={24} />
                      </div>
                      <h3 className="text-base font-bold text-red-400">Rendering Failed</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        An error occurred during video creation. Check key configs or visuals.
                      </p>
                    </div>

                    <div className="py-2 text-left bg-red-950/20 border border-red-900/30 rounded-xl p-4 font-mono text-xs text-red-400">
                      <p className="font-bold">Error Log:</p>
                      <p className="mt-1 leading-relaxed">{currentProject.error}</p>
                    </div>

                    <Button
                      color="warning"
                      onClick={handleStartRender}
                      className="w-full font-bold flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl cursor-pointer"
                      endContent={<RefreshCw size={16} />}
                    >
                      Retry Render
                    </Button>
                  </div>
                )}

                {/* 1.4 COMPLETED PREVIEW PLAYER PANEL */}
                {currentProject.status === 'completed' && (
                  <div className="space-y-5">
                    {/* Vertical Simulator Video Container */}
                    <div className="shorts-container relative shadow-2xl">
                      <video
                        src={`${BACKEND_URL}/api/assets/outputs/${currentProject.id}?token=${token}`}
                        className="w-full h-full object-cover"
                        controls
                        loop
                        autoPlay
                      />

                      {/* YouTube overlay mocks */}
                      <div className="absolute bottom-12 left-4 right-14 pointer-events-none z-10 space-y-1.5">
                        <span className="text-[9px] bg-violet-600/90 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                          @{currentProject.voiceLanguage}
                        </span>
                        <p className="text-xs font-bold text-white line-clamp-2" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
                          {title}
                        </p>
                        <p className="text-[10px] text-slate-300 font-medium truncate" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
                          {currentProject.metadata?.hashtags?.map(h => `#${h}`).join(' ')}
                        </p>
                      </div>

                      {/* Floating Mock Actions */}
                      <div className="absolute right-2 bottom-12 flex flex-col items-center gap-4 z-10 text-white pointer-events-none">
                        <div className="flex flex-col items-center">
                          <div className="h-10 w-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-white/10">
                            👍
                          </div>
                          <span className="text-[10px] font-bold mt-1 text-slate-200">12K</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="h-10 w-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-white/10">
                            💬
                          </div>
                          <span className="text-[10px] font-bold mt-1 text-slate-200">238</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="h-10 w-10 bg-black/40 backdrop-blur rounded-full flex items-center justify-center border border-white/10">
                            ↗️
                          </div>
                          <span className="text-[10px] font-bold mt-1 text-slate-200 font-mono">Share</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        as="a"
                        href={`${BACKEND_URL}/api/assets/outputs/${currentProject.id}?token=${token}`}
                        download={`${currentProject.id}_short.mp4`}
                        color="success"
                        className="flex-grow font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                      >
                        <Download size={18} /> Download Short MP4
                      </Button>
                    </div>

                    {/* YouTube Publishing Section */}
                    <div className="border-t border-[#444748] pt-4 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        📺 Publish directly to YouTube
                      </h4>

                      {youtubeAccounts.length === 0 ? (
                        <div className="bg-[#131313] border border-[#444748]/60 rounded-xl p-3.5 text-center text-xs text-slate-400">
                          No YouTube channels connected.
                          <button
                            type="button"
                            onClick={() => setActiveTab('social-media')}
                            className="text-violet-400 font-bold ml-1 hover:underline cursor-pointer"
                          >
                            Connect a Channel
                          </button>
                        </div>
                      ) : currentProject?.youtubeUpload?.status === 'success' ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center space-y-3">
                          <div className="text-2xl">🎉</div>
                          <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Published to YouTube</h5>
                          <p className="text-[11px] text-slate-350">
                            This video was successfully uploaded to <strong>{currentProject.youtubeUpload.channelName}</strong>.
                          </p>
                          {currentProject.youtubeUpload.videoId && (
                            <a
                              href={`https://youtube.com/watch?v=${currentProject.youtubeUpload.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold hover:underline"
                            >
                              View on YouTube ↗
                            </a>
                          )}
                          <div className="pt-2 border-t border-[#444748]/40">
                            <button
                              type="button"
                              onClick={() => {
                                setYtUploadError('');
                                setYtUploadSuccess('');
                                setShowYtModal(true);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white underline font-medium cursor-pointer"
                            >
                              Upload Again / Change Settings
                            </button>
                          </div>
                        </div>
                      ) : (isUploadingYouTube || currentProject?.youtubeUpload?.status === 'uploading') ? (
                        <div className="bg-[#131313] border border-[#444748] rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-violet-400 animate-pulse">Uploading to YouTube...</span>
                            <span className="font-bold text-white">
                              {currentProject?.youtubeUpload?.progress || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-[#1c1b1b] rounded-full h-2 overflow-hidden border border-[#444748]">
                            <div
                              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-full transition-all duration-300"
                              style={{ width: `${currentProject?.youtubeUpload?.progress || 0}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {currentProject?.youtubeUpload?.message || 'Preparing files...'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">Select Target Channel</label>
                            <select
                              value={selectedYoutubeId}
                              onChange={(e) => setSelectedYoutubeId(e.target.value)}
                              className="premium-select w-full bg-[#131313] border border-[#444748] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-white font-semibold"
                            >
                              {youtubeAccounts.map((acc) => (
                                <option key={acc._id || acc.channelId} value={acc._id || acc.channelId} className="bg-[#1c1b1b] text-white">
                                  {acc.channelName} ({acc.email})
                                </option>
                              ))}
                            </select>
                          </div>

                          {ytUploadSuccess && (
                            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 font-semibold">
                              ✓ {ytUploadSuccess}
                            </div>
                          )}

                          {ytUploadError && (
                            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 font-semibold">
                              ⚠️ {ytUploadError}
                            </div>
                          )}

                          <Button
                            size="md"
                            color="danger"
                            onClick={() => {
                              setYtUploadError('');
                              setYtUploadSuccess('');
                              setShowYtModal(true);
                            }}
                            isLoading={isUploadingYouTube}
                            className="w-full font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            Publish to YouTube
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-[#444748]/60 w-full" />

                    {/* Copy boards */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">SEO Publishing Assets</h4>

                      {/* Title Copy */}
                      <div className="flex justify-between items-center bg-[#131313] p-2.5 rounded-xl border border-[#444748]">
                        <div className="overflow-hidden pr-2">
                          <span className="text-[10px] font-semibold text-slate-450 block">Short Title</span>
                          <span className="text-xs font-bold text-white truncate block">{title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(title, 'title')}
                          className="bg-[#1c1b1b] hover:bg-[#201f1f] border border-[#444748] rounded-lg p-2 transition cursor-pointer"
                        >
                          {copiedField === 'title' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400" />}
                        </button>
                      </div>

                      {/* Description Copy */}
                      <div className="flex justify-between items-center bg-[#131313] p-2.5 rounded-xl border border-[#444748]">
                        <div className="overflow-hidden pr-2 w-full">
                          <span className="text-[10px] font-semibold text-slate-450 block">Description</span>
                          <span className="text-xs font-bold text-white line-clamp-1 block">{description}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(description, 'desc')}
                          className="bg-[#1c1b1b] hover:bg-[#201f1f] border border-[#444748] rounded-lg p-2 transition cursor-pointer"
                        >
                          {copiedField === 'desc' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400" />}
                        </button>
                      </div>

                      {/* Tags Copy */}
                      <div className="flex justify-between items-center bg-[#131313] p-2.5 rounded-xl border border-[#444748]">
                        <div className="overflow-hidden pr-2">
                          <span className="text-[10px] font-semibold text-slate-455 block">Hashtags</span>
                          <span className="text-xs font-bold text-white truncate block">
                            {currentProject.metadata?.hashtags?.map(h => `#${h}`).join(' ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(currentProject.metadata?.hashtags?.map(h => `#${h}`).join(' '), 'tags')}
                          className="bg-[#1c1b1b] hover:bg-[#201f1f] border border-[#444748] rounded-lg p-2 transition cursor-pointer"
                        >
                          {copiedField === 'tags' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-400" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: VOICE & AUDIO SETTINGS */}
            {rightTab === 'voice' && (
              <div className="space-y-4">
                <div className="pb-1 border-b border-[#444748]/60 flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Wand2 className="h-4.5 w-4.5 text-violet-500" />
                    Voice & Audio Settings
                  </h3>
                  {currentProject && (
                    voiceName !== (currentProject.voiceName || 'hi-IN-MadhurNeural') ||
                    parseFloat(voiceSpeed) !== parseFloat(currentProject.voiceSpeed || 1.0) ||
                    voicePitch !== (currentProject.voicePitch || '+0Hz') ||
                    voiceVolume !== (currentProject.voiceVolume || '+0%')
                  ) && (
                    <span className="text-[8px] bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded text-violet-300 font-bold uppercase animate-pulse">
                      Unsaved
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Voice Selection Dropdown */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">Narration Voice</label>

                    <div className="flex gap-2 items-center w-full min-w-0">
                      <div className="flex-grow min-w-0">
                        <select
                          value={voiceName}
                          onChange={(e) => setVoiceName(e.target.value)}
                          className="premium-select w-full min-w-0 text-xs py-2.5 border border-[#444748] rounded-xl px-3 bg-[#131313] text-white font-semibold cursor-pointer focus:outline-none focus:border-white"
                        >
                          {(voices || []).map(v => (
                            <option key={v.name} value={v.name} className="bg-[#1c1b1b] text-white">
                              {v.displayName} ({v.gender}) - {v.language}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Button
                        variant="flat"
                        onClick={() => handlePreviewVoice(voiceName)}
                        className={`font-bold text-xs px-3 py-2.5 border rounded-xl transition cursor-pointer shrink-0 ${
                          playingPreviewName === voiceName 
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                            : 'bg-[#131313] text-slate-300 border-[#444748] hover:bg-[#201f1f]'
                        }`}
                        isLoading={isPreviewLoading && playingPreviewName !== voiceName}
                      >
                        {playingPreviewName === voiceName ? '⏸️ Stop' : '🔊 Preview'}
                      </Button>
                    </div>
                  </div>

                  {/* Voice description / category info */}
                  {(() => {
                    const selectedVoiceObj = (voices || []).find(v => v.name === voiceName);
                    if (!selectedVoiceObj) return null;
                    return (
                      <div className="p-3 bg-[#131313] border border-[#444748]/60 rounded-xl text-xs space-y-1">
                        <p className="text-slate-350 font-semibold">{selectedVoiceObj.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(selectedVoiceObj.tags || []).map(t => (
                            <span key={t} className="text-[9px] bg-[#1c1b1b] border border-[#444748] text-slate-400 px-2 py-0.5 rounded-lg">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Speed Controls Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                      <span>Voice Speed (Pacing)</span>
                      <span className="text-violet-400 font-bold">{parseFloat(voiceSpeed).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={voiceSpeed}
                      onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#131313] rounded-lg appearance-none cursor-pointer accent-violet-500 border border-[#444748]"
                    />

                    {/* Preset Speed Buttons */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Slow', val: 0.85 },
                        { label: 'Normal', val: 1.0 },
                        { label: 'Fast', val: 1.15 },
                        { label: 'Energetic', val: 1.30 }
                      ].map(preset => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setVoiceSpeed(preset.val)}
                          className={`text-[10px] font-bold py-1.5 rounded-lg border transition-all cursor-pointer ${
                            Math.abs(voiceSpeed - preset.val) < 0.01
                              ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 font-bold'
                              : 'bg-[#131313] border-[#444748] text-slate-400 hover:text-white hover:bg-[#201f1f]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced optional controls */}
                  <div className="border-t border-[#444748]/60 pt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">Advanced Settings</span>
                      <span className="text-[9px] text-slate-500 font-mono">Edge TTS configurations</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold block ml-1">Pitch Adjust</span>
                        <select
                          value={voicePitch}
                          onChange={(e) => setVoicePitch(e.target.value)}
                          className="premium-select w-full bg-[#131313] border border-[#444748] rounded-xl p-2 text-white text-xs focus:outline-none focus:border-white font-semibold"
                        >
                          <option value="+0Hz" className="bg-[#1c1b1b] text-white">Default Pitch (0Hz)</option>
                          <option value="+5Hz" className="bg-[#1c1b1b] text-white">High Pitch (+5Hz)</option>
                          <option value="+10Hz" className="bg-[#1c1b1b] text-white">Excited (+10Hz)</option>
                          <option value="-5Hz" className="bg-[#1c1b1b] text-white">Deep Pitch (-5Hz)</option>
                          <option value="-10Hz" className="bg-[#1c1b1b] text-white">Grave Pitch (-10Hz)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold block ml-1">Volume Offset</span>
                        <select
                          value={voiceVolume}
                          onChange={(e) => setVoiceVolume(e.target.value)}
                          className="premium-select w-full bg-[#131313] border border-[#444748] rounded-xl p-2 text-white text-xs focus:outline-none focus:border-white font-semibold"
                        >
                          <option value="+0%" className="bg-[#1c1b1b] text-white">Normal (0%)</option>
                          <option value="+10%" className="bg-[#1c1b1b] text-white">Loud (+10%)</option>
                          <option value="+20%" className="bg-[#1c1b1b] text-white">Strong (+20%)</option>
                          <option value="-10%" className="bg-[#1c1b1b] text-white">Soft (-10%)</option>
                          <option value="-20%" className="bg-[#1c1b1b] text-white">Quiet (-20%)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Save & Quick Audio Update buttons */}
                  <div className="flex gap-2 pt-2 border-t border-[#444748]/60">
                    <Button
                      size="sm"
                      color="secondary"
                      variant="bordered"
                      onClick={handleSaveEdits}
                      isLoading={isSaving}
                      className="flex-grow border-[#444748] text-slate-300 hover:border-violet-500 hover:text-white rounded-xl cursor-pointer"
                    >
                      Save Settings
                    </Button>

                    {(currentProject.status === 'completed' || currentProject.status === 'draft' || currentProject.status === 'failed') && (
                      <Button
                        size="sm"
                        color="secondary"
                        onClick={handleVoiceOnlyRender}
                        className="flex-grow bg-violet-600 hover:bg-violet-750 shadow-lg shadow-violet-500/10 text-white font-bold rounded-xl cursor-pointer"
                      >
                        ⚡ Quick Audio
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ENDING OUTRO & CTA SETTINGS */}
            {rightTab === 'outro' && (
              <div className="space-y-4">
                <div className="pb-1 border-b border-[#444748]/60 flex justify-between items-center">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
                    Ending Outro (CTA)
                  </h3>
                  {currentProject && (
                    ctaEnabled !== (currentProject.ctaSettings?.enabled ?? true) ||
                    ctaStyle !== (currentProject.ctaSettings?.style ?? 'auto') ||
                    ctaLanguage !== (currentProject.ctaSettings?.language ?? 'auto') ||
                    parseInt(ctaDuration, 10) !== parseInt(currentProject.ctaSettings?.duration ?? 5, 10)
                  ) && (
                    <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold uppercase animate-pulse">
                      Unsaved
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">Enable Outro Scene</span>
                      <span className="text-[10px] text-slate-450">Automatically append subscribe & like scene</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ctaEnabled}
                        onChange={(e) => setCtaEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#131313] border border-[#444748] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {ctaEnabled && (
                    <div className="space-y-4 pt-2 border-t border-[#444748]/40">
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block ml-1">Visual Outro Style</span>
                        <select
                          value={ctaStyle}
                          onChange={(e) => setCtaStyle(e.target.value)}
                          className="premium-select w-full text-xs py-2.5 border border-[#444748] rounded-xl px-3 bg-[#131313] text-white font-semibold cursor-pointer focus:outline-none focus:border-white"
                        >
                          <option value="auto" className="bg-[#1c1b1b] text-white">Auto-Select (Theme Match)</option>
                          <option value="tech" className="bg-[#1c1b1b] text-white">Tech Glow</option>
                          <option value="ai" className="bg-[#1c1b1b] text-white">AI Network</option>
                          <option value="horror" className="bg-[#1c1b1b] text-white">Horror Mist</option>
                          <option value="motivation" className="bg-[#1c1b1b] text-white">Motivational</option>
                          <option value="cinematic" className="bg-[#1c1b1b] text-white">Cinematic</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block ml-1">Outro Language</span>
                        <select
                          value={ctaLanguage}
                          onChange={(e) => setCtaLanguage(e.target.value)}
                          className="premium-select w-full text-xs py-2.5 border border-[#444748] rounded-xl px-3 bg-[#131313] text-white font-semibold cursor-pointer focus:outline-none focus:border-white"
                        >
                          <option value="auto" className="bg-[#1c1b1b] text-white">Auto (Same as Script)</option>
                          <option value="punjabi" className="bg-[#1c1b1b] text-white">Punjabi (🇮🇳)</option>
                          <option value="hinglish" className="bg-[#1c1b1b] text-white">Hinglish (🇮🇳)</option>
                          <option value="hindi" className="bg-[#1c1b1b] text-white">Hindi (🇮🇳)</option>
                          <option value="english" className="bg-[#1c1b1b] text-white">English (🇺🇸)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block ml-1">Outro Duration</span>
                        <select
                          value={ctaDuration}
                          onChange={(e) => setCtaDuration(e.target.value)}
                          className="premium-select w-full text-xs py-2.5 border border-[#444748] rounded-xl px-3 bg-[#131313] text-white font-semibold cursor-pointer focus:outline-none focus:border-white"
                        >
                          <option value="4" className="bg-[#1c1b1b] text-white">4 Seconds</option>
                          <option value="5" className="bg-[#1c1b1b] text-white">5 Seconds</option>
                          <option value="6" className="bg-[#1c1b1b] text-white">6 Seconds</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Save CTA button */}
                  {(ctaEnabled !== (currentProject.ctaSettings?.enabled ?? true) ||
                    ctaStyle !== (currentProject.ctaSettings?.style ?? 'auto') ||
                    ctaLanguage !== (currentProject.ctaSettings?.language ?? 'auto') ||
                    parseInt(ctaDuration, 10) !== parseInt(currentProject.ctaSettings?.duration ?? 5, 10)
                  ) && (
                    <Button
                      size="sm"
                      color="success"
                      onClick={handleSaveCtaSettings}
                      isLoading={isSaving}
                      className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer mt-2"
                    >
                      Save Outro Settings
                    </Button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* FULL-WIDTH BOTTOM TIMELINE PREVIEW BLOCK */}
      <div className="bg-[#1c1b1b] border border-[#444748] p-5 mt-6 w-full shadow-md rounded-3xl space-y-4">
        <div className="pb-3 border-b border-[#444748]/60 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Film size={16} className="text-violet-500" />
              Interactive Video Timeline
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Drag and drop scenes horizontally to re-order the video timeline sequence.
            </p>
          </div>
          <span className="text-xs bg-[#131313] border border-[#444748] text-slate-300 px-3 py-1 rounded-full font-semibold">
            {scenes.length} Scenes Block
          </span>
        </div>
        
        <div className="pt-2 overflow-x-auto">
          <div className="flex gap-4 pb-2 min-w-max">
            {scenes.map((scene, idx) => {
              const hasThumb = scene.thumbnailPath && scene.thumbnailPath !== '';
              const thumbUrl = hasThumb ? `${BACKEND_URL}${scene.thumbnailPath}?token=${token}` : null;

              return (
                <div
                  key={idx}
                  draggable={currentProject.status !== 'rendering' && currentProject.status !== 'queued'}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`relative flex flex-col justify-between w-[180px] h-[130px] rounded-2xl border transition-all duration-350 p-2 cursor-grab active:cursor-grabbing bg-[#131313] group ${
                    dragOverIndex === idx
                      ? 'border-violet-500 scale-[1.03] bg-violet-500/10'
                      : 'border-[#444748] hover:border-[#8e9192] hover:scale-[1.01]'
                  }`}
                >
                  {/* Scene Number overlay */}
                  <span className="absolute top-2 left-2 z-10 bg-[#1c1b1b]/90 text-[9px] font-bold px-2 py-0.5 rounded-lg border border-[#444748] text-violet-400 shadow-sm">
                    Scene {idx + 1}
                  </span>

                  {/* Delete button overlay on timeline scene */}
                  {currentProject.status === 'draft' && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete Scene ${idx + 1}?`)) {
                          await deleteScene(currentProject.id, scene.sceneNumber);
                        }
                      }}
                      className="absolute top-2 right-8 z-10 bg-[#1c1b1b]/95 text-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer border border-[#444748] shadow-sm"
                      title="Delete Scene"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                  {/* Grip handler show on hover */}
                  <span className="absolute top-2 right-2 z-10 bg-[#1c1b1b]/95 text-slate-400 p-1 rounded-lg opacity-50 group-hover:opacity-100 transition-opacity border border-[#444748] shadow-sm">
                    <GripHorizontal size={12} />
                  </span>

                  {/* Thumbnail / Visual indicator */}
                  <div className="w-full h-[70px] bg-[#1c1b1b] rounded-lg overflow-hidden flex items-center justify-center border border-[#444748] relative mt-5">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover animate-in fade-in" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-500">
                        {scene.clipType === 'AI' ? <Sparkles size={16} /> : <Video size={16} />}
                        <span className="text-[8px] uppercase tracking-wider font-semibold font-mono">Render Pending</span>
                      </div>
                    )}
                    {/* Source tag bottom overlay */}
                    <span className={`absolute bottom-1 right-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                      scene.clipType === 'AI'
                        ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {scene.clipType}
                    </span>
                  </div>

                  {/* Footer details */}
                  <div className="flex justify-between items-center text-[9px] text-slate-450 pt-1 font-semibold mt-1">
                    <span className="truncate max-w-[100px]" title={scene.narration}>
                      {scene.narration}
                    </span>
                    <span className="text-violet-400 font-bold">
                      {scene.duration ? `${parseFloat(scene.duration).toFixed(1)}s` : '0s'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* YouTube Upload Confirmation Modal */}
      {showYtModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1c1b1b] border border-[#444748] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-white">
            <button
              onClick={() => setShowYtModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                📺 YouTube Upload Settings
              </h3>
              <p className="text-xs text-slate-400">
                Choose your publication format and privacy options before publishing to YouTube.
              </p>
            </div>

            <div className="space-y-4">
              {/* Option 1: Format / Upload Type */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                  1. Video Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalUploadType('short')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                      modalUploadType === 'short'
                        ? 'border-violet-500 bg-violet-500/10 text-white shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                        : 'border-[#444748] bg-[#131313] text-slate-400 hover:border-[#8e9192]'
                    }`}
                  >
                    <span className="text-xs font-bold">YouTube Short</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Appends #Shorts for Shorts shelf discovery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalUploadType('video')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                      modalUploadType === 'video'
                        ? 'border-violet-500 bg-violet-500/10 text-white shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                        : 'border-[#444748] bg-[#131313] text-slate-400 hover:border-[#8e9192]'
                    }`}
                  >
                    <span className="text-xs font-bold">Standard Video</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Normal video layout without tags</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Privacy / Visibility */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block ml-1">
                  2. Privacy / Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalPrivacyStatus('public')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                      modalPrivacyStatus === 'public'
                        ? 'border-violet-500 bg-violet-500/10 text-white shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                        : 'border-[#444748] bg-[#131313] text-slate-400 hover:border-[#8e9192]'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">🌐 Public</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Visible to everyone instantly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPrivacyStatus('private')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${
                      modalPrivacyStatus === 'private'
                        ? 'border-violet-500 bg-violet-500/10 text-white shadow-[0_0_8px_rgba(139,92,246,0.2)]'
                        : 'border-[#444748] bg-[#131313] text-slate-400 hover:border-[#8e9192]'
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">🔒 Private</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Only visible to you (for review)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="bordered"
                onClick={() => setShowYtModal(false)}
                className="w-1/3 border-[#444748] hover:bg-[#201f1f] text-slate-300 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowYtModal(false);
                  handleYoutubePublish(modalPrivacyStatus, modalUploadType);
                }}
                className="w-2/3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Confirm & Upload
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
