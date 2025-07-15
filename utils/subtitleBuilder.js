/**
 * subtitleBuilder.js
 *
 * Builds an ASS subtitle file with:
 * - Preset-based font & size
 * - Modular animations via animations.js
 * - Emoji injection via utils/emojiMap.js (Emoji Pop)
 * - Alignment presets (Top-Safe, Center, Bottom-Safe) on an 80px side-margin canvas
 * - Clean ASS header & events
 */

// ────────────────────────────────────────────────
// 1. IMPORTS
// ────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import { hexToASS } from './colors.js';
import { getAnimationTags } from './animations.js';
import { injectEmojiOnce } from './utils/emojiMap.js';
import { logInfo, logError } from './logger.js';

// ────────────────────────────────────────────────
// 2. MAIN FUNCTION: buildSubtitlesFile({...})
// ────────────────────────────────────────────────
export async function buildSubtitlesFile({
  jobId,
  captionStyle,    // "Hero Pop" | "Emoji Pop" | "Cinematic Fade"
  alignment,       // "Top-Safe" | "Center" | "Bottom-Safe"
  fontName = 'Default',
  fontSize = null,
  fontColor,
  boxColorHex,
  outlineColorHex,
  outlineWidth,
  shadow,
  lineSpacing = 0,
  caps = 'normal',
  customX = 0,
  customY = 0,
  captions = []
}) {
  try {
    // ────────────────────────────────────────────────
    // 3. CANVAS & ALIGNMENT (80px margins)
    // ────────────────────────────────────────────────
    const canvasWidth  = 1080;
    const canvasHeight = 1920;
    const sideMargin   = 80;
    const usableWidth  = canvasWidth - 2 * sideMargin; // 920
    const centerX      = sideMargin + usableWidth / 2;  // 540
    const centerY      = canvasHeight / 2;              // 960

    switch ((alignment || '').toLowerCase()) {
      case 'top-safe':    customY =  750; break;
      case 'center':      customY =    0; break;
      case 'bottom-safe': customY = -350; break;
      // else leave customY as provided
    }

    // ────────────────────────────────────────────────
    // 4. FONT & SIZE PRESETS
    // ────────────────────────────────────────────────
    const fontPresets = {
      'Hero Pop':       { name: 'Montserrat-Bold', size: 60 },
      'Emoji Pop':      { name: 'Poppins-Bold',    size: 58 },
      'Cinematic Fade': { name: 'Montserrat-Bold', size: 64 }
    };
    const preset = captionStyle;
    const isDefaultFont = !fontName || fontName === 'Default';
    const presetDef = fontPresets[preset] || {};
    const finalFontName = isDefaultFont ? presetDef.name : fontName;
    const finalFontSize = (!fontSize || isDefaultFont) ? presetDef.size : fontSize;

    // ────────────────────────────────────────────────
    // 5. TEXT HELPERS
    // ────────────────────────────────────────────────
    const applyCaps = t => {
      if (caps === 'allcaps') return t.toUpperCase();
      if (caps === 'titlecase') return t.replace(/\w\S*/g, w => w[0].toUpperCase()+w.slice(1).toLowerCase());
      return t;
    };
    const escapeText = t => t.replace(/{/g,'\\{').replace(/}/g,'\\}').replace(/"/g,'\\"');

    // ────────────────────────────────────────────────
    // 6. STYLE HEADER
    // ────────────────────────────────────────────────
    const hasBox = !!boxColorHex;
    const borderStyle = hasBox ? 3 : 1;
    const finalOutlineColor = hasBox ? '&H00000000' : hexToASS(outlineColorHex);
    const finalBoxColor     = hasBox ? hexToASS(boxColorHex) : '&H00000000';
    const finalOutlineWidth = hasBox ? 0 : (outlineWidth||0);

    const style = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: ${canvasWidth}
PlayResY: ${canvasHeight}

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Default,${finalFontName},${finalFontSize},${hexToASS(fontColor)},&H00000000,${finalOutlineColor},${finalBoxColor},0,0,0,0,100,100,${lineSpacing},0,${borderStyle},${finalOutlineWidth},${shadow},7,${sideMargin},${sideMargin},10,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
`;

    // ────────────────────────────────────────────────
    // 7. FORMAT CAPTION LINES
    // ────────────────────────────────────────────────
    const animKey = {
      'Hero Pop':       'hero',
      'Emoji Pop':      'emoji',
      'Cinematic Fade': 'cinematic'
    }[preset] || 'fade';

    const lines = captions.map(({ start, end, text }) => {
      let t = applyCaps(escapeText(text.trim()));
      if (preset === 'Emoji Pop') t = injectEmojiOnce(t);

      const adjustedX = centerX + (customX||0);
      const adjustedY = centerY - (customY||0);
      const posTag    = `\\an5\\pos(${adjustedX},${adjustedY})`;
      const animTag   = getAnimationTags(t, animKey, start, end, adjustedY);

      return `Dialogue: 0,${start},${end},Default,,0,0,0,,{${posTag}${animTag}}${t}`;
    }).join('\n');

    // ────────────────────────────────────────────────
    // 8. WRITE TO DISK
    // ────────────────────────────────────────────────
    const outPath = `subtitles/${jobId}.ass`;
    await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
    await fs.promises.writeFile(outPath, style + lines);
    logInfo(`✅ Subtitle file written: ${outPath}`);
    return outPath;

  } catch (err) {
    logError('Subtitle Builder Error', err);
    throw err;
  }
}
