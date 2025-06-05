// utils/ffmpeg.js

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const extractAudio = async (videoPath, audioPath) => {
  console.log('🔊 Extracting audio with FFmpeg...');
  const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 44100 -b:a 192k "${audioPath}" -y`;
  await execAsync(command);
};

export const renderVideoWithSubtitles = async (videoPath, subtitlePath, outputPath) => {
  console.log('🎬 Rendering final video with subtitles...');
  const command = `ffmpeg -i "${videoPath}" -vf "ass='${subtitlePath}'" -c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}" -y`;
  await execAsync(command);
};
