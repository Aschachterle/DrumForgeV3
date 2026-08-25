/**
 * Nozzle Chase Game - Simple Edition
 * Click when each letter finishes drawing! Just 7 clicks to win.
 */

export class NozzleGame {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    this.options = {
      width: options.width || 600,
      height: options.height || 300,
      initialSpeed: options.initialSpeed || 2.5,
      trailColor: options.trailColor || '#2563eb',
      onWin: options.onWin || null,
    };
    
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.gameState = 'idle';
    
    this.letters = [];
    this.currentLetter = 0;
    this.letterProgress = 0;
    this.position = { x: 0, y: 0 };
    this.speed = this.options.initialSpeed;
    this.score = 0;
    this.misses = 0;
    this.maxMisses = 3;
    this.trail = [];
    
    // Letter completion state
    this.waitingForClick = false;
    this.clickWindow = 0;
    this.maxClickWindow = 120; // frames to click (2 seconds at 60fps)
    
    this.init();
  }
  
  init() {
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
        <div class="nozzle-game-prompt" id="nozzlePrompt">CLICK!</div>
      </div>
      <div class="nozzle-game-message" id="nozzleMessage"></div>
      <button class="nozzle-game-btn" id="nozzleStartBtn">Start Game</button>
    `;
    
    this.container.appendChild(this.gameContainer);
    
    this.canvas = this.gameContainer.querySelector('.nozzle-game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.nozzle = this.gameContainer.querySelector('.nozzle-game-nozzle');
    this.scoreEl = this.gameContainer.querySelector('#nozzleScore');
    this.livesEl = this.gameContainer.querySelector('#nozzleLives');
    this.progressEl = this.gameContainer.querySelector('#nozzleProgress');
    this.promptEl = this.gameContainer.querySelector('#nozzlePrompt');
    this.messageEl = this.gameContainer.querySelector('#nozzleMessage');
    this.startBtn = this.gameContainer.querySelector('#nozzleStartBtn');
    this.canvasContainer = this.gameContainer.querySelector('.nozzle-game-canvas-container');
    
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvasContainer.style.width = this.options.width + 'px';
    this.canvasContainer.style.height = this.options.height + 'px';
    
    this.startBtn.addEventListener('click', () => this.start());
    this.canvasContainer.addEventListener('click', () => this.handleClick());
    this.canvasContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleClick();
    });
    
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
        user-select: none;
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
        font-size: 20px;
        letter-spacing: 6px;
        color: #444;
      }
      
      .nozzle-game-progress .done { color: #2563eb; }
      .nozzle-game-progress .active { 
        color: #22c55e; 
        text-shadow: 0 0 10px #22c55e;
        animation: letter-pulse 0.5s ease-in-out infinite;
      }
      
      @keyframes letter-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .nozzle-game-canvas-container {
        position: relative;
        background: #0f0f1a;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: box-shadow 0.2s;
      }
      
      .nozzle-game-canvas-container.clickable {
        box-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
        cursor: pointer;
      }
      
      .nozzle-game-canvas { display: block; }
      
      .nozzle-game-nozzle {
        position: absolute;
        width: 24px;
        height: 32px;
        transform: translate(-50%, -100%);
        pointer-events: none;
        filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
        transition: filter 0.2s;
      }
      
      .nozzle-game-nozzle.ready {
        filter: drop-shadow(0 0 15px #22c55e) drop-shadow(0 4px 8px rgba(0,0,0,0.5));
      }
      
      .nozzle-game-nozzle.ready .nozzle-glow {
        fill: #22c55e;
      }
      
      .nozzle-game-nozzle svg { width: 100%; height: 100%; }
      
      .nozzle-game-prompt {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        font-size: 48px;
        font-weight: 900;
        color: #22c55e;
        text-shadow: 0 0 20px #22c55e;
        pointer-events: none;
        opacity: 0;
        transition: all 0.15s;
      }
      
      .nozzle-game-prompt.show {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
        animation: prompt-bounce 0.5s ease-out infinite;
      }
      
      @keyframes prompt-bounce {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.1); }
      }
      
      .nozzle-game-prompt.success {
        color: #2563eb;
        text-shadow: 0 0 20px #2563eb;
        animation: prompt-success 0.4s ease-out forwards;
      }
      
      @keyframes prompt-success {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
      
      .nozzle-game-prompt.miss {
        color: #ef4444;
        text-shadow: 0 0 20px #ef4444;
        animation: prompt-miss 0.4s ease-out forwards;
      }
      
      @keyframes prompt-miss {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        50% { transform: translate(-50%, -60%) scale(1.2); }
        100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
      }
      
      .nozzle-game-message {
        text-align: center;
        color: #fff;
        font-size: 18px;
        font-weight: 600;
        margin-top: 12px;
        min-height: 24px;
      }
      
      .nozzle-game-message.win { color: #22c55e; }
      .nozzle-game-message.lose { color: #ef4444; }
      
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
      
      .nozzle-game-btn:hover { background: #1d4ed8; }
      .nozzle-game-btn:disabled { background: #4b5563; cursor: not-allowed; }
    `;
  }
  
  calculateLetters() {
    const w = this.options.width;
    const h = this.options.height;
    
    // Simple block letters - continuous paths per letter
    const letterPaths = {
      E: [[0,0], [0,1], [0,0], [1,0], [0,0.5], [0.8,0.5], [0,1], [1,1]],
      X: [[0,0], [1,1], [0.5,0.5], [1,0], [0,1]],
      T: [[0,0], [1,0], [0.5,0], [0.5,1]],
      R: [[0,1], [0,0], [0.8,0], [1,0.2], [0.8,0.5], [0,0.5], [0.3,0.5], [1,1]],
      U: [[0,0], [0,0.8], [0.5,1], [1,0.8], [1,0]],
      D: [[0,1], [0,0], [0.6,0], [1,0.5], [0.6,1], [0,1]],
      O: [[0.5,0], [0,0.5], [0.5,1], [1,0.5], [0.5,0]]
    };
    
    const word = 'EXTRUDO';
    const letterWidth = 0.11;
    const letterHeight = 0.55;
    const spacing = 0.015;
    const totalWidth = word.length * letterWidth + (word.length - 1) * spacing;
    const startX = (1 - totalWidth) / 2;
    const startY = (1 - letterHeight) / 2;
    
    this.letters = [];
    
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const letterX = startX + i * (letterWidth + spacing);
      const path = letterPaths[letter];
      
      const points = path.map(pt => ({
        x: (letterX + pt[0] * letterWidth) * w,
        y: (startY + pt[1] * letterHeight) * h
      }));
      
      this.letters.push({
        char: letter,
        points: points,
        length: this.getPathLength(points)
      });
    }
  }
  
  getPathLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
  }
  
  getPointOnPath(points, t) {
    const totalLength = this.getPathLength(points);
    let targetDist = t * totalLength;
    let accumulated = 0;
    
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i-1].x;
      const dy = points[i].y - points[i-1].y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      
      if (accumulated + segLen >= targetDist || i === points.length - 1) {
        const localT = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
        return {
          x: points[i-1].x + dx * Math.min(localT, 1),
          y: points[i-1].y + dy * Math.min(localT, 1)
        };
      }
      accumulated += segLen;
    }
    return { ...points[points.length - 1] };
  }
  
  start() {
    this.gameState = 'playing';
    this.currentLetter = 0;
    this.letterProgress = 0;
    this.score = 0;
    this.misses = 0;
    this.speed = this.options.initialSpeed;
    this.trail = [];
    this.waitingForClick = false;
    this.clickWindow = 0;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.calculateLetters();
    
    this.position = { ...this.letters[0].points[0] };
    
    this.updateScore();
    this.updateLives();
    this.updateProgress();
    this.messageEl.textContent = 'Click when each letter finishes!';
    this.messageEl.className = 'nozzle-game-message';
    this.startBtn.textContent = 'Restart';
    this.startBtn.disabled = true;
    this.promptEl.classList.remove('show', 'success', 'miss');
    
    this.updateNozzle();
    
    this.lastTime = performance.now();
    this.animate();
  }
  
  animate() {
    if (this.gameState !== 'playing') return;
    
    const now = performance.now();
    const delta = (now - this.lastTime) / 16.67;
    this.lastTime = now;
    
    if (this.currentLetter >= this.letters.length) {
      this.win();
      return;
    }
    
    const letter = this.letters[this.currentLetter];
    
    if (this.waitingForClick) {
      // Waiting for player to click
      this.clickWindow += delta;
      
      if (this.clickWindow > this.maxClickWindow) {
        // Ran out of time
        this.handleMiss();
      }
    } else {
      // Drawing the letter
      const moveAmount = (this.speed * delta) / letter.length;
      this.letterProgress += moveAmount;
      
      if (this.letterProgress >= 1) {
        // Finished drawing this letter - wait for click
        this.letterProgress = 1;
        this.waitingForClick = true;
        this.clickWindow = 0;
        this.showClickPrompt();
      }
      
      this.position = this.getPointOnPath(letter.points, this.letterProgress);
      this.trail.push({ ...this.position });
    }
    
    this.draw();
    this.updateNozzle();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  showClickPrompt() {
    this.canvasContainer.classList.add('clickable');
    this.nozzle.classList.add('ready');
    this.promptEl.textContent = 'CLICK!';
    this.promptEl.classList.remove('success', 'miss');
    this.promptEl.classList.add('show');
  }
  
  hideClickPrompt() {
    this.canvasContainer.classList.remove('clickable');
    this.nozzle.classList.remove('ready');
    this.promptEl.classList.remove('show');
  }
  
  handleClick() {
    if (this.gameState !== 'playing') return;
    
    if (this.waitingForClick) {
      // Correct! Player clicked at the right time
      this.promptEl.textContent = '✓';
      this.promptEl.classList.remove('show');
      this.promptEl.classList.add('success');
      
      // Score based on reaction time
      const reactionBonus = Math.max(0, 1 - (this.clickWindow / this.maxClickWindow));
      this.score += Math.round(100 + reactionBonus * 100);
      this.updateScore();
      
      this.hideClickPrompt();
      this.nextLetter();
    } else {
      // Clicked too early - penalty
      this.promptEl.textContent = 'TOO EARLY!';
      this.promptEl.classList.add('show', 'miss');
      setTimeout(() => {
        if (!this.waitingForClick) {
          this.promptEl.classList.remove('show', 'miss');
        }
      }, 500);
    }
  }
  
  handleMiss() {
    this.misses++;
    this.updateLives();
    
    this.promptEl.textContent = 'MISSED!';
    this.promptEl.classList.remove('show');
    this.promptEl.classList.add('miss');
    
    this.hideClickPrompt();
    
    if (this.misses >= this.maxMisses) {
      this.lose();
      return;
    }
    
    this.nextLetter();
  }
  
  nextLetter() {
    this.currentLetter++;
    this.letterProgress = 0;
    this.waitingForClick = false;
    this.clickWindow = 0;
    this.speed += 0.3; // Speed up each letter
    
    this.updateProgress();
    
    // Brief pause then start next letter
    if (this.currentLetter < this.letters.length) {
      this.position = { ...this.letters[this.currentLetter].points[0] };
    }
  }
  
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw completed trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.options.trailColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    
    // Draw preview of remaining letters (faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = this.currentLetter + 1; i < this.letters.length; i++) {
      const pts = this.letters[i].points;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        ctx.lineTo(pts[j].x, pts[j].y);
      }
      ctx.stroke();
    }
  }
  
  updateNozzle() {
    this.nozzle.style.left = this.position.x + 'px';
    this.nozzle.style.top = this.position.y + 'px';
  }
  
  updateScore() {
    this.scoreEl.textContent = this.score;
  }
  
  updateLives() {
    const hearts = '❤️'.repeat(Math.max(0, this.maxMisses - this.misses)) + 
                   '🖤'.repeat(Math.min(this.misses, this.maxMisses));
    this.livesEl.textContent = hearts;
  }
  
  updateProgress() {
    const word = 'EXTRUDO';
    let html = '';
    for (let i = 0; i < word.length; i++) {
      if (i < this.currentLetter) {
        html += `<span class="done">${word[i]}</span>`;
      } else if (i === this.currentLetter) {
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
    this.hideClickPrompt();
    
    this.progressEl.innerHTML = '<span class="done">EXTRUDO</span>';
    this.messageEl.textContent = `🎉 Perfect! Score: ${this.score}`;
    this.messageEl.className = 'nozzle-game-message win';
    this.startBtn.disabled = false;
    this.startBtn.textContent = 'Play Again';
    
    if (this.options.onWin) this.options.onWin(this.score);
  }
  
  lose() {
    this.gameState = 'lost';
    cancelAnimationFrame(this.animationId);
    this.hideClickPrompt();
    
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
