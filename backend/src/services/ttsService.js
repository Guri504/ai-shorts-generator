import { exec, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ffmpegService } from './ffmpegService.js';
import { processRegistry } from '../utils/processRegistry.js';

// Resolve helper path relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HELPER_PATH = path.join(__dirname, 'edge_tts_helper.py');

// Voice list map
const VOICE_MAP = {
  'hindi-male': 'hi-IN-MadhurNeural',
  'hindi-female': 'hi-IN-SwaraNeural',
  'english-male': 'en-US-GuyNeural',
  'english-female': 'en-US-AriaNeural',
  'hinglish-male': 'hi-IN-MadhurNeural',
  'hinglish-female': 'hi-IN-SwaraNeural'
};

// Robust dynamic Python path resolver
let resolvedPythonPath = 'python'; // default fallback
const findPython = () => {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' ? 'where.exe python' : 'which python3 || which python';
    exec(cmd, (err, stdout) => {
      if (!err && stdout) {
        const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        // Filter out Windows Store stub launchers (which contain "WindowsApps")
        const realPython = lines.find(line => {
          if (process.platform === 'win32') {
            return !line.toLowerCase().includes('windowsapps');
          }
          return true;
        });
        if (realPython) {
          console.log(`[TTS Service] Successfully resolved real Python path: ${realPython}`);
          resolve(realPython);
          return;
        }
      }
      resolve(process.platform === 'win32' ? 'python' : 'python3');
    });
  });
};

const pythonPathPromise = findPython().then(p => {
  resolvedPythonPath = p;
  return p;
});

export const ttsService = {
  _voicesCache: null,

  /**
   * Synthesize text to speech and get word-level timings
   * @param {string} text - text to synthesize
   * @param {string} voiceNameOrKey - voice name (e.g. 'hi-IN-MadhurNeural') or preset key
   * @param {string} outputPath - file path to save MP3
   * @param {Object} options - voice configurations (speed, pitch, volume)
   * @returns {Promise<{audioPath: string, wordTimings: Array}>}
   */
  async synthesize(text, voiceNameOrKey = 'hi-IN-MadhurNeural', outputPath, options = {}) {
    const pythonPath = await pythonPathPromise;
    
    // Resolve legacy preset keys to full neural voice names
    let voiceName = VOICE_MAP[voiceNameOrKey] || voiceNameOrKey;
    
    // Default legacy mapping fallback
    if (!voiceName.includes('-')) {
      voiceName = 'hi-IN-MadhurNeural';
    }

    // Convert speed (e.g. 1.15) to percentage offset rate string (e.g. "+15%")
    let rateStr = '+5%'; // Legacy default was +5%
    if (options.rate !== undefined) {
      rateStr = options.rate;
    } else if (options.speed !== undefined) {
      const speedVal = parseFloat(options.speed);
      if (!isNaN(speedVal)) {
        const pct = Math.round((speedVal - 1.0) * 100);
        rateStr = pct >= 0 ? `+${pct}%` : `${pct}%`;
      }
    }

    const pitchStr = options.pitch || '+0Hz';
    const volumeStr = options.volume || '+0%';
    const tempJsonPath = outputPath.replace(/\.mp3$/i, '_timings.json');

    return new Promise((resolve, reject) => {
      console.log(`[TTS Service] Spawning Python edge-tts for voice "${voiceName}" with rate="${rateStr}" pitch="${pitchStr}" volume="${volumeStr}"...`);
      
      const proc = execFile(
        pythonPath, 
        [HELPER_PATH, text, voiceName, outputPath, tempJsonPath, rateStr, pitchStr, volumeStr], 
        { timeout: 35000 }, 
        async (err, stdout, stderr) => {
          if (err) {
            console.error('[TTS Service] Python invocation failed:', stderr || stdout || err.message);
            reject(new Error(`TTS generation failed: ${stderr || err.message}`));
            return;
          }

          if (stdout.includes('ERROR:')) {
            console.error('[TTS Service] Helper script reported error:', stdout);
            reject(new Error(`TTS helper reported error: ${stdout.trim()}`));
            return;
          }

          try {
            if (!fs.existsSync(outputPath)) {
              throw new Error('TTS finished but output MP3 was not created.');
            }

            let wordTimings = [];
            
            if (fs.existsSync(tempJsonPath)) {
              try {
                // Parse timings JSON from Python script
                const rawTimings = JSON.parse(fs.readFileSync(tempJsonPath, 'utf-8'));
                
                // Map ticks (100ns units) to milliseconds
                wordTimings = rawTimings
                  .filter(item => item.offset !== null && item.duration !== null)
                  .map((item) => {
                    const startMs = Math.round(item.offset / 10000);
                    const durationMs = Math.round(item.duration / 10000);
                    return {
                      word: item.text,
                      startMs,
                      durationMs,
                      endMs: startMs + durationMs
                    };
                  });
              } catch (jsonErr) {
                console.warn('[TTS Service] Failed parsing timings JSON, falling back to estimation:', jsonErr.message);
              } finally {
                // Cleanup temp JSON timings file
                try {
                  fs.unlinkSync(tempJsonPath);
                } catch (e) {}
              }
            }

            // FALLBACK: If word boundaries are missing, estimate linearly based on character lengths
            if (wordTimings.length === 0) {
              console.log('[TTS Service] No word boundaries returned from API. Applying character-length linear estimator...');
              
              // Clean text and split by space into words
              const cleanText = text.replace(/[.,!?;:]/g, '');
              const words = cleanText.split(/\s+/).filter(w => w.length > 0);
              
              if (words.length > 0) {
                const audioDuration = await ffmpegService.getDuration(outputPath); // in seconds
                const totalDurationMs = Math.round(audioDuration * 1000);
                
                const totalChars = words.reduce((sum, w) => sum + w.length, 0);
                const msPerChar = totalDurationMs / totalChars;
                
                let currentMs = 0;
                wordTimings = words.map((w, idx) => {
                  const durationMs = Math.round(w.length * msPerChar);
                  const startMs = currentMs;
                  currentMs += durationMs;
                  
                  // Adjust last word to match exact end of audio
                  const endMs = idx === words.length - 1 ? totalDurationMs : currentMs;
                  
                  return {
                    word: w,
                    startMs,
                    durationMs: endMs - startMs,
                    endMs
                  };
                });
              }
            }

            console.log(`[TTS Service] Generated ${wordTimings.length} word timing points.`);

            resolve({
              audioPath: outputPath,
              wordTimings
            });
          } catch (parseErr) {
            reject(parseErr);
          }
        }
      );

      processRegistry.register(proc);
    });
  },

  /**
   * Fetches available voices, filters and enriches them
   * @returns {Promise<Array>}
   */
  async getVoices() {
    if (this._voicesCache) {
      return this._voicesCache;
    }
    
    const pythonPath = await pythonPathPromise;
    return new Promise((resolve) => {
      console.log(`[TTS Service] Fetching available voices from edge-tts...`);
      execFile(pythonPath, [HELPER_PATH, '--list-voices'], { timeout: 15000 }, (err, stdout, stderr) => {
        if (err) {
          console.warn('[TTS Service] Failed to fetch voices dynamically, using static fallback:', err.message || stderr);
          resolve(this._getStaticVoicesFallback());
          return;
        }
        
        try {
          const rawVoices = JSON.parse(stdout.trim());
          const enhanced = this._enhanceAndFilterVoices(rawVoices);
          this._voicesCache = enhanced;
          resolve(enhanced);
        } catch (parseErr) {
          console.warn('[TTS Service] Failed parsing voices list, using static fallback:', parseErr.message);
          resolve(this._getStaticVoicesFallback());
        }
      });
    });
  },

  _enhanceAndFilterVoices(rawVoices) {
    return rawVoices.map(v => {
      const shortName = v.ShortName || v.Name;
      const rec = RECOMMENDED_VOICES[shortName];
      
      let lang = 'Other';
      if (shortName.startsWith('hi-IN')) lang = 'Hindi';
      else if (shortName.startsWith('en-IN')) lang = 'English (IN)';
      else if (shortName.startsWith('en-US')) lang = 'English (US)';
      else if (shortName.startsWith('en-GB')) lang = 'English (UK)';
      else if (shortName.startsWith('en-')) lang = 'English';
      
      // Clean display name
      let displayName = rec?.displayName || v.FriendlyName || shortName;
      displayName = displayName
        .replace('Microsoft Server Speech Text to Speech Voice', '')
        .replace('Online (Natural)', '')
        .replace('Neural', '')
        .trim();
        
      const tags = rec?.tags || [];
      if (lang === 'Hindi' || lang === 'English (IN)') {
        tags.push('Hinglish-Compatible', 'Punjabi-Compatible');
      }
      
      return {
        name: shortName,
        shortName: shortName,
        displayName: displayName,
        gender: v.Gender,
        locale: v.Locale,
        language: lang,
        tags: [...new Set(tags)],
        description: rec?.description || `Standard Edge TTS voice in ${v.Locale}.`,
        suggestedCodec: v.SuggestedCodec || 'mp3'
      };
    });
  },

  _getStaticVoicesFallback() {
    const fallbacks = [
      { ShortName: 'hi-IN-MadhurNeural', FriendlyName: 'Madhur', Gender: 'Male', Locale: 'hi-IN' },
      { ShortName: 'hi-IN-SwaraNeural', FriendlyName: 'Swara', Gender: 'Female', Locale: 'hi-IN' },
      { ShortName: 'en-IN-PrabhatNeural', FriendlyName: 'Prabhat', Gender: 'Male', Locale: 'en-IN' },
      { ShortName: 'en-IN-NeerjaNeural', FriendlyName: 'Neerja', Gender: 'Female', Locale: 'en-IN' },
      { ShortName: 'en-IN-NeerjaExpressiveNeural', FriendlyName: 'Neerja Expressive', Gender: 'Female', Locale: 'en-IN' },
      { ShortName: 'en-US-GuyNeural', FriendlyName: 'Guy', Gender: 'Male', Locale: 'en-US' },
      { ShortName: 'en-US-AriaNeural', FriendlyName: 'Aria', Gender: 'Female', Locale: 'en-US' },
      { ShortName: 'en-US-JennyNeural', FriendlyName: 'Jenny', Gender: 'Female', Locale: 'en-US' },
      { ShortName: 'en-US-AvaNeural', FriendlyName: 'Ava', Gender: 'Female', Locale: 'en-US' },
      { ShortName: 'en-US-AndrewNeural', FriendlyName: 'Andrew', Gender: 'Male', Locale: 'en-US' },
      { ShortName: 'en-GB-SoniaNeural', FriendlyName: 'Sonia', Gender: 'Female', Locale: 'en-GB' },
      { ShortName: 'en-GB-RyanNeural', FriendlyName: 'Ryan', Gender: 'Male', Locale: 'en-GB' }
    ];
    return this._enhanceAndFilterVoices(fallbacks);
  }
};

// Curated list of recommended premium neural voices
const RECOMMENDED_VOICES = {
  'hi-IN-MadhurNeural': {
    displayName: 'Madhur (Hindi)',
    language: 'Hindi',
    tags: ['Recommended', 'Cinematic', 'Storytelling', 'Hinglish-Compatible', 'Punjabi-Compatible'],
    description: 'Deep, clear male voice, perfect for storytelling, history, and facts.'
  },
  'hi-IN-SwaraNeural': {
    displayName: 'Swara (Hindi)',
    language: 'Hindi',
    tags: ['Recommended', 'Conversational', 'Sweet', 'Hinglish-Compatible', 'Punjabi-Compatible'],
    description: 'Sweet, natural female voice, great for educational content and self-improvement.'
  },
  'en-IN-PrabhatNeural': {
    displayName: 'Prabhat (English India)',
    language: 'English (IN)',
    tags: ['Recommended', 'Professional', 'Hinglish-Compatible', 'Punjabi-Compatible'],
    description: 'Confident Indian male voice with clear accent, great for technology or tutorial content.'
  },
  'en-IN-NeerjaNeural': {
    displayName: 'Neerja (English India)',
    language: 'English (IN)',
    tags: ['Recommended', 'Clear', 'Corporate', 'Hinglish-Compatible', 'Punjabi-Compatible'],
    description: 'Clear and pleasant Indian female voice, ideal for explanations.'
  },
  'en-IN-NeerjaExpressiveNeural': {
    displayName: 'Neerja Expressive (English India)',
    language: 'English (IN)',
    tags: ['Recommended', 'Storytelling', 'Emotional'],
    description: 'Dynamic and highly expressive variation of Neerja.'
  },
  'en-US-GuyNeural': {
    displayName: 'Guy (English US)',
    language: 'English (US)',
    tags: ['Recommended', 'Cinematic', 'Deep', 'Storytelling'],
    description: 'Deep, resonant American male voice, excellent for movie recaps, horror, and motivation.'
  },
  'en-US-AriaNeural': {
    displayName: 'Aria (English US)',
    language: 'English (US)',
    tags: ['Recommended', 'Bright', 'Energetic', 'Facts'],
    description: 'Energetic American female voice, ideal for fast facts and top 10 lists.'
  },
  'en-US-JennyNeural': {
    displayName: 'Jenny (English US)',
    language: 'English (US)',
    tags: ['Recommended', 'Conversational', 'Warm', 'Friendly'],
    description: 'Warm and friendly female voice, very natural tone.'
  },
  'en-US-AvaNeural': {
    displayName: 'Ava (English US)',
    language: 'English (US)',
    tags: ['Clear', 'Narrator'],
    description: 'Crisp, clear, and professional narration voice.'
  },
  'en-US-AndrewNeural': {
    displayName: 'Andrew (English US)',
    language: 'English (US)',
    tags: ['Energetic', 'Conversational'],
    description: 'Friendly male voice, good for marketing, tech, and tutorials.'
  },
  'en-GB-SoniaNeural': {
    displayName: 'Sonia (English UK)',
    language: 'English (UK)',
    tags: ['Recommended', 'Elegant', 'Corporate'],
    description: 'Elegant British female voice with corporate style.'
  },
  'en-GB-RyanNeural': {
    displayName: 'Ryan (English UK)',
    language: 'English (UK)',
    tags: ['Recommended', 'Deep', 'Narrator'],
    description: 'Resonant and professional British male voice.'
  }
};

export default ttsService;
