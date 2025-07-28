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
import fs from 'fs';
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

/**
 * Prepends a 0.1s thumbnail video to the start of the main video.
 * @param {string} thumbnailPath - Path to the image file (e.g., JPG or PNG).
 * @param {string} videoPath - Path to the main video file (MP4).
 * @param {string} outputPath - Final output path.
 */
export const prependThumbnail = async (thumbnailPath, videoPath, outputPath) => {
  try {
    logProgress('🖼️ Prepending thumbnail image...');

    // Step 1: Convert thumbnail image to short 0.1s video
    const thumbVideoPath = 'output/thumb_video.mp4';
    const imageToVideoCmd = `ffmpeg -y -loop 1 -i "${thumbnailPath}" -t 0.1 -vf "scale=720:1280" -c:v libx264 -pix_fmt yuv420p -r 25 "${thumbVideoPath}"`;
    await execAsync(imageToVideoCmd);

    // Step 2: Concatenate thumbnail video + original video
    const listPath = 'output/concat_list.txt';
    const listContent = `file '${thumbVideoPath}'\nfile '${videoPath}'`;
    await fs.promises.writeFile(listPath, listContent);

    const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
    await execAsync(concatCmd);

    logInfo('✅ Thumbnail prepended to video:', outputPath);
  } catch (err) {
    logError('Thumbnail prepend failed', err);
    throw err;
  }
};
