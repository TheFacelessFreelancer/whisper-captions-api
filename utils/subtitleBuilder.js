/**
 * Builds an ASS subtitle file with full support for:
 * - Timing logic
 * - Center-based \pos(x,y) alignment
 * - Font, box, and text effects
 * - Multiple captions
 * - Dynamic animation effects
 *
 * This version isolates all animation types:
 * - INLINE: word-by-word, typewriter
 * - CHUNKED: fall, rise, panleft, panright, etc.
 * - DEFAULT: fade, basic styles
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND DEPENDENCIES
// ────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { hexToASS } from './colors.js';
import { getAnimationTags } from './animations.js';
import { logInfo, logError } from './logger.js';

// ────────────────────────────────────────────────
// 2. MAIN EXPORT FUNCTION
// ────────────────────────────────────────────────
export async function buildSubtitlesFile({
  jobId,
  fontName,
  fontSize,
  fontColor,
  styleMode,
  boxColor, // ✅ updated
  enablePadding,
  outlineColorHex,
  outlineWidth,
  shadow,
  shadowColorHex,
  lineSpacing,
  animation,
  preset,
  customX,
  customY,
  effects = {},
  caps = 'normal',
  lineLayout = 'single',
  captions = []
}) {
  styleMode = styleMode || 'box'; // fallback to 'box' if undefined

  try {
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
// STYLE MODE LOGIC
// ────────────────────────────────────────────────
let finalOutlineWidth = 0;
let finalOutlineColor = '&H00000000';
let finalBoxColor = '&H00000000';

if (styleMode === 'box') {
  finalBoxColor = boxColor;
  finalOutlineColor = outlineColor;
  finalOutlineWidth = enablePadding ? 3 : 1;

  // ✅ Prevent white text on white box
  if (fontColor?.toLowerCase() === finalBoxColor?.toLowerCase()) {
    fontColor = '#000000'; // fallback to black text (only used for visual override in logs)
  }
}

if (styleMode === 'outline') {
  finalBoxColor = '&H00000000'; // no background
  finalOutlineWidth = parseInt(outlineWidth) || 0;
  finalOutlineColor = outlineColor;
}

// Log the actual values for debugging
logInfo("🎯 RENDER MODE DEBUG", {
  styleMode,
  finalBoxColor,
  finalOutlineColor,
  finalOutlineWidth
});

    const style = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 980
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},&H00000000,${finalOutlineColor},${finalBoxColor},${effects.bold ? 1 : 0},${effects.italic ? 1 : 0},${effects.underline ? 1 : 0},0,100,100,${lineSpacing || 0},0,3,${finalOutlineWidth},${shadow},7,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const screenWidth = 980;
    const screenHeight = 1920;
    const avgCharWidth = fontSize * 0.55;
    const usableWidth = screenWidth - 20 - outlineWidth * 2;
    const maxChars = Math.floor(usableWidth / avgCharWidth);

    const formattedCaptions = captions.map(caption => {
      const rawText = caption.text;
      const cleanText = applyCaps(escapeText(rawText));
      const adjustedX = screenWidth / 2 + customX;
      const adjustedY = screenHeight / 2 - customY;
      const wrapOverride = ['fall', 'rise', 'panleft', 'panright', 'baselineup'].includes(animation) ? '\\q2' : '';
      const pos = `\\an5${wrapOverride}\\pos(${adjustedX},${adjustedY})`;
      const anim = getAnimationTags(cleanText, animation, caption.start, caption.end, adjustedY);

      if (['word-by-word', 'typewriter'].includes(animation)) {
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}`;
      }

      if (['fall', 'rise', 'baselineup', 'panleft', 'panright'].includes(animation)) {
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

        const chunks = splitTextIntoLines(cleanText, maxChars);
        const totalChars = cleanText.length;
        const chunkDurations = chunks.map(line => {
          const ratio = line.length / totalChars;
          return Math.max(100, Math.floor(totalDuration * ratio));
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

          if (animation === 'panleft') {
            const xStart = 980;
            const xEnd = adjustedX;
            return `Dialogue: 0,${formatTime(chunkStart)},${formatTime(chunkEnd)},Default,,0,0,0,,{\\an5\\q2\\move(${xStart},${adjustedY},${xEnd},${adjustedY},0,150)${anim}}${line}`;
          }

          if (animation === 'panright') {
            const xStart = 0;
            const xEnd = adjustedX;
            return `Dialogue: 0,${formatTime(chunkStart)},${formatTime(chunkEnd)},Default,,0,0,0,,{\\an5\\q2\\move(${xStart},${adjustedY},${xEnd},${adjustedY},0,150)${anim}}${line}`;
          }
        });
      }

      return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${cleanText}`;
    }).join('\n');

    const content = style + formattedCaptions;
    logInfo("🧾 ASS STYLE DEBUG", { style });
    await fs.promises.writeFile(filePath, content);
    logInfo(`✅ Subtitle file written: ${filePath}`);
    return filePath;

  } catch (err) {
    logError("Subtitle Builder Error", err);
    throw err;
  }
}
