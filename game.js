// ==========================================
// PONG GAME - REVIEWED & ROBUST VERSION
// ==========================================

// Canvas and 2D context setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI elements for game over screen
const gameOverScreen = document.getElementById('gameOverScreen');
const winnerTextEl = document.getElementById('winnerText');
const restartBtn = document.getElementById('restartBtn');

// Score and game state configuration
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

// Right paddle (Player 2)
const player2 = {
  x: canvas.width - 25 - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: '#ffffff'
};

// Ball constants and initial state
const ballSpeedX = 5;
const ballSpeedY = 4;

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 8,
  vx: ballSpeedX,
  vy: ballSpeedY,
  color: '#ffffff'
};

// Keyboard input state
const keys = {
  w: false,
  s: false,
  ArrowUp: false,
  ArrowDown: false
};

// Track key presses with code & key fallbacks
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

// Reset key states if browser tab loses focus to prevent stuck paddle movement
window.addEventListener('blur', () => {
  keys.w = false;
  keys.s = false;
  keys.ArrowUp = false;
  keys.ArrowDown = false;
});

/**
 * Reset the ball to center and serve toward the player who conceded
 */
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  // Reverse horizontal direction to serve towards conceding player
  ball.vx = -ball.vx;
  // Preserve constant vertical velocity magnitude
  ball.vy = ball.vy > 0 ? ballSpeedY : -ballSpeedY;
}

/**
 * Reset all scores, paddles, ball, and start a fresh game
 */
function restartGame() {
  player1Score = 0;
  player2Score = 0;
  gameOver = false;
  winnerText = '';

  // Hide game over overlay
  gameOverScreen.classList.add('hidden');

  // Reset paddle positions to vertical center
  player1.y = canvas.height / 2 - paddleHeight / 2;
  player2.y = canvas.height / 2 - paddleHeight / 2;

  // Reset keyboard state
  keys.w = false;
  keys.s = false;
  keys.ArrowUp = false;
  keys.ArrowDown = false;

  // Reset ball position and velocity
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.vx = ballSpeedX;
  ball.vy = ballSpeedY;
}

/**
 * Stop the game, position ball at center, and display the game-over screen
 */
function endGame(winner) {
  gameOver = true;
  winnerText = winner;
  winnerTextEl.textContent = winner;
  gameOverScreen.classList.remove('hidden');

  // Keep ball parked at center during game-over
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
}

// Hook restart button to reset the game on click
restartBtn.addEventListener('click', restartGame);

/**
 * Main game physics and state updates
 */
function update() {
  // If game reached 5 points, stop all gameplay updates
  if (gameOver) {
    return;
  }

  // Player 1 paddle controls (W = up, S = down)
  if (keys.w) {
    player1.y -= paddleSpeed;
  }
  if (keys.s) {
    player1.y += paddleSpeed;
  }

  // Player 2 paddle controls (Up Arrow = up, Down Arrow = down)
  if (keys.ArrowUp) {
    player2.y -= paddleSpeed;
  }
  if (keys.ArrowDown) {
    player2.y += paddleSpeed;
  }

  // Screen boundary check for Player 1 paddle (cannot leave screen)
  if (player1.y < 0) {
    player1.y = 0;
  } else if (player1.y + player1.height > canvas.height) {
    player1.y = canvas.height - player1.height;
  }

  // Screen boundary check for Player 2 paddle (cannot leave screen)
  if (player2.y < 0) {
    player2.y = 0;
  } else if (player2.y + player2.height > canvas.height) {
    player2.y = canvas.height - player2.height;
  }

  // Record previous position for front-face collision check
  const prevBallX = ball.x;

  // Continuous ball movement
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Bounce when ball reaches top or bottom boundaries
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy); // Bounce downwards
  } else if (ball.y + ball.radius >= canvas.height) {
    ball.y = canvas.height - ball.radius;
    ball.vy = -Math.abs(ball.vy); // Bounce upwards
  }

  // Paddle 1 (Left) Collision Check
  // Only collide if ball is moving left and approached from the front
  if (ball.vx < 0) {
    const p1RightEdge = player1.x + player1.width;
    const isOverlappingY = ball.y + ball.radius >= player1.y && ball.y - ball.radius <= player1.y + player1.height;
    const isAtOrPastFrontFace = ball.x - ball.radius <= p1RightEdge;
    const wasInFrontOfPaddle = prevBallX - ball.radius >= p1RightEdge - ballSpeedX;

    if (isOverlappingY && isAtOrPastFrontFace && wasInFrontOfPaddle) {
      // Reposition ball outside paddle to prevent getting stuck
      ball.x = p1RightEdge + ball.radius;
      ball.vx = Math.abs(ball.vx); // Bounce to the right
    }
  }

  // Paddle 2 (Right) Collision Check
  // Only collide if ball is moving right and approached from the front
  if (ball.vx > 0) {
    const p2LeftEdge = player2.x;
    const isOverlappingY = ball.y + ball.radius >= player2.y && ball.y - ball.radius <= player2.y + player2.height;
    const isAtOrPastFrontFace = ball.x + ball.radius >= p2LeftEdge;
    const wasInFrontOfPaddle = prevBallX + ball.radius <= p2LeftEdge + ballSpeedX;

    if (isOverlappingY && isAtOrPastFrontFace && wasInFrontOfPaddle) {
      // Reposition ball outside paddle to prevent getting stuck
      ball.x = p2LeftEdge - ball.radius;
      ball.vx = -Math.abs(ball.vx); // Bounce to the left
    }
  }

  // Point scored: Ball passes left paddle -> Player 2 gets 1 point
  if (ball.x - ball.radius <= 0) {
    player2Score++;
    if (player2Score >= WINNING_SCORE) {
      endGame('Player 2 Wins!');
    } else {
      resetBall();
    }
  }
  // Point scored: Ball passes right paddle -> Player 1 gets 1 point
  else if (ball.x + ball.radius >= canvas.width) {
    player1Score++;
    if (player1Score >= WINNING_SCORE) {
      endGame('Player 1 Wins!');
    } else {
      resetBall();
    }
  }
}

/**
 * Draw the simple dashed line dividing the two players
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
 * Draw a vertical rectangular paddle
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
 * Display Player 1's score at top left and Player 2's score at top right
 */
function drawScores() {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px monospace';
  ctx.textAlign = 'center';

  // Player 1 score (top left)
  ctx.fillText(player1Score, canvas.width / 4, 70);

  // Player 2 score (top right)
  ctx.fillText(player2Score, (3 * canvas.width) / 4, 70);
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

  // Scores
  drawScores();

  // Left and right paddles
  drawPaddle(player1);
  drawPaddle(player2);

  // Center circular ball
  drawBall(ball);
}

/**
 * Game loop for smooth movement and rendering
 */
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);
