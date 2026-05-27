'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Card, Button, Link } from '@heroui/react';
import { 
  Key, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Share2, 
  ShieldCheck, 
  Info,
  ExternalLink
} from 'lucide-react';

// Custom SVGs for platforms to avoid version conflicts in lucide-react
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

const TikTokIcon = (props) => (
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
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

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

const FacebookIcon = (props) => (
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
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

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

export default function SocialMedia() {
  const { 
    settings, 
    isLoadingSettings, 
    fetchSettings, 
    youtubeAccounts,
    connectYouTube,
    fetchYouTubeAccounts,
    linkedinAccounts,
    connectLinkedIn,
    fetchLinkedInAccounts
  } = useAppStore();

  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchYouTubeAccounts();
    fetchLinkedInAccounts();
  }, [fetchSettings, fetchYouTubeAccounts, fetchLinkedInAccounts]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const socialPlatforms = [
    {
      id: 'youtube',
      name: 'YouTube Shorts',
      description: 'One-click publish your rendered shorts directly to your YouTube channel feed.',
      icon: YoutubeIcon,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
      active: true,
      badge: 'Active'
    },
    {
      id: 'tiktok',
      name: 'TikTok Shorts',
      description: 'Publish your high-impact vertical shorts directly to your TikTok profile.',
      icon: TikTokIcon,
      color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
      active: false,
      badge: 'Coming Soon'
    },
    {
      id: 'instagram',
      name: 'Instagram Reels',
      description: 'Share your rendered short videos directly to your Instagram Reels feed.',
      icon: InstagramIcon,
      color: 'text-pink-500 bg-pink-50/10 border-pink-50/20',
      active: false,
      badge: 'Coming Soon'
    },
    {
      id: 'facebook',
      name: 'Facebook Reels',
      description: 'Post and syndicate your vertical auto-generated short videos to Facebook Pages.',
      icon: FacebookIcon,
      color: 'text-blue-500 bg-blue-50/10 border-blue-50/20',
      active: false,
      badge: 'Coming Soon'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Video',
      description: 'Share business and promotional shorts directly to your LinkedIn professional feed.',
      icon: LinkedInIcon,
      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      active: true,
      badge: 'Active'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] p-4 bg-slate-900 border border-slate-800 text-violet-400 text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Info size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-3 text-slate-100">
            <Share2 className="text-violet-500 h-8 w-8" />
            Social Media Hub
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Link, manage, and automate your short video publishing schedules across all major video distribution platforms.
          </p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 max-w-xs">
          <ShieldCheck className="text-emerald-500 h-10 w-10 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-200 block">Encrypted Publish</span>
            <span className="text-slate-400 text-[10px]">All social auth tokens are salted and encrypted at rest.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Social Media Platforms list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            Publishing Platforms
          </h2>
          <div className="space-y-4">
            {socialPlatforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <Card 
                  key={platform.id} 
                  className={`border transition-all duration-200 bg-slate-900/40 border-slate-800/80 p-5 rounded-3xl hover:border-slate-700/80 shadow-sm`}
                >
                  <Card.Header className="flex justify-between items-start p-0 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl border ${platform.color}`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-100 flex items-center gap-2 text-sm">
                          {platform.name}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            platform.active 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-800 text-slate-400 border border-slate-750'
                          }`}>
                            {platform.badge}
                          </span>
                        </span>
                      </div>
                    </div>
                    {platform.active ? (
                      <Button
                        size="sm"
                        onClick={platform.id === 'youtube' ? connectYouTube : connectLinkedIn}
                        className={`${
                          platform.id === 'youtube' 
                            ? 'bg-red-650 hover:bg-red-750' 
                            : 'bg-blue-650 hover:bg-blue-750'
                        } text-white font-bold flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs uppercase tracking-wider transition-all`}
                      >
                        <Plus size={14} /> {platform.id === 'youtube' ? 'Link Channel' : 'Link Account'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => showToast(`${platform.name} integration is launching soon!`)}
                        className="bg-slate-850 hover:bg-slate-800 hover:text-slate-350 text-slate-400 font-bold flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs uppercase tracking-wider transition-all"
                      >
                        Connect
                      </Button>
                    )}
                  </Card.Header>
                  <Card.Content className="p-0 text-slate-400 text-xs">
                    <p className="mb-4 leading-relaxed">{platform.description}</p>
                    
                    {/* If platform is YouTube and active, show connected channels */}
                    {platform.id === 'youtube' && (
                      <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-3">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          Linked YouTube Channels
                        </span>
                        {youtubeAccounts.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                            No channels connected. Click "Link Channel" above to connect your YouTube channel.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {youtubeAccounts.map((acc) => (
                              <div 
                                key={acc._id || acc.channelId} 
                                className="flex items-center justify-between p-3.5 bg-slate-950/30 border border-slate-850 rounded-2xl"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="h-8.5 w-8.5 bg-red-950/40 text-red-500 rounded-xl border border-red-900/30 flex items-center justify-center font-bold text-xs">
                                    📺
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-slate-200 text-xs truncate max-w-[130px]">{acc.channelName}</span>
                                    <span className="text-[9px] text-slate-500 truncate max-w-[130px]">{acc.email}</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Connected
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* If platform is LinkedIn and active, show connected accounts */}
                    {platform.id === 'linkedin' && (
                      <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-3">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          Linked LinkedIn Profiles
                        </span>
                        {linkedinAccounts.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                            No accounts connected. Click "Link Account" above to connect your LinkedIn profile.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {linkedinAccounts.map((acc) => (
                              <div 
                                key={acc._id || acc.linkedinId} 
                                className="flex items-center justify-between p-3.5 bg-slate-950/30 border border-slate-850 rounded-2xl"
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="h-8.5 w-8.5 bg-blue-950/40 text-blue-400 rounded-xl border border-blue-900/30 flex items-center justify-center font-bold text-xs">
                                    💼
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-slate-200 text-xs truncate max-w-[130px]">{acc.profileName}</span>
                                    <span className="text-[9px] text-slate-500 truncate max-w-[130px]">{acc.email}</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Connected
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card.Content>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: API Keys Integration Status Panel */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            System Status
          </h2>
          <Card className="border bg-slate-900/40 border-slate-800/80 p-5 rounded-3xl shadow-sm">
            <Card.Header className="flex flex-col items-start p-0 pb-4 border-b border-slate-800/50">
              <span className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Key className="text-violet-500 h-5 w-5" />
                Backend API Integrations
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                The video rendering pipeline relies on backend API configurations.
              </p>
            </Card.Header>
            <Card.Content className="py-4 px-0 space-y-5">
              {/* Status List */}
              <div className="space-y-4">
                {/* Gemini Status */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/20 border border-slate-850 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">Google Gemini API</span>
                    <span className="text-[9px] text-slate-500">Auto scriptwriting & scene generation</span>
                  </div>
                  {settings.hasGeminiKey ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span> Missing
                    </span>
                  )}
                </div>

                {/* Pexels Status */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/20 border border-slate-850 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">Pexels Video API</span>
                    <span className="text-[9px] text-slate-500">Cinematic stock footage downloader</span>
                  </div>
                  {settings.hasPexelsKey ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Fallback Mode
                    </span>
                  )}
                </div>

                {/* Pixabay Status */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950/20 border border-slate-850 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">Pixabay API (Optional)</span>
                    <span className="text-[9px] text-slate-500">Secondary stock media fallback</span>
                  </div>
                  {settings.hasPixabayKey ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800 text-slate-400 border border-slate-750">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Secure Notice Info */}
              <div className="p-4 bg-slate-950/40 border border-slate-850/50 rounded-2xl flex items-start gap-3">
                <Info size={16} className="text-violet-400 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="font-bold text-slate-350 block mb-0.5">Secure Configuration Panel</span>
                  For maximum security, API secrets and credentials are loaded directly from your server's <code className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-violet-400 font-mono text-[9px] font-bold">.env</code> file. No raw keys are ever cached, saved to the database, or returned in client API responses.
                </p>
              </div>

              {/* Help Link */}
              <div className="pt-2 flex justify-center text-center">
                <Link 
                  isExternal
                  href="https://github.com/Guri504/ai-shorts-generator"
                  className="text-[10px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 hover:underline"
                >
                  View Setup Documentation <ExternalLink size={10} />
                </Link>
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}
