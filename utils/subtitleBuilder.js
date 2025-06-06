// utils/subtitleBuilder.js

export function buildAssSubtitle(events, options) {
  const {
    fontSize,
    fontColor,
    fontName,
    outlineColor,
    outlineWidth,
    customY,        // vertical offset from center (positive = up)
    customX,        // horizontal offset from center (positive = right)
    animation,
    box,
    boxColor,
  } = options;

  const header = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H00000000,0,0,0,0,100,100,0,0,1,${outlineWidth},0,5,30,30,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formattedEvents = events.map(({ start, end, text }) => {
    const formattedStart = formatTime(start);
    const formattedEnd = formatTime(end);

    const fade = animation ? `\\fade(0,255,255,200)` : '';
    const boxTag = box ? `\\bord10\\shad0\\3c${assColor(boxColor)}` : '';

    const actualX = 540 + (customX || 0);     // center x = 540
    const actualY = 960 - (customY || 0);     // center y = 960
    const positionTag = `\\pos(${actualX},${actualY})`;

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
