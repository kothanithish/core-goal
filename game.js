// ==========================================
// PONG GAME - AI DIFFICULTY & MODES
// ==========================================

// Canvas and 2D context setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements - Game Over
const gameOverScreen = document.getElementById('gameOverScreen');
const winnerTextEl = document.getElementById('winnerText');
const restartBtn = document.getElementById('restartBtn');
const gameOverMenuBtn = document.getElementById('gameOverMenuBtn');

// UI elements - Main Menu & Settings
const mainMenu = document.getElementById('mainMenu');
const openMenuBtn = document.getElementById('openMenuBtn');
const startGameBtn = document.getElementById('startGameBtn');
const pauseBtn = document.getElementById('pauseBtn');

// Menu Mode Buttons
const menuMode2P = document.getElementById('menuMode2P');
const menuModeAI = document.getElementById('menuModeAI');

// Menu Settings Buttons
const menuSpeedSlow = document.getElementById('menuSpeedSlow');
const menuSpeedNormal = document.getElementById('menuSpeedNormal');
const menuSpeedFast = document.getElementById('menuSpeedFast');

const menuDiffGroup = document.getElementById('menuDiffGroup');
const menuDiffEasy = document.getElementById('menuDiffEasy');
const menuDiffNormal = document.getElementById('menuDiffNormal');
const menuDiffHard = document.getElementById('menuDiffHard');

const menuSoundOn = document.getElementById('menuSoundOn');
const menuSoundOff = document.getElementById('menuSoundOff');
const soundToggleBtn = document.getElementById('soundToggleBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const gameContainer = document.querySelector('.game-container');

// Status Bar Elements
const statusMode = document.getElementById('statusMode');
const statusSpeed = document.getElementById('statusSpeed');

// Active Game Settings
let currentMode = '2player';        // '2player' or 'ai'
let currentDifficulty = 'normal';   // 'easy', 'normal', 'hard'
let currentBallSpeed = 'normal';    // 'slow', 'normal', 'fast'
let soundEnabled = true;            // Sound On / Off
let isPaused = false;               // Pause/Resume state
let isMenuOpen = true;              // Menu state (open on initial startup)

// Pending settings inside the Main Menu
let pendingMode = '2player';
let pendingDifficulty = 'normal';
let pendingBallSpeed = 'normal';
let pendingSound = true;

// Web Audio API for retro 8-bit sound effects (100% offline, zero external dependencies)
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Play a subtle synthetic 8-bit tone using HTML5 Web Audio API (100% offline)
 */
function playTone(freq = 440, type = 'square', duration = 0.05, peakGain = 0.07) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(peakGain, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Autoplay restrictions before user gesture
  }
}

// 1. Ball hitting a paddle
function playPaddleSound() {
  playTone(460, 'square', 0.05, 0.07);
}

// 2. Ball hitting a wall
function playWallSound() {
  playTone(280, 'square', 0.04, 0.06);
}

// 3. Player scoring
function playScoreSound() {
  playTone(260, 'triangle', 0.12, 0.08);
  setTimeout(() => {
    if (soundEnabled) playTone(196, 'triangle', 0.15, 0.08);
  }, 90);
}

// 4. Game countdown
function playCountdownStepSound() {
  playTone(440, 'sine', 0.07, 0.07);
}

function playCountdownGoSound() {
  playTone(880, 'sine', 0.14, 0.09);
}

// 5. Winning the game (subtle ascending victory fanfare: C5, E5, G5, C6)
function playWinSound() {
  if (!soundEnabled) return;
  const fanfareNotes = [523.25, 659.25, 783.99, 1046.50];
  fanfareNotes.forEach((freq, idx) => {
    setTimeout(() => {
      if (soundEnabled) {
        playTone(freq, 'triangle', 0.14, 0.08);
      }
    }, idx * 100);
  });
}

// Countdown configuration (3 -> 2 -> 1 -> GO!)
const COUNTDOWN_NUM_DURATION = 650; // ms for each number (3, 2, 1)
const COUNTDOWN_GO_DURATION = 400;  // ms for "GO!"
const COUNTDOWN_TOTAL_DURATION = COUNTDOWN_NUM_DURATION * 3 + COUNTDOWN_GO_DURATION; // 2350ms total
let isCountingDown = false;
let countdownTimeLeft = 0;
let lastSoundStep = null;

/**
 * Start or restart the round countdown
 */
function startCountdown() {
  isCountingDown = true;
  countdownTimeLeft = COUNTDOWN_TOTAL_DURATION;
  lastSoundStep = null;
  // Clear key states so paddles remain completely still
  keys.w = false;
  keys.s = false;
  keys.ArrowUp = false;
  keys.ArrowDown = false;
}

// Ball Speed Configurations
// - SLOW: 5 pixels per frame
// - NORMAL: 8 pixels per frame
// - FAST: 12 pixels per frame
const BALL_SPEED_CONFIGS = {
  slow: { vx: 5.0, vy: 4.0 },
  normal: { vx: 8.0, vy: 6.0 },
  fast: { vx: 12.0, vy: 9.0 }
};

// Rally Ball Acceleration Configuration
// - Increases speed slightly (+5%) on each paddle hit during a rally
// - Caps maximum speed at 1.6x of the starting speed to keep gameplay playable
const BALL_ACCELERATION_FACTOR = 1.05;
const MAX_SPEED_MULTIPLIER = 1.6;

// Maximum bounce angle in radians (50 degrees)
const MAX_BOUNCE_ANGLE = (50 * Math.PI) / 180;
let lastHitPaddle = null; // Prevents repeated collisions on the same paddle

/**
 * Handle ball collision with a paddle:
 * - Near center: bounces mostly horizontally (angle near 0)
 * - Near top/bottom: changes vertical angle strongly (up to +/- 50 deg)
 * - Gradually accelerates speed (+5%) bounded by max speed cap
 * - Immediately repositions ball outside paddle to bounce away cleanly
 * - Sets lastHitPaddle to prevent repeated collision detection
 */
function handlePaddleCollision(paddle, isLeftPaddle) {
  lastHitPaddle = isLeftPaddle ? 'player1' : 'player2';

  // Calculate hit offset relative to paddle center (-1 = top edge, 0 = center, +1 = bottom edge)
  const paddleCenterY = paddle.y + paddle.height / 2;
  const rawOffset = (ball.y - paddleCenterY) / (paddle.height / 2);
  const hitOffset = Math.max(-1, Math.min(1, rawOffset));

  // Determine bounce angle: center hit is ~0, top/bottom approaches +/- MAX_BOUNCE_ANGLE
  const bounceAngle = hitOffset * MAX_BOUNCE_ANGLE;

  // Calculate current speed magnitude and apply gradual rally acceleration
  const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const baseSpeed = BALL_SPEED_CONFIGS[currentBallSpeed];
  const baseMagnitude = Math.sqrt(baseSpeed.vx * baseSpeed.vx + baseSpeed.vy * baseSpeed.vy);
  const maxSpeed = baseMagnitude * MAX_SPEED_MULTIPLIER;

  // Accelerate speed slightly (+5%), bounded by max speed cap
  const newSpeed = Math.min(maxSpeed, currentSpeed * BALL_ACCELERATION_FACTOR);

  // Set directional velocities immediately away from the paddle
  // Left paddle bounces right (vx > 0), right paddle bounces left (vx < 0)
  const direction = isLeftPaddle ? 1 : -1;
  ball.vx = direction * newSpeed * Math.cos(bounceAngle);
  ball.vy = newSpeed * Math.sin(bounceAngle);

  // Reposition ball outside paddle to bounce away immediately and prevent sticking
  if (isLeftPaddle) {
    ball.x = paddle.x + paddle.width + ball.radius + 1;
  } else {
    ball.x = paddle.x - ball.radius - 1;
  }

  // Play retro paddle hit sound
  playPaddleSound();
}

// AI Difficulty Configurations
// - Uses simple position-based logic (ball.y relative to paddle center)
// - Easy: slow speed, slower reaction (reacts late), larger error margin
// - Normal: moderate speed, moderate reaction
// - Hard: faster speed, quicker reaction, smaller error margin (strictly capped and beatable)
const AI_DIFFICULTY_CONFIGS = {
  easy: {
    speedMultiplier: 0.55,
    reactionX: 0.60, // Reacts only when ball is past 60% of the court
    deadband: 32,    // Allows generous margin of error
    maxSpeed: 4.5    // Strictly capped max speed
  },
  normal: {
    speedMultiplier: 0.80,
    reactionX: 0.40, // Reacts once ball crosses 40% of the court
    deadband: 16,
    maxSpeed: 7.5
  },
  hard: {
    speedMultiplier: 1.10,
    reactionX: 0.15, // Quicker reaction as soon as ball heads toward AI
    deadband: 6,
    maxSpeed: 9.8    // Fast enough to track 12px ball while remaining beatable
  }
};

// Score and match rules
const WINNING_SCORE = 5;
let player1Score = 0;
let player2Score = 0;
let gameOver = false;
let winnerText = '';

// Paddle dimensions & movement speed
const paddleWidth = 14;
const paddleHeight = 90;
const paddleSpeed = 6;

// Left paddle (Player 1)
const player1 = {
  x: 25,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: '#ffffff'
};

// Right paddle (Player 2 / AI)
const player2 = {
  x: canvas.width - 25 - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: '#ffffff'
};

// Circular ball
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 8,
  vx: BALL_SPEED_CONFIGS.normal.vx,
  vy: BALL_SPEED_CONFIGS.normal.vy,
  color: '#ffffff'
};

// Keyboard input state
const keys = {
  w: false,
  s: false,
  ArrowUp: false,
  ArrowDown: false
};

// Track key presses
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W') {
    keys.w = true;
  }
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
    keys.s = true;
  }
  if (e.code === 'ArrowUp' || e.key === 'ArrowUp') {
    keys.ArrowUp = true;
    e.preventDefault();
  }
  if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
    keys.ArrowDown = true;
    e.preventDefault();
  }
  if (e.code === 'Space' || e.key === ' ') {
    if (gameOver) {
      restartGame();
      e.preventDefault();
    }
  }
  if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
    togglePause();
  }
  if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F') {
    toggleFullscreen();
  }
});

// Track key releases
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.key === 'w' || e.key === 'W') {
    keys.w = false;
  }
  if (e.code === 'KeyS' || e.key === 's' || e.key === 'S') {
    keys.s = false;
  }
  if (e.code === 'ArrowUp' || e.key === 'ArrowUp') {
    keys.ArrowUp = false;
    e.preventDefault();
  }
  if (e.code === 'ArrowDown' || e.key === 'ArrowDown') {
    keys.ArrowDown = false;
    e.preventDefault();
  }
});

// Reset key states if tab loses focus
window.addEventListener('blur', () => {
  keys.w = false;
  keys.s = false;
  keys.ArrowUp = false;
  keys.ArrowDown = false;
});

// ==========================================
// DESKTOP FULLSCREEN MANAGEMENT
// ==========================================

/**
 * Check whether fullscreen mode is currently active
 */
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Toggle Fullscreen mode on/off
 */
function toggleFullscreen() {
  if (!isFullscreen()) {
    const el = gameContainer;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/**
 * Synchronize Fullscreen UI state and button text
 */
function updateFullscreenUI() {
  const active = isFullscreen();
  gameContainer.classList.toggle('fullscreen-mode', active);
  if (fullscreenBtn) {
    fullscreenBtn.textContent = active ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
    fullscreenBtn.classList.toggle('active-fullscreen', active);
  }
}

// Fullscreen change event listeners
document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
document.addEventListener('mozfullscreenchange', updateFullscreenUI);
document.addEventListener('MSFullscreenChange', updateFullscreenUI);

/**
 * Toggle game pause state
 */
function togglePause() {
  // Pause has no effect if game is over or menu is open
  if (gameOver || isMenuOpen) return;

  isPaused = !isPaused;
  if (isPaused) {
    pauseBtn.textContent = 'RESUME';
    pauseBtn.classList.add('paused');
    // Clear keyboard input so paddles do not move while paused
    keys.w = false;
    keys.s = false;
    keys.ArrowUp = false;
    keys.ArrowDown = false;
  } else {
    pauseBtn.textContent = 'PAUSE';
    pauseBtn.classList.remove('paused');
  }
}

// Hook pause button click
pauseBtn.addEventListener('click', togglePause);

/**
 * Update the status badge in the top toolbar
 */
function updateStatusBadge() {
  const modeText = currentMode === 'ai'
    ? `VS AI (${currentDifficulty.toUpperCase()})`
    : '2 PLAYER';
  statusMode.textContent = modeText;
  statusSpeed.textContent = `SPEED: ${currentBallSpeed.toUpperCase()}`;
  if (soundToggleBtn) {
    soundToggleBtn.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
    soundToggleBtn.classList.toggle('muted', !soundEnabled);
  }
}

/**
 * Update the active buttons in the Main Menu
 */
function updateMenuUI() {
  // Mode selection
  menuMode2P.classList.toggle('active', pendingMode === '2player');
  menuModeAI.classList.toggle('active', pendingMode === 'ai');

  // Show AI Difficulty only when VS AI is selected
  menuDiffGroup.classList.toggle('hidden', pendingMode !== 'ai');

  // Ball Speed
  menuSpeedSlow.classList.toggle('active', pendingBallSpeed === 'slow');
  menuSpeedNormal.classList.toggle('active', pendingBallSpeed === 'normal');
  menuSpeedFast.classList.toggle('active', pendingBallSpeed === 'fast');

  // AI Difficulty
  menuDiffEasy.classList.toggle('active', pendingDifficulty === 'easy');
  menuDiffNormal.classList.toggle('active', pendingDifficulty === 'normal');
  menuDiffHard.classList.toggle('active', pendingDifficulty === 'hard');

  // Sound
  menuSoundOn.classList.toggle('active', pendingSound === true);
  menuSoundOff.classList.toggle('active', pendingSound === false);
}

/**
 * Open the main menu overlay
 */
function openMenu() {
  isMenuOpen = true;
  mainMenu.classList.remove('hidden');

  // Sync pending settings with current applied values
  pendingMode = currentMode;
  pendingBallSpeed = currentBallSpeed;
  pendingDifficulty = currentDifficulty;
  pendingSound = soundEnabled;

  updateMenuUI();
}

/**
 * Close menu and apply settings when starting the next game
 */
function closeMenuAndStart() {
  initAudio();

  // Apply selected settings to the new game
  currentMode = pendingMode;
  currentBallSpeed = pendingBallSpeed;
  currentDifficulty = pendingDifficulty;
  soundEnabled = pendingSound;

  updateStatusBadge();

  mainMenu.classList.add('hidden');
  isMenuOpen = false;

  restartGame();
}

/**
 * Reset the ball to center and serve toward the player who conceded
 */
function resetBall() {
  const currentSpeed = BALL_SPEED_CONFIGS[currentBallSpeed];
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  // Reverse horizontal direction to serve towards conceding player
  ball.vx = (ball.vx > 0 ? -1 : 1) * currentSpeed.vx;
  // Retain vertical direction with active speed preset
  ball.vy = (ball.vy > 0 ? 1 : -1) * currentSpeed.vy;
  // Clear last hit paddle state
  lastHitPaddle = null;
  // Start countdown before the next round begins
  startCountdown();
}

/**
 * Reset scores, paddles, ball, and start a fresh match
 */
function restartGame() {
  player1Score = 0;
  player2Score = 0;
  gameOver = false;
  winnerText = '';

  // Reset pause state on match restart
  isPaused = false;
  pauseBtn.textContent = 'PAUSE';
  pauseBtn.classList.remove('paused');

  // Clear last hit paddle state
  lastHitPaddle = null;

  // Hide game over overlay
  gameOverScreen.classList.add('hidden');

  // Center paddles
  player1.y = canvas.height / 2 - paddleHeight / 2;
  player2.y = canvas.height / 2 - paddleHeight / 2;

  // Clear inputs
  keys.w = false;
  keys.s = false;
  keys.ArrowUp = false;
  keys.ArrowDown = false;

  // Reset ball position and apply current speed configuration
  const currentSpeed = BALL_SPEED_CONFIGS[currentBallSpeed];
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = currentSpeed.vx;
  ball.vy = currentSpeed.vy;

  // Start round countdown
  startCountdown();
}

/**
 * Trigger game-over state and show winner screen
 */
function endGame(winner) {
  gameOver = true;
  winnerText = winner;
  winnerTextEl.textContent = winner;
  gameOverScreen.classList.remove('hidden');

  // Cancel countdown and pause states on game over
  isCountingDown = false;
  countdownTimeLeft = 0;
  isPaused = false;
  lastHitPaddle = null;
  pauseBtn.textContent = 'PAUSE';
  pauseBtn.classList.remove('paused');

  // Keep ball parked at center during game-over
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  // Play retro victory fanfare
  playWinSound();
}

// Hook restart button
restartBtn.addEventListener('click', restartGame);

/**
 * AI Opponent Update Logic
 * Uses simple position-based tracking with difficulty thresholds and speed caps.
 */
function updateAI() {
  const config = AI_DIFFICULTY_CONFIGS[currentDifficulty];
  const activeBallSpeed = Math.abs(ball.vx);
  // Scale AI speed with current ball speed while enforcing the difficulty's maximum speed cap
  const aiSpeed = Math.min(config.maxSpeed, activeBallSpeed * config.speedMultiplier);

  const paddleCenter = player2.y + player2.height / 2;

  // AI reacts when the ball is moving right and has crossed the reaction distance threshold
  if (ball.vx > 0 && ball.x >= canvas.width * config.reactionX) {
    const diff = ball.y - paddleCenter;

    // Deadband prevents jitter and creates realistic inaccuracy
    if (Math.abs(diff) > config.deadband) {
      if (diff > 0) {
        player2.y += aiSpeed;
      } else {
        player2.y -= aiSpeed;
      }
    }
  } else if (ball.vx < 0) {
    // When ball is moving away, AI gently repositions towards the court center
    const courtCenter = canvas.height / 2;
    const diffCenter = courtCenter - paddleCenter;
    if (Math.abs(diffCenter) > 20) {
      player2.y += (diffCenter > 0 ? 1 : -1) * (aiSpeed * 0.35);
    }
  }

  // Enforce screen boundaries for AI paddle
  if (player2.y < 0) {
    player2.y = 0;
  } else if (player2.y + player2.height > canvas.height) {
    player2.y = canvas.height - player2.height;
  }
}

/**
 * Main game physics and state updates
 */
function update(dt = 16.67) {
  // If game reached 5 points, is paused, or menu is open, stop all gameplay updates
  if (gameOver || isPaused || isMenuOpen) {
    return;
  }

  // Handle round countdown before starting play
  if (isCountingDown) {
    countdownTimeLeft -= dt;
    if (countdownTimeLeft <= 0) {
      countdownTimeLeft = 0;
      isCountingDown = false;
    }
    // Keep paddles and ball completely still during countdown
    return;
  }

  // Player 1 paddle controls (W = up, S = down)
  if (keys.w) {
    player1.y -= paddleSpeed;
  }
  if (keys.s) {
    player1.y += paddleSpeed;
  }

  // Player 1 boundary check (cannot leave screen)
  if (player1.y < 0) {
    player1.y = 0;
  } else if (player1.y + player1.height > canvas.height) {
    player1.y = canvas.height - player1.height;
  }

  // Player 2 controls: Manual arrow keys in 2-Player mode, AI logic in Play vs AI mode
  if (currentMode === '2player') {
    if (keys.ArrowUp) {
      player2.y -= paddleSpeed;
    }
    if (keys.ArrowDown) {
      player2.y += paddleSpeed;
    }

    // Manual Player 2 boundary check
    if (player2.y < 0) {
      player2.y = 0;
    } else if (player2.y + player2.height > canvas.height) {
      player2.y = canvas.height - player2.height;
    }
  } else {
    // AI controls Player 2
    updateAI();
  }

  // Record previous position for front-face collision check
  const prevBallX = ball.x;
  const currentSpeed = BALL_SPEED_CONFIGS[currentBallSpeed];

  // Continuous ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Bounce when ball reaches top or bottom boundaries
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy); // Bounce downwards
    playWallSound();
  } else if (ball.y + ball.radius >= canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.vy = -Math.abs(ball.vy); // Bounce upwards
    playWallSound();
  }

  // Paddle 1 (Left) Collision Check
  // Only collide if ball is moving left and paddle 1 wasn't just hit
  if (ball.vx < 0 && lastHitPaddle !== 'player1') {
    const p1RightEdge = player1.x + player1.width;
    const isOverlappingY = ball.y + ball.radius >= player1.y && ball.y - ball.radius <= player1.y + player1.height;
    const isAtOrPastFrontFace = ball.x - ball.radius <= p1RightEdge;
    const wasInFrontOfPaddle = prevBallX - ball.radius >= p1RightEdge - Math.abs(ball.vx);
    const isNotBehindPaddle = ball.x + ball.radius >= player1.x;

    if (isOverlappingY && isAtOrPastFrontFace && wasInFrontOfPaddle && isNotBehindPaddle) {
      handlePaddleCollision(player1, true);
    }
  }

  // Paddle 2 (Right) Collision Check
  // Only collide if ball is moving right and paddle 2 wasn't just hit
  if (ball.vx > 0 && lastHitPaddle !== 'player2') {
    const p2LeftEdge = player2.x;
    const isOverlappingY = ball.y + ball.radius >= player2.y && ball.y - ball.radius <= player2.y + player2.height;
    const isAtOrPastFrontFace = ball.x + ball.radius >= p2LeftEdge;
    const wasInFrontOfPaddle = prevBallX + ball.radius <= p2LeftEdge + Math.abs(ball.vx);
    const isNotBehindPaddle = ball.x - ball.radius <= player2.x + player2.width;

    if (isOverlappingY && isAtOrPastFrontFace && wasInFrontOfPaddle && isNotBehindPaddle) {
      handlePaddleCollision(player2, false);
    }
  }

  // Point scored: Ball passes left paddle -> Player 2 / AI gets 1 point
  if (ball.x - ball.radius <= 0) {
    player2Score++;
    playScoreSound();
    if (player2Score >= WINNING_SCORE) {
      const winnerName = currentMode === 'ai' ? 'AI Wins!' : 'Player 2 Wins!';
      endGame(winnerName);
    } else {
      resetBall();
    }
  }
  // Point scored: Ball passes right paddle -> Player 1 gets 1 point
  else if (ball.x + ball.radius >= canvas.width) {
    player1Score++;
    playScoreSound();
    if (player1Score >= WINNING_SCORE) {
      endGame('Player 1 Wins!');
    } else {
      resetBall();
    }
  }
}

/**
 * Draw the center dashed net line
 */
function drawDashedLine() {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 14]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash pattern
}

/**
 * Draw a paddle
 */
function drawPaddle(paddle) {
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

/**
 * Draw the circular ball
 */
function drawBall(b) {
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Display Player 1's score at top left and Player 2/AI's score at top right
 */
function drawScores() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px monospace';
  ctx.textAlign = 'center';

  // Player 1 score (top left)
  ctx.fillText(player1Score, canvas.width / 4, 70);

  // Player 2 / AI score (top right)
  ctx.fillText(player2Score, (3 * canvas.width) / 4, 70);

  // Subtitles for clarity
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#656c7d';
  ctx.fillText('PLAYER 1', canvas.width / 4, 94);

  const p2Label = currentMode === 'ai'
    ? `AI (${currentDifficulty.toUpperCase()})`
    : 'PLAYER 2';
  ctx.fillText(p2Label, (3 * canvas.width) / 4, 94);
}

/**
 * Render the animated countdown before a round starts (3 -> 2 -> 1 -> GO!)
 * Applies subtle scale and fade transitions in dark/neon style.
 */
function drawCountdown() {
  if (!isCountingDown) return;

  let text = '';
  let stepProgress = 0;
  let isGo = false;

  const t = countdownTimeLeft;
  const numDur = COUNTDOWN_NUM_DURATION;
  const goDur = COUNTDOWN_GO_DURATION;

  if (t > numDur * 2 + goDur) {
    // "3"
    text = '3';
    stepProgress = (COUNTDOWN_TOTAL_DURATION - t) / numDur;
  } else if (t > numDur + goDur) {
    // "2"
    text = '2';
    stepProgress = (numDur * 2 + goDur - t) / numDur;
  } else if (t > goDur) {
    // "1"
    text = '1';
    stepProgress = (numDur + goDur - t) / numDur;
  } else {
    // "GO!"
    text = 'GO!';
    isGo = true;
    stepProgress = (goDur - t) / goDur;
  }

  stepProgress = Math.max(0, Math.min(1, stepProgress));

  // Play audio tone on each new countdown step
  if (text !== lastSoundStep) {
    lastSoundStep = text;
    if (isGo) {
      playCountdownGoSound();
    } else {
      playCountdownStepSound();
    }
  }

  // Subtle scale animation: pops in slightly large (1.35x) and settles into 1.0x
  const scale = 1.35 - 0.35 * Math.min(1, stepProgress * 2.2);

  // Subtle fade animation: stays full opacity then fades out slightly in the last 25% of step
  const alpha = stepProgress > 0.75 ? (1 - stepProgress) / 0.25 : 1.0;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Dark/neon visual styling
  ctx.fillStyle = isGo ? '#3fb950' : '#58a6ff';
  ctx.shadowColor = isGo ? 'rgba(63, 185, 80, 0.85)' : 'rgba(88, 166, 255, 0.85)';
  ctx.shadowBlur = 24;
  ctx.font = isGo ? 'bold 64px monospace' : 'bold 78px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 0);

  ctx.restore();
}

/**
 * Render the main game screen
 */
function render() {
  // Dark background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Simple dashed line dividing the two players
  drawDashedLine();

  // Scores and player labels
  drawScores();

  // Left and right paddles
  drawPaddle(player1);
  drawPaddle(player2);

  // Center circular ball
  drawBall(ball);

  // Render animated countdown if active
  drawCountdown();

  // If game is paused, render a clean, small "PAUSED" text in the center
  if (isPaused) {
    ctx.save();
    ctx.fillStyle = 'rgba(12, 14, 20, 0.85)';
    ctx.fillRect(canvas.width / 2 - 55, canvas.height / 2 - 16, 110, 32);
    ctx.strokeStyle = '#388bfd';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(canvas.width / 2 - 55, canvas.height / 2 - 16, 110, 32);

    ctx.fillStyle = '#58a6ff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
}

/**
 * Setup event listeners for Main Menu, Settings, and Action buttons
 */
function setupControls() {
  // Mode selection inside Main Menu
  menuMode2P.addEventListener('click', () => {
    pendingMode = '2player';
    updateMenuUI();
  });

  menuModeAI.addEventListener('click', () => {
    pendingMode = 'ai';
    updateMenuUI();
  });

  // Ball Speed selection inside Settings
  menuSpeedSlow.addEventListener('click', () => {
    pendingBallSpeed = 'slow';
    updateMenuUI();
  });

  menuSpeedNormal.addEventListener('click', () => {
    pendingBallSpeed = 'normal';
    updateMenuUI();
  });

  menuSpeedFast.addEventListener('click', () => {
    pendingBallSpeed = 'fast';
    updateMenuUI();
  });

  // AI Difficulty selection inside Settings
  menuDiffEasy.addEventListener('click', () => {
    pendingDifficulty = 'easy';
    updateMenuUI();
  });

  menuDiffNormal.addEventListener('click', () => {
    pendingDifficulty = 'normal';
    updateMenuUI();
  });

  menuDiffHard.addEventListener('click', () => {
    pendingDifficulty = 'hard';
    updateMenuUI();
  });

  // Sound selection inside Settings
  menuSoundOn.addEventListener('click', () => {
    pendingSound = true;
    soundEnabled = true;
    updateMenuUI();
    updateStatusBadge();
    playPaddleSound();
  });

  menuSoundOff.addEventListener('click', () => {
    pendingSound = false;
    soundEnabled = false;
    updateMenuUI();
    updateStatusBadge();
  });

  // Sound toggle button in top toolbar
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      pendingSound = soundEnabled;
      updateMenuUI();
      updateStatusBadge();
      if (soundEnabled) playPaddleSound();
    });
  }

  // Fullscreen toggle button in top toolbar
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  // Start Game Button in Main Menu
  startGameBtn.addEventListener('click', closeMenuAndStart);

  // Open Settings/Menu button in top toolbar
  openMenuBtn.addEventListener('click', openMenu);

  // Return to Menu from Game Over screen
  gameOverMenuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    openMenu();
  });
}

let lastTimestamp = 0;

/**
 * Main game loop with delta-time tracking
 */
function gameLoop(timestamp = 0) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  let dt = timestamp - lastTimestamp;
  if (dt > 100) dt = 16.67;
  lastTimestamp = timestamp;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

// Initialize controls, setup status, open Main Menu on start, and launch loop
setupControls();
updateStatusBadge();
openMenu();
requestAnimationFrame(gameLoop);
