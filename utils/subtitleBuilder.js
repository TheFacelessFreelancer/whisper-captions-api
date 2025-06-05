import fs from 'fs';

export function buildAssSubtitle(events, options) {
  const {
    fontSize = 42,
    fontColor = '&H00FFFFFF', // White
    fontName = 'Arial',
    outlineColor = '&H00000000', // Black
    outlineWidth = 4,
    alignment = 8, // Top center
    marginV = 300,
    animation = true,
    box = true,
    boxColor = '&H00000000' // Black box
  } = options;

  const style = `Style: Default,${fontName},${fontSize},&H00FFFFFF,&H00FFFFFF,${outlineColor},${boxColor},0,0,0,${outlineWidth},0,0,1,2,${alignment},20,20,${marginV},1`;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${style}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`; 

  const eventsFormatted = events.map((e, index) => {
    const start = formatTime(e.start);
    const end = formatTime(e.end);
    const text = animation
      ? `{\fad(200,200)}${e.text}`
      : e.text;

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return `${header}
${eventsFormatted.join('\n')}`;
}

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(cs)}`;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}
