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
  Clock, 
  Target, 
  HelpCircle,
  ThumbsUp,
  MessageSquare,
  Share2,
  MoreVertical,
  Repeat
} from 'lucide-react';

const YoutubeIcon = (props) => (
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
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" fill="currentColor" />
  </svg>
);

export default function YoutubeShortsGenerator() {
  const { createProject, isGeneratingScript, settings, voices, fetchVoices } = useAppStore();
  
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('facts');
  const [hookStyle, setHookStyle] = useState('question');
  const [tone, setTone] = useState('viral');
  const [language, setLanguage] = useState('hinglish');
  const [voiceName, setVoiceName] = useState('');
  const [musicGenre, setMusicGenre] = useState('cinematic');
  const [sceneCount, setSceneCount] = useState('5');
  const [subtitleColor, setSubtitleColor] = useState('yellow');
  
  // CTA Subscriptions Settings
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
        const def = voices.find(v => v.name === 'en-US-GuyNeural') || voices.find(v => v.language.startsWith('English'));
        if (def) setVoiceName(def.name);
      } else {
        const def = voices.find(v => v.name === 'hi-IN-MadhurNeural') || voices.find(v => v.language === 'Hindi');
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
      topicOrTitle: `[YouTube Shorts - ${niche.toUpperCase()}] ${topic}`,
      language,
      voiceGender: fallbackGender,
      voiceName,
      musicGenre,
      sceneCount: parseInt(sceneCount, 10),
      ctaEnabled,
      ctaLanguage: language,
      ctaStyle: 'cinematic',
      ctaDuration: parseInt(ctaDuration, 10),
      // Custom metadata for backend prompt customization in subsequent phases
      platform: 'youtube',
      niche,
      hookStyle,
      tone,
      subtitleColor
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to generate YouTube Short. Check your Gemini API key.');
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

  // Niche Nicenames
  const niches = {
    facts: 'Interesting Facts & Tech',
    stories: 'Mystery Stories & Tales',
    finance: 'Finance & Money Hacks',
    motivation: 'Motivation & Success',
    history: 'Ancient History Secrets',
    educational: 'Educational & Myths'
  };

  // Hook Nicenames
  const hooks = {
    question: 'Did you know? (Question)',
    shocking: 'This will blow your mind (Shocking)',
    direct: 'The truth about... (Direct Statement)',
    story: 'Let me tell you a story (Story Hook)'
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
              YouTube Shorts generation requires a Google Gemini API key. Please check the Status panel in your Social Media hub.
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl">
              <YoutubeIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 leading-none">YouTube Shorts Generator</h1>
              <p className="text-slate-400 text-xs mt-1.5">
                Generate high-retention vertical short scripts and visuals optimized for the YouTube algorithm.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shorts Topic / Hook Theme</label>
              <input
                type="text"
                placeholder="e.g. 3 bizarre history facts that sound fake, or Secrets of the deep ocean"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full bg-slate-900/40 border border-slate-800 focus:border-red-500/50 focus:bg-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-xs focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Specialized Options Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Niche Selector */}
              <Select value={niche} onChange={setNiche} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Short Niche</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
                  <Select.Value>{niches[niche]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="facts" textValue="Facts" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Interesting Facts & Tech
                    </ListBox.Item>
                    <ListBox.Item id="stories" textValue="Mystery Stories" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Mystery Stories & Tales
                    </ListBox.Item>
                    <ListBox.Item id="finance" textValue="Finance Hacks" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Finance & Money Hacks
                    </ListBox.Item>
                    <ListBox.Item id="motivation" textValue="Motivation" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Motivation & Success
                    </ListBox.Item>
                    <ListBox.Item id="history" textValue="History Secrets" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Ancient History Secrets
                    </ListBox.Item>
                    <ListBox.Item id="educational" textValue="Educational" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Educational & Myths
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Hook Style Selector */}
              <Select value={hookStyle} onChange={setHookStyle} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Retention Hook Style</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
                  <Select.Value>{hooks[hookStyle]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="question" textValue="Question" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Did you know? (Question Hook)
                    </ListBox.Item>
                    <ListBox.Item id="shocking" textValue="Shocking" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      This will blow your mind (Shocking Hook)
                    </ListBox.Item>
                    <ListBox.Item id="direct" textValue="Direct" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      The truth about... (Direct Statement)
                    </ListBox.Item>
                    <ListBox.Item id="story" textValue="Story Hook" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Let me tell you a story (Narrative Hook)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Options Row 2: Basic parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Language */}
              <Select value={language} onChange={setLanguage} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Language</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
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

              {/* Tone */}
              <Select value={tone} onChange={setTone} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Short Vibe Tone</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="viral" textValue="Viral/Hype" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Viral / High Hype
                    </ListBox.Item>
                    <ListBox.Item id="educational" textValue="Educational" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Calm / Informative
                    </ListBox.Item>
                    <ListBox.Item id="suspenseful" textValue="Suspenseful" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Suspenseful / Dark
                    </ListBox.Item>
                    <ListBox.Item id="energetic" textValue="Energetic" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Fast-Paced / Energetic
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Duration / Scene count */}
              <Select value={sceneCount} onChange={setSceneCount} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Scenes (Duration)</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="3" textValue="3 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      3 Scenes (~15s)
                    </ListBox.Item>
                    <ListBox.Item id="5" textValue="5 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      5 Scenes (~30s)
                    </ListBox.Item>
                    <ListBox.Item id="8" textValue="8 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      8 Scenes (~50s)
                    </ListBox.Item>
                    <ListBox.Item id="10" textValue="10 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      10 Scenes (~60s)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Audio configuration panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voice Selector */}
              <Select value={voiceName} onChange={setVoiceName} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                  <Volume2 size={12} /> Narration Voice
                </span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
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
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-red-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="cinematic" textValue="Cinematic" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Cinematic (Epic / Suspense)
                    </ListBox.Item>
                    <ListBox.Item id="hype" textValue="Hype" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Hype (Motivational / Energetic)
                    </ListBox.Item>
                    <ListBox.Item id="tech" textValue="Tech" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Tech (Minimal Synth)
                    </ListBox.Item>
                    <ListBox.Item id="calm" textValue="Calm" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Calm (Chill / Lo-Fi)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* YouTube Outro / Subtitle Styling Card */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/20">
              <button
                type="button"
                onClick={() => setShowCtaSettings(!showCtaSettings)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-900/40 hover:bg-slate-900/80 transition-colors text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider">Outro</span>
                  <span className="text-xs font-bold text-slate-200">YouTube CTA & Caption Accents</span>
                </div>
                <span className="text-slate-500 text-xs font-bold">{showCtaSettings ? '▼ Collapse' : '▶ Expand'}</span>
              </button>
              
              {showCtaSettings && (
                <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/60">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-350">YouTube Outro Scene</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">Appends "Like & Subscribe" call to action scene at the end</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ctaEnabled} 
                        onChange={(e) => setCtaEnabled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-650 after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-650 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {ctaEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

                      <Select value={subtitleColor} onChange={setSubtitleColor} className="w-full">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Caption Accent Color</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-xl px-3 flex justify-between items-center bg-slate-900 text-slate-200 font-bold focus:outline-none cursor-pointer">
                          <span className="capitalize">{subtitleColor}</span>
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                          <ListBox className="p-1">
                            <ListBox.Item id="yellow" textValue="yellow" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs font-bold text-yellow-400">Yellow</ListBox.Item>
                            <ListBox.Item id="red" textValue="red" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs font-bold text-red-500">Red</ListBox.Item>
                            <ListBox.Item id="cyan" textValue="cyan" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs font-bold text-cyan-400">Cyan</ListBox.Item>
                            <ListBox.Item id="white" textValue="white" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs font-bold text-white">White</ListBox.Item>
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
              color="danger"
              size="lg"
              className="w-full font-bold shadow-lg shadow-red-500/10 bg-red-600 hover:bg-red-700 py-6 text-white text-xs rounded-xl cursor-pointer transition-all"
              isLoading={isGeneratingScript}
              disabled={!settings.hasGeminiKey || isGeneratingScript}
              endContent={!isGeneratingScript && <Wand2 size={16} />}
            >
              {isGeneratingScript ? 'Synthesizing YouTube Hook...' : 'Generate YouTube Short'}
            </Button>
          </form>
        </div>

        {/* Right Side: Simulator Device Frame */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center pt-8 lg:pt-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Live Feed Simulator</span>
          
          <div className="w-[310px] h-[550px] bg-black border-[6px] border-slate-800 rounded-[36px] overflow-hidden relative shadow-2xl flex flex-col justify-between p-4 text-white">
            {/* Notch */}
            <div className="absolute top-0.5 left-1/2 -translate-x-1/2 h-4 w-32 bg-slate-800 rounded-b-2xl z-50"></div>
            
            {/* Simulator Background visual placeholder */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-zinc-950 to-slate-950 flex flex-col items-center justify-center opacity-85 z-0">
              <Film size={40} className="text-red-500/25 animate-pulse mb-2" />
              <span className="text-[10px] text-slate-650 font-bold uppercase tracking-wider">Dynamic Visuals Feed</span>
            </div>

            {/* Top Bar */}
            <div className="flex justify-between items-center z-10 text-[10px] font-bold text-slate-400">
              <span>Shorts</span>
              <div className="flex items-center gap-1">
                <span>1080p</span>
                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              </div>
            </div>

            {/* Subtitles Preview Overlay */}
            <div className="z-10 text-center w-full px-6 flex flex-col items-center justify-center self-center my-auto min-h-[120px]">
              <span className="text-[10px] uppercase font-black bg-red-650 text-white px-2 py-0.5 rounded-md mb-2 tracking-widest shadow-md">
                {niche.toUpperCase()}
              </span>
              <p className="text-base font-black text-center tracking-tight leading-snug drop-shadow-lg uppercase">
                {topic ? topic : 'Create a viral hook to catch viewers in 2 seconds'}
              </p>
              <p className="text-sm font-black text-center mt-2 drop-shadow-md">
                <span className={`px-1.5 py-0.5 rounded ${
                  subtitleColor === 'yellow' ? 'text-yellow-400 bg-black/60' :
                  subtitleColor === 'red' ? 'text-red-500 bg-black/60' :
                  subtitleColor === 'cyan' ? 'text-cyan-400 bg-black/60' : 'text-white bg-black/60'
                }`}>
                  [Hook Highlight]
                </span>
              </p>
            </div>

            {/* Bottom & Side Info Overlay */}
            <div className="flex justify-between items-end z-10 w-full mt-auto">
              {/* Creator Info */}
              <div className="space-y-2 max-w-[200px] text-left">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-[10px]">
                    YT
                  </div>
                  <span className="text-xs font-bold truncate">@shorts_creator</span>
                  <span className="text-[9px] font-extrabold bg-red-650 px-1.5 py-0.5 rounded uppercase tracking-tight text-white shrink-0">Sub</span>
                </div>
                <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">
                  #{niche} {topic ? `#${topic.split(' ')[0]}` : '#generator'} #shorts #viral #ai
                </p>
                <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 rounded-lg p-1 w-fit text-[9px] text-slate-400">
                  <Repeat size={10} />
                  <span className="truncate max-w-[100px]">Original Audio • AI</span>
                </div>
              </div>

              {/* Interaction Column */}
              <div className="flex flex-col items-center gap-3.5 pl-2">
                <button className="flex flex-col items-center gap-0.5 group">
                  <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-full group-hover:scale-115 transition">
                    <ThumbsUp size={16} />
                  </div>
                  <span className="text-[8px] font-bold">124K</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 group">
                  <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-full group-hover:scale-115 transition">
                    <MessageSquare size={16} />
                  </div>
                  <span className="text-[8px] font-bold">842</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 group">
                  <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-full group-hover:scale-115 transition">
                    <Share2 size={16} />
                  </div>
                  <span className="text-[8px] font-bold">Share</span>
                </button>
                <button className="flex flex-col items-center gap-0.5 group">
                  <div className="p-2 bg-slate-900/80 border border-slate-800 rounded-full group-hover:scale-115 transition">
                    <Repeat size={16} />
                  </div>
                  <span className="text-[8px] font-bold">Remix</span>
                </button>
                <div className="h-6 w-6 rounded-lg bg-red-950 border border-red-500/30 flex items-center justify-center animate-spin">
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
