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
  boom: '💥', explode: '💥', blast: '💣', crash: '💥', bang: '💥',
  lol: '😂', haha: '🤣', funny: '😆', joke: '😹', lmao: '😹', rofl: '🤣',
  think: '🤔', idea: '💡', plan: '🧠', thoughts: '🧩', strategy: '📊',
  fire: '🔥', hot: '🥵', spicy: '🌶️', lit: '💯', burning: '🚒',
  heart: '❤️', love: '😍', crush: '😘', hug: '🤗', sweet: '🍭',
  magic: '✨', wow: '😲', surprise: '🎉', shine: '🌟', sparkle: '💫',
  money: '💸', rich: '💰', paid: '🤑', cashback: '🏦', coins: '🪙',
  sale: '🛍️', shop: '🛒', groceries: '🧺', discount: '🏷️', basket: '🧃',
  win: '🏆', success: '🚀', goal: '🎯', score: '📈', reward: '🎁',
  sad: '😢', cry: '😭', tired: '🥱', stress: '😩', broke: '😔',
  chill: '😎', relax: '🧘', peace: '✌️', easy: '👌', smooth: '😌',
  fast: '⚡', quick: '🚀', instant: '⏱️', speed: '🏃‍♂️', rush: '🏎️',
  boss: '👑', queen: '👸', king: '🤴', legend: '🏅', pro: '📣',
  new: '🆕', launch: '🚀', update: '🔁', build: '🧱',
  email: '📧', message: '💬', inbox: '📥', DM: '📩', alert: '🔔',
  clock: '⏰', calendar: '📅', schedule: '🗓️', late: '⌛', alarm: '🚨',
  fun: '🎈', play: '🎮', party: '🥳', vibe: '🎵', laugh: '😄',
  brain: '🧠', spark: '⚡', logic: '📐', answer: '✔️', tip: '💡',
  verified: '✅', official: '📌', locked: '🔒', safe: '🛡️', trusted: '🤝',
  content: '📝', script: '📄', caption: '💬', format: '🧾', code: '💻',
  avatar: '🧍‍♀️', voice: '🎤', mic: '🎙️', camera: '🎥', video: '📹',
  viral: '📈', growth: '🌱', viralhack: '🧨', boost: '🚀', automation: '🤖'
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
  styleMode = 'box',
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
  boxPadding = 10,
  effects = {},
  caps = 'normal',
  lineLayout = 'single',
  captions = []
}) {
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
      finalOutlineWidth = enablePadding || (typeof boxPadding !== 'undefined' && boxPadding > 0) ? 3 : 1;

      if (fontColor?.toLowerCase() === finalBoxColor?.toLowerCase()) {
        fontColor = '#000000'; // fallback for contrast
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
PlayResX: 920
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},&H00000000,${finalOutlineColor},${finalBoxColor},${effects.bold ? 1 : 0},${effects.italic ? 1 : 0},${effects.underline ? 1 : 0},0,100,100,${lineSpacing || 0},0,3,${finalOutlineWidth},${shadow},7,${boxPadding},${boxPadding},10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // ────────────────────────────────────────────────
    // 7. FORMATTED CAPTIONS: preset-driven logic blocks
    // ────────────────────────────────────────────────
    const screenWidth = 980;
    const screenHeight = 1920;
    const adjustedX = screenWidth / 2 + customX;
    const adjustedY = screenHeight / 2 - customY;
    const pos = `\\an5\\pos(${adjustedX},${adjustedY})`;

    const formattedCaptions = captions.map(caption => {
      const rawText = caption.text;

      let cleanText = escapeText(rawText);
      if (preset === 'Emoji Pop') cleanText = injectEmojiOnce(cleanText);
      cleanText = applyCaps(cleanText);

      const anim = getAnimationTags(cleanText, animation, caption.start, caption.end, adjustedY);

      if (preset === 'Hero Pop' && animation === 'word-by-word') {
        const words = cleanText.split(' ');
        const highlighted = words.map(word => `{\\c&H00E6FE&\\t(0,200,\\c&HFFFFFF&)}` + word).join(' ');
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${highlighted}`;
      }

      if (preset === 'Cinematic Fade') {
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${cleanText}`;
      }

      if (['fall', 'rise', 'baselineup', 'panleft', 'panright'].includes(animation)) {
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${cleanText}`;
      }

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
