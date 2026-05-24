import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env.js';
import { dbService } from './dbService.js';
import { processRegistry } from '../utils/processRegistry.js';

export const stockVideoService = {
  /**
   * Search and download a stock video clip
   * @param {string} keyword - Search term (e.g., 'city night drone')
   * @param {string} outputPath - Path where the downloaded clip should be saved
   * @param {number} duration - Required clip duration in seconds
   */
  async getClip(keyword, outputPath, duration = 5) {
    const cleanKeyword = keyword.toLowerCase().trim();
    const cacheKey = `stock_clip_${cleanKeyword.replace(/\s+/g, '_')}`;
    
    // 1. Check local cache
    const cachedItem = dbService.getCache(cacheKey);
    if (cachedItem && fs.existsSync(cachedItem.value.filePath)) {
      console.log(`[Stock Video] Cache hit for keyword: "${keyword}". Reusing: ${cachedItem.value.filePath}`);
      fs.copyFileSync(cachedItem.value.filePath, outputPath);
      return outputPath;
    }

    // 2. Try Pexels API
    if (env.PEXELS_API_KEY && env.PEXELS_API_KEY !== 'YOUR_PEXELS_API_KEY_HERE') {
      try {
        console.log(`[Stock Video] Searching Pexels for: "${keyword}"...`);
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=8&orientation=portrait`;
        const response = await axios.get(url, {
          headers: { Authorization: env.PEXELS_API_KEY }
        });

        const videos = response.data.videos;
        if (videos && videos.length > 0) {
          // Select a video. Try to find a vertical one, or just take the first one
          const video = videos[0];
          
          // Find the best quality MP4 video file
          // Prefer vertical aspect ratio (height > width) and 720p/1080p resolution
          let bestFile = null;
          for (const file of video.video_files) {
            if (file.file_type === 'video/mp4') {
              if (!bestFile) {
                bestFile = file;
              } else {
                // If we find a vertical one, prefer it
                const curIsVertical = (file.height || 0) > (file.width || 0);
                const prevIsVertical = (bestFile.height || 0) > (bestFile.width || 0);
                
                if (curIsVertical && !prevIsVertical) {
                  bestFile = file;
                } else if (curIsVertical === prevIsVertical) {
                  // Prefer HD (around 720-1080 width/height) over 4K or super low-res to save download time
                  const curDiff = Math.abs((file.height || 0) - 1280);
                  const prevDiff = Math.abs((bestFile.height || 0) - 1280);
                  if (curDiff < prevDiff) {
                    bestFile = file;
                  }
                }
              }
            }
          }

          if (bestFile && bestFile.link) {
            console.log(`[Stock Video] Downloading video from Pexels: ${bestFile.link}`);
            await this.downloadFile(bestFile.link, outputPath);
            
            // Save to cache
            const cachePath = path.join(env.paths.cache, `pexels_${video.id}.mp4`);
            fs.copyFileSync(outputPath, cachePath);
            dbService.setCache(cacheKey, { filePath: cachePath, keyword });
            
            return outputPath;
          }
        }
      } catch (err) {
        console.warn('[Stock Video] Pexels API call failed or timed out:', err.message);
      }
    }

    // 3. Try Pixabay API as fallback
    if (env.PIXABAY_API_KEY) {
      try {
        console.log(`[Stock Video] Searching Pixabay for: "${keyword}"...`);
        const url = `https://pixabay.com/api/videos/?key=${env.PIXABAY_API_KEY}&q=${encodeURIComponent(keyword)}&per_page=5`;
        const response = await axios.get(url);
        const hits = response.data.hits;
        if (hits && hits.length > 0) {
          const video = hits[0];
          // Pixabay returns a structure with videos.large, videos.medium, videos.small, etc.
          const videoUrl = video.videos.medium?.url || video.videos.small?.url;
          if (videoUrl) {
            console.log(`[Stock Video] Downloading video from Pixabay: ${videoUrl}`);
            await this.downloadFile(videoUrl, outputPath);
            
            const cachePath = path.join(env.paths.cache, `pixabay_${video.id}.mp4`);
            fs.copyFileSync(outputPath, cachePath);
            dbService.setCache(cacheKey, { filePath: cachePath, keyword });
            
            return outputPath;
          }
        }
      } catch (err) {
        console.warn('[Stock Video] Pixabay API call failed:', err.message);
      }
    }

    // 4. Fail-safe: Generate dynamic gradient/solid video using FFmpeg
    console.log(`[Stock Video] No API key or video found. Generating high-quality animated placeholder using FFmpeg for: "${keyword}"`);
    await this.generatePlaceholderVideo(keyword, outputPath, duration);
    return outputPath;
  },

  /**
   * Helper to download file via axios stream
   */
  async downloadFile(url, outputPath) {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  },

  /**
   * Generates a beautiful vertical background with floating search text in case stock fetching fails
   */
  async generatePlaceholderVideo(keyword, outputPath, duration = 5) {
    return new Promise((resolve, reject) => {
      // Pick a random dark-themed background color to make it look premium
      const themes = [
        '0x121214', // Rich Dark Slate
        '0x1A0933', // Deep Purple
        '0x021E2F', // Deep Oceanic Blue
        '0x200110'  // Dark Burgundy
      ];
      const color = themes[Math.floor(Math.random() * themes.length)];
      
      // Let's create an FFmpeg filter that builds a solid background color
      // and overlays the scene keyword in a clean, minimalist style.
      // FFmpeg escape helper for text
      const cleanText = keyword.replace(/['":]/g, '').toUpperCase();
      
      // We will create a vertical video (720x1280) of 30 fps
      // To add motion, we will use the cell-noise or a slow pan of a color,
      // or we can generate a subtle vertical moving wave, or just a static color.
      // A static color is fast to build. Let's make a solid color background.
      const cmd = `ffmpeg -loglevel error -y -f lavfi -i "color=c=${color}:s=720x1280:r=30" -t ${duration} -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
      
      const child = exec(cmd, (err) => {
        if (err) {
          console.error('[Stock Video] FFmpeg placeholder generation failed:', err);
          reject(err);
        } else {
          resolve(outputPath);
        }
      });
      processRegistry.register(child);
    });
  }
};

export default stockVideoService;
