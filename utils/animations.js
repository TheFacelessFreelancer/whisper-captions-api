/**
 * animations.js - Animation tag builder for ASS subtitles
 *
 * Handles:
 * - Fade
 * - Typewriter (character-by-character)
 * - Word-by-word
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
    .map((char, i) => `{\\t(${i * 30},${(i + 1) * 30},\\alpha&HFF&)}` + char)
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
function bounceAnimation() {
  return `\\t(0,500,\\frz5)\\t(500,1000,\\frz0)`;
}

// ────────────────────────────────────────────────
// POP ANIMATION
// ────────────────────────────────────────────────
function popAnimation() {
  return `\\t(0,200,\\fscx130\\fscy130)\\t(200,400,\\fscx100\\fscy100)`;
}

// ────────────────────────────────────────────────
// MAIN EXPORT FUNCTION: getAnimationTags()
// ────────────────────────────────────────────────
export function getAnimationTags(text, type) {
  switch (type) {
    case 'fade':
      return fadeAnimation();
    case 'typewriter':
      return typewriterAnimation(text);
    case 'word-by-word':
      return wordByWordAnimation(text);
    case 'bounce':
      return bounceAnimation();
    case 'pop':
      return popAnimation();
    default:
      return '';
  }
}
