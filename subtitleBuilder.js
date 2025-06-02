export const buildASS = ({ fontName, fontSize, fontColor, position, effect }) => {
  const posMap = {
    top: '2',
    center: '5',
    bottom: '1'
  };

  return `
[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H${fontColor},&H0A000000,-1,0,0,0,100,100,0,0,1,1,0,${posMap[position]},10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
};
