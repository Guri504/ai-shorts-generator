import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const IMAGE_WIDTH = 720;
const IMAGE_HEIGHT = 1280;
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 3000;         // 3 seconds between retries
const RATE_LIMIT_DELAY = 8000;    // 8 seconds extra backoff for 402 rate limits
const MIN_VALID_SIZE = 10240;     // 10 KB

const CINEMATIC_MODIFIERS = [
  'cinematic lighting',
  'dramatic composition',
  'ultra detailed',
  'depth of field',
  'vertical 9:16 framing',
  'photorealistic',
  'atmospheric',
  'professional photography',
  'high contrast',
  'volumetric light'
];

const IMAGE_CACHE_DIR = path.join(env.paths.cache, 'ai_images');
if (!fs.existsSync(IMAGE_CACHE_DIR)) {
  fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
}

// Global state to track request spacing
let lastRequestTimestamp = 0;

/**
 * Helper to ensure a minimum gap of 1 second between external AI API requests
 */
async function enforceRequestSpacing() {
  const now = Date.now();
  const timePassed = now - lastRequestTimestamp;
  const minSpacing = 3000; // 3 seconds to avoid Pollinations 402 rate limits

  if (timePassed < minSpacing) {
    const delay = minSpacing - timePassed;
    console.log(`[AI Image Queue] Spacing requests. Waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  lastRequestTimestamp = Date.now();
}

export const pollinationsService = {
  /**
   * Generates a cinematic image using Pollinations AI (free, no API key).
   * Fully cached and protected by a request rate spacing queue.
   */
  async generateImage(rawPrompt, outputPath, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    const startTime = Date.now();
    const enhancedPrompt = this.enhancePrompt(rawPrompt);

    // 1. Check prompt cache first to avoid API calls completely
    const cacheHit = this._checkCache(enhancedPrompt, width, height);
    if (cacheHit) {
      console.log(`[Pollinations] [CACHE HIT] Prompt hash matched. Reusing cached image.`);
      fs.copyFileSync(cacheHit, outputPath);
      console.log(`[Pollinations] Cache hit processed in ${Date.now() - startTime}ms.`);
      return outputPath;
    }

    // 2. Enforce 1-second delay spacing before calling the external API
    await enforceRequestSpacing();

    const seed = Math.floor(Math.random() * 999999);
    const url = this._buildUrl(enhancedPrompt, seed, width, height);

    console.log(`[Pollinations] Requesting image for prompt: "${rawPrompt.substring(0, 80)}..."`);
    const imageBuffer = await this._downloadWithRetry(url, MAX_RETRIES);

    // 3. Save buffer to target output and cache
    fs.writeFileSync(outputPath, imageBuffer);
    this._saveToCache(enhancedPrompt, imageBuffer, width, height);

    console.log(`[Pollinations] Generated & cached image in ${Date.now() - startTime}ms. Size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
    return outputPath;
  },

  /**
   * Fallback generation strategy utilizing HuggingFace FLUX.1-schnell model.
   * Requires HF_API_KEY environment variable.
   */
  async generateImageViaFlux(rawPrompt, outputPath, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    const startTime = Date.now();
    const hfKey = env.HF_API_KEY || process.env.HF_API_KEY || '';
    
    if (!hfKey) {
      throw new Error('HuggingFace fallback skipped: HF_API_KEY not configured.');
    }

    const enhancedPrompt = this.enhancePrompt(rawPrompt);

    // Check cache
    const cacheHit = this._checkCache(enhancedPrompt, width, height);
    if (cacheHit) {
      console.log(`[HuggingFace FLUX] [CACHE HIT] Prompt hash matched. Reusing cached image.`);
      fs.copyFileSync(cacheHit, outputPath);
      return outputPath;
    }

    // Spacing
    await enforceRequestSpacing();

    console.log(`[HuggingFace FLUX] Requesting image from model "black-forest-labs/FLUX.1-schnell" for: "${rawPrompt.substring(0, 80)}..."`);
    
    const response = await axios.post(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      { inputs: enhancedPrompt },
      {
        headers: {
          Authorization: `Bearer ${hfKey}`,
          'Content-Type': 'application/json',
          'Accept': 'image/jpeg'
        },
        responseType: 'arraybuffer',
        timeout: 60000 // 60 seconds timeout (HF can be slow for cold starts)
      }
    );

    const buffer = Buffer.from(response.data);

    // Validate size and format
    if (buffer.length < MIN_VALID_SIZE) {
      throw new Error(`HuggingFace returned an invalid image stub (${buffer.length} bytes).`);
    }

    if (!this._isValidImageBuffer(buffer)) {
      throw new Error('HuggingFace response is missing standard image headers.');
    }

    fs.writeFileSync(outputPath, buffer);
    this._saveToCache(enhancedPrompt, buffer, width, height);

    console.log(`[HuggingFace FLUX] Generated & cached image in ${Date.now() - startTime}ms.`);
    return outputPath;
  },

  /**
   * Verify Pollinations service is responsive
   */
  async checkHealth() {
    try {
      const testUrl = `${POLLINATIONS_BASE}/${encodeURIComponent('test')}?width=64&height=64&nologo=true`;
      const response = await axios.head(testUrl, { timeout: 8000 });
      return response.status >= 200 && response.status < 400;
    } catch {
      return false;
    }
  },

  enhancePrompt(rawPrompt) {
    if (rawPrompt.includes('cinematic lighting')) {
      return rawPrompt;
    }
    const modifiers = CINEMATIC_MODIFIERS.join(', ');
    return `${rawPrompt.trim()}, ${modifiers}`;
  },

  _buildUrl(prompt, seed, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    const encoded = encodeURIComponent(prompt);
    return `${POLLINATIONS_BASE}/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
  },

  async _downloadWithRetry(url, retriesLeft) {
    let lastError = null;

    for (let attempt = 1; attempt <= retriesLeft; attempt++) {
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: DOWNLOAD_TIMEOUT,
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'AI-Shorts-Generator/1.0'
          },
          validateStatus: (status) => status < 500
        });

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = Buffer.from(response.data);

        // Validate content headers
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('image')) {
          throw new Error(`Invalid content type "${contentType}" returned from API.`);
        }

        // Validate minimum size
        if (buffer.length < MIN_VALID_SIZE) {
          throw new Error(`Image size too small (${buffer.length} bytes). Likely an error page.`);
        }

        // Check magic bytes
        if (!this._isValidImageBuffer(buffer)) {
          throw new Error('Downloaded file lacks valid JPEG/PNG headers.');
        }

        return buffer;
      } catch (err) {
        lastError = err;
        console.warn(`[Pollinations] Attempt ${attempt} failed: ${err.message}`);

        if (attempt < retriesLeft) {
          // Use longer backoff for 402 (rate limit) errors
          const is402 = err.message && err.message.includes('402');
          const delay = is402 ? RATE_LIMIT_DELAY * attempt : RETRY_DELAY * attempt;
          console.log(`[Pollinations] Backing off for ${(delay/1000).toFixed(1)}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Pollinations failed after ${retriesLeft} retries. Final error: ${lastError?.message}`);
  },

  _isValidImageBuffer(buffer) {
    if (buffer.length < 4) return false;
    // JPEG header: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // PNG header: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    return false;
  },

  _getPromptHash(prompt, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    return crypto.createHash('sha256').update(`${prompt}_${width}x${height}`).digest('hex').substring(0, 16);
  },

  _checkCache(enhancedPrompt, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    const hash = this._getPromptHash(enhancedPrompt, width, height);
    const cachedPath = path.join(IMAGE_CACHE_DIR, `${hash}.jpg`);

    if (fs.existsSync(cachedPath)) {
      const stats = fs.statSync(cachedPath);
      if (stats.size >= MIN_VALID_SIZE) {
        return cachedPath;
      }
      try { fs.unlinkSync(cachedPath); } catch {}
    }
    return null;
  },

  _saveToCache(enhancedPrompt, buffer, width = IMAGE_WIDTH, height = IMAGE_HEIGHT) {
    try {
      const hash = this._getPromptHash(enhancedPrompt, width, height);
      const cachedPath = path.join(IMAGE_CACHE_DIR, `${hash}.jpg`);
      fs.writeFileSync(cachedPath, buffer);
    } catch (err) {
      console.warn(`[Pollinations] Caching failed: ${err.message}`);
    }
  }
};

export default pollinationsService;
