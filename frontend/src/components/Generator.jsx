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
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Warning if Gemini Key is missing */}
      {!settings.hasGeminiKey && (
        <div className="mb-6 p-4 bg-yellow-950/40 border border-yellow-800/40 rounded-xl flex items-start gap-3 text-yellow-400 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold mb-1">Gemini API Key Missing</h4>
            <p className="text-slate-300">
              You must configure a Gemini API key in the <span className="underline cursor-pointer" onClick={() => useAppStore.getState().setActiveTab('settings')}>Settings</span> tab before you can generate viral video scripts.
            </p>
          </div>
        </div>
      )}

      <Card className="glow-card border-none bg-slate-950/60 p-4">
        <Card.Header className="flex flex-col items-center text-center pb-6">
          <div className="h-14 w-14 bg-violet-600/10 text-violet-500 rounded-full flex items-center justify-center mb-3 border border-violet-500/20">
            <Film size={26} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-violet-400" />
            AI Video Generator
          </h2>
          <p className="text-slate-400 text-xs mt-1 max-w-sm">
            Enter a single topic or video title, and our AI will write a viral script, scene list, visual prompts, and render the final Short.
          </p>
        </Card.Header>

        <Card.Content>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-slate-400">Topic or Video Title</label>
                <Input
                  type="text"
                  placeholder="e.g. 3 Dark Secrets of space, or How coffee changed history"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className="border border-slate-800 rounded-lg bg-slate-950 px-3 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:border-violet-500 focus:outline-none transition-colors w-full"
                />
                <span className="text-[11px] text-slate-500">Keep it short and curious for optimal hooks</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={language}
                onChange={setLanguage}
                className="w-full"
              >
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Script Language</span>
                <Select.Trigger className="w-full text-sm py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                  <ListBox className="p-1">
                    <ListBox.Item id="hinglish" textValue="Hinglish (Hindi in English Script)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      Hinglish (Recommended 🇮🇳)
                    </ListBox.Item>
                    <ListBox.Item id="hindi" textValue="Hindi (Devanagari script)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      Hindi (🇮🇳)
                    </ListBox.Item>
                    <ListBox.Item id="english" textValue="English" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
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
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Narration Voice</span>
                <Select.Trigger className="w-full text-sm py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                  <span className="block truncate">{voiceTriggerText}</span>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                  <ListBox className="p-1 max-h-[250px] overflow-y-auto">
                    {filteredVoices.map(v => (
                      <ListBox.Item 
                        key={v.name} 
                        id={v.name} 
                        textValue={`${v.displayName} (${v.gender})`} 
                        className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span>{v.displayName}</span>
                          <span className="text-[10px] bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded text-slate-400 capitalize">{v.gender}</span>
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={musicGenre}
                onChange={setMusicGenre}
                className="w-full"
              >
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Background Music Vibe</span>
                <Select.Trigger className="w-full text-sm py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                  <ListBox className="p-1">
                    <ListBox.Item id="cinematic" textValue="Grand Orchestral Cinematic" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      Cinematic (Epic / Suspense)
                    </ListBox.Item>
                    <ListBox.Item id="hype" textValue="Upbeat Hype Electronic" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      Hype (Motivational / Energetic)
                    </ListBox.Item>
                    <ListBox.Item id="tech" textValue="Ambient Technology Synth" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      Tech (Minimal Synth / Modern)
                    </ListBox.Item>
                    <ListBox.Item id="emotional" textValue="Melancholic Slow Piano" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      Emotional (Sad / Relatable)
                    </ListBox.Item>
                    <ListBox.Item id="calm" textValue="Peaceful Acoustic" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
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
                <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Number of Scenes</span>
                <Select.Trigger className="w-full text-sm py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                  <ListBox className="p-1">
                    <ListBox.Item id="3" textValue="3 Scenes (~15s Short)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      3 Scenes (~15s Short)
                    </ListBox.Item>
                    <ListBox.Item id="4" textValue="4 Scenes (~20s Short)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      4 Scenes (~20s Short)
                    </ListBox.Item>
                    <ListBox.Item id="5" textValue="5 Scenes (~30s Short) — Recommended" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      5 Scenes (~30s) ⭐ Recommended
                    </ListBox.Item>
                    <ListBox.Item id="6" textValue="6 Scenes (~35s Short)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      6 Scenes (~35s Short)
                    </ListBox.Item>
                    <ListBox.Item id="7" textValue="7 Scenes (~45s Short)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      7 Scenes (~45s Short)
                    </ListBox.Item>
                    <ListBox.Item id="8" textValue="8 Scenes (~50s Short)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      8 Scenes (~50s Short)
                    </ListBox.Item>
                    <ListBox.Item id="10" textValue="10 Scenes (~60s Short)" className="cursor-pointer hover:bg-slate-900 rounded px-3 py-2 text-sm text-slate-200">
                      10 Scenes (~60s Max)
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* COLLAPSIBLE CALL TO ACTION (CTA) OUTRO SECTION */}
            <div className="border border-slate-900 rounded-xl overflow-hidden bg-slate-950/20">
              <button
                type="button"
                onClick={() => setShowCtaSettings(!showCtaSettings)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-950/40 hover:bg-slate-900/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-violet-400 font-bold bg-violet-950/60 border border-violet-850 px-2 py-0.5 rounded uppercase">Outro</span>
                  <span className="text-sm font-bold text-slate-200">Call to Action (CTA) Ending Scene</span>
                </div>
                <span className="text-slate-400 text-xs">{showCtaSettings ? '▼ Collapse' : '▶ Expand Options'}</span>
              </button>
              
              {showCtaSettings && (
                <div className="p-4 border-t border-slate-900 space-y-4 bg-slate-950/30">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">Enable Automatic Outro</span>
                      <span className="text-[10px] text-slate-500">Appends a final subscription request scene at the end of the video</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={ctaEnabled} 
                        onChange={(e) => setCtaEnabled(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                    </label>
                  </div>

                  {ctaEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <Select
                        value={ctaStyle}
                        onChange={setCtaStyle}
                        className="w-full"
                      >
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Visual Style</span>
                        <Select.Trigger className="w-full text-xs py-2 border border-slate-800 rounded-lg px-3 flex justify-between items-center bg-slate-950 text-slate-200">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover className="bg-slate-950 border border-slate-800 rounded-lg shadow-lg">
                          <ListBox className="p-1">
                            <ListBox.Item id="auto" textValue="Auto-Select (Theme Match)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Auto-Select
                            </ListBox.Item>
                            <ListBox.Item id="tech" textValue="Tech (Cybernetic Glow)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Tech Glow
                            </ListBox.Item>
                            <ListBox.Item id="ai" textValue="AI (Neural Network Hologram)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              AI Network
                            </ListBox.Item>
                            <ListBox.Item id="horror" textValue="Horror (Crimson Forest)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              Horror Mist
                            </ListBox.Item>
                            <ListBox.Item id="motivation" textValue="Motivation (Golden Peak)" className="cursor-pointer hover:bg-slate-900 rounded px-2.5 py-1.5 text-xs text-slate-200">
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
                              Hinglish (Recommended)
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
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800/40 text-red-400 rounded-lg text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              color="secondary"
              size="lg"
              className="w-full font-bold shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 py-6"
              isLoading={isGeneratingScript}
              disabled={!settings.hasGeminiKey || isGeneratingScript}
              endContent={!isGeneratingScript && <Wand2 size={18} />}
            >
              {isGeneratingScript ? 'Writing Script with AI...' : 'Generate Script'}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
