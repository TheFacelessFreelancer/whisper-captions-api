import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { buildSubtitlesFile } from './utils/subtitleBuilder.js';
import { hexToASS } from './utils/colors.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import { renderVideoWithSubtitles, extractAudio } from './utils/ffmpeg.js';
import whisperTranscribe from './utils/whisper.js';
import { logInfo, logProgress, logError } from './utils/logger.js';

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '50mb' }));

const jobResults = {};

function getStylePreset(name) {
  switch (name) {
    case 'Hero Pop':
      return {
        fontColorHex: '#FFE600',
        outlineColorHex: '#000000',
        outlineWidth: 4,
        shadow: 2,
        box: false,
        boxColorHex: '#000000',
        boxPadding: 0,
        effects: { bold: true, italic: false, underline: false },
        caps: 'allcaps',
        animation: 'word-by-word'
      };
    case 'Emoji Pop':
      return {
        fontColorHex: '#FFFFFF',
        outlineColorHex: '#FF00FF',
        outlineWidth: 3,
        shadow: 2,
        box: true,
        boxColorHex: '#000000',
        boxPadding: 8,
        effects: { bold: true, italic: false, underline: false },
        caps: 'titlecase',
        animation: 'pop',
        enableEmojis: true
      };
    case 'Cinematic Fade':
      return {
        fontColorHex: '#DDDDDD',
        outlineColorHex: '#000000',
        outlineWidth: 2,
        shadow: 3,
        box: true,
        boxColorHex: '#00000080',
        boxPadding: 10,
        effects: { bold: false, italic: true, underline: false },
        caps: 'normal',
        animation: 'fade'
      };
    default:
      return {};
  }
}

const secondsToAss = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100).toString().padStart(2, '0');
  return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
};

app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
      fontName,
      fontSize,
      fontColorHex,
      lineSpacing,
      animation,
      outlineColorHex,
      outlineWidth,
      shadow,
      box,
      boxColorHex,
      boxPadding,
      customX,
      customY,
      preset,
      effects,
      caps,
      lineLayout,
      boxOpacity
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    const presetOverrides = getStylePreset(preset) || {};

    const resolvedFontColorHex = presetOverrides.fontColorHex || fontColorHex;
    const resolvedOutlineColorHex = presetOverrides.outlineColorHex || outlineColorHex;
    const resolvedBoxColorHex = presetOverrides.boxColorHex || boxColorHex;
    const resolvedOutlineWidth = presetOverrides.outlineWidth ?? outlineWidth;
    const resolvedShadow = presetOverrides.shadow ?? shadow;
    const resolvedBox = presetOverrides.box ?? box;
    const resolvedBoxPadding = presetOverrides.boxPadding ?? boxPadding;
    const resolvedEffects = presetOverrides.effects || effects;
    const resolvedCaps = presetOverrides.caps || caps;
    const resolvedAnimation = presetOverrides.animatio
