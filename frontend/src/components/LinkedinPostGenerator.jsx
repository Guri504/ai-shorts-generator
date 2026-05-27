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
  Globe,
  ThumbsUp,
  MessageSquare,
  Repeat,
  Send,
  MoreHorizontal
} from 'lucide-react';

const LinkedInIcon = (props) => (
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
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function LinkedinPostGenerator() {
  const { createProject, isGeneratingScript, settings, voices, fetchVoices } = useAppStore();
  
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('career');
  const [structure, setStructure] = useState('tips');
  const [persona, setPersona] = useState('thought_leader');
  const [language, setLanguage] = useState('english');
  const [voiceName, setVoiceName] = useState('');
  const [musicGenre, setMusicGenre] = useState('tech');
  const [sceneCount, setSceneCount] = useState('5');
  const [ctaType, setCtaType] = useState('lead_magnet');
  const [generatePostText, setGeneratePostText] = useState(true);
  
  const [showAdvance, setShowAdvance] = useState(false);
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
      topicOrTitle: `[LinkedIn B2B - ${persona.toUpperCase()}] ${topic}`,
      language,
      voiceGender: fallbackGender,
      voiceName,
      musicGenre,
      sceneCount: parseInt(sceneCount, 10),
      ctaEnabled: true,
      ctaLanguage: language,
      ctaStyle: 'tech',
      ctaDuration: 5,
      // Custom metadata for backend prompt customization in subsequent phases
      platform: 'linkedin',
      niche,
      structure,
      persona,
      ctaType,
      generatePostText
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to generate LinkedIn Video. Check your Gemini API key.');
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
    career: 'Career Development & Growth',
    startup: 'SaaS & Startup Lessons',
    tech: 'Tech Innovation & AI Trends',
    branding: 'Personal Branding & Audience',
    leadership: 'Productivity & Leadership'
  };

  // Structure Nicenames
  const structures = {
    tips: '5 Actionable Tips (Listicle)',
    story: 'Storytelling (Founder Anecdote)',
    casestudy: 'Case Study (Before & After)',
    provocative: 'Thought-Provoking / Controversial'
  };

  // Persona Nicenames
  const personas = {
    thought_leader: 'Inspiring Thought Leader',
    casual_founder: 'Authentic/Casual Founder',
    expert: 'Practical Industry Expert',
    analytical: 'Analytical Builder / Engineer'
  };

  // CTA Nicenames
  const ctas = {
    lead_magnet: 'Lead Magnet (Comment for PDF)',
    profile: 'Profile Visit (Follow for tips)',
    discussion: 'Discussion Hook (Agree or Disagree?)'
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
              LinkedIn Video generation requires a Google Gemini API key. Please check the Status panel in your Social Media hub.
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Creation Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
            <div className="p-2.5 bg-blue-600/10 border border-blue-600/20 text-blue-500 rounded-2xl">
              <LinkedInIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-100 leading-none">LinkedIn Post Generator</h1>
              <p className="text-slate-400 text-xs mt-1.5">
                Generate high-quality educational vertical short videos accompanied by a copy-written LinkedIn B2B text post.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Professional Video Topic / Hook</label>
              <input
                type="text"
                placeholder="e.g. Why most software projects fail, or How we scaled our product to 10k users"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full bg-slate-900/40 border border-slate-800 focus:border-blue-550 focus:bg-slate-900 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-xs focus:outline-none transition-all duration-200"
              />
            </div>

            {/* Specialized Options Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Professional Niche */}
              <Select value={niche} onChange={setNiche} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Professional Niche</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
                  <Select.Value>{niches[niche]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="career" textValue="Career Development" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Career Development & Growth
                    </ListBox.Item>
                    <ListBox.Item id="startup" textValue="SaaS & Startup" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      SaaS & Startup Lessons
                    </ListBox.Item>
                    <ListBox.Item id="tech" textValue="Tech Innovation" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Tech Innovation & AI Trends
                    </ListBox.Item>
                    <ListBox.Item id="branding" textValue="Personal Branding" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Personal Branding & Audience
                    </ListBox.Item>
                    <ListBox.Item id="leadership" textValue="Productivity" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Productivity & Leadership
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Story Structure */}
              <Select value={structure} onChange={setStructure} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Post Structure Vibe</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
                  <Select.Value>{structures[structure]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="tips" textValue="Actionable Tips" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      5 Actionable Tips (Listicle)
                    </ListBox.Item>
                    <ListBox.Item id="story" textValue="Storytelling" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Storytelling (Founder Anecdote)
                    </ListBox.Item>
                    <ListBox.Item id="casestudy" textValue="Case Study" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Case Study (Before & After)
                    </ListBox.Item>
                    <ListBox.Item id="provocative" textValue="Thought Provoking" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Thought-Provoking / Controversial
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
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="english" textValue="English" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      English (Recommended)
                    </ListBox.Item>
                    <ListBox.Item id="hinglish" textValue="Hinglish" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Hinglish
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Writing Persona */}
              <Select value={persona} onChange={setPersona} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Writing Persona</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
                  <Select.Value>{personas[persona]}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="thought_leader" textValue="Thought Leader" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Inspiring Thought Leader
                    </ListBox.Item>
                    <ListBox.Item id="casual_founder" textValue="Casual Founder" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Authentic/Casual Founder
                    </ListBox.Item>
                    <ListBox.Item id="expert" textValue="Expert" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Practical Industry Expert
                    </ListBox.Item>
                    <ListBox.Item id="analytical" textValue="Analytical" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Analytical Builder / Engineer
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Video Scenes */}
              <Select value={sceneCount} onChange={setSceneCount} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Video Length</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="4" textValue="4 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      4 Scenes (~20s)
                    </ListBox.Item>
                    <ListBox.Item id="5" textValue="5 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      5 Scenes (~30s)
                    </ListBox.Item>
                    <ListBox.Item id="8" textValue="8 Scenes" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      8 Scenes (~50s)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Audio settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voice Selector */}
              <Select value={voiceName} onChange={setVoiceName} className="w-full">
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1 flex items-center gap-1">
                  <Volume2 size={12} /> Narration Voice
                </span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
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
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-800 rounded-xl px-3.5 flex justify-between items-center bg-slate-900/40 hover:bg-slate-900 text-slate-200 font-semibold focus:outline-none focus:border-blue-500/50 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                  <ListBox className="p-1">
                    <ListBox.Item id="tech" textValue="Tech" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Tech / Minimal Beat
                    </ListBox.Item>
                    <ListBox.Item id="cinematic" textValue="Cinematic" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Inspirational Cinematic
                    </ListBox.Item>
                    <ListBox.Item id="calm" textValue="Calm" className="cursor-pointer hover:bg-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold">
                      Corporate Neutral / Calm
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* LinkedIn-specific Advanced Options (Post text & CTA) */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/20">
              <button
                type="button"
                onClick={() => setShowAdvance(!showAdvance)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-900/40 hover:bg-slate-900/80 transition-colors text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-blue-500 font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase tracking-wider">B2B Content</span>
                  <span className="text-xs font-bold text-slate-200">LinkedIn Post Copy & Target CTA</span>
                </div>
                <span className="text-slate-500 text-xs font-bold">{showAdvance ? '▼ Collapse' : '▶ Expand'}</span>
              </button>
              
              {showAdvance && (
                <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/60">
                  {/* Generate Post Text Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-350">Generate Accompanying LinkedIn Post Copy</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">Writes a highly structured B2B text hook with spacing and hashtags</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={generatePostText} 
                        onChange={(e) => setGeneratePostText(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-650 after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-650 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {/* CTA Action Type */}
                  <Select value={ctaType} onChange={setCtaType} className="w-full">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">LinkedIn Target Call to Action</span>
                    <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-xl px-3 flex justify-between items-center bg-slate-900 text-slate-200 font-bold focus:outline-none cursor-pointer">
                      <Select.Value>{ctas[ctaType]}</Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl z-50 text-slate-200">
                      <ListBox className="p-1">
                        <ListBox.Item id="lead_magnet" textValue="Lead Magnet" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs">
                          Lead Magnet (Comment for PDF)
                        </ListBox.Item>
                        <ListBox.Item id="profile" textValue="Profile Visit" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs">
                          Profile Visit (Follow for tips)
                        </ListBox.Item>
                        <ListBox.Item id="discussion" textValue="Discussion Hook" className="cursor-pointer hover:bg-slate-850 rounded-xl px-2 py-1 text-xs">
                          Discussion Hook (Agree or Disagree?)
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
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
              className="w-full font-bold shadow-lg shadow-blue-500/10 bg-blue-650 hover:bg-blue-700 py-6 text-white text-xs rounded-xl cursor-pointer transition-all border-none"
              isLoading={isGeneratingScript}
              disabled={!settings.hasGeminiKey || isGeneratingScript}
              endContent={!isGeneratingScript && <Wand2 size={16} />}
            >
              {isGeneratingScript ? 'Drafting LinkedIn Pitch...' : 'Generate LinkedIn Post'}
            </Button>
          </form>
        </div>

        {/* Right Side: Desktop Feed Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center pt-8 lg:pt-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">LinkedIn Desktop Feed Simulator</span>
          
          <div className="w-full max-w-[370px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 text-slate-200 text-left space-y-3 flex flex-col">
            {/* Post Header */}
            <div className="flex items-start justify-between">
              <div className="flex gap-2">
                <div className="h-9 w-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
                  LI
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-slate-100 flex items-center gap-1.5 leading-none">
                    Founder Creator
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-550 inline-block"></span>
                    <span className="text-[9px] font-semibold text-blue-400">1st</span>
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                    SaaS Builder | Scaling Products using AI
                  </span>
                  <span className="text-[8px] text-slate-500 flex items-center gap-1 mt-0.5">
                    1h • <Globe size={8} />
                  </span>
                </div>
              </div>
              <button className="text-slate-500 hover:text-slate-350">
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Generated Text Copy Section */}
            {generatePostText && (
              <div className="text-[10px] text-slate-300 space-y-1.5 leading-relaxed bg-slate-950/20 border border-slate-850 p-2.5 rounded-xl">
                <p className="font-extrabold text-slate-200">
                  🚀 How we solved {topic ? topic : 'our biggest B2B bottleneck'}...
                </p>
                <p className="line-clamp-2">
                  Building products is hard. Scaling them is even harder. Here are the {sceneCount} critical components we focused on to get results.
                </p>
                <p className="text-[9px] text-blue-400 font-extrabold">
                  #{niche} #{persona} #startup #leadership
                </p>
              </div>
            )}

            {/* Video Frame */}
            <div className="aspect-[9/16] w-full max-w-[200px] mx-auto bg-black rounded-xl overflow-hidden relative border border-slate-850 flex flex-col justify-between p-3 text-white self-center">
              {/* Simulator Background */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-zinc-950 to-slate-950 flex flex-col items-center justify-center opacity-85 z-0">
                <Film size={28} className="text-blue-500/20 mb-2" />
                <span className="text-[8px] text-slate-650 font-bold uppercase tracking-wider">Professional Video Feed</span>
              </div>

              {/* Subtitles Overlay */}
              <div className="z-10 text-center w-full px-2 flex flex-col items-center justify-center self-center my-auto min-h-[80px]">
                <span className="text-[8px] uppercase font-black bg-blue-600 text-white px-1.5 py-0.5 rounded mb-1.5 tracking-wider shadow">
                  {niche.toUpperCase()}
                </span>
                <p className="text-xs font-black text-center tracking-tight leading-snug drop-shadow-md">
                  {topic ? topic : 'Make B2B topics engaging with professional scripts'}
                </p>
                <p className="text-[9px] font-extrabold text-center mt-1.5 text-blue-400">
                  [{personas[persona]?.split(' ').slice(-1)[0]}]
                </p>
              </div>

              {/* Bottom Playback Overlay */}
              <div className="flex items-center justify-between z-10 w-full text-[8px] text-slate-400">
                <span className="bg-black/60 px-1 py-0.5 rounded">0:30</span>
                <span className="bg-black/60 px-1 py-0.5 rounded uppercase">Corporate Vibe</span>
              </div>
            </div>

            {/* Likes / Reactions Bar */}
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[9px] text-slate-400 pt-1">
              <div className="flex items-center gap-1">
                <span>👍</span>
                <span>💡</span>
                <span>❤️</span>
                <span className="font-semibold text-slate-300">128 reactions</span>
              </div>
              <div className="flex gap-2">
                <span>12 comments</span>
                <span>•</span>
                <span>4 reposts</span>
              </div>
            </div>

            {/* LinkedIn Action Buttons */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-1 pt-0.5">
              <button className="flex items-center gap-1.5 hover:text-slate-100 py-1 rounded">
                <ThumbsUp size={12} />
                <span>Like</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-100 py-1 rounded">
                <MessageSquare size={12} />
                <span>Comment</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-100 py-1 rounded">
                <Repeat size={12} />
                <span>Repost</span>
              </button>
              <button className="flex items-center gap-1.5 hover:text-slate-100 py-1 rounded">
                <Send size={12} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
