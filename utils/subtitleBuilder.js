import fs from 'fs-extra';
import path from 'path';

function escapeAss(text) {
  return text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}').replace(/\n/g, '\\N');
}

export function buildAssSubtitles(subtitles, outputPath) {
  const styleName = 'Default';
  const assHeader = `
[Script Info]
Title: Captions App
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ${styleName},Arial,60,&H00000000,&H00000000,&H00000000,&H99FFFFFF,-1,0,0,0,100,100,0,0,3,0,0,8,30,30,1150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`.trim();

  const assEvents = subtitles.map((line) => {
    const start = line.start;
    const end = line.end;
    const text = escapeAss(line.text);
    const styledText = `{\\an8\\fade(0,255,0,500,0)}` + text;
    return `Dialogue: 0,${start},${end},${styleName},,0,0,0,,${styledText}`;
  });

  const fullAss = [assHeader, ...assEvents].join('\n');
  fs.ensureFileSync(outputPath);
  fs.writeFileSync(outputPath, fullAss, 'utf8');
}

function formatAssTime(seconds) {
  const hr = Math.floor(seconds / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${hr}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
