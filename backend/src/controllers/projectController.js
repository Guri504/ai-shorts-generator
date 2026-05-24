import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/dbService.js';
import { geminiService } from '../services/geminiService.js';
import { queueService } from '../services/queueService.js';
import { env } from '../config/env.js';

export const projectController = {
  // Get all projects
  async getAllProjects(req, res) {
    try {
      const projects = dbService.getProjects();
      // Sort by creation or update time (newest first)
      projects.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Get project by ID
  async getProjectById(req, res) {
    try {
      const project = dbService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
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
      sceneCount = 5 
    } = req.body;

    if (!topicOrTitle) {
      return res.status(400).json({ error: 'topicOrTitle is required' });
    }

    try {
      // 1. Generate unique project ID
      const projectId = `proj_${uuidv4().substring(0, 8)}`;
      
      // 2. Call Gemini to write script & split scenes
      console.log(`[Project Controller] Generating script for topic: "${topicOrTitle}"`);
      const scriptResult = await geminiService.generateScriptAndScenes(topicOrTitle, language, sceneCount);

      // Map default voice if none provided
      const resolvedVoiceName = voiceName || (
        language === 'english'
          ? (voiceGender === 'male' ? 'en-US-GuyNeural' : 'en-US-AriaNeural')
          : (voiceGender === 'male' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural')
      );

      // 3. Construct project schema
      const newProject = {
        id: projectId,
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

      // 4. Save to JSON Database
      dbService.saveProject(newProject);
      res.status(201).json(newProject);
    } catch (error) {
      console.error('[Project Controller] Script generation failed:', error);
      res.status(500).json({ error: `Script generation failed: ${error.message}` });
    }
  },

  // Update Project (e.g. edit narration, metadata, or prompts)
  async updateProject(req, res) {
    try {
      const existingProject = dbService.getProject(req.params.id);
      if (!existingProject) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Merge request body changes
      const updatedProject = { ...existingProject, ...req.body };
      
      // Ensure ctaSettings object is merged nestedly so we don't overwrite other settings
      if (req.body.ctaSettings) {
        updatedProject.ctaSettings = {
          ...existingProject.ctaSettings,
          ...req.body.ctaSettings
        };
      }
      
      dbService.saveProject(updatedProject);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Trigger Video Render Queue (Phase 2)
  async renderProject(req, res) {
    try {
      const project = dbService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Enqueue rendering job (supporting voice_only partial renders)
      const { renderType } = req.body;
      const success = queueService.enqueue(project.id, { renderType });
      if (success) {
        res.json({ message: 'Project added to rendering queue', projectId: project.id });
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
      const project = dbService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Cancel rendering if it is currently in queue or rendering
      if (project.status === 'rendering' || project.status === 'queued') {
        queueService.cancelProject(project.id);
      }

      // 1. Delete DB entry
      dbService.deleteProject(project.id);

      // 2. Cleanup local folder
      const projectFolder = path.join(env.paths.projects, project.id);
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
      hasPixabayKey: !!env.PIXABAY_API_KEY,
      env: {
        GEMINI_API_KEY: env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE' ? '' : env.GEMINI_API_KEY,
        PEXELS_API_KEY: env.PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY_HERE' ? '' : env.PEXELS_API_KEY,
        PIXABAY_API_KEY: env.PIXABAY_API_KEY || ''
      }
    });
  },

  // Update Env Configuration Status (Write keys back to .env file)
  async saveSettings(req, res) {
    const { GEMINI_API_KEY, PEXELS_API_KEY, PIXABAY_API_KEY } = req.body;
    
    try {
      const envPath = path.join(env.paths.root, '.env');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }

      const updateKey = (content, key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value || ''}`);
        } else {
          return content + `\n${key}=${value || ''}`;
        }
      };

      envContent = updateKey(envContent, 'GEMINI_API_KEY', GEMINI_API_KEY);
      envContent = updateKey(envContent, 'PEXELS_API_KEY', PEXELS_API_KEY);
      envContent = updateKey(envContent, 'PIXABAY_API_KEY', PIXABAY_API_KEY);

      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

      // Update runtime env configurations
      env.GEMINI_API_KEY = GEMINI_API_KEY;
      env.PEXELS_API_KEY = PEXELS_API_KEY;
      env.PIXABAY_API_KEY = PIXABAY_API_KEY;

      res.json({ success: true, message: 'Settings saved successfully' });
    } catch (error) {
      console.error('[Project Controller] Failed to save settings:', error);
      res.status(500).json({ error: `Failed to save settings: ${error.message}` });
    }
  },

  // Reorder project scenes
  async reorderScenes(req, res) {
    const { id } = req.params;
    const { scenes } = req.body;
    try {
      const project = dbService.getProject(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      project.scenes = scenes.map((scene, index) => ({
        ...scene,
        sceneNumber: index + 1
      }));

      dbService.saveProject(project);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Regenerate a single scene aspect (voice, clip, subtitles, or all) and rebuild short
  async regenerateScene(req, res) {
    const { id, sceneNumber } = req.params;
    const { regenerateType = 'all' } = req.body; // 'all', 'clip', 'voice', 'subtitles'

    try {
      const project = dbService.getProject(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const num = parseInt(sceneNumber, 10);
      if (isNaN(num) || num < 1 || num > project.scenes.length) {
        return res.status(400).json({ error: 'Invalid sceneNumber' });
      }

      const success = queueService.enqueueRegenerate(project.id, num, regenerateType);
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
    const { id } = req.params;
    try {
      const project = dbService.getProject(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      queueService.cancelProject(project.id);
      res.json({ success: true, message: 'Rendering process cancelled successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a specific scene from a project draft
  async deleteScene(req, res) {
    const { id, sceneNumber } = req.params;
    try {
      const project = dbService.getProject(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

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

      dbService.saveProject(project);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default projectController;
