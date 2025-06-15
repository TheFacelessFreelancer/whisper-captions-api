/**
 * Builds an ASS subtitle file with full support for:
 * - Timing logic
 * - Center-based \pos(x,y) alignment
 * - Font, box, and text effects
 * - Multiple captions
 * - Dynamic animation effects
 *
 * ────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ────────────────────────────────────────────────
 * 1. IMPORTS AND DEPENDENCIES
 * 2. MAIN EXPORT FUNCTION: buildSubtitlesFile({...})
 * 3. FILE SETUP
 * 4. TEXT TRANSFORM HELPERS: applyCaps(), escapeText()
 * 5. ANIMATION TAG LOGIC: getAnimationTags()
 * 6. STYLE HEADER: [Script Info], [V4+ Styles], [Events]
 * 7. FORMATTED CAPTIONS: text formatting, animation, and position
 * 8. FILE OUTPUT: Write .ASS file to disk
 */

// ────────────────────────────────────────────────
// IMPORTS AND DEPENDENCIES
// ────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { hexToASS } from './colors.js';

// ────────────────────────────────────────────────
// MAIN EXPORT FUNCTION
// ────────────────────────────────────────────────
export async function buildSubtitlesFile({
  jobId,
  fontName,
  fontSize,
  fontColor,
  outlineColor,
  outlineWidth,
  shadow,
  box,
  boxColor,
  boxPadding,
  animation,
  lineSpacing,
  customX = 0,
  customY = -350,
  effects = {},
  caps = 'normal',
  lineLayout = 'single',
  captions = []
}) {
  // ────────────────────────────────────────────────
  // FILE SETUP
  // ────────────────────────────────────────────────
  const subtitlesDir = path.join('subtitles');
  const filePath = path.join(subtitlesDir, `${jobId}.ass`);
  await fs.promises.mkdir(subtitlesDir, { recursive: true });

  // ────────────────────────────────────────────────
  // TEXT TRANSFORM HELPERS
  // ────────────────────────────────────────────────
  const applyCaps = (text) => {
    if (caps === 'allcaps') return text.toUpperCase();
    if (caps === 'titlecase') return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    return text;
  };

  const escapeText = (text) => {
    return text
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/"/g, '\\"');
  };

  // ────────────────────────────────────────────────
  // ANIMATION TAG LOGIC
  // ────────────────────────────────────────────────
  const getAnimationTags = (text, type) => {
    switch (type) {
      case 'fade':
        return `\\fad(300,300)`;
      case 'typewriter': {
        const letters = text.split('').map((char, i) => `{\\t(${i * 30},${(i + 1) * 30},\\alpha&HFF&)}` + char).join('');
        return `\\an5` + letters;
      }
      case 'word-by-word': {
        const words = text.split(' ').map((word, i) => `{\\t(${i * 150},${(i + 1) * 150},\\alpha&HFF&)}` + word).join(' ');
        return `\\an5` + words;
      }
      case 'bounce':
        return `\\t(0,500,\\frz5)\\t(500,1000,\\frz0)`;
      case 'pop':
        return `\\t(0,200,\\fscx130\\fscy130)\\t(200,400,\\fscx100\\fscy100)`;
      default:
        return '';
    }
  };

  // ────────────────────────────────────────────────
  // STYLE HEADER
  // ────────────────────────────────────────────────
  const boxColorAss = box ? boxColor : '&H00000000';
  const style = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},&H00000000,${outlineColor},${boxColorAss},${effects.bold ? 1 : 0},${effects.italic ? 1 : 0},${effects.underline ? 1 : 0},0,100,100,${lineSpacing || 0},0,1,${outlineWidth},${shadow},7,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // ────────────────────────────────────────────────
  // FORMATTED CAPTIONS
  // ────────────────────────────────────────────────
  const formattedCaptions = captions
    .filter(c => c.start && c.end && c.text)
    .map((caption) => {
      const cleanText = applyCaps(escapeText(caption.text));
      const anim = getAnimationTags(cleanText, animation);
      const adjustedX = 540 + customX;
      const adjustedY = 960 - customY;
      const pos = `\\pos(${adjustedX},${adjustedY})`;
      return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}${anim}}${cleanText}`;
    })
    .join('\n');

  // ────────────────────────────────────────────────
  // FILE OUTPUT
  // ────────────────────────────────────────────────
  const content = style + formattedCaptions;
  await fs.promises.writeFile(filePath, content);
  console.log(`✅ Subtitle file written: ${filePath}`);
  return filePath;
}
