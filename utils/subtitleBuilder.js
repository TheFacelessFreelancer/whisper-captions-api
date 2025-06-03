
import fs from 'fs/promises';

export async function buildAssSubtitle({ subtitlePath, fontName, fontSize, fontColor, position }) {
  const positions = {
    top: '1',
    bottom: '2',
    center: '8'
  };
  const placement = positions[position] || '2';

  const assStyle = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,\${fontName},\${fontSize},&H\${fontColor},&H000000,&H000000,0,0,0,0,100,100,0,0,1,2,0,\${placement},30,30,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
\`;

  const rawSubs = await fs.readFile(subtitlePath, 'utf-8');
  const subLines = rawSubs.split('\n').filter(Boolean).map(line => \`Dialogue: 0,\${line}\`);
  const finalSub = assStyle + subLines.join('\n');

  const assPath = subtitlePath.replace('.srt', '.ass');
  await fs.writeFile(assPath, finalSub, 'utf-8');
  return assPath;
}
