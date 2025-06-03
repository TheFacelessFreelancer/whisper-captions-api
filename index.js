import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import { Configuration, OpenAIApi } from 'openai';
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

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/generate', upload.single('video'), async (req, res) => {
  try {
    const video = req.file;
    const {
      fontName, fontSize, textColor, outlineColor,
      alignment, marginV, blockStyle, blockColor,
      animation, shadow
    } = req.body;

    // Extract audio from video
    const audioPath = `uploads/audio-${Date.now()}.mp3`;
    await execAsync(`ffmpeg -i ${video.path} -q:a 0 -map a ${audioPath}`);

    // Transcribe audio with OpenAI Whisper
    const transcription = await openai.createTranscription(
      fs.createReadStream(audioPath),
      'whisper-1',
      undefined,
      'srt'
    );

    const srtPath = `uploads/${Date.now()}.srt`;
    await fs.writeFile(srtPath, transcription.data, 'utf8');

    // Generate ASS subtitle file with style
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

    // Render video with subtitles
    const outputPath = `uploads/output-${Date.now()}.mp4`;
    await renderSubtitledVideo({
      inputPath: video.path,
      subtitlePath: assPath,
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
      outputPath,
    });

    // Upload final video to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(outputPath);

    // Clean up temporary files
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
