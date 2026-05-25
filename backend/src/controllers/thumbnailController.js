import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import Thumbnail from '../models/Thumbnail.js';
import pollinationsService from '../services/pollinationsService.js';
import storageHelper from '../utils/storageHelper.js';
import thumbnailRenderer from '../utils/thumbnailRenderer.js';

// Style prompt enhancements mapping
const STYLE_PROMPTS = {
  documentary: 'National Geographic photography style, dramatic realistic lighting, gritty, award-winning cinematic documentary scene, ultra-detailed textures, photorealistic',
  horror: 'spooky dark horror movie scene, eerie green and red shadow casting, fog machines, chilling thriller look, high-contrast dramatic lighting, cinematic horror atmosphere',
  cyberpunk: 'futuristic neon city style, bright pink and cyan lighting glows, cyberpunk aesthetic, high-tech rain-slicked streets, volumetric atmosphere, unreal engine 5 render',
  MrBeast: 'extremely vibrant and highly saturated colors, high contrast clickbait look, crazy expressive action scene, bold comic book outlines, popular YouTube thumbnail aesthetic',
  cinematic: 'anamorphic lens flare, movie cinematography, premium color grading, letterbox format look, dramatic side-lighting, 8k resolution, cinematic atmosphere',
  funny: 'bright cartoon caricature style, comical hyper-expressive character, funny vibrant meme look, rich comedy lighting, 3d pixar style render'
};

export const thumbnailController = {
  /**
   * POST /api/thumbnails/generate
   * Generates a baseline thumbnail image using Pollinations AI (or fallbacks)
   */
  async generateThumbnail(req, res) {
    const { prompt, style, aspectRatio = '9:16', resolution = '1080p' } = req.body;
    const userId = req.user._id;

    if (!prompt || !style) {
      return res.status(400).json({ error: 'Prompt and style are required.' });
    }

    if (!STYLE_PROMPTS[style]) {
      return res.status(400).json({ error: `Invalid style selected. Supported: ${Object.keys(STYLE_PROMPTS).join(', ')}` });
    }

    if (aspectRatio !== '9:16' && aspectRatio !== '16:9') {
      return res.status(400).json({ error: 'Invalid aspect ratio. Supported: 9:16, 16:9' });
    }

    let width = aspectRatio === '16:9' ? 1920 : 1080;
    let height = aspectRatio === '16:9' ? 1080 : 1920;

    if (resolution === '2k') {
      width = aspectRatio === '16:9' ? 2560 : 1440;
      height = aspectRatio === '16:9' ? 1440 : 2560;
    } else if (resolution === '720p') {
      width = aspectRatio === '16:9' ? 1280 : 720;
      height = aspectRatio === '16:9' ? 720 : 1280;
    }

    const thumbnailId = new mongoose.Types.ObjectId().toString();
    const userDir = storageHelper.getUserDir(userId);
    const thumbnailDir = path.join(userDir, 'thumbnails', thumbnailId);

    try {
      // Ensure folder structure is built
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }

      const originalPath = path.join(thumbnailDir, 'original.jpg');
      const editedPath = path.join(thumbnailDir, 'edited.jpg');

      // 1. Build style prompt
      const styleModifier = STYLE_PROMPTS[style];
      const finalPrompt = `${prompt.trim()}, ${styleModifier}`;

      let generatedSuccessfully = false;
      let errorLog = '';

      // 2. Generation Strategy 1: Pollinations AI
      try {
        console.log(`[Thumbnail Studio] Attempting Pollinations AI for prompt: ${prompt.substring(0, 50)}...`);
        await pollinationsService.generateImage(finalPrompt, originalPath, width, height);
        generatedSuccessfully = true;
      } catch (err) {
        console.warn(`[Thumbnail Studio] Pollinations failed: ${err.message}. Trying HuggingFace FLUX fallback...`);
        errorLog += `[Pollinations: ${err.message}] `;
      }

      // 3. Generation Strategy 2: HuggingFace FLUX fallback
      if (!generatedSuccessfully) {
        try {
          await pollinationsService.generateImageViaFlux(finalPrompt, originalPath, width, height);
          generatedSuccessfully = true;
        } catch (err) {
          console.warn(`[Thumbnail Studio] HF FLUX failed: ${err.message}. Generating local fallback canvas...`);
          errorLog += `[FLUX: ${err.message}] `;
        }
      }

      // 4. Generation Strategy 3: Local Fallback Canvas
      if (!generatedSuccessfully) {
        try {
          await generateLocalFallbackImage(originalPath, prompt, width, height);
          generatedSuccessfully = true;
          console.log(`[Thumbnail Studio] Fallback canvas generated successfully.`);
        } catch (err) {
          console.error(`[Thumbnail Studio] Failed to generate local fallback:`, err);
          return res.status(500).json({ error: 'Thumbnail generation failed across all fallback engines.' });
        }
      }

      // Copy original to edited (as default starting baseline)
      fs.copyFileSync(originalPath, editedPath);

      // 5. Save in database
      const thumbnailRecord = new Thumbnail({
        _id: thumbnailId,
        userId,
        prompt,
        style,
        aspectRatio,
        originalUrl: `/api/assets/thumbnails/${thumbnailId}/original`,
        editedUrl: `/api/assets/thumbnails/${thumbnailId}/edited`,
        textOverlays: [],
        glow: { enabled: false, color: '#8b5cf6', radius: 15 },
        blur: { enabled: false, radius: 5 },
        overlay: { type: 'none', opacity: 0.5 },
        adjustments: { brightness: 1.0, contrast: 1.0, saturation: 1.0, sharpness: 0 },
        historySteps: [{ timestamp: new Date(), action: 'Generate Baseline' }]
      });

      await thumbnailRecord.save();

      res.status(201).json(thumbnailRecord);
    } catch (err) {
      console.error('[Thumbnail Controller] Generation handler error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/thumbnails/edit
   * Applies editing operations (glow, blur, vignette, filters, text overlays) using sharp and updates record
   */
  async editThumbnail(req, res) {
    const { thumbnailId, textOverlays, glow, blur, overlay, adjustments } = req.body;
    const userId = req.user._id;

    if (!thumbnailId) {
      return res.status(400).json({ error: 'thumbnailId is required' });
    }

    try {
      const record = await Thumbnail.findById(thumbnailId);
      if (!record) {
        return res.status(404).json({ error: 'Thumbnail record not found' });
      }

      if (record.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied: project ownership violation' });
      }

      const userDir = storageHelper.getUserDir(userId);
      const thumbnailDir = path.join(userDir, 'thumbnails', thumbnailId);
      const originalPath = path.join(thumbnailDir, 'original.jpg');
      const editedPath = path.join(thumbnailDir, 'edited.jpg');

      // Apply modifications on original image and write to edited output path
      const renderOptions = {
        textOverlays: textOverlays || [],
        glow: glow || { enabled: false },
        blur: blur || { enabled: false },
        overlay: overlay || { type: 'none' },
        adjustments: adjustments || { brightness: 1.0, contrast: 1.0, saturation: 1.0, sharpness: 0 }
      };

      console.log(`[Thumbnail Studio] Editing thumbnail ${thumbnailId} with options:`, JSON.stringify(renderOptions));
      await thumbnailRenderer.render(originalPath, editedPath, renderOptions);

      // Save parameters in database
      record.textOverlays = renderOptions.textOverlays;
      record.glow = renderOptions.glow;
      record.blur = renderOptions.blur;
      record.overlay = renderOptions.overlay;
      record.adjustments = renderOptions.adjustments;
      record.historySteps.push({
        timestamp: new Date(),
        action: 'Custom Edited Details'
      });

      await record.save();

      res.json(record);
    } catch (err) {
      console.error('[Thumbnail Controller] Editing handler error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/thumbnails/history
   * Fetches full history list of user's thumbnails
   */
  async getThumbnailHistory(req, res) {
    const userId = req.user._id;

    try {
      const history = await Thumbnail.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
      
      res.json(history);
    } catch (err) {
      console.error('[Thumbnail Controller] History retrieval error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /api/assets/thumbnails/:id/:version
   * Serves original or edited thumbnail JPEG
   */
  async getThumbnailAsset(req, res) {
    const thumbnailId = req.params.id;
    const version = req.params.version; // original or edited
    const userId = req.user._id;

    if (version !== 'original' && version !== 'edited') {
      return res.status(400).json({ error: 'Invalid version specified.' });
    }

    try {
      const record = await Thumbnail.findById(thumbnailId);
      if (!record) {
        return res.status(404).json({ error: 'Thumbnail not found' });
      }

      // Check ownership
      if (record.userId.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'Access denied: file ownership mismatch' });
      }

      const userDir = storageHelper.getUserDir(userId);
      const filePath = path.join(userDir, 'thumbnails', thumbnailId, `${version}.jpg`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Thumbnail image asset file missing on disk.' });
      }

      const isDownload = req.query.download === 'true';
      const format = (req.query.format || 'jpg').toLowerCase();
      const scale = parseFloat(req.query.scale || '1');

      if (!['png', 'jpg', 'jpeg'].includes(format)) {
        return res.status(400).json({ error: 'Invalid format requested. Supported: png, jpg, jpeg' });
      }

      if (isDownload) {
        const filename = `thumbnail_${thumbnailId}.${format}`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      }

      // Fast-path: no resize, original JPEG requested
      if (scale === 1 && format !== 'png') {
        res.setHeader('Content-Type', 'image/jpeg');
        return res.sendFile(filePath);
      }

      // Scaling or PNG format conversion path
      let imagePipeline = sharp(filePath);
      if (scale > 1) {
        const metadata = await imagePipeline.metadata();
        const targetWidth = Math.round(metadata.width * scale);
        const targetHeight = Math.round(metadata.height * scale);
        imagePipeline = imagePipeline
          .resize({
            width: targetWidth,
            height: targetHeight,
            kernel: sharp.kernel.lanczos3
          })
          .sharpen({
            sigma: 0.8 + (scale - 1) * 0.4
          });
      }

      if (format === 'png') {
        res.setHeader('Content-Type', 'image/png');
        const buffer = await imagePipeline.png().toBuffer();
        return res.send(buffer);
      } else {
        res.setHeader('Content-Type', 'image/jpeg');
        const buffer = await imagePipeline.jpeg({ quality: 95 }).toBuffer();
        return res.send(buffer);
      }
    } catch (err) {
      console.error('[Thumbnail Controller] Asset delivery error:', err);
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * Creates a premium canvas layout fallback
 */
async function generateLocalFallbackImage(outputPath, prompt, width = 720, height = 1280) {
  const svgFallback = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="fallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f0c1e" />
          <stop offset="50%" stop-color="#161233" />
          <stop offset="100%" stop-color="#02000a" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#fallbackGrad)" />
      
      <!-- Visual highlights -->
      <circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) * 0.4}" fill="#8b5cf6" opacity="0.12" filter="blur(60px)"/>
      <circle cx="${width / 2 - 120}" cy="${height / 2 + 100}" r="${Math.min(width, height) * 0.25}" fill="#22c55e" opacity="0.08" filter="blur(50px)"/>
      
      <g transform="translate(0, ${height / 2 - 60})">
        <rect x="${width * 0.1}" y="0" width="${width * 0.8}" height="120" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.07)" stroke-width="1.5" />
        <text x="50%" y="45" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="20px" fill="#8b5cf6" letter-spacing="4px">STUDIO THUMBNAIL</text>
        <text x="50%" y="85" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="14px" fill="#94a3b8">OFFLINE GENERATOR FALLBACK</text>
      </g>
      
      <!-- Text details -->
      <text x="50%" y="${height / 2 + 120}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16px" fill="#475569">PROMPT REFERENCE:</text>
      <text x="50%" y="${height / 2 + 155}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="18px" fill="#e2e8f0">"${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"</text>
    </svg>
  `;

  await sharp(Buffer.from(svgFallback))
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

export default thumbnailController;
