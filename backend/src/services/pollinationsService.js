import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

// ============================================================
// Pollinations AI — Free Image Generation Service
// https://pollinations.ai
// No API key required. Completely free. URL-based generation.
// ============================================================

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const IMAGE_WIDTH = 720;
const IMAGE_HEIGHT = 1280;
const DOWNLOAD_TIMEOUT = 60000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds between retries
const MIN_VALID_SIZE = 10240; // 10 KB — anything smaller is likely an error page

// Cinematic enhancement suffixes applied to all prompts
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

// Ensure the AI image cache directory exists
const IMAGE_CACHE_DIR = path.join(env.paths.cache, 'ai_images');
if (!fs.existsSync(IMAGE_CACHE_DIR)) {
  fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
}

export const pollinationsService = {

  // ──────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────

  /**
   * Generate a cinematic AI image from a visual prompt and save it to outputPath.
   * Uses prompt enhancement, hash-based caching, and resilient retry logic.
   *
   * @param {string} rawPrompt - The visual prompt from the scene
   * @param {string} outputPath - Where to save the generated JPEG image
   * @returns {string} outputPath on success
   * @throws {Error} if all retries are exhausted and no valid image was obtained
   */
  async generateImage(rawPrompt, outputPath) {
    const startTime = Date.now();

    // 1. Enhance the prompt for cinematic quality
    const enhancedPrompt = this.enhancePrompt(rawPrompt);

    // 2. Check cache
    const cacheHit = this._checkCache(enhancedPrompt);
    if (cacheHit) {
      console.log(`[Pollinations] [CACHE HIT] Reusing cached image for prompt hash.`);
      fs.copyFileSync(cacheHit, outputPath);
      const elapsed = Date.now() - startTime;
      console.log(`[Pollinations] Image ready in ${elapsed}ms (cached).`);
      return outputPath;
    }

    // 3. Generate with retry
    const seed = Math.floor(Math.random() * 999999);
    const url = this._buildUrl(enhancedPrompt, seed);

    console.log(`[Pollinations] Generating image (seed: ${seed}) for prompt: "${rawPrompt.substring(0, 80)}..."`);

    const imageBuffer = await this._downloadWithRetry(url, MAX_RETRIES);

    // 4. Save to output and cache
    fs.writeFileSync(outputPath, imageBuffer);
    this._saveToCache(enhancedPrompt, imageBuffer);

    const elapsed = Date.now() - startTime;
    console.log(`[Pollinations] Image generated and saved in ${elapsed}ms. Size: ${(imageBuffer.length / 1024).toFixed(1)}KB`);

    return outputPath;
  },

  /**
   * Quick health check — verifies Pollinations API is reachable.
   * @returns {boolean} true if API responds
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

  // ──────────────────────────────────────────────
  // PROMPT ENHANCEMENT
  // ──────────────────────────────────────────────

  /**
   * Enhances a raw visual prompt with cinematic quality modifiers.
   * Prevents duplicate enhancement by checking for a marker.
   *
   * @param {string} rawPrompt - Original prompt
   * @returns {string} Enhanced prompt
   */
  enhancePrompt(rawPrompt) {
    // Already enhanced — skip
    if (rawPrompt.includes('cinematic lighting')) {
      return rawPrompt;
    }

    const modifiers = CINEMATIC_MODIFIERS.join(', ');
    return `${rawPrompt.trim()}, ${modifiers}`;
  },

  // ──────────────────────────────────────────────
  // URL BUILDER
  // ──────────────────────────────────────────────

  /**
   * Constructs the Pollinations image generation URL.
   * @param {string} prompt - The enhanced prompt
   * @param {number} seed - Random seed for variation
   * @returns {string} Full URL
   */
  _buildUrl(prompt, seed) {
    const encoded = encodeURIComponent(prompt);
    return `${POLLINATIONS_BASE}/${encoded}?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&seed=${seed}&nologo=true&enhance=true`;
  },

  // ──────────────────────────────────────────────
  // RESILIENT DOWNLOADER
  // ──────────────────────────────────────────────

  /**
   * Downloads an image from Pollinations with retry logic and validation.
   * @param {string} url - Pollinations URL
   * @param {number} retriesLeft - Number of retries remaining
   * @returns {Buffer} Valid image buffer
   * @throws {Error} after all retries exhausted
   */
  async _downloadWithRetry(url, retriesLeft) {
    let lastError = null;

    for (let attempt = 1; attempt <= retriesLeft; attempt++) {
      try {
        console.log(`[Pollinations] Download attempt ${attempt}/${retriesLeft}...`);

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: DOWNLOAD_TIMEOUT,
          headers: {
            'Accept': 'image/*',
            'User-Agent': 'AI-Shorts-Generator/1.0'
          },
          // Don't throw on non-2xx so we can inspect
          validateStatus: (status) => status < 500
        });

        // Validate HTTP status
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = Buffer.from(response.data);

        // Validate content type
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('image')) {
          throw new Error(`Invalid content-type: ${contentType}. Expected image/*`);
        }

        // Validate minimum size (reject error pages / tiny stubs)
        if (buffer.length < MIN_VALID_SIZE) {
          throw new Error(`Image too small: ${buffer.length} bytes (min: ${MIN_VALID_SIZE}). Likely an error response.`);
        }

        // Validate magic bytes (JPEG: FF D8 FF | PNG: 89 50 4E 47)
        if (!this._isValidImageBuffer(buffer)) {
          throw new Error('Downloaded data does not have valid JPEG or PNG magic bytes. Corrupted image.');
        }

        return buffer;
      } catch (err) {
        lastError = err;
        console.warn(`[Pollinations] Attempt ${attempt} failed: ${err.message}`);

        if (attempt < retriesLeft) {
          console.log(`[Pollinations] Retrying in ${RETRY_DELAY / 1000}s...`);
          await this._sleep(RETRY_DELAY);
        }
      }
    }

    throw new Error(`Pollinations image generation failed after ${retriesLeft} attempts. Last error: ${lastError?.message}`);
  },

  // ──────────────────────────────────────────────
  // IMAGE VALIDATION
  // ──────────────────────────────────────────────

  /**
   * Validates a buffer has valid JPEG or PNG magic bytes.
   * @param {Buffer} buffer
   * @returns {boolean}
   */
  _isValidImageBuffer(buffer) {
    if (buffer.length < 4) return false;

    // JPEG: starts with FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }

    // PNG: starts with 89 50 4E 47 (‰PNG)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return true;
    }

    return false;
  },

  // ──────────────────────────────────────────────
  // CACHING SYSTEM
  // ──────────────────────────────────────────────

  /**
   * Generates a short SHA-256 hash of a prompt for cache keying.
   * @param {string} prompt
   * @returns {string} 16-char hex hash
   */
  _getPromptHash(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
  },

  /**
   * Checks if a cached image exists for the given prompt.
   * @param {string} enhancedPrompt
   * @returns {string|null} Path to cached file, or null
   */
  _checkCache(enhancedPrompt) {
    const hash = this._getPromptHash(enhancedPrompt);
    const cachedPath = path.join(IMAGE_CACHE_DIR, `${hash}.jpg`);

    if (fs.existsSync(cachedPath)) {
      const stats = fs.statSync(cachedPath);
      // Only use cache if file is valid size
      if (stats.size >= MIN_VALID_SIZE) {
        return cachedPath;
      }
      // Remove corrupted cache entry
      try { fs.unlinkSync(cachedPath); } catch { }
    }

    return null;
  },

  /**
   * Saves an image buffer to the prompt-hash cache.
   * @param {string} enhancedPrompt
   * @param {Buffer} buffer
   */
  _saveToCache(enhancedPrompt, buffer) {
    try {
      const hash = this._getPromptHash(enhancedPrompt);
      const cachedPath = path.join(IMAGE_CACHE_DIR, `${hash}.jpg`);
      fs.writeFileSync(cachedPath, buffer);
      console.log(`[Pollinations] Cached image as: ${hash}.jpg`);
    } catch (err) {
      console.warn(`[Pollinations] Failed to cache image: ${err.message}`);
    }
  },

  // ──────────────────────────────────────────────
  // UTILITIES
  // ──────────────────────────────────────────────

  /**
   * Simple async sleep.
   * @param {number} ms
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

export default pollinationsService;
