'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, BACKEND_URL } from '../store/appStore';
import { useThumbnailStore } from '../store/thumbnailStore';
import { Card, Button } from '@heroui/react';
import { 
  Sparkles, Plus, Trash2, Download, Sliders, Type, 
  Image as ImageIcon, Eye, History, RefreshCw, AlertTriangle, 
  Check, Film, Skull, Cpu, Video, Laugh, Compass, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const STYLES = [
  { id: 'cinematic', label: 'Cinematic', description: 'Movie atmosphere & epic lighting', icon: Film, color: 'from-amber-500 to-red-500' },
  { id: 'MrBeast', label: 'MrBeast', description: 'Hyper-saturated clickbait colors', icon: Sparkles, color: 'from-blue-500 to-emerald-500' },
  { id: 'cyberpunk', label: 'Cyberpunk', description: 'Futuristic neon synthwave glows', icon: Cpu, color: 'from-fuchsia-500 to-cyan-500' },
  { id: 'documentary', label: 'Documentary', description: 'Gritty, realistic storytelling photography', icon: Compass, color: 'from-emerald-400 to-teal-600' },
  { id: 'horror', label: 'Horror', description: 'Dark shadows & eerie cinematic lighting', icon: Skull, color: 'from-red-600 to-purple-900' },
  { id: 'funny', label: 'Funny', description: 'Comical, colorful caricature style', icon: Laugh, color: 'from-yellow-400 to-orange-500' },
];

export default function ThumbnailStudio() {
  const { token } = useAppStore();
  const { 
    thumbnails, 
    activeThumbnail, 
    isLoadingHistory, 
    isGenerating, 
    isEditing, 
    errorMsg, 
    successMsg, 
    clearStatus,
    setActiveThumbnail, 
    fetchThumbnails, 
    generateThumbnail, 
    saveThumbnailEdits 
  } = useThumbnailStore();

  // Generator inputs
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');

  // Before/after comparison slider position
  const [comparisonVal, setComparisonVal] = useState(50);
  const [hoveringSlider, setHoveringSlider] = useState(false);

  // File format for downloads
  const [downloadFormat, setDownloadFormat] = useState('png');

  // File resolution scale for downloads (1 = 1080p base, 1.333 = 1440p 2K, 2 = 2160p 4K)
  const [downloadScale, setDownloadScale] = useState('1');

  // Baseline generation resolution
  const [generationResolution, setGenerationResolution] = useState('1080p');

  // Active editing parameters local state
  const [textOverlays, setTextOverlays] = useState([]);
  const [glowEnabled, setGlowEnabled] = useState(false);
  const [glowColor, setGlowColor] = useState('#7c3aed');
  const [glowRadius, setGlowRadius] = useState(15);
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [blurRadius, setBlurRadius] = useState(5);
  const [overlayType, setOverlayType] = useState('none');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const [saturation, setSaturation] = useState(1.0);
  const [sharpness, setSharpness] = useState(0);

  const [activeTab, setActiveTab] = useState('generate'); // generate, text, effects, history

  // Sync state when active thumbnail changes
  useEffect(() => {
    if (activeThumbnail) {
      setTextOverlays(activeThumbnail.textOverlays || []);
      setGlowEnabled(activeThumbnail.glow?.enabled || false);
      setGlowColor(activeThumbnail.glow?.color || '#7c3aed');
      setGlowRadius(activeThumbnail.glow?.radius || 15);
      setBlurEnabled(activeThumbnail.blur?.enabled || false);
      setBlurRadius(activeThumbnail.blur?.radius || 5);
      setOverlayType(activeThumbnail.overlay?.type || 'none');
      setOverlayOpacity(activeThumbnail.overlay?.opacity || 0.5);
      setBrightness(activeThumbnail.adjustments?.brightness !== undefined ? activeThumbnail.adjustments.brightness : 1.0);
      setContrast(activeThumbnail.adjustments?.contrast !== undefined ? activeThumbnail.adjustments.contrast : 1.0);
      setSaturation(activeThumbnail.adjustments?.saturation !== undefined ? activeThumbnail.adjustments.saturation : 1.0);
      setSharpness(activeThumbnail.adjustments?.sharpness !== undefined ? activeThumbnail.adjustments.sharpness : 0);
    }
  }, [activeThumbnail]);

  // Load history on mount
  useEffect(() => {
    fetchThumbnails();
  }, [fetchThumbnails]);

  // Auto clear alerts
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => clearStatus(), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg, clearStatus]);

  // Trigger base image generation
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const res = await generateThumbnail(prompt, selectedStyle, aspectRatio, generationResolution);
    if (res && res.success) {
      setActiveTab('text');
    }
  };

  // Add a new text overlay line
  const addTextOverlay = () => {
    const newLine = {
      text: 'ADD TEXT HERE',
      fontSize: 55,
      fontColor: '#ffffff',
      positionX: 50,
      positionY: 25 + (textOverlays.length * 15) % 60, // staggered Y
      glowColor: '#000000',
      glowRadius: 8
    };
    setTextOverlays([...textOverlays, newLine]);
  };

  // Update specific text overlay parameter
  const updateTextOverlay = (index, key, val) => {
    const updated = textOverlays.map((item, idx) => {
      if (idx === index) {
        return { ...item, [key]: val };
      }
      return item;
    });
    setTextOverlays(updated);
  };

  // Remove text overlay line
  const removeTextOverlay = (index) => {
    setTextOverlays(textOverlays.filter((_, idx) => idx !== index));
  };

  // Trigger composite render in sharp backend
  const handleApplyEdits = async () => {
    const edits = {
      textOverlays,
      glow: { enabled: glowEnabled, color: glowColor, radius: parseInt(glowRadius, 10) },
      blur: { enabled: blurEnabled, radius: parseInt(blurRadius, 10) },
      overlay: { type: overlayType, opacity: parseFloat(overlayOpacity) },
      adjustments: {
        brightness: parseFloat(brightness),
        contrast: parseFloat(contrast),
        saturation: parseFloat(saturation),
        sharpness: parseFloat(sharpness)
      }
    };
    await saveThumbnailEdits(edits);
  };

  // Construct urls with authorization headers for secure assets
  const getAssetUrl = (version) => {
    if (!activeThumbnail) return '';
    return `${BACKEND_URL}/api/assets/thumbnails/${activeThumbnail._id}/${version}?token=${token}&t=${new Date(activeThumbnail.updatedAt).getTime()}`;
  };

  const originalImgUrl = getAssetUrl('original');
  const editedImgUrl = getAssetUrl('edited');

  return (
    <div className="max-w-7xl mx-auto py-4 px-2 space-y-6">
      
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight mb-1 text-slate-800 flex items-center gap-2">
            <ImageIcon className="text-violet-600" />
            AI Thumbnail Studio
          </h1>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
            Generate high-resolution baseline graphics and overlay borders, glows, filters, and custom YouTube text banners.
          </p>
        </div>
        {activeThumbnail && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 md:mt-0">
            <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:items-center sm:w-auto">
              {/* Format Selector */}
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Format:</span>
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value)}
                  className="premium-select bg-transparent border-none text-slate-700 text-xs font-bold focus:outline-none cursor-pointer pr-8"
                >
                  <option value="png" className="bg-white text-slate-700">PNG</option>
                  <option value="jpg" className="bg-white text-slate-700">JPG</option>
                  <option value="jpeg" className="bg-white text-slate-700">JPEG</option>
                </select>
              </div>

              {/* Resolution/Scale Selector */}
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Res:</span>
                <select
                  value={downloadScale}
                  onChange={(e) => setDownloadScale(e.target.value)}
                  className="premium-select bg-transparent border-none text-slate-700 text-xs font-bold focus:outline-none cursor-pointer pr-8"
                >
                  <option value="1" className="bg-white text-slate-700">1080p</option>
                  <option value="1.333" className="bg-white text-slate-700">2K QHD</option>
                  <option value="2" className="bg-white text-slate-700">4K UHD</option>
                </select>
              </div>
            </div>

            <a
              href={`${BACKEND_URL}/api/assets/thumbnails/${activeThumbnail._id}/edited?token=${token}&download=true&format=${downloadFormat}&scale=${downloadScale}`}
              download={`thumbnail_${activeThumbnail._id}.${downloadFormat}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto shadow-lg shadow-emerald-500/10 font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 h-[38px] px-4 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download size={16} /> Export High-Res {downloadFormat.toUpperCase()}
            </a>
          </div>
        )}
      </div>

      {/* NOTIFICATION TOASTS */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-650 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CONTROLS & GENERATOR (5 cols) */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          
          {/* UNIFIED CONTROLS CARD */}
          <Card className="glow-card border-none bg-white p-5 space-y-4 shadow-sm">
            
            {/* Unified tab navigation */}
            <div className="flex border-b border-slate-100 text-[11px] font-bold text-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('generate')}
                className={`flex-1 pb-2 transition border-b-2 font-extrabold ${
                  activeTab === 'generate' ? 'text-violet-600 border-violet-600' : 'text-slate-400 border-transparent hover:text-slate-700'
                }`}
              >
                1. Generate
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 pb-2 transition border-b-2 font-extrabold ${
                  activeTab === 'text' ? 'text-violet-600 border-violet-600' : 'text-slate-400 border-transparent hover:text-slate-700'
                }`}
              >
                2. Texts {textOverlays.length > 0 ? `(${textOverlays.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('effects')}
                className={`flex-1 pb-2 transition border-b-2 font-extrabold ${
                  activeTab === 'effects' ? 'text-violet-600 border-violet-600' : 'text-slate-400 border-transparent hover:text-slate-700'
                }`}
              >
                3. FX & VFX
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 pb-2 transition border-b-2 font-extrabold ${
                  activeTab === 'history' ? 'text-violet-600 border-violet-600' : 'text-slate-400 border-transparent hover:text-slate-700'
                }`}
              >
                4. History
              </button>
            </div>

            {/* TAB CONTENT: 1. GENERATE BASELINE */}
            {activeTab === 'generate' && (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Describe visual elements</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. A naughty robot stealing homework papers inside a bright classroom, flying sheets, cartoon style..."
                    rows={3}
                    className="w-full text-xs bg-slate-50/50 border border-slate-200 focus:border-violet-500 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* Aspect Ratio Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                        aspectRatio === '16:9'
                          ? 'border-violet-500 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50'
                      }`}
                    >
                      🖥️ 16:9 Landscape (YouTube)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('9:16')}
                      className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                        aspectRatio === '9:16'
                          ? 'border-violet-500 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50'
                      }`}
                    >
                      📱 9:16 Vertical (Shorts)
                    </button>
                  </div>
                </div>

                {/* Base Quality Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Base Image Quality</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setGenerationResolution('720p')}
                      className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        generationResolution === '720p'
                          ? 'border-violet-500 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>720p</span>
                      <span className="text-[8px] text-slate-400 font-medium">Standard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerationResolution('1080p')}
                      className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        generationResolution === '1080p'
                          ? 'border-violet-500 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>1080p</span>
                      <span className="text-[8px] text-slate-400 font-medium">Full HD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerationResolution('2k')}
                      className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        generationResolution === '2k'
                          ? 'border-violet-500 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50'
                      }`}
                    >
                      <span>2K</span>
                      <span className="text-[8px] text-slate-400 font-medium">Ultra QHD</span>
                    </button>
                  </div>
                </div>

                {/* Style Grid */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Composition Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLES.map((style) => {
                      const IconComponent = style.icon;
                      const isSelected = selectedStyle === style.id;
                      return (
                        <button
                          type="button"
                          key={style.id}
                          onClick={() => setSelectedStyle(style.id)}
                          className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 overflow-hidden text-center group ${
                            isSelected 
                              ? 'border-violet-500 bg-violet-50 text-violet-600' 
                              : 'border-slate-200 bg-slate-50/50 text-slate-500 hover:border-slate-350 hover:text-slate-800'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${style.color} opacity-10 flex items-center justify-center mb-1 group-hover:scale-105 transition`} />
                          <IconComponent size={16} className={`absolute top-4 ${isSelected ? 'text-violet-500' : 'text-slate-400'}`} />
                          <span className="text-[10px] font-bold mt-2">{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isGenerating || !prompt.trim()}
                  isLoading={isGenerating}
                  className="w-full font-bold shadow-lg shadow-violet-500/10 bg-violet-600 hover:bg-violet-700 py-5 text-xs text-white rounded-xl cursor-pointer"
                >
                  {isGenerating ? 'Synthesizing base graphics...' : 'Generate baseline image'}
                </Button>
              </form>
            )}

            {/* TAB CONTENT: 2. TEXT OVERLAYS */}
            {activeTab === 'text' && (
              !activeThumbnail ? (
                <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <AlertTriangle className="mx-auto text-amber-500/80 animate-pulse" size={28} />
                  <div>
                    <p className="text-xs font-bold text-slate-700">No active thumbnail</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                      Please generate a baseline image in the <strong>Generate</strong> tab or load one from your <strong>History</strong> to start editing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure Overlays</span>
                    <Button 
                      size="sm"
                      variant="bordered"
                      onClick={addTextOverlay}
                      className="text-violet-600 border-violet-200 hover:bg-violet-50 text-xs py-1 rounded-lg cursor-pointer"
                    >
                      <Plus size={14} /> Add Text Line
                    </Button>
                  </div>

                  {textOverlays.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Type className="mx-auto text-slate-400 mb-2" size={24} />
                      <p className="text-xs text-slate-500 font-bold">No text layers active.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Click above to add YouTube clickbait text.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {textOverlays.map((layer, index) => (
                        <div key={index} className="bg-slate-50/80 border border-slate-200 p-3.5 rounded-xl space-y-3 relative group">
                          
                          {/* Close button */}
                          <button 
                            onClick={() => removeTextOverlay(index)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>

                          {/* Line Header */}
                          <div className="text-[10px] font-bold text-violet-600 flex items-center gap-1">
                            <Edit3 size={10} /> Text Line #{index + 1}
                          </div>

                          {/* Text input */}
                          <div className="space-y-1">
                            <input 
                              type="text"
                              value={layer.text}
                              onChange={(e) => updateTextOverlay(index, 'text', e.target.value)}
                              className="w-full text-xs font-bold uppercase bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-2.5 py-1.5 text-slate-800"
                              placeholder="OVERLAY CONTENT..."
                            />
                          </div>

                          {/* Positioning & Scale */}
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-500 font-semibold">
                                <span>Font Size ({layer.fontSize}px)</span>
                              </div>
                              <input 
                                type="range" 
                                min="20" 
                                max="110" 
                                value={layer.fontSize} 
                                onChange={(e) => updateTextOverlay(index, 'fontSize', parseInt(e.target.value))}
                                className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-500 font-semibold">
                                <span>Outline Width ({layer.glowRadius}px)</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="20" 
                                value={layer.glowRadius} 
                                onChange={(e) => updateTextOverlay(index, 'glowRadius', parseInt(e.target.value))}
                                className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Positioning X/Y coordinates */}
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-500 font-semibold">
                                <span>Horizontal ({layer.positionX}%)</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={layer.positionX} 
                                onChange={(e) => updateTextOverlay(index, 'positionX', parseInt(e.target.value))}
                                className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-slate-500 font-semibold">
                                <span>Vertical ({layer.positionY}%)</span>
                              </div>
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={layer.positionY} 
                                onChange={(e) => updateTextOverlay(index, 'positionY', parseInt(e.target.value))}
                                className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Colors */}
                          <div className="grid grid-cols-2 gap-3 text-[10px]">
                            <div className="space-y-1">
                              <span className="text-slate-500 font-semibold">Text Color</span>
                              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                                <input 
                                  type="color" 
                                  value={layer.fontColor} 
                                  onChange={(e) => updateTextOverlay(index, 'fontColor', e.target.value)}
                                  className="h-5 w-5 bg-transparent border-0 rounded cursor-pointer shrink-0" 
                                />
                                <span className="font-mono text-[9px] text-slate-600">{layer.fontColor}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-500 font-semibold">Outline Color</span>
                              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                                <input 
                                  type="color" 
                                  value={layer.glowColor} 
                                  onChange={(e) => updateTextOverlay(index, 'glowColor', e.target.value)}
                                  className="h-5 w-5 bg-transparent border-0 rounded cursor-pointer shrink-0" 
                                />
                                <span className="font-mono text-[9px] text-slate-600">{layer.glowColor}</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {/* TAB CONTENT: 3. FX & VFX */}
            {activeTab === 'effects' && (
              !activeThumbnail ? (
                <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <AlertTriangle className="mx-auto text-amber-500/80 animate-pulse" size={28} />
                  <div>
                    <p className="text-xs font-bold text-slate-700">No active thumbnail</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[260px] mx-auto leading-relaxed">
                      Please generate a baseline image in the <strong>Generate</strong> tab or load one from your <strong>History</strong> to start editing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 max-h-[380px] overflow-y-auto pr-1">
                  {/* BLUR EFFECTS */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Background Blur</span>
                      <input 
                        type="checkbox" 
                        checked={blurEnabled}
                        onChange={(e) => setBlurEnabled(e.target.checked)}
                        className="w-4 h-4 accent-violet-650 rounded border-slate-350 cursor-pointer"
                      />
                    </div>
                    {blurEnabled && (
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between text-slate-500 font-semibold">
                          <span>Blur Radius ({blurRadius}px)</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="40" 
                          value={blurRadius} 
                          onChange={(e) => setBlurRadius(e.target.value)}
                          className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* GLOW BORDERS */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Glowing Border</span>
                      <input 
                        type="checkbox" 
                        checked={glowEnabled}
                        onChange={(e) => setGlowEnabled(e.target.checked)}
                        className="w-4 h-4 accent-violet-655 rounded border-slate-350 cursor-pointer"
                      />
                    </div>
                    {glowEnabled && (
                      <div className="space-y-3 text-[10px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-slate-500 font-semibold">
                            <span>Glow Radius ({glowRadius}px)</span>
                          </div>
                          <input 
                            type="range" 
                            min="2" 
                            max="30" 
                            value={glowRadius} 
                            onChange={(e) => setGlowRadius(e.target.value)}
                            className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 font-semibold">Glow Outline Color</span>
                          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                            <input 
                              type="color" 
                              value={glowColor} 
                              onChange={(e) => setGlowColor(e.target.value)}
                              className="h-5 w-5 bg-transparent border-0 rounded cursor-pointer shrink-0" 
                            />
                            <span className="font-mono text-[9px] text-slate-650">{glowColor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* FILTERS & OVERLAYS */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs">
                    <span className="font-bold text-slate-705 block">Vignette & Color Overlays</span>
                    
                    <div className="space-y-1 text-[10px]">
                      <span className="text-slate-500 font-semibold">Overlay Filter Preset</span>
                      <select 
                        value={overlayType}
                        onChange={(e) => setOverlayType(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-750 rounded-lg p-2 focus:outline-none cursor-pointer"
                      >
                        <option value="none">No Preset Filter</option>
                        <option value="vignette">Black Focal Vignette</option>
                        <option value="warm">Warm Sunlight overlay</option>
                        <option value="cool">Cool Shadow overlay</option>
                        <option value="neon-pink">Vibrant Neon Pink</option>
                        <option value="neon-cyan">Vibrant Neon Cyan</option>
                      </select>
                    </div>

                    {overlayType !== 'none' && (
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between text-slate-500 font-semibold">
                          <span>Filter Intensity ({Math.round(overlayOpacity * 100)}%)</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.1" 
                          max="0.9" 
                          step="0.05"
                          value={overlayOpacity} 
                          onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                          className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* IMAGE TUNING / VFX */}
                  <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl space-y-4 text-xs">
                    <span className="font-bold text-slate-700 block">🎨 Image Tuning (VFX)</span>
                    
                    {/* Brightness Slider */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between text-slate-500 font-semibold">
                        <span>Brightness ({Math.round(brightness * 100)}%)</span>
                        <button type="button" onClick={() => setBrightness(1.0)} className="text-violet-600 hover:text-violet-800 font-bold">Reset</button>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.05"
                        value={brightness} 
                        onChange={(e) => setBrightness(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                      />
                    </div>

                    {/* Contrast Slider */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between text-slate-500 font-semibold">
                        <span>Contrast ({Math.round(contrast * 100)}%)</span>
                        <button type="button" onClick={() => setContrast(1.0)} className="text-violet-600 hover:text-violet-800 font-bold">Reset</button>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="2.0" 
                        step="0.05"
                        value={contrast} 
                        onChange={(e) => setContrast(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                      />
                    </div>

                    {/* Saturation Slider */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between text-slate-500 font-semibold">
                        <span>Saturation ({Math.round(saturation * 100)}%)</span>
                        <button type="button" onClick={() => setSaturation(1.0)} className="text-violet-600 hover:text-violet-800 font-bold">Reset</button>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3.0" 
                        step="0.05"
                        value={saturation} 
                        onChange={(e) => setSaturation(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                      />
                    </div>

                    {/* Sharpness Slider */}
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between text-slate-500 font-semibold">
                        <span>Sharpness ({sharpness})</span>
                        <button type="button" onClick={() => setSharpness(0)} className="text-violet-600 hover:text-violet-800 font-bold">Reset</button>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="8" 
                        step="0.5"
                        value={sharpness} 
                        onChange={(e) => setSharpness(parseFloat(e.target.value))}
                        className="w-full accent-violet-600 h-1 rounded bg-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )
            )}

            {/* TAB CONTENT: 4. HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated History</span>
                
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : thumbnails.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-bold">History empty.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {thumbnails.map((item) => {
                      const url = `${BACKEND_URL}/api/assets/thumbnails/${item._id}/edited?token=${token}&t=${new Date(item.updatedAt).getTime()}`;
                      const isCurrentActive = activeThumbnail?._id === item._id;
                      return (
                        <div 
                          key={item._id}
                          onClick={() => setActiveThumbnail(item)}
                          className={`p-1.5 rounded-xl border cursor-pointer transition bg-slate-50/50 ${
                            isCurrentActive 
                              ? 'border-violet-500 shadow-sm shadow-violet-500/10 bg-violet-50/30' 
                              : 'border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          <div 
                            className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200/50 relative"
                            style={{ aspectRatio: item.aspectRatio === '16:9' ? '16/9' : '9/16' }}
                          >
                            <img src={url} alt={item.prompt} className="w-full h-full object-cover" />
                            <div className="absolute top-1 left-1 bg-white/90 px-1 py-0.5 rounded text-[8px] font-bold capitalize text-violet-600 border border-violet-100/50">{item.style}</div>
                            <div className="absolute top-1 right-1 bg-white/90 px-1 py-0.5 rounded text-[7px] font-mono text-slate-550 border border-slate-100">{item.aspectRatio || '9:16'}</div>
                          </div>
                          <p className="text-[9px] text-slate-500 font-bold mt-1 truncate px-1">"{item.prompt}"</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action Toolbar */}
            {activeThumbnail && (activeTab === 'text' || activeTab === 'effects') && (
              <div className="pt-2 flex gap-3 border-t border-slate-100">
                <Button 
                  className="flex-1 font-bold text-white bg-violet-600 hover:bg-violet-700 py-5 text-xs shadow-lg shadow-violet-500/10 rounded-xl cursor-pointer"
                  onClick={handleApplyEdits}
                  isLoading={isEditing}
                  disabled={isEditing}
                  endContent={<RefreshCw size={14} className={isEditing ? 'animate-spin' : ''} />}
                >
                  {isEditing ? 'Compiling Layout...' : 'Save & Render Layout'}
                </Button>
              </div>
            )}
          </Card>

        </div>

        {/* RIGHT COLUMN: PREVIEW SCREEN (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start gap-4 order-1 lg:order-2">
          
          {/* PLACEHOLDER WHEN NO ACTIVE THUMBNAIL */}
          {!activeThumbnail && !isGenerating && (
            <div 
              className="w-full rounded-3xl border border-slate-200 bg-white p-12 text-center flex flex-col items-center justify-center gap-4 shadow-sm"
              style={{ 
                aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16', 
                maxWidth: aspectRatio === '16:9' ? '560px' : '340px' 
              }}
            >
              <div className="h-16 w-16 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-500 border border-violet-100">
                <ImageIcon size={28} />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-700">Workspace Empty</h4>
                <p className="text-xs text-slate-400 max-w-[240px] mx-auto mt-1 leading-relaxed">
                  Type a prompt on the left, pick a style, and generate a baseline thumbnail to start editing.
                </p>
              </div>
            </div>
          )}

          {/* GENERATION SKELETON LOADER */}
          {isGenerating && (
            <div 
              className="w-full rounded-3xl border border-violet-100 bg-white p-6 text-center flex flex-col items-center justify-center gap-6 relative overflow-hidden shadow-sm"
              style={{ 
                aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16', 
                maxWidth: aspectRatio === '16:9' ? '560px' : '340px' 
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-50 to-indigo-50/50 animate-pulse" />
              
              <div className="h-16 w-16 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center border border-violet-100 relative animate-bounce shadow-sm">
                <Sparkles size={28} className="animate-spin duration-3000 text-violet-550" />
              </div>

              <div className="space-y-2 z-10">
                <h4 className="text-base font-bold text-slate-700">Synthesizing Base Graphic</h4>
                <p className="text-xs text-slate-400 max-w-[220px]">AI image compilation services sketching baseline artwork...</p>
              </div>

              <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200 relative z-10">
                <div className="bg-violet-600 h-full rounded-full animate-infinite-loading w-2/3" />
              </div>
            </div>
          )}

          {/* ACTIVE WORKSPACE PREVIEW BOARD */}
          {activeThumbnail && !isGenerating && (
            <div className="space-y-4 w-full flex flex-col items-center">

              {/* Slider instruction overlay */}
              <div
                className="flex justify-between items-center w-full text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1"
                style={{ maxWidth: activeThumbnail.aspectRatio === '16:9' ? '560px' : '340px' }}
              >
                <span>← Generated (AI)</span>
                <span className="flex items-center gap-1 text-violet-600">
                  <Eye size={12} /> Interactive Preview Canvas
                </span>
                <span>Edited (Sharp) →</span>
              </div>

              {/* DYNAMIC COMPARISON PREVIEW */}
              <div
                className="relative select-none border border-slate-200 shadow-xl shadow-slate-250/20 w-full group transition-all duration-350 bg-slate-100"
                style={{
                  aspectRatio: activeThumbnail.aspectRatio === '16:9' ? '16/9' : '9/16',
                  maxWidth: activeThumbnail.aspectRatio === '16:9' ? '560px' : '340px',
                  borderRadius: '24px',
                  overflow: 'hidden'
                }}
                onMouseEnter={() => setHoveringSlider(true)}
                onMouseLeave={() => setHoveringSlider(false)}
              >
                {/* 1. BOTTOM LAYER: ORIGINAL BASEIMAGE */}
                <img
                  src={originalImgUrl}
                  alt="Original baseline"
                  className="w-full h-full object-cover pointer-events-none"
                />

                {/* 2. TOP LAYER: EDITED COMPOSITE LAYER */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `inset(0 0 0 ${comparisonVal}%)` }}
                >
                  <img
                    src={editedImgUrl}
                    alt="Edited sharp output"
                    className="w-full h-full object-cover max-w-none pointer-events-none absolute top-0 left-0"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                {/* 3. VISUAL SLIDER BAR INDICATOR */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.5)] cursor-ew-resize pointer-events-none flex items-center justify-center transition-opacity"
                  style={{ left: `${comparisonVal}%`, opacity: hoveringSlider ? 1 : 0.6 }}
                >
                  <div className="h-7 w-7 bg-white border-2 border-violet-500 rounded-full flex items-center justify-center text-[9px] text-violet-600 shadow-md shrink-0 font-bold">
                    ↔
                  </div>
                </div>

                {/* 4. ACTUAL TRANSPARENT HTML INPUT FOR DRAG CONTROL */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={comparisonVal}
                  onChange={(e) => setComparisonVal(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
                />
              </div>

              {/* Slider value label */}
              <div
                className="w-full bg-white border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between text-xs text-slate-500 shadow-sm"
                style={{ maxWidth: activeThumbnail.aspectRatio === '16:9' ? '560px' : '340px' }}
              >
                <span className="font-bold truncate max-w-[200px]" title={activeThumbnail.prompt}>Prompt: "{activeThumbnail.prompt}"</span>
                <span className="font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-100/50 shrink-0 text-[10px]">Style: {activeThumbnail.style}</span>
              </div>

              {/* Dynamic format downloader toolbar */}
              <div
                className="w-full bg-white border border-slate-200 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
                style={{ maxWidth: activeThumbnail.aspectRatio === '16:9' ? '560px' : '340px' }}
              >
                <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:items-center sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Format</span>
                    <select
                      value={downloadFormat}
                      onChange={(e) => setDownloadFormat(e.target.value)}
                      className="premium-select bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer w-full pr-8"
                    >
                      <option value="png" className="bg-white text-slate-700">PNG (Lossless)</option>
                      <option value="jpg" className="bg-white text-slate-700">JPG (Compressed)</option>
                      <option value="jpeg" className="bg-white text-slate-700">JPEG (High Quality)</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution</span>
                    <select
                      value={downloadScale}
                      onChange={(e) => setDownloadScale(e.target.value)}
                      className="premium-select bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none cursor-pointer w-full pr-8"
                    >
                      <option value="1" className="bg-white text-slate-700">1080p FHD</option>
                      <option value="1.333" className="bg-white text-slate-700">2K QHD (1440p)</option>
                      <option value="2" className="bg-white text-slate-700">4K UHD (2160p)</option>
                    </select>
                  </div>
                </div>

                <a
                  href={`${BACKEND_URL}/api/assets/thumbnails/${activeThumbnail._id}/edited?token=${token}&download=true&format=${downloadFormat}&scale=${downloadScale}`}
                  download={`thumbnail_${activeThumbnail._id}.${downloadFormat}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 text-xs h-10 px-4 shadow-lg shadow-emerald-500/10 rounded-xl transition-all cursor-pointer text-center whitespace-nowrap shrink-0"
                >
                  <Download size={14} /> Download High-Res
                </a>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
