import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { ttsService } from '../services/ttsService.js';
import { subtitleService } from '../services/subtitleService.js';
import { stockVideoService } from '../services/stockVideoService.js';
import { ffmpegService } from '../services/ffmpegService.js';

async function runLocalPipelineTest() {
  console.log('==================================================');
  console.log('  STARTING LOCAL VIDEO RENDERING PIPELINE TEST    ');
  console.log('==================================================');
  
  const testProjectId = 'proj_test_pipeline';
  const testProjectDir = path.join(env.paths.projects, testProjectId);
  
  if (!fs.existsSync(testProjectDir)) {
    fs.mkdirSync(testProjectDir, { recursive: true });
  }

  try {
    // 1. Generate Voice and Timings for Scene 1
    console.log('\n[Step 1] Synthesizing Hindi voice & timings for Scene 1...');
    const voice1Path = path.join(testProjectDir, 'scene_1_voice.mp3');
    const text1 = 'Duniya ka sabse bada rahasya kya hai? Kya space sach mein anant hai?';
    const ttsResult1 = await ttsService.synthesize(text1, 'hindi-male', voice1Path);
    console.log(`✓ Voice synthesized. Word count: ${ttsResult1.wordTimings.length}. Path: ${ttsResult1.audioPath}`);
    
    // 2. Generate Voice and Timings for Scene 2
    console.log('\n[Step 2] Synthesizing Hindi voice & timings for Scene 2...');
    const voice2Path = path.join(testProjectDir, 'scene_2_voice.mp3');
    const text2 = 'Chaliye is choti si video mein jaante hain is adbhut sach ko!';
    const ttsResult2 = await ttsService.synthesize(text2, 'hindi-male', voice2Path);
    console.log(`✓ Voice synthesized. Word count: ${ttsResult2.wordTimings.length}. Path: ${ttsResult2.audioPath}`);

    // 3. Probing scene durations
    const dur1 = await ffmpegService.getDuration(voice1Path);
    const dur2 = await ffmpegService.getDuration(voice2Path);
    console.log(`✓ Scene 1 Duration: ${dur1}s, Scene 2 Duration: ${dur2}s`);

    // 4. Generate Stock Video Placeholders (FFmpeg Fallback)
    console.log('\n[Step 3] Generating fallback vertical stock video assets...');
    const rawVideo1 = path.join(testProjectDir, 'scene_1_raw.mp4');
    const rawVideo2 = path.join(testProjectDir, 'scene_2_raw.mp4');
    
    await stockVideoService.generatePlaceholderVideo('SPACE MYSTERY BACKGROUND', rawVideo1, dur1);
    await stockVideoService.generatePlaceholderVideo('EXPLORING TRUTH SLATE', rawVideo2, dur2);
    console.log('✓ Video clip placeholders generated successfully.');

    // 5. Generate ASS Subtitles
    console.log('\n[Step 4] Writing styled ASS subtitle files...');
    const ass1 = path.join(testProjectDir, 'scene_1_subs.ass');
    const ass2 = path.join(testProjectDir, 'scene_2_subs.ass');
    
    subtitleService.writeAssFile(ttsResult1.wordTimings, ass1);
    subtitleService.writeAssFile(ttsResult2.wordTimings, ass2);
    console.log('✓ ASS subtitle files written.');

    // 6. Compile Scene Videos (Burn Subtitles + Overlay audio)
    console.log('\n[Step 5] Rendering Scene 1 (scaling, cropping to 9:16, burning captions)...');
    const renderedScene1 = path.join(testProjectDir, 'scene_1_rendered.mp4');
    await ffmpegService.compileScene(rawVideo1, voice1Path, ass1, renderedScene1, dur1);
    console.log('✓ Scene 1 rendered.');

    console.log('\n[Step 6] Rendering Scene 2...');
    const renderedScene2 = path.join(testProjectDir, 'scene_2_rendered.mp4');
    await ffmpegService.compileScene(rawVideo2, voice2Path, ass2, renderedScene2, dur2);
    console.log('✓ Scene 2 rendered.');

    // 7. Get background music
    console.log('\n[Step 7] Downloading/fetching background music...');
    const musicPath = await ffmpegService.getBackgroundMusic('tech');
    console.log(`✓ Background music path: ${musicPath}`);

    // 8. Stitch scenes and mix background music with sidechain compression
    console.log('\n[Step 8] Stitching scenes and mixing background music...');
    const finalOutputPath = path.join(env.paths.outputs, 'test_final.mp4');
    await ffmpegService.mergeAndMixMusic([renderedScene1, renderedScene2], musicPath, finalOutputPath);
    
    console.log('\n==================================================');
    console.log('🎉 PIPELINE TEST COMPLETED SUCCESSFULLY!');
    console.log(`Final output compiled at: ${finalOutputPath}`);
    console.log('==================================================');

    // Cleanup test project folder
    console.log('Cleaning up temporary testing folders...');
    fs.rmSync(testProjectDir, { recursive: true, force: true });
    console.log('Cleanup finished.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ PIPELINE TEST FAILED:', error);
    process.exit(1);
  }
}

runLocalPipelineTest();
