// ────────────────────────────────────────────────
// 6. POST ENDPOINT: /subtitles
// ────────────────────────────────────────────────
app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
      // → the only two “preset” fields
      captionStyle,   // “Hero Pop” | “Emoji Pop” | “Cinematic Fade”
      alignment,      // “Top-Safe” | “Center” | “Bottom-Safe”
      // …plus any font overrides you still expose…
      fontName,
      fontSize,
      fontColorHex,
      boxColorHex,
      outlineColorHex,
      outlineWidth,
      shadow,
      lineSpacing,
      caps,
      customX = 0,
      customY = 0
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    // ────────────────────────────────────────────────
    // ALIGNMENT PRESET → customY
    // ────────────────────────────────────────────────
    let finalCustomY = customY;
    switch ((alignment||'').toLowerCase()) {
      case 'top-safe':    finalCustomY =  750; break;
      case 'center':      finalCustomY =    0; break;
      case 'bottom-safe': finalCustomY = -350; break;
      // else use customY as provided
    }

    // ✅ IMMEDIATE RESPONSE — job queued
    res.json({ jobId, success: true });
    logInfo("🚀 Queued job", { jobId });

    // ────────────────────────────────────────────────
    // BACKGROUND RENDER (non-blocking)
    // ────────────────────────────────────────────────
    setTimeout(async () => {
      try {
        // 1) Extract, transcribe, map to [{start,end,text}]
        const audioPath = `output/${safeFileName}.mp3`;
        await extractAudio(videoUrl, audioPath);
        const whisperRes = await whisperTranscribe(audioPath);
        const captions = whisperRes.segments.map(s => ({
          start: secondsToAss(s.start),
          end:   secondsToAss(s.end),
          text:  s.text.trim()
        }));

        // 2) Build ASS file — all your preset logic is in subtitleBuilder.js now
        const subtitleFilePath = await buildSubtitlesFile({
          jobId,
          captionStyle,
          alignment,
          fontName,
          fontSize,
          fontColor: fontColorHex,
          boxColorHex,
          outlineColorHex,
          outlineWidth,
          shadow,
          lineSpacing,
          caps,
          customX,
          customY: finalCustomY,
          captions
        });

        // 3) Render & upload
        const videoOutput = `output/${safeFileName}.mp4`;
        await renderVideoWithSubtitles(videoUrl, subtitleFilePath, videoOutput);
        const finalUrl = await uploadToCloudinary(videoOutput, `captions-app/${safeFileName}`);

        jobResults[jobId] = { success: true, videoUrl: finalUrl };
        logInfo("🎬 Rendering complete", { jobId, videoUrl: finalUrl });
      } catch (bgErr) {
        logError("Background processing error", bgErr);
        jobResults[jobId] = { success: false, error: bgErr.message };
      }
    }, 10);

  } catch (err) {
    logError("Server error", err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});
