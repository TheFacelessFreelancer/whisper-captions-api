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

    // ✅ Force single-line text for specific animations by removing newline characters
    const cleanedText = ['bounce', 'pop', 'rise', 'baseline'].includes(animation)
      ? rawText.replace(/\n/g, ' ')
      : rawText;

    // ✅ Apply capitalization + escape ASS special characters
    const cleanText = applyCaps(escapeText(cleanedText));

    console.log("🎯 Requested animation type:", animation);

    // ✅ Generate animation tags from animations.js logic
    const anim = getAnimationTags(cleanText, animation);

    // ──────────────── X AND Y POSITIONING ────────────────
    const screenWidth = 980;                         // total screen width
    const adjustedX = screenWidth / 2 + customX;     // horizontal offset
    const adjustedY = 960 - customY;                 // vertical offset
    // ✅ Force no-wrap (\q2) only for selected animations
    const wrapOverride = ['bounce', 'pop', 'rise', 'baseline'].includes(animation) ? '\\q2' : '';
    // ✅ Combine alignment, optional wrap mode, and position
    const pos = `\\an5${wrapOverride}\\pos(${adjustedX},${adjustedY})`;
    // ─────────────────────────────────────────────────────

    // ✅ Some animations already include the full caption text inline (e.g. word-by-word)
    const includesTextInline = ['word-by-word', 'typewriter'].includes(animation);
    const finalText = includesTextInline ? anim : `${anim}${cleanText}`;

    console.log("🧪 Animation tag preview:\n", `{${pos}}${anim}`);

    // ✅ Final subtitle dialogue line in ASS format
    return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${finalText}`;
  })
  .join('\n');

// ✅ Combine the style header and all formatted captions into the .ASS file
const content = style + formattedCaptions;
await fs.promises.writeFile(filePath, content);
console.log(`✅ Subtitle file written: ${filePath}`);
return filePath;
}

