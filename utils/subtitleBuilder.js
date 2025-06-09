export function buildAssSubtitle(events, options) {
  const {
    fontSize,
    fontColor,
    fontName,
    outlineColor,
    outlineWidth,
    lineSpacing,
    shadow,
    animation,
    box,
    boxColor,
    boxPadding,
    customX = 540,
    customY = 960
  } = options;

  const header = `
[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${fontColor},${outlineColor},&H00000000,0,0,0,0,100,100,${lineSpacing},0,1,${outlineWidth},${shadow},5,30,30,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formattedEvents = events.map(({ start, end, text }) => {
    const startTime = formatTime(start);
    const endTime = formatTime(end);

    const animTag = animation === 'fade' ? '\\fad(200,200)' : '';
    const boxStyle = box ? `\\bord${boxPadding}\\shad0\\3c${assColor(boxColor)}` : '';
    const position = `\\pos(${customX},${customY})`;

    return `Dialogue: 0,${sta
