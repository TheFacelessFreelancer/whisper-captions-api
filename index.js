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

    // Download video
    const videoPath = `uploads/input-${Date.now()}.mp4`;
    const response = await axios({
      method: 'GET',
      url: video_url,
      responseType: 'stream'
    });
    const writer = fs.createWriteStream(videoPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Extract audio
    const audioPath = `uploads/audio-${Date.now()}.mp3`;
    await execAsync(`ffmpeg -i ${videoPath} -q:a 0 -map a ${audioPath}`);

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    const srtPath = `uploads/${Date.now()}.srt`;
    await fs.writeFile(srtPath, transcription, 'utf8');

    // Generate ASS subtitle
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

    // Render final video
    const outputPath = `uploads/output-${Date.now()}.mp4`;
    await renderSubtitledVideo({
      inputPath: videoPath,
      subtitlePath: assPath,
      outputPath,
    });

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    // Cleanup
    await fs.remove(videoPath);
    await fs.remove(audioPath);
    await fs.remove(srtPath);
    await fs.remove(assPath);
    await fs.remove(outputPath);

    res.json({ video_url: cloudinaryUrl });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

app.get('/ping', (req, res) => {
  res.send('Server is up!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
