import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve directory paths in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const backendDir = path.resolve(__dirname, '../../');

// Load environment variables from root directory first, fallback to backend
if (fs.existsSync(path.join(rootDir, '.env'))) {
  dotenv.config({ path: path.join(rootDir, '.env') });
} else {
  dotenv.config({ path: path.join(backendDir, '.env') });
}

// Define Storage & Asset Directories
const STORAGE_DIR = path.join(backendDir, 'storage');
const CACHE_DIR = path.join(STORAGE_DIR, 'cache');
const PROJECTS_DIR = path.join(STORAGE_DIR, 'projects');
const OUTPUTS_DIR = path.join(STORAGE_DIR, 'outputs');

const ASSETS_DIR = path.join(backendDir, 'assets');
const CTA_DIR = path.join(ASSETS_DIR, 'cta');
const BACKGROUNDS_DIR = path.join(ASSETS_DIR, 'backgrounds');
const OVERLAYS_DIR = path.join(ASSETS_DIR, 'overlays');
const TRANSITIONS_DIR = path.join(ASSETS_DIR, 'transitions');
const PARTICLES_DIR = path.join(ASSETS_DIR, 'particles');
const GLOWS_DIR = path.join(ASSETS_DIR, 'glows');

// Ensure all required directories exist
const directories = [
  STORAGE_DIR, CACHE_DIR, PROJECTS_DIR, OUTPUTS_DIR,
  ASSETS_DIR, CTA_DIR, BACKGROUNDS_DIR, OVERLAYS_DIR,
  TRANSITIONS_DIR, PARTICLES_DIR, GLOWS_DIR
];
directories.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  PEXELS_API_KEY: process.env.PEXELS_API_KEY || '',
  PIXABAY_API_KEY: process.env.PIXABAY_API_KEY || '',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-shorts-generator',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_12345',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'super_secret_encryption_key_123456789012',
  
  // Google OAuth Credentials (for user authentication)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',

  // Default credits for new SaaS signups
  INITIAL_FREE_CREDITS: parseInt(process.env.INITIAL_FREE_CREDITS || '99999', 10),
  DISABLE_CREDIT_SYSTEM: process.env.DISABLE_CREDIT_SYSTEM === 'false' ? false : true,

  // HuggingFace API Key (fallback image generation)
  HF_API_KEY: process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY || '',

  // Storage Paths
  paths: {
    root: rootDir,
    backend: backendDir,
    storage: STORAGE_DIR,
    cache: CACHE_DIR,
    projects: PROJECTS_DIR,
    outputs: OUTPUTS_DIR,
    assets: ASSETS_DIR,
    cta: CTA_DIR,
    backgrounds: BACKGROUNDS_DIR,
    overlays: OVERLAYS_DIR,
    transitions: TRANSITIONS_DIR,
    particles: PARTICLES_DIR,
    glows: GLOWS_DIR
  }
};

export default env;
