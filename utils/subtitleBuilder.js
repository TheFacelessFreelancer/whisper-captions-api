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
  .filter(c => c.start && c.end && c.text)
  .map((caption) => {
    const rawText = caption.text;
const cleanedText = ['bounce', 'pop', 'rise', 'baseline'].includes(animation)
  ? rawText.replace(/\n/g, ' ')
  : rawText;
    const cleanText = applyCaps(escapeText(cleanedText)); 
    console.log("🎯 Requested animation type:", animation);
    const anim = getAnimationTags(cleanText, animation);

      // ──────────────── X AND Y POSITIONING ────────────────
      const screenWidth = 980; // new width for 50px margin left and right
      const adjustedX = screenWidth / 2 + customX; // 0=center, positive=right
      const adjustedY = 960 - customY; // 0=center, positive=up
      const pos = `\\an5\\pos(${adjustedX},${adjustedY})`; // center-aligned text block
      // ─────────────────────────────────────────────────────

    // Safely append text only for styles that don’t include it
    const includesTextInline = ['word-by-word', 'typewriter'].includes(animation);
    const finalText = includesTextInline ? anim : `${anim}${cleanText}`;

         console.log("🧪 Animation tag preview:\n", `{${pos}}${anim}`);
    return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${finalText}`;
  })
  .join('\n');

  const content = style + formattedCaptions;
  await fs.promises.writeFile(filePath, content);
  console.log(`✅ Subtitle file written: ${filePath}`);
  return filePath;
}
