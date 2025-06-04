import fs from 'fs/promises';

function parseSRT(srt) {
  const blocks = srt.trim().split('\n\n');
  return blocks.map(block => {
    const lines = block.split('\n');
    const time = lines[1];
    const text = lines.slice(2).join('\\N'); // ASS line break
    const [start, end] = time.replace(',', '.').split(' --> ');
    return { start, end, text };
  });
}

export async function buildAssSubtitle({
  subtitlePath,
  fontName,
  fontSize,
  fontColor,
  outlineColor,
  alignment,
  marginV,
  blockStyle,
  blockColor,
  animation,
  shadow
}) {
  const placementMap = {
    'bottom': 2,
    'top': 8,
    'center': 5,
    'bottom-safe': 2,
    'top-safe': 8
  };

  const assAlignment = placementMap[alignment] || 2;

  const outlineHex = '&H' + outlineColor + '&';
  const primaryHex = '&H' + fontColor + '&';
  const backHex = blockStyle ? '&H' + blockColor + '&' : '&H000000&';

  const style = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryHex},${outlineHex},${backHex},0,0,0,0,100,100,0,0,1,2,${shadow},${assAlignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const rawSRT = await fs.readFile(subtitlePath, 'utf-8');
  const events = parseSRT(rawSRT);

  const assLines = events.map(({ start, end, text }) => {
    let effect = '';
    if (animation === 'fade') effect = '\\fad(300,300)';
    else if (animation === 'bounce') effect = '\\move(540,2100,540,1600)';
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{${effect}}${text}`;
  });

  const finalContent = style + assLines.join('\n');
  const assPath = subtitlePath.replace('.srt', '.ass');
  await fs.writeFile(assPath, finalContent, 'utf-8');
  return assPath;
}
