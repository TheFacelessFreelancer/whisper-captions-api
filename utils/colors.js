// utils/colors.js

export function hexToASS(hex, opacityPercent = 100) {
  opacityPercent = typeof opacityPercent === 'number' && !isNaN(opacityPercent)
    ? opacityPercent
    : 100;

  const match = hex.match(/^#?([a-f\d]{6})$/i);
  if (!match) return "&H00000000";

  const rgb = match[1];
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);

  // Convert opacity (0–100) to ASS Alpha (00–FF, reversed scale)
  const alphaDecimal = Math.round((100 - opacityPercent) * 2.55);
  const alpha = alphaDecimal.toString(16).padStart(2, '0').toUpperCase();

  return `&H${alpha}${b}${g}${r}`; // NOTE: ASS uses BBGGRR
}
