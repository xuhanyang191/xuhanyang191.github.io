/**
 * 飞机射击 🚀
 */
class ShooterGame {
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
        this.keys = {};
        this.fireCooldown = 0;

        this.player = {
            x: canvas.width / 2,
            y: canvas.height - 60,
            w: 40,
            h: 40,
            speed: 5
        };

        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 60;
        this.difficulty = 1;

        this.keyDownHandler = (e) => { this.keys[e.key] = true; };
        this.keyUpHandler = (e) => { this.keys[e.key] = false; };
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);

        // 触控/鼠标射击
        this.shootHandler = (e) => { this.shoot(); };
        canvas.addEventListener('click', this.shootHandler);

        this.loop(performance.now());
    }

    handleInput(dir) {
        if (dir === 'left') this.keys['ArrowLeft'] = true;
        else if (dir === 'right') { this.keys['ArrowRight'] = true; }
        else if (dir === 'fire') this.shoot();
    }

    shoot() {
        if (this.gameOver) return;
        this.bullets.push({
            x: this.player.x + this.player.w/2,
            y: this.player.y,
            w: 4,
            h: 12,
            speed: 8
        });
    }

    spawnEnemy() {
        const types = [
            { w: 30, h: 30, hp: 1, speed: 1.5, color: '#ff4757', score: 10 },
            { w: 25, h: 25, hp: 1, speed: 2.5, color: '#ffa502', score: 15 },
            { w: 40, h: 40, hp: 2, speed: 1, color: '#a855f7', score: 25 },
        ];
        const type = Math.random() < 0.7 ? types[0] : (Math.random() < 0.5 ? types[1] : types[2]);
        this.enemies.push({
            x: Math.random() * (this.canvas.width - type.w),
            y: -type.h,
            ...type,
            hitFlash: 0
        });
    }

    addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                dx: (Math.random() - 0.5) * 6,
                dy: (Math.random() - 0.5) * 6,
                life: 30 + Math.random() * 30,
                maxLife: 60,
                color,
                size: 2 + Math.random() * 4
            });
        }
    }

    update() {
        if (this.gameOver) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // 玩家移动
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.player.x = Math.min(w - this.player.w, this.player.x + this.player.speed);
        }
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.player.y = Math.max(0, this.player.y - this.player.speed);
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            this.player.y = Math.min(h - this.player.h, this.player.y + this.player.speed);
        }
        if (this.keys[' '] || this.keys['Space']) {
            this.fireCooldown--;
            if (this.fireCooldown <= 0) {
                this.shoot();
                this.fireCooldown = 8;
            }
        }

        // 子弹更新
        this.bullets = this.bullets.filter(b => {
            b.y -= b.speed;
            return b.y + b.h > 0;
        });

        // 敌人生成
        this.enemySpawnTimer++;
        const interval = Math.max(15, this.enemySpawnInterval - Math.floor(this.score / 50) * 2);
        if (this.enemySpawnTimer >= interval) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }

        // 敌人更新
        this.enemies = this.enemies.filter(e => {
            e.y += e.speed;
            if (e.hitFlash > 0) e.hitFlash--;
            return e.y < h + 20;
        });

        // 子弹 vs 敌人碰撞
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                if (b.x < e.x + e.w && b.x + b.w > e.x &&
                    b.y < e.y + e.h && b.y + b.h > e.y) {
                    e.hp--;
                    e.hitFlash = 8;
                    this.bullets.splice(i, 1);
                    if (e.hp <= 0) {
                        this.addParticles(e.x + e.w/2, e.y + e.h/2, e.color, 15);
                        this.score += e.score;
                        gamesManager.updateScore(this.score);
                        this.enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }

        // 玩家 vs 敌人碰撞
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (this.player.x < e.x + e.w && this.player.x + this.player.w > e.x &&
                this.player.y < e.y + e.h && this.player.y + this.player.h > e.y) {
                this.addParticles(this.player.x + this.player.w/2, this.player.y + this.player.h/2, '#ffd200', 30);
                this.endGame();
                return;
            }
        }

        // 粒子更新
        this.particles = this.particles.filter(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.life--;
            p.size *= 0.96;
            return p.life > 0;
        });
    }

    endGame() {
        this.gameOver = true;
        this.running = false;
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        this.canvas.removeEventListener('click', this.shootHandler);
        gamesManager.gameOver();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        this.canvas.removeEventListener('click', this.shootHandler);
    }

    draw() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 星空背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 星星
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 50; i++) {
            const sx = (i * 137 + 50) % canvas.width;
            const sy = ((i * 251 + performance.now() * 0.02) % canvas.height);
            ctx.fillRect(sx, sy, 2, 2);
        }

        // 粒子
        for (const p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // 子弹
        for (const b of this.bullets) {
            ctx.fillStyle = '#ffd200';
            ctx.shadowColor = '#ffd200';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(b.x - 2, b.y, 4, b.h, 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // 敌人
        for (const e of this.enemies) {
            const color = e.hitFlash > 0 ? '#fff' : e.color;
            ctx.fillStyle = color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = e.hitFlash > 0 ? 15 : 6;
            // 飞船形状
            ctx.beginPath();
            ctx.moveTo(e.x + e.w/2, e.y);
            ctx.lineTo(e.x + e.w, e.y + e.h);
            ctx.lineTo(e.x, e.y + e.h);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            // 眼睛
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(e.x + e.w/3, e.y + e.h/3, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e.x + e.w*2/3, e.y + e.h/3, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(e.x + e.w/3, e.y + e.h/3 + 1, 1.5, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e.x + e.w*2/3, e.y + e.h/3 + 1, 1.5, 0, Math.PI*2);
            ctx.fill();
        }

        // 玩家
        ctx.shadowColor = '#1e90ff';
        ctx.shadowBlur = 12;
        const px = this.player.x;
        const py = this.player.y;
        const pw = this.player.w;
        const ph = this.player.h;
        // 机身
        ctx.fillStyle = '#1e90ff';
        ctx.beginPath();
        ctx.moveTo(px + pw/2, py);
        ctx.lineTo(px + pw - 4, py + ph);
        ctx.lineTo(px + pw/2, py + ph - 8);
        ctx.lineTo(px + 4, py + ph);
        ctx.closePath();
        ctx.fill();
        // 机翼
        ctx.fillStyle = '#3742fa';
        ctx.beginPath();
        ctx.moveTo(px + pw/2 - 10, py + ph - 12);
        ctx.lineTo(px, py + ph);
        ctx.lineTo(px + pw/2 - 4, py + ph - 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px + pw/2 + 10, py + ph - 12);
        ctx.lineTo(px + pw, py + ph);
        ctx.lineTo(px + pw/2 + 4, py + ph - 6);
        ctx.closePath();
        ctx.fill();
        // 驾驶舱
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(px + pw/2, py + 10, 8, 0, Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;
        if (gamesManager.checkPause()) { gamesManager.animationId = requestAnimationFrame((t) => this.loop(t)); return; }

        this.update();
        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.shooter = new ShooterGame();
