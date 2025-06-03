import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import OpenAI from 'openai';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';
import { renderSubtitledVideo } from './utils/ffmpeg.js';
import { uploadToCloudinary } from './utils/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const app = express();
const upload = multer({ dest: 'uploads/' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/generate', upload.single('video'), async (req, res) => {
  try {
    const video = req.file;
    const {
      fontName, fontSize, textColor, outlineColor,
      alignment, marginV, blockStyle, blockColor,
      animation, shadow
    } = req.body;

    const audioPath = `uploads/audio-${Date.now()}.mp3`;
    await execAsync(`ffmpeg -i ${video.path} -q:a 0 -map a ${audioPath}`);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'srt'
    });

    const srtPath = `uploads/${Date.now()}.srt`;
    await fs.writeFile(srtPath, transcription, 'utf8');

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

    const outputPath = `uploads/output-${Date.now()}.mp4`;
    await renderSubtitledVideo({
      inputPath: video.path,
      subtitlePath: assPath,
      outputPath,
    });

    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    await fs.remove(video.path);
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
