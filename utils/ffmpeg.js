/**
 * ffmpeg.js - Handles FFmpeg video and audio processing
 *
 * Includes:
 * - Extracting audio from videos
 * - Rendering subtitles on videos with scaling
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND UTILITIES
// ────────────────────────────────────────────────
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { logInfo, logProgress, logError } from './logger.js';
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
  try {
    logProgress('🔊 Extracting audio with FFmpeg');
    const command = `ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -ar 44100 -b:a 192k "${audioPath}" -y`;
    await execAsync(command);
    logInfo('✅ Audio extracted:', audioPath);
  } catch (err) {
    logError('Audio extraction failed', err);
    throw err;
  }
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
  try {
    logProgress('🎬 Rendering video with subtitles');

    const absoluteSubtitlePath = path.resolve(subtitlePath).replace(/\\/g, '/');
    const command = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${absoluteSubtitlePath}'" -c:v libx264 -preset ultrafast -crf 28 -c:a copy "${outputPath}"`;

    logProgress('▶ Running FFmpeg command', command);
    await execAsync(command);
    logInfo('✅ Final video rendered:', outputPath);
  } catch (err) {
    logError('Video rendering failed', err);
    throw err;
  }
};
