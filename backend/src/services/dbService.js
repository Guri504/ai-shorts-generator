import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

const DB_FILE = path.join(env.paths.storage, 'db.json');

// Initialize database file if it doesn't exist
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      projects: [],
      cache: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

// Read database contents
function readDb() {
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database file, resetting:', error);
    const defaultData = { projects: [], cache: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
}

// Write database contents
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to database file:', error);
    return false;
  }
}

export const dbService = {
  // Get all projects
  getProjects() {
    const db = readDb();
    return db.projects || [];
  },

  // Get project by ID
  getProject(id) {
    const db = readDb();
    return db.projects.find((p) => p.id === id) || null;
  },

  // Save/Update project
  saveProject(project) {
    const db = readDb();
    const index = db.projects.findIndex((p) => p.id === project.id);
    
    project.updatedAt = new Date().toISOString();
    
    if (index !== -1) {
      db.projects[index] = { ...db.projects[index], ...project };
    } else {
      project.createdAt = new Date().toISOString();
      db.projects.push(project);
    }
    
    writeDb(db);
    return project;
  },

  // Delete project
  deleteProject(id) {
    const db = readDb();
    db.projects = db.projects.filter((p) => p.id !== id);
    writeDb(db);
    return true;
  },

  // Cache Management
  getCache(key) {
    const db = readDb();
    return db.cache[key] || null;
  },

  setCache(key, value) {
    const db = readDb();
    db.cache[key] = {
      value,
      timestamp: new Date().toISOString()
    };
    writeDb(db);
    return true;
  }
};

export default dbService;
