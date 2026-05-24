import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Project from '../models/Project.js';

// Cache schema and model definition
const CacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const Cache = mongoose.models.Cache || mongoose.model('Cache', CacheSchema);

// Connection Status log
let dbConnected = false;

// Connect to MongoDB
export const connectDb = async () => {
  if (dbConnected) return;
  try {
    const mongoUri = env.MONGODB_URI;
    console.log(`[DB Service] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    
    dbConnected = true;
    console.log('[DB Service] Successfully connected to MongoDB database.');
  } catch (err) {
    console.error('[DB Service] MongoDB connection failed:', err.message);
    console.warn('[DB Service] Warning: App running without active database. Ensure MongoDB is running on port 27017.');
  }
};

export const dbService = {
  // Get all projects for a specific user
  async getProjects(userId) {
    await connectDb();
    if (!userId) return [];
    try {
      return await Project.find({ userId }).sort({ updatedAt: -1 }).lean();
    } catch (err) {
      console.error('[DB Service] getProjects failed:', err);
      return [];
    }
  },

  // Get project by ID
  async getProject(id) {
    await connectDb();
    try {
      const proj = await Project.findOne({ id });
      return proj;
    } catch (err) {
      console.error('[DB Service] getProject failed:', err);
      return null;
    }
  },

  // Save/Update project
  async saveProject(projectData, userId) {
    await connectDb();
    try {
      const id = projectData.id;
      
      // If we are passing a full Mongoose Document, just save it
      if (projectData && typeof projectData.save === 'function') {
        return await projectData.save();
      }

      // Otherwise upsert projectData
      const updatePayload = { ...projectData };
      if (userId) {
        updatePayload.userId = userId;
      }

      // Check if project exists
      const existing = await Project.findOne({ id });
      if (existing) {
        Object.assign(existing, updatePayload);
        return await existing.save();
      } else {
        if (!updatePayload.userId) {
          throw new Error('[DB Service] Cannot create project: userId is missing');
        }
        const newProj = new Project(updatePayload);
        return await newProj.save();
      }
    } catch (err) {
      console.error('[DB Service] saveProject failed:', err);
      throw err;
    }
  },

  // Delete project
  async deleteProject(id) {
    await connectDb();
    try {
      await Project.deleteOne({ id });
      return true;
    } catch (err) {
      console.error('[DB Service] deleteProject failed:', err);
      return false;
    }
  },

  // Cache Management
  async getCache(key) {
    await connectDb();
    try {
      const item = await Cache.findOne({ key });
      return item ? item.value : null;
    } catch (err) {
      console.error('[DB Service] getCache failed:', err);
      return null;
    }
  },

  async setCache(key, value) {
    await connectDb();
    try {
      await Cache.findOneAndUpdate(
        { key },
        { value, timestamp: new Date() },
        { upsert: true, returnDocument: 'after' }
      );
      return true;
    } catch (err) {
      console.error('[DB Service] setCache failed:', err);
      return false;
    }
  }
};

export default dbService;
