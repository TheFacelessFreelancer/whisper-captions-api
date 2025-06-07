export function buildAssSubtitle(events, options) {
  const {
    fontName = 'Arial',
    fontSize = 42,
    fontColor = '&H00FFFFFF',
    outlineColor = '&H00000000',
    outlineWidth = 2,
    lineSpacing = 0,
    shadow = 0,
    box = true,
    boxColor = '&H00000000',
    boxPadding = 10,
    customX,
    customY,
    animation = 'fade',
    preset
  } = options;

  const format = [
    'Layer', 'Start', 'End', 'Style', 'Name',
    'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'
  ];

  // TikTok-safe preset positions
  let x = 720; // center X
  let y = 960; // center Y
  if (preset === 'top-safe') y = 960 - 650;
  else if (preset === 'bottom-safe') y = 960 + 350;
  else if (preset === 'center') y = 960;

  // override with custom coordinates if provided
  if (typeof customX === 'number') x += customX;
  if (typeof customY === 'number') y -= customY;

  const posTag = `\\pos(${x},${y})`;
  const boxTag = box ? `\\bord${boxPadding}\\shad0\\1c${boxColor}` : '';

  const styles = `
[Script Info]
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1440
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, 
        ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, 
        Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H00000000,-1,0,0,0,
        100,100,${lineSpacing},0,1,${outlineWidth},${shadow},5,10,10,10,1

[Events]
Format: ${format.join(', ')}
`;

  const lines = events.map((e, i) => {
    const start = secondsToAssTime(e.start);
    const end = secondsToAssTime(e.end);
    let text = e.text;

    // line-by-line animation (optional word-level granularity)
    if (animation === 'word') {
      text = text.split(' ').map(word => `{\\fad(150,0)}${word}`).join(' ');
    } else if (animation === 'typewriter') {
      text = text.split('').map(char => `{\\k5}${char}`).join('');
    } else if (animation === 'bounce') {
      text = `{\\move(${x},${y},${x},${y - 20})}${text}`;
    }

    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{${posTag}${boxTag}}${text}`;
  });

  return styles + lines.join('\n');
}

function secondsToAssTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(1, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  const cs = String(Math.floor((sec % 1) * 100)).padStart(2, '0');
  return `${h}:${m}:${s}.${cs}`;
}
