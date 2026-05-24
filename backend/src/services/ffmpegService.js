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
      // NOTE: Subtitles are intentionally NOT burned in — clean cinematic output
      const filter = `scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30`;
      
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
          let filter = `[1:a]volume=0.22[bg];[bg][0:a]sidechaincompress=threshold=0.08:ratio=15:attack=10:release=150[ducked];[0:a][ducked]amix=inputs=2:duration=first[a]`;
          
          if (ctaDuration > 0) {
            const startTime = Math.max(0, totalDuration - ctaDuration);
            // Linearly increase the background music volume from 0.22 to 0.38 starting at the CTA scene start time
            const volumeExpr = `if(gte(t,${startTime}),min(0.38,0.22+(t-${startTime})*0.1),0.22)`;
            filter = `[1:a]volume='${volumeExpr}':eval=frame[bg];[bg][0:a]sidechaincompress=threshold=0.08:ratio=15:attack=10:release=150[ducked];[0:a][ducked]amix=inputs=2:duration=first[a]`;
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
  }
};

export default ffmpegService;
