# Offline Pong Game

A retro-modern 2-player and AI offline Pong game built specifically for desktop and laptop computers with HTML5 Canvas, CSS, and Vanilla JavaScript.

## Desktop Features & Optimization

- **Desktop & Laptop Optimization**:
  - Automatically sizes to fit common desktop and laptop resolutions (1366×768, 1440×900, 1080p, 1440p, 4K).
  - Horizontally and vertically centered in the viewport with zero overflow scrollbars.
  - Strict **16:10 aspect ratio** (`800 / 500`) prevents stretching or distortion on any resolution.
- **Fullscreen Mode**:
  - Click the **FULLSCREEN** button or press `F` anytime to toggle full-screen immersion.
  - In fullscreen, the play area scales up proportionally while maintaining its 16:10 aspect ratio.
  - Controls toolbar with the **PAUSE**, **SOUND**, **FULLSCREEN/EXIT**, and **SETTINGS** buttons remains accessible.
  - Exit fullscreen seamlessly by clicking **EXIT FULLSCREEN**, pressing `F`, or pressing `Escape`.
- **Fluid Keyboard Controls**:
  - Full keyboard response remains active in windowed and fullscreen modes.
- **8-Bit Retro Sound Effects (100% Offline)**:
  - Paddle hit, wall bounce, scoring chime, round countdown beeps, and victory fanfare.
  - Toggled anytime in Settings or directly via the **SOUND: ON/OFF** toolbar button.
  - 100% offline Web Audio API synthesis without external audio files.
- **Main Menu & Settings Section**:
  - Game Mode: **2 PLAYER** / **VS AI**.
  - Ball Speed: **Slow** (5 px/frame), **Normal** (8 px/frame), and **Fast** (12 px/frame).
  - AI Difficulty: **Easy**, **Normal**, and **Hard**.
  - Sound: **On** or **Off**.
- **Dynamic Paddle Collision Angles**:
  - Horizontal center returns, sharp edge angles up to 50°.
- **Gradual Rally Acceleration**:
  - +5% speed increase per rally hit (up to 1.6x base speed cap).
- **Round Countdown**:
  - Animated **3 → 2 → 1 → GO!** sequence.
- **Pause / Resume**:
  - Freeze and resume without state loss.

## Controls

| Action | Key / Control |
|---|---|
| **Player 1 (Left Paddle)** | `W` (Up), `S` (Down) |
| **Player 2 (Right Paddle)** | `Up Arrow` (Up), `Down Arrow` (Down) *(in 2-Player mode)* |
| **Toggle Fullscreen** | Click **FULLSCREEN** button or press `F` |
| **Exit Fullscreen** | Click **EXIT FULLSCREEN**, press `F`, or press `Escape` |
| **Pause / Resume** | Click **PAUSE** button or press `P` |
| **Settings / Menu** | Click **SETTINGS** button |
| **Sound Toggle** | Click **SOUND: ON / OFF** |
| **Restart Game** | Click **Play Again** or press `Space` |

## Running on Localhost

Start the local development server:

```bash
python server.py
```
*(Alternatively, run `python -m http.server 3000` or double-click `start-server.bat`)*

Then open your browser to:
[http://localhost:3000](http://localhost:3000)
