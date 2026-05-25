'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, BACKEND_URL } from '../store/appStore';
import { Card, Button, ProgressBar, Input } from '@heroui/react';
import {
  Music, Upload, Play, Pause, Trash2,
  Download, Sparkles, Check, AlertTriangle, Scissors
} from 'lucide-react';
import axios from 'axios';

export default function TrimAudio() {
  const { token } = useAppStore();
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  const [selectedAudio, setSelectedAudio] = useState(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [isPlayingRange, setIsPlayingRange] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [outputFilename, setOutputFilename] = useState('');

  // Auto monitor time updates to bound playback within [startTime, endTime]
  useEffect(() => {
    const player = audioRef.current;
    if (!player) return;

    const checkTime = () => {
      if (isPlayingRange && player.currentTime >= endTime) {
        player.pause();
        setIsPlayingRange(false);
      }
    };

    player.addEventListener('timeupdate', checkTime);
    return () => {
      player.removeEventListener('timeupdate', checkTime);
    };
  }, [isPlayingRange, endTime]);

  const handleFileChange = (e) => {
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
        setOutputFilename('');
        setStartTime(0);
        setDuration(0);
        setEndTime(0);
      } else {
        setErrorMsg('Please select a valid audio file.');
      }
    }
  };

  const handleMetadataLoaded = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
      setDuration(dur);
      setEndTime(dur);
    }
  };

  const handleStartChange = (val) => {
    const parsed = Math.max(0, Math.min(val, duration - 0.1));
    setStartTime(parsed);
    if (endTime <= parsed) {
      setEndTime(Math.min(parsed + 1, duration));
    }
    // Stop range play if adjustments are made to keep sync
    stopRangePlay();
  };

  const handleEndChange = (val) => {
    const parsed = Math.max(startTime + 0.1, Math.min(val, duration));
    setEndTime(parsed);
    stopRangePlay();
  };

  const toggleRangePlay = () => {
    const player = audioRef.current;
    if (!player) return;

    if (isPlayingRange) {
      player.pause();
      setIsPlayingRange(false);
    } else {
      player.currentTime = startTime;
      player.play();
      setIsPlayingRange(true);
    }
  };

  const stopRangePlay = () => {
    const player = audioRef.current;
    if (player && isPlayingRange) {
      player.pause();
      setIsPlayingRange(false);
    }
  };

  const removeAudio = () => {
    if (selectedAudio) {
      URL.revokeObjectURL(selectedAudio.localUrl);
      setSelectedAudio(null);
    }
    setOutputFilename('');
    setStartTime(0);
    setEndTime(0);
    setDuration(0);
    setIsPlayingRange(false);
  };

  const handleTrim = async () => {
    if (!selectedAudio) return;

    setIsProcessing(true);
    setErrorMsg('');
    setProcessProgress(20);
    setStatusMessage('Uploading track to media engine...');

    const formData = new FormData();
    formData.append('audio', selectedAudio.file);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);

    try {
      // Mock progress
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const API_URL = `${BACKEND_URL}/api`;
      setStatusMessage('Extracting audio segment via FFmpeg...');

      const res = await axios.post(`${API_URL}/trim-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);
      setProcessProgress(100);
      setStatusMessage('Trimming complete!');
      setOutputFilename(res.data.filename);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'An error occurred while trimming.');
      setProcessProgress(0);
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Duration formatting (MM:SS.ms)
  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00.00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    const ms = Math.floor((secs % 1) * 100).toString().padStart(2, '0');
    return `${m}:${s}.${ms}`;
  };

  const finalAudioUrl = outputFilename
    ? `${BACKEND_URL}/api/assets/merged/${outputFilename}?token=${token}`
    : '';

  const downloadUrl = finalAudioUrl ? `${finalAudioUrl}&download=true` : '';

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Header card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-slate-800 flex items-center gap-2">
            <Scissors className="text-violet-600 animate-pulse" />
            Trim Audio
          </h1>
          <p className="text-slate-500 text-sm">
            Upload any audio track, select start and end timestamps, preview the range live, and download trimmed file.
          </p>
        </div>
        {selectedAudio && (
          <Button
            variant="bordered"
            onClick={removeAudio}
            disabled={isProcessing}
            className="text-slate-500 border-slate-200 hover:border-red-500/40 hover:text-red-600 font-semibold"
          >
            Clear Screen
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* LEFT COLUMN: AUDIO UPLOAD AND RANGE BOUNDS */}
        <div className="md:col-span-7 space-y-6">

          {/* Uploader Card */}
          <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />

            {!selectedAudio ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-200 hover:border-violet-500/50 rounded-xl p-8 text-center cursor-pointer bg-slate-50/30 hover:bg-slate-100/10 transition-all duration-200"
              >
                <Upload size={22} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-bold text-slate-700">Click to select audio file</p>
                <p className="text-xs text-slate-400 mt-1">Supports MP3, WAV, AAC, M4A, OGG</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-3">
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 truncate">{selectedAudio.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Size: {selectedAudio.size} • Duration: {formatTime(duration)}
                    </p>
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

                {/* Hidden Audio Player for extraction and metadata */}
                <audio
                  ref={audioRef}
                  src={selectedAudio.localUrl}
                  onLoadedMetadata={handleMetadataLoaded}
                  className="hidden"
                />

                {/* Range Sliders */}
                {duration > 0 && (
                  <div className="space-y-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Adjust Range Bounds</h4>

                    {/* Start Time slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Start Timestamp</span>
                        <span className="text-violet-650 font-bold">{formatTime(startTime)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.05"
                        value={startTime}
                        onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-650"
                      />
                    </div>

                    {/* End Time slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">End Timestamp</span>
                        <span className="text-violet-650 font-bold">{formatTime(endTime)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.05"
                        value={endTime}
                        onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-650"
                      />
                    </div>

                    {/* Trim info ledger */}
                    <div className="flex justify-between items-center text-xs border-t border-slate-200/80 pt-3">
                      <span className="text-slate-500">Trimmed Output Length:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatTime(Math.max(0, endTime - startTime))}
                      </span>
                    </div>

                    {/* Preview Player button */}
                    <Button
                      size="sm"
                      onClick={toggleRangePlay}
                      className={`w-full font-bold transition-all border ${isPlayingRange
                        ? 'bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100 rounded-xl'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-350 rounded-xl'
                        }`}
                      endContent={isPlayingRange ? <Pause size={14} /> : <Play size={14} />}
                    >
                      {isPlayingRange ? 'Pause Range Preview' : 'Play Trimmed Range Preview'}
                    </Button>
                  </div>
                )}

                <Button
                  color="secondary"
                  size="lg"
                  onClick={handleTrim}
                  isLoading={isProcessing}
                  disabled={isProcessing || duration === 0 || endTime <= startTime}
                  className="w-full font-bold shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700 py-6 rounded-xl text-white"
                  endContent={!isProcessing && <Scissors size={18} />}
                >
                  {isProcessing ? 'Processing Trim on FFmpeg...' : 'Trim & Compile Audio File'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: PROGRESS AND DOWNLOAD PLAYER */}
        <div className="md:col-span-5 flex flex-col gap-6 justify-start">

          {/* Progress Card */}
          {isProcessing && (
            <Card className="glow-card border-none bg-white p-6 shadow-md rounded-3xl space-y-4 text-center border border-slate-100">
              <div className="h-14 w-14 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mx-auto border border-violet-100 relative">
                <div className="absolute inset-0 rounded-full border-t-2 border-violet-600 animate-spin" />
                <Scissors size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-850">Trimming Audio</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Extracting requested range bounds losslessly...</p>
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

          {/* Error Board */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs font-semibold flex gap-2 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Success Download Card */}
          {outputFilename && !isProcessing && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-400 uppercase tracking-wider flex items-center gap-2">
                🎵 Play Trimmed Segment
              </h3>

              <Card className="glow-card border-none bg-white p-5 shadow-md rounded-3xl border border-slate-100 space-y-4">
                <div className="bg-green-50 border border-green-150 rounded-xl p-3 flex gap-2 text-green-600 text-xs font-semibold">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-green-500" />
                  <span>Audio trim operation successful!</span>
                </div>

                {/* Audio player for final trimmed segment */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <audio src={finalAudioUrl} className="w-full" controls autoPlay />
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
                  <Download size={18} /> Download Trimmed Audio
                </a>
              </Card>
            </div>
          )}

          {/* Placeholder Board */}
          {!outputFilename && !isProcessing && (
            <Card className="border border-slate-200 bg-white shadow-sm p-8 text-center rounded-3xl">
              <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-500 border border-slate-100">
                <Music size={20} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Trimmer Dashboard</h4>
              <p className="text-xs text-slate-400 max-w-[240px] mx-auto mt-1 leading-relaxed">
                Add an audio track and slide the range bars to define your boundaries. Click compile to generate the trimmed file.
              </p>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
