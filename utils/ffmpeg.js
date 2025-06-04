import { exec } from 'child_process';

export async function renderSubtitledVideo({
  inputPath,
  subtitlePath,
  outputPath
}) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -i "${inputPath}" -vf "ass='${subtitlePath}',scale=720:1280" -c:a copy "${outputPath}" -y`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ FFmpeg Error:', error);
        reject(error);
      } else {
        console.log('✅ FFmpeg completed');
        resolve(outputPath);
      }
    });
  });
}
