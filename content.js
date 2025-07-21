let canvas, ctx;
let mouse = { x: 0, y: 0 };
let last = null;
let trail = [];
let animationFrame;
let isActive = false;

function createCanvas() {
  canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = 0;
  canvas.style.left = 0;
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = 999999;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function removeCanvas() {
  if (canvas) {
    cancelAnimationFrame(animationFrame);
    document.body.removeChild(canvas);
    canvas = null;
    ctx = null;
  }
}

function draw(color, fadeRate) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI, false);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${p.alpha})`;
    ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
    ctx.shadowBlur = 15;
    ctx.fill();

    p.alpha -= fadeRate;
  }

  trail = trail.filter(p => p.alpha > 0);
  
  // Only continue animation if laser is still active
  if (isActive) {
    animationFrame = requestAnimationFrame(() => draw(color, fadeRate));
  }
}

function startLaser(config) {
  if (isActive) return;
  isActive = true;
  createCanvas();

  last = null;
  trail = [];

  document.addEventListener('mousemove', handleMouse);
  draw(config.color, config.fadeRate);
}

function stopLaser() {
  if (!isActive) return;
  isActive = false;
  document.removeEventListener('mousemove', handleMouse);
  
  // Cancel animation frame to stop drawing
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  
  removeCanvas();
  trail = [];
}

function handleMouse(e) {
  const newPoint = { x: e.clientX, y: e.clientY, alpha: 1 };

  if (last) {
    const dx = newPoint.x - last.x;
    const dy = newPoint.y - last.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.floor(dist / 4);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      trail.push({
        x: last.x + dx * t,
        y: last.y + dy * t,
        alpha: 1
      });
    }
  }

  trail.push(newPoint);
  last = newPoint;
}

// Load initial state
chrome.storage.local.get(['laserEnabled', 'laserColor', 'trailLength'], (result) => {
  if (result.laserEnabled) {
    const color = parseColor(result.laserColor || '#ff0000');
    const fadeRate = calculateFadeRate(result.trailLength || 40);
    startLaser({ color, fadeRate });
  }
});

// Listen for popup messages (FIX 1: Handle direct messages from popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    // Respond to ping to confirm content script is ready
    sendResponse({ ready: true });
    return true;
  } else if (message.type === 'TOGGLE_LASER') {
    if (message.enabled) {
      chrome.storage.local.get(['laserColor', 'trailLength'], (res) => {
        const color = parseColor(res.laserColor || '#ff0000');
        const fadeRate = calculateFadeRate(res.trailLength || 40);
        startLaser({ color, fadeRate });
      });
    } else {
      stopLaser();
    }
    sendResponse({ success: true });
  } else if (message.type === 'UPDATE_SETTINGS') {
    if (isActive) {
      const color = parseColor(message.color);
      const fadeRate = calculateFadeRate(message.trailLength);
      stopLaser();
      startLaser({ color, fadeRate });
    }
    sendResponse({ success: true });
  }
  return true;
});

// Listen for storage changes (backup method)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.laserEnabled) {
    if (changes.laserEnabled.newValue) {
      chrome.storage.local.get(['laserColor', 'trailLength'], (res) => {
        const color = parseColor(res.laserColor || '#ff0000');
        const fadeRate = calculateFadeRate(res.trailLength || 40);
        startLaser({ color, fadeRate });
      });
    } else {
      stopLaser();
    }
  }

  if (changes.laserColor || changes.trailLength) {
    if (isActive) {
      chrome.storage.local.get(['laserColor', 'trailLength'], (res) => {
        const color = parseColor(res.laserColor || '#ff0000');
        const fadeRate = calculateFadeRate(res.trailLength || 40);
        stopLaser();
        startLaser({ color, fadeRate });
      });
    }
  }
});

function parseColor(hex) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function calculateFadeRate(trailLength) {
  // Convert trail length to fade rate (longer trail = slower fade)
  return 0.8 / trailLength;
}

// FIX 2: Properly clean up when page unloads or extension is removed
window.addEventListener('beforeunload', () => {
  stopLaser();
});

// FIX 2: Listen for extension being disabled/removed
chrome.runtime.onSuspend?.addListener(() => {
  stopLaser();
});

// FIX 2: Additional cleanup for when extension context is invalidated
const checkExtensionContext = () => {
  if (chrome.runtime?.id) {
    // Extension is still active
    return;
  }
  // Extension has been removed/disabled, clean up
  stopLaser();
};

// Check every few seconds if extension is still active
setInterval(checkExtensionContext, 3000);