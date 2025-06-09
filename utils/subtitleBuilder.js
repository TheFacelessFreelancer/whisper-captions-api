export function buildAssSubtitle(events, options) {
  const {
    fontSize,
    fontColor,
    fontName,
    outlineColor,
    outlineWidth,
    lineSpacing,
    shadow,
    animation,
    box,
    boxColor,
    boxPadding,
    customX = 540,
    customY = 960
  } = options;

  const header = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H00000000,0,0,0,0,100,100,${lineSpacing},0,1,${outlineWidth},${shadow},5,30,30,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formattedEvents = events.map(({ start, end, text }) => {
    const startTime = formatTime(start);
    const endTime = formatTime(end);

    const animTag = animation === 'fade' ? '\\fad(200,200)' : '';
    const boxStyle = box ? `\\bord${boxPadding}\\shad0\\3c${assColor(boxColor)}` : '';
    const position = `\\pos(${customX},${customY})`;

    return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,{${animTag}${boxStyle}${position}}${sanitizeText(text)}`;
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

function assColor(hexOrAss) {
  const normalized = hexOrAss.replace('&H', '').replace('#', '').padStart(8, '0').toUpperCase();
  const bb = normalized.slice(6, 8);
  const gg = normalized.slice(4, 6);
  const rr = normalized.slice(2, 4);
  return `&H00${bb}${gg}${rr}`;
}

function sanitizeText(text) {
  return text.replace(/(\r\n|\n|\r)/gm, '').replace(/{/g, '\\{').replace(/}/g, '\\}');
}
