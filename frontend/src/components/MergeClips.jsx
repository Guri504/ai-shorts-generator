'use client';

import React, { useState, useRef } from 'react';
import { useAppStore, BACKEND_URL } from '../store/appStore';
import { Card, Button, ProgressBar } from '@heroui/react';
import {
  Film, Upload, Play, Trash2, ArrowUp, ArrowDown,
  Layers, Download, Sparkles, Check, AlertTriangle, X
} from 'lucide-react';
import axios from 'axios';

export default function MergeClips() {
  const { token } = useAppStore();
  const fileInputRef = useRef(null);

  const [selectedClips, setSelectedClips] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mergedFilename, setMergedFilename] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  // Helper to add files to state with preview URL and size details
  const addFiles = (files) => {
    const validVideoFiles = files.filter(file => file.type.startsWith('video/'));

    if (validVideoFiles.length === 0) {
      setErrorMsg('Please select valid video files (MP4, WebM, etc.)');
      return;
    }

    const newClips = validVideoFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      localUrl: URL.createObjectURL(file)
    }));

    setSelectedClips(prev => [...prev, ...newClips]);
    setErrorMsg('');
  };

  // Actions on clips list
  const moveClip = (index, direction) => {
    const updated = [...selectedClips];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;

    // Swap items
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setSelectedClips(updated);
  };

  const removeClip = (id, localUrl) => {
    setSelectedClips(prev => prev.filter(c => c.id !== id));
    try {
      URL.revokeObjectURL(localUrl);
    } catch (e) { }
  };

  const clearAll = () => {
    selectedClips.forEach(c => URL.revokeObjectURL(c.localUrl));
    setSelectedClips([]);
    setMergedFilename('');
    setMergeProgress(0);
    setStatusMessage('');
    setErrorMsg('');
  };

  // Merge execution
  const handleMerge = async () => {
    if (selectedClips.length < 2) {
      setErrorMsg('Please upload at least 2 video clips to merge.');
      return;
    }

    setIsMerging(true);
    setErrorMsg('');
    setMergeProgress(10);
    setStatusMessage('Uploading video clips to backend...');

    const formData = new FormData();
    selectedClips.forEach(clip => {
      formData.append('clips', clip.file);
    });

    try {
      // Fake progress steps for visual feedback
      const progressInterval = setInterval(() => {
        setMergeProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 800);

      const API_URL = `${BACKEND_URL}/api`;
      setStatusMessage('Merging clips via FFmpeg (re-scaling & syncing audio)...');

      const res = await axios.post(`${API_URL}/merge-clips`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setMergeProgress(100);
      setStatusMessage('Merge complete!');
      setMergedFilename(res.data.filename);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'An error occurred during merging.');
      setMergeProgress(0);
      setStatusMessage('');
    } finally {
      setIsMerging(false);
    }
  };

  const finalVideoUrl = mergedFilename
    ? `${BACKEND_URL}/api/assets/merged/${mergedFilename}?token=${token}`
    : '';

  const downloadUrl = finalVideoUrl ? `${finalVideoUrl}&download=true` : '';

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Header Board */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 p-6 rounded-2xl border border-slate-900/60 backdrop-blur-md">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-100 flex items-center gap-2">
            <Layers className="text-violet-500 animate-pulse" />
            Merge Video Clips
          </h1>
          <p className="text-slate-400 text-sm">
            Upload multiple video clips with audio, rearrange them, and stitch them seamlessly using FFmpeg.
          </p>
        </div>
        {selectedClips.length > 0 && (
          <Button
            variant="bordered"
            onClick={clearAll}
            disabled={isMerging}
            className="text-slate-400 border-slate-800 hover:border-red-500/40 hover:text-red-400 font-semibold"
          >
            Clear Screen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* LEFT COLUMN: FILE SELECTION AND ORDERING */}
        <div className="md:col-span-7 space-y-6">

          {/* Uploader Card */}
          <Card className="glow-card border-none bg-slate-950/60 p-5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="video/*"
              className="hidden"
            />

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${dragActive
                  ? 'border-violet-500 bg-violet-950/20'
                  : 'border-slate-800 hover:border-violet-500/50 bg-slate-950/40'
                }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 bg-violet-600/10 text-violet-500 rounded-full flex items-center justify-center border border-violet-500/20">
                  <Upload size={22} className={isMerging ? 'animate-bounce' : ''} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-200">
                    Drag and drop your video clips here, or <span className="text-violet-400 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports MP4, WebM, MOV clips. Normalizes automatically.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Clips List */}
          {selectedClips.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
                📂 Clips Playlist ({selectedClips.length})
              </h3>

              <div className="space-y-3">
                {selectedClips.map((clip, index) => (
                  <div
                    key={clip.id}
                    className="flex items-center gap-4 bg-slate-950/40 border border-slate-900 rounded-xl p-3 hover:border-slate-800 transition-colors"
                  >
                    {/* Small vertical video preview */}
                    <div className="h-16 w-12 bg-black rounded overflow-hidden shrink-0 border border-slate-850">
                      <video
                        src={clip.localUrl}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        onMouseOver={(e) => e.target.play()}
                        onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                      />
                    </div>

                    {/* Meta info */}
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate" title={clip.name}>
                        {clip.name}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Size: {clip.size} • Hover to preview
                      </span>
                    </div>

                    {/* Move and delete controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => moveClip(index, -1)}
                        disabled={index === 0 || isMerging}
                        className="hover:bg-slate-900 text-slate-400 disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </Button>

                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => moveClip(index, 1)}
                        disabled={index === selectedClips.length - 1 || isMerging}
                        className="hover:bg-slate-900 text-slate-400 disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </Button>

                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="light"
                        onClick={() => removeClip(clip.id, clip.localUrl)}
                        disabled={isMerging}
                        className="hover:bg-red-950/20 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trigger Merge Button */}
              <Button
                color="secondary"
                size="lg"
                onClick={handleMerge}
                isLoading={isMerging}
                disabled={selectedClips.length < 2 || isMerging}
                className="w-full font-bold shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 py-6 mt-4"
                endContent={!isMerging && <Sparkles size={18} />}
              >
                {isMerging ? 'Stitching clips together...' : `Merge ${selectedClips.length} Video Clips`}
              </Button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PREVIEW & PROGRESS */}
        <div className="md:col-span-5 flex flex-col gap-6 justify-start">

          {/* Progress / Merge status Panel */}
          {isMerging && (
            <Card className="glow-card border-none bg-slate-950/60 p-5 space-y-4 text-center">
              <div className="h-14 w-14 bg-violet-900/10 text-violet-500 rounded-full flex items-center justify-center mx-auto border border-violet-850 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Processing Clips</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Merging segment layouts and rendering output...</p>
              </div>

              <div className="space-y-1">
                <ProgressBar value={mergeProgress} className="w-full">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Progress</span>
                    <ProgressBar.Output className="font-bold text-violet-400" />
                  </div>
                  <ProgressBar.Track className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <ProgressBar.Fill className="h-full bg-violet-600 rounded-full transition-all duration-300" />
                  </ProgressBar.Track>
                </ProgressBar>
                <p className="text-[10px] text-slate-400 truncate italic font-medium mt-1.5">
                  &gt; {statusMessage}
                </p>
              </div>
            </Card>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-red-950/40 border border-red-800/40 text-red-400 rounded-xl text-xs font-semibold flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Merge Complete Preview Player */}
          {mergedFilename && !isMerging && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
                📺 Preview Merged Short
              </h3>

              {/* Vertical Simulator Video Container */}
              <div className="shorts-container relative border border-slate-900">
                <video
                  src={finalVideoUrl}
                  className="w-full h-full object-cover"
                  controls
                  loop
                  autoPlay
                />
              </div>

              <Card className="glow-card border-none bg-slate-950/60 p-4">
                <div className="space-y-3">
                  <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-3 flex gap-2 text-green-400 text-xs font-semibold">
                    <Check className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Video merged successfully! Check details below.</span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-850">
                    💾 File: <span className="text-slate-200">{mergedFilename}</span>
                  </div>

                  <Button
                    as="a"
                    href={downloadUrl}
                    download="merged_video.mp4"
                    color="success"
                    className="w-full font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-white bg-emerald-600 hover:bg-emerald-700 py-5"
                  >
                    <Download size={18} /> Download Merged Video
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Placeholder Board if no clips or merged file */}
          {!mergedFilename && !isMerging && (
            <Card className="border border-slate-900/60 bg-slate-950/30 p-8 text-center">
              <div className="h-12 w-12 bg-slate-900/60 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-400/80 border border-violet-950">
                <Film size={22} />
              </div>
              <h4 className="text-sm font-bold text-slate-300">Stitch Dashboard</h4>
              <p className="text-xs text-slate-500 max-w-[240px] mx-auto mt-1 leading-relaxed">
                Add video clips, arrange them in your preferred order, and trigger compilation to see the final combined preview.
              </p>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
