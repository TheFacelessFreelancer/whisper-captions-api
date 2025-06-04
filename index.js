import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import OpenAI from 'openai';
import axios from 'axios';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';
import { renderSubtitledVideo } from './utils/ffmpeg.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const app = express();
const uploadDir = 'uploads';
await fs.ensureDir(uploadDir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate', async (req, res) => {
  try {
    const {
      video_url,
      fontName, fontSize, textColor, outlineColor,
      alignment, marginV, blockStyle, blockColor,
      animation, shadow
    } = req.body;

    if (!video_url) {
      console.error('Missing required field: video_url');
      return res.status(400).json({ error: 'Missing required field: video_url' });
    }

    const videoPath = `${uploadDir}/input-${Date.now()}.mp4`;
    console.log('📥 Downloading video from:', video_url);

    const response = await axios({
      method: 'GET',
      url: video_url,
      responseType: 'stream'
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(videoPath);
      response.data.pipe(writer);
      writer.on('finish', () => {
        console.log('✅ Video file saved:', videoPath);
        resolve();
      });
      writer.on('error', (err) => {
        console.error('❌ Video download error:', err);
        reject(err);
      });
    });

    const fileExists = await fs.pathExists(videoPath);
    if (!fileExists) {
      throw new Error(`File not saved properly: ${videoPath}`);
    }

    const audioPath = `${uploadDir}/audio-${Date.now()}.mp3`;
    console.log('🔊 Extracting audio with FFmpeg...');
    await execAsync(`ffmpeg -i ${videoPath} -q:a 0 -map a ${audioPath}`);

    console.log('📝 Transcribing audio with Whisper...');
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    const srtPath = `${uploadDir}/${Date.now()}.srt`;
    await fs.writeFile(srtPath, transcription, 'utf8');

    console.log('🎨 Building styled subtitle file...');
    const assPath = await buildAssSubtitle({
      subtitlePath: srtPath,
      fontName,
      fontSize,
      fontColor: textColor,
      outlineColor,
      alignment,
      marginV,
      blockStyle,
      blockColor,
      animation,
      shadow,
    });

    const outputPath = `${uploadDir}/output-${Date.now()}.mp4`;
