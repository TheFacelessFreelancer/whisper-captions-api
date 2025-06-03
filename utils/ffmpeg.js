import fs from 'fs/promises';

export async function buildAssSubtitle({
  subtitlePath,
  fontName = 'Arial',
  fontSize = 60,
  fontColor = 'FFFFFF',
  alignment = 'bottom',
  marginV = 30,
  animationType = 'none' // Options: none, word, word-typewriter, char, fade, bounce
}) {
  const alignmentMap = {
    top: '1',
    bottom: '2',
    center: '8'
  };

  const alignmentCode = alignmentMap[alignment] || '2';

  const assStyle = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H00${fontColor},&H000000,&H000000,0,0,0,0,100,100,0,0,1,2,0,${alignmentCode},30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const rawSubs = await fs.readFile(subtitlePath, 'utf-8');
  const lines = rawSubs.split('\n').filter(Boolean);

  const eventLines = [];

  for (const line of lines) {
    const [start, end, text] = line.split(',');
    let transformedText = text;

    switch (animationType) {
      case 'word':
        transformedText = text.split(' ').map(word => `{\\k20}${word}`).join(' ');
        break;
      case 'word-typewriter':
        transformedText = text.split(' ').map(word => `{\\kf20}${word}`).join(' ');
        break;
      case 'char':
        transformedText = text.split('').map(char => `{\\kf10}${char}`).join('');
        break;
      case 'fade':
        transformedText = `{\\fad(200,200)}${text}`;
        break;
      case 'bounce':
        transformedText = `{\\move(960,1000,960,900)}${text}`;
        break;
      default:
        break;
    }

    eventLines.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,${transformedText}`);
  }

  const finalAss = assStyle + eventLines.join('\n');
  const assPath = subtitlePath.replace('.srt', '.ass');

  await fs.writeFile(assPath, finalAss, 'utf-8');
  return assPath;
}
