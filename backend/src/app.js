import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/api.js';
import { env } from './config/env.js';

const app = express();

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Register API Routes
app.use('/api', apiRoutes);

// Serve output vertical videos statically
app.use('/outputs', express.static(env.paths.outputs));

// Serve intermediate project folder assets statically (voice audio, video clips)
app.use('/projects', express.static(env.paths.projects));

// Serve voice preview audio tracks dynamically
app.use('/previews', express.static(path.join(env.paths.cache, 'previews')));

// Simple healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
