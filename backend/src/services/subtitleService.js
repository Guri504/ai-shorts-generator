import fs from 'fs';

/**
 * Format milliseconds to ASS timestamp format (h:mm:ss.cc)
 * @param {number} ms 
 */
function formatAssTime(ms) {
  if (ms < 0) ms = 0;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);

  const h = hours.toString();
  const m = minutes.toString().padStart(2, '0');
  const s = seconds.toString().padStart(2, '0');
  const c = centiseconds.toString().padStart(2, '0');

  return `${h}:${m}:${s}.${c}`;
}

export const subtitleService = {
  /**
   * Generates an ASS subtitle file content from word timings
   * @param {Array} wordTimings - Array of { word, startMs, endMs, durationMs }
   * @param {string} fontName - Font family, defaults to 'Impact' for Shorts look
   * @param {number} fontSize - Font size, defaults to 64
   * @param {string} subtitleColor - Highlighting color for active word
   * @returns {string} - ASS file content
   */
  generateAssContent(wordTimings, fontName = 'Impact', fontSize = 72, subtitleColor = 'yellow') {
    // Map human-readable colors to ASS BGR Hex strings
    let highlightColor = '&H0000FFFF&'; // Default Neon Yellow (BGR)
    if (subtitleColor === 'red') {
      highlightColor = '&H000000FF&'; // BGR Red
    } else if (subtitleColor === 'cyan') {
      highlightColor = '&H00FFFF00&'; // BGR Cyan
    } else if (subtitleColor === 'white') {
      highlightColor = '&H00FFFFFF&'; // BGR White
    } else if (subtitleColor === 'green') {
      highlightColor = '&H0033FF33&'; // BGR Neon Green
    }

    let ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,6,1,5,50,50,960,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // We loop through word by word and generate an event for each word's duration.
    // To make it look natural, we show a sliding window of words (e.g. 1 word before, active, and 2 words after).
    // The active word is highlighted and animated via scaling tags.
    for (let i = 0; i < wordTimings.length; i++) {
      const activeWord = wordTimings[i];
      const startStr = formatAssTime(activeWord.startMs);
      const endStr = formatAssTime(activeWord.endMs);

      const startWindow = Math.max(0, i - 1);
      const endWindow = Math.min(wordTimings.length - 1, i + 2);

      let sentenceParts = [];
      for (let j = startWindow; j <= endWindow; j++) {
        const wt = wordTimings[j];
        if (j === i) {
          // Highlight active word in BGR color
          sentenceParts.push(`{\\c${highlightColor}}${wt.word.toUpperCase()}{\\c}`);
        } else {
          sentenceParts.push(wt.word.toUpperCase());
        }
      }

      const sentenceText = sentenceParts.join(' ');

      // Write line: Layer 0, start, end, style Default
      ass += `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${sentenceText}\n`;
    }

    return ass;
  },

  /**
   * Writes the ASS content to a file
   * @param {Array} wordTimings 
   * @param {string} filePath 
   * @param {string} subtitleColor
   */
  writeAssFile(wordTimings, filePath, subtitleColor = 'yellow') {
    const content = this.generateAssContent(wordTimings, 'Impact', 72, subtitleColor);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }
};

export default subtitleService;
