// utils/emojiMap.js
// Centralized emoji map and helper for Emoji Pop preset

// Approximately 100 keyword→emoji mappings
export const emojiMap = {
  boom:      '💥', explode:   '💥', blast:     '💣', crash:     '💥', bang:     '💥',
  lol:       '😂', haha:      '🤣', funny:     '😆', joke:      '😹', lmao:      '😹', rofl: '🤣',
  think:     '🤔', idea:      '💡', plan:      '🧠', thoughts:  '🧩', strategy: '📊',
  fire:      '🔥', hot:       '🥵', spicy:     '🌶️', lit:       '💯', burning:  '🚒',
  heart:     '❤️', love:      '😍', crush:     '😘', hug:       '🤗', sweet:     '🍭',
  magic:     '✨', wow:        '😲', surprise:  '🎉', shine:     '🌟', sparkle:   '💫',
  money:     '💸', rich:      '💰', paid:      '🤑', cashback:  '🏦', coins:     '🪙',
  sale:      '🛍️', shop:      '🛒', groceries: '🧺', discount:  '🏷️', basket:    '🧃',
  win:       '🏆', success:   '🚀', goal:      '🎯', score:     '📈', reward:    '🎁',
  sad:       '😢', cry:       '😭', tired:     '🥱', stress:    '😩', broke:     '😔',
  chill:     '😎', relax:     '🧘', peace:     '✌️', easy:      '👌', smooth:    '😌',
  fast:      '⚡', quick:     '🚀', instant:   '⏱️', speed:     '🏃‍♂️', rush:      '🏎️',
  boss:      '👑', queen:     '👸', king:      '🤴', legend:    '🏅', pro:        '📣',
  new:       '🆕', launch:    '🚀', update:    '🔁', build:     '🧱',
  email:     '📧', message:   '💬', inbox:     '📥', dm:        '📩', alert:     '🔔',
  clock:     '⏰', calendar:  '📅', schedule:  '🗓️', late:      '⌛', alarm:     '🚨',
  fun:       '🎈', play:      '🎮', party:     '🥳', vibe:      '🎵', laugh:     '😄',
  brain:     '🧠', spark:     '⚡', logic:     '📐', answer:    '✔️', tip:        '💡',
  verified:  '✅', official:  '📌', locked:    '🔒', safe:      '🛡️', trusted:   '🤝',
  content:   '📝', script:    '📄', caption:   '💬', format:    '🧾', code:       '💻',
  avatar:    '🧍‍♀️', voice:     '🎤', mic:       '🎙️', camera:    '🎥', video:      '📹',
  viral:     '📈', growth:    '🌱', viralhack: '🧨', boost:     '🚀', automation: '🤖'
};

/**
 * Injects the first matching emoji into the text.
 * @param {string} text - The original caption text.
 * @returns {string} Text with the first keyword replaced by word+emoji.
 */
export function injectEmojiOnce(text) {
  for (const [keyword, emoji] of Object.entries(emojiMap)) {
    const pattern = new RegExp(`\\b(${keyword})\\b`, 'i');
    if (pattern.test(text)) {
      return text.replace(pattern, `$1${emoji}`);
    }
  }
  return text;
}
