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

// Define Storage Directories
const STORAGE_DIR = path.join(backendDir, 'storage');
const CACHE_DIR = path.join(STORAGE_DIR, 'cache');
const PROJECTS_DIR = path.join(STORAGE_DIR, 'projects');
const OUTPUTS_DIR = path.join(STORAGE_DIR, 'outputs');

// Ensure storage directories exist
const directories = [STORAGE_DIR, CACHE_DIR, PROJECTS_DIR, OUTPUTS_DIR];
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
  
  // Storage Paths
  paths: {
    root: rootDir,
    backend: backendDir,
    storage: STORAGE_DIR,
    cache: CACHE_DIR,
    projects: PROJECTS_DIR,
    outputs: OUTPUTS_DIR
  }
};

export default env;
