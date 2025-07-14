/**
 * animations.js - Animation tag builder for ASS subtitles
 *
 * Handles:
 * - Fade
 * - Typewriter (character-by-character)
 * - Word-by-word (updated using \k karaoke tags)
 * - Fall
 * - Rise
 * - Baseline Up
 * - Baseline Down
 * - Pan Right
 * - Pan Left
 * - Hero Pop (Preset)
 * - Emoji Pop (Preset)
 * - Cinematic Fade (Preset)
 */

// ────────────────────────────────────────────────
// IMPORTS
// ────────────────────────────────────────────────
import { logInfo, logProgress, logError } from './logger.js';

// ────────────────────────────────────────────────
// FADE ANIMATION
// ────────────────────────────────────────────────
function fadeAnimation() {
  return `\\fad(300,300)`;
}

// ────────────────────────────────────────────────
// TYPEWRITER ANIMATION
// ────────────────────────────────────────────────
function typewriterAnimation(text) {
  return text
    .split('')
    .map((char, i) =>
      `{\\alpha&HFF&\\t(${i * 80},${(i + 1) * 80},\\alpha&H00&)}` + char
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
      `{\\alpha&HFF&\\t(${i * 200},${(i + 1) * 200},\\alpha&H00&)}` + word
    )
    .join(' ');
}

// ────────────────────────────────────────────────
// FALL ANIMATION
// ────────────────────────────────────────────────
function fallAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// RISE ANIMATION
// ────────────────────────────────────────────────
function riseAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// BASELINE UP ANIMATION
// ────────────────────────────────────────────────
function baselineupAnimation(clipY) {
  return `\\clip(0,${clipY},980,1920)\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

// ────────────────────────────────────────────────
// PAN LEFT ANIMATION
// ────────────────────────────────────────────────
function panleftAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// PAN RIGHT ANIMATION
// ────────────────────────────────────────────────
function panrightAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// HERO POP ANIMATION (Preset)
// ────────────────────────────────────────────────
function heroPopAnimation(text) {
  return text
    .split(' ')
    .map(word => `{\\c&H00E6FE&\\t(0,200,\\c&HFFFFFF&)}` + word)
    .join(' ');
}

// ────────────────────────────────────────────────
// EMOJI POP ANIMATION (Preset)
// ────────────────────────────────────────────────
function emojiPopAnimation(text) {
  return text
    .split(' ')
    .map((word, i) => {
      const delay = i * 100;
      return `{\\fs0\\t(${delay},${delay + 200},\\fs45)}` + word;
    })
    .join(' ');
}

// ────────────────────────────────────────────────
// CINEMATIC FADE (Preset)
// ────────────────────────────────────────────────
function cinematicFadeAnimation() {
  return '\\blur3\\fscx90\\fscy90\\t(0,200,\\blur0\\fscx100\\fscy100)';
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
// MAIN EXPORT FUNCTION
// ────────────────────────────────────────────────
export function getAnimationTags(text, type, start, end, adjustedY = null) {
  logProgress("🎞️ Building animation tag:", type);
  switch (type) {
    case 'fade':
      return fadeAnimation();
    case 'typewriter':
      return typewriterAnimation(text);
    case 'word-by-word':
      return wordByWordAnimation(text);
    case 'fall':
      return fallAnimation();
    case 'rise':
      return riseAnimation();
    case 'baselineup':
      return baselineupAnimation();
    case 'baselinedown':
      return baselinedownAnimation();
    case 'panright':
      return panrightAnimation();
    case 'panleft':
      return panleftAnimation();
    case 'hero':
      return heroPopAnimation(text);
    case 'emoji':
      return emojiPopAnimation(text);
    case 'cinematic':
      return cinematicFadeAnimation();
    default:
      logError("❌ Unknown animation type", type);
      return '';
  }
}
