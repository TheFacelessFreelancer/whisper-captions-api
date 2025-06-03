
import { exec } from 'child_process';

export async function renderSubtitledVideo({
  inputPath,
  subtitlePath,
  fontName,
  fontSize,
  fontColor,
  position,
  outputPath
}) {
  return new Promise((resolve, reject) => {
    const command = \`ffmpeg -i "\${inputPath}" -vf "ass='\${subtitlePath}'" -c:a copy "\${outputPath}" -y\`;
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(outputPath);
    });
  });
}
