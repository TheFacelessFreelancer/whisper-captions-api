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
export async function buildSubtitlesFile(params) {
  // Deconstruct with defaults
  const {
    jobId,
    fontName = 'Montserrat',
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
  } = params;

  try {
    const subtitlesDir = path.join('subtitles');
    const filePath = path.join(subtitlesDir, `${jobId}.ass`);
    await fs.promises.mkdir(subtitlesDir, { recursive: true });

    const applyCaps = (text) => {
      if (caps === 'allcaps') return text.toUpperCase();
      if (caps === 'titlecase') return text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      return text;
    };

    const escapeText = (text) => text.replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/"/g, '\\"');

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

    const style = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 920
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},&H00000000,${finalOutlineColor},${finalBoxColor},${effects.bold ? 1 : 0},${effects.italic ? 1 : 0},${effects.underline ? 1 : 0},0,100,100,${lineSpacing || 0},0,3,${finalOutlineWidth},${shadow},7,50,50,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const screenWidth = 980;
    const screenHeight = 1920;
    const avgCharWidth = fontSize * 0.55;
    const usableWidth = screenWidth - 100;
    const maxChars = Math.floor(usableWidth / avgCharWidth);

    const formattedCaptions = captions.map(caption => {
      let text = applyCaps(escapeText(caption.text));
      if (preset === 'Emoji Pop') text = injectEmojiOnce(text);
      const x = screenWidth / 2 + customX;
      const y = screenHeight / 2 - customY;
      const pos = `\\an5\\pos(${x},${y})`;
      const anim = getAnimationTags(text, animation, caption.start, caption.end, y);

      if (preset === 'Hero Pop' && animation === 'word-by-word') {
        const words = text.split(' ').map(w => `{\\c&H00E6FE&\\t(0,200,\\c&HFFFFFF&)}` + w).join(' ');
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${words}`;
      }

      if (preset === 'Cinematic Fade') {
        const cinematicTags = `\\fad(500,500)\\move(${x},${y},${x},${y - 20})\\c&H888888&\\t(0,800,\\c&HFFFFFF&)`;
        return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}${cinematicTags}}${text}`;
      }

      return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${text}`;
    }).join('\n');

    await fs.promises.writeFile(filePath, style + formattedCaptions);
    logInfo(`✅ Subtitle file written: ${filePath}`);
    return filePath;
  } catch (err) {
    logError("Subtitle Builder Error", err);
    throw err;
  }
}
