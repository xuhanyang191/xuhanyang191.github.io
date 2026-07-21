/**
 * 打地鼠 🎯
 */
class WhackAMoleGame {
    constructor() {
        this.running = false;
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.score = 0;
        this.running = true;
        this.gameOver = false;

        this.cols = 3;
        this.rows = 3;
        this.holes = [];
        this.moleTimer = 0;
        this.moleInterval = 60;
        this.gameDuration = 30000; // 30秒
        this.timeLeft = this.gameDuration;

        // 创建洞
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.holes.push({
                    x: c, y: r,
                    active: false,
                    hit: false,
                    type: 'normal', // 'normal', 'gold', 'bomb'
                    showTimer: 0
                });
            }
        }

        this.startTime = performance.now();
        this.lastTime = performance.now();

        // 点击检测
        this.clickHandler = (e) => {
            if (this.gameOver) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;

            const holeSpacingX = canvas.width / this.cols;
            const holeSpacingY = canvas.height / this.rows;

            for (const hole of this.holes) {
                if (!hole.active) continue;
                const cx = hole.x * holeSpacingX + holeSpacingX/2;
                const cy = hole.y * holeSpacingY + holeSpacingY/2 + 10;
                const radius = Math.min(holeSpacingX, holeSpacingY) * 0.25;
                const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
                if (dist < radius) {
                    this.whack(hole);
                    break;
                }
            }
        };

        canvas.addEventListener('click', this.clickHandler);

        this.loop(performance.now());
    }

    whack(hole) {
        if (!hole.active) return;
        hole.active = false;
        hole.hit = true;

        if (hole.type === 'bomb') {
            this.score = Math.max(0, this.score - 20);
        } else {
            this.score += hole.type === 'gold' ? 30 : 10;
        }
        gamesManager.updateScore(this.score);

        setTimeout(() => { hole.hit = false; }, 200);
    }

    spawnMole() {
        const inactive = this.holes.filter(h => !h.active && !h.hit);
        if (inactive.length === 0) return;

        const hole = inactive[Math.floor(Math.random() * inactive.length)];
        const rand = Math.random();
        hole.type = rand < 0.6 ? 'normal' : (rand < 0.85 ? 'gold' : 'bomb');
        hole.active = true;
        hole.showTimer = 60 + Math.random() * 80;
    }

    update(delta) {
        if (this.gameOver) return;

        this.timeLeft -= delta;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.endGame();
            return;
        }

        // 生成地鼠
        this.moleTimer += delta;
        const interval = Math.max(300, this.moleInterval - Math.floor(this.score / 50) * 50);
        if (this.moleTimer >= interval) {
            this.moleTimer = 0;
            this.spawnMole();
            // 难度越高出越多
            if (this.score > 100 && Math.random() < 0.3) this.spawnMole();
        }

        // 更新地鼠显示时间
        for (const hole of this.holes) {
            if (hole.active) {
                hole.showTimer -= delta / 16;
                if (hole.showTimer <= 0) {
                    hole.active = false;
                }
            }
        }
    }

    endGame() {
        this.gameOver = true;
        this.running = false;
        this.canvas.removeEventListener('click', this.clickHandler);
        this.draw();
        setTimeout(() => gamesManager.gameOver(), 200);
    }

    stop() {
        this.running = false;
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.clickHandler);
        }
    }

    draw() {
        const { ctx, canvas } = this;
        const w = canvas.width;
        const h = canvas.height;
        const holeSpacingX = w / this.cols;
        const holeSpacingY = h / this.rows;

        ctx.clearRect(0, 0, w, h);

        // 背景 - 草地
        ctx.fillStyle = '#1a2e1a';
        ctx.fillRect(0, 0, w, h);

        // 背景纹理
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let i = 0; i < 50; i++) {
            const gx = (i * 73 + 30) % w;
            const gy = (i * 139 + 50) % h;
            ctx.beginPath();
            ctx.arc(gx, gy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cx = c * holeSpacingX + holeSpacingX/2;
                const cy = r * holeSpacingY + holeSpacingY/2 + 10;
                const radius = Math.min(holeSpacingX, holeSpacingY) * 0.28;

                // 洞（椭圆）
                ctx.fillStyle = '#2a1a0a';
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.ellipse(cx, cy + radius * 0.3, radius * 0.9, radius * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // 洞内部
                ctx.fillStyle = '#1a0a00';
                ctx.beginPath();
                ctx.ellipse(cx, cy + radius * 0.2, radius * 0.7, radius * 0.2, 0, 0, Math.PI * 2);
                ctx.fill();

                const hole = this.holes[r * this.cols + c];
                if (hole.active || hole.hit) {
                    const drawY = hole.active ? cy - radius * 0.2 : cy - radius * 0.1;
                    const isHit = hole.hit;

                    // 地鼠身体
                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 8;

                    if (hole.type === 'bomb') {
                        // 炸弹
                        ctx.fillStyle = isHit ? '#fff' : '#333';
                        ctx.beginPath();
                        ctx.arc(cx, drawY - 5, radius * 0.6, 0, Math.PI * 2);
                        ctx.fill();
                        // 引信
                        ctx.strokeStyle = '#666';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(cx, drawY - 5 - radius * 0.6);
                        ctx.lineTo(cx + 5, drawY - 5 - radius * 0.9);
                        ctx.stroke();
                        // 💣 文字
                        ctx.shadowBlur = 0;
                        ctx.font = `${radius * 0.7}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('💣', cx, drawY - 5);
                    } else {
                        // 地鼠
                        const bodyColor = hole.type === 'gold' ? '#ffd700' : '#8B6914';
                        ctx.fillStyle = bodyColor;
                        ctx.beginPath();
                        ctx.ellipse(cx, drawY, radius * 0.8, radius * 0.7, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // 肚皮
                        ctx.fillStyle = hole.type === 'gold' ? '#fff5cc' : '#d4a854';
                        ctx.beginPath();
                        ctx.ellipse(cx, drawY + radius * 0.1, radius * 0.5, radius * 0.45, 0, 0, Math.PI * 2);
                        ctx.fill();

                        // 眼睛
                        ctx.shadowBlur = 0;
                        const eyeY = drawY - radius * 0.2;
                        const eyeOffset = radius * 0.25;
                        const eyeSize = radius * 0.12;
                        // 眼白
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(cx - eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(cx + eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
                        ctx.fill();
                        // 瞳孔 - 被打到变叉眼
                        if (isHit) {
                            ctx.fillStyle = '#ff0000';
                            ctx.font = `${eyeSize * 2}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText('✕', cx - eyeOffset, eyeY);
                            ctx.fillText('✕', cx + eyeOffset, eyeY);
                        } else {
                            ctx.fillStyle = '#111';
                            ctx.beginPath();
                            ctx.arc(cx - eyeOffset, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(cx + eyeOffset, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // 鼻子
                        ctx.fillStyle = '#333';
                        ctx.beginPath();
                        ctx.arc(cx, eyeY + radius * 0.2, eyeSize * 0.4, 0, Math.PI * 2);
                        ctx.fill();

                        // 黄金地鼠的皇冠
                        if (hole.type === 'gold') {
                            ctx.fillStyle = '#ffd700';
                            ctx.font = `${radius * 0.5}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText('👑', cx, drawY - radius * 0.5);
                        }
                    }
                    ctx.shadowBlur = 0;
                }
            }
        }

        // 倒计时
        const seconds = Math.ceil(this.timeLeft / 1000);
        ctx.fillStyle = seconds <= 5 ? '#ff4757' : 'rgba(255,255,255,0.5)';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`⏱ ${seconds}s`, w - 10, 10);
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;

        const delta = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(delta);
        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.whackamole = new WhackAMoleGame();
