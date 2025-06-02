
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { OpenAI } = require("openai");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getPositionStyle(position) {
  const styles = {
    top_safe: { alignment: 8, marginV: 60 },
    bottom_safe: { alignment: 2, marginV: 120 },
    center: { alignment: 5, marginV: 0 },
  };
  return styles[position] || null;
}

app.post("/generate", upload.single("video"), async (req, res) => {
  const { font_name, font_size, font_color, position, effect, manual_position } = req.body;
  const filePath = req.file.path;

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "text",
    });

    const assPath = `subs_${Date.now()}.ass`;
    const posStyle = getPositionStyle(position);
    const alignment = posStyle ? posStyle.alignment : 2;
    const marginV = posStyle ? posStyle.marginV : 60;

    const subtitleAss = `
[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResY: 720
PlayResX: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, OutlineColour, Alignment, MarginV
Style: Default,${font_name},${font_size},&H${font_color.replace("#", "")},&H00000000,&H00000000,${alignment},${marginV}

[Events]
Format: Start, End, Style, Text
Dialogue: 0,0:00:00.00,0:00:10.00,Default,${transcription}
`;

    fs.writeFileSync(assPath, subtitleAss);

    const outputVideo = `output_${Date.now()}.mp4`;
    const ffmpegCommand = `ffmpeg -i ${filePath} -vf "ass=${assPath}" -c:a copy ${outputVideo}`;

    exec(ffmpegCommand, async (err) => {
      if (err) return res.status(500).json({ error: "FFmpeg failed", details: err });

      try {
        const cloudinaryRes = await cloudinary.uploader.upload(outputVideo, {
          resource_type: "video",
        });

        fs.unlinkSync(filePath);
        fs.unlinkSync(assPath);
        fs.unlinkSync(outputVideo);

        res.json({ video_url: cloudinaryRes.secure_url });
      } catch (uploadErr) {
        res.status(500).json({ error: "Cloudinary upload failed", details: uploadErr });
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Transcription failed", details: error });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
