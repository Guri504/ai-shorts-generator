'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, BACKEND_URL } from '../store/appStore';
import { Card, Button, TextArea, Input, Select, ListBox, ProgressBar } from '@heroui/react';
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

  // Voice & Audio locally edited states
  const [voiceName, setVoiceName] = useState('');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState('+0Hz');
  const [voiceVolume, setVoiceVolume] = useState('+0%');

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
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
      {/* Back navigation & Header */}
      <div className="flex justify-between items-center bg-slate-950/20 p-4 rounded-2xl border border-slate-900">
        <Button
          variant="bordered"
          onClick={() => setActiveTab('dashboard')}
          className="text-slate-300 border-slate-800 hover:border-violet-500 hover:text-white transition-colors"
        >
          ← Back to Dashboard
        </Button>
        <div className="text-right">
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-mono uppercase">
            Project ID: {currentProject.id}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: EDIT METADATA & SCENES */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="glow-card border-none bg-slate-950/60 p-4">
            <Card.Header className="pb-2">
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                YouTube SEO Metadata
              </h2>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-slate-400">YouTube Shorts Title</label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                  className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-slate-400">SEO Description</label>
                <TextArea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                  className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full disabled:opacity-50 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-slate-400">Hashtags (separated by space)</label>
                <Input
                  type="text"
                  placeholder="Space secrets fact viral"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                  className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full disabled:opacity-50"
                />
              </div>
            </Card.Content>
          </Card>

          {/* Scenes Editors */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <Layers className="h-5 w-5 text-violet-400" />
                Script & Scene Breakdown
              </h2>
              {(currentProject.status === 'draft' || currentProject.status === 'failed' || currentProject.status === 'completed') && (
                <Button
                  size="sm"
                  color="secondary"
                  onClick={handleSaveEdits}
                  isLoading={isSaving}
                  className="bg-violet-600 flex items-center gap-1.5 shadow-lg shadow-violet-500/20"
                >
                  {saveSuccess ? <Check size={16} /> : <Save size={16} />}
                  {saveSuccess ? 'Saved!' : 'Save Script Edits'}
                </Button>
              )}
            </div>

            {scenes.map((scene, idx) => (
              <Card key={idx} className="border border-slate-900 bg-slate-950/40 p-4 transition-all duration-200 hover:border-slate-800">
                <Card.Header className="flex justify-between items-center pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-violet-400 bg-violet-950/60 border border-violet-800/40 h-7 w-7 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-slate-400 capitalize">
                      Duration: {scene.duration ? `${parseFloat(scene.duration).toFixed(1)}s` : 'Pending'}
                    </span>
                    {currentProject.status === 'draft' && (
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="light"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete Scene ${idx + 1}?`)) {
                            await deleteScene(currentProject.id, scene.sceneNumber);
                          }
                        }}
                        title="Delete Scene"
                        className="hover:bg-red-950/20 text-red-400 hover:text-red-300 h-7 w-7 p-0 min-w-0"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>

                  {/* Select Clip Type & Regenerate Actions */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={scene.clipType}
                      onChange={(val) => handleSceneChange(idx, 'clipType', val)}
                      className="max-w-[120px]"
                      disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                    >
                      <span className="text-[9px] text-slate-500 font-semibold uppercase block mb-1">Source</span>
                      <Select.Trigger className="w-full text-xs py-1 border border-slate-800 rounded-lg px-2 flex justify-between items-center bg-slate-950 text-slate-200">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                        <ListBox className="p-1">
                          <ListBox.Item id="Stock" textValue="Pexels Stock" className="cursor-pointer hover:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200">Pexels Stock</ListBox.Item>
                          <ListBox.Item id="AI" textValue="AI generated" className="cursor-pointer hover:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200">AI generated</ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    {/* Single Scene Regeneration Menu */}
                    {(currentProject.status === 'completed' || currentProject.status === 'draft' || currentProject.status === 'failed') && (
                      <Select
                        placeholder="Regenerate..."
                        onChange={(type) => {
                          if (type && type !== '') {
                            handleRegenScene(scene.sceneNumber, type);
                          }
                        }}
                        className="max-w-[140px]"
                      >
                        <span className="text-[9px] text-slate-500 font-semibold uppercase block mb-1">Regenerate Asset</span>
                        <Select.Trigger className="w-full text-xs py-1 border border-amber-900/40 rounded-lg px-2 flex justify-between items-center bg-amber-950/10 text-amber-400">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                          <ListBox className="p-1">
                            <ListBox.Item id="all" textValue="🔄 Regen Whole Scene" className="cursor-pointer hover:bg-slate-900 rounded px-2 py-1 text-xs text-amber-400 font-semibold">🔄 Whole Scene</ListBox.Item>
                            <ListBox.Item id="clip" textValue="🎬 Regen Visual Clip" className="cursor-pointer hover:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200">🎬 Visual Clip</ListBox.Item>
                            <ListBox.Item id="voice" textValue="🎙️ Regen Voiceover" className="cursor-pointer hover:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200">🎙️ Voiceover</ListBox.Item>
                            <ListBox.Item id="subtitles" textValue="📝 Regen Subtitles" className="cursor-pointer hover:bg-slate-900 rounded px-2 py-1 text-xs text-slate-200">📝 Subtitles</ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  </div>
                </Card.Header>

                <Card.Content className="space-y-4 py-2">
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-slate-400">Voice Narration (Hindi / Hinglish / English)</label>
                    <TextArea
                      rows={2}
                      value={scene.narration}
                      onChange={(e) => handleSceneChange(idx, 'narration', e.target.value)}
                      disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                      className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full disabled:opacity-50 resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-slate-400">Visual Prompt (For AI clip generation)</label>
                    <TextArea
                      rows={2}
                      value={scene.visualPrompt}
                      onChange={(e) => handleSceneChange(idx, 'visualPrompt', e.target.value)}
                      disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                      className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full disabled:opacity-50 resize-none"
                    />
                  </div>

                  {scene.clipType === 'Stock' && (
                    <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-semibold text-slate-400">Stock Search Keyword</label>
                      <Input
                        type="text"
                        value={scene.stockSearchKeyword || ''}
                        onChange={(e) => handleSceneChange(idx, 'stockSearchKeyword', e.target.value)}
                        disabled={currentProject.status === 'rendering' || currentProject.status === 'queued'}
                        className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full disabled:opacity-50"
                      />
                    </div>
                  )}
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW & LIVE WS LOG TERMINAL */}
        <div className="lg:col-span-5 flex flex-col gap-6 justify-start">

          {/* A. DRAFT RENDERING TRIGGER PANEL */}
          {currentProject.status === 'draft' && (
            <Card className="glow-card border-none bg-slate-950/60 p-6 sticky top-6 space-y-6">
              <Card.Header className="flex flex-col items-center text-center pb-2">
                <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-3 border border-amber-500/20">
                  <Film size={24} />
                </div>
                <h3 className="text-lg font-bold">Approve & Compile Short</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Decide scene details, customize scripts, and queue the project for compilation.
                </p>
              </Card.Header>

              <Card.Content className="space-y-4 py-2">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Scene Cost breakdown</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Cinematic AI Clips (Gemini Flow):</span>
                    <span className="font-bold text-violet-400">{countClips('AI')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Stock Footage (Pexels / Free):</span>
                    <span className="font-bold text-green-400">{countClips('Stock')}</span>
                  </div>
                </div>

                <div className="p-3 bg-violet-950/20 border border-violet-900/30 rounded-xl text-xs text-violet-300 flex gap-2">
                  <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    <strong>Intelligent Credit Optimization</strong> uses stock clips for normal visuals, reserving Gemini Flow credits strictly for impossible, sci-fi, or highly expressive prompts.
                  </p>
                </div>

                {renderError && (
                  <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 rounded-lg text-xs font-semibold">
                    {renderError}
                  </div>
                )}
              </Card.Content>

              <Button
                color="secondary"
                size="lg"
                onClick={handleStartRender}
                className="w-full font-bold shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 py-6"
                endContent={<Play size={18} />}
              >
                Approve & Render Video
              </Button>
            </Card>
          )}

          {/* B. RENDERING / QUEUED PANEL WITH LIVE WEBSOCKET TERMINAL LOGS */}
          {(currentProject.status === 'rendering' || currentProject.status === 'queued') && (
            <Card className="glow-card border-none bg-slate-950/60 p-6 sticky top-6 text-center space-y-6">
              <Card.Header className="flex flex-col items-center pb-2">
                <div className="h-16 w-16 bg-violet-900/10 text-violet-500 rounded-full flex items-center justify-center mb-4 border border-violet-800/20 relative">
                  <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                  <Film size={26} />
                </div>
                <h3 className="text-xl font-bold">
                  {currentProject.status === 'queued' ? 'Queued for Rendering' : 'Compiling Your Short'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Track dynamic synthesis progress, Edge TTS alignments, and FFmpeg concatenations in real-time.
                </p>
              </Card.Header>

              <Card.Content className="space-y-6">
                <div className="space-y-2">
                  <ProgressBar
                    value={currentProject.progress}
                    className="max-w-md mx-auto w-full"
                  >
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                      <span>Progress</span>
                      <ProgressBar.Output className="font-semibold text-violet-400" />
                    </div>
                    <ProgressBar.Track className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <ProgressBar.Fill className="h-full bg-violet-600 rounded-full transition-all duration-300" />
                    </ProgressBar.Track>
                  </ProgressBar>

                  {/* Dynamic Render Stats */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40">
                    <div className="text-left">
                      ⏳ Est. Remaining: <span className="text-amber-400 font-bold">{renderEta ? `${renderEta}s` : 'Calculating...'}</span>
                    </div>
                    <div className="text-right">
                      ⚡ Render Speed: <span className="text-violet-400 font-bold">{renderSpeed ? `${renderSpeed}s/sc` : 'Estimating...'}</span>
                    </div>
                  </div>
                </div>

                {/* Live Real-time Logs Terminal */}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase text-slate-500 mb-1 tracking-wide">Live Compilation Terminal Logs</span>
                  <div className="bg-black/80 border border-slate-900 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 h-[160px] overflow-y-auto shadow-inner">
                    <p className="text-slate-500">&gt; Starting render connection...</p>
                    <p className="text-slate-500">&gt; Status: {currentProject.stepStatus}</p>
                    {renderLogs.map((log, lIdx) => (
                      <p key={lIdx} className={
                        log.stage === 'complete' ? 'text-green-400 font-bold' :
                          (log.stage === 'failed' ? 'text-red-400' : 'text-slate-300')
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
                  className="w-full font-bold flex items-center justify-center gap-2 border border-red-900/40 text-red-400 hover:bg-red-950/20 transition-colors"
                  endContent={<XCircle size={16} />}
                >
                  Cancel Rendering / Stop Process
                </Button>
              </Card.Content>
            </Card>
          )}

          {/* C. RENDER FAILED PANEL */}
          {currentProject.status === 'failed' && (
            <Card className="glow-card border-none bg-red-950/20 border border-red-900/30 p-6 sticky top-6 text-center space-y-6">
              <Card.Header className="flex flex-col items-center pb-2">
                <div className="h-12 w-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-lg font-bold text-red-400">Rendering Failed</h3>
                <p className="text-xs text-slate-400 mt-1">
                  An error occurred during video creation. Check key configs or visuals.
                </p>
              </Card.Header>

              <Card.Content className="py-2 text-left bg-black/40 border border-red-950 rounded-xl p-4 font-mono text-xs text-red-400">
                <p className="font-bold">Error Log:</p>
                <p className="mt-1">{currentProject.error}</p>
              </Card.Content>

              <Button
                color="warning"
                onClick={handleStartRender}
                className="w-full font-bold flex items-center justify-center gap-2"
                endContent={<RefreshCw size={16} />}
              >
                Retry Render
              </Button>
            </Card>
          )}

          {/* D. COMPLETED PREVIEW PLAYER PANEL */}
          {currentProject.status === 'completed' && (
            <div className="sticky top-6 space-y-6">
              {/* Vertical Simulator Video Container */}
              <div className="shorts-container relative">
                <video
                  src={`${BACKEND_URL}/api/assets/outputs/${currentProject.id}?token=${token}`}
                  className="w-full h-full object-cover"
                  controls
                  loop
                  autoPlay
                />

                {/* YouTube overlay mocks */}
                <div className="absolute bottom-12 left-4 right-14 pointer-events-none z-10 space-y-1.5">
                  <span className="text-xs bg-violet-600/90 text-white px-2 py-0.5 rounded-full font-semibold">
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
                    <span className="text-[10px] font-bold mt-1 text-slate-200">Share</span>
                  </div>
                </div>
              </div>

              {/* Action buttons and SEO boards */}
              <Card className="glow-card border-none bg-slate-950/60 p-4">
                <Card.Content className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      as="a"
                      href={`${BACKEND_URL}/api/assets/outputs/${currentProject.id}?token=${token}`}
                      download={`${currentProject.id}_short.mp4`}
                      color="success"
                      className="flex-grow font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download size={18} /> Download Short MP4
                    </Button>
                  </div>

                  {/* YouTube Publishing Section */}
                  <div className="border-t border-slate-900 pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                      📺 Publish directly to YouTube
                    </h4>

                    {youtubeAccounts.length === 0 ? (
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 text-center text-xs text-slate-500">
                        No YouTube channels connected.
                        <button
                          onClick={() => setActiveTab('settings')}
                          className="text-violet-400 font-bold ml-1 hover:underline"
                        >
                          Connect a Channel
                        </button>
                      </div>
                    ) : currentProject?.youtubeUpload?.status === 'success' ? (
                      <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-4 text-center space-y-3">
                        <div className="text-2xl">🎉</div>
                        <h5 className="text-xs font-bold text-green-400 uppercase tracking-wider">Published to YouTube</h5>
                        <p className="text-[11px] text-slate-400">
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
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setYtUploadError('');
                              setYtUploadSuccess('');
                              setShowYtModal(true);
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-300 underline font-medium"
                          >
                            Upload Again / Change Settings
                          </button>
                        </div>
                      </div>
                    ) : (isUploadingYouTube || currentProject?.youtubeUpload?.status === 'uploading') ? (
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-violet-400 animate-pulse">Uploading to YouTube...</span>
                          <span className="font-bold text-slate-300">
                            {currentProject?.youtubeUpload?.progress || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900">
                          <div
                            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-full transition-all duration-300"
                            style={{ width: `${currentProject?.youtubeUpload?.progress || 0}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {currentProject?.youtubeUpload?.message || 'Preparing files...'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Target Channel</label>
                          <select
                            value={selectedYoutubeId}
                            onChange={(e) => setSelectedYoutubeId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                          >
                            {youtubeAccounts.map((acc) => (
                              <option key={acc._id || acc.channelId} value={acc._id || acc.channelId}>
                                {acc.channelName} ({acc.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        {ytUploadSuccess && (
                          <div className="p-2.5 bg-green-950/20 border border-green-900/30 rounded-lg text-xs text-green-400">
                            ✓ {ytUploadSuccess}
                          </div>
                        )}

                        {ytUploadError && (
                          <div className="p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-400">
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
                          className="w-full font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-1.5"
                        >
                          Publish to YouTube
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-slate-900 w-full" />

                  {/* Copy boards */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">SEO Publishing Assets</h4>

                    {/* Title Copy */}
                    <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="overflow-hidden pr-2">
                        <span className="text-[10px] font-semibold text-slate-500 block">Short Title</span>
                        <span className="text-xs font-medium text-slate-200 truncate block">{title}</span>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onClick={() => handleCopyText(title, 'title')}
                      >
                        {copiedField === 'title' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </Button>
                    </div>

                    {/* Description Copy */}
                    <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="overflow-hidden pr-2 w-full">
                        <span className="text-[10px] font-semibold text-slate-500 block">Description</span>
                        <span className="text-xs font-medium text-slate-200 line-clamp-1 block">{description}</span>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onClick={() => handleCopyText(description, 'desc')}
                      >
                        {copiedField === 'desc' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </Button>
                    </div>

                    {/* Tags Copy */}
                    <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <div className="overflow-hidden pr-2">
                        <span className="text-[10px] font-semibold text-slate-500 block">Hashtags</span>
                        <span className="text-xs font-medium text-slate-200 truncate block">
                          {currentProject.metadata?.hashtags?.map(h => `#${h}`).join(' ')}
                        </span>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        onClick={() => handleCopyText(currentProject.metadata?.hashtags?.map(h => `#${h}`).join(' '), 'tags')}
                      >
                        {copiedField === 'tags' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}

          {/* Voice & Audio Settings Card */}
          {currentProject.status !== 'rendering' && currentProject.status !== 'queued' && (() => {
            const isVoiceChanged = currentProject && (
              voiceName !== (currentProject.voiceName || 'hi-IN-MadhurNeural') ||
              parseFloat(voiceSpeed) !== parseFloat(currentProject.voiceSpeed || 1.0) ||
              voicePitch !== (currentProject.voicePitch || '+0Hz') ||
              voiceVolume !== (currentProject.voiceVolume || '+0%')
            );
            const voiceTriggerText = (voices || []).find(v => v.name === voiceName)?.displayName || 'Select voice...';

            return (
              <Card className="glow-card border-none bg-slate-950/60 p-4 space-y-4">
                <Card.Header className="pb-1 flex justify-between items-center">
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Wand2 className="h-4.5 w-4.5 text-violet-400" />
                    Voice & Audio Settings
                  </h3>
                  {isVoiceChanged && (
                    <span className="text-[9px] bg-violet-950 border border-violet-850 px-2 py-0.5 rounded text-violet-400 font-bold uppercase animate-pulse">
                      Unsaved Changes
                    </span>
                  )}
                </Card.Header>

                <Card.Content className="space-y-4">
                  {/* Voice Selection Dropdown */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-xs font-semibold text-slate-400">Narration Voice</label>

                    <div className="flex gap-2">
                      <Select
                        value={voiceName}
                        onChange={setVoiceName}
                        className="flex-grow"
                      >
                        <Select.Trigger className="w-full text-sm py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                          <span className="block truncate">{voiceTriggerText}</span>
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                          <ListBox className="p-1 max-h-[220px] overflow-y-auto">
                            {(voices || []).map(v => (
                              <ListBox.Item
                                key={v.name}
                                id={v.name}
                                textValue={`${v.displayName} (${v.gender})`}
                                className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200"
                              >
                                <div className="flex justify-between items-center w-full">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-200">{v.displayName}</span>
                                    <span className="text-[9px] text-slate-500">{v.language} • {v.gender}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    {(v.tags || []).includes('Recommended') && (
                                      <span className="text-[8px] bg-violet-950/80 border border-violet-850 text-violet-400 px-1 py-0.5 rounded uppercase font-bold">Best</span>
                                    )}
                                  </div>
                                </div>
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      <Button
                        variant="flat"
                        onClick={() => handlePreviewVoice(voiceName)}
                        className={`font-semibold text-xs px-3 border border-slate-800 ${playingPreviewName === voiceName ? 'bg-violet-950/40 text-violet-400 border-violet-850' : 'bg-slate-950 text-slate-300'
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
                      <div className="p-3 bg-slate-900/50 border border-slate-850 rounded-xl text-xs space-y-1">
                        <p className="text-slate-300 font-medium">{selectedVoiceObj.description}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(selectedVoiceObj.tags || []).map(t => (
                            <span key={t} className="text-[9px] bg-slate-950 border border-slate-850 text-slate-400 px-2 py-0.5 rounded">
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
                      className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-600"
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
                          className={`text-[10px] font-semibold py-1.5 rounded-lg border transition-all ${Math.abs(voiceSpeed - preset.val) < 0.01
                              ? 'bg-violet-950/40 border-violet-850 text-violet-400 font-bold'
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                            }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced optional controls */}
                  <div className="border-t border-slate-900 pt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-400">Advanced settings</span>
                      <span className="text-[10px] text-slate-500 font-mono">Edge TTS configurations</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold block">Pitch Adjust</span>
                        <select
                          value={voicePitch}
                          onChange={(e) => setVoicePitch(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-violet-500"
                        >
                          <option value="+0Hz">Default Pitch (0Hz)</option>
                          <option value="+5Hz">High Pitch (+5Hz)</option>
                          <option value="+10Hz">Excited (+10Hz)</option>
                          <option value="-5Hz">Deep Pitch (-5Hz)</option>
                          <option value="-10Hz">Grave Pitch (-10Hz)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 font-semibold block">Volume Offset</span>
                        <select
                          value={voiceVolume}
                          onChange={(e) => setVoiceVolume(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-violet-500"
                        >
                          <option value="+0%">Normal (0%)</option>
                          <option value="+10%">Loud (+10%)</option>
                          <option value="+20%">Strong (+20%)</option>
                          <option value="-10%">Soft (-10%)</option>
                          <option value="-20%">Quiet (-20%)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Save & Quick Audio Update buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      color="secondary"
                      variant="bordered"
                      onClick={handleSaveEdits}
                      isLoading={isSaving}
                      className="flex-grow border-slate-800 text-slate-300 hover:border-violet-500"
                    >
                      Save Settings
                    </Button>

                    {(currentProject.status === 'completed' || currentProject.status === 'draft' || currentProject.status === 'failed') && (
                      <Button
                        size="sm"
                        color="secondary"
                        onClick={handleVoiceOnlyRender}
                        className="flex-grow bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/10 text-white font-bold"
                      >
                        ⚡ Quick Audio Update
                      </Button>
                    )}
                  </div>
                </Card.Content>
              </Card>
            );
          })()}

          {/* Ending Outro & CTA Settings Card */}
          {currentProject.status !== 'rendering' && currentProject.status !== 'queued' && (() => {
            const isCtaChanged = currentProject && (
              ctaEnabled !== (currentProject.ctaSettings?.enabled ?? true) ||
              ctaStyle !== (currentProject.ctaSettings?.style ?? 'auto') ||
              ctaLanguage !== (currentProject.ctaSettings?.language ?? 'auto') ||
              parseInt(ctaDuration, 10) !== parseInt(currentProject.ctaSettings?.duration ?? 5, 10)
            );

            return (
              <Card className="glow-card border-none bg-slate-950/60 p-4 space-y-4 mt-4">
                <Card.Header className="pb-1 flex justify-between items-center">
                  <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
                    Ending Outro (CTA)
                  </h3>
                  {isCtaChanged && (
                    <span className="text-[9px] bg-emerald-950 border border-emerald-850 px-2 py-0.5 rounded text-emerald-400 font-bold uppercase animate-pulse">
                      Unsaved Changes
                    </span>
                  )}
                </Card.Header>

                <Card.Content className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">Enable Outro Scene</span>
                      <span className="text-[10px] text-slate-500">Automatically append subscribe & like scene</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ctaEnabled}
                        onChange={(e) => setCtaEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {ctaEnabled && (
                    <div className="space-y-3 pt-2">
                      <Select
                        value={ctaStyle}
                        onChange={setCtaStyle}
                        className="w-full"
                      >
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Visual Outro Style</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                          <ListBox className="p-1">
                            <ListBox.Item id="auto" textValue="Auto-Select (Theme Match)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Auto-Select
                            </ListBox.Item>
                            <ListBox.Item id="tech" textValue="Tech Glow" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Tech Glow
                            </ListBox.Item>
                            <ListBox.Item id="ai" textValue="AI Network" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              AI Network
                            </ListBox.Item>
                            <ListBox.Item id="horror" textValue="Horror Mist" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Horror Mist
                            </ListBox.Item>
                            <ListBox.Item id="motivation" textValue="Motivational" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Motivational
                            </ListBox.Item>
                            <ListBox.Item id="cinematic" textValue="Cinematic Storytelling" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Cinematic
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      <Select
                        value={ctaLanguage}
                        onChange={setCtaLanguage}
                        className="w-full"
                      >
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Outro Language</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                          <ListBox className="p-1">
                            <ListBox.Item id="auto" textValue="Auto (Same as Script)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Auto (Same)
                            </ListBox.Item>
                            <ListBox.Item id="punjabi" textValue="Punjabi" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Punjabi (🇮🇳)
                            </ListBox.Item>
                            <ListBox.Item id="hinglish" textValue="Hinglish" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Hinglish (🇮🇳)
                            </ListBox.Item>
                            <ListBox.Item id="hindi" textValue="Hindi" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Hindi (🇮🇳)
                            </ListBox.Item>
                            <ListBox.Item id="english" textValue="English" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              English (🇺🇸)
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      <Select
                        value={ctaDuration}
                        onChange={setCtaDuration}
                        className="w-full"
                      >
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Outro Duration</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                          <ListBox className="p-1">
                            <ListBox.Item id="4" textValue="4 Seconds" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              4 Seconds
                            </ListBox.Item>
                            <ListBox.Item id="5" textValue="5 Seconds" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              5 Seconds
                            </ListBox.Item>
                            <ListBox.Item id="6" textValue="6 Seconds" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              6 Seconds
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}

                  {/* Save CTA button */}
                  {isCtaChanged && (
                    <Button
                      size="sm"
                      color="success"
                      onClick={handleSaveCtaSettings}
                      isLoading={isSaving}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Save Outro Settings
                    </Button>
                  )}
                </Card.Content>
              </Card>
            );
          })()}

        </div>
      </div>

      {/* FULL-WIDTH BOTTOM TIMELINE PREVIEW BLOCK */}
      <Card className="glow-card border-none bg-slate-950/70 p-5 mt-6 w-full">
        <Card.Header className="pb-3 border-b border-slate-900/50 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Film size={16} className="text-violet-400" />
              Interactive Video Timeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Drag and drop scenes horizontally to re-order the video timeline sequence.
            </p>
          </div>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-semibold">
            {scenes.length} Scenes Block
          </span>
        </Card.Header>
        <Card.Content className="pt-4 overflow-x-auto">
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
                  className={`relative flex flex-col justify-between w-[180px] h-[130px] rounded-xl border transition-all duration-300 p-2 cursor-grab active:cursor-grabbing bg-slate-950/80 group ${dragOverIndex === idx
                      ? 'border-violet-500 scale-[1.03] bg-violet-950/10'
                      : 'border-slate-800 hover:border-slate-600 hover:scale-[1.01]'
                    }`}
                >
                  {/* Scene Number overlay */}
                  <span className="absolute top-2 left-2 z-10 bg-slate-900/90 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-800 text-violet-400">
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
                      className="absolute top-2 right-8 z-10 bg-slate-900/90 text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-300 hover:bg-red-950/40 transition-all cursor-pointer border border-slate-800"
                      title="Delete Scene"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                  {/* Grip handler show on hover */}
                  <span className="absolute top-2 right-2 z-10 bg-slate-900/90 text-slate-400 p-0.5 rounded opacity-50 group-hover:opacity-100 transition-opacity">
                    <GripHorizontal size={12} />
                  </span>

                  {/* Thumbnail / Visual indicator */}
                  <div className="w-full h-[70px] bg-slate-900/80 rounded-lg overflow-hidden flex items-center justify-center border border-slate-850 relative mt-5">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-600">
                        {scene.clipType === 'AI' ? <Sparkles size={16} /> : <Video size={16} />}
                        <span className="text-[8px] uppercase tracking-wider font-semibold font-mono">Render Pending</span>
                      </div>
                    )}
                    {/* Source tag bottom overlay */}
                    <span className={`absolute bottom-1 right-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${scene.clipType === 'AI'
                        ? 'bg-violet-950/90 text-violet-400 border border-violet-800/40'
                        : 'bg-green-950/90 text-green-400 border border-green-800/40'
                      }`}>
                      {scene.clipType}
                    </span>
                  </div>

                  {/* Footer details */}
                  <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 font-semibold mt-1">
                    <span className="truncate max-w-[100px]" title={scene.narration}>
                      {scene.narration}
                    </span>
                    <span className="text-violet-400">
                      {scene.duration ? `${parseFloat(scene.duration).toFixed(1)}s` : '0s'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Content>
      </Card>

      {/* YouTube Upload Confirmation Modal */}
      {showYtModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowYtModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 hover:bg-slate-850 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="space-y-2">
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. Video Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalUploadType('short')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${modalUploadType === 'short'
                        ? 'border-violet-500 bg-violet-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    <span className="text-xs font-bold">YouTube Short</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Appends #Shorts for Shorts shelf discovery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalUploadType('video')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${modalUploadType === 'video'
                        ? 'border-violet-500 bg-violet-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    <span className="text-xs font-bold">Standard Video</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Normal video layout without tags</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Privacy / Visibility */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  2. Privacy / Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModalPrivacyStatus('public')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${modalPrivacyStatus === 'public'
                        ? 'border-violet-500 bg-violet-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1">🌐 Public</span>
                    <span className="text-[9px] leading-relaxed text-slate-500">Visible to everyone instantly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPrivacyStatus('private')}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between h-24 transition-all cursor-pointer ${modalPrivacyStatus === 'private'
                        ? 'border-violet-500 bg-violet-950/20 text-white'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
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
                className="w-1/3 border-slate-800 hover:border-slate-700 text-slate-300 font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowYtModal(false);
                  handleYoutubePublish(modalPrivacyStatus, modalUploadType);
                }}
                className="w-2/3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5"
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
