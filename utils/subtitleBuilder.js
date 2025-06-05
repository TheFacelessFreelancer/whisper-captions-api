export function buildAssSubtitle(events, options = {}) {
  const {
    fontSize = 42,
    fontColor = '&H00FFFFFF',
    fontName = 'Arial',
    outlineColor = '&H00000000',
    outlineWidth = 4,
    alignment = 8, // top-center
    marginV = 300, // roughly 1/3 from top
    animation = true,
    box = true,
    boxColor = '&H64000000' // semi-transparent black
  } = options;

  const style = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, OutlineColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${box ? boxColor : '&H00000000'},${outlineColor},0,0,0,0,100,100,0,0,1,${outlineWidth},0,${alignment},30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(1, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const cs = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
    return `${h}:${m}:${s}.${cs}`;
  };

  const subtitleBody = events
    .map(({ start, end, text }) => {
      const startTime = formatTime(start);
      const endTime = formatTime(end);
      const effect = animation ? 'Fade(0,0,500,0)' : '';
      const cleanText = text.replace(/\r?\n|\r/g, ' ');
      return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,${effect},${cleanText}`;
    })
    .join('\n');

  return style + subtitleBody;
}
