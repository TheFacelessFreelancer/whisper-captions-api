/**
 * animations.js - Animation tag builder for ASS subtitles
 *
 * Handles:
 * - Fade
 * - Typewriter (character-by-character)
 * - Word-by-word
 * - Bounce
 * - Pop/**
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
    .map((char, i) => `{\\t(${i * 30},${(i + 1) * 30},\\alpha&HFF&)}` + char)
    .join('');
}

// ────────────────────────────────────────────────
// WORD-BY-WORD ANIMATION (using \k karaoke tags)
// ────────────────────────────────────────────────
function wordByWordAnimation(text, start, end) {
  const durationMs = (parseAssTime(end) - parseAssTime(start)) * 1000;
  const words = text.trim().split(/\s+/);
  const perWordMs = Math.floor(durationMs / words.length);
  const perWordK = Math.max(1, Math.round(perWordMs / 10)); // \k unit = 10ms

  return words.map(word => `{\\k${perWordK}}${word}`).join(' ');
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
