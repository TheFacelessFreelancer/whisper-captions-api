const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { OpenAI } = require("openai");
const { exec } = require("child_process");

const app = express();
const upload = multer({ dest: "uploads/" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());

app.post("/generate-captions", upload.single("video"), async (req, res) => {
  const inputPath = req.file.path;
  const outputPath = `audio-${Date.now()}.mp3`;

  exec(`ffmpeg -i ${inputPath} -q:a 0 -map a ${outputPath}`, async (err) => {
    if (err) return res.status(500).send("Audio extraction failed.");

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(outputPath),
        model: "whisper-1",
        response_format: "srt"
      });

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

      res.set("Content-Type", "text/plain");
      res.send(transcription);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
