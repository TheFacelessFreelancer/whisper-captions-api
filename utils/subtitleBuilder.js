// utils/subtitleBuilder.js

export function buildAssSubtitle(events, {
  fontSize = 42,
  fontColor = '&H00FFFFFF',
  fontName = 'Arial',
  outlineColor = '&H00000000',
  outlineWidth = 4,
  alignment = 8,
  marginV = 300,
  animation = true,
  box = true,
  boxColor = '&H00000000'
} = {}) {
  const style = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H00000000,-1,0,0,0,100,100,0,0,1,${outlineWidth},0,${alignment},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`; 

  const dialogue = events.map((e, i) => {
    const start = toAssTime(e.start);
    const end = toAssTime(e.end);
    const fade = animation ? `\fad(200,200)` : '';
    const boxTag = box ? `\1c&H000000&\3c&H000000&\bord10\shad0` : '';
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{${fade}${boxTag}}${escapeAssText(e.text)}`;
  }).join('\n');

  return `${style}\n${dialogue}`;
}

function toAssTime(seconds) {
  const hr = String(Math.floor(seconds / 3600)).padStart(1, '0');
  const min = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const sec = String(Math.floor(seconds % 60)).padStart(2, '0');
  const cs = String(Math.floor((seconds % 1) * 100)).padStart(2, '0');
  return `${hr}:${min}:${sec}.${cs}`;
}

function escapeAssText(text) {
  return text.replace(/\{/g, '(').replace(/\}/g, ')');
}
