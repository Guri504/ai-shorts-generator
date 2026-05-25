'use client';

import React, { useState, useRef } from 'react';
import { useAppStore, BACKEND_URL } from '../store/appStore';
import { Card, Button, ProgressBar } from '@heroui/react';
import { 
  Film, Music, Upload, Play, Trash2, 
  Download, Sparkles, Check, AlertTriangle, X 
} from 'lucide-react';
import axios from 'axios';

export default function ReplaceAudio() {
  const { token } = useAppStore();
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [adaptationType, setAdaptationType] = useState('trim'); // trim, speed
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [outputFilename, setOutputFilename] = useState('');

  // File selection handlers
  const handleVideoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedVideo({
          file,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          localUrl: URL.createObjectURL(file)
        });
        setErrorMsg('');
      } else {
        setErrorMsg('Please select a valid video file.');
      }
    }
  };

  const handleAudioChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('audio/')) {
        setSelectedAudio({
          file,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
          localUrl: URL.createObjectURL(file)
        });
        setErrorMsg('');
      } else {
        setErrorMsg('Please select a valid audio file.');
      }
    }
  };

  const removeVideo = () => {
    if (selectedVideo) {
      URL.revokeObjectURL(selectedVideo.localUrl);
      setSelectedVideo(null);
    }
    setOutputFilename('');
  };

  const removeAudio = () => {
    if (selectedAudio) {
      URL.revokeObjectURL(selectedAudio.localUrl);
      setSelectedAudio(null);
    }
    setOutputFilename('');
  };

  const clearAll = () => {
    removeVideo();
    removeAudio();
    setOutputFilename('');
    setProcessProgress(0);
    setStatusMessage('');
    setErrorMsg('');
  };

  // Run binding request
  const handleProcess = async () => {
    if (!selectedVideo || !selectedAudio) {
      setErrorMsg('Please select both a video file and an audio track.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setProcessProgress(15);
    setStatusMessage('Uploading files to backend media engine...');

    const formData = new FormData();
    formData.append('video', selectedVideo.file);
    formData.append('audio', selectedAudio.file);
    formData.append('adaptationType', adaptationType);

    try {
      // Fake progress increment
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 5;
        });
      }, 700);

      const API_URL = `${BACKEND_URL}/api`;
      setStatusMessage('Binding audio and adjusting length via FFmpeg...');
      
      const res = await axios.post(`${API_URL}/replace-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setProcessProgress(100);
      setStatusMessage('Audio binding complete!');
      setOutputFilename(res.data.filename);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'An error occurred during processing.');
      setProcessProgress(0);
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const finalVideoUrl = outputFilename 
    ? `${BACKEND_URL}/api/assets/merged/${outputFilename}?token=${token}` 
    : '';

  const downloadUrl = finalVideoUrl ? `${finalVideoUrl}&download=true` : '';

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-800 flex items-center gap-2">
            <Music className="text-violet-600" />
            Replace Audio
          </h1>
          <p className="text-slate-500 text-sm">
            Strip original video audio tracks and overlay a custom audio file. Speed sync or cut automatically.
          </p>
        </div>
        {(selectedVideo || selectedAudio) && (
          <Button 
            variant="bordered"
            onClick={clearAll}
            disabled={isProcessing}
            className="text-slate-500 border-slate-200 hover:border-red-500/40 hover:text-red-600 font-semibold"
          >
            Reset Screen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: FILE INPUTS AND ALIGNMENT OPTIONS */}
        <div className="md:col-span-7 space-y-6">
          
          {/* 1. Video Upload Field */}
          <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3 flex items-center gap-1.5">
              <Film size={14} className="text-violet-500" /> 1. Upload Video Clip
            </h3>
            
            <input 
              type="file"
              ref={videoInputRef}
              onChange={handleVideoChange}
              accept="video/*"
              className="hidden"
            />
            
            {!selectedVideo ? (
              <div 
                onClick={() => videoInputRef.current?.click()}
                className="border border-dashed border-slate-200 hover:border-violet-500/50 rounded-xl p-6 text-center cursor-pointer bg-slate-50/30 hover:bg-slate-100/10 transition-all duration-200"
              >
                <Upload size={18} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Click to select video clip</p>
                <p className="text-[10px] text-slate-400 mt-1">Supports MP4, WebM, MOV</p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedVideo.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Size: {selectedVideo.size}</p>
                  </div>
                  <Button 
                    isIconOnly 
                    size="sm" 
                    color="danger" 
                    variant="light" 
                    onClick={removeVideo}
                    disabled={isProcessing}
                    className="hover:bg-red-50 text-red-550 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                
                {/* Local preview player */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-200">
                  <video src={selectedVideo.localUrl} className="w-full h-full object-contain" controls muted />
                </div>
              </div>
            )}
          </Card>

          {/* 2. Audio Upload Field */}
          <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 mb-3 flex items-center gap-1.5">
              <Music size={14} className="text-emerald-500" /> 2. Upload Audio track
            </h3>
            
            <input 
              type="file"
              ref={audioInputRef}
              onChange={handleAudioChange}
              accept="audio/*"
              className="hidden"
            />
            
            {!selectedAudio ? (
              <div 
                onClick={() => audioInputRef.current?.click()}
                className="border border-dashed border-slate-200 hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer bg-slate-50/30 hover:bg-slate-100/10 transition-all duration-200"
              >
                <Upload size={18} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Click to select audio track</p>
                <p className="text-[10px] text-slate-400 mt-1">Supports MP3, WAV, AAC, M4A</p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedAudio.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Size: {selectedAudio.size}</p>
                  </div>
                  <Button 
                    isIconOnly 
                    size="sm" 
                    color="danger" 
                    variant="light" 
                    onClick={removeAudio}
                    disabled={isProcessing}
                    className="hover:bg-red-50 text-red-550 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                
                {/* Local audio player */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <audio src={selectedAudio.localUrl} className="w-full" controls />
                </div>
              </div>
            )}
          </Card>

          {/* 3. Adaptation Options */}
          <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
              ⚙️ 3. Audio Duration Adaptation
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Trim */}
              <div 
                onClick={() => !isProcessing && setAdaptationType('trim')}
                className={`border p-4 rounded-2xl cursor-pointer transition-all ${
                  adaptationType === 'trim' 
                    ? 'border-violet-500 bg-violet-50/50' 
                    : 'border-slate-200 bg-slate-50/30 hover:border-slate-350'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    checked={adaptationType === 'trim'} 
                    onChange={() => {}}
                    className="mt-1 accent-violet-600" 
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-850">Trim Audio to Fit (Cut)</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">
                      If the audio is longer than the video, it will cut off exactly when the video ends. If it is shorter, it will stop playing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2: Speed fit */}
              <div 
                onClick={() => !isProcessing && setAdaptationType('speed')}
                className={`border p-4 rounded-2xl cursor-pointer transition-all ${
                  adaptationType === 'speed' 
                    ? 'border-violet-500 bg-violet-50/50' 
                    : 'border-slate-200 bg-slate-50/30 hover:border-slate-350'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    checked={adaptationType === 'speed'} 
                    onChange={() => {}}
                    className="mt-1 accent-violet-600" 
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-850">Fit Speed to Sync Video (Tempo Scaling)</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">
                      Automatically speeds up or slows down the audio track using FFmpeg tempo filters to align its pacing precisely to the video length.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              color="secondary"
              size="lg"
              onClick={handleProcess}
              isLoading={isProcessing}
              disabled={!selectedVideo || !selectedAudio || isProcessing}
              className="w-full font-bold shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 py-6 mt-2 rounded-xl text-white"
              endContent={!isProcessing && <Sparkles size={18} />}
            >
              {isProcessing ? 'Binding Audio track...' : 'Process & Bind Audio'}
            </Button>
          </Card>
        </div>

        {/* RIGHT COLUMN: PREVIEW & LIVE PROGRESS BAR */}
        <div className="md:col-span-5 flex flex-col gap-6 justify-start">
          
          {/* Progress Card */}
          {isProcessing && (
            <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl space-y-4 text-center border border-slate-100">
              <div className="h-14 w-14 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto border border-violet-100 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-violet-600 animate-spin" />
                <Music size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-850">Binding Audio</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Stripping native track and writing new segment...</p>
              </div>

              <div className="space-y-1">
                <ProgressBar value={processProgress} className="w-full">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Progress</span>
                    <ProgressBar.Output className="font-bold text-violet-600" />
                  </div>
                  <ProgressBar.Track className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <ProgressBar.Fill className="h-full bg-violet-600 rounded-full transition-all duration-300" />
                  </ProgressBar.Track>
                </ProgressBar>
                <p className="text-[10px] text-slate-500 truncate italic font-medium mt-1.5">
                  &gt; {statusMessage}
                </p>
              </div>
            </Card>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs font-semibold flex gap-2 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Success Merged Preview Player */}
          {outputFilename && !isProcessing && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
                📺 Preview Synced Output
              </h3>
              
              {/* Vertical Simulator Video Container */}
              <div className="shorts-container relative border border-slate-200 rounded-3xl overflow-hidden shadow-md max-w-[280px] mx-auto">
                <video
                  src={finalVideoUrl}
                  className="w-full h-full object-cover"
                  controls
                  loop
                  autoPlay
                />
              </div>

              <Card className="glow-card border-none bg-white p-5 shadow-md rounded-3xl border border-slate-100">
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-150 rounded-xl p-3 flex gap-2 text-green-600 text-xs font-semibold">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                    <span>Audio binding complete!</span>
                  </div>
                  
                  <div className="text-[11px] font-mono text-slate-500 bg-slate-55 p-2.5 rounded-lg border border-slate-200/80">
                    💾 File: <span className="text-slate-800">{outputFilename}</span>
                  </div>

                  <a 
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 text-white bg-emerald-600 hover:bg-emerald-700 py-3 rounded-xl transition duration-200 text-sm"
                  >
                    <Download size={18} /> Download Synced Video
                  </a>
                </div>
              </Card>
            </div>
          )}

          {/* Placeholder Board */}
          {!outputFilename && !isProcessing && (
            <Card className="border border-slate-200 bg-white shadow-sm p-8 text-center rounded-3xl">
              <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-500 border border-slate-100">
                <Music size={20} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Replacement Panel</h4>
              <p className="text-xs text-slate-400 max-w-[240px] mx-auto mt-1 leading-relaxed">
                Add video and audio tracks, choose your duration sync options, and trigger the compilation to see preview.
              </p>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
