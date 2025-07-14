/**
 * animations.js - Animation tag builder for ASS subtitles
 *
 * Handles:
 * - Fade
 * - Typewriter (character-by-character)
 * - Word-by-word (karaoke)
 * - Fall / Rise / Baseline / Pan
 * - Preset-specific: Hero Pop, Emoji Pop, Cinematic Fade
 */

// ────────────────────────────────────────────────
// IMPORTS
// ────────────────────────────────────────────────
import { logInfo, logProgress, logError } from './logger.js';

// ────────────────────────────────────────────────
// BASIC ANIMATIONS
// ────────────────────────────────────────────────
function fadeAnimation() {
  return `\\fad(300,300)`;
}

function typewriterAnimation(text) {
  return text.split('').map((char, i) =>
    `{\\alpha&HFF&\\t(${i * 80},${(i + 1) * 80},\\alpha&H00&)}${char}`
  ).join('');
}

function wordByWordAnimation(text) {
  return text.split(' ').map((word, i) =>
    `{\\alpha&HFF&\\t(${i * 200},${(i + 1) * 200},\\alpha&H00&)}${word}`
  ).join(' ');
}

function fallAnimation() {
  return `\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

function riseAnimation() {
  return `\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

function baselineupAnimation(clipY = 900) {
  return `\\clip(0,${clipY},980,1920)\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

function panleftAnimation() {
  return `\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

function panrightAnimation() {
  return `\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

// ────────────────────────────────────────────────
// HERO POP PRESET
// ────────────────────────────────────────────────
function heroPopAnimation(text) {
  return text.split(' ').map(word =>
    `{\\c&H00E6FE&\\t(0,200,\\c&HFFFFFF&)}` + word
  ).join(' ');
}

// ────────────────────────────────────────────────
// EMOJI POP PRESET
// ────────────────────────────────────────────────
function emojiPopAnimation(text) {
  return text.split(' ').map((word, i) =>
    `{\\blur5\\alpha&HFF&\\t(${i * 150},${i * 150 + 300},\\blur0\\alpha&H00&)}${word}`
  ).join(' ');
}

// ────────────────────────────────────────────────
// CINEMATIC FADE PRESET (advanced composite)
// ────────────────────────────────────────────────
function cinematicFadeAnimation(durationMs = 2000) {
  return (
    `\\fad(300,300)` + // soft fade
    `\\blur10\\t(0,300,\\blur0)` + // blur in
    `\\fscx90\\fscy90\\t(0,${durationMs},\\fscx100\\fscy100)` + // zoom in
    `\\3c&H00E6FE&\\bord10\\shad0\\t(300,600,\\bord3\\blur0)` // left-to-right glow (simulated)
  );
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

  const durationMs = (parseAssTime(end) - parseAssTime(start)) * 1000;

  switch (type) {
    case 'fade': return fadeAnimation();
    case 'typewriter': return typewriterAnimation(text);
    case 'word-by-word': return wordByWordAnimation(text);
    case 'fall': return fallAnimation();
    case 'rise': return riseAnimation();
    case 'baselineup': return baselineupAnimation(adjustedY);
    case 'panright': return panrightAnimation();
    case 'panleft': return panleftAnimation();
    case 'hero': return heroPopAnimation(text);
    case 'emoji': return emojiPopAnimation(text);
    case 'cinematic': return cinematicFadeAnimation(durationMs);
    default:
      logError("❌ Unknown animation type", type);
      return '';
  }
}
