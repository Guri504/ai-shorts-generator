import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { env } from '../config/env.js';
import { processRegistry } from '../utils/processRegistry.js';

// Public royalty-free music tracks (SoundHelix provides public high-quality testing tracks)
const MUSIC_URLS = {
  hype: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  cinematic: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  tech: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  emotional: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  calm: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
};

export const ffmpegService = {
  /**
   * Probes duration of an audio/video file in seconds
   */
  async getDuration(filePath) {
    return new Promise((resolve, reject) => {
      const escapedPath = filePath.replace(/\\/g, '/');
      const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${escapedPath}"`;
      
      const child = exec(cmd, (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          const duration = parseFloat(stdout.trim());
          resolve(isNaN(duration) ? 0 : duration);
        }
      });
      processRegistry.register(child);
    });
  },

  /**
   * Downloads background music to cache folder
   */
  async getBackgroundMusic(genre) {
    const cleanGenre = genre.toLowerCase().trim();
    const url = MUSIC_URLS[cleanGenre] || MUSIC_URLS.cinematic;
    const destPath = path.join(env.paths.cache, `music_${cleanGenre}.mp3`);

    if (fs.existsSync(destPath)) {
      return destPath;
    }

    try {
      console.log(`[FFmpeg Engine] Downloading background music for genre "${genre}"...`);
      const writer = fs.createWriteStream(destPath);
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 10000
      });

      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      return destPath;
    } catch (error) {
      console.warn(`[FFmpeg Engine] Music download failed, generating silent fallback track: ${error.message}`);
      await this.generateSilenceAudio(destPath, 60);
      return destPath;
    }
  },

  /**
   * Generates a silent MP3 file of N seconds duration
   */
  async generateSilenceAudio(destPath, duration = 60) {
    return new Promise((resolve, reject) => {
      const cmd = `ffmpeg -loglevel error -y -f lavfi -i "anullsrc=r=44100:cl=stereo" -t ${duration} -c:a libmp3lame "${destPath}"`;
      const child = exec(cmd, (err) => {
        if (err) reject(err);
        else resolve(destPath);
      });
      processRegistry.register(child);
    });
  },

  /**
   * Helper to escape subtitle file paths for FFmpeg filtergraph
   */
  _escapeSubPath(p) {
    if (!p) return '';
    let esc = p.replace(/\\/g, '/');
    esc = esc.replace(/:/g, '\\:');
    esc = esc.replace(/'/g, "'\\''");
    return esc;
  },

  /**
   * Scales, crops, overlays voice audio, and burns subtitles into a scene video
   * @param {string} rawVideoPath 
   * @param {string} voiceAudioPath 
   * @param {string} subPath - Path to ASS subtitle file
   * @param {string} outputPath 
   * @param {number} duration - Scene duration in seconds
   */
  async compileScene(rawVideoPath, voiceAudioPath, subPath, outputPath, duration) {
    return new Promise((resolve, reject) => {
      // Escape paths for Windows command line and FFmpeg filtergraph
      const escVideo = rawVideoPath.replace(/\\/g, '/');
      const escAudio = voiceAudioPath.replace(/\\/g, '/');
      const escOut = outputPath.replace(/\\/g, '/');

      // FFmpeg filter chain:
      // 1. scale=720:1280:force_original_aspect_ratio=increase
      // 2. crop=720:1280
      // 3. fps=30 — normalize frame rate across all clips to prevent freezing on concat
      // 4. subtitles — burn subtitles into video track
      let filter = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30`;
      
      // Compile command with -loglevel error and fast settings
      const cmd = `ffmpeg -loglevel error -y -stream_loop -1 -i "${escVideo}" -i "${escAudio}" -vf "${filter}" -c:v libx264 -preset ultrafast -threads 0 -c:a aac -map 0:v -map 1:a -t ${duration} -pix_fmt yuv420p "${escOut}"`;

      console.log(`[FFmpeg Engine] Rendering Scene with duration ${duration}s...`);
      const child = exec(cmd, (err) => {
        if (err) {
          console.error('[FFmpeg Engine] Failed compiling scene:', err);
          reject(err);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  },

  /**
   * Concatenates rendered scene videos and mixes ducked background music
   * @param {Array<string>} scenePaths - list of compiled scene video paths
   * @param {string} musicPath - path to bg music MP3
   * @param {string} finalOutputPath - where to save final 9:16 short
   * @param {number} ctaDuration - duration of the Call To Action ending scene in seconds
   */
  async mergeAndMixMusic(scenePaths, musicPath, finalOutputPath, ctaDuration = 0) {
    const tempDir = env.paths.cache;
    const listFilePath = path.join(tempDir, `concat_${Date.now()}.txt`);
    const tempMergedPath = path.join(tempDir, `merged_${Date.now()}.mp4`);

    // 1. Create concat text file listing all scene video paths
    const fileContent = scenePaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listFilePath, fileContent, 'utf-8');

    return new Promise((resolve, reject) => {
      // Concatenate files without re-encoding
      const concatCmd = `ffmpeg -loglevel error -y -f concat -safe 0 -i "${listFilePath}" -c copy "${tempMergedPath}"`;
      
      console.log('[FFmpeg Engine] Stitching scenes together...');
      const child1 = exec(concatCmd, async (err) => {
        // Cleanup list file
        try { fs.unlinkSync(listFilePath); } catch (e) {}

        if (err) {
          console.error('[FFmpeg Engine] Concat failed:', err);
          reject(err);
          return;
        }

        try {
          // Get total duration of the merged video
          const totalDuration = await this.getDuration(tempMergedPath);
          console.log(`[FFmpeg Engine] Concat successful. Total duration: ${totalDuration}s. Mixing background music (CTA duration: ${ctaDuration}s)...`);

          // 2. Mix background music with voice sidechain ducking!
          const escMerged = tempMergedPath.replace(/\\/g, '/');
          const escMusic = musicPath.replace(/\\/g, '/');
          const escFinal = finalOutputPath.replace(/\\/g, '/');

          // If CTA is enabled, fade up the background music over the course of the CTA scene
          // Also apply a smooth fade-out (afade) to all audio tracks at the end of the short
          let filter = `[1:a]volume=0.18[bg];[bg][0:a]sidechaincompress=threshold=0.07:ratio=18:attack=10:release=150[ducked];[0:a][ducked]amix=inputs=2:duration=first,afade=t=out:st=${totalDuration - 1.5}:d=1.5[a]`;
          
          if (ctaDuration > 0) {
            const startTime = Math.max(0, totalDuration - ctaDuration);
            // Dynamic gain adjustment: increase background music from 0.18 to 0.40 during CTA scene, then fade out at the end
            const volumeExpr = `if(gte(t,${startTime}),min(0.40,0.18+(t-${startTime})*0.12),0.18)`;
            filter = `[1:a]volume='${volumeExpr}':eval=frame[bg];[bg][0:a]sidechaincompress=threshold=0.07:ratio=18:attack=10:release=150[ducked];[0:a][ducked]amix=inputs=2:duration=first,afade=t=out:st=${totalDuration - 1.5}:d=1.5[a]`;
          }

          // Run final compile: copy video, re-encode audio using sidechain filter
          const finalCmd = `ffmpeg -loglevel error -y -i "${escMerged}" -i "${escMusic}" -filter_complex "${filter}" -map 0:v -map "[a]" -t ${totalDuration} -c:v copy -c:a aac -b:a 192k "${escFinal}"`;

          const child2 = exec(finalCmd, (mixErr) => {
            // Cleanup temp merged file
            try { fs.unlinkSync(tempMergedPath); } catch (e) {}

            if (mixErr) {
              console.error('[FFmpeg Engine] Music mixing failed:', mixErr);
              reject(mixErr);
            } else {
              console.log(`[FFmpeg Engine] Final Shorts Export Complete: ${finalOutputPath}`);
              resolve(finalOutputPath);
            }
          });
          processRegistry.register(child2);
        } catch (e) {
          reject(e);
        }
      });
      processRegistry.register(child1);
    });
  },

  /**
   * Extracts a thumbnail frame from a video at 1s timestamp (with 0s fallback)
   */
  async extractThumbnail(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
      const escIn = videoPath.replace(/\\/g, '/');
      const escOut = outputPath.replace(/\\/g, '/');
      
      // Try at 1.0 second offset for a better action frame
      const cmd = `ffmpeg -loglevel error -y -ss 00:00:01 -i "${escIn}" -vframes 1 -q:v 2 "${escOut}"`;
      
      const child1 = exec(cmd, (err) => {
        if (err) {
          // Fallback to 0.0s if 1.0s fails (e.g. video is under 1 second)
          const fallbackCmd = `ffmpeg -loglevel error -y -ss 00:00:00 -i "${escIn}" -vframes 1 -q:v 2 "${escOut}"`;
          const child2 = exec(fallbackCmd, (fallbackErr) => {
            if (fallbackErr) {
              console.error('[FFmpeg Engine] Thumbnail extraction failed:', fallbackErr);
              reject(fallbackErr);
            } else {
              resolve(outputPath);
            }
          });
          processRegistry.register(child2);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child1);
    });
  },

  /**
   * Merges multiple video clips together with their respective audios using FFmpeg concat filter
   * @param {Array<string>} clipPaths - List of video clip paths to merge
   * @param {string} outputPath - Output path for the merged video
   */
  async mergeClips(clipPaths, outputPath) {
    if (!clipPaths || clipPaths.length === 0) {
      throw new Error('No clips provided for merging');
    }

    return new Promise((resolve, reject) => {
      // Escape all paths for Windows / FFmpeg
      const escPaths = clipPaths.map(p => p.replace(/\\/g, '/'));
      const escOut = outputPath.replace(/\\/g, '/');

      // Build inputs
      const inputArgs = escPaths.map(p => `-i "${p}"`).join(' ');

      // Build complex filter
      // For each input, we scale and crop to 720x1280 (vertical format), normalize fps to 30, and map audio.
      let filterChain = '';
      let concatInputs = '';

      escPaths.forEach((_, index) => {
        filterChain += `[${index}:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30[v${index}]; `;
        concatInputs += `[v${index}][${index}:a]`;
      });

      filterChain += `${concatInputs}concat=n=${escPaths.length}:v=1:a=1[v][a]`;

      const cmd = `ffmpeg -loglevel error -y ${inputArgs} -filter_complex "${filterChain}" -map "[v]" -map "[a]" -c:v libx264 -preset ultrafast -threads 0 -c:a aac -b:a 192k "${escOut}"`;

      console.log(`[FFmpeg Engine] Merging ${clipPaths.length} clips to: ${outputPath}`);
      const child = exec(cmd, (err) => {
        if (err) {
          console.error('[FFmpeg Engine] Failed merging clips:', err);
          reject(err);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  },

  /**
   * Replaces the audio track of a video file with a new audio file.
   * Discards the video's original audio.
   * If adaptationType is 'trim', the audio is truncated to the video duration.
   * If adaptationType is 'speed', the audio speed is adjusted to fit the video duration.
   */
  async replaceAudio(videoPath, audioPath, adaptationType, outputPath) {
    if (!videoPath || !audioPath) {
      throw new Error('Video and Audio paths are required');
    }

    const videoDuration = await this.getDuration(videoPath);
    if (videoDuration <= 0) {
      throw new Error('Could not retrieve video duration');
    }

    const escVideo = videoPath.replace(/\\/g, '/');
    const escAudio = audioPath.replace(/\\/g, '/');
    const escOut = outputPath.replace(/\\/g, '/');

    return new Promise((resolve, reject) => {
      let cmd = '';

      if (adaptationType === 'speed') {
        this.getDuration(audioPath).then(audioDuration => {
          if (audioDuration <= 0) {
            return reject(new Error('Could not retrieve audio duration'));
          }

          // Calculate speed factor
          const speedFactor = audioDuration / videoDuration;
          
          // Generate atempo chain (since atempo must be between 0.5 and 2.0)
          let remaining = speedFactor;
          const filters = [];
          while (remaining > 2.0) {
            filters.push('atempo=2.0');
            remaining /= 2.0;
          }
          while (remaining < 0.5) {
            filters.push('atempo=0.5');
            remaining /= 0.5;
          }
          if (remaining !== 1.0) {
            filters.push(`atempo=${remaining.toFixed(4)}`);
          }
          
          let filterExpr = '';
          if (filters.length > 0) {
            filterExpr = `-filter_complex "[1:a]${filters.join(',')}[aout]" -map "[aout]"`;
          } else {
            filterExpr = `-map 1:a:0`;
          }

          cmd = `ffmpeg -loglevel error -y -i "${escVideo}" -i "${escAudio}" ${filterExpr} -map 0:v:0 -c:v copy -c:a aac -b:a 192k -t ${videoDuration.toFixed(2)} "${escOut}"`;
          
          console.log(`[FFmpeg Engine] Speeding audio (factor ${speedFactor.toFixed(2)}x) to fit video of ${videoDuration.toFixed(2)}s...`);
          runCmd(cmd);
        }).catch(reject);
      } else {
        // Trim mode
        cmd = `ffmpeg -loglevel error -y -i "${escVideo}" -i "${escAudio}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest -t ${videoDuration.toFixed(2)} "${escOut}"`;
        
        console.log(`[FFmpeg Engine] Overlaying and trimming audio to video of ${videoDuration.toFixed(2)}s...`);
        runCmd(cmd);
      }

      function runCmd(command) {
        const child = exec(command, (err) => {
          if (err) {
            console.error('[FFmpeg Engine] Failed to replace audio:', err);
            reject(err);
          } else {
            resolve(outputPath);
          }
        });
        processRegistry.register(child);
      }
    });
  },

  /**
   * Losslessly trims an audio file to a specified segment range using stream copy
   * @param {string} audioPath - Source audio path
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {string} outputPath - Output file path
   */
  async trimAudio(audioPath, startTime, endTime, outputPath) {
    if (!audioPath) {
      throw new Error('Audio path is required');
    }

    const escAudio = audioPath.replace(/\\/g, '/');
    const escOut = outputPath.replace(/\\/g, '/');
    const duration = parseFloat(endTime) - parseFloat(startTime);

    if (isNaN(duration) || duration <= 0) {
      throw new Error('Invalid start or end timestamps');
    }

    return new Promise((resolve, reject) => {
      // Use stream copy for lossless and ultra-fast trimming
      const cmd = `ffmpeg -loglevel error -y -ss ${startTime} -to ${endTime} -i "${escAudio}" -c copy "${escOut}"`;

      console.log(`[FFmpeg Engine] Trimming audio segment from ${startTime}s to ${endTime}s (duration: ${duration}s)...`);
      const child = exec(cmd, (err) => {
        if (err) {
          console.error('[FFmpeg Engine] Failed to trim audio:', err);
          reject(err);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  }
};

export default ffmpegService;
