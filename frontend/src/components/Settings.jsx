'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Card, Button, InputGroup, Link, Alert } from '@heroui/react';
import { Key, Eye, EyeOff, Save, CheckCircle2, AlertCircle, HelpCircle, Plus } from 'lucide-react';

const Youtube = (props) => (
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

export default function Settings() {
  const { 
    settings, 
    isLoadingSettings, 
    fetchSettings, 
    saveSettings,
    youtubeAccounts,
    connectYouTube,
    fetchYouTubeAccounts
  } = useAppStore();
  
  const [geminiKey, setGeminiKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [pixabayKey, setPixabayKey] = useState('');
  
  const [showGemini, setShowGemini] = useState(false);
  const [showPexels, setShowPexels] = useState(false);
  const [showPixabay, setShowPixabay] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null, 'success', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchYouTubeAccounts();
  }, [fetchSettings, fetchYouTubeAccounts]);

  useEffect(() => {
    if (settings?.env) {
      setGeminiKey(settings.env.GEMINI_API_KEY || '');
      setPexelsKey(settings.env.PEXELS_API_KEY || '');
      setPixabayKey(settings.env.PIXABAY_API_KEY || '');
    }
  }, [settings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setErrorMsg('');

    const res = await saveSettings({
      GEMINI_API_KEY: geminiKey,
      PEXELS_API_KEY: pexelsKey,
      PIXABAY_API_KEY: pixabayKey
    });

    setIsSaving(false);
    if (res.success) {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus('error');
      setErrorMsg(res.error || 'Failed to save settings.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-2">
        <Key className="text-violet-500 h-8 w-8" />
        Application Settings
      </h1>
      <p className="text-slate-400 mb-8">
        Configure your AI API keys and search indexes. These keys are stored locally in your <code className="bg-slate-900 px-1 py-0.5 rounded text-violet-400">.env</code> file.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gemini Settings Card */}
        <Card className="glow-card border-none bg-slate-950/60 p-2">
          <Card.Header className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-lg font-bold flex items-center gap-2">
                Google Gemini API Key
                {settings.hasGeminiKey ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-950 text-green-400 border border-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-950 text-red-400 border border-red-800">
                    Missing
                  </span>
                )}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Required for AI scripts, scene layouts, image prompts, and YouTube metadata.
              </p>
            </div>
            <Link 
              isExternal
              href="https://aistudio.google.com/"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <HelpCircle size={14} /> Get Key from AI Studio
            </Link>
          </Card.Header>
          <Card.Content className="py-2">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-400">GEMINI_API_KEY</label>
              <InputGroup className="flex items-center border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 focus-within:border-violet-500 transition-colors w-full">
                <InputGroup.Input
                  type={showGemini ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="bg-transparent border-none outline-none flex-grow text-slate-100 placeholder-slate-500 text-sm w-full"
                />
                <InputGroup.Suffix className="flex items-center pl-2">
                  <button type="button" onClick={() => setShowGemini(!showGemini)} className="text-slate-400 hover:text-slate-200 focus:outline-none">
                    {showGemini ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </InputGroup.Suffix>
              </InputGroup>
            </div>
          </Card.Content>
        </Card>

        {/* Pexels Settings Card */}
        <Card className="glow-card border-none bg-slate-950/60 p-2">
          <Card.Header className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-lg font-bold flex items-center gap-2">
                Pexels Stock Video API Key
                {settings.hasPexelsKey ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-950 text-green-400 border border-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-950 text-yellow-400 border border-yellow-800">
                    Fallback Mode
                  </span>
                )}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Required for downloading high-quality stock video footage. Without this, the system generates custom abstract solid backdrops.
              </p>
            </div>
            <Link 
              isExternal
              href="https://www.pexels.com/api/"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <HelpCircle size={14} /> Get Key from Pexels
            </Link>
          </Card.Header>
          <Card.Content className="py-2">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-400">PEXELS_API_KEY</label>
              <InputGroup className="flex items-center border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 focus-within:border-violet-500 transition-colors w-full">
                <InputGroup.Input
                  type={showPexels ? "text" : "password"}
                  placeholder="Paste your Pexels developer key here"
                  value={pexelsKey}
                  onChange={(e) => setPexelsKey(e.target.value)}
                  className="bg-transparent border-none outline-none flex-grow text-slate-100 placeholder-slate-500 text-sm w-full"
                />
                <InputGroup.Suffix className="flex items-center pl-2">
                  <button type="button" onClick={() => setShowPexels(!showPexels)} className="text-slate-400 hover:text-slate-200 focus:outline-none">
                    {showPexels ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </InputGroup.Suffix>
              </InputGroup>
            </div>
          </Card.Content>
        </Card>

        {/* Pixabay Settings Card */}
        <Card className="glow-card border-none bg-slate-950/60 p-2">
          <Card.Header className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-lg font-bold flex items-center gap-2">
                Pixabay API Key (Optional Fallback)
                {settings.hasPixabayKey ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-950 text-green-400 border border-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                    Inactive
                  </span>
                )}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Used as a secondary source for stock clips.
              </p>
            </div>
            <Link 
              isExternal
              href="https://pixabay.com/api/docs/"
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              <HelpCircle size={14} /> Get Key from Pixabay
            </Link>
          </Card.Header>
          <Card.Content className="py-2">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-semibold text-slate-400">PIXABAY_API_KEY</label>
              <InputGroup className="flex items-center border border-slate-800 rounded-lg bg-slate-950 px-3 py-2 focus-within:border-violet-500 transition-colors w-full">
                <InputGroup.Input
                  type={showPixabay ? "text" : "password"}
                  placeholder="Optional Pixabay API key"
                  value={pixabayKey}
                  onChange={(e) => setPixabayKey(e.target.value)}
                  className="bg-transparent border-none outline-none flex-grow text-slate-100 placeholder-slate-500 text-sm w-full"
                />
                <InputGroup.Suffix className="flex items-center pl-2">
                  <button type="button" onClick={() => setShowPixabay(!showPixabay)} className="text-slate-400 hover:text-slate-200 focus:outline-none">
                    {showPixabay ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </InputGroup.Suffix>
              </InputGroup>
            </div>
          </Card.Content>
        </Card>

        {/* Alerts and feedback */}
        {saveStatus === 'success' && (
          <div className="p-4 bg-green-950 border border-green-800 rounded-lg flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 size={20} />
            Settings saved successfully! Runtime environment reloaded.
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="p-4 bg-red-950 border border-red-800 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={20} />
            Failed to save settings: {errorMsg}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex justify-end pt-2">
          <Button 
            type="submit" 
            color="secondary" 
            isLoading={isSaving}
            className="px-6 py-4 font-bold flex items-center gap-2 shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700"
          >
            {!isSaving && <Save size={18} />}
            Save API Settings
          </Button>
        </div>
      </form>

      {/* YouTube Accounts Section */}
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <Youtube className="text-red-500 h-7 w-7" />
          YouTube Integrations
        </h2>
        <p className="text-slate-400 text-sm">
          Connect your YouTube channels to enable one-click publishing of your rendered vertical short videos.
        </p>

        <Card className="glow-card border-none bg-slate-950/60 p-4">
          <Card.Header className="flex justify-between items-center p-0 pb-4">
            <span className="font-bold text-base">Connected Channels</span>
            <Button
              size="sm"
              color="danger"
              onClick={connectYouTube}
              className="bg-red-600 hover:bg-red-700 font-bold flex items-center gap-1.5 rounded-lg px-4"
            >
              <Plus size={14} /> Link New Channel
            </Button>
          </Card.Header>
          <Card.Content className="p-0 space-y-3">
            {youtubeAccounts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No YouTube channels linked to this account. Link a channel to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {youtubeAccounts.map((acc) => (
                  <div key={acc._id || acc.channelId} className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 bg-red-600/10 text-red-500 rounded-lg flex items-center justify-center font-bold">
                        📺
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-bold text-sm text-slate-200 truncate">{acc.channelName}</span>
                        <span className="text-[10px] text-slate-500 truncate">{acc.email}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-950 text-green-400 border border-green-900/30">
                      Connected
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
