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
// 2. EMOJI SUPPORT FOR EMOJI POP PRESET
// ────────────────────────────────────────────────
const emojiMap = {
  boom: '💥', explode: '💥', lol: '😂', funny: '😂', joke: '😂',
  think: '⚙️', idea: '⚙️', plan: '⚙️',
  fire: '🔥', hot: '🔥',
  heart: '❤️', love: '❤️',
  magic: '✨', wow: '✨'
};

function injectEmojiOnce(text) {
  for (const [keyword, emoji] of Object.entries(emojiMap)) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'i');
    if (regex.test(text)) {
      return text.replace(regex, `$1${emoji}`);
    }
  }
  return text;
}

// ────────────────────────────────────────────────
// 3. MAIN EXPORT FUNCTION: buildSubtitlesFile({...})
// ────────────────────────────────────────────────
export async function buildSubtitlesFile({
  jobId,
  fontName,
  fontSize,
  fontColor,
  styleMode,
  boxColor,
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
  styleMode = styleMode || 'box';

  try {
    // ────────────────────────────────────────────────
    // 4. FILE SETUP
    // ────────────────────────────────────────────────
    const subtitlesDir = path.join('subtitles');
    const filePath = path.join(subtitlesDir, `${jobId}.ass`);
    await fs.promises.mkdir(subtitlesDir, { recursive: true });

    // ────────────────────────────────────────────────
    // 5. TEXT TRANSFORM HELPERS
    // ────────────────────────────────────────────────
    const applyCaps = (text) => {
      if (caps === 'allcaps') return text.toUpperCase();
      if (caps === 'titlecase') return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      return text;
    };

    const escapeText = (text) => {
      return text.replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/"/g, '\\"');
    };

    // ────────────────────────────────────────────────
    // 6. STYLE HEADER AND STYLE MODE LOGIC
    // ────────────────────────────────────────────────
    let finalOutlineWidth = 0;
    let finalOutlineColor = '&H00000000';
    let finalBoxColor = '&H00000000';

    if (styleMode === 'box') {
      finalBoxColor = boxColor;
      finalOutlineColor = outlineColorHex;
      finalOutlineWidth = enablePadding ? 3 : 1;
      if (fontColor?.toLowerCase() === finalBoxColor?.toLowerCase()) {
        fontColor = '#000000';
      }
    }

    if (styleMode === 'outline') {
      finalBoxColor = '&H00000000';
      finalOutlineWidth = parseInt(outlineWidth) || 0;
      finalOutlineColor = outlineColorHex;
    }

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

    // ────────────────────────────────────────────────
    // 7. FORMATTED CAPTIONS: preset-driven logic blocks
    // ────────────────────────────────────────────────
    const screenWidth = 980;
    const screenHeight = 1920;
    const avgCharWidth = fontSize * 0.55;
    const usableWidth = screenWidth - 20 - outlineWidth * 2;
    const maxChars = Math.floor(usableWidth / avgCharWidth);

    const formattedCaptions = captions.map(caption => {
      const rawText = caption.text;

      let cleanText = escapeText(rawText);
      if (preset === 'Emoji Pop') cleanText = injectEmojiOnce(cleanText);
      cleanText = applyCaps(cleanText);

      const adjustedX = screenWidth / 2 + customX;
      const adjustedY = screenHeight / 2 - customY;
      const wrapOverride = ['fall', 'rise', 'panleft', 'panright', 'baselineup'].includes(animation) ? '\\q2' : '';
      const pos = `\\an5${wrapOverride}\\pos(${adjustedX},${adjustedY})`;
      const anim = getAnimationTags(cleanText, animation, caption.start, caption.end, adjustedY);

      // 🎯 Hero Pop logic
      if (animation === 'word-by-word') {
        const words = cleanText.split(' ');
        const highlighted = words.map((word, i) => {
          const colorTag = preset === 'Hero Pop' && i === 0 ? '\\c&H00E6FE&' : '\\c&HFFFFFF&';
          return `{${colorTag}}${word}`;
        }).join(' ');
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${highlighted}`;
      }

      // ⌨ Typewriter
      if (animation === 'typewriter') {
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}`;
      }

      // 🎬 Cinematic Fade
      if (preset === 'Cinematic Fade') {
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${cleanText}`;
      }

      // 🧱 Chunked Animation Types (fall, rise, etc.)
      if (['fall', 'rise', 'baselineup', 'panleft', 'panright'].includes(animation)) {
        // ... (CHUNKED logic remains unchanged)
      }

      // 🧾 Default style
      return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${cleanText}`;
    }).join('\n');

    // ────────────────────────────────────────────────
    // 8. FILE OUTPUT
    // ────────────────────────────────────────────────
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
