/**
 * Builds an ASS subtitle file with full support for:
 * - Preset-based font, box, and animation styling
 * - Preset-based alignment and caps logic
 * - Dynamic emoji injection (for Emoji Pop preset)
 * - Clean structure for cinematic and animated effects
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
  email: '📧', message: '💬', inbox: '📥', dm: '📩', alert: '🔔',
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
  fontName = 'Default',
  fontSize,
  fontColor,
  boxColorHex,
  outlineColorHex,
  outlineWidth,
  shadow,
  shadowColorHex,
  lineSpacing,
  animation,
  preset,
  customX = 0,
  customY = 0,
  effects = {},
  caps = 'normal',
  captions = []
}) {
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

    // Default font logic
    const presetFonts = {
      'Hero Pop': { fontName: 'Montserrat-Bold', fontSize: 60 },
      'Emoji Pop': { fontName: 'Poppins-Bold', fontSize: 58 },
      'Cinematic Fade': { fontName: 'Montserrat-Bold', fontSize: 64 }
    };
    const resolvedFont = (fontName === 'Default' && presetFonts[preset]) ? presetFonts[preset] : { fontName, fontSize };

    const hasBox = !!boxColorHex;
    const borderStyle = hasBox ? 3 : 1;
    const finalOutlineWidth = hasBox ? 0 : (outlineWidth || 0);
    const finalOutlineColor = hasBox ? '&H00000000' : hexToASS(outlineColorHex);
    const finalBoxColor = hasBox ? hexToASS(boxColorHex) : '&H00000000';

    const style = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${resolvedFont.fontName},${resolvedFont.fontSize},${hexToASS(fontColor)},&H00000000,${finalOutlineColor},${finalBoxColor},${effects.bold ? 1 : 0},${effects.italic ? 1 : 0},${effects.underline ? 1 : 0},0,100,100,${lineSpacing || 0},0,${borderStyle},${finalOutlineWidth},${shadow},7,80,80,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const screenWidth = 1080;
    const screenHeight = 1920;

    const formattedCaptions = captions.map(caption => {
      let cleanText = escapeText(caption.text);
      if (preset === 'Emoji Pop') cleanText = injectEmojiOnce(cleanText);
      cleanText = applyCaps(cleanText);

      const pos = `\\an5\\pos(${screenWidth / 2 + customX},${screenHeight / 2 - customY})`;
      const anim = getAnimationTags(cleanText, preset.toLowerCase().replace(/ /g, ''), caption.start, caption.end);

      return `Dialogue: 0,${caption.start},${caption.end},Default,,0,0,0,,{${pos}}${anim}${cleanText}`;
    }).join('\n');

    const content = style + formattedCaptions;
    await fs.promises.writeFile(filePath, content);
    logInfo(`✅ Subtitle file written: ${filePath}`);
    return filePath;
  } catch (err) {
    logError('Subtitle Builder Error', err);
    throw err;
  }
}
