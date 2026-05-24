import mongoose from 'mongoose';
import { dbService, connectDb } from '../services/dbService.js';
import { queueService } from '../services/queueService.js';
import Project from '../models/Project.js';

async function runRenderTest() {
  console.log('🏁 Starting Render Pipeline Verification Test...\n');

  try {
    await connectDb();

    // 1. Find the latest project in DB
    const latestProject = await Project.findOne().sort({ createdAt: -1 });
    if (!latestProject) {
      console.error('❌ No project found in the database. Run test_saas.js first.');
      process.exit(1);
    }

    console.log(`Found project: "${latestProject.topic}" (ID: ${latestProject.id})`);

    // 2. Configure CTA outro settings on this project
    console.log('Configuring CTA outro settings for test...');
    latestProject.ctaSettings = {
      enabled: true,
      style: 'tech',
      language: 'hinglish',
      duration: 5,
      intensity: 'energetic'
    };

    latestProject.ctaScene = {
      sceneNumber: latestProject.scenes.length + 1,
      narration: 'Aise hi aur amazing videos ke liye hume follow aur subscribe karein!',
      visualPrompt: 'Prebuilt Cyberpunk CTA outro template',
      clipType: 'Stock',
      stockSearchKeyword: 'subscribe CTA outro'
    };

    // Save project changes
    await latestProject.save();
    console.log('✓ Project updated with CTA outro scene configuration.');

    // 3. Enqueue the project for rendering
    console.log(`Enqueuing render for project: ${latestProject.id}...`);
    const success = await queueService.enqueue(latestProject.id, { renderType: 'full' });
    if (!success) {
      console.error('❌ Failed to enqueue project.');
      process.exit(1);
    }
    console.log('✓ Enqueue command successful. Monitoring progress...');

    // 4. Poll database for status changes and log progress
    const startTime = Date.now();
    let prevProgress = -1;
    let prevStep = '';

    const interval = setInterval(async () => {
      const proj = await Project.findOne({ id: latestProject.id });
      if (!proj) {
        console.error('\n❌ Error: Project disappeared from DB during render.');
        clearInterval(interval);
        process.exit(1);
      }

      if (proj.progress !== prevProgress || proj.stepStatus !== prevStep) {
        console.log(`[${Math.round((Date.now() - startTime) / 1000)}s] Status: ${proj.status.toUpperCase()} | Progress: ${proj.progress}% | Step: ${proj.stepStatus}`);
        prevProgress = proj.progress;
        prevStep = proj.stepStatus;
      }

      if (proj.status === 'completed') {
        console.log('\n==================================================');
        console.log('🎉 RENDER SUCCESSFUL!');
        console.log(`Final output location: ${proj.outputPath || 'Default storage'}`);
        console.log('==================================================');
        clearInterval(interval);
        process.exit(0);
      } else if (proj.status === 'failed') {
        console.error(`\n❌ RENDER FAILED. Error details: ${proj.error}`);
        clearInterval(interval);
        process.exit(1);
      }
    }, 2000);

  } catch (error) {
    console.error('❌ Error during rendering test setup:', error);
    process.exit(1);
  }
}

runRenderTest();
