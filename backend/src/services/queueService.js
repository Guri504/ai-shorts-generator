import path from 'path';
import fs from 'fs';
import { dbService } from './dbService.js';
import { env } from '../config/env.js';
import { ttsService } from './ttsService.js';
import { stockVideoService } from './stockVideoService.js';
import { videoGenerationService } from './videoGenerationService.js';
import { subtitleService } from './subtitleService.js';
import { ffmpegService } from './ffmpegService.js';
import { wsManager } from '../utils/wsManager.js';
import { processRegistry } from '../utils/processRegistry.js';
import { ctaService } from './ctaService.js';
import { storageHelper } from '../utils/storageHelper.js';

// Helper to copy prebuilt CTA video clip or retrieve clip based on type
const ensureSceneVideoClip = async (project, scene, clipPath, duration, isCta) => {
  if (isCta) {
    const style = project.ctaSettings?.style || 'auto';
    let resolvedStyle = style.toLowerCase();
    if (resolvedStyle === 'auto') {
      resolvedStyle = ctaService.detectStyle(project.topic, project.bgMusicGenre || project.musicGenre);
    }
    
    let filename = 'minimal_tech.mp4';
    if (resolvedStyle === 'horror') filename = 'horror_suspense.mp4';
    else if (resolvedStyle === 'ai') filename = 'ai_futuristic.mp4';
    else if (resolvedStyle === 'tech') filename = 'cyberpunk.mp4';
    else if (resolvedStyle === 'motivation') filename = 'dark_neon.mp4';

    const prebuiltPath = path.join(env.paths.cta, filename);
    if (fs.existsSync(prebuiltPath)) {
      console.log(`[Queue Manager] Copying prebuilt CTA video: ${filename}`);
      fs.copyFileSync(prebuiltPath, clipPath);
    } else {
      console.warn(`[Queue Manager] Prebuilt CTA ${filename} not found, generating fallback.`);
      await videoGenerationService.generatePlaceholderVideo('CTA', clipPath, duration);
    }
  } else if (scene.clipType === 'Stock') {
    await stockVideoService.getClip(scene.stockSearchKeyword, clipPath, duration);
  } else {
    await videoGenerationService.generateClip(scene.visualPrompt, clipPath, duration);
  }
};

// Multi-tenant scheduling queue
let queue = []; // Array of jobs: { projectId, type, userId, sceneNumber, regenerateType }
let activeJobs = new Map(); // userId -> active job object
const MAX_GLOBAL_CONCURRENCY = 2; // Max 2 parallel video renders globally

// Helper to calculate render ETA in seconds
function calculateETA(project, isSingleScene = false, singleSceneNumber = null, singleRegenerateType = 'all', isVoiceOnly = false) {
  const renderScenes = [...project.scenes];
  if (project.ctaSettings?.enabled) {
    const ctaScene = project.ctaScene || { clipType: 'AI' };
    renderScenes.push(ctaScene);
  }

  let eta = 0;
  if (isVoiceOnly) {
    eta += renderScenes.length * (2.5 + 2.0); // Voice synthesis + compile scene
    eta += 5.0; // Concat and mix
    return Math.round(eta);
  }
  if (isSingleScene) {
    const scene = renderScenes[singleSceneNumber - 1];
    if (!scene) return 10;
    if (singleRegenerateType === 'all' || singleRegenerateType === 'voice') eta += 2.5;
    if (singleRegenerateType === 'all' || singleRegenerateType === 'clip') {
      eta += (scene.clipType === 'AI') ? 15 : 5;
    }
    if (singleRegenerateType === 'all' || singleRegenerateType === 'subtitles') eta += 1;
    eta += 3; // Compile scene
    eta += 5; // Final stitch and mix
  } else {
    // Full project
    eta += 2.0; // background music
    for (let i = 0; i < renderScenes.length; i++) {
      const scene = renderScenes[i];
      if (!scene.voiceAudioPath || !fs.existsSync(scene.voiceAudioPath)) {
        eta += 2.5;
      }
      if (!scene.videoPath || !fs.existsSync(scene.videoPath)) {
        eta += (scene.clipType === 'AI') ? 15 : 5;
      }
      eta += 3.5; // subtitle + compile scene
    }
    eta += 5.0; // merge and final duck
  }
  return Math.round(eta);
}

async function limitConcurrency(concurrency, items, asyncFn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => asyncFn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

export const queueService = {
  /**
   * Enqueues a project for rendering (supports full and voice_only)
   * @param {string} projectId 
   * @param {Object} options 
   */
  async enqueue(projectId, options = {}) {
    const project = await dbService.getProject(projectId);
    if (!project) return false;

    const renderType = options.renderType || 'full';
    const isVoiceOnly = renderType === 'voice_only';

    // Reset log history for fresh run
    wsManager.clearHistory(projectId);

    // Calculate queue ETA including jobs already in queue
    let totalQueueEta = calculateETA(project, false, null, 'all', isVoiceOnly);
    for (const job of queue) {
      const qProj = await dbService.getProject(job.projectId);
      if (qProj) {
        totalQueueEta += calculateETA(
          qProj, 
          job.type === 'single', 
          job.sceneNumber, 
          job.regenerateType, 
          job.type === 'voice_only'
        );
      }
    }

    project.status = 'queued';
    project.progress = 0;
    project.stepStatus = isVoiceOnly ? 'Waiting in queue for voice-only render...' : 'Waiting in render queue...';
    project.error = null;
    project.eta = totalQueueEta;
    await dbService.saveProject(project);

    // Push the render job
    queue.push({ 
      projectId, 
      type: renderType, 
      userId: project.userId.toString() 
    });

    console.log(`[Queue Manager] Enqueued ${renderType} render for project: ${projectId}. Total Queue Size: ${queue.length}`);
    wsManager.log(projectId, {
      message: isVoiceOnly ? 'Added to voice-only render queue...' : 'Added to render queue. Waiting for slot...',
      progress: 0,
      currentStage: 'queued',
      eta: totalQueueEta
    });

    this.processQueue();
    return true;
  },

  /**
   * Enqueues a single scene targeted regeneration
   */
  async enqueueRegenerate(projectId, sceneNumber, regenerateType) {
    const project = await dbService.getProject(projectId);
    if (!project) return false;

    // Reset log history for fresh run
    wsManager.clearHistory(projectId);

    // Calculate queue ETA including jobs already in queue
    let totalQueueEta = calculateETA(project, true, sceneNumber, regenerateType);
    for (const job of queue) {
      const qProj = await dbService.getProject(job.projectId);
      if (qProj) {
        totalQueueEta += calculateETA(qProj, job.type === 'single', job.sceneNumber, job.regenerateType);
      }
    }

    project.status = 'queued';
    project.progress = 0;
    project.stepStatus = `Queueing scene ${sceneNumber} regeneration (${regenerateType})...`;
    project.error = null;
    project.eta = totalQueueEta;
    await dbService.saveProject(project);

    queue.push({
      projectId,
      type: 'single',
      sceneNumber,
      regenerateType,
      userId: project.userId.toString()
    });

    console.log(`[Queue Manager] Enqueued scene ${sceneNumber} regeneration for: ${projectId}`);
    wsManager.log(projectId, {
      message: `Scene ${sceneNumber} regeneration (${regenerateType}) queued...`,
      progress: 0,
      currentStage: 'queued',
      eta: totalQueueEta
    });

    this.processQueue();
    return true;
  },

  async cancelProject(projectId) {
    console.log(`[Queue Manager] Request to cancel rendering for project: ${projectId}`);
    
    // 1. Remove from queue list if it is queued but not active yet
    const initialLength = queue.length;
    queue = queue.filter(job => job.projectId !== projectId);
    const wasRemoved = queue.length < initialLength;
    if (wasRemoved) {
      console.log(`[Queue Manager] Releasing project ${projectId} from the queue.`);
    }

    // 2. If it is currently active, kill its active subprocesses
    for (const [userId, activeJob] of activeJobs.entries()) {
      if (activeJob.projectId === projectId) {
        console.log(`[Queue Manager] Actively rendering project ${projectId} for user ${userId}. Killing processes...`);
        processRegistry.kill(projectId);
        activeJobs.delete(userId);
      }
    }

    const project = await dbService.getProject(projectId);
    if (project) {
      project.status = 'draft';
      project.progress = 0;
      project.stepStatus = 'Render process cancelled by user';
      project.error = null;
      await dbService.saveProject(project);

      wsManager.log(projectId, {
        message: 'Render process cancelled by user.',
        progress: 0,
        currentStage: 'draft'
      });
    }

    this.processQueue();
    return true;
  },

  /**
   * Process the next job in the queue (tenant-isolated concurrent scheduling)
   */
  async processQueue() {
    // 1. Check if global render capacity is reached
    if (activeJobs.size >= MAX_GLOBAL_CONCURRENCY) return;
    if (queue.length === 0) return;

    // 2. Find the first job in the queue whose user does NOT have an active render
    let nextJobIndex = -1;
    for (let i = 0; i < queue.length; i++) {
      const job = queue[i];
      if (!activeJobs.has(job.userId)) {
        nextJobIndex = i;
        break;
      }
    }

    // 3. If no such job is found, we do not start rendering to enforce the per-user concurrency limit
    if (nextJobIndex === -1) return;

    const job = queue.splice(nextJobIndex, 1)[0];
    activeJobs.set(job.userId, job);
    processRegistry.setCurrentProject(job.projectId);

    console.log(`[Queue Manager] Starting render job of type: ${job.type} for project: ${job.projectId} (User: ${job.userId})`);

    try {
      const startTime = Date.now();
      if (job.type === 'full') {
        await this.renderProject(job.projectId);
      } else if (job.type === 'voice_only') {
        await this.renderProjectVoiceOnly(job.projectId);
      } else if (job.type === 'single') {
        await this.renderSingleScene(job.projectId, job.sceneNumber, job.regenerateType);
      }
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Queue Manager] Finished job for ${job.projectId} in ${durationSec}s`);
    } catch (err) {
      console.error(`[Queue Manager] Job processing failed for project ${job.projectId}:`, err);
      const project = await dbService.getProject(job.projectId);
      if (project) {
        if (project.status !== 'draft') {
          project.status = 'failed';
          project.error = err.message || 'Unknown processing error';
          project.stepStatus = 'Rendering failed';
          await dbService.saveProject(project);
          
          wsManager.log(job.projectId, {
            message: `ERROR: ${project.error}`,
            progress: project.progress,
            currentStage: 'failed'
          });
        }
      }
    } finally {
      activeJobs.delete(job.userId);
      processRegistry.setCurrentProject(null);
      this.processQueue();
    }
  },

  /**
   * Performs full rendering pipeline
   */
  async renderProject(projectId) {
    const project = await dbService.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const projectDir = storageHelper.getProjectDir(project.userId, projectId);
    
    // Dynamic CTA scene assembly
    let renderScenes = [...project.scenes];
    let ctaDuration = 0;

    if (project.ctaSettings?.enabled) {
      const newCtaText = ctaService.getText(project.ctaSettings.language || project.voiceLanguage);
      const newCtaPrompt = ctaService.getVisualPrompt(project.ctaSettings.style, project.topic, project.bgMusicGenre || project.musicGenre);
      
      let ctaScene = project.ctaScene;
      
      if (!ctaScene || ctaScene.narration !== newCtaText || ctaScene.visualPrompt !== newCtaPrompt) {
        if (ctaScene) {
          console.log('[Queue Manager] CTA settings changed. Invalidating cached CTA assets.');
          try { if (ctaScene.voiceAudioPath && fs.existsSync(ctaScene.voiceAudioPath)) fs.unlinkSync(ctaScene.voiceAudioPath); } catch {}
          try { if (ctaScene.videoPath && fs.existsSync(ctaScene.videoPath)) fs.unlinkSync(ctaScene.videoPath); } catch {}
        }
        
        ctaScene = ctaService.generateCtaScene(project);
        ctaScene.narration = newCtaText;
        ctaScene.visualPrompt = newCtaPrompt;
      }

      ctaScene.sceneNumber = project.scenes.length + 1;
      project.ctaScene = ctaScene;
      await dbService.saveProject(project);
      
      renderScenes.push(project.ctaScene);
      ctaDuration = project.ctaSettings.duration || 5;
    }

    let remainingEta = project.eta || calculateETA(project, false);
    const startEtaTime = Date.now();

    const updateProgress = async (progress, stage, msg, currentScene = 0) => {
      // Calculate real time elapsed and adjust remaining ETA
      const elapsed = Math.round((Date.now() - startEtaTime) / 1000);
      let etaVal = Math.max(1, remainingEta - elapsed);
      if (progress >= 100) etaVal = 0;

      project.status = 'rendering';
      project.progress = progress;
      project.stepStatus = msg;
      project.eta = etaVal;
      await dbService.saveProject(project);

      wsManager.log(projectId, {
        message: msg,
        progress,
        currentStage: stage,
        currentScene,
        eta: etaVal,
        renderSpeed: currentScene > 0 ? (elapsed / currentScene).toFixed(1) : 0
      });
    };

    // Step 1: Parallel Voiceover Synthesis (Phase 1)
    await updateProgress(10, 'voice_generation', 'Synthesizing all narration voiceovers in parallel...');
    const voiceTasks = renderScenes.map((scene, index) => {
      return async () => {
        const sceneNumber = index + 1;
        const voicePath = path.join(projectDir, `scene_${sceneNumber}_voice.mp3`);
        if (!scene.voiceAudioPath || !fs.existsSync(scene.voiceAudioPath)) {
          const voiceName = project.voiceName || `${project.voiceLanguage}-${project.voiceGender}`;
          const ttsResult = await ttsService.synthesize(scene.narration, voiceName, voicePath, {
            speed: project.voiceSpeed,
            pitch: project.voicePitch,
            volume: project.voiceVolume
          });
          scene.voiceAudioPath = ttsResult.audioPath;
          scene.wordTimings = ttsResult.wordTimings;
        }
        scene.duration = await ffmpegService.getDuration(scene.voiceAudioPath);
      };
    });

    await limitConcurrency(6, voiceTasks, (task) => task());
    await dbService.saveProject(project);

    // Step 2: Parallel Video Clips Retrieval (Phase 2)
    await updateProgress(30, 'clip_generation', 'Downloading / generating scene video clips...');
    const videoTasks = renderScenes.map((scene, index) => {
      return async () => {
        const sceneNumber = index + 1;
        const clipPath = path.join(projectDir, `scene_${sceneNumber}_raw.mp4`);
        if (!scene.videoPath || !fs.existsSync(scene.videoPath)) {
          const isCta = (scene.sceneNumber === 999 || (index === renderScenes.length - 1 && project.ctaSettings?.enabled));
          await ensureSceneVideoClip(project, scene, clipPath, scene.duration, isCta);
          scene.videoPath = clipPath;
        }
        
        // Extract scene thumbnail for timeline preview
        const thumbPath = path.join(projectDir, `scene_${sceneNumber}_thumb.jpg`);
        if (!scene.thumbnailPath || !fs.existsSync(thumbPath)) {
          try {
            await ffmpegService.extractThumbnail(scene.videoPath, thumbPath);
            scene.thumbnailPath = `/api/assets/projects/${projectId}/scene_${sceneNumber}_thumb.jpg`;
          } catch (thumbErr) {
            console.warn(`[Queue Manager] Failed to extract thumbnail for Scene ${sceneNumber}:`, thumbErr.message);
          }
        }
      };
    });

    // Sequential execution (concurrency=1) for AI image generation to prevent
    // Pollinations 402 rate limits and HuggingFace throttling
    await limitConcurrency(1, videoTasks, (task) => task());
    await dbService.saveProject(project);

    // 1. Fetch Background Music
    await updateProgress(50, 'music_fetching', 'Fetching background music track...');
    const musicPath = await ffmpegService.getBackgroundMusic(project.bgMusicGenre || project.musicGenre);

    // Step 3: Parallel Scene Compilation (Phase 3)
    await updateProgress(60, 'scene_rendering', 'Compiling and rendering all vertical scenes...');
    const compiledScenePaths = [];
    const compileTasks = renderScenes.map((scene, index) => {
      return async () => {
        const sceneNumber = index + 1;
        const assPath = path.join(projectDir, `scene_${sceneNumber}_subs.ass`);
        const renderedScenePath = path.join(projectDir, `scene_${sceneNumber}_rendered.mp4`);
        
        // Caching: Skip if this segment is already rendered
        if (fs.existsSync(renderedScenePath)) {
          console.log(`[Queue Manager] Scene cache hit for Scene ${sceneNumber}. Reusing segment.`);
          compiledScenePaths[index] = renderedScenePath;
          return;
        }

        subtitleService.writeAssFile(scene.wordTimings, assPath);
        await ffmpegService.compileScene(scene.videoPath, scene.voiceAudioPath, assPath, renderedScenePath, scene.duration);
        compiledScenePaths[index] = renderedScenePath;
      };
    });

    // Run compilations with concurrency of 2 to optimize CPU cores without freezing
    await limitConcurrency(2, compileTasks, (task) => task());

    // Step 4: Stitch Scenes & Mix Background Sidechained Music
    await updateProgress(85, 'merging', 'Mixing and ducking background music with final scenes stitch...');
    const finalOutputPath = path.join(storageHelper.getUserOutputDir(project.userId), `${projectId}_final.mp4`);
    const cleanCompiledPaths = compiledScenePaths.filter(Boolean);
    await ffmpegService.mergeAndMixMusic(cleanCompiledPaths, musicPath, finalOutputPath, ctaDuration);

    // 4. Complete
    project.status = 'completed';
    project.progress = 100;
    project.stepStatus = 'Rendering Completed successfully!';
    project.outputPath = finalOutputPath;
    await dbService.saveProject(project);

    wsManager.log(projectId, {
      message: 'Video rendering finished! Preview is ready.',
      progress: 100,
      currentStage: 'complete',
      currentScene: renderScenes.length
    });
  },

  /**
   * Performs targeted single scene regeneration
   */
  async renderSingleScene(projectId, sceneNumber, regenerateType) {
    const project = await dbService.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const projectDir = storageHelper.getProjectDir(project.userId, projectId);
    const sceneIndex = sceneNumber - 1;
    const scene = project.scenes[sceneIndex];
    if (!scene) throw new Error(`Scene ${sceneNumber} not found`);

    let remainingEta = calculateETA(project, true, sceneNumber, regenerateType);
    const startEtaTime = Date.now();

    const updateProgress = async (progress, stage, msg) => {
      const elapsed = Math.round((Date.now() - startEtaTime) / 1000);
      const etaVal = Math.max(1, remainingEta - elapsed);

      project.status = 'rendering';
      project.progress = progress;
      project.stepStatus = msg;
      project.eta = etaVal;
      await dbService.saveProject(project);

      wsManager.log(projectId, {
        message: msg,
        progress,
        currentStage: stage,
        currentScene: sceneNumber,
        eta: etaVal,
        renderSpeed: 0
      });
    };

    await updateProgress(10, 'preparing', `Initializing targeted refresh for Scene ${sceneNumber}...`);

    // A. Voice Regen
    if (regenerateType === 'all' || regenerateType === 'voice') {
      const voicePath = path.join(projectDir, `scene_${sceneNumber}_voice.mp3`);
      if (fs.existsSync(voicePath)) {
        try { fs.unlinkSync(voicePath); } catch (e) {}
      }
      
      await updateProgress(25, 'voice_generation', `Regenerating voiceover for Scene ${sceneNumber}...`);
      const voiceName = project.voiceName || `${project.voiceLanguage}-${project.voiceGender}`;
      const ttsResult = await ttsService.synthesize(scene.narration, voiceName, voicePath, {
        speed: project.voiceSpeed,
        pitch: project.voicePitch,
        volume: project.voiceVolume
      });
      
      scene.voiceAudioPath = ttsResult.audioPath;
      scene.wordTimings = ttsResult.wordTimings;
      await dbService.saveProject(project);
    }

    const duration = await ffmpegService.getDuration(scene.voiceAudioPath);
    scene.duration = duration;

    // B. Clip Regen
    if (regenerateType === 'all' || regenerateType === 'clip') {
      const clipPath = path.join(projectDir, `scene_${sceneNumber}_raw.mp4`);
      if (fs.existsSync(clipPath)) {
        try { fs.unlinkSync(clipPath); } catch (e) {}
      }

      await updateProgress(45, 'clip_generation', `Regenerating video clip for Scene ${sceneNumber} (${scene.clipType})...`);
      const isCta = (scene.sceneNumber === 999 || scene.isCta);
      await ensureSceneVideoClip(project, scene, clipPath, duration, isCta);
      scene.videoPath = clipPath;
      await dbService.saveProject(project);

      // Extract fresh thumbnail
      const thumbPath = path.join(projectDir, `scene_${sceneNumber}_thumb.jpg`);
      try {
        if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
        await ffmpegService.extractThumbnail(scene.videoPath, thumbPath);
        scene.thumbnailPath = `/api/assets/projects/${projectId}/scene_${sceneNumber}_thumb.jpg`;
        await dbService.saveProject(project);
      } catch (thumbErr) {
        console.warn(`[Queue Manager] Thumbnail refresh failed:`, thumbErr.message);
      }
    }

    // C. Subtitles
    await updateProgress(65, 'subtitles', `Re-compiling subtitles for Scene ${sceneNumber}...`);
    const assPath = path.join(projectDir, `scene_${sceneNumber}_subs.ass`);
    subtitleService.writeAssFile(scene.wordTimings, assPath);

    // D. Re-compile only this scene
    await updateProgress(75, 'scene_rendering', `Re-rendering Scene ${sceneNumber} file...`);
    const renderedScenePath = path.join(projectDir, `scene_${sceneNumber}_rendered.mp4`);
    if (fs.existsSync(renderedScenePath)) {
      try { fs.unlinkSync(renderedScenePath); } catch (e) {}
    }
    await ffmpegService.compileScene(scene.videoPath, scene.voiceAudioPath, assPath, renderedScenePath, duration);

    // E. Re-stitch all compiled scenes
    await updateProgress(85, 'merging', 'Re-stitching final vertical Short and mixing background music...');
    const compiledScenePaths = [];
    const compileTasks = [];
    
    const renderScenes = [...project.scenes];
    let ctaDuration = 0;
    if (project.ctaSettings?.enabled && project.ctaScene) {
      renderScenes.push(project.ctaScene);
      ctaDuration = project.ctaSettings.duration || 5;
    }

    for (let i = 1; i <= renderScenes.length; i++) {
      const p = path.join(projectDir, `scene_${i}_rendered.mp4`);
      compiledScenePaths.push(p);
      
      // If a neighboring scene segment doesn't exist, compile it now
      if (!fs.existsSync(p)) {
        compileTasks.push(async () => {
          const neighboringScene = renderScenes[i - 1];
          const neighborAss = path.join(projectDir, `scene_${i}_subs.ass`);
          subtitleService.writeAssFile(neighborScene.wordTimings, neighborAss);
          
          // Ensure raw visual and audio exist for CTA or other scene
          if (!neighboringScene.videoPath || !fs.existsSync(neighboringScene.videoPath)) {
            if (neighboringScene.sceneNumber === project.scenes.length + 1 || neighboringScene.sceneNumber === 999) {
              const clipPath = path.join(projectDir, `scene_${neighboringScene.sceneNumber}_raw.mp4`);
              await ensureSceneVideoClip(project, neighboringScene, clipPath, neighboringScene.duration || 5, true);
              neighboringScene.videoPath = clipPath;
            } else {
              throw new Error(`Raw video clip missing for Scene ${i}. Cannot regenerate.`);
            }
          }

          if (!neighboringScene.voiceAudioPath || !fs.existsSync(neighboringScene.voiceAudioPath)) {
            if (neighboringScene.sceneNumber === project.scenes.length + 1) {
              const voicePath = path.join(projectDir, `scene_${neighboringScene.sceneNumber}_voice.mp3`);
              const voiceName = project.voiceName || 'hi-IN-MadhurNeural';
              const ttsResult = await ttsService.synthesize(neighboringScene.narration, voiceName, voicePath, {
                speed: project.voiceSpeed,
                pitch: project.voicePitch,
                volume: project.voiceVolume
              });
              neighboringScene.voiceAudioPath = ttsResult.audioPath;
              neighboringScene.wordTimings = ttsResult.wordTimings;
              neighboringScene.duration = await ffmpegService.getDuration(ttsResult.audioPath);
            } else {
              throw new Error(`Voice track missing for Scene ${i}. Cannot regenerate.`);
            }
          }

          await ffmpegService.compileScene(
            neighboringScene.videoPath,
            neighboringScene.voiceAudioPath,
            neighborAss,
            p,
            neighboringScene.duration
          );
        });
      }
    }

    if (compileTasks.length > 0) {
      await limitConcurrency(2, compileTasks, (task) => task());
    }

    const musicPath = await ffmpegService.getBackgroundMusic(project.bgMusicGenre || project.musicGenre);
    const finalOutputPath = path.join(storageHelper.getUserOutputDir(project.userId), `${projectId}_final.mp4`);
    await ffmpegService.mergeAndMixMusic(compiledScenePaths, musicPath, finalOutputPath, ctaDuration);

    // F. Complete
    project.status = 'completed';
    project.progress = 100;
    project.stepStatus = 'Regeneration Completed!';
    project.outputPath = finalOutputPath;
    await dbService.saveProject(project);

    wsManager.log(projectId, {
      message: 'Regeneration completed successfully!',
      progress: 100,
      currentStage: 'complete',
      currentScene: sceneNumber
    });
  },

  /**
   * Performs partial smart re-rendering (voice, speed, and subtitles only)
   */
  async renderProjectVoiceOnly(projectId) {
    const project = await dbService.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const projectDir = storageHelper.getProjectDir(project.userId, projectId);

    // Dynamic CTA scene assembly
    let renderScenes = [...project.scenes];
    let ctaDuration = 0;

    if (project.ctaSettings?.enabled) {
      const newCtaText = ctaService.getText(project.ctaSettings.language || project.voiceLanguage);
      const newCtaPrompt = ctaService.getVisualPrompt(project.ctaSettings.style, project.topic, project.bgMusicGenre || project.musicGenre);
      
      let ctaScene = project.ctaScene;
      
      if (!ctaScene || ctaScene.narration !== newCtaText || ctaScene.visualPrompt !== newCtaPrompt) {
        if (ctaScene) {
          console.log('[Queue Manager] CTA settings changed. Invalidating cached CTA assets.');
          try { if (ctaScene.voiceAudioPath && fs.existsSync(ctaScene.voiceAudioPath)) fs.unlinkSync(ctaScene.voiceAudioPath); } catch {}
          try { if (ctaScene.videoPath && fs.existsSync(ctaScene.videoPath)) fs.unlinkSync(ctaScene.videoPath); } catch {}
        }
        
        ctaScene = ctaService.generateCtaScene(project);
        ctaScene.narration = newCtaText;
        ctaScene.visualPrompt = newCtaPrompt;
      }

      ctaScene.sceneNumber = project.scenes.length + 1;
      project.ctaScene = ctaScene;
      await dbService.saveProject(project);
      
      renderScenes.push(project.ctaScene);
      ctaDuration = project.ctaSettings.duration || 5;
    }

    let remainingEta = calculateETA(project, false, null, 'all', true);
    const startEtaTime = Date.now();

    const updateProgress = async (progress, stage, msg) => {
      const elapsed = Math.round((Date.now() - startEtaTime) / 1000);
      let etaVal = Math.max(1, remainingEta - elapsed);
      if (progress >= 100) etaVal = 0;

      project.status = 'rendering';
      project.progress = progress;
      project.stepStatus = msg;
      project.eta = etaVal;
      await dbService.saveProject(project);

      wsManager.log(projectId, {
        message: msg,
        progress,
        currentStage: stage,
        currentScene: 0,
        eta: etaVal,
        renderSpeed: 0
      });
    };

    // Step 1: Parallel Voiceover Synthesis
    await updateProgress(10, 'voice_generation', 'Regenerating narration voiceovers in parallel...');
    const voiceTasks = renderScenes.map((scene, index) => {
      return async () => {
        const sceneNumber = index + 1;
        const voicePath = path.join(projectDir, `scene_${sceneNumber}_voice.mp3`);
        
        // Force delete old voice file to regenerate it
        try { if (fs.existsSync(voicePath)) fs.unlinkSync(voicePath); } catch {}
        
        const voiceName = project.voiceName || 'hi-IN-MadhurNeural';
        const ttsResult = await ttsService.synthesize(scene.narration, voiceName, voicePath, {
          speed: project.voiceSpeed,
          pitch: project.voicePitch,
          volume: project.voiceVolume
        });
        scene.voiceAudioPath = ttsResult.audioPath;
        scene.wordTimings = ttsResult.wordTimings;
        scene.duration = await ffmpegService.getDuration(scene.voiceAudioPath);
      };
    });

    await limitConcurrency(6, voiceTasks, (task) => task());
    await dbService.saveProject(project);

    // Step 2: Fetch Background Music
    await updateProgress(50, 'music_fetching', 'Fetching background music track...');
    const musicPath = await ffmpegService.getBackgroundMusic(project.bgMusicGenre || project.musicGenre);

    // Step 3: Parallel Scene Compilation (bypassing visual generation)
    await updateProgress(65, 'scene_rendering', 'Re-compiling scene segments with new voice & subtitles...');
    const compiledScenePaths = [];
    const compileTasks = renderScenes.map((scene, index) => {
      return async () => {
        const sceneNumber = index + 1;
        const assPath = path.join(projectDir, `scene_${sceneNumber}_subs.ass`);
        const renderedScenePath = path.join(projectDir, `scene_${sceneNumber}_rendered.mp4`);
        
        // Force delete old rendered segment to re-render with new audio and subs
        try { if (fs.existsSync(renderedScenePath)) fs.unlinkSync(renderedScenePath); } catch {}

        // Ensure we have a valid raw video clip
        if (!scene.videoPath || !fs.existsSync(scene.videoPath)) {
          if (scene.sceneNumber === project.scenes.length + 1 || scene.sceneNumber === 999) {
            console.log('[Queue Manager] CTA raw video clip missing. Copying on the fly...');
            const clipPath = path.join(projectDir, `scene_${scene.sceneNumber}_raw.mp4`);
            await ensureSceneVideoClip(project, scene, clipPath, scene.duration || 5, true);
            scene.videoPath = clipPath;
          } else {
            throw new Error(`Raw video clip missing for Scene ${sceneNumber}. Please run full render first.`);
          }
        }

        subtitleService.writeAssFile(scene.wordTimings, assPath);
        await ffmpegService.compileScene(scene.videoPath, scene.voiceAudioPath, assPath, renderedScenePath, scene.duration);
        compiledScenePaths[index] = renderedScenePath;
      };
    });

    await limitConcurrency(2, compileTasks, (task) => task());

    // Step 4: Stitch Scenes & Mix Background Sidechained Music
    await updateProgress(85, 'merging', 'Mixing and ducking background music with final scenes stitch...');
    const finalOutputPath = path.join(storageHelper.getUserOutputDir(project.userId), `${projectId}_final.mp4`);
    const cleanCompiledPaths = compiledScenePaths.filter(Boolean);
    await ffmpegService.mergeAndMixMusic(cleanCompiledPaths, musicPath, finalOutputPath, ctaDuration);

    // Complete
    project.status = 'completed';
    project.progress = 100;
    project.stepStatus = 'Quick voice update completed!';
    project.outputPath = finalOutputPath;
    await dbService.saveProject(project);

    wsManager.log(projectId, {
      message: 'Quick voice update finished! Preview is ready.',
      progress: 100,
      currentStage: 'complete',
      currentScene: renderScenes.length
    });
  },

  /**
   * Deletes intermediate scene video blocks to free up local disk space
   */
  cleanupIntermediateFiles(filePaths) {
    console.log('[Queue Manager] Cleaning up intermediate scene files...');
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn(`[Queue Manager] Failed to clean file ${filePath}:`, e.message);
      }
    }
  }
};

export default queueService;
