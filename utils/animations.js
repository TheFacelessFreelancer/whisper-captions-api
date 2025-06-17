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
// BOUNCE ANIMATION (4-PHASE SPRING ENTRY)
// ────────────────────────────────────────────────
/**
 * Description:
 *   Simulates a springy bounce from below with elastic easing.
 *   Text starts squashed vertically, overshoots upward, rebounds,
 *   and settles smoothly at full size.
 *   Includes a soft fade-in for smoother appearance.
 *
 * ASS Tag Logic:
 *   {\alpha&HFF&\t(0,150,\fscy50)\t(150,300,\fscy115)\t(300,450,\fscy90)\t(450,600,\fscy100)\t(0,100,\alpha&H00&)}
 */
function bounceAnimation() {
  return `{\\alpha&HFF&\\t(0,150,\\fscy50)\\t(150,300,\\fscy115)\\t(300,450,\\fscy90)\\t(450,600,\\fscy100)\\t(0,100,\\alpha&H00&)}`;
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
    case 'rise':
      return riseAnimation();
    case 'baseline':
      return bacelineAnimation();
    default:
      return '';
  }
}
