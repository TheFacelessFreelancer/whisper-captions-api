// utils/colors.js

export function hexToASS(hex) {
  if (!hex) return "&H00000000";
  const match = hex.match(/^#?([a-f\d]{6})$/i);
  if (!match) return "&H00000000";
  const rgb = match[1];
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  return `&H00${b}${g}${r}`;
}
