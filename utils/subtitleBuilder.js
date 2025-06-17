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
import { getAnimationTags } from './animations.js';

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
  const subtitlesDir = path.join('subtitles');
  const filePath = path.join(subtitlesDir, `${jobId}.ass`);
  await fs.promises.mkdir(subtitlesDir, { recursive: true });

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
  // STYLE HEADER
  // ────────────────────────────────────────────────
  const boxColorAss = box ? boxColor : '&H00000000';
  const style = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 980
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
    .filter(c => c.start && c.end && c.text) // ✅ Filter out incomplete captions
    .map((caption) => {
  const rawText = caption.text;

  const forceSingleLineAnimations = ['bounce', 'pop', 'rise', 'baseline'];
  const shouldForceSingleLine = forceSingleLineAnimations.includes(animation);

  // Estimate max characters per line based on font settings
  const avgCharWidth = fontSize * 0.55;
  const usableWidth = 980 - boxPadding * 2 - outlineWidth * 2;
  const maxChars = Math.floor(usableWidth / avgCharWidth);

  // Optional: Clean \n if single-line animation
  const cleanedText = shouldForceSingleLine
    ? rawText.replace(/\n/g, ' ')
    : rawText;

  // Escape and apply caps
  const cleanText = applyCaps(escapeText(cleanedText));

  // Handle animation tag
  const anim = getAnimationTags(cleanText, animation);

  // Positioning
  const screenWidth = 980;
  const adjustedX = screenWidth / 2 + customX;
  const adjustedY = 1920 / 2 - customY;
  const wrapOverride = shouldForceSingleLine ? '\\q2' : '';
  const pos = `\\an5${wrapOverride}\\pos(${adjustedX},${adjustedY})`;

  // Line chunking for long lines
  const splitTextIntoLines = (text, maxLen) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      if ((line + ' ' + word).trim().length <= maxLen) {
        line += (line ? ' ' : '') + word;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Final text assembly
  const includesTextInline = ['word-by-word', 'typewriter'].includes(animation);
  let finalText;

  if (includesTextInline) {
    finalText = anim;
  } else if (shouldForceSingleLine) {
    const chunks = splitTextIntoLines(cleanText, maxChars);
    finalText = chunks.map(line => `{${pos}}${anim}${line}`).join('\\N');
  } else {
    finalText = `${anim}{${pos}}${cleanText}`;
  }

  return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,${finalText}`;
})
    .join('\n');

 const content = style + formattedCaptions;
  await fs.promises.writeFile(filePath, content);
  console.log(`✅ Subtitle file written: ${filePath}`);
  return filePath;
}
