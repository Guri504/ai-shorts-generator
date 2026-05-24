import path from 'path';
import fs from 'fs';
import { storageHelper } from '../utils/storageHelper.js';

export const assetController = {
  /**
   * Serves an asset from an isolated project directory
   */
  async getProjectAsset(req, res) {
    const projectId = req.params.id;
    const fileName = req.params.file;
    const userId = req.user._id;

    try {
      const projectDir = storageHelper.getProjectDir(userId, projectId);
      const filePath = path.join(projectDir, fileName);

      // Prevent Directory Traversal Vulnerability
      const relative = path.relative(projectDir, filePath);
      const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
      
      if (!isSafe || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Asset not found or access denied' });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error('[Asset Controller] Project asset retrieval error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Serves final output video
   */
  async getOutputAsset(req, res) {
    const projectId = req.params.id;
    const userId = req.user._id;

    try {
      const outputDir = storageHelper.getUserOutputDir(userId);
      const filePath = path.join(outputDir, `${projectId}_final.mp4`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Rendered video output not found' });
      }

      res.sendFile(filePath);
    } catch (error) {
      console.error('[Asset Controller] Output video retrieval error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

export default assetController;
