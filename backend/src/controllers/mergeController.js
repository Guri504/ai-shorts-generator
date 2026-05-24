import fs from 'fs';
import path from 'path';
import { ffmpegService } from '../services/ffmpegService.js';
import { storageHelper } from '../utils/storageHelper.js';

export const mergeController = {
  /**
   * POST /api/merge-clips
   * Uploads and merges video clips with their audio included
   */
  async mergeClips(req, res) {
    const files = req.files;
    const userId = req.user._id;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No video clips uploaded' });
    }

    if (files.length < 2) {
      // Clean up the single file before returning
      try {
        fs.unlinkSync(files[0].path);
      } catch (err) {}
      return res.status(400).json({ error: 'Please upload at least 2 video clips to merge' });
    }

    const clipPaths = files.map(file => file.path);
    const outputFilename = `merged_${Date.now()}.mp4`;
    const userOutputDir = storageHelper.getUserOutputDir(userId);
    const outputPath = path.join(userOutputDir, outputFilename);

    try {
      console.log(`[Merge Controller] Initiating merge for user: ${userId}. Clips count: ${files.length}`);
      
      // Perform the FFmpeg merge
      await ffmpegService.mergeClips(clipPaths, outputPath);

      res.json({
        success: true,
        message: 'Clips merged successfully',
        filename: outputFilename
      });
    } catch (error) {
      console.error('[Merge Controller] Merging failed:', error);
      res.status(500).json({ error: `Merging failed: ${error.message}` });
    } finally {
      // Clean up uploaded temporary files in background
      console.log('[Merge Controller] Cleaning up temporary uploaded clips...');
      for (const clipPath of clipPaths) {
        try {
          if (fs.existsSync(clipPath)) {
            fs.unlinkSync(clipPath);
          }
        } catch (err) {
          console.warn(`[Merge Controller] Failed to delete temp file ${clipPath}:`, err.message);
        }
      }
    }
  },

  /**
   * POST /api/replace-audio
   * Replaces video audio track with an uploaded audio track, syncing to length.
   */
  async replaceAudio(req, res) {
    const files = req.files;
    const userId = req.user._id;
    const adaptationType = req.body.adaptationType || 'trim';

    if (!files || !files.video || !files.video[0] || !files.audio || !files.audio[0]) {
      if (files) {
        if (files.video && files.video[0]) try { fs.unlinkSync(files.video[0].path); } catch (e) {}
        if (files.audio && files.audio[0]) try { fs.unlinkSync(files.audio[0].path); } catch (e) {}
      }
      return res.status(400).json({ error: 'Both a video file and an audio track are required.' });
    }

    const videoPath = files.video[0].path;
    const audioPath = files.audio[0].path;
    const outputFilename = `merged_audio_${Date.now()}.mp4`;
    const userOutputDir = storageHelper.getUserOutputDir(userId);
    const outputPath = path.join(userOutputDir, outputFilename);

    try {
      console.log(`[Merge Controller] Replacing audio for user: ${userId}. Adaptation: ${adaptationType}`);

      await ffmpegService.replaceAudio(videoPath, audioPath, adaptationType, outputPath);

      res.json({
        success: true,
        message: 'Audio track replaced successfully',
        filename: outputFilename
      });
    } catch (error) {
      console.error('[Merge Controller] Replace audio failed:', error);
      res.status(500).json({ error: `Replacing audio failed: ${error.message}` });
    } finally {
      // Clean up uploaded files
      console.log('[Merge Controller] Cleaning up temporary files...');
      try {
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      } catch (err) {}
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      } catch (err) {}
    }
  },

  /**
   * POST /api/trim-audio
   * Trims an uploaded audio file and outputs the segment for download
   */
  async trimAudio(req, res) {
    const file = req.file;
    const userId = req.user._id;
    const { startTime, endTime } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const start = parseFloat(startTime);
    const end = parseFloat(endTime);

    if (isNaN(start) || isNaN(end) || start < 0 || end <= start) {
      try { fs.unlinkSync(file.path); } catch (e) {}
      return res.status(400).json({ error: 'Invalid start or end timestamps.' });
    }

    const ext = path.extname(file.originalname) || '.mp3';
    const outputFilename = `trimmed_${Date.now()}${ext}`;
    const userOutputDir = storageHelper.getUserOutputDir(userId);
    const outputPath = path.join(userOutputDir, outputFilename);

    try {
      console.log(`[Merge Controller] Trimming audio for user: ${userId}. Range: ${start}s - ${end}s`);

      await ffmpegService.trimAudio(file.path, start, end, outputPath);

      res.json({
        success: true,
        message: 'Audio trimmed successfully',
        filename: outputFilename
      });
    } catch (error) {
      console.error('[Merge Controller] Trim audio failed:', error);
      res.status(500).json({ error: `Trimming audio failed: ${error.message}` });
    } finally {
      // Clean up uploaded temp file
      console.log('[Merge Controller] Cleaning up temporary file...');
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (err) {}
    }
  },

  /**
   * GET /api/assets/merged/:filename
   * Streams/serves the merged video safely
   */
  async getMergedAsset(req, res) {
    const filename = req.params.filename;
    const userId = req.user._id;

    try {
      const outputDir = storageHelper.getUserOutputDir(userId);
      const filePath = path.join(outputDir, filename);

      // Prevent Directory Traversal Vulnerability
      const relative = path.relative(outputDir, filePath);
      const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

      if (!isSafe || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Asset not found or access denied' });
      }

      if (req.query.download === 'true') {
        res.download(filePath, filename);
      } else {
        res.sendFile(filePath);
      }
    } catch (error) {
      console.error('[Merge Controller] Merged asset serving failed:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default mergeController;
