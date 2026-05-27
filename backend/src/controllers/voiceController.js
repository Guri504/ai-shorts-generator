import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ttsService } from '../services/ttsService.js';
import { env } from '../config/env.js';

const PREVIEW_DIR = path.join(env.paths.cache, 'previews');

// Ensure previews cache folder exists
if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

/**
 * Periodically deletes preview files older than 5 minutes (300,000 ms)
 */
function cleanupOldPreviews() {
  try {
    if (!fs.existsSync(PREVIEW_DIR)) return;
    const files = fs.readdirSync(PREVIEW_DIR);
    const now = Date.now();
    let count = 0;
    
    for (const file of files) {
      const filePath = path.join(PREVIEW_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 300000) { // 5 minutes
        fs.unlinkSync(filePath);
        count++;
      }
    }
    if (count > 0) {
      console.log(`[Voice Controller] Cleaned up ${count} expired voice preview files.`);
    }
  } catch (err) {
    console.warn('[Voice Controller] Previews cleanup failed:', err.message);
  }
}

export const voiceController = {
  /**
   * GET /api/voices
   * Returns a dynamic and enriched catalog of Edge TTS voices
   */
  async getVoices(req, res) {
    try {
      // Trigger cleanup asynchronously
      setTimeout(cleanupOldPreviews, 1000);
      
      const voices = await ttsService.getVoices();
      res.json(voices);
    } catch (err) {
      console.error('[Voice Controller] Failed to fetch voices:', err);
      res.status(500).json({ error: `Failed to fetch voices: ${err.message}` });
    }
  },

  /**
   * POST /api/voices/preview
   * Generates a short preview audio file for a given voice
   */
  async previewVoice(req, res) {
    const { voiceName, text, speed = 1.0, pitch = '+0Hz', volume = '+0%' } = req.body;
    
    if (!voiceName) {
      return res.status(400).json({ error: 'voiceName is required' });
    }

    try {
      // Trigger cleanup asynchronously
      setTimeout(cleanupOldPreviews, 1000);

      const previewText = text || 'Hello, this is a preview of the selected AI voice.';
      
      // Generate a stable hash of parameters to serve as cache key
      const key = `${voiceName}_${speed}_${pitch}_${volume}_${previewText}`;
      const hash = crypto.createHash('md5').update(key).digest('hex').substring(0, 12);
      const previewFileName = `preview_${hash}.mp3`;
      const outputPath = path.join(PREVIEW_DIR, previewFileName);

      // Serve instantly if cached file exists
      if (fs.existsSync(outputPath)) {
        console.log(`[Voice Controller] Serving cached voice preview: ${previewFileName}`);
        try {
          const now = new Date();
          fs.utimesSync(outputPath, now, now); // Update modified time to prevent deletion
        } catch (utimeErr) {
          // Silent fallback if filesystem doesn't support times update
        }
        return res.json({
          success: true,
          previewUrl: `/previews/${previewFileName}`,
          voiceName,
          text: previewText
        });
      }

      // Synthesize audio
      await ttsService.synthesize(previewText, voiceName, outputPath, {
        speed: parseFloat(speed),
        pitch,
        volume
      });

      // Construct public static preview URL
      const previewUrl = `/previews/${previewFileName}`;
      
      res.json({
        success: true,
        previewUrl,
        voiceName,
        text: previewText
      });
    } catch (err) {
      console.error('[Voice Controller] Voice preview synthesis failed:', err);
      res.status(500).json({ error: `Voice preview failed: ${err.message}` });
    }
  }
};

export default voiceController;
