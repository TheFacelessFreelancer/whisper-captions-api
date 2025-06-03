
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import { Configuration, OpenAIApi } from 'openai';
import { buildAssSubtitle } from './utils/subtitleBuilder.js';
import { renderSubtitledVideo } from './utils/ffmpeg.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer({ dest: 'uploads/' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/upload', upload.fields([{ name: 'video' }, { name: 'subtitle' }]), async (req, res) => {
  try {
    const video = req.files['video'][0];
    const subtitle = req.files['subtitle'][0];

    const assPath = await buildAssSubtitle({
      subtitlePath: subtitle.path,
      fontName: 'Arial',
      fontSize: 48,
      fontColor: '00FFFF',
      position: 'bottom',
    });

    const outputPath = `uploads/output-${Date.now()}.mp4`;

    await renderSubtitledVideo({
      inputPath: video.path,
      subtitlePath: assPath,
      fontName: 'Arial',
      fontSize: 48,
      fontColor: '00FFFF',
      position: 'bottom',
      outputPath,
    });

    res.download(outputPath);
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
