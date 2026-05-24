import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.resolve(__dirname, '../storage/server_logs.log');

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const writeToFile = (level, args) => {
  try {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (arg instanceof Error) return arg.stack || arg.message;
      return typeof arg === 'object' ? JSON.stringify(arg) : arg;
    }).join(' ');
    fs.appendFileSync(logFile, `[${timestamp}] [${level}] ${message}\n`, 'utf-8');
  } catch (e) {
    originalError.apply(console, ['Logging failed:', e]);
  }
};

console.log = (...args) => {
  originalLog.apply(console, args);
  writeToFile('INFO', args);
};

console.error = (...args) => {
  originalError.apply(console, args);
  writeToFile('ERROR', args);
};

console.warn = (...args) => {
  originalWarn.apply(console, args);
  writeToFile('WARN', args);
};

import app from './app.js';
import { env } from './config/env.js';
import { wsManager } from './utils/wsManager.js';
import { runStartupChecks } from './utils/healthCheck.js';
import { connectDb } from './services/dbService.js';
import { initializeAssets } from './utils/assetInitializer.js';

// Connect to MongoDB
connectDb().catch(err => console.error('[Server] Database connection failure:', err));

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  AI SHORTS GENERATOR BACKEND SERVER STARTED    `);
  console.log(`  Running on port: http://localhost:${PORT}     `);
  console.log(`  Environment:     ${env.NODE_ENV}            `);
  console.log(`===============================================`);
});

// Initialize WebSocket support
wsManager.init(server);

// Run startup health checks and generate assets (non-blocking)
runStartupChecks()
  .then(() => initializeAssets())
  .catch(err => {
    console.warn('[Startup Check] Initialization failed:', err.message);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
