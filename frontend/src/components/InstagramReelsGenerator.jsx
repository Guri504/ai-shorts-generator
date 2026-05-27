'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Card, Button, Select, ListBox } from '@heroui/react';
import { 
  Sparkles, 
  Wand2, 
  AlertTriangle, 
  Film, 
  Volume2, 
  Music, 
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  Bookmark,
  Instagram
} from 'lucide-react';

const InstagramIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function InstagramReelsGenerator() {
  const { createProject, isGeneratingScript, settings, voices, fetchVoices } = useAppStore();
  
  const [topic, setTopic] = useState('');
  const [visualVibe, setVisualVibe] = useState('aesthetic');
  const [filterEffect, setFilterEffect] = useState('warm_grain');
  const [captionTone, setCaptionTone] = useState('inspiring');
  const [language, setLanguage] = useState('hinglish');
  const [voiceName, setVoiceName] = useState('');
  const [musicGenre, setMusicGenre] = useState('calm');
  const [sceneCount, setSceneCount] = useState('4');
  
  // CTA Save Outro Settings
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaDuration, setCtaDuration] = useState('5');
  const [showCtaSettings, setShowCtaSettings] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Edge TTS voices on mount
  useEffect(() => {
    if (voices.length === 0) {
      fetchVoices();
    }
  }, [voices, fetchVoices]);

  // Set default voice based on language
  useEffect(() => {
    if (voices.length > 0) {
      if (language === 'english') {
        const def = voices.find(v => v.name === 'en-US-AriaNeural') || voices.find(v => v.language.startsWith('English'));
        if (def) setVoiceName(def.name);
      } else {
        const def = voices.find(v => v.name === 'hi-IN-SwaraNeural') || voices.find(v => v.language === 'Hindi');
        if (def) setVoiceName(def.name);
      }
    }
  }, [language, voices]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setErrorMsg('');
    
    const fallbackGender = voiceName.toLowerCase().includes('male') && !voiceName.toLowerCase().includes('female') ? 'male' : 'female';
    
    const res = await createProject({
      topicOrTitle: `[Instagram Reels - ${visualVibe.toUpperCase()}] ${topic}`,
      language,
      voiceGender: fallbackGender,
      voiceName,
      musicGenre,
      sceneCount: parseInt(sceneCount, 10),
      ctaEnabled,
      ctaLanguage: language,
      ctaStyle: 'motivation',
      ctaDuration: parseInt(ctaDuration, 10),
      // Custom metadata for backend prompt customization in subsequent phases
      platform: 'instagram',
      visualVibe,
      filterEffect,
      captionTone
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to generate Instagram Reel. Check your Gemini API key.');
    }
  };

  // Filter voices based on language selection
  const filteredVoices = voices.filter(v => {
    if (language === 'english') {
      return v.language.startsWith('English') && !v.language.includes('IN'); 
    } else {
      return v.language === 'Hindi' || v.language === 'English (IN)'; 
    }
  });

  const selectedVoiceObj = voices.find(v => v.name === voiceName);
  const voiceTriggerText = selectedVoiceObj 
    ? `${selectedVoiceObj.displayName} (${selectedVoiceObj.gender})` 
    : 'Select voice...';

  // Visual Vibe Nicenames
  const vibes = {
    aesthetic: 'Aesthetic & Minimalist ☕',
    vibrant: 'Vibrant & Colorful 🌈',
    dark: 'Dark & Moody 🌑',
    cinematic: 'Cinematic Narrative 🎬'
  };

  // Filter Nicenames
  const filters = {
    warm_grain: 'Warm Film & Vintage Grain',
    cyberpunk: 'Cyberpunk Neon Glow',
    contrast: 'Moody High Contrast',
    none: 'Clear Standard Vibe'
  };

  // Caption Tone Nicenames
  const tones = {
    inspiring: 'Inspirational & Deep',
    funny: 'Humorous & Relatable',
    educational: 'Step-by-Step Tutorial',
    quote: 'Short Quote Style'
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Warning if Gemini Key is missing */}
      {!settings.hasGeminiKey && (
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <h4 className="font-extrabold mb-0.5">Gemini API Key Missing</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Instagram Reels generation requires a Google Gemini API key. Please check the Status panel in your Social Media hub.
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
            <div className="p-2.5 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white rounded-2xl">
              <InstagramIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 leading-none">Instagram Reels Generator</h1>
              <p className="text-slate-400 text-xs mt-1.5">
                Generate visually stunning aesthetic Reels scripts and custom visual backdrops for higher engagement.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Concept Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reels Concept / Topic</label>
              <input
                type="text"
                placeholder="e.g. A peaceful morning routine checklist, or 3 secrets to consistent coding"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full bg-slate-900/40 border border-slate-800 focus:border-pink-500/50 focus:bg-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-xs focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Specialized Options Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Visual Vibe */}
              <Select value={visualVibe} onChange={setVisualVibe} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Visual Vibe Vibe</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <Select.Value>{vibes[visualVibe]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="aesthetic" textValue="Aesthetic" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Aesthetic & Minimalist ☕
                    </ListBox.Item>
                    <ListBox.Item id="vibrant" textValue="Vibrant" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Vibrant & Colorful 🌈
                    </ListBox.Item>
                    <ListBox.Item id="dark" textValue="Dark Moody" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Dark & Moody 🌑
                    </ListBox.Item>
                    <ListBox.Item id="cinematic" textValue="Cinematic" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Cinematic Narrative 🎬
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Filter Effect */}
              <Select value={filterEffect} onChange={setFilterEffect} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Aesthetic Filter</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <Select.Value>{filters[filterEffect]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="warm_grain" textValue="Warm Grain" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Warm Film & Vintage Grain
                    </ListBox.Item>
                    <ListBox.Item id="cyberpunk" textValue="Cyberpunk" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Cyberpunk Neon Glow
                    </ListBox.Item>
                    <ListBox.Item id="contrast" textValue="Contrast" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Moody High Contrast
                    </ListBox.Item>
                    <ListBox.Item id="none" textValue="None" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Clear Standard Vibe
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Options Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Language */}
              <Select value={language} onChange={setLanguage} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Language</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="hinglish" textValue="Hinglish" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Hinglish (Recommended)
                    </ListBox.Item>
                    <ListBox.Item id="hindi" textValue="Hindi" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Hindi (🇮🇳)
                    </ListBox.Item>
                    <ListBox.Item id="english" textValue="English" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      English (🇺🇸)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Caption Hook Tone */}
              <Select value={captionTone} onChange={setCaptionTone} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Caption Tone</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <Select.Value>{tones[captionTone]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="inspiring" textValue="Inspiring" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Inspirational & Deep
                    </ListBox.Item>
                    <ListBox.Item id="funny" textValue="Humorous" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Humorous & Relatable
                    </ListBox.Item>
                    <ListBox.Item id="educational" textValue="Educational" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Step-by-Step Tutorial
                    </ListBox.Item>
                    <ListBox.Item id="quote" textValue="Quote Style" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Short Quote Style
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Duration / Scene count */}
              <Select value={sceneCount} onChange={setSceneCount} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Reel Scenes</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="3" textValue="3 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      3 Scenes (~15s)
                    </ListBox.Item>
                    <ListBox.Item id="4" textValue="4 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      4 Scenes (~20s)
                    </ListBox.Item>
                    <ListBox.Item id="5" textValue="5 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      5 Scenes (~30s)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Audio Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voice Selector */}
              <Select value={voiceName} onChange={setVoiceName} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                  <Volume2 size={12} /> Narration Voice
                </span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <span className="block truncate">{voiceTriggerText}</span>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1 max-h-[200px] overflow-y-auto">
                    {filteredVoices.map(v => (
                      <ListBox.Item key={v.name} id={v.name} textValue={`${v.displayName} (${v.gender})`} className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                        <div className="flex justify-between items-center w-full">
                          <span>{v.displayName}</span>
                          <span className="text-[9px] bg-slate-850 border border-slate-750 px-1.5 py-0.5 rounded-lg text-slate-400 capitalize font-bold">{v.gender}</span>
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Background Music Vibe */}
              <Select value={musicGenre} onChange={setMusicGenre} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                  <Music size={12} /> Music Vibe
                </span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-pink-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="calm" textValue="Calm" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Aesthetic / Calm (Lofi)
                    </ListBox.Item>
                    <ListBox.Item id="hype" textValue="Hype" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Hype / Energetic (Trending Beat)
                    </ListBox.Item>
                    <ListBox.Item id="emotional" textValue="Emotional" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Emotional / Slow Piano
                    </ListBox.Item>
                    <ListBox.Item id="cinematic" textValue="Cinematic" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Cinematic / Atmospheric
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Outro Ending Scene Card */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/20">
              <button
                type="button"
                onClick={() => setShowCtaSettings(!showCtaSettings)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-900/40 hover:bg-slate-900/80 transition-colors text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-pink-500 font-bold bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded uppercase tracking-wider">Engagement</span>
                  <span className="text-xs font-bold text-slate-200">Instagram Reel Save Call-To-Action</span>
                </div>
                <span className="text-slate-500 text-xs font-bold">{showCtaSettings ? '▼ Collapse' : '▶ Expand'}</span>
              </button>
              
              {showCtaSettings && (
                <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-350">Save Reel Call to Action</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">Appends an animated "Save this Reel for later!" ending outro scene</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ctaEnabled} 
                        onChange={(e) => setCtaEnabled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-650 after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-650 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {ctaEnabled && (
                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <Select value={ctaDuration} onChange={setCtaDuration} className="w-full">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Outro Duration</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-xl px-3 flex justify-between items-center bg-slate-900 text-slate-200 font-bold focus:outline-none cursor-pointer">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                          <ListBox className="p-1">
                            <ListBox.Item id="4" textValue="4s" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs">4 Seconds</ListBox.Item>
                            <ListBox.Item id="5" textValue="5s" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs">5 Seconds</ListBox.Item>
                            <ListBox.Item id="6" textValue="6s" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs">6 Seconds</ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-bold shadow-lg shadow-pink-500/10 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 py-6 text-white text-xs rounded-xl cursor-pointer hover:opacity-90 transition-all border-none"
              isLoading={isGeneratingScript}
              disabled={!settings.hasGeminiKey || isGeneratingScript}
              endContent={!isGeneratingScript && <Wand2 size={16} />}
            >
              {isGeneratingScript ? 'Polishing Reel Aesthetics...' : 'Generate Instagram Reel'}
            </Button>
          </form>
        </div>

        {/* Right Side: Reels Mobile Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center pt-8 lg:pt-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Instagram Feed Simulator</span>
          
          <div className="w-[310px] h-[550px] bg-black border-[6px] border-slate-800 rounded-[36px] overflow-hidden relative shadow-2xl flex flex-col justify-between p-4 text-white">
            {/* Notch */}
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 h-4 w-32 bg-slate-800 rounded-b-2xl z-50"></div>
            
            {/* Simulator Background visual placeholder */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-purple-950/20 to-zinc-950 flex flex-col items-center justify-center opacity-85 z-0">
              <div className="h-20 w-20 rounded-full border border-pink-500/25 flex items-center justify-center mb-2 animate-spin duration-3000">
                <Sparkles size={24} className="text-pink-500/30" />
              </div>
              <span className="text-[10px] text-slate-650 font-bold uppercase tracking-wider">Aesthetic Visual Vibe</span>
            </div>

            {/* Top Navigation */}
            <div className="flex justify-between items-center z-10 text-xs font-black">
              <span>Reels</span>
              <span className="text-[10px] text-slate-350 bg-black/40 border border-slate-800 px-2 py-0.5 rounded-lg flex items-center gap-1.5 uppercase font-extrabold">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                {visualVibe.toUpperCase()}
              </span>
            </div>

            {/* Central Captions Preview */}
            <div className="z-10 text-center w-full px-6 flex flex-col items-center justify-center self-center my-auto min-h-[120px]">
              <span className="text-[9px] font-bold uppercase bg-pink-650/10 border border-pink-500/25 text-pink-400 px-2 py-0.5 rounded-full mb-3 tracking-wider">
                {tones[captionTone]?.split(' ')[0]} Tone
              </span>
              <p className="text-base font-extrabold text-center tracking-tight leading-snug drop-shadow-md">
                {topic ? topic : 'Visualize your aesthetic message here'}
              </p>
              <p className="text-xs font-bold text-center mt-3 text-slate-300 leading-normal">
                Filter: <span className="text-pink-400 font-extrabold">{filters[filterEffect]}</span>
              </p>
            </div>

            {/* Bottom Overlay Info */}
            <div className="flex justify-between items-end z-10 w-full mt-auto">
              <div className="space-y-2 text-left max-w-[210px]">
                <div className="flex items-center gap-2">
                  <div className="h-6.5 w-6.5 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-[9px] border border-white/20">
                    IG
                  </div>
                  <span className="text-xs font-extrabold truncate">aesthetic_creator</span>
                  <button className="text-[9px] font-bold border border-slate-650 px-2 py-0.5 rounded-md text-white hover:bg-white/10 shrink-0">
                    Follow
                  </button>
                </div>
                <p className="text-[10px] text-slate-200 line-clamp-2 leading-relaxed">
                  {topic ? topic : 'Create a reels story...'} #{visualVibe} #reels #aesthetic #instagram #moody
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                  <span>🎵</span>
                  <span className="truncate max-w-[120px] font-bold">Original audio • aesthetic_creator</span>
                </div>
              </div>

              {/* Reels Right Icons Bar */}
              <div className="flex flex-col items-center gap-4 pl-2 shrink-0">
                <button className="flex flex-col items-center gap-0.5 group">
                  <Heart size={18} className="text-slate-100 group-hover:scale-115 transition" />
                  <span className="text-[8px] font-bold text-slate-350">14.8K</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 group">
                  <MessageCircle size={18} className="text-slate-100 group-hover:scale-115 transition" />
                  <span className="text-[8px] font-bold text-slate-350">402</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 group">
                  <Send size={18} className="text-slate-100 group-hover:scale-115 transition" />
                  <span className="text-[8px] font-bold text-slate-350">Share</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 group">
                  <Bookmark size={18} className="text-slate-100 group-hover:scale-115 transition" />
                  <span className="text-[8px] font-bold text-slate-350">Save</span>
                </button>
                <button className="group">
                  <MoreHorizontal size={18} className="text-slate-150 group-hover:scale-115 transition" />
                </button>
                <div className="h-6 w-6 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center animate-spin">
                  💿
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
