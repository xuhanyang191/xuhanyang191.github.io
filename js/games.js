/**
 * 游戏管理器 - 处理游戏切换、画布管理、得分和游戏状态
 */

// roundRect 兼容补丁（某些浏览器不支持）
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (r > w / 2) r = w / 2;
        if (r > h / 2) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };
}

class GamesManager {
    constructor() {
        this.currentGame = null;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameTitle = document.getElementById('gameTitle');
        this.gameScore = document.getElementById('gameScore');
        this.score = 0;
        this.highScores = this.loadHighScores();
        this.animationId = null;
        this.isRunning = false;

        // 游戏结束覆盖层
        this.overlay = document.createElement('div');
        this.overlay.className = 'game-overlay';
        this.overlay.innerHTML = `
            <h2 id="overlayTitle">游戏结束</h2>
            <p id="overlayDesc">得分: 0</p>
            <button onclick="gamesManager.restartGame()">🔄 再来一局</button>
        `;
        document.getElementById('gameContent').appendChild(this.overlay);
    }

    loadHighScores() {
        try {
            return JSON.parse(localStorage.getItem('gameHighScores')) || {};
        } catch { return {}; }
    }

    saveHighScores() {
        try {
            localStorage.setItem('gameHighScores', JSON.stringify(this.highScores));
        } catch {}
    }

    getHighScore(gameId) {
        return this.highScores[gameId] || 0;
    }

    updateScore(score) {
        this.score = score;
        this.gameScore.textContent = `得分: ${score}`;
    }

    showOverlay(title, desc) {
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayDesc').textContent = desc;
        this.overlay.classList.add('show');
    }

    hideOverlay() {
        this.overlay.classList.remove('show');
    }

    resizeCanvas() {
        const container = document.getElementById('gameContent');
        const rect = container.getBoundingClientRect();
        const size = Math.min(rect.width - 20, rect.height - 20, 600);
        this.canvas.width = size;
        this.canvas.height = size;
    }

    startGame(gameId, gameInstance) {
        this.currentGame = gameId;
        this.gameInstance = gameInstance;
        this.hideOverlay();
        this.updateScore(0);

        // 游戏标题
        const titles = {
            snake: '🐍 贪吃蛇',
            breakout: '🧱 打砖块',
            shooter: '🚀 飞机射击',
            game2048: '🔢 2048',
            minesweeper: '💣 扫雷',
            pong: '🏓 乒乓球',
            whackamole: '🎯 打地鼠',
            tetris: '🧩 俄罗斯方块',
            runner: '🏃 跑酷'
        };
        this.gameTitle.textContent = titles[gameId] || '游戏';

        // 设置移动端控制
        this.setupMobileControls(gameId);

        // 切换显示（必须在 resizeCanvas 之前）
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';

        // 等待布局稳定后初始化画布和游戏
        setTimeout(() => {
            this.resizeCanvas();
            this.isRunning = true;
            gameInstance.start(this.canvas, this.ctx);
        }, 50);

        // 注册窗口缩放事件
        this._resizeHandler = () => {
            if (this.currentGame && this.gameInstance) {
                this.resizeCanvas();
            }
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    backToLobby() {
        if (this.gameInstance && this.isRunning) {
            this.gameInstance.stop();
            this.isRunning = false;
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // 移除窗口缩放事件
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('gameContainer').style.display = 'none';
        this.currentGame = null;
        this.gameInstance = null;
    }

    restartGame() {
        if (!this.gameInstance) return;
        this.hideOverlay();
        // 取消旧动画帧，防止与新帧冲突
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.gameInstance.stop();
        this.gameInstance.start(this.canvas, this.ctx);
    }

    gameOver() {
        this.isRunning = false;
        const hs = this.getHighScore(this.currentGame);
        const isNew = this.score > hs;
        if (isNew && this.score > 0) {
            this.highScores[this.currentGame] = this.score;
            this.saveHighScores();
        }
        const title = isNew ? '🎉 新纪录！' : '💫 游戏结束';
        const desc = `得分: ${this.score} ${isNew ? '🏆 新纪录！' : `最高分: ${hs}`}`;
        this.showOverlay(title, desc);
    }

    setupMobileControls(gameId) {
        const container = document.getElementById('mobileControls');
        // 默认隐藏
        container.style.display = 'none';
        container.innerHTML = '';

        if (gameId === 'snake') {
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:grid;grid-template-columns:64px 64px 64px;gap:4px">
                    <div></div>
                    <button class="mobile-btn" data-dir="up">↑</button>
                    <div></div>
                    <button class="mobile-btn" data-dir="left">←</button>
                    <button class="mobile-btn" data-dir="down">↓</button>
                    <button class="mobile-btn" data-dir="right">→</button>
                </div>
            `;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput(btn.dataset.dir);
                    }
                });
            });
        } else if (gameId === 'breakout' || gameId === 'pong') {
            container.style.display = 'flex';
            container.innerHTML = `
                <button class="mobile-btn" data-dir="left">←</button>
                <button class="mobile-btn" data-dir="right">→</button>
            `;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                const handler = () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput(btn.dataset.dir);
                    }
                };
                btn.addEventListener('mousedown', handler);
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); handler(); });
                btn.addEventListener('mouseup', () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput('stop');
                    }
                });
                btn.addEventListener('touchend', (e) => { e.preventDefault();
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput('stop');
                    }
                });
            });
        } else if (gameId === 'shooter') {
            container.style.display = 'flex';
            container.innerHTML = `
                <button class="mobile-btn" data-dir="left">←</button>
                <button class="mobile-btn" data-dir="fire">🔥</button>
                <button class="mobile-btn" data-dir="right">→</button>
            `;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                const handler = () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput(btn.dataset.dir);
                    }
                };
                btn.addEventListener('click', handler);
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); handler(); });
            });
        } else if (gameId === 'game2048') {
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:grid;grid-template-columns:64px 64px 64px;gap:4px">
                    <div></div>
                    <button class="mobile-btn" data-dir="up">↑</button>
                    <div></div>
                    <button class="mobile-btn" data-dir="left">←</button>
                    <button class="mobile-btn" data-dir="down">↓</button>
                    <button class="mobile-btn" data-dir="right">→</button>
                </div>
            `;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput(btn.dataset.dir);
                    }
                });
            });
        } else if (gameId === 'runner') {
            container.style.display = 'flex';
            container.innerHTML = `
                <button class="mobile-btn" data-dir="left">←</button>
                <button class="mobile-btn" data-dir="up" style="background:rgba(46,213,115,0.3);border-color:#2ed573">⬆ 跳</button>
                <button class="mobile-btn" data-dir="right">→</button>
                <button class="mobile-btn" data-dir="down">⬇</button>
            `;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                const dir = btn.dataset.dir;
                const handler = () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput(dir);
                    }
                };
                btn.addEventListener('click', handler);
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); handler(); });
            });
        } else if (gameId === 'tetris') {
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:grid;grid-template-columns:64px 64px 64px;gap:4px">
                    <button class="mobile-btn" data-dir="rotate">↻</button>
                    <button class="mobile-btn" data-dir="up">↑</button>
                    <div></div>
                    <button class="mobile-btn" data-dir="left">←</button>
                    <button class="mobile-btn" data-dir="down">↓</button>
                    <button class="mobile-btn" data-dir="right">→</button>
                    <div></div>
                    <button class="mobile-btn" data-dir="drop">⬇</button>
                    <div></div>
                </div>
            `;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (this.gameInstance && this.gameInstance.handleInput) {
                        this.gameInstance.handleInput(btn.dataset.dir);
                    }
                });
            });
        }
    }
}

// 所有游戏实例的全局注册表（必须在游戏脚本之前声明）
const gameInstances = {};
const gamesManager = new GamesManager();
