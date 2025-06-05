import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function extractAudio(videoPath, audioPath) {
  const command = `ffmpeg -i ${videoPath} -q:a 0 -map a ${audioPath} -y`;
  return execAsync(command);
}

export async function renderVideoWithSubtitles(videoPath, subtitlePath, outputPath) {
  const command = `ffmpeg -i "${videoPath}" -vf "ass='${subtitlePath}'" -c:a copy "${outputPath}" -y`;
  return execAsync(command);
}
