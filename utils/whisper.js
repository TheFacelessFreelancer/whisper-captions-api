/**
 * whisper.js - Handles Whisper transcription using OpenAI API
 *
 * Converts audio files into caption data (with timestamps) using Whisper.
 *
 * ────────────────────────────────────────────────
 * TABLE OF CONTENTS
 * ────────────────────────────────────────────────
 * 1. IMPORTS AND ENV SETUP
 * 2. TRANSCRIPTION: whisperTranscribe(audioPath)
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND ENV SETUP
// ────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { logInfo, logProgress, logError } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────
// 2. TRANSCRIPTION FUNCTION
// ────────────────────────────────────────────────
/**
 * Transcribes audio using OpenAI Whisper and returns caption segments.
 * @param {string} audioPath - Full path to audio file (e.g., .mp3).
 * @returns {Promise<Object>} - Whisper JSON with `segments` containing caption text, start, end.
 */
const whisperTranscribe = async (audioPath) => {
  try {
    logProgress('🧠 Sending audio to Whisper API for transcription...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(path.resolve(audioPath)));
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('❌ Whisper error response', errorText);
      throw new Error(`Whisper API error: ${errorText}`);
    }

    const data = await response.json();

    if (!data.segments) {
      logError('⚠️ Whisper returned unexpected response', data);
      throw new Error('Whisper response did not include segments');
    }

    logInfo('✅ Whisper transcription complete:', {
      segments: data.segments.length,
      duration: data.duration
    });

    return data;

  } catch (err) {
    logError('💥 Whisper transcription failed', err);
    throw err;
  }
};

export default whisperTranscribe;
