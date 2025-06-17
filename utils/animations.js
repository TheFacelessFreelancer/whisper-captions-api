/**
 * animations.js - Animation tag builder for ASS subtitles
 *
 * Handles:
 * - Fade
 * - Typewriter (character-by-character)
 * - Word-by-word (updated using \k karaoke tags)
 * - Bounce
 * - Pop
 *
 * All animation blocks are modular and independently testable.
 */

// ────────────────────────────────────────────────
// FADE ANIMATION
// ────────────────────────────────────────────────
function fadeAnimation() {
  return `\\fad(300,300)`;
}

// ────────────────────────────────────────────────
// TYPEWRITER ANIMATION (character-by-character)
// ────────────────────────────────────────────────
function typewriterAnimation(text) {
  return text
    .split('')
    .map((char, i) =>
      `{\\alpha&HFF&\\t(${i * 80},${(i + 1) * 80},\\alpha&H00&)}${char}`
    )
    .join('');
}

// ────────────────────────────────────────────────
// WORD-BY-WORD ANIMATION
// ────────────────────────────────────────────────
function wordByWordAnimation(text) {
  return text
    .split(' ')
    .map((word, i) => 
      `{\\alpha&HFF&\\t(${i * 200},${(i + 1) * 200},\\alpha&H00&)}${word}`
    )
    .join(' ');
}

// ────────────────────────────────────────────────
// BOUNCE ANIMATION
// ────────────────────────────────────────────────
/**
 * Description:
 *   Applies a playful bounce effect using rotation and scale.
 *   The entire caption appears with a slight rotation and upscale,
 *   then bounces back to normal.
 *
 * ASS Tag Logic:
 *   \t(start1, end1, \frzX \fscxY \fscyY)
 *   \t(start2, end2, \frz0 \fscx100 \fscy100)
 */
function bounceAnimation() {
  return `{\\t(0,300,\\frz5\\fscx110\\fscy110)\\t(300,600,\\frz0\\fscx100\\fscy100)}`;
}

// ────────────────────────────────────────────────
// POP ANIMATION
// ────────────────────────────────────────────────
function popAnimation() {
  return `\\t(0,200,\\fscx130\\fscy130)\\t(200,400,\\fscx100\\fscy100)`;
}

// ────────────────────────────────────────────────
// TIME PARSER: ASS → seconds
// ────────────────────────────────────────────────
function parseAssTime(timeStr) {
  const [h, m, s] = timeStr.split(':');
  const [sec, cs] = s.split('.');
  return (
    parseInt(h) * 3600 +
    parseInt(m) * 60 +
    parseInt(sec) +
    parseInt(cs) / 100
  );
}

// ────────────────────────────────────────────────
// MAIN EXPORT FUNCTION: getAnimationTags()
// ────────────────────────────────────────────────
export function getAnimationTags(text, type, start, end) {
  switch (type) {
    case 'fade':
      return fadeAnimation();
    case 'typewriter':
      return typewriterAnimation(text);
    case 'word-by-word':
      return wordByWordAnimation(text, start, end);
    case 'bounce':
      return bounceAnimation();
    case 'pop':
      return popAnimation();
    default:
      return '';
  }
}
