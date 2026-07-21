/**
 * 乒乓球 🏓 - 与 AI 对战
 */
class PongGame {
    constructor() {
        this.running = false;
        this.keys = {};
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.score = 0;
        this.running = true;
        this.gameOver = false;

        const w = canvas.width;
        const h = canvas.height;

        this.paddleW = 12;
        this.paddleH = 80;
        this.ai = {
            x: w - 20,
            y: h/2 - this.paddleH/2,
            score: 0
        };
        this.player = {
            x: 8,
            y: h/2 - this.paddleH/2,
            score: 0,
            speed: 5
        };

        this.ball = {
            x: w/2,
            y: h/2,
            r: 8,
            dx: 5 * (Math.random() > 0.5 ? 1 : -1),
            dy: 5 * (Math.random() > 0.5 ? 1 : -1),
            speed: 5
        };

        this.ai.missTimer = 0;
        this.ai.targetY = h/2;

        // 中线和装饰
        this.half = h;

        this.keys = {};
        this.keyDownHandler = (e) => { this.keys[e.key] = true; };
        this.keyUpHandler = (e) => { this.keys[e.key] = false; };
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);

        this.loop(performance.now());
    }

    handleInput(dir) {
        if (dir === 'left') this.keys['ArrowUp'] = true;
        else if (dir === 'right') this.keys['ArrowDown'] = true;
        else if (dir === 'stop') { this.keys['ArrowUp'] = false; this.keys['ArrowDown'] = false; }
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speed = 5;
        this.ball.dx = 5 * (Math.random() > 0.5 ? 1 : -1);
        this.ball.dy = (Math.random() - 0.5) * 6;
    }

    update() {
        if (this.gameOver) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // 玩家控制
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.player.y = Math.max(0, this.player.y - this.player.speed);
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            this.player.y = Math.min(h - this.paddleH, this.player.y + this.player.speed);
        }

        // AI 控制
        this.ai.missTimer--;
        if (this.ai.missTimer <= 0) {
            // 有概率失误
            if (Math.random() < 0.85) {
                this.ai.targetY = this.ball.y - this.paddleH/2 + (Math.random() - 0.5) * 40;
            } else {
                this.ai.targetY = h/2 + (Math.random() - 0.5) * h * 0.3;
                this.ai.missTimer = 30 + Math.random() * 60;
            }
        }
        const aiSpeed = 3.5;
        const diff = this.ai.targetY - this.ai.y;
        if (Math.abs(diff) > 5) {
            this.ai.y += Math.sign(diff) * Math.min(aiSpeed, Math.abs(diff));
        }
        this.ai.y = Math.max(0, Math.min(h - this.paddleH, this.ai.y));

        // 球移动
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // 上下墙壁碰撞
        if (this.ball.y - this.ball.r <= 0 || this.ball.y + this.ball.r >= h) {
            this.ball.dy = -this.ball.dy;
            this.ball.y = Math.max(this.ball.r, Math.min(h - this.ball.r, this.ball.y));
        }

        // 玩家挡板碰撞
        if (this.ball.x - this.ball.r <= this.player.x + this.paddleW &&
            this.ball.x + this.ball.r >= this.player.x &&
            this.ball.y >= this.player.y &&
            this.ball.y <= this.player.y + this.paddleH &&
            this.ball.dx < 0) {
            this.ball.dx = -this.ball.dx;
            const hit = (this.ball.y - this.player.y) / this.paddleH;
            this.ball.dy = (hit - 0.5) * 8;
            // 增加速度
            this.ball.speed = Math.min(12, this.ball.speed + 0.3);
            this.ball.dx = Math.sign(this.ball.dx) * this.ball.speed;
            this.ball.x = this.player.x + this.paddleW + this.ball.r;
        }

        // AI 挡板碰撞
        if (this.ball.x + this.ball.r >= this.ai.x &&
            this.ball.x - this.ball.r <= this.ai.x + this.paddleW &&
            this.ball.y >= this.ai.y &&
            this.ball.y <= this.ai.y + this.paddleH &&
            this.ball.dx > 0) {
            this.ball.dx = -this.ball.dx;
            const hit = (this.ball.y - this.ai.y) / this.paddleH;
            this.ball.dy = (hit - 0.5) * 8;
            this.ball.speed = Math.min(12, this.ball.speed + 0.3);
            this.ball.dx = Math.sign(this.ball.dx) * this.ball.speed;
            this.ball.x = this.ai.x - this.ball.r;
        }

        // 得分
        if (this.ball.x - this.ball.r <= 0) {
            this.ai.score++;
            if (this.ai.score >= 5) {
                this.endGame(false);
                return;
            }
            this.resetBall();
        } else if (this.ball.x + this.ball.r >= w) {
            this.player.score++;
            this.score = this.player.score * 50;
            gamesManager.updateScore(this.score);
            if (this.player.score >= 5) {
                this.endGame(true);
                return;
            }
            this.resetBall();
        }
    }

    endGame(win) {
        this.gameOver = true;
        this.running = false;
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        if (win) this.score += 200;
        gamesManager.updateScore(this.score);
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

        // 中线
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // 得分
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.player.score, canvas.width/2 - 40, 10);
        ctx.fillText(this.ai.score, canvas.width/2 + 40, 10);

        // 球
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 玩家挡板
        ctx.shadowColor = '#2ed573';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#2ed573';
        ctx.beginPath();
        ctx.roundRect(this.player.x, this.player.y, this.paddleW, this.paddleH, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // AI 挡板
        ctx.shadowColor = '#ff4757';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ff4757';
        ctx.beginPath();
        ctx.roundRect(this.ai.x, this.ai.y, this.paddleW, this.paddleH, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;

        this.update();
        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.pong = new PongGame();
