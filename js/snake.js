/**
 * 贪吃蛇 🐍 - 支持自动模式和暂停
 */
class SnakeGame {
    constructor() {
        this.running = false;
        this.lastUpdate = 0;
        this.updateInterval = 200;
        this.tickAccumulator = 0;
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.cellSize = Math.floor(canvas.width / 20);
        this.gridSize = Math.floor(canvas.width / this.cellSize);
        this.score = 0;
        this.autoPlay = false;

        // 蛇
        this.snake = [
            [Math.floor(this.gridSize/2), Math.floor(this.gridSize/2)],
            [Math.floor(this.gridSize/2)-1, Math.floor(this.gridSize/2)],
            [Math.floor(this.gridSize/2)-2, Math.floor(this.gridSize/2)]
        ];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.food = this.spawnFood();
        this.gameOver = false;
        this.running = true;
        this.lastUpdate = performance.now();
        this.tickAccumulator = 0;

        // 键盘
        this.keyHandler = (e) => {
            const dirMap = {
                'ArrowUp': 'up', 'w': 'up', 'W': 'up',
                'ArrowDown': 'down', 's': 'down', 'S': 'down',
                'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
                'ArrowRight': 'right', 'd': 'right', 'D': 'right'
            };
            const dir = dirMap[e.key];
            if (dir) { e.preventDefault(); this.setDirection(dir); }
            if (e.key === 'l' || e.key === 'L') {
                this.autoPlay = !this.autoPlay;
            }
        };
        window.addEventListener('keydown', this.keyHandler);

        // 自动模式指示器
        this.autoLabel = document.createElement('div');
        this.autoLabel.textContent = '🤖 AUTO';
        this.autoLabel.style.cssText = `
            position:absolute; top:50%; left:10px; transform:translateY(-50%);
            background:rgba(0,200,100,0.85); color:#fff; padding:3px 10px;
            border-radius:12px; font-size:11px; font-weight:bold;
            display:none; z-index:20; pointer-events:none;
        `;
        const container = this.canvas.parentElement;
        container.style.position = 'relative';
        container.appendChild(this.autoLabel);

        this.loop(performance.now());
    }

    handleInput(dir) { this.setDirection(dir); }

    setDirection(dir) {
        const opposites = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' };
        if (dir !== opposites[this.direction]) this.nextDirection = dir;
    }

    spawnFood() {
        let pos;
        do {
            pos = [
                Math.floor(Math.random() * this.gridSize),
                Math.floor(Math.random() * this.gridSize)
            ];
        } while (this.snake.some(s => s[0] === pos[0] && s[1] === pos[1]));
        return pos;
    }

    // ===== 自动 AI =====
    autoAI() {
        const head = this.snake[0];
        const fx = this.food[0], fy = this.food[1];
        const dirs = ['right', 'left', 'up', 'down'];
        const delta = { right: [1,0], left: [-1,0], up: [0,-1], down: [0,1] };

        // 评分方向：安全 + 靠近食物
        let bestDir = this.direction;
        let bestScore = -Infinity;

        for (const dir of dirs) {
            const [dx, dy] = delta[dir];
            const nx = head[0] + dx, ny = head[1] + dy;

            // 安全检测
            if (nx < 0 || nx >= this.gridSize || ny < 0 || ny >= this.gridSize) continue;
            if (this.snake.some(s => s[0] === nx && s[1] === ny)) continue;

            // 评分: 距离食物越近越好，优先当前方向
            let score = 0;
            const dist = Math.abs(nx - fx) + Math.abs(ny - fy);
            score += 100 - dist * 2;
            if (dir === this.direction) score += 10;
            // 避免走入死胡同
            let blocked = 0;
            for (const [ddx, ddy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const nnx = nx + ddx, nny = ny + ddy;
                if (nnx < 0 || nnx >= this.gridSize || nny < 0 || nny >= this.gridSize ||
                    this.snake.some(s => s[0] === nnx && s[1] === nny)) {
                    blocked++;
                }
            }
            if (head.length > 3 && blocked >= 3) score -= 50;

            if (score > bestScore) { bestScore = score; bestDir = dir; }
        }

        this.nextDirection = bestDir;

        // 显示状态
        this.autoLabel.style.display = 'block';
    }

    update() {
        if (this.gameOver) return;

        if (this.autoPlay) this.autoAI();

        this.direction = this.nextDirection;
        const head = [...this.snake[0]];
        switch (this.direction) {
            case 'up': head[1]--; break;
            case 'down': head[1]++; break;
            case 'left': head[0]--; break;
            case 'right': head[0]++; break;
        }

        if (head[0] < 0 || head[0] >= this.gridSize || head[1] < 0 || head[1] >= this.gridSize) {
            this.endGame(); return;
        }
        if (this.snake.some(s => s[0] === head[0] && s[1] === head[1])) {
            this.endGame(); return;
        }

        this.snake.unshift(head);

        if (head[0] === this.food[0] && head[1] === this.food[1]) {
            this.score += 10;
            gamesManager.updateScore(this.score);
            this.food = this.spawnFood();
            const speedBoost = Math.min(Math.floor(this.score / 50) * 10, 120);
            this.updateInterval = 200 - speedBoost;
        } else {
            this.snake.pop();
        }
    }

    endGame() {
        this.gameOver = true;
        this.running = false;
        window.removeEventListener('keydown', this.keyHandler);
        if (this.autoLabel && this.autoLabel.parentElement) this.autoLabel.remove();
        gamesManager.gameOver();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this.keyHandler);
        if (this.autoLabel && this.autoLabel.parentElement) this.autoLabel.remove();
    }

    draw() {
        const { ctx, canvas, cellSize, gridSize } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i <= gridSize; i++) {
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(i*cellSize, 0); ctx.lineTo(i*cellSize, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i*cellSize); ctx.lineTo(canvas.width, i*cellSize); ctx.stroke();
        }

        // 食物
        ctx.fillStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 12;
        const fx = this.food[0]*cellSize + cellSize/2;
        const fy = this.food[1]*cellSize + cellSize/2;
        ctx.beginPath(); ctx.arc(fx, fy, cellSize/2 - 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;

        // 身体
        this.snake.forEach((seg, i) => {
            const ratio = 1 - (i / this.snake.length) * 0.5;
            ctx.fillStyle = `rgba(46,213,115,${ratio})`;
            ctx.shadowColor = 'rgba(46,213,115,0.2)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.roundRect(seg[0]*cellSize+1, seg[1]*cellSize+1, cellSize-2, cellSize-2, 4);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // 头
        const head = this.snake[0];
        ctx.fillStyle = '#2ed573';
        ctx.shadowColor = '#2ed573';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(head[0]*cellSize+1, head[1]*cellSize+1, cellSize-2, cellSize-2, 5);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 眼睛
        ctx.fillStyle = '#fff';
        const cx = head[0]*cellSize + cellSize/2;
        const cy = head[1]*cellSize + cellSize/2;
        const eo = cellSize/4;
        const es = cellSize/7;
        ctx.beginPath(); ctx.arc(cx-eo, cy-eo, es, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+eo, cy-eo, es, 0, Math.PI*2); ctx.fill();
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;

        // 暂停检查
        if (gamesManager.checkPause()) {
            gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        const delta = timestamp - this.lastUpdate;
        this.lastUpdate = timestamp;
        this.tickAccumulator += delta;

        if (this.tickAccumulator >= this.updateInterval) {
            this.tickAccumulator -= this.updateInterval;
            this.update();
        }

        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.snake = new SnakeGame();
