# Offline Pong Game

A basic, beginner-friendly 2-player offline Pong game built with HTML5 Canvas, CSS, and Vanilla JavaScript.

## Project Structure

```text
appcraft/
├── index.html        # Game markup, scoreboard, and canvas
├── style.css         # Dark theme layout and styling
├── game.js           # Core game loop, paddle controls, and collision physics
├── server.py         # Local development server (port 3000)
├── start-server.bat  # One-click launcher for Windows
└── README.md         # Documentation
```

## How to Run on Localhost

### Command to Start Server
Run the following command in the project directory:

```bash
python server.py
```
*(Alternatively, you can run `python -m http.server 3000` or double-click `start-server.bat` on Windows)*

### Browser URL
Open your browser and navigate to:
[http://localhost:3000](http://localhost:3000)

## Game Controls

- **Player 1 (Left)**: `W` (Up), `S` (Down)
- **Player 2 (Right)**: `Up Arrow` (Up), `Down Arrow` (Down)
- **Restart**: Click the on-screen **Restart** button or press `Space`

## Rules
- First player to **5 points** wins the match.
