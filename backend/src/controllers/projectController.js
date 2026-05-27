import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/dbService.js';
import { geminiService } from '../services/geminiService.js';
import { queueService } from '../services/queueService.js';
import { env } from '../config/env.js';
import { storageHelper } from '../utils/storageHelper.js';

export const projectController = {
  // Get all projects for logged-in user
  async getAllProjects(req, res) {
    try {
      const projects = await dbService.getProjects(req.user._id);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get project by ID (ownership verified by middleware)
  async getProjectById(req, res) {
    try {
      res.json(req.project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Create Project & Generate Script (Phase 1)
  async createProject(req, res) {
    const { 
      topicOrTitle, 
      language = 'hinglish', 
      voiceGender = 'male', 
      voiceName, 
      voiceSpeed = 1.0, 
      voicePitch = '+0Hz', 
      voiceVolume = '+0%', 
      musicGenre = 'cinematic', 
      sceneCount = 5,
      platform = 'general',
      niche,
      hookStyle,
      tone,
      subtitleColor = 'yellow'
    } = req.body;

    if (!topicOrTitle) {
      return res.status(400).json({ error: 'topicOrTitle is required' });
    }

    try {
      // 1. Generate unique project ID
      const projectId = `proj_${uuidv4().substring(0, 8)}`;
      
      // 2. Call Gemini to write script & split scenes
      console.log(`[Project Controller] Generating script for topic: "${topicOrTitle}"`);
      const scriptResult = await geminiService.generateScriptAndScenes(topicOrTitle, language, sceneCount, {
        platform,
        niche,
        hookStyle,
        tone
      });

      // Map default voice if none provided
      const resolvedVoiceName = voiceName || (
        language === 'english'
          ? (voiceGender === 'male' ? 'en-US-GuyNeural' : 'en-US-AriaNeural')
          : (voiceGender === 'male' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural')
      );

      // 3. Construct project schema
      const newProjectData = {
        id: projectId,
        userId: req.user._id,
        topic: topicOrTitle,
        voiceLanguage: language,
        voiceGender,
        voiceName: resolvedVoiceName,
        voiceSpeed: parseFloat(voiceSpeed),
        voicePitch,
        voiceVolume,
        musicGenre,
        status: 'draft',
        progress: 0,
        stepStatus: 'Script and scene plan generated.',
        platform,
        subtitleColor,
        platformSettings: {
          niche,
          hookStyle,
          tone
        },
        metadata: {
          title: scriptResult.title,
          description: scriptResult.description,
          hashtags: scriptResult.hashtags
        },
        scenes: scriptResult.scenes.map((scene) => ({
          sceneNumber: scene.sceneNumber,
          narration: scene.narration,
          visualPrompt: scene.visualPrompt,
          clipType: scene.clipType,
          stockSearchKeyword: scene.stockSearchKeyword,
          voiceAudioPath: null,
          videoPath: null,
          wordTimings: []
        })),
        bgMusicGenre: scriptResult.bgMusicGenre || musicGenre,
        outputPath: null,
        error: null,
        ctaSettings: {
          enabled: req.body.ctaEnabled !== undefined ? (req.body.ctaEnabled === 'true' || req.body.ctaEnabled === true) : true,
          language: req.body.ctaLanguage || language,
          style: req.body.ctaStyle || 'auto',
          duration: req.body.ctaDuration ? parseInt(req.body.ctaDuration, 10) : 5,
          intensity: req.body.ctaIntensity || 'energetic'
        },
        ctaScene: null
      };

      // 4. Save to MongoDB
      const savedProject = await dbService.saveProject(newProjectData, req.user._id);
      res.status(201).json(savedProject);
    } catch (error) {
      console.error('[Project Controller] Script generation failed:', error);
      res.status(500).json({ error: `Script generation failed: ${error.message}` });
    }
  },

  // Update Project
  async updateProject(req, res) {
    try {
      const project = req.project;

      // Merge request body changes
      const fieldsToUpdate = { ...req.body };
      delete fieldsToUpdate.id;
      delete fieldsToUpdate.userId;
      delete fieldsToUpdate._id;

      Object.assign(project, fieldsToUpdate);
      
      // Ensure ctaSettings object is merged nestedly
      if (req.body.ctaSettings) {
        project.ctaSettings = {
          ...project.ctaSettings,
          ...req.body.ctaSettings
        };
      }
      
      await dbService.saveProject(project);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Trigger Video Render Queue (Phase 2)
  async renderProject(req, res) {
    try {
      const project = req.project;
      const isCreditsDisabled = env.DISABLE_CREDIT_SYSTEM;

      // Check credits only if system is enabled
      if (!isCreditsDisabled && req.user.credits < 1) {
        return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan or wait for credit renewal.' });
      }

      // Enqueue rendering job
      const { renderType } = req.body;
      const success = await queueService.enqueue(project.id, { renderType });
      if (success) {
        // Debit credit only if system is enabled
        if (!isCreditsDisabled) {
          req.user.credits = Math.max(0, req.user.credits - 1);
          await req.user.save();
        }
        res.json({ 
          message: 'Project added to rendering queue', 
          projectId: project.id, 
          remainingCredits: isCreditsDisabled ? 99999 : req.user.credits 
        });
      } else {
        res.status(500).json({ error: 'Failed to queue project rendering' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete Project & Clean folder
  async deleteProject(req, res) {
    try {
      const project = req.project;

      // Cancel rendering if it is currently in queue or rendering
      if (project.status === 'rendering' || project.status === 'queued') {
        queueService.cancelProject(project.id);
      }

      // 1. Delete DB entry
      await dbService.deleteProject(project.id);

      // 2. Cleanup local folder
      const projectFolder = storageHelper.getProjectDir(req.user._id, project.id);
      if (fs.existsSync(projectFolder)) {
        fs.rmSync(projectFolder, { recursive: true, force: true });
      }

      // 3. Cleanup output video
      if (project.outputPath && fs.existsSync(project.outputPath)) {
        try { fs.unlinkSync(project.outputPath); } catch (e) {}
      }

      res.json({ success: true, message: 'Project and all files deleted' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get Env Configuration Status
  async getSettings(req, res) {
    res.json({
      hasGeminiKey: !!env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE',
      hasPexelsKey: !!env.PEXELS_API_KEY && env.PEXELS_API_KEY !== 'YOUR_PEXELS_API_KEY_HERE',
      hasPixabayKey: !!env.PIXABAY_API_KEY
    });
  },

  // Update Env Configuration Status (Write keys back to .env file) - DISABLED FOR SECURITY
  async saveSettings(req, res) {
    res.status(403).json({ 
      error: 'API key modification via UI settings is disabled for security. Please configure them in the .env file directly.' 
    });
  },

  // Reorder project scenes
  async reorderScenes(req, res) {
    const { scenes } = req.body;
    try {
      const project = req.project;

      project.scenes = scenes.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1
      }));

      await dbService.saveProject(project);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Regenerate a single scene aspect (voice, clip, subtitles, or all) and rebuild short
  async regenerateScene(req, res) {
    const { sceneNumber } = req.params;
    const { regenerateType = 'all' } = req.body; // 'all', 'clip', 'voice', 'subtitles'

    try {
      const project = req.project;

      const num = parseInt(sceneNumber, 10);
      if (isNaN(num) || num < 1 || num > project.scenes.length) {
        return res.status(400).json({ error: 'Invalid sceneNumber' });
      }

      const success = await queueService.enqueueRegenerate(project.id, num, regenerateType);
      if (success) {
        res.json({ message: 'Scene regeneration queued', projectId: project.id, sceneNumber: num, regenerateType });
      } else {
        res.status(500).json({ error: 'Failed to queue scene regeneration' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Cancel project rendering job
  async cancelRender(req, res) {
    try {
      const project = req.project;
      queueService.cancelProject(project.id);
      res.json({ success: true, message: 'Rendering process cancelled successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a specific scene from a project draft
  async deleteScene(req, res) {
    const { sceneNumber } = req.params;
    try {
      const project = req.project;

      if (project.status !== 'draft') {
        return res.status(400).json({ error: 'Scenes can only be deleted in draft status.' });
      }

      const num = parseInt(sceneNumber, 10);
      if (isNaN(num) || num < 1 || num > project.scenes.length) {
        return res.status(400).json({ error: 'Invalid scene number' });
      }

      // Remove the scene
      project.scenes.splice(num - 1, 1);

      // Re-index remaining scenes
      project.scenes = project.scenes.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1
      }));

      await dbService.saveProject(project);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default projectController;
