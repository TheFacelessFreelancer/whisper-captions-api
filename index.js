let resolvedX = 540; // default to center
let resolvedY = 960; // default to center

if (preset) {
  switch (preset) {
    case 'top-safe':
      resolvedY = 1710;
      break;
    case 'bottom-safe':
      resolvedY = 610;
      break;
    case 'center':
      resolvedY = 960;
      break;
    default:
      console.warn('⚠ Unknown preset received:', preset);
  }
} else {
  resolvedX = typeof customX === 'number' ? customX : 540;
  resolvedY = typeof customY === 'number' ? customY : 960;
}
