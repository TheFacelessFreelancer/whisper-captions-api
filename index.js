import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import axios from 'axios';
import { buildAssSubtitle, saveSubtitleFile } from './utils/subtitleBuilder.js';
import { renderSubtitledVideo } from './utils/ffmpeg.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const uploadDir = 'uploads';
await fs.ensureDir(uploadDir);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

app.post('/generate', async (req, res) => {
  try {
    const {
      video_url,
      fontName, fontSize, textColor, outlineColor,
      alignment, marginV, blockStyle, blockColor,
      animation, shadow
    } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: 'Missing video_url' });
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
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('✅ Video file saved:', videoPath);

    const audioPath = `${uploadDir}/audio-${Date.now()}.mp3`;
    console.log('🔊 Extracting audio with FFmpeg...');
    await fs.remove(audioPath);
    await new Promise((resolve, reject) => {
      const ffmpeg = require('child_process').exec;
      ffmpeg(`ffmpeg -i ${videoPath} -q:a 0 -map a ${audioPath}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    console.log('📝 Transcribing audio with Whisper...');
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    const srtPath = `${uploadDir}/${Date.now()}.srt`;
    await fs.writeFile(srtPath, transcription, 'utf8');

    function parseSRT(srt) {
      const blocks = srt.trim().split(/\n\s*\n/);
      return blocks.map(block => {
        const lines = block.split(/\r?\n/);
        if (lines.length < 3) return null;
        const timeLine = lines[1];
        const [start, end] = timeLine.replace(/,/g, '.').split(' --> ');
        const text = lines.slice(2).join('\\N');
        return { start, end, text };
      }).filter(Boolean);
    }

    console.log('🎨 Building styled subtitle file...');
    const events = parseSRT(transcription);
    const assContent = buildAssSubtitle(events);
    const assPath = srtPath.replace('.srt', '.ass');
    await saveSubtitleFile(assPath, assContent);

    const outputPath = `${uploadDir}/output-${Date.now()}.mp4`;
    await renderSubtitledVideo({
      inputPath: videoPath,
      subtitlePath: assPath,
      outputPath,
    });

    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    await fs.remove(videoPath);
    await fs.remove(audioPath);
    await fs.remove(srtPath);
    await fs.remove(assPath);
    await fs.remove(outputPath);

    res.json({ video_url: cloudinaryUrl });
  } catch (err) {
    console.error('❌ FULL ERROR STACK:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});

app.get('/ping', (req, res) => {
  res.send('Server is up!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});
