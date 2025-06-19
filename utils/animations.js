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
 *
 * All animation blocks are modular and independently testable.
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
// FALL ANIMATION (One-phase drop from above)
// ────────────────────────────────────────────────
/**
 * Description:
 *   A fast fall-in animation where text fades in while dropping
 *   from 100px above its final position. Uses \move() and \alpha tags.
 *
 * ASS Tag Logic (combined with \move externally):
 *   \alpha&HFF&           ; invisible at start
 *   \t(0,100,\alpha&H00&) ; fade in over 100ms
 */
function fallAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// RISE ANIMATION (One-phase upward motion)
// ────────────────────────────────────────────────
/**
 * Description:
 *   Subtitle text rises from 100px below its final position
 *   and fades in as it ascends. It’s the exact inverse of the Fall animation.
 *
 * ASS Tag Logic:
 *   \alpha&HFF&                      ; fully transparent at start
 *   \t(0,100,\alpha&H00&)           ; fade in over 100ms
 *
 * Motion is handled via \move(...) externally in subtitleBuilder.js
 */
function riseAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// BASELINE UP ANIMATION (slide upward through a static mask)
// ────────────────────────────────────────────────
/**
 * Description:
 *   Simulates text rising up from an invisible floor.
 *   The text moves upward through a fixed vertical mask window,
 *   revealing itself from top to bottom. No scaling involved.
 *
 * ASS Tag Logic:
 *   \clip(0,900,980,1020)                ; static vertical mask
 *   \alpha&HFF&                          ; fully transparent at start
 *   \t(0,100,\alpha&H00&)               ; fade in over first 100ms
 *
 * Movement handled separately with \move(...) in subtitleBuilder.js
 */
function baselineupAnimation(clipY) {
  return `\\clip(0,${clipY},980,1920)\\alpha&HFF&\\t(0,100,\\alpha&H00&)`;
}

// ────────────────────────────────────────────────
// PAN LEFT ANIMATION (slides in from left to center)
// ────────────────────────────────────────────────
/**
 * Description:
 *   Text slides from left edge into center.
 *   Uses horizontal \move(...) motion + fade-in.
 *   Ends at adjustedX.
 *
 * Motion handled by \move() in subtitleBuilder.js.
 */
function panleftAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
}

// ────────────────────────────────────────────────
// PAN RIGHT ANIMATION (slides in from right to center)
// ────────────────────────────────────────────────
/**
 * Description:
 *   Text slides from right edge into center.
 *   Uses horizontal \move(...) motion + fade-in.
 *   Ends at adjustedX.
 *
 * Motion handled by \move() in subtitleBuilder.js.
 */
function panrightAnimation() {
  return '\\alpha&HFF&\\t(0,100,\\alpha&H00&)';
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
export function getAnimationTags(text, type, start, end, adjustedY = null) {
  logProgress("🎞️ Building animation tag:", type);
  switch (type) {
    case 'fade':
      return fadeAnimation();
    case 'typewriter':
      return typewriterAnimation(text);
    case 'word-by-word':
      return wordByWordAnimation(text, start, end);
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
    default:
       logError("❌ Unknown animation type", type);
      return '';
  }
}
