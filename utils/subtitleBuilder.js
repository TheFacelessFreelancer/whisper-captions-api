
const fs = require('fs');
const path = require('path');

function escapeASS(text) {
  return text.replace(/[{}]/g, '').replace(/\N/g, '\\N');
}

function buildASS(transcript, options) {
  const {
    fontName = 'Arial',
    fontSize = 36,
    fontColor = '&H00FFFFFF',
    position = 'bottom',
    marginV = 80,
    backgroundBox = false,
    animation = 'none'
  } = options;

  const marginMap = {
    top: 100,
    center: 240,
    bottom: 80,
  };

  const verticalMargin = typeof position === 'number' ? position : (marginMap[position] || 80);

  let style = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, OutlineColour, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},&H00000000,&H00000000,1,1,0,2,10,10,${verticalMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  function toASSTime(seconds) {
    const hr = String(Math.floor(seconds / 3600)).padStart(1, '0');
    const min = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const sec = String(Math.floor(seconds % 60)).padStart(2, '0');
    const cs = String(Math.floor((seconds % 1) * 100)).padStart(2, '0');
    return `${hr}:${min}:${sec}.${cs}`;
  }

  for (const segment of transcript) {
    const start = toASSTime(segment.start);
    const end = toASSTime(segment.end);
    let text = escapeASS(segment.text.trim());

    // Animation handling
    switch (animation) {
      case 'character':
        text = text.split('').map(c => `{\k10}${c}`).join('');
        break;
      case 'word':
        text = text.split(' ').map(w => `{\k20}${w}`).join(' ');
        break;
      case 'word-lines':
        const words = text.split(' ');
        let lines = [];
        for (let i = 0; i < words.length; i += 6) {
          lines.push(words.slice(i, i + 6).join(' '));
        }
        text = lines.map(line => `{\k30}${line}`).join('\N');
        break;
      case 'fade':
        text = `{\fad(500,500)}${text}`;
        break;
      case 'bounce':
        text = `{\move(640,720,640,${720 - verticalMargin})}${text}`;
        break;
      case 'none':
      default:
        break;
    }

    if (backgroundBox) {
      text = `{\bord3\shad0\1c${fontColor}\3c&H000000&}${text}`;
    }

    style += `
Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  }

  return style;
}

function writeASSFile(content, outputPath) {
  fs.writeFileSync(outputPath, content);
}

module.exports = {
  buildASS,
  writeASSFile
};
