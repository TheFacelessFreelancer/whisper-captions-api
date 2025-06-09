import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Extracts audio from a video and saves it as MP3.
 * @param {string} videoPath - Path to the input video.
 * @param {string} audioPath - Path to output audio file (.mp3).
 */
export const extractAudio = async (videoPath, audioPath) => {
  console.log('🔊 Extracting audio with FFmpeg...');
  const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 44100 -b:a 192k "${audioPath}" -y`;
  await execAsync(command);
  console.log('✅ Audio extracted:', audioPath);
};

/**
 * Renders subtitles onto the video using a .ass file and saves the final MP4.
 * @param {string} videoPath - Input video file path.
 * @param {string} subtitlePath - Path to .ass subtitle file.
 * @param {string} outputPath - Path to save the final rendered video.
 */
export const renderVideoWithSubtitles = async (videoPath, subtitlePath, outputPath) => {
  console.log('🎬 Rendering video with subtitles...');
  const escapedSubtitlePath = subtitlePath.replace(/\\/g, '/'); // escape for Windows paths
  const command = `ffmpeg -i "${videoPath}" -vf "ass='${escapedSubtitlePath}',scale=720:-2" -c:v libx264 -preset fast -crf 23 -c:a copy "${outputPath}" -y`;
  await execAsync(command);
  console.log('✅ Final video rendered:', outputPath);
};
