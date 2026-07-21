/**
 * 打砖块 🧱
 */
class BreakoutGame {
    constructor() {
        this.running = false;
        this.keys = {};
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.score = 0;
        this.lives = 3;
        this.running = true;
        this.gameOver = false;

        const w = canvas.width;
        const h = canvas.height;

        // 挡板
        this.paddle = {
            x: w/2 - 50,
            y: h - 30,
            w: 100,
            h: 14,
            speed: 6
        };

        // 球
        this.ball = {
            x: w/2,
            y: h - 45,
            r: 8,
            dx: 4 * (Math.random() > 0.5 ? 1 : -1),
            dy: -4
        };

        // 砖块
        this.bricks = [];
        this.brickRows = 6;
        this.brickCols = 8;
        const brickW = (w - 60) / this.brickCols;
        const brickH = 22;
        const colors = ['#ff4757', '#ff6b81', '#ffa502', '#ffd200', '#2ed573', '#1e90ff'];
        for (let r = 0; r < this.brickRows; r++) {
            for (let c = 0; c < this.brickCols; c++) {
                this.bricks.push({
                    x: 30 + c * brickW,
                    y: 30 + r * (brickH + 6),
                    w: brickW - 4,
                    h: brickH,
                    color: colors[r % colors.length],
                    alive: true
                });
            }
        }

        this.keys = {};
        this.keyDownHandler = (e) => { this.keys[e.key] = true; };
        this.keyUpHandler = (e) => { this.keys[e.key] = false; };
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);

        this.loop(performance.now());
    }

    handleInput(dir) {
        if (dir === 'left') this.keys['ArrowLeft'] = true;
        else if (dir === 'right') this.keys['ArrowRight'] = true;
        else if (dir === 'stop') { this.keys['ArrowLeft'] = false; this.keys['ArrowRight'] = false; }
    }

    update() {
        if (this.gameOver) return;

        const w = this.canvas.width;

        // 挡板移动
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.paddle.x = Math.max(0, this.paddle.x - this.paddle.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.paddle.x = Math.min(w - this.paddle.w, this.paddle.x + this.paddle.speed);
        }

        // 球移动
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // 墙壁碰撞
        if (this.ball.x - this.ball.r <= 0 || this.ball.x + this.ball.r >= w) {
            this.ball.dx = -this.ball.dx;
            this.ball.x = Math.max(this.ball.r, Math.min(w - this.ball.r, this.ball.x));
        }
        if (this.ball.y - this.ball.r <= 0) {
            this.ball.dy = -this.ball.dy;
        }

        // 挡板碰撞
        if (this.ball.y + this.ball.r >= this.paddle.y &&
            this.ball.y + this.ball.r <= this.paddle.y + this.paddle.h + 4 &&
            this.ball.x >= this.paddle.x - this.ball.r &&
            this.ball.x <= this.paddle.x + this.paddle.w + this.ball.r &&
            this.ball.dy > 0) {
            this.ball.dy = -Math.abs(this.ball.dy);
            // 根据碰撞位置改变角度
            const hit = (this.ball.x - this.paddle.x) / this.paddle.w;
            this.ball.dx = (hit - 0.5) * 6;
            this.ball.y = this.paddle.y - this.ball.r;
        }

        // 砖块碰撞
        let allDead = true;
        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            allDead = false;
            if (this.ball.x + this.ball.r > brick.x &&
                this.ball.x - this.ball.r < brick.x + brick.w &&
                this.ball.y + this.ball.r > brick.y &&
                this.ball.y - this.ball.r < brick.y + brick.h) {
                brick.alive = false;
                this.score += 10;
                gamesManager.updateScore(this.score);
                // 判断碰撞方向
                const overlapX = Math.min(this.ball.x - brick.x, brick.x + brick.w - this.ball.x);
                const overlapY = Math.min(this.ball.y - brick.y, brick.y + brick.h - this.ball.y);
                if (overlapX < overlapY) {
                    this.ball.dx = -this.ball.dx;
                } else {
                    this.ball.dy = -this.ball.dy;
                }
                break;
            }
        }

        // 检查是否通关
        if (allDead) {
            this.endGame(true);
            return;
        }

        // 球掉出底部
        if (this.ball.y - this.ball.r > this.canvas.height) {
            this.lives--;
            if (this.lives <= 0) {
                this.endGame(false);
            } else {
                // 重置球
                this.ball.x = this.canvas.width / 2;
                this.ball.y = this.canvas.height - 45;
                this.ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
                this.ball.dy = -4;
            }
        }
    }

    endGame(win) {
        this.gameOver = true;
        this.running = false;
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        if (win) {
            gamesManager.updateScore(this.score + 50);
            this.score += 50;
        }
        gamesManager.gameOver();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
    }

    draw() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 砖块
        for (const brick of this.bricks) {
            if (!brick.alive) continue;
            ctx.fillStyle = brick.color;
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 3);
            ctx.fill();
            ctx.shadowBlur = 0;
            // 高光
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.roundRect(brick.x + 2, brick.y + 2, brick.w - 4, brick.h/3, 2);
            ctx.fill();
        }

        // 球
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        ctx.fill();
        // 球高光
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.ball.x - 2, this.ball.y - 2, this.ball.r/3, 0, Math.PI * 2);
        ctx.fill();

        // 挡板
        ctx.shadowColor = '#1e90ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#1e90ff';
        ctx.beginPath();
        ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 7);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.roundRect(this.paddle.x + 4, this.paddle.y + 3, this.paddle.w - 8, 4, 2);
        ctx.fill();

        // 生命数
        ctx.fillStyle = '#ff4757';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`❤️ x${this.lives}`, 10, canvas.height - 8);
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;

        this.update();
        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.breakout = new BreakoutGame();
