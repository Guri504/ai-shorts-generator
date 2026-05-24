import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

export const storageHelper = {
  /**
   * Resolves root storage directory for a specific user
   */
  getUserDir(userId) {
    if (!userId) throw new Error('userId is required for storage helper');
    const cleanUserId = userId.toString();
    const dir = path.join(env.paths.storage, 'users', cleanUserId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },

  /**
   * Resolves isolated project assets directory
   */
  getProjectDir(userId, projectId) {
    if (!projectId) throw new Error('projectId is required for storage helper');
    const dir = path.join(this.getUserDir(userId), 'projects', projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },

  /**
   * Resolves output videos directory for a user
   */
  getUserOutputDir(userId) {
    const dir = path.join(this.getUserDir(userId), 'outputs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  },

  /**
   * Resolves user cache directory (previews, audio fallback tracks)
   */
  getUserCacheDir(userId) {
    const dir = path.join(this.getUserDir(userId), 'cache');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }
};

export default storageHelper;
