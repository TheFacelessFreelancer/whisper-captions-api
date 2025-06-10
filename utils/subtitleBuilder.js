import fs from 'fs';
import path from 'path';

export function buildSubtitlesFile({
  jobId,
  fontName,
  fontSize,
  fontColor,
  lineSpacing,
  animation,
  outlineColor,
  outlineWidth,
  shadow,
  box,
  boxColor,
  boxPadding,
  customX,
  customY,
  preset
}) {
  return new Promise((resolve, reject) => {
    const styles = `
[Script Info]
Title: Captions
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},&H00000000,${outlineColor},${boxColor},0,0,0,0,100,100,0,0,1,${outlineWidth},${shadow},2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // Placeholder dialogue line — customize later
    const dialogue = `Dialogue: 0,0:00:00.00,0:00:03.00,Default,,0,0,0,,Hello world!`;

    const content = styles + dialogue;

    const subtitlesDir = path.join('subtitles');
    if (!fs.existsSync(subtitlesDir)) fs.mkdirSync(subtitlesDir);

    const filePath = path.join(subtitlesDir, `${jobId}.ass`);

    fs.writeFile(filePath, content, err => {
      if (err) {
        console.error("❌ Failed to write subtitle file:", err);
        reject(err);
      } else {
        console.log(`✅ Subtitle file written: ${filePath}`);
        resolve(filePath);
      }
    });
  });
}
