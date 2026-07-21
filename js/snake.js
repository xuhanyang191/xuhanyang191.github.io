/**
 * 贪吃蛇 🐍
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

        // 蛇: [[x,y], ...]
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

        // 键盘控制
        this.keyHandler = (e) => {
            const dirMap = {
                'ArrowUp': 'up', 'w': 'up', 'W': 'up',
                'ArrowDown': 'down', 's': 'down', 'S': 'down',
                'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
                'ArrowRight': 'right', 'd': 'right', 'D': 'right'
            };
            const dir = dirMap[e.key];
            if (dir) {
                e.preventDefault();
                this.setDirection(dir);
            }
        };
        window.addEventListener('keydown', this.keyHandler);

        this.loop(performance.now());
    }

    handleInput(dir) {
        this.setDirection(dir);
    }

    setDirection(dir) {
        const opposites = { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' };
        if (dir !== opposites[this.direction]) {
            this.nextDirection = dir;
        }
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

    update() {
        if (this.gameOver) return;

        this.direction = this.nextDirection;
        const head = [...this.snake[0]];
        switch (this.direction) {
            case 'up': head[1]--; break;
            case 'down': head[1]++; break;
            case 'left': head[0]--; break;
            case 'right': head[0]++; break;
        }

        // 撞墙检测
        if (head[0] < 0 || head[0] >= this.gridSize || head[1] < 0 || head[1] >= this.gridSize) {
            this.endGame();
            return;
        }

        // 撞自身检测
        if (this.snake.some(s => s[0] === head[0] && s[1] === head[1])) {
            this.endGame();
            return;
        }

        this.snake.unshift(head);

        // 吃食物
        if (head[0] === this.food[0] && head[1] === this.food[1]) {
            this.score += 10;
            gamesManager.updateScore(this.score);
            this.food = this.spawnFood();
        } else {
            this.snake.pop();
        }
    }

    endGame() {
        this.gameOver = true;
        this.running = false;
        window.removeEventListener('keydown', this.keyHandler);
        gamesManager.gameOver();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this.keyHandler);
    }

    draw() {
        const { ctx, canvas, cellSize, gridSize } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 网格背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制网格线
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }

        // 食物
        ctx.fillStyle = '#ff4757';
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 12;
        const fx = this.food[0] * cellSize + cellSize/2;
        const fy = this.food[1] * cellSize + cellSize/2;
        ctx.beginPath();
        ctx.arc(fx, fy, cellSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 蛇 - 身体
        this.snake.forEach((segment, i) => {
            const gradient = ctx.createRadialGradient(
                segment[0]*cellSize+2, segment[1]*cellSize+2, 1,
                segment[0]*cellSize+cellSize/2, segment[1]*cellSize+cellSize/2, cellSize/2
            );
            const ratio = 1 - (i / this.snake.length) * 0.5;
            gradient.addColorStop(0, `rgba(46, 213, 115, ${ratio})`);
            gradient.addColorStop(1, `rgba(0, 128, 55, ${ratio})`);
            ctx.fillStyle = gradient;
            ctx.shadowColor = 'rgba(46, 213, 115, 0.3)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.roundRect(segment[0]*cellSize+1, segment[1]*cellSize+1, cellSize-2, cellSize-2, 4);
            ctx.fill();
        });
        ctx.shadowBlur = 0;

        // 蛇 - 头
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
        const eyeOffset = cellSize/4;
        const eyeSize = cellSize/7;
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, cy - eyeOffset, eyeSize, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + eyeOffset, cy - eyeOffset, eyeSize, 0, Math.PI*2);
        ctx.fill();
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;

        const delta = timestamp - this.lastUpdate;
        this.lastUpdate = timestamp;
        this.tickAccumulator += delta;

        if (this.tickAccumulator >= this.updateInterval) {
            this.tickAccumulator -= this.updateInterval;
            this.update();
            // 随着分数增加加速（每50分提速10ms，最快80ms）
            const speedBoost = Math.min(Math.floor(this.score / 50) * 10, 120);
            this.updateInterval = 200 - speedBoost;
        }

        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.snake = new SnakeGame();
