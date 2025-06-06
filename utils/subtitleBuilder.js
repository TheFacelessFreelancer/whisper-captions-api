// utils/subtitleBuilder.js

export function buildAssSubtitle(events, options) {
  const {
    fontSize,
    fontColor,
    fontName,
    outlineColor,
    outlineWidth,
    alignment,      // "top-safe" | "center" | "bottom-safe"
    marginV,        // unused if customY is present
    customY,        // optional: exact Y position in pixels
    animation,
    box,
    boxColor,
  } = options;

  // Map alignment name to \anX and TikTok-safe margins
  const alignmentMap = {
    "top-safe":    { an: 8, marginV: 120 },
    "center":      { an: 5, marginV: 0 },
    "bottom-safe": { an: 2, marginV: 240 },
  };

  const alignmentSettings = alignmentMap[alignment] || alignmentMap["bottom-safe"];
  const anTag = alignmentSettings.an;
  const marginOverride = customY !== undefined ? 0 : alignmentSettings.marginV;

  const header = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H00000000,0,0,0,0,100,100,0,0,1,${outlineWidth},0,${anTag},30,30,${marginOverride},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formattedEvents = events.map(({ start, end, text }) => {
    const formattedStart = formatTime(start);
    const formattedEnd = formatTime(end);

    const fade = animation ? `\\fade(0,255,255,200)` : '';
    const boxTag = box ? `\\bord10\\shad0\\3c${assColor(boxColor)}` : '';
    const positionTag = customY !== undefined
      ? `\\pos(540,${customY})`
      : `\\an${anTag}`;

    const dialogue = `Dialogue: 0,${formattedStart},${formattedEnd},Default,,0,0,0,,{${positionTag}${fade}${boxTag}}${text.replace(/(\r\n|\n|\r)/gm, '')}`;
    return dialogue;
  });

  return header + formattedEvents.join('\n');
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(cs)}`;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function assColor(hex) {
  const normalized = hex.replace('&H', '').replace('#', '').padStart(8, '0').toUpperCase();
  const bb = normalized.slice(6, 8);
  const gg = normalized.slice(4, 6);
  const rr = normalized.slice(2, 4);
  return `&H00${bb}${gg}${rr}`;
}
