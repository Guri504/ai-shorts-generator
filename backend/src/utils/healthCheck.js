import { exec } from 'child_process';
import fs from 'fs';
import { env } from '../config/env.js';
import { pollinationsService } from '../services/pollinationsService.js';

// ============================================================
// Startup Health Check System
// Verifies all critical services are available on server boot.
// Non-blocking: logs warnings but never crashes the server.
// ============================================================

export async function runStartupChecks() {
  console.log('\n🔍 Running startup health checks...\n');

  const results = [];

  // 1. Pollinations AI accessibility
  try {
    const ok = await pollinationsService.checkHealth();
    results.push({ service: 'Pollinations AI', status: ok ? '✅ Reachable' : '⚠️  Unreachable (images will use fallback)' });
  } catch {
    results.push({ service: 'Pollinations AI', status: '⚠️  Unreachable (images will use fallback)' });
  }

  // 2. FFmpeg availability
  try {
    await new Promise((resolve, reject) => {
      exec('ffmpeg -version', { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
    results.push({ service: 'FFmpeg', status: '✅ Installed' });
  } catch {
    results.push({ service: 'FFmpeg', status: '❌ NOT FOUND — rendering will fail!' });
  }

  // 3. Cache/storage directories
  const dirs = [
    { name: 'Storage', path: env.paths.storage },
    { name: 'Cache', path: env.paths.cache },
    { name: 'Projects', path: env.paths.projects },
    { name: 'Outputs', path: env.paths.outputs },
  ];
  for (const dir of dirs) {
    const exists = fs.existsSync(dir.path);
    if (!exists) {
      try {
        fs.mkdirSync(dir.path, { recursive: true });
        results.push({ service: `Dir: ${dir.name}`, status: '✅ Created' });
      } catch {
        results.push({ service: `Dir: ${dir.name}`, status: '❌ Failed to create' });
      }
    } else {
      results.push({ service: `Dir: ${dir.name}`, status: '✅ Exists' });
    }
  }

  // 4. Edge TTS (Python)
  try {
    await new Promise((resolve, reject) => {
      exec('python --version', { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
    results.push({ service: 'Python (Edge TTS)', status: '✅ Available' });
  } catch {
    // Try python3 as well
    try {
      await new Promise((resolve, reject) => {
        exec('python3 --version', { timeout: 5000 }, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
      });
      results.push({ service: 'Python (Edge TTS)', status: '✅ Available (python3)' });
    } catch {
      results.push({ service: 'Python (Edge TTS)', status: '⚠️  Not found — TTS may fail' });
    }
  }

  // 5. Gemini API key (text generation only)
  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 10) {
    results.push({ service: 'Gemini API Key', status: '✅ Configured' });
  } else {
    results.push({ service: 'Gemini API Key', status: '❌ Missing — script generation will fail!' });
  }

  // 6. Pexels API key (stock video)
  if (env.PEXELS_API_KEY && env.PEXELS_API_KEY.length > 5) {
    results.push({ service: 'Pexels API Key', status: '✅ Configured' });
  } else {
    results.push({ service: 'Pexels API Key', status: '⚠️  Missing — stock videos will use placeholders' });
  }

  // Print results
  console.log('┌──────────────────────────┬────────────────────────────────────────────┐');
  console.log('│ Service                  │ Status                                     │');
  console.log('├──────────────────────────┼────────────────────────────────────────────┤');
  for (const r of results) {
    const svc = r.service.padEnd(24);
    const sts = r.status.padEnd(42);
    console.log(`│ ${svc} │ ${sts} │`);
  }
  console.log('└──────────────────────────┴────────────────────────────────────────────┘');
  console.log('');
}

export default runStartupChecks;
