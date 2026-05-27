'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, Globe } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-slate-300 font-sansSelection selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-4xl mx-auto py-12 px-6">
        
        {/* Header navigation */}
        <div className="mb-10">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-violet-400 transition-colors"
          >
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>

        {/* Title Block */}
        <div className="border-b border-slate-800/80 pb-8 mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-2xl">
              <Shield size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-100 tracking-tight leading-none mb-2">
                Privacy Policy
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                Last Updated: May 27, 2026
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            This Privacy Policy explains how Shorts AI ("we," "our," or "us") collects, uses, protects, and handles your information when you use our platform to generate videos and distribute them.
          </p>
        </div>

        {/* Content body */}
        <div className="space-y-8 text-sm leading-relaxed text-slate-300">
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-violet-500 font-mono">1.</span> Information We Collect
            </h2>
            <p>
              We only collect data necessary to provide and secure our auto-video generation and social scheduling service. This includes:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Account Credentials:</strong> Basic details provided during signup (such as name, email address, and hashed passwords).
              </li>
              <li>
                <strong className="text-slate-200">Connected Social Profiles:</strong> OAuth access tokens, channel metadata (e.g., YouTube channel name, profile image, channel ID) and LinkedIn URN IDs when you authorize links via YouTube or LinkedIn.
              </li>
              <li>
                <strong className="text-slate-200">Short Video Projects:</strong> Titles, scripts, descriptions, visual assets, and final rendered videos generated on our system.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-violet-500 font-mono">2.</span> How We Use Your Information
            </h2>
            <p>
              Your information is strictly utilized to run the generation engines and distribute media outputs. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>To construct narration transcripts and visual layouts using Google Gemini AI.</li>
              <li>To fetch relevant cinematic stock footage using third-party stock providers.</li>
              <li>To authorize and upload rendered videos directly to your linked YouTube channel feed.</li>
              <li>To schedule and share promotional shorts directly to your LinkedIn professional feed.</li>
            </ul>
            <p className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/30 p-3 rounded-2xl flex items-start gap-2">
              <span>⚠️</span>
              We do not sell, trade, or share your data or linked credentials with third-party advertising services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-violet-500 font-mono">3.</span> OAuth Scopes & Data Protection
            </h2>
            <p>
              When linking YouTube and LinkedIn profiles, we request restricted access scopes needed strictly for automation:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
                <span className="text-xs font-extrabold text-red-400 uppercase tracking-wider block">YouTube Integration</span>
                <p className="text-xs text-slate-400">
                  Requests the <code className="bg-slate-950 px-1 py-0.5 rounded text-violet-400 font-mono text-[10px]">youtube.upload</code> scope. We store your secure offline refresh token, which is used only to upload shorts at your command.
                </p>
              </div>
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
                <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider block">LinkedIn Integration</span>
                <p className="text-xs text-slate-400">
                  Requests <code className="bg-slate-950 px-1 py-0.5 rounded text-violet-400 font-mono text-[10px]">w_member_social</code> and profile openID scopes. Used exclusively to write and publish feed updates.
                </p>
              </div>
            </div>
            <p className="flex items-center gap-2 text-slate-400">
              <Lock size={16} className="text-emerald-500 shrink-0" />
              All OAuth access and refresh tokens are encrypted at rest using industry-standard AES-256 encryption.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-violet-500 font-mono">4.</span> Data Retention & Deletion
            </h2>
            <p>
              You maintain complete ownership of your accounts. You can revoke credentials at any time:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>By unlinking social media accounts in the Social Media Hub settings panel, which immediately destroys the stored tokens in our database.</li>
              <li>By revoking access directly in your Google Security settings or LinkedIn Apps permission portal.</li>
              <li>By contacting us to delete your Shorts AI user account, which permanently purges all project logs, video history, and profile records.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-violet-500 font-mono">5.</span> Third-Party Services
            </h2>
            <p>
              Our video creation engine makes calls to third-party APIs (Google Gemini, Pexels, Pixabay, and Pollinations AI). These interactions are limited to requesting scripts or images and do not pass your personal user identifiers or linked social details.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-violet-500 font-mono">6.</span> Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us at:
            </p>
            <p className="font-bold text-slate-200">
              Email: <span className="text-violet-400 font-mono">support@shortsai.dev</span>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-800/80 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <span>&copy; 2026 Shorts AI. All rights reserved.</span>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/" className="hover:text-slate-400 transition-colors">Dashboard</Link>
            <Link href="/privacy" className="text-violet-400 font-bold hover:underline">Privacy Policy</Link>
          </div>
        </div>

      </div>
    </div>
  );
}
