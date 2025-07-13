// utils/colors.js

export function hexToASS(hex, opacityPercent = 100) {
  // ✅ Ensure opacity is a valid number
  opacityPercent = typeof opacityPercent === 'number' && !isNaN(opacityPercent)
    ? opacityPercent
    : 100;

  // ✅ Match valid hex input
  const match = hex.match(/^#?([a-f\d]{6})$/i);
  if (!match) return "&H00000000"; // fallback: transparent black

  const rgb = match[1];
  const r = rgb.slice(0, 2); // Red
  const g = rgb.slice(2, 4); // Green
  const b = rgb.slice(4, 6); // Blue

  // ✅ Alpha in ASS is inverse (00 = solid, FF = invisible)
  const alphaDecimal = Math.round((100 - opacityPercent) * 2.55);
  const alpha = alphaDecimal.toString(16).padStart(2, '0').toUpperCase();

  // ✅ ASS format = &HAABBGGRR
  return `&H${alpha}${b}${g}${r}`;
}
