import { geminiService } from '../services/geminiService.js';
import { connectDb } from '../services/dbService.js';

async function testPrompt() {
  console.log('Testing Gemini Scene Breakdown for "A Talking Cat Opens A Pizza Shop"...\n');
  try {
    await connectDb();
    const result = await geminiService.generateScriptAndScenes(
      "A Talking Cat Opens A Pizza Shop",
      "hinglish",
      5
    );

    console.log('==================================================');
    console.log(`Generated Video Title: ${result.title}`);
    console.log(`Music Genre Suggestion: ${result.bgMusicGenre}`);
    console.log('==================================================\n');

    result.scenes.forEach((scene) => {
      console.log(`🎬 Scene ${scene.sceneNumber}:`);
      console.log(`   Source Type: ${scene.clipType}`);
      console.log(`   Narration  : ${scene.narration}`);
      console.log(`   Stock Key  : ${scene.stockSearchKeyword}`);
      console.log(`   AI Prompt  : ${scene.visualPrompt}`);
      console.log('--------------------------------------------------');
    });

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testPrompt();
