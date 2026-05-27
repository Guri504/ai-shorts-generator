import express from 'express';
import { projectController } from '../controllers/projectController.js';
import { voiceController } from '../controllers/voiceController.js';
import { authController } from '../controllers/authController.js';
import { assetController } from '../controllers/assetController.js';
import { mergeController } from '../controllers/mergeController.js';
import { thumbnailController } from '../controllers/thumbnailController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { verifyProjectOwnership } from '../middlewares/ownershipMiddleware.js';
import { youtubeService } from '../services/youtubeService.js';
import YouTubeAccount from '../models/YouTubeAccount.js';
import { linkedinService } from '../services/linkedinService.js';
import LinkedInAccount from '../models/LinkedInAccount.js';
import multer from 'multer';
import { storageHelper } from '../utils/storageHelper.js';
import path from 'path';

const router = express.Router();

// Setup Multer for parsing multipart video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // req.user is populated by verifyToken middleware which must run before upload
    const userId = req.user._id;
    const dir = storageHelper.getUserCacheDir(userId);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit per clip
  }
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.getProfile);
router.get('/auth/google', authController.googleLoginUrl);
router.get('/auth/google/callback', authController.googleCallback);

// -------------------------------------------------------------
// Voices Endpoints (Protected)
// -------------------------------------------------------------
router.get('/voices', verifyToken, voiceController.getVoices);
router.post('/voices/preview', verifyToken, voiceController.previewVoice);

// -------------------------------------------------------------
// Projects REST Endpoints (Protected)
// -------------------------------------------------------------
router.get('/projects', verifyToken, projectController.getAllProjects);
router.post('/projects', verifyToken, projectController.createProject);

router.get('/projects/:id', verifyToken, verifyProjectOwnership, projectController.getProjectById);
router.put('/projects/:id', verifyToken, verifyProjectOwnership, projectController.updateProject);
router.delete('/projects/:id', verifyToken, verifyProjectOwnership, projectController.deleteProject);

// Timeline Reorder Endpoint
router.put('/projects/:id/scenes/reorder', verifyToken, verifyProjectOwnership, projectController.reorderScenes);

// Render Endpoint
router.post('/projects/:id/render', verifyToken, verifyProjectOwnership, projectController.renderProject);

// Cancel Endpoint
router.post('/projects/:id/cancel', verifyToken, verifyProjectOwnership, projectController.cancelRender);

// Single Scene Regeneration Endpoint
router.post('/projects/:id/scenes/:sceneNumber/regenerate', verifyToken, verifyProjectOwnership, projectController.regenerateScene);

// Delete Scene Endpoint
router.delete('/projects/:id/scenes/:sceneNumber', verifyToken, verifyProjectOwnership, projectController.deleteScene);

// -------------------------------------------------------------
// Settings Endpoints
// -------------------------------------------------------------
router.get('/settings', verifyToken, projectController.getSettings);
router.post('/settings', verifyToken, projectController.saveSettings);

// -------------------------------------------------------------
// YouTube Connection & Upload Endpoints
// -------------------------------------------------------------
router.get('/youtube/auth', verifyToken, (req, res) => {
  const url = youtubeService.getAuthUrl(req.user._id);
  res.json({ url });
});

// OAuth Callback Route (Receives google redirect, non-token authorization callback)
router.get('/youtube/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) {
    return res.status(400).send('<h3>Authentication failed: missing arguments.</h3>');
  }
  try {
    await youtubeService.handleCallback(code, userId);
    // Render a nice visual success window that can auto-close
    res.send(`
      <html>
        <body style="font-family: sans-serif; background-color: #121214; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h2 style="color: #4ade80;">YouTube Channel Connected Successfully!</h2>
          <p>You can now close this tab and return to the dashboard.</p>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`<h3>Error connecting YouTube account: ${err.message}</h3>`);
  }
});

// List connected YouTube accounts
router.get('/youtube/accounts', verifyToken, async (req, res) => {
  try {
    const accounts = await YouTubeAccount.find({ userId: req.user._id })
      .select('email channelName channelId createdAt')
      .lean();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// LinkedIn Connection Endpoints
// -------------------------------------------------------------
router.get('/linkedin/auth', verifyToken, (req, res) => {
  const url = linkedinService.getAuthUrl(req.user._id);
  res.json({ url });
});

// OAuth Callback Route
router.get('/linkedin/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) {
    return res.status(400).send('<h3>Authentication failed: missing arguments.</h3>');
  }
  try {
    await linkedinService.handleCallback(code, userId);
    res.send(`
      <html>
        <body style="font-family: sans-serif; background-color: #121214; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
          <h2 style="color: #3b82f6;">LinkedIn Account Connected Successfully!</h2>
          <p>You can now close this tab and return to the dashboard.</p>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`<h3>Error connecting LinkedIn account: ${err.message}</h3>`);
  }
});

// List connected LinkedIn accounts
router.get('/linkedin/accounts', verifyToken, async (req, res) => {
  try {
    const accounts = await LinkedInAccount.find({ userId: req.user._id })
      .select('email profileName linkedinId createdAt')
      .lean();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload project final output video to YouTube
router.post('/projects/:id/youtube-upload', verifyToken, verifyProjectOwnership, async (req, res) => {
  const { youtubeAccountId, privacyStatus, uploadType } = req.body;
  if (!youtubeAccountId) {
    return res.status(400).json({ error: 'youtubeAccountId is required' });
  }

  try {
    const uploadResult = await youtubeService.uploadVideo(
      req.user._id, 
      youtubeAccountId, 
      req.project.id, 
      privacyStatus, 
      uploadType
    );
    res.json({ success: true, message: 'Video uploaded to YouTube successfully!', data: uploadResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Secure File Asset Servicing Endpoints
// -------------------------------------------------------------
router.get('/assets/projects/:id/:file', verifyToken, verifyProjectOwnership, assetController.getProjectAsset);
router.get('/assets/outputs/:id', verifyToken, verifyProjectOwnership, assetController.getOutputAsset);

// -------------------------------------------------------------
// Clip Merging Endpoints
// -------------------------------------------------------------
router.post('/merge-clips', verifyToken, upload.array('clips', 10), mergeController.mergeClips);
router.post('/replace-audio', verifyToken, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), mergeController.replaceAudio);
router.post('/trim-audio', verifyToken, upload.single('audio'), mergeController.trimAudio);
router.get('/assets/merged/:filename', verifyToken, mergeController.getMergedAsset);
// -------------------------------------------------------------
// AI Thumbnail Studio Endpoints (Protected)
// -------------------------------------------------------------
router.post('/thumbnails/generate', verifyToken, thumbnailController.generateThumbnail);
router.post('/thumbnails/edit', verifyToken, thumbnailController.editThumbnail);
router.get('/thumbnails/history', verifyToken, thumbnailController.getThumbnailHistory);
router.get('/assets/thumbnails/:id/:version', verifyToken, thumbnailController.getThumbnailAsset);

export default router;
