import express from 'express';
import { projectController } from '../controllers/projectController.js';
import { voiceController } from '../controllers/voiceController.js';

const router = express.Router();

// Voices API Endpoints
router.get('/voices', voiceController.getVoices);
router.post('/voices/preview', voiceController.previewVoice);

// Projects REST Endpoints
router.get('/projects', projectController.getAllProjects);
router.get('/projects/:id', projectController.getProjectById);
router.post('/projects', projectController.createProject);
router.put('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

// Timeline Reorder Endpoint
router.put('/projects/:id/scenes/reorder', projectController.reorderScenes);

// Render Endpoint
router.post('/projects/:id/render', projectController.renderProject);

// Cancel Endpoint
router.post('/projects/:id/cancel', projectController.cancelRender);

// Single Scene Regeneration Endpoint
router.post('/projects/:id/scenes/:sceneNumber/regenerate', projectController.regenerateScene);

// Delete Scene Endpoint
router.delete('/projects/:id/scenes/:sceneNumber', projectController.deleteScene);

// Settings Config Endpoints
router.get('/settings', projectController.getSettings);
router.post('/settings', projectController.saveSettings);

export default router;
