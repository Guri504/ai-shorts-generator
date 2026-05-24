import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

// Lazy instantiation helper
let aiInstance = null;
function getAiClient() {
  if (!aiInstance) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in the environment (.env file).');
    }
    aiInstance = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return aiInstance;
}

export const geminiService = {
  /**
   * Generates script, scene breakdown, and SEO metadata from topic or title
   * @param {string} topicOrTitle 
   * @param {string} language - 'english', 'hindi', or 'hinglish'
   * @param {string} durationGoal - e.g. '30s', '60s'
   */
  async generateScriptAndScenes(topicOrTitle, language = 'hinglish', sceneCount = 5) {
    const ai = getAiClient();
    
    // Calculate approximate duration goal based on scene count (~5-6s per scene)
    const durationGoal = `${sceneCount * 6}s`;
    
    // Choose voice direction based on language
    let langInstruction = '';
    if (language === 'hindi') {
      langInstruction = 'Write the narration strictly in pure Hindi (Devanagari script or clean Hindi text) that reads naturally and emotionally.';
    } else if (language === 'hinglish') {
      langInstruction = 'Write the narration in Hinglish (Hindi language written in English alphabet, e.g., "Kya aapko pata hai ki..."). This is highly engaging for Indian audiences.';
    } else {
      langInstruction = 'Write the narration in engaging, premium English with clear vocabulary and a modern tone.';
    }

    const systemPrompt = `You are an elite, viral YouTube Shorts creator and video editor.
Your task is to take the user's topic/title and write an ultra-engaging short-form video script (~${durationGoal} total).
You must split this script into EXACTLY ${sceneCount} logical scenes, each lasting 3 to 6 seconds.
IMPORTANT: Return EXACTLY ${sceneCount} scenes. No more, no less.

For EACH scene, you must decide between two video source types:
1. "Stock": Use stock footage for generic, common real-world elements (e.g. typing on a keyboard, city streets, walking, office meetings, coffee cups, mobile phones, standard nature scenery).
2. "AI": Use Gemini Flow (cinematic video generator) ONLY when absolutely necessary for cinematic, futuristic, highly emotional closeups, storytelling, historical recreation, sci-fi, surreal, or impossible-to-film visuals (e.g. "a neon cyberpunk city in 2080", "an astronaut floating near a black hole", "a glowing magical book").

CRITICAL CREDIT OPTIMIZATION RULES:
- Flow credit usage is highly restricted. Be extremely selective.
- If a visual can be realistically depicted using stock footage, you MUST choose "Stock".
- Use "AI" ONLY for premium hooks or scenes that cannot exist or be filmed in the real world.
- Ensure that at least 50-70% of scenes in a project are designated as "Stock" to conserve API credits.

Keep the narration for each scene short, punchy, and high-retention. Use suspense, hooks in the first scene, and strong pacing.

${langInstruction}

You must also generate optimized YouTube metadata (Viral Title, high-SEO description with keywords, and trending hashtags).

You must return your output strictly in JSON format matching the schema provided.`;

    const userPrompt = `Generate a video script and scene breakdown for:
Topic/Title: "${topicOrTitle}"
Target Duration: ${durationGoal}`;

    try {
      const responseSchema = {
        type: "OBJECT",
        properties: {
          title: { type: "STRING", description: "Viral SEO YouTube Title with emojis" },
          description: { type: "STRING", description: "Engaging SEO description with keywords and summaries" },
          hashtags: { 
            type: "ARRAY", 
            items: { type: "STRING" },
            description: "List of 4-6 viral hashtags (do NOT include the '#' character)" 
          },
          bgMusicGenre: { 
            type: "STRING", 
            description: "Recommended music genre: hype, cinematic, emotional, tech, calm" 
          },
          scenes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                sceneNumber: { type: "INTEGER" },
                narration: { type: "STRING", description: "The script voiceover spoken text for this scene (should be ~12-18 words, matching the 3-5 seconds duration)." },
                visualPrompt: { type: "STRING", description: "Highly descriptive cinematic image/video prompt for AI clip or visual description for stock clip." },
                clipType: { type: "STRING", enum: ["AI", "Stock"], description: "Decide whether this scene uses AI generation or Stock footage." },
                stockSearchKeyword: { type: "STRING", description: "3-4 keywords to search on Pexels video API if stock, or a close equivalent if AI fails (e.g. 'typing on laptop', 'drone city traffic')." }
              },
              required: ["sceneNumber", "narration", "visualPrompt", "clipType", "stockSearchKeyword"]
            }
          }
        },
        required: ["title", "description", "hashtags", "bgMusicGenre", "scenes"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.8
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response.');
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error calling Gemini API in geminiService:', error);
      throw error;
    }
  }
};

export default geminiService;
