import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env.js';
import { processRegistry } from '../utils/processRegistry.js';
import { pollinationsService } from './pollinationsService.js';

// ============================================================
// Video Generation Service
// Generates cinematic AI video clips from visual prompts.
//
// Architecture:
//   1. Pollinations AI (free, no API key) → cinematic image
//   2. FFmpeg Ken Burns → converts image to smooth zoom/pan video
//   3. Animated gradient fallback if all generation fails
//
// Gemini is NOT used here — only for text generation in geminiService.js
// ============================================================

export const videoGenerationService = {
  /**
   * Generates a cinematic AI video clip from a visual prompt.
   *
   * Pipeline:
   *   1. Generate AI image via Pollinations (free, no API key)
   *   2. Convert static image → smooth cinematic Ken Burns video
   *   3. If Pollinations fails → animated gradient placeholder
   *
   * @param {string} visualPrompt - The descriptive visual prompt
   * @param {string} outputPath - Destination path for the MP4 video clip
   * @param {number} duration - Clip duration in seconds
   * @returns {string} outputPath
   */
  async generateClip(visualPrompt, outputPath, duration = 5) {
    const startTime = Date.now();
    const tempImageName = `ai_temp_${Date.now()}.jpg`;
    const tempImagePath = path.join(env.paths.cache, tempImageName);

    try {
      // Strategy 1: Pollinations AI image generation (free, unlimited)
      await pollinationsService.generateImage(visualPrompt, tempImagePath);

      // Convert the AI image to a cinematic zoom/pan video
      await this.convertImageToZoomVideo(tempImagePath, outputPath, duration);

      // Cleanup temp image
      try { fs.unlinkSync(tempImagePath); } catch {}

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[AI Clip Generator] Clip generated successfully in ${elapsed}s`);
      return outputPath;
    } catch (err) {
      console.warn(`[AI Clip Generator] Pollinations failed: ${err.message}. Using animated fallback.`);

      // Cleanup any partial temp file
      try { if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath); } catch {}
    }

    // Strategy 2: Animated gradient fallback
    console.log(`[AI Clip Generator] Generating cinematic animated fallback for: "${visualPrompt.substring(0, 60)}..."`);
    await this.generatePlaceholderVideo(visualPrompt, outputPath, duration);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AI Clip Generator] Fallback clip generated in ${elapsed}s`);
    return outputPath;
  },

  /**
   * Converts a 9:16 image into a cinematic video with smooth Ken Burns effect.
   *
   * Effects:
   *   - Slow zoom-in (2% per second) for subtle scale animation
   *   - Gentle vertical pan drift for parallax-like feeling
   *   - Smooth eased motion via FFmpeg filter expressions
   *   - 30fps output, yuv420p for universal compatibility
   *
   * @param {string} imagePath - Source image (720×1280 or similar)
   * @param {string} outputPath - Output MP4 path
   * @param {number} duration - Video duration in seconds
   */
  async convertImageToZoomVideo(imagePath, outputPath, duration = 5) {
    return new Promise((resolve, reject) => {
      const escapedImg = imagePath.replace(/\\/g, '/');
      const escapedOut = outputPath.replace(/\\/g, '/');

      // Cinematic Ken Burns filter:
      // 1. Scale up the image slightly larger than target (800 wide vs 720 crop)
      //    so we have room to pan and zoom without black borders
      // 2. Zoom: scale factor increases from 1.0 to ~1.0 + 0.02*duration
      //    using expression: 800*(1+0.02*t)
      // 3. Pan: subtle vertical drift downward using crop y offset
      //    y offset drifts from center using: (in_h-out_h)/2 + 8*t
      // 4. Crop back to exactly 720x1280 (9:16 target)
      const scaleExpr = "'800*(1+0.02*t)':'-1':eval=frame";
      const cropExpr = "720:1280:'(in_w-out_w)/2':'(in_h-out_h)/2+8*t'";
      const filter = `scale=${scaleExpr},crop=${cropExpr}`;

      const cmd = `ffmpeg -loglevel error -y -loop 1 -i "${escapedImg}" -vf "${filter}" -t ${duration} -r 30 -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "${escapedOut}"`;

      const child = exec(cmd, (err) => {
        if (err) {
          console.error('[AI Clip Generator] FFmpeg Ken Burns compilation failed:', err.message);
          reject(err);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  },

  /**
   * Generates an animated gradient video as a cinematic fallback.
   *
   * Uses FFmpeg's mandelbrot source with heavy saturation and hue rotation
   * to create a slow-moving, visually rich animated background.
   * Much better than static solid colors.
   *
   * @param {string} promptText - Original prompt (for logging)
   * @param {string} outputPath - Output MP4 path
   * @param {number} duration - Duration in seconds
   */
  async generatePlaceholderVideo(promptText, outputPath, duration = 5) {
    return new Promise((resolve, reject) => {
      const escapedOut = outputPath.replace(/\\/g, '/');

      // Strategy: Use mandelbrot fractal as an animated abstract background
      // - start_scale=10 gives a zoomed-in abstract look
      // - We scale it to 720x1280, set 30fps, and apply a hue rotation for color variation
      // - This produces a slowly shifting, visually interesting abstract animation
      const theme = Math.floor(Math.random() * 360); // Random starting hue
      const filter = `scale=720:1280,hue=h=${theme}+t*15:s=3`;

      const cmd = `ffmpeg -loglevel error -y -f lavfi -i "mandelbrot=size=720x1280:rate=30:start_scale=10:end_scale=0.001" -vf "${filter}" -t ${duration} -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "${escapedOut}"`;

      const child = exec(cmd, (err) => {
        if (err) {
          // If mandelbrot fails (rare), fall back to simple solid color
          console.warn('[AI Clip Generator] Animated fallback failed, using solid color.');
          this._solidColorFallback(outputPath, duration).then(resolve).catch(reject);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  },

  /**
   * Last-resort fallback: generates a simple solid color vertical video.
   */
  async _solidColorFallback(outputPath, duration = 5) {
    return new Promise((resolve, reject) => {
      const colors = ['0x0C0C1E', '0x140505', '0x001B2E', '0x120E25'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const escapedOut = outputPath.replace(/\\/g, '/');

      const cmd = `ffmpeg -loglevel error -y -f lavfi -i "color=c=${color}:s=720x1280:r=30" -t ${duration} -c:v libx264 -pix_fmt yuv420p "${escapedOut}"`;

      const child = exec(cmd, (err) => {
        if (err) {
          console.error('[AI Clip Generator] Solid color fallback failed:', err.message);
          reject(err);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  }
};

export default videoGenerationService;
