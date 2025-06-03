import { exec } from 'child_process';

export async function renderSubtitledVideo({
  inputPath,
  subtitlePath,
  outputPath
}) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputPath}" -vf "ass='${subtitlePath}'" -c:a copy "${outputPath}" -y`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('FFmpeg Error:', stderr);
        reject(error);
      } else {
        resolve(outputPath);
      }
    });
  });
}
