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
// 6. FORMATTED CAPTIONS
// ────────────────────────────────────────────────
const formattedCaptions = captions
  .filter(c => c.start && c.end && c.text)
  .flatMap((caption) => {
    const rawText = caption.text;

    // ────────────────────────────────────────────────
    // 6.1: Animation Modes That Require Forced Line Capping
    // ────────────────────────────────────────────────
    const forceSingleLineAnimations = ['fall', 'rise', 'baselineup', 'baselinedown', 'panright', 'panleft'];
    const shouldForceSingleLine = forceSingleLineAnimations.includes(animation);

    // ────────────────────────────────────────────────
    // 6.2: Character Width Estimation and Max Line Length
    // ────────────────────────────────────────────────
    const avgCharWidth = fontSize * 0.55;
    const usableWidth = 980 - boxPadding * 2 - outlineWidth * 2;
    const maxChars = Math.floor(usableWidth / avgCharWidth);

    // ────────────────────────────────────────────────
    // 6.3: Clean Line Breaks Only if Single-Line is Forced
    // ────────────────────────────────────────────────
    const cleanedText = shouldForceSingleLine
      ? rawText.replace(/\n/g, ' ')
      : rawText;

    // ────────────────────────────────────────────────
    // 6.4: Apply Capitalization and Escape Curly Braces
    // ────────────────────────────────────────────────
    const cleanText = applyCaps(escapeText(cleanedText));

    // ────────────────────────────────────────────────
    // 6.5: Animation Tags Based on Type
    // ────────────────────────────────────────────────
    const anim = getAnimationTags(cleanText, animation, caption.start, caption.end, adjustedY);

    // ────────────────────────────────────────────────
    // 6.6: Position Tag Calculation (\an5 + \pos(x,y))
    // ────────────────────────────────────────────────
    const screenWidth = 980;
    const adjustedX = screenWidth / 2 + customX;
    const adjustedY = 1920 / 2 - customY;
    const wrapOverride = shouldForceSingleLine ? '\\q2' : '';
    const pos = `\\an5${wrapOverride}\\pos(${adjustedX},${adjustedY})`;

    // ────────────────────────────────────────────────
    // 6.7: Line Splitting Helper (for visual line capping)
    // ────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────
    // 6.8: Inline Mode Handling (e.g. word-by-word / typewriter)
    // ────────────────────────────────────────────────
    const includesTextInline = ['word-by-word', 'typewriter'].includes(animation);
    if (includesTextInline) {
      return [`Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,${anim}`];
    }

// ────────────────────────────────────────────────
// 6.9: Forced Single-Line Chunk Mode (Fall, Rise, Baseline Up, etc.)
// ────────────────────────────────────────────────
if (shouldForceSingleLine) {
  const parseTime = (str) => {
    const [h, m, s] = str.split(':');
    const [sec, cs] = s.split('.');
    return (
      parseInt(h) * 3600000 +
      parseInt(m) * 60000 +
      parseInt(sec) * 1000 +
      parseInt(cs.padEnd(2, '0')) * 10
    );
  };

  const formatTime = (ms) => {
    const h = String(Math.floor(ms / 3600000)).padStart(1, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${h}:${m}:${s}.${cs}`;
  };

  const startMs = parseTime(caption.start);
  const endMs = parseTime(caption.end);
  const totalDuration = endMs - startMs;

  const chunks = splitTextIntoLines(cleanText, maxChars);

  // Proportional chunk durations based on text length
  const totalChars = cleanText.length;
  const chunkDurations = chunks.map(line => {
    const ratio = line.length / totalChars;
    return Math.max(100, Math.floor(totalDuration * ratio)); // minimum 100ms
  });

  let offset = startMs;

  return chunks.map((line, i) => {
    const chunkStart = offset;
    const chunkEnd = i === chunks.length - 1
      ? endMs
      : chunkStart + chunkDurations[i];
    offset += chunkDurations[i];

    if (animation === 'fall') {
      const yStart = adjustedY - 100;
      const yEnd = adjustedY;
      return `Dialogue: 0,${formatTime(chunkStart)},${formatTime(chunkEnd)},Default,,0,0,0,,{\\an5\\move(${adjustedX},${yStart},${adjustedX},${yEnd},0,150)${anim}}${line}`;
    }

    if (animation === 'rise') {
      const yStart = adjustedY + 100;
      const yEnd = adjustedY;
      return `Dialogue: 0,${formatTime(chunkStart)},${formatTime(chunkEnd)},Default,,0,0,0,,{\\an5\\move(${adjustedX},${yStart},${adjustedX},${yEnd},0,150)${anim}}${line}`;
}
    if (animation === 'baselineup') {
      const yStart = adjustedY + 100;
      const yEnd = adjustedY;
      return `Dialogue: 0,${formatTime(chunkStart)},${formatTime(chunkEnd)},Default,,0,0,0,,{\\an5\\move(${adjustedX},${yStart},${adjustedX},${yEnd},0,150)${anim}}${line}`;
}

    // Other single-line animations
    return `Dialogue: 0,${formatTime(chunkStart)},${formatTime(chunkEnd)},Default,,0,0,0,,{${pos}}${anim}${line}`;
  });
}

    // ────────────────────────────────────────────────
    // 6.10: Default Return for Multiline or Fade Captions
    // ────────────────────────────────────────────────
    return [`Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,${anim}{${pos}}${cleanText}`];
  })
  .join('\n');

// ────────────────────────────────────────────────
// 7: File Output
// ────────────────────────────────────────────────
 const content = style + formattedCaptions;
  await fs.promises.writeFile(filePath, content);
  console.log(`✅ Subtitle file written: ${filePath}`);
  return filePath;
}
