import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function renderSubtitledVideo({
  inputPath,
  subtitlePath,
  fontName,
  fontSize,
  fontColor,
  position,
  effect,
  background_box = false,
  custom_margin_top = 40,
  custom_margin_bottom = 120,
  outputPath
}) {
  // ASS placement alignment codes
  const alignmentMap = {
    top: 8,
    center: 5,
    bottom: 2,
    'top-safe': 8,
    'bottom-safe': 2
  };

  const marginV = position === 'top' || position === 'top-safe'
    ? custom_margin_top
    : custom_margin_bottom;

  const alignment = alignmentMap[position] || 2;

  const primaryColor = `&H${fontColor.replace('#', '')}`;
  const outlineColor = '&H000000';
  const backColor = background_box ? '&H80000000' : '&H00000000';

  const assStyle = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},${outlineColor},${backColor},0,0,0,0,100,100,0,0,1,2,0,${alignment},30,30,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const rawSubs = await fs.readFile(subtitlePath, 'utf-8');
  const subLines = rawSubs.split('\n').filter(Boolean);

  const eventLines = subLines.map(line => {
    const [times, text] = line.split(',', 2);
    const [start, end] = times.split(' --> ');

    let effectTag = '';
    let dialogueText = text;

    switch (effect) {
      case 'fade':
        effectTag = '\\fade(0,255,0,200,300)';
        break;
      case 'bounce':
        effectTag = '\\move(960,1080,960,900)';
        break;
      case 'typewriter':
        effectTag = '\\k20';
        break;
      case 'word-by-word':
        effectTag = ''; // individual word lines will be split below
        break;
    }

    if (effect === 'word-by-word') {
      const words = text.split(' ');
      return words.map((word, idx) => {
        return `Dialogue: 0,${start},${end},Default,,0,0,0,,${word}`;
      }).join('\n');
    }

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{${effectTag}}${dialogueText}`;
  });

  const assText = assStyle + eventLines.join('\n');
  const assPath = subtitlePath.replace('.srt', '.ass');
  await fs.writeFile(assPath, assText, 'utf-8');

  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputPath}" -vf "ass='${assPath}'" -c:a copy "${outputPath}" -y`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(outputPath);
      }
    });
  });
}
