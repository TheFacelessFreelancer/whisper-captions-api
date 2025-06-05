import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const whisperTranscribe = async (audioPath) => {
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
    throw new Error(`Whisper API error: ${errorText}`);
  }

  const data = await response.json();
  return data.segments.map((segment) => ({
    start: segment.start.toFixed(3),
    end: segment.end.toFixed(3),
    text: segment.text.trim(),
  }));
};

export default whisperTranscribe;
