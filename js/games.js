/**
 * 游戏管理器 - 排行榜 + 画布管理 + 游戏状态
 */

// roundRect 兼容补丁
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

// 获取默认玩家名
function getDefaultName() { try { return localStorage.getItem('playerName') || '玩家'; } catch { return '玩家'; } }

class GamesManager {
    constructor() {
        this.currentGame = null;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameTitle = document.getElementById('gameTitle');
        this.gameScore = document.getElementById('gameScore');
        this.score = 0;
        this.leaderboards = this.loadLeaderboards();
        this.animationId = null;
        this.isRunning = false;
        this.paused = false;
        this.playerName = getDefaultName();

        this.buildOverlay();
        this.buildLeaderboardModal();
        this.buildPauseOverlay();
        this.addGlobalKeys();
    }

    // ======================== 排行榜存储 ========================

    loadLeaderboards() {
        try {
            return JSON.parse(localStorage.getItem('gameLeaderboards_v2')) || {};
        } catch { return {}; }
    }

    saveLeaderboards() {
        try {
            localStorage.setItem('gameLeaderboards_v2', JSON.stringify(this.leaderboards));
        } catch {}
    }

    addScore(gameId, score) {
        if (score <= 0) return null;
        const key = gameId;
        if (!this.leaderboards[key]) this.leaderboards[key] = [];
        const name = this.playerName || '匿名';
        const entry = {
            name: name,
            score: Math.floor(score),
            date: new Date().toLocaleDateString('zh-CN'),
            time: Date.now()
        };
        this.leaderboards[key].push(entry);
        this.leaderboards[key].sort((a, b) => b.score - a.score);
        this.leaderboards[key] = this.leaderboards[key].slice(0, 10);
        this.saveLeaderboards();

        // 判断是不是新纪录（最高分）
        const isNewRecord = entry.score === this.leaderboards[key][0].score &&
                            entry.time === this.leaderboards[key][0].time;
        return { entry, rank: this.leaderboards[key].indexOf(entry) + 1, isNewRecord };
    }

    getLeaderboard(gameId) {
        return this.leaderboards[gameId] || [];
    }

    // ======================== UI ========================

    buildOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'game-overlay';
        this.overlay.id = 'gameOverlay';
        this.overlay.innerHTML = `
            <div style="text-align:center;padding:10px;max-width:340px;width:90%;">
                <h2 id="overlayTitle" style="margin-bottom:6px;">游戏结束</h2>
                <p id="overlayDesc" style="margin-bottom:6px;font-size:1rem;"></p>
                <div id="nameInputArea" style="margin:6px auto;">
                    <input id="playerNameInput" type="text" maxlength="8" placeholder="输入昵称..." value="${this.playerName}"
                        style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:6px 12px;color:#fff;font-size:0.9rem;text-align:center;width:150px;outline:none;">
                </div>
                <div id="leaderboardMini" style="text-align:left;margin:6px auto;max-height:180px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:8px;padding:6px 10px;"></div>
                <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;flex-wrap:wrap;">
                    <button onclick="gamesManager.restartGame()" style="background:#ffd200;color:#1a1a2e;border:none;padding:10px 20px;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;">🔄 再来一局</button>
                    <button onclick="gamesManager.leaderboardModalShow()" style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:10px 16px;border-radius:8px;font-size:0.9rem;cursor:pointer;">🏆 排行榜</button>
                    <button onclick="gamesManager.backToLobby()" style="background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.1);padding:10px 16px;border-radius:8px;font-size:0.9rem;cursor:pointer;">🏠 返回</button>
                </div>
                <div style="margin-top:6px;color:rgba(255,255,255,0.25);font-size:0.7rem;">P 暂停 · R 重置</div>
            </div>
        `;
        document.getElementById('gameContent').appendChild(this.overlay);

        // 昵称输入自动保存
        this.overlay.addEventListener('input', (e) => {
            if (e.target.id === 'playerNameInput') {
                this.playerName = e.target.value || '玩家';
                try { localStorage.setItem('playerName', this.playerName); } catch {}
            }
        });
    }

    buildPauseOverlay() {
        this.pauseOverlay = document.createElement('div');
        this.pauseOverlay.id = 'pauseOverlay';
        this.pauseOverlay.style.cssText = `
            position:absolute;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,0.6);display:none;
            align-items:center;justify-content:center;
            border-radius:12px;z-index:15;
            backdrop-filter:blur(4px);
        `;
        this.pauseOverlay.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:3rem;margin-bottom:8px;">⏸</div>
                <div style="font-size:1.2rem;color:#fff;">已暂停</div>
                <div style="font-size:0.8rem;color:rgba(255,255,255,0.4);margin-top:6px;">按 P 或 空格 继续</div>
            </div>
        `;
        document.getElementById('gameContent').appendChild(this.pauseOverlay);
    }

    addGlobalKeys() {
        this._globalKeyHandler = (e) => {
            // R = 重置
            if (e.key === 'r' || e.key === 'R') {
                if (this.currentGame) {
                    e.preventDefault();
                    this.restartGame();
                    return;
                }
            }
            // P = 暂停 (仅对使用 Canvas 循环的游戏有效)
            if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
                if (this.currentGame && this.isRunning) {
                    // 空格: 只对 snake/breakout/pong/minesweeper/2048 等不用空格的游戏暂停
                    const noSpaceGames = ['snake', 'breakout', 'pong', 'minesweeper', 'game2048', 'whackamole'];
                    if (e.key === ' ' && !noSpaceGames.includes(this.currentGame)) return;
                    e.preventDefault();
                    this.togglePause();
                }
            }
        };
        window.addEventListener('keydown', this._globalKeyHandler);
    }

    togglePause() {
        this.paused = !this.paused;
        this.pauseOverlay.style.display = this.paused ? 'flex' : 'none';
    }

    // 游戏循环助手 - 每次循环前检查暂停
    checkPause() {
        if (this.paused) return true;
        return false;
    }

    buildLeaderboardModal() {
        this.lbModal = document.createElement('div');
        this.lbModal.id = 'lbModal';
        this.lbModal.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,0.8);z-index:100;
            display:none;align-items:center;justify-content:center;
            backdrop-filter:blur(6px);
        `;
        this.lbModal.innerHTML = `
            <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:24px;max-width:380px;width:90%;max-height:80vh;overflow-y:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <span style="font-size:1.3rem;font-weight:bold;">🏆 排行榜</span>
                    <span id="lbGameTitle" style="color:#aaa;font-size:0.9rem;"></span>
                </div>
                <div id="lbList"></div>
                <div style="text-align:center;margin-top:16px;">
                    <button onclick="gamesManager.leaderboardModalHide()" style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:8px 28px;border-radius:8px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.lbModal);
    }

    leaderboardModalShow() {
        const title = this.gameTitle.textContent || '游戏';
        document.getElementById('lbGameTitle').textContent = title;
        this.renderLeaderboardList(document.getElementById('lbList'), this.currentGame, true);
        this.lbModal.style.display = 'flex';
    }

    leaderboardModalHide() {
        this.lbModal.style.display = 'none';
    }

    renderLeaderboardList(container, gameId, showAll) {
        const entries = this.getLeaderboard(gameId);
        const medals = ['🥇', '🥈', '🥉'];

        if (entries.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">暂无记录</div>';
            return;
        }

        const display = showAll ? entries : entries.slice(0, 5);
        container.innerHTML = display.map((e, i) => {
            const rank = i + 1;
            const medal = rank <= 3 ? medals[rank - 1] : `#${rank}`;
            const isBest = rank === 1;
            return `
                <div style="display:flex;align-items:center;padding:5px 8px;margin:2px 0;border-radius:6px;background:${isBest ? 'rgba(255,210,0,0.1)' : 'rgba(255,255,255,0.03)'};${isBest ? 'border:1px solid rgba(255,210,0,0.15)' : ''}">
                    <span style="width:32px;font-size:0.85rem;text-align:center;">${medal}</span>
                    <span style="width:60px;font-weight:${isBest ? 'bold' : 'normal'};font-size:0.85rem;color:#ddd;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name || '匿名'}</span>
                    <span style="flex:1;font-weight:${isBest ? 'bold' : 'normal'};font-size:0.95rem;text-align:right;">${e.score.toLocaleString()}</span>
                    <span style="color:#666;font-size:0.65rem;margin-left:6px;">${e.date || ''}</span>
                </div>
            `;
        }).join('');
    }

    // ======================== 游戏流程 ========================

    updateScore(score) {
        this.score = score;
        this.gameScore.textContent = `得分: ${Math.floor(score)}`;
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
        this.canvas.width = Math.max(100, size);
        this.canvas.height = Math.max(100, size);
    }

    startGame(gameId, gameInstance) {
        this.currentGame = gameId;
        this.gameInstance = gameInstance;
        this.hideOverlay();
        this.updateScore(0);

        const titles = {
            snake: '🐍 贪吃蛇', breakout: '🧱 打砖块', shooter: '🚀 飞机射击',
            game2048: '🔢 2048', minesweeper: '💣 扫雷', pong: '🏓 乒乓球',
            whackamole: '🎯 打地鼠', tetris: '🧩 俄罗斯方块', runner: '🏃 跑酷'
        };
        this.gameTitle.textContent = titles[gameId] || '游戏';

        this.setupMobileControls(gameId);

        document.getElementById('lobby').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'flex';

        setTimeout(() => {
            this.resizeCanvas();
            this.isRunning = true;
            gameInstance.start(this.canvas, this.ctx);
        }, 50);

        this._resizeHandler = () => {
            if (this.currentGame && this.gameInstance) this.resizeCanvas();
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
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
        this.paused = false;
        if (this.pauseOverlay) this.pauseOverlay.style.display = 'none';
        this.leaderboardModalHide();
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('gameContainer').style.display = 'none';
        this.currentGame = null;
        this.gameInstance = null;
    }

    restartGame() {
        if (!this.gameInstance) return;
        this.hideOverlay();
        this.paused = false;
        if (this.pauseOverlay) this.pauseOverlay.style.display = 'none';
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.gameInstance.stop();
        this.gameInstance.start(this.canvas, this.ctx);
    }

    gameOver() {
        this.isRunning = false;

        // 保存到排行榜
        const result = this.addScore(this.currentGame, this.score);

        const title = result?.isNewRecord ? '🎉 新纪录！' : '💫 游戏结束';
        const best = this.getLeaderboard(this.currentGame);
        const hs = best.length > 0 ? best[0].score : 0;
        const desc = result?.isNewRecord
            ? `得分: ${Math.floor(this.score)}  🏆 新纪录！`
            : `得分: ${Math.floor(this.score)}  👑 最高: ${hs}`;
        this.showOverlay(title, desc);

        // 渲染迷你排行榜
        const miniContainer = document.getElementById('leaderboardMini');
        this.renderLeaderboardList(miniContainer, this.currentGame, false);
    }

    // ======================== 移动端控制 ========================

    setupMobileControls(gameId) {
        const container = document.getElementById('mobileControls');
        container.style.display = 'none';
        container.innerHTML = '';

        if (gameId === 'snake') {
            container.style.display = 'flex';
            container.innerHTML = `<div style="display:grid;grid-template-columns:64px 64px 64px;gap:4px"><div></div><button class="mobile-btn" data-dir="up">↑</button><div></div><button class="mobile-btn" data-dir="left">←</button><button class="mobile-btn" data-dir="down">↓</button><button class="mobile-btn" data-dir="right">→</button></div>`;
            container.querySelectorAll('.mobile-btn').forEach(btn => btn.addEventListener('click', () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); }));
        } else if (gameId === 'breakout' || gameId === 'pong') {
            container.style.display = 'flex';
            container.innerHTML = `<button class="mobile-btn" data-dir="left">←</button><button class="mobile-btn" data-dir="right">→</button>`;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                const h = () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); };
                btn.addEventListener('mousedown', h); btn.addEventListener('touchstart', (e) => { e.preventDefault(); h(); });
                const s = () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput('stop'); };
                btn.addEventListener('mouseup', s); btn.addEventListener('touchend', (e) => { e.preventDefault(); s(); });
            });
        } else if (gameId === 'shooter') {
            container.style.display = 'flex';
            container.innerHTML = `<button class="mobile-btn" data-dir="left">←</button><button class="mobile-btn" data-dir="fire">🔥</button><button class="mobile-btn" data-dir="right">→</button>`;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                const h = () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); };
                btn.addEventListener('click', h); btn.addEventListener('touchstart', (e) => { e.preventDefault(); h(); });
            });
        } else if (gameId === 'game2048') {
            container.style.display = 'flex';
            container.innerHTML = `<div style="display:grid;grid-template-columns:64px 64px 64px;gap:4px"><div></div><button class="mobile-btn" data-dir="up">↑</button><div></div><button class="mobile-btn" data-dir="left">←</button><button class="mobile-btn" data-dir="down">↓</button><button class="mobile-btn" data-dir="right">→</button></div>`;
            container.querySelectorAll('.mobile-btn').forEach(btn => btn.addEventListener('click', () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); }));
        } else if (gameId === 'runner') {
            container.style.display = 'flex';
            container.innerHTML = `<button class="mobile-btn" data-dir="left">←</button><button class="mobile-btn" data-dir="up" style="background:rgba(46,213,115,0.3);border-color:#2ed573">⬆ 跳</button><button class="mobile-btn" data-dir="right">→</button><button class="mobile-btn" data-dir="down">⬇</button>`;
            container.querySelectorAll('.mobile-btn').forEach(btn => {
                btn.addEventListener('click', () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); });
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); });
            });
        } else if (gameId === 'tetris') {
            container.style.display = 'flex';
            container.innerHTML = `<div style="display:grid;grid-template-columns:64px 64px 64px;gap:4px"><button class="mobile-btn" data-dir="rotate">↻</button><button class="mobile-btn" data-dir="up">↑</button><div></div><button class="mobile-btn" data-dir="left">←</button><button class="mobile-btn" data-dir="down">↓</button><button class="mobile-btn" data-dir="right">→</button><div></div><button class="mobile-btn" data-dir="drop">⬇</button><div></div></div>`;
            container.querySelectorAll('.mobile-btn').forEach(btn => btn.addEventListener('click', () => { if (this.gameInstance?.handleInput) this.gameInstance.handleInput(btn.dataset.dir); }));
        }
    }
}

const gameInstances = {};
const gamesManager = new GamesManager();
