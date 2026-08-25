/**
 * Nozzle Chase Game
 * A 3D printer nozzle draws the EXTRUDO logo - click at each vertex!
 * 
 * Usage:
 *   import { NozzleGame } from '/js/nozzle-game.js';
 *   const game = new NozzleGame(containerElement);
 *   game.start();
 */

export class NozzleGame {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 600,
      height: options.height || 300,
      initialSpeed: options.initialSpeed || 1.5,
      speedIncrease: options.speedIncrease || 0.08,
      cornerThreshold: options.cornerThreshold || 50,
      minLayerSize: options.minLayerSize || 40,
      nozzleSize: options.nozzleSize || 24,
      trailColor: options.trailColor || '#2563eb',
      onWin: options.onWin || null,
      onMiss: options.onMiss || null,
    };
    
    this.canvas = null;
    this.ctx = null;
    this.nozzle = null;
    this.animationId = null;
    this.gameState = 'idle'; // idle, playing, won, lost
    
    // Spiral state
    this.currentLayer = 0;
    this.currentCorner = 0;
    this.corners = [];
    this.trail = [];
    this.position = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.speed = this.options.initialSpeed;
    this.score = 0;
    this.misses = 0;
    this.maxMisses = 3;
    
    this.init();
  }
  
  init() {
    // Create game container
    this.gameContainer = document.createElement('div');
    this.gameContainer.className = 'nozzle-game';
    this.gameContainer.innerHTML = `
      <div class="nozzle-game-header">
        <div class="nozzle-game-score">Score: <span id="nozzleScore">0</span></div>
        <div class="nozzle-game-progress" id="nozzleProgress">EXTRUDO</div>
        <div class="nozzle-game-lives" id="nozzleLives">❤️❤️❤️</div>
      </div>
      <div class="nozzle-game-canvas-container">
        <canvas class="nozzle-game-canvas"></canvas>
        <div class="nozzle-game-nozzle">
          <svg viewBox="0 0 24 32" fill="none">
            <path d="M4 0h16v8l-4 4v12h-8V12L4 8V0z" fill="#666"/>
            <path d="M8 24h8v4l-4 4-4-4v-4z" fill="#444"/>
            <ellipse cx="12" cy="28" rx="2" ry="1" fill="#2563eb" class="nozzle-glow"/>
          </svg>
        </div>
        <div class="nozzle-game-click-indicator"></div>
      </div>
      <div class="nozzle-game-message" id="nozzleMessage"></div>
      <button class="nozzle-game-btn" id="nozzleStartBtn">Start Game</button>
    `;
    
    this.container.appendChild(this.gameContainer);
    
    // Get elements
    this.canvas = this.gameContainer.querySelector('.nozzle-game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.nozzle = this.gameContainer.querySelector('.nozzle-game-nozzle');
    this.scoreEl = this.gameContainer.querySelector('#nozzleScore');
    this.livesEl = this.gameContainer.querySelector('#nozzleLives');
    this.progressEl = this.gameContainer.querySelector('#nozzleProgress');
    this.messageEl = this.gameContainer.querySelector('#nozzleMessage');
    this.startBtn = this.gameContainer.querySelector('#nozzleStartBtn');
    this.clickIndicator = this.gameContainer.querySelector('.nozzle-game-click-indicator');
    this.canvasContainer = this.gameContainer.querySelector('.nozzle-game-canvas-container');
    
    // Set canvas size
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvasContainer.style.width = this.options.width + 'px';
    this.canvasContainer.style.height = this.options.height + 'px';
    
    // Event listeners
    this.startBtn.addEventListener('click', () => this.start());
    this.canvasContainer.addEventListener('click', (e) => this.handleClick(e));
    
    // Inject styles if not already present
    if (!document.querySelector('#nozzle-game-styles')) {
      const style = document.createElement('style');
      style.id = 'nozzle-game-styles';
      style.textContent = this.getStyles();
      document.head.appendChild(style);
    }
  }
  
  getStyles() {
    return `
      .nozzle-game {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #1a1a2e;
        border-radius: 16px;
        padding: 20px;
        display: inline-block;
      }
      
      .nozzle-game-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
      }
      
      .nozzle-game-progress {
        font-family: monospace;
        font-size: 18px;
        letter-spacing: 4px;
        color: #666;
      }
      
      .nozzle-game-progress .active {
        color: #22c55e;
        text-shadow: 0 0 8px #22c55e;
      }
      
      .nozzle-game-progress .done {
        color: #2563eb;
      }
      
      .nozzle-game-canvas-container {
        position: relative;
        background: #0f0f1a;
        border-radius: 8px;
        overflow: hidden;
        cursor: crosshair;
      }
      
      .nozzle-game-canvas {
        display: block;
      }
      
      .nozzle-game-nozzle {
        position: absolute;
        width: 24px;
        height: 32px;
        transform: translate(-50%, -100%);
        pointer-events: none;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
        transition: none;
      }
      
      .nozzle-game-nozzle svg {
        width: 100%;
        height: 100%;
      }
      
      .nozzle-glow {
        animation: nozzle-pulse 0.5s ease-in-out infinite;
      }
      
      @keyframes nozzle-pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
      
      .nozzle-game-click-indicator {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 3px solid #22c55e;
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
        opacity: 0;
      }
      
      .nozzle-game-click-indicator.show {
        animation: click-ring 0.4s ease-out forwards;
      }
      
      .nozzle-game-click-indicator.miss {
        border-color: #ef4444;
      }
      
      @keyframes click-ring {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
      }
      
      .nozzle-game-message {
        text-align: center;
        color: #fff;
        font-size: 18px;
        font-weight: 600;
        margin-top: 12px;
        min-height: 24px;
      }
      
      .nozzle-game-message.win {
        color: #22c55e;
      }
      
      .nozzle-game-message.lose {
        color: #ef4444;
      }
      
      .nozzle-game-btn {
        display: block;
        width: 100%;
        margin-top: 12px;
        padding: 12px 24px;
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .nozzle-game-btn:hover {
        background: #1d4ed8;
      }
      
      .nozzle-game-btn:disabled {
        background: #4b5563;
        cursor: not-allowed;
      }
      
      .nozzle-game-corner-marker {
        position: absolute;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(34, 197, 94, 0.6);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        animation: corner-pulse 1s ease-in-out infinite;
      }
      
      @keyframes corner-pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
      }
    `;
  }
  
  calculateCorners() {
    const w = this.options.width;
    const h = this.options.height;
    
    // Define "EXTRUDO" letter paths as relative points
    // Each letter is defined as an array of strokes, each stroke is an array of [x, y] points
    // Coordinates are 0-1 normalized, will be scaled to fit
    const letterPaths = {
      E: [
        [[0, 0], [0, 1]],           // left vertical
        [[0, 0], [0.6, 0]],         // top horizontal
        [[0, 0.5], [0.5, 0.5]],     // middle horizontal
        [[0, 1], [0.6, 1]]          // bottom horizontal
      ],
      X: [
        [[0, 0], [0.6, 1]],         // top-left to bottom-right
        [[0.6, 0], [0, 1]]          // top-right to bottom-left
      ],
      T: [
        [[0, 0], [0.6, 0]],         // top horizontal
        [[0.3, 0], [0.3, 1]]        // center vertical
      ],
      R: [
        [[0, 0], [0, 1]],           // left vertical
        [[0, 0], [0.4, 0]],         // top horizontal
        [[0.4, 0], [0.5, 0.15]],    // curve top
        [[0.5, 0.15], [0.5, 0.35]], // curve side
        [[0.5, 0.35], [0.4, 0.5]],  // curve bottom
        [[0.4, 0.5], [0, 0.5]],     // middle horizontal
        [[0.2, 0.5], [0.6, 1]]      // diagonal leg
      ],
      U: [
        [[0, 0], [0, 0.8]],         // left vertical
        [[0, 0.8], [0.1, 0.95]],    // left curve
        [[0.1, 0.95], [0.5, 0.95]], // bottom
        [[0.5, 0.95], [0.6, 0.8]],  // right curve
        [[0.6, 0.8], [0.6, 0]]      // right vertical
      ],
      D: [
        [[0, 0], [0, 1]],           // left vertical
        [[0, 0], [0.3, 0]],         // top horizontal
        [[0.3, 0], [0.55, 0.2]],    // top curve
        [[0.55, 0.2], [0.6, 0.5]],  // right curve top
        [[0.6, 0.5], [0.55, 0.8]],  // right curve bottom
        [[0.55, 0.8], [0.3, 1]],    // bottom curve
        [[0.3, 1], [0, 1]]          // bottom horizontal
      ],
      O: [
        [[0.3, 0], [0.1, 0.15]],    // top left curve
        [[0.1, 0.15], [0, 0.5]],    // left top
        [[0, 0.5], [0.1, 0.85]],    // left bottom
        [[0.1, 0.85], [0.3, 1]],    // bottom left curve
        [[0.3, 1], [0.5, 0.85]],    // bottom right curve
        [[0.5, 0.85], [0.6, 0.5]],  // right bottom
        [[0.6, 0.5], [0.5, 0.15]],  // right top
        [[0.5, 0.15], [0.3, 0]]     // top right curve
      ]
    };
    
    const word = 'EXTRUDO';
    const letterWidth = 0.12;   // Width of each letter as fraction of canvas
    const letterHeight = 0.6;   // Height of letters (taller = longer strokes)
    const spacing = 0.008;      // Space between letters
    const totalWidth = word.length * letterWidth + (word.length - 1) * spacing;
    const startX = (1 - totalWidth) / 2;  // Center the word
    const startY = (1 - letterHeight) / 2; // Center vertically
    
    this.corners = [];
    let pointIndex = 0;
    
    // Convert letter paths to canvas coordinates
    // Only use stroke endpoints as clickable corners, skip duplicates
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const letterX = startX + i * (letterWidth + spacing);
      const strokes = letterPaths[letter];
      
      for (const stroke of strokes) {
        // Add start point of stroke (nozzle needs to get there)
        const startPt = stroke[0];
        const x1 = (letterX + startPt[0] * letterWidth) * w;
        const y1 = (startY + startPt[1] * letterHeight) * h;
        
        // Add end point of stroke (this is the clickable corner)
        const endPt = stroke[1];
        const x2 = (letterX + endPt[0] * letterWidth) * w;
        const y2 = (startY + endPt[1] * letterHeight) * h;
        
        // Check if start point is close to last corner (skip if so)
        const lastCorner = this.corners[this.corners.length - 1];
        const minDist = 10; // Minimum distance between corners
        
        if (!lastCorner || Math.sqrt(Math.pow(x1 - lastCorner.x, 2) + Math.pow(y1 - lastCorner.y, 2)) > minDist) {
          this.corners.push({ 
            x: x1, y: y1, 
            layer: i, letter: letter,
            pointIndex: pointIndex++,
            isStart: true  // Start points don't require click
          });
        }
        
        // Always add end point (these are the real click targets)
        this.corners.push({ 
          x: x2, y: y2, 
          layer: i, letter: letter,
          pointIndex: pointIndex++,
          isStart: false
        });
      }
    }
    
    console.log('Total corners:', this.corners.length);
  }
  
  start() {
    this.gameState = 'playing';
    this.currentCorner = 0;
    this.score = 0;
    this.misses = 0;
    this.speed = this.options.initialSpeed;
    this.trail = [];           // Current segment being drawn
    this.trailSegments = [];   // Completed segments (won't be modified)
    this.isDrawing = false;    // Are we drawing (vs moving to new stroke start)?
    this.cornerClicked = false;
    this.wasNearCorner = false;
    this.enteredCornerZone = false;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Calculate spiral corners
    this.calculateCorners();
    
    // Start at first corner
    this.position = { ...this.corners[0] };
    this.currentCorner = 1;
    this.target = { ...this.corners[1] };
    
    // First target determines if we're drawing right away
    this.isDrawing = !this.target.isStart;
    this.trailSegments = [];
    
    // Update UI
    this.updateScore();
    this.updateLives();
    this.updateProgress();
    this.messageEl.textContent = 'Click when the nozzle reaches each vertex!';
    this.messageEl.className = 'nozzle-game-message';
    this.startBtn.textContent = 'Restart';
    this.startBtn.disabled = true;
    
    // Update nozzle position
    this.updateNozzlePosition();
    
    // Show first target
    this.showCornerMarker();
    
    // Start animation
    this.lastTime = performance.now();
    this.animate();
  }
  
  animate() {
    if (this.gameState !== 'playing') return;
    
    const now = performance.now();
    const delta = (now - this.lastTime) / 16.67; // Normalize to ~60fps
    this.lastTime = now;
    
    // Move toward target
    const dx = this.target.x - this.position.x;
    const dy = this.target.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Check if we're near a corner (for click detection)
    const nearCorner = dist < 60;
    if (nearCorner && !this.wasNearCorner) {
      this.enteredCornerZone = true;
    }
    this.wasNearCorner = nearCorner;
    
    if (dist > this.speed * delta) {
      // Move toward target
      this.position.x += (dx / dist) * this.speed * delta;
      this.position.y += (dy / dist) * this.speed * delta;
    } else {
      // Reached target
      this.position = { ...this.target };
      
      const currentCornerData = this.corners[this.currentCorner];
      
      // Start points auto-advance (no click required)
      if (currentCornerData && currentCornerData.isStart) {
        this.advanceToNextCorner();
      } else if (!this.cornerClicked) {
        // Player missed the click on an endpoint
        this.handleMissedCorner();
      } else {
        // Player clicked successfully, move to next
        this.advanceToNextCorner();
      }
    }
    
    // Add to trail only if we're drawing (not moving to start point)
    if (this.isDrawing) {
      this.trail.push({ ...this.position });
      if (this.trail.length > 500) this.trail.shift();
    }
    
    // Draw
    this.draw();
    
    // Update nozzle position
    this.updateNozzlePosition();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw all completed trail segments
    ctx.strokeStyle = this.options.trailColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (const segment of this.trailSegments) {
      if (segment.length > 1) {
        ctx.beginPath();
        ctx.moveTo(segment[0].x, segment[0].y);
        for (let i = 1; i < segment.length; i++) {
          ctx.lineTo(segment[i].x, segment[i].y);
        }
        ctx.stroke();
      }
    }
    
    // Draw current trail segment
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.stroke();
    }
    
    // Draw target corner indicator on canvas (skip for start points)
    if (this.currentCorner < this.corners.length) {
      const corner = this.corners[this.currentCorner];
      
      // Don't show target for start points
      if (corner.isStart) return;
      
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Check if nozzle is near this corner - show "hot zone"
      const distToCorner = Math.sqrt(
        Math.pow(this.position.x - corner.x, 2) + 
        Math.pow(this.position.y - corner.y, 2)
      );
      const progress = this.currentCorner / this.corners.length;
      const threshold = Math.max(60, 120 - progress * 60);
      if (distToCorner < threshold && !this.cornerClicked) {
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, threshold, 0, Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  
  updateNozzlePosition() {
    this.nozzle.style.left = this.position.x + 'px';
    this.nozzle.style.top = this.position.y + 'px';
    
    // Check if nozzle is in click zone (only for endpoint corners)
    if (this.currentCorner < this.corners.length) {
      const corner = this.corners[this.currentCorner];
      
      // Start points don't need click zone highlighting
      if (corner.isStart) {
        this.nozzle.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))';
        return;
      }
      
      const distToCorner = Math.sqrt(
        Math.pow(this.position.x - corner.x, 2) + 
        Math.pow(this.position.y - corner.y, 2)
      );
      const progress = this.currentCorner / this.corners.length;
      const threshold = Math.max(60, 120 - progress * 60);
      
      if (distToCorner < threshold && !this.cornerClicked) {
        this.nozzle.style.filter = 'drop-shadow(0 0 10px #22c55e) drop-shadow(0 4px 8px rgba(0,0,0,0.5))';
      } else {
        this.nozzle.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))';
      }
    }
  }
  
  showCornerMarker() {
    // Remove existing marker
    const existing = this.canvasContainer.querySelector('.nozzle-game-corner-marker');
    if (existing) existing.remove();
    
    if (this.currentCorner < this.corners.length) {
      const corner = this.corners[this.currentCorner];
      
      // Don't show marker for start points (auto-pass)
      if (corner.isStart) return;
      
      const marker = document.createElement('div');
      marker.className = 'nozzle-game-corner-marker';
      marker.style.left = corner.x + 'px';
      marker.style.top = corner.y + 'px';
      this.canvasContainer.appendChild(marker);
    }
  }
  
  handleClick(e) {
    if (this.gameState !== 'playing') return;
    
    const rect = this.canvasContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Show click indicator at click position
    this.clickIndicator.style.left = clickX + 'px';
    this.clickIndicator.style.top = clickY + 'px';
    this.clickIndicator.classList.remove('show', 'miss');
    void this.clickIndicator.offsetWidth; // Force reflow
    
    // Get current target corner
    const corner = this.corners[this.currentCorner];
    
    // Start points auto-pass, clicks are ignored
    if (corner && corner.isStart) {
      return;
    }
    
    // Check distance from nozzle to target corner
    const distToCorner = Math.sqrt(
      Math.pow(this.position.x - corner.x, 2) + 
      Math.pow(this.position.y - corner.y, 2)
    );
    
    // Generous threshold - starts at 120px, minimum 60px
    const progress = this.currentCorner / this.corners.length;
    const threshold = Math.max(60, 120 - progress * 60);
    
    console.log('Click check:', { distToCorner: distToCorner.toFixed(1), threshold, cornerClicked: this.cornerClicked });
    
    if (distToCorner < threshold && !this.cornerClicked) {
      // Success! Clicked while nozzle is near corner
      this.clickIndicator.classList.add('show');
      this.cornerClicked = true;
      
      // Bonus points for clicking closer to exact corner
      const accuracy = 1 - (distToCorner / threshold);
      this.score += Math.round((100 + accuracy * 50) * (1 + this.speed / 5));
      this.updateScore();
      
    } else {
      // Clicked too early or already clicked this corner
      this.clickIndicator.classList.add('show', 'miss');
    }
  }
  
  advanceToNextCorner() {
    this.currentCorner++;
    this.cornerClicked = false;
    this.wasNearCorner = false;
    
    if (this.currentCorner >= this.corners.length) {
      this.win();
      return;
    }
    
    // Increase speed
    this.speed += this.options.speedIncrease;
    
    // Update target
    this.target = { ...this.corners[this.currentCorner] };
    
    // Check if we're moving to a start point (pen up) or drawing (pen down)
    if (this.target.isStart) {
      // Save current trail segment if it has points
      if (this.trail.length > 1) {
        this.trailSegments.push([...this.trail]);
      }
      this.trail = [];
      this.isDrawing = false;
    } else {
      // Drawing to an endpoint
      this.isDrawing = true;
    }
    
    this.showCornerMarker();
    this.updateProgress();
  }
  
  handleMissedCorner() {
    // Player didn't click in time - nozzle passed the corner
    this.misses++;
    this.updateLives();
    
    if (this.misses >= this.maxMisses) {
      this.lose();
      return;
    }
    
    // Flash the screen red briefly
    this.canvasContainer.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.8)';
    setTimeout(() => {
      this.canvasContainer.style.boxShadow = '';
    }, 200);
    
    // Continue to next corner (reuse advanceToNextCorner logic)
    this.advanceToNextCorner();
    
    if (this.options.onMiss) {
      this.options.onMiss(this.misses);
    }
  }
  
  updateScore() {
    this.scoreEl.textContent = this.score;
  }
  
  updateLives() {
    const hearts = '❤️'.repeat(this.maxMisses - this.misses) + 
                   '🖤'.repeat(this.misses);
    this.livesEl.textContent = hearts;
  }
  
  updateProgress() {
    const word = 'EXTRUDO';
    const currentLetter = this.corners[this.currentCorner]?.letter || word[word.length - 1];
    const currentLetterIndex = word.indexOf(currentLetter);
    
    let html = '';
    for (let i = 0; i < word.length; i++) {
      if (i < currentLetterIndex) {
        html += `<span class="done">${word[i]}</span>`;
      } else if (i === currentLetterIndex) {
        html += `<span class="active">${word[i]}</span>`;
      } else {
        html += word[i];
      }
    }
    this.progressEl.innerHTML = html;
  }
  
  win() {
    this.gameState = 'won';
    cancelAnimationFrame(this.animationId);
    
    // Save final trail segment
    if (this.trail.length > 1) {
      this.trailSegments.push([...this.trail]);
    }
    this.draw(); // Redraw to show complete logo
    
    // Remove corner marker
    const marker = this.canvasContainer.querySelector('.nozzle-game-corner-marker');
    if (marker) marker.remove();
    
    // Show all letters as complete
    this.progressEl.innerHTML = '<span class="done">EXTRUDO</span>';
    
    this.messageEl.textContent = `🎉 EXTRUDO complete! Score: ${this.score}`;
    this.messageEl.className = 'nozzle-game-message win';
    this.startBtn.disabled = false;
    this.startBtn.textContent = 'Play Again';
    
    if (this.options.onWin) {
      this.options.onWin(this.score);
    }
  }
  
  lose() {
    this.gameState = 'lost';
    cancelAnimationFrame(this.animationId);
    
    // Remove corner marker
    const marker = this.canvasContainer.querySelector('.nozzle-game-corner-marker');
    if (marker) marker.remove();
    
    this.messageEl.textContent = `💀 Game Over! Score: ${this.score}`;
    this.messageEl.className = 'nozzle-game-message lose';
    this.startBtn.disabled = false;
    this.startBtn.textContent = 'Try Again';
  }
  
  destroy() {
    cancelAnimationFrame(this.animationId);
    this.gameContainer.remove();
  }
}

// Auto-init for elements with data-nozzle-game attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-nozzle-game]').forEach(el => {
    new NozzleGame(el);
  });
});
