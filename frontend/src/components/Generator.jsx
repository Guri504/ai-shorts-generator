'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { Card, Button, Input, Select, ListBox } from '@heroui/react';
import { Film, AlertTriangle, Sparkles, Wand2 } from 'lucide-react';

export default function Generator() {
  const { createProject, isGeneratingScript, settings, voices, fetchVoices } = useAppStore();
  
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('hinglish');
  const [voiceName, setVoiceName] = useState('');
  const [musicGenre, setMusicGenre] = useState('cinematic');
  const [sceneCount, setSceneCount] = useState('5');
  
  // CTA Outro Configuration States
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [ctaStyle, setCtaStyle] = useState('auto');
  const [ctaLanguage, setCtaLanguage] = useState('auto');
  const [ctaDuration, setCtaDuration] = useState('5');
  const [showCtaSettings, setShowCtaSettings] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch available Edge TTS voices on mount
  useEffect(() => {
    if (voices.length === 0) {
      fetchVoices();
    }
  }, [voices, fetchVoices]);

  // Automatically select a sensible default voice when language or voices update
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
    
    // Legacy fallback mapping
    const fallbackGender = voiceName.toLowerCase().includes('male') && !voiceName.toLowerCase().includes('female') ? 'male' : 'female';
    
    const res = await createProject({
      topicOrTitle: topic,
      language,
      voiceGender: fallbackGender,
      voiceName,
      musicGenre,
      sceneCount: parseInt(sceneCount, 10),
      ctaEnabled,
      ctaLanguage: ctaLanguage === 'auto' ? language : ctaLanguage,
      ctaStyle,
      ctaDuration: parseInt(ctaDuration, 10)
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to generate script. Please verify your Gemini API key.');
    }
  };

  // Filter voices based on language selection
  const filteredVoices = voices.filter(v => {
    if (language === 'english') {
      return v.language.startsWith('English') && !v.language.includes('IN'); // English US/UK
    } else {
      return v.language === 'Hindi' || v.language === 'English (IN)'; // Hindi, Hinglish, Punjabi-compatible
    }
  });

  // Get selected voice display name
  const selectedVoiceObj = voices.find(v => v.name === voiceName);
  const voiceTriggerText = selectedVoiceObj 
    ? `${selectedVoiceObj.displayName} (${selectedVoiceObj.gender})` 
    : 'Select voice...';

  return (
    <div className="max-w-2xl mx-auto py-4 px-2">
      {/* Warning if Gemini Key is missing */}
      {!settings.hasGeminiKey && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-800 text-sm shadow-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <h4 className="font-extrabold mb-0.5">Gemini API Key Missing</h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              You must configure a Gemini API key in the <span className="underline font-bold cursor-pointer text-violet-600 hover:text-violet-750" onClick={() => useAppStore.getState().setActiveTab('social-media')}>Social Media</span> status panel before you can generate scripts.
            </p>
          </div>
        </div>
      )}

      <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl">
        {/* Header section */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
          <div className="h-12 w-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-3 border border-violet-100/50">
            <Film size={22} />
          </div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5 leading-none">
            <Sparkles className="h-4.5 w-4.5 text-violet-500" />
            AI Video Generator
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-relaxed">
            Enter a topic, and our AI will synthesize a viral script, scene-by-scene prompts, search stock visuals, and compile the final Short.
          </p>
        </div>

        <div className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Topic Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topic or Video Title</label>
              <div className="w-full">
                <input
                  type="text"
                  placeholder="e.g. 3 Dark Secrets of space, or How coffee changed history"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className="w-full bg-slate-50/50 border border-slate-200 focus:border-violet-500 focus:bg-white rounded-xl px-4.5 py-3 text-slate-800 placeholder-slate-400 text-xs focus:outline-none transition-all duration-200"
                />
              </div>
              <span className="text-[10px] text-slate-400 block px-1">Keep it short, direct, and curious for optimal hooks</span>
            </div>

            {/* Language and Voice Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                value={language}
                onChange={setLanguage}
                className="w-full"
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Script Language</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-200 rounded-xl px-3.5 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 text-slate-800 font-semibold focus:outline-none focus:border-violet-500 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                  <ListBox className="p-1">
                    <ListBox.Item id="hinglish" textValue="Hinglish" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold">
                      Hinglish (Recommended 🇮🇳)
                    </ListBox.Item>
                    <ListBox.Item id="hindi" textValue="Hindi" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold">
                      Hindi (🇮🇳)
                    </ListBox.Item>
                    <ListBox.Item id="english" textValue="English" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold">
                      English (🇺🇸)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              <Select
                value={voiceName}
                onChange={setVoiceName}
                className="w-full"
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Narration Voice</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-200 rounded-xl px-3.5 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 text-slate-800 font-semibold focus:outline-none focus:border-violet-500 transition cursor-pointer">
                  <span className="block truncate">{voiceTriggerText}</span>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                  <ListBox className="p-1 max-h-[200px] overflow-y-auto">
                    {filteredVoices.map(v => (
                      <ListBox.Item 
                        key={v.name} 
                        id={v.name} 
                        textValue={`${v.displayName} (${v.gender})`} 
                        className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{v.displayName}</span>
                          <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-lg text-slate-500 capitalize font-bold">{v.gender}</span>
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Music and Scenes Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                value={musicGenre}
                onChange={setMusicGenre}
                className="w-full"
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Background Music vibe</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-200 rounded-xl px-3.5 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 text-slate-800 font-semibold focus:outline-none focus:border-violet-500 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                  <ListBox className="p-1">
                    <ListBox.Item id="cinematic" textValue="Cinematic" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      Cinematic (Epic / Suspense)
                    </ListBox.Item>
                    <ListBox.Item id="hype" textValue="Hype" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      Hype (Motivational / Energetic)
                    </ListBox.Item>
                    <ListBox.Item id="tech" textValue="Tech" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      Tech (Minimal Synth / Modern)
                    </ListBox.Item>
                    <ListBox.Item id="emotional" textValue="Emotional" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      Emotional (Sad / Relatable)
                    </ListBox.Item>
                    <ListBox.Item id="calm" textValue="Calm" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      Calm (Chill / Relaxing)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              <Select
                value={sceneCount}
                onChange={setSceneCount}
                className="w-full"
              >
                <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Number of Scenes</span>
                <Select.Trigger className="w-full text-xs py-2.5 border border-slate-200 rounded-xl px-3.5 flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 text-slate-800 font-semibold focus:outline-none focus:border-violet-500 transition cursor-pointer">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                  <ListBox className="p-1">
                    <ListBox.Item id="3" textValue="3 Scenes" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      3 Scenes (~15s Short)
                    </ListBox.Item>
                    <ListBox.Item id="4" textValue="4 Scenes" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      4 Scenes (~20s Short)
                    </ListBox.Item>
                    <ListBox.Item id="5" textValue="5 Scenes — Recommended" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      5 Scenes (~30s) ⭐ Recommended
                    </ListBox.Item>
                    <ListBox.Item id="6" textValue="6 Scenes" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      6 Scenes (~35s Short)
                    </ListBox.Item>
                    <ListBox.Item id="7" textValue="7 Scenes" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      7 Scenes (~45s Short)
                    </ListBox.Item>
                    <ListBox.Item id="8" textValue="8 Scenes" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      8 Scenes (~50s Short)
                    </ListBox.Item>
                    <ListBox.Item id="10" textValue="10 Scenes" className="cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold">
                      10 Scenes (~60s Max)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* COLLAPSIBLE CALL TO ACTION (CTA) OUTRO SECTION */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowCtaSettings(!showCtaSettings)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-50/80 hover:bg-slate-100/50 transition-colors text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-violet-600 font-bold bg-violet-50 border border-violet-200 px-2 py-0.5 rounded uppercase tracking-wider">Outro</span>
                  <span className="text-xs font-bold text-slate-750">Call to Action (CTA) Ending Scene</span>
                </div>
                <span className="text-slate-400 text-xs font-bold">{showCtaSettings ? '▼ Collapse' : '▶ Expand'}</span>
              </button>
              
              {showCtaSettings && (
                <div className="p-4 border-t border-slate-200 space-y-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">Enable Outro Scene</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Appends a final subscription request scene at the end of the video</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ctaEnabled} 
                        onChange={(e) => setCtaEnabled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {ctaEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <Select
                        value={ctaStyle}
                        onChange={setCtaStyle}
                        className="w-full"
                      >
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Visual Style</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-200 rounded-xl px-3 flex justify-between items-center bg-slate-50 text-slate-800 font-bold focus:outline-none cursor-pointer">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                          <ListBox className="p-1">
                            <ListBox.Item id="auto" textValue="Auto-Select" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Auto-Select
                            </ListBox.Item>
                            <ListBox.Item id="tech" textValue="Tech Glow" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Tech Glow
                            </ListBox.Item>
                            <ListBox.Item id="ai" textValue="AI Network" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              AI Network
                            </ListBox.Item>
                            <ListBox.Item id="horror" textValue="Horror Mist" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Horror Mist
                            </ListBox.Item>
                            <ListBox.Item id="motivation" textValue="Motivational" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Motivational
                            </ListBox.Item>
                            <ListBox.Item id="cinematic" textValue="Cinematic" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Outro Language</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-200 rounded-xl px-3 flex justify-between items-center bg-slate-50 text-slate-800 font-bold focus:outline-none cursor-pointer">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                          <ListBox className="p-1">
                            <ListBox.Item id="auto" textValue="Auto" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Auto (Same)
                            </ListBox.Item>
                            <ListBox.Item id="punjabi" textValue="Punjabi" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Punjabi (🇮🇳)
                            </ListBox.Item>
                            <ListBox.Item id="hinglish" textValue="Hinglish" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Hinglish
                            </ListBox.Item>
                            <ListBox.Item id="hindi" textValue="Hindi" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              Hindi (🇮🇳)
                            </ListBox.Item>
                            <ListBox.Item id="english" textValue="English" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
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
                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Outro Duration</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-200 rounded-xl px-3 flex justify-between items-center bg-slate-50 text-slate-800 font-bold focus:outline-none cursor-pointer">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                          <ListBox className="p-1">
                            <ListBox.Item id="4" textValue="4 Seconds" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              4 Seconds
                            </ListBox.Item>
                            <ListBox.Item id="5" textValue="5 Seconds" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              5 Seconds
                            </ListBox.Item>
                            <ListBox.Item id="6" textValue="6 Seconds" className="cursor-pointer hover:bg-slate-50 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold">
                              6 Seconds
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              color="secondary"
              size="lg"
              className="w-full font-bold shadow-lg shadow-violet-500/10 bg-violet-600 hover:bg-violet-700 py-6 text-white text-xs rounded-xl cursor-pointer"
              isLoading={isGeneratingScript}
              disabled={!settings.hasGeminiKey || isGeneratingScript}
              endContent={!isGeneratingScript && <Wand2 size={16} />}
            >
              {isGeneratingScript ? 'Writing Script with AI...' : 'Generate Script'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
