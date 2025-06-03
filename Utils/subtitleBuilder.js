const fs = require('fs');
const path = require('path');

// Helper to escape ASS format characters
const escapeASS = (text) => {
  return text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');
};

function generateASS(subtitles, options) {
  const {
    fontName = 'Arial',
    fontSize = 36,
    fontColor = '&H00FFFFFF', // White
    outlineColor = '&H00000000', // Black
    alignment = 'bottom', // top | center | bottom
    marginV = 60, // vertical margin (safe zone)
    animation = 'none', // none | fade | bounce | typewriter-char | typewriter-word | word-by-word
    box = true, // background box
  } = options;

  const alignmentMap = {
    top: 8,
    center: 5,
    bottom: 2,
  };

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(1, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    const cs = String(Math.floor((seconds % 1) * 100)).padStart(2, '0');
    return `${h}:${m}:${s}.${cs}`;
  };

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H80000000,0,0,1,2,0,${alignmentMap[alignment]},10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = subtitles.map((sub, i) => {
    const start = formatTime(sub.start);
    const end = formatTime(sub.end);
    const text = escapeASS(sub.text);

    let effect = '';
    let animatedText = text;

    if (animation === 'fade') {
      effect = 'fade(0,255,0,255,300,0)';
    } else if (animation === 'bounce') {
      effect = '\\move(640,720,640,360)';
    } else if (animation === 'typewriter-char') {
      animatedText = text.split('').map((char, i) => `{\\t(${i * 50},${(i + 1) * 50})}${char}`).join('');
    } else if (animation === 'typewriter-word' || animation === 'word-by-word') {
      const words = text.split(' ');
      animatedText = words.map((word, i) => `{\\t(${i * 150},${(i + 1) * 150})}${word}`).join(' ');
    }

    if (box) {
      animatedText = `{\\bord5\\shad0\\1c${fontColor}}${animatedText}`;
    }

    return `Dialogue: 0,${start},${end},Default,,0,0,0,${effect},${animatedText}`;
  });

  return `${header}\n${events.join('\n')}`;
}

function saveASS(subtitles, options, outputPath) {
  const assContent = generateASS(subtitles, options);
  fs.writeFileSync(outputPath, assContent, 'utf8');
}

module.exports = {
  generateASS,
  saveASS,
};
