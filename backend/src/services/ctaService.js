import { env } from '../config/env.js';

// Dictionary of dynamic high-energy CTA text variations categorized by language
const CTA_TEXT_TEMPLATES = {
  punjabi: [
    "Aisi hor interesting videos lai channel nu subscribe karo te video nu like share jarur karo.",
    "Support lai video nu like te share jarur karo, te subscribe karna na bhullo.",
    "Daily AI te tech facts vaste follow karo te video nu like jarur karo.",
    "Hor shocking content vaste channel nu subscribe te follow karna na bhullo.",
    "Tech de hidden secrets vaste channel follow karo te video share karo."
  ],
  hinglish: [
    "Aise aur interesting videos ke liye channel ko subscribe aur video ko like jarur karein.",
    "Daily tech aur AI facts ke liye humein follow karna na bhulein aur video share karein.",
    "Support karne ke liye video ko like, share aur channel ko subscribe jarur karein.",
    "Aur bhi amazing content ke liye channel ko subscribe abhi karein.",
    "Hidden secrets jaanne ke liye channel ko subscribe aur follow abhi karein."
  ],
  hindi: [
    "और अधिक दिलचस्प वीडियो के लिए चैनल को सब्सक्राइब करें और वीडियो को लाइक जरूर करें।",
    "ऐसी ही ज्ञानवर्धक वीडियो देखने के लिए हमारे चैनल को सब्सक्राइब करना न भूलें।",
    "अगर वीडियो पसंद आई हो तो लाइक, शेयर और सब्सक्राइब जरूर करें।",
    "रोजाना नए ज्ञान और फैक्ट्स के लिए हमारे चैनल को अभी फॉलो करें।",
    "सपोर्ट करने के लिए वीडियो को लाइक करें और चैनल को सब्सक्राइब जरूर करें।"
  ],
  english: [
    "For more interesting videos, subscribe to the channel and like the video.",
    "Don't forget to subscribe and like for more daily tech secrets.",
    "Hit that subscribe button and like this video if you learned something new!",
    "Follow us for more mind-blowing facts and daily tech updates.",
    "Subscribe now and turn on notifications to never miss our next short!"
  ]
};

// Visual prompts mapping for Pollinations AI cinematic generations
const CTA_VISUAL_TEMPLATES = {
  tech: "A futuristic, dark high-tech background, glowing holographic subscribe icon, cybernetic circuit patterns, vibrant neon teal and violet light trails, 8k resolution, cinematic composition, vertical 9:16",
  horror: "An eerie, misty dark forest background, a glowing crimson red subscribe button, horror cinematic mood, dim red volumetric lighting, suspenseful atmosphere, vertical 9:16",
  ai: "A brain hologram with glowing neural pathways, abstract futuristic tech background, glowing neon blue subscribe button, artificial intelligence concept, vertical 9:16",
  motivation: "A cinematic epic mountain peak at sunset, golden sunlight beams, a clean elegant glowing golden subscribe button, motivational cinematic style, vertical 9:16",
  cinematic: "A cinematic cozy library or dark workspace with warm lighting, glowing gold subscribe button, soft dust particles, storytelling cinematic atmosphere, vertical 9:16"
};

export const ctaService = {
  /**
   * Returns a random text template based on the requested language.
   * @param {string} language - 'punjabi', 'hinglish', 'hindi', or 'english'
   * @returns {string} Text template
   */
  getText(language = 'english') {
    const langKey = language.toLowerCase();
    const templates = CTA_TEXT_TEMPLATES[langKey] || CTA_TEXT_TEMPLATES.english;
    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  },

  /**
   * Detects the project style template based on topic keywords and music genre
   * @param {string} topic 
   * @param {string} genre 
   * @returns {string} style key
   */
  detectStyle(topic = '', genre = '') {
    const combined = `${topic} ${genre}`.toLowerCase();
    
    if (combined.match(/\b(horror|scary|ghost|mystery|shocking|creepy|dark|spooky|thriller)\b/i)) {
      return 'horror';
    }
    if (combined.match(/\b(ai|chatgpt|future|robot|tech|technology|science|quantum|space|hologram|cyber)\b/i)) {
      return 'ai';
    }
    if (combined.match(/\b(motivation|success|life|inspiration|dream|wealth|achieve|mindset|focus|hardwork)\b/i)) {
      return 'motivation';
    }
    if (combined.match(/\b(cyberpunk|code|matrix|hacker|geek)\b/i)) {
      return 'tech';
    }
    return 'cinematic'; // default style
  },

  /**
   * Returns the visual prompt associated with the style
   * @param {string} style 
   * @param {string} topic - optional (for auto detection fallback)
   * @param {string} genre - optional
   * @returns {string} image prompt
   */
  getVisualPrompt(style = 'auto', topic = '', genre = '') {
    let resolvedStyle = style.toLowerCase();
    if (resolvedStyle === 'auto') {
      resolvedStyle = this.detectStyle(topic, genre);
    }
    return CTA_VISUAL_TEMPLATES[resolvedStyle] || CTA_VISUAL_TEMPLATES.cinematic;
  },

  /**
   * Automatically constructs the scene schema for a CTA ending scene
   * @param {Object} project - The project model object
   * @returns {Object} Scene object
   */
  generateCtaScene(project) {
    const language = project.ctaSettings?.language || project.voiceLanguage || 'english';
    const style = project.ctaSettings?.style || 'auto';
    
    const narrationText = this.getText(language);
    const visualPrompt = this.getVisualPrompt(style, project.topic, project.bgMusicGenre || project.musicGenre);

    return {
      sceneNumber: 999, // Dynamic caller override
      narration: narrationText,
      visualPrompt: visualPrompt,
      clipType: 'AI', // Default to AI image generation (Ken Burns effect) for cinematic outcomes
      stockSearchKeyword: 'subscribe button',
      voiceAudioPath: null,
      videoPath: null,
      wordTimings: []
    };
  }
};

export default ctaService;
