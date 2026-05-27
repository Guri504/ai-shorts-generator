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
  async generateScriptAndScenes(topicOrTitle, language = 'hinglish', sceneCount = 5, options = {}) {
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

    let platformInstruction = '';
    if (options.platform === 'youtube') {
      const selectedNiche = options.niche || 'facts';
      const selectedHook = options.hookStyle || 'question';
      const selectedTone = options.tone || 'viral';

      platformInstruction = `
Target Platform: YouTube Shorts
Video Niche: ${selectedNiche}
Video Tone/Vibe: ${selectedTone}
Initial Hook Style: ${selectedHook}

You must write a script tailored for YouTube Shorts:
1. In Scene 1, open with a high-retention hook matching the "${selectedHook}" style. For example, if it is a question hook, start with a highly curious question. If it is a shocking hook, start with an unbelievable fact.
2. Maintain the "${selectedTone}" vibe throughout the narration (e.g., highly energetic and fast-paced, or suspenseful and mysterious).
3. The script topic should be custom-adapted to the niche "${selectedNiche}". Ensure the facts, stories, or tips generated correspond to this category.
`;
    }

    const systemPrompt = `You are an elite, viral vertical video creator and video editor.
Your task is to take the user's topic/title and write an ultra-engaging short-form video script (~${durationGoal} total).
You must split this script into EXACTLY ${sceneCount} logical scenes, each lasting 3 to 6 seconds.
IMPORTANT: Return EXACTLY ${sceneCount} scenes. No more, no less.

${platformInstruction}

For EACH scene, you must decide between two video source types:
1. "Stock": Use stock footage for generic, common real-world elements, typing, phone usage, office settings, people, generic scenes, cities, or standard nature.
2. "AI": Use AI generation for impossible, surreal, fictional, fantasy, or cartoonish characters (e.g. talking animals, robots, aliens).

CRITICAL CREDIT OPTIMIZATION RULES:
- AI credit usage is highly restricted. Be selective.
- If a visual can be realistically depicted using stock footage, choose "Stock".
- Ensure that at least 60-80% of scenes in a project are designated as "Stock" ONLY IF the topic is a standard real-world topic.
- EXCEPTION FOR SURREAL/FANTASY/NON-HUMAN TOPICS: If the main subject of the video is fictional, fantasy-based, or is a non-human character performing human activities (e.g., "a talking cat opening a pizza shop", "a dancing robot", "an alien giving a speech"), you MUST bypass the stock rule and designate all scenes showing this character as "AI". Do NOT select "Stock" for these character scenes, because stock search will return standard humans or real animals which breaks visual consistency.

CHARACTER SPEAKING / TALKING RULE:
- If a scene is designated as "AI" and involves a character speaking the narration (like a talking cat), the "visualPrompt" MUST explicitly describe the character's facial expression and mouth position to show they are talking. Use phrases like: "mouth open as if speaking, talking to the camera, head tilted dynamically, expressive talking face, captured mid-speech". This allows the static AI image generator to draw them in an active speaking pose, which looks natural during video zoom.

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

      const callWithRetry = async () => {
        const modelName = 'gemini-2.5-flash';
        const retryDelays = [2000, 4000, 6000, 8000]; // Progressive backoff
        let lastError = null;

        console.log(`[Gemini Service] Attempting script generation using model: ${modelName}`);
        
        for (let attempt = 1; attempt <= retryDelays.length + 1; attempt++) {
          try {
            const res = await ai.models.generateContent({
              model: modelName,
              contents: userPrompt,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.8
              }
            });
            
            if (res && res.text) {
              console.log(`[Gemini Service] Success with model: ${modelName} on attempt: ${attempt}`);
              return res;
            }
          } catch (err) {
            lastError = err;
            const errMsg = err.message || '';
            const isRateOrUnavailable = errMsg.includes('503') || errMsg.toLowerCase().includes('demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
            
            if (isRateOrUnavailable && attempt <= retryDelays.length) {
              const delay = retryDelays[attempt - 1];
              console.warn(`[Gemini Service] Model ${modelName} returned temporary error (attempt ${attempt}/${retryDelays.length + 1}): ${errMsg.substring(0, 120)}... Retrying in ${delay / 1000}s...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              console.error(`[Gemini Service] Model ${modelName} failed:`, errMsg);
              throw err;
            }
          }
        }
        
        throw lastError || new Error(`Failed to generate content using model ${modelName}.`);
      };

      const response = await callWithRetry();

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
