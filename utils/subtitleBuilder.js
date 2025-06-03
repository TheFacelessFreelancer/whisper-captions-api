import fs from 'fs/promises';

export async function buildAssSubtitle({
  subtitlePath,
  fontName = 'Arial',
  fontSize = 40,
  fontColor = 'FFFFFF',
  outlineColor = '000000',
  bold = false,
  italic = false,
  underline = false,
  alignment = 'bottom-safe',
  marginV = 100,
  blockStyle = false,
  blockColor = '000000',
  animation = 'none',
  shadow = 0,
}) {
  const alignmentMap = {
    'top-safe': 7,
    'bottom-safe': 2,
    'center-safe': 5,
  };
  const placement = alignmentMap[alignment] || 2;

  const boolToInt = (value) => value ? -1 : 0;

  const assStyle = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H00${fontColor},&H00${outlineColor},&H00${blockColor},${boolToInt(bold)},${boolToInt(italic)},${boolToInt(underline)},0,100,100,0,0,1,1,${shadow},${placement},30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const rawSubs = await fs.readFile(subtitlePath, 'utf-8');
  const srtLines = rawSubs.split('\n');

  let subs = [];
  for (let i = 0; i < srtLines.length; i++) {
    if (srtLines[i].match(/\d+:\d+:\d+,\d+/)) {
      const startTime = srtLines[i].split(' --> ')[0].replace(',', '.');
      const endTime = srtLines[i].split(' --> ')[1].replace(',', '.');
      const text = srtLines[i + 1] || '';
      const effect = animation !== 'none' ? animation : '';
      subs.push(`Dialogue: 0,${startTime},${endTime},Default,,0,0,0,${effect},${text}`);
      i += 1;
    }
  }

  const finalSub = assStyle + subs.join('\n');
  const assPath = subtitlePath.replace('.srt', '.ass');
  await fs.writeFile(assPath, finalSub, 'utf-8');
  return assPath;
}
