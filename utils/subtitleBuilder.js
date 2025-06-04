import fs from 'fs/promises';
import path from 'path';

/**
 * Build ASS subtitle string with styling and animation.
 * @param {Array} events - Array of subtitle events with start, end, and text.
 * @returns {string} - ASS subtitle content
 */
export function buildAssSubtitle(events) {
  const assHeader = `
[Script Info]
Title: Captions App Subtitles
ScriptType: v4.00+
PlayDepth: 0
Collisions: Normal
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WhiteBox,Arial,42,&HFFFFFF,&H80000000,0,0,0,0,100,100,0,0,3,0,0,8,20,20,150,1
Style: Default,Arial,42,&H0,&H0,0,0,0,0,100,100,0,0,1,0,0,8,20,20,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`.trim();

  const assEvents = events.map((event) => {
    const fade = `\\fad(200,200)`;
    const alignment = `\\an8`; // Top-center
    const textEscaped = event.text.replace(/\n/g, '\\N');

    return `
Dialogue: 0,${event.start},${event.end},WhiteBox,,0,0,0,,${alignment}${textEscaped}
Dialogue: 1,${event.start},${event.end},Default,,0,0,0,,${alignment}${fade}${textEscaped}
    `.trim();
  }).join('\n');

  return `${assHeader}\n${assEvents}`;
}

/**
 * Save ASS subtitle content to file.
 * @param {string} filePath - Destination path
 * @param {string} assContent - ASS subtitle text
 */
export async function saveSubtitleFile(filePath, assContent) {
  const fullPath = path.resolve(filePath);
  await fs.writeFile(fullPath, assContent);
}
