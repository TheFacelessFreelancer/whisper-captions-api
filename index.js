app.post('/subtitles', async (req, res) => {
  try {
    const {
      videoUrl,
      fileName,
      fontName,
      fontSize,
      captionStyle,
      alignment,
      caps,
      customX,
      customY
    } = req.body;

    const jobId = uuidv4();
    const safeFileName = fileName || jobId;

    const presetOverrides = getStylePreset(captionStyle) || {};

    const resolvedFontColorHex = presetOverrides.fontColorHex;
    const resolvedOutlineColorHex = presetOverrides.outlineColorHex;
    const resolvedBoxColorHex = presetOverrides.boxColorHex;
    const resolvedOutlineWidth = presetOverrides.outlineWidth;
    const resolvedShadow = presetOverrides.shadow;
    const resolvedBox = presetOverrides.box;
    const resolvedBoxPadding = presetOverrides.boxPadding;
    const resolvedEffects = presetOverrides.effects || {};
    const resolvedCaps = caps || presetOverrides.caps;
    const resolvedAnimation = presetOverrides.animation;
    const resolvedEnableEmojis = presetOverrides.enableEmojis || false;

    // 🔁 Override Y using alignment
    let finalCustomY = customY;
    if (alignment === 'top-safe') finalCustomY = 750;
    else if (alignment === 'bottom-safe') finalCustomY = -350;
    else if (alignment === 'center') finalCustomY = 0;

    logInfo("🚀 Sending response to Make", { jobId, success: true });
    res.json({ jobId, success: true });

    setTimeout(async () => {
      try {
        await fs.promises.mkdir('output', { recursive: true });

        const audioPath = `output/${safeFileName}.mp3`;
        await extractAudio(videoUrl, audioPath);

        const whisperResponse = await whisperTranscribe(audioPath);
        const captions = whisperResponse.segments.map(segment => ({
          start: secondsToAss(segment.start),
          end: secondsToAss(segment.end),
          text: segment.text.trim()
        }));

        logProgress("Captions Generated", captions);

        const subtitleFilePath = await buildSubtitlesFile({
          jobId,
          fontName,
          fontSize,
          fontColor: resolvedFontColorHex,
          styleMode: resolvedBox ? 'box' : 'outline',
          boxColor: resolvedBoxColorHex,
          enablePadding: true,
          outlineColorHex: resolvedOutlineColorHex,
          outlineWidth: resolvedOutlineWidth,
          shadow: resolvedShadow,
          shadowColorHex: '#000000',
          lineSpacing: 0,
          animation: resolvedAnimation,
          customX,
          customY: finalCustomY,
          effects: resolvedEffects,
          caps: resolvedCaps,
          lineLayout: 'single',
          enableEmojis: resolvedEnableEmojis,
          captions
        });

        const videoOutputPath = `output/${safeFileName}.mp4`;
        await renderVideoWithSubtitles(videoUrl, subtitleFilePath, videoOutputPath);
        const videoUrlFinal = await uploadToCloudinary(videoOutputPath, `captions-app/${safeFileName}`);

        jobResults[jobId] = {
          success: true,
          videoUrl: videoUrlFinal
        };
      } catch (err) {
        logError("Background processing error", err);
      }
    }, 10);
  } catch (err) {
    logError("Server error", err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});
