/**
 * ffmpeg.js - Handles FFmpeg video and audio processing
 *
 * Includes:
 * - Extracting audio from videos
 * - Rendering subtitles on videos with scaling
 *
 * ────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ────────────────────────────────────────────────
 * 1. IMPORTS AND UTILITIES
 * 2. AUDIO EXTRACTION: extractAudio(videoPath, audioPath)
 * 3. VIDEO RENDERING: renderVideoWithSubtitles(videoPath, subtitlePath, outputPath)
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND UTILITIES
// ────────────────────────────────────────────────
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
const execAsync = promisify(exec);

// ────────────────────────────────────────────────
// 2. AUDIO EXTRACTION
// ────────────────────────────────────────────────
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

// ────────────────────────────────────────────────
// 3. VIDEO RENDERING
// ────────────────────────────────────────────────
/**
 * Renders subtitles onto the video using a .ass file and saves the final MP4.
 * @param {string} videoPath - Input video file path.
 * @param {string} subtitlePath - Path to .ass subtitle file.
 * @param {string} outputPath - Path to save the final rendered video.
 */
export const renderVideoWithSubtitles = async (videoPath, subtitlePath, outputPath) => {
  console.log('🎬 Rendering video with subtitles...');

  // Force absolute path and proper quoting
  const absoluteSubtitlePath = path.resolve(subtitlePath).replace(/\\/g, '/');
  const command = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${absoluteSubtitlePath}'" -c:v libx264 -preset ultrafast -crf 28 -c:a copy "${outputPath}"`;

  console.log(`▶ Running: ${command}`);
  await execAsync(command);
  console.log('✅ Final video rendered:', outputPath);
};
