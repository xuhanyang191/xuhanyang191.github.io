/**
 * 3D 跑酷 🏃 关卡豪华版 - Three.js 无限奔跑，关卡模式 + 8大升级
 * 升级内容: 金币 🪙 | 道具 ⚡ | 场景 🏙️ | 音效 🎵 | 连击 🔥 | 障碍 🚧 | 皮肤 🎨 | 成就 💾
 */

// ==========================================
// 📋 关卡定义
// ==========================================
const RUNNER_LEVELS = [
    { id: 1,  name: '晨跑入门',  desc: '适应跑道，学习跳跃和蹲伏',          distance: 200,  maxSpeed: 19, coins: false, powers: false, obstacles: ['tall','low'],           bg: 0x0f0f23, icon: '🌅' },
    { id: 2,  name: '城市穿梭',  desc: '收集金币，躲避更多障碍',            distance: 400,  maxSpeed: 21, coins: true,  powers: false, obstacles: ['tall','low','float'],    bg: 0x0c0c2e, icon: '🌆' },
    { id: 3,  name: '极速挑战',  desc: '移动障碍来袭，保持警惕！',          distance: 600,  maxSpeed: 23, coins: true,  powers: true,  obstacles: ['tall','low','float','moving'], bg: 0x12122a, icon: '⚡' },
    { id: 4,  name: '迷宫跑道',  desc: '墙壁阻挡去路，找对车道通过！',      distance: 800,  maxSpeed: 24, coins: true,  powers: true,  obstacles: ['tall','low','float','moving','wall'], bg: 0x16162e, icon: '🌀' },
    { id: 5,  name: '终极奔跑',  desc: '全力以赴，挑战极限！',              distance: 1200, maxSpeed: 26, coins: true,  powers: true,  obstacles: ['tall','low','float','moving','wall'], bg: 0x1a0a2e, icon: '🏆' },
];

class RunnerGame {
    constructor() {
        this.running = false;
        this.skinIndex = 0;
        this.skins = [
            { name: '经典蓝', body: 0x1e90ff, accent: 0x4488ff, emissive: 0x1e90ff },
            { name: '烈焰红', body: 0xff4444, accent: 0xff6b6b, emissive: 0xff2222 },
            { name: '森林绿', body: 0x2ed573, accent: 0x7bed9f, emissive: 0x2ed573 },
            { name: '炫光紫', body: 0xa855f7, accent: 0xc084fc, emissive: 0x9333ea },
            { name: '黄金甲', body: 0xffd700, accent: 0xffed4a, emissive: 0xf59e0b },
            { name: '赛博粉', body: 0xff6b9d, accent: 0xff8eb5, emissive: 0xff4081 },
        ];
        this.gameMode = 'endless'; // 'endless' | 'level'
        this.currentLevel = null;
        this.levelSelectShown = false;
    }

    // ==========================================
    //  关卡进度
    // ==========================================
    loadProgress() {
        try { return JSON.parse(localStorage.getItem('runner_progress_v3')) || {}; } catch { return {}; }
    }
    saveProgress(d) {
        try { localStorage.setItem('runner_progress_v3', JSON.stringify(d)); } catch {}
    }

    isLevelUnlocked(levelId) {
        if (levelId === 1) return true;
        const p = this.loadProgress();
        return p[`level_${levelId - 1}_done`] === true;
    }

    getLevelStars(levelId) {
        const p = this.loadProgress();
        return p[`level_${levelId}_stars`] || 0;
    }

    getLevelBest(levelId) {
        const p = this.loadProgress();
        return p[`level_${levelId}_best`] || 0;
    }

    // ==========================================
    //  主入口
    // ==========================================
    start(canvas, ctx) {
        this.canvas = canvas;
        this.container = canvas.parentElement;
        this.container.style.position = 'relative';

        // 先显示关卡选择
        this.showLevelSelect();
    }

    // ==========================================
    //  🎯 关卡选择界面
    // ==========================================
    showLevelSelect() {
        if (this.levelSelectShown) return;
        this.levelSelectShown = true;

        // 清理之前的界面
        this.cleanupUI();

        // 覆盖层
        this.levelOverlay = document.createElement('div');
        this.levelOverlay.style.cssText = `
            position:absolute;top:0;left:0;right:0;bottom:0;
            background:rgba(5,5,20,0.92);border-radius:12px;
            display:flex;flex-direction:column;align-items:center;
            z-index:30;overflow-y:auto;
            backdrop-filter:blur(8px);
        `;

        const progress = this.loadProgress();
        const endlessBest = progress.endlessBest || 0;

        this.levelOverlay.innerHTML = `
            <div style="width:100%;max-width:400px;padding:16px;">
                <div style="text-align:center;margin-bottom:12px;">
                    <div style="font-size:28px;margin-bottom:4px;">🏃 跑酷</div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.4);">选择关卡开始游戏</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                    ${RUNNER_LEVELS.map(l => {
                        const unlocked = this.isLevelUnlocked(l.id);
                        const stars = this.getLevelStars(l.id);
                        const best = this.getLevelBest(l.id);
                        const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
                        return `
                            <div class="level-card" data-level="${l.id}"
                                style="background:rgba(255,255,255,${unlocked ? '0.08' : '0.03'});
                                border:1px solid rgba(255,255,255,${unlocked ? '0.12' : '0.05'});
                                border-radius:12px;padding:12px 16px;cursor:${unlocked ? 'pointer' : 'not-allowed'};
                                opacity:${unlocked ? '1' : '0.35'};
                                transition:all 0.2s;display:flex;align-items:center;gap:12px;
                                ${unlocked ? 'hover:background:rgba(255,255,255,0.15);' : ''}">
                                <div style="font-size:28px;flex-shrink:0;">${unlocked ? l.icon : '🔒'}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:14px;font-weight:600;">第${l.id}关 ${l.name}</div>
                                    <div style="font-size:11px;color:rgba(255,255,255,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.desc}</div>
                                    <div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:2px;">🏃 ${l.distance}m ${l.coins ? '· 🪙' : ''} ${l.powers ? '· ⚡' : ''}</div>
                                </div>
                                <div style="text-align:right;flex-shrink:0;">
                                    ${unlocked && stars > 0 ? `<div style="font-size:12px;">${starStr}</div>` : ''}
                                    ${unlocked && best > 0 ? `<div style="font-size:10px;color:rgba(255,255,255,0.25);">${best}m</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="level-card" data-mode="endless"
                    style="background:rgba(255,200,0,0.08);border:1px solid rgba(255,200,0,0.15);
                    border-radius:12px;padding:12px 16px;cursor:pointer;
                    transition:all 0.2s;display:flex;align-items:center;gap:12px;">
                    <div style="font-size:28px;flex-shrink:0;">♾️</div>
                    <div style="flex:1;">
                        <div style="font-size:14px;font-weight:600;">无尽模式</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.4);">无限奔跑，挑战最高分</div>
                    </div>
                    <div style="text-align:right;font-size:11px;color:rgba(255,200,0,0.5);">${endlessBest > 0 ? `🏆 ${endlessBest}m` : '自由奔跑'}</div>
                </div>
                <div style="display:flex;gap:8px;margin-top:12px;justify-content:center;">
                    <button id="levelBackBtn" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:13px;">← 返回大厅</button>
                    <button id="levelSkinBtn" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#aaa;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:12px;">🎨 ${this.currentSkin?.name || '经典蓝'}</button>
                </div>
            </div>
        `;
        this.container.appendChild(this.levelOverlay);

        // 事件绑定
        this.levelOverlay.querySelectorAll('.level-card').forEach(el => {
            el.addEventListener('click', () => {
                const levelId = el.dataset.level;
                const mode = el.dataset.mode;
                if (levelId) {
                    const id = parseInt(levelId);
                    if (!this.isLevelUnlocked(id)) return;
                    this.startLevel(id);
                } else if (mode === 'endless') {
                    this.startEndless();
                }
            });
            // hover
            el.addEventListener('mouseenter', () => {
                if (el.dataset.level && !this.isLevelUnlocked(parseInt(el.dataset.level))) return;
                el.style.transform = 'translateY(-2px)';
                el.style.background = el.dataset.mode === 'endless' ? 'rgba(255,200,0,0.15)' : 'rgba(255,255,255,0.12)';
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
                el.style.background = el.dataset.mode === 'endless' ? 'rgba(255,200,0,0.08)' :
                    (el.dataset.level && !this.isLevelUnlocked(parseInt(el.dataset.level))) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)';
            });
        });

        const backBtn = this.levelOverlay.querySelector('#levelBackBtn');
        if (backBtn) backBtn.addEventListener('click', () => this.backToLobby());

        const skinBtn = this.levelOverlay.querySelector('#levelSkinBtn');
        if (skinBtn) skinBtn.addEventListener('click', () => {
            this.cycleSkin();
            skinBtn.textContent = `🎨 ${this.currentSkin.name}`;
        });
    }

    hideLevelSelect() {
        this.levelSelectShown = false;
        if (this.levelOverlay && this.levelOverlay.parentElement) {
            this.levelOverlay.remove();
            this.levelOverlay = null;
        }
    }

    // ==========================================
    //  🎬 开始关卡 / 无尽模式
    // ==========================================
    startLevel(levelId) {
        this.gameMode = 'level';
        this.currentLevel = RUNNER_LEVELS.find(l => l.id === levelId);
        this.hideLevelSelect();
        this.initGame();
    }

    startEndless() {
        this.gameMode = 'endless';
        this.currentLevel = null;
        this.hideLevelSelect();
        this.initGame();
    }

    initGame() {
        const canvas = this.canvas;
        canvas.style.display = 'none';
        this.glCanvas = document.createElement('canvas');
        this.glCanvas.style.cssText = 'max-width:100%;max-height:100%;border-radius:12px;display:block;';
        this.glCanvas.width = canvas.width;
        this.glCanvas.height = canvas.height;
        this.container.insertBefore(this.glCanvas, canvas);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.glCanvas, antialias: true });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        const bg = this.currentLevel ? this.currentLevel.bg : 0x0f0f23;
        this.renderer.setClearColor(bg);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(bg, 0.012);

        const aspect = canvas.width / canvas.height;
        this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 100);
        this.camera.position.set(0, 5, -9);
        this.camera.lookAt(0, 0.5, 6);

        this.createLights();
        this.createGround();
        this.loadSkin();
        this.createBarriers();
        this.createStars();
        this.createScenery();
        this.initAudio();
        this.createHUD();
        this.resetState();

        // 关卡专用状态
        if (this.gameMode === 'level' && this.currentLevel) {
            this.levelSpeedCap = this.currentLevel.maxSpeed;
            this.levelTarget = this.currentLevel.distance;
            this.levelObstacles = this.currentLevel.obstacles;
            this.levelHasCoins = this.currentLevel.coins;
            this.levelHasPowers = this.currentLevel.powers;
            // 关卡提示
            this.showNotification(`🎯 第${this.currentLevel.id}关: ${this.currentLevel.name}`, '#ffd700', 2000);
            setTimeout(() => this.showNotification(`🏃 跑 ${this.currentLevel.distance}m 通关`, '#aaa', 1500), 200);
        } else {
            this.levelSpeedCap = 25;
            this.levelTarget = Infinity;
            this.levelObstacles = ['tall', 'low', 'float', 'moving', 'wall'];
            this.levelHasCoins = true;
            this.levelHasPowers = true;
        }

        this.autoPlay = false;
        this._onKeyDown = (e) => this.handleKeyDown(e);
        this._onKeyUp = (e) => this.handleKeyUp(e);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);

        this.autoLabel = document.createElement('div');
        this.autoLabel.textContent = '🤖 AUTO';
        this.autoLabel.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,200,100,0.85);color:#fff;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:bold;display:none;z-index:20;pointer-events:none;box-shadow:0 2px 10px rgba(0,200,100,0.4);letter-spacing:1px;';
        this.container.appendChild(this.autoLabel);

        this.autoHint = document.createElement('div');
        const hint = this.gameMode === 'level' ? 'L自动 C皮肤 M音效 ↑跳 ↓蹲 ←→换道' : 'L自动 C皮肤 M音效 ↑跳 ↓蹲 ←→换道';
        this.autoHint.textContent = hint;
        this.autoHint.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.25);font-size:11px;z-index:20;pointer-events:none;white-space:nowrap;';
        this.container.appendChild(this.autoHint);

        this._onClick = () => { if (!this.gameOver && this.running) this.doJump(); };
        this.glCanvas.addEventListener('click', this._onClick);
        this.glCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (!this.gameOver && this.running) this.doJump(); }, { passive: false });

        // 关卡进度条
        if (this.gameMode === 'level') {
            this.createLevelProgress();
        }

        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    // ==========================================
    //  📊 关卡进度条
    // ==========================================
    createLevelProgress() {
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            position:absolute;bottom:48px;left:50%;transform:translateX(-50%);
            width:200px;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;
            z-index:18;pointer-events:none;overflow:hidden;
        `;
        this.progressFill = document.createElement('div');
        this.progressFill.style.cssText = `
            width:0%;height:100%;background:linear-gradient(90deg,#ffd700,#ff6b35);
            border-radius:4px;transition:width 0.3s;
        `;
        this.progressBar.appendChild(this.progressFill);
        this.container.appendChild(this.progressBar);

        this.progressLabel = document.createElement('div');
        this.progressLabel.style.cssText = `
            position:absolute;bottom:56px;left:50%;transform:translateX(-50%);
            font-size:10px;color:rgba(255,255,255,0.3);z-index:18;pointer-events:none;
            text-align:center;
        `;
        this.progressLabel.textContent = `0 / ${this.levelTarget}m`;
        this.container.appendChild(this.progressLabel);
    }

    updateLevelProgress() {
        if (!this.progressFill || !this.progressLabel || !this.currentLevel) return;
        const pct = Math.min(100, (this.distance / this.levelTarget) * 100);
        this.progressFill.style.width = pct + '%';
        this.progressLabel.textContent = `${Math.floor(this.distance)} / ${this.levelTarget}m`;

        if (this.distance >= this.levelTarget) {
            this.levelComplete();
        }
    }

    // ==========================================
    //  🎉 关卡完成
    // ==========================================
    levelComplete() {
        this.running = false;
        this.gameOver = true;
        this.playSound('achievement');

        // 计算星级
        const coinsNeeded = Math.floor(this.levelTarget / 10);
        const coinRatio = this.coinsCollected / Math.max(1, coinsNeeded);
        let stars = 1;
        if (coinRatio >= 0.3) stars = 2;
        if (coinRatio >= 0.6 || this.coinsCollected >= coinsNeeded) stars = 3;

        // 保存进度
        const p = this.loadProgress();
        p[`level_${this.currentLevel.id}_done`] = true;
        const oldStars = p[`level_${this.currentLevel.id}_stars`] || 0;
        if (stars > oldStars) p[`level_${this.currentLevel.id}_stars`] = stars;
        const oldBest = p[`level_${this.currentLevel.id}_best`] || 0;
        if (this.score > oldBest) p[`level_${this.currentLevel.id}_best`] = this.score;
        this.saveProgress(p);

        // 显示完成界面
        setTimeout(() => {
            this.showLevelComplete(stars);
        }, 500);
    }

    showLevelComplete(stars) {
        // 清理现有的UI元素
        this.cleanupGameUI();

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:absolute;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,0.75);border-radius:12px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            z-index:30;backdrop-filter:blur(8px);
        `;
        overlay.innerHTML = `
            <div style="text-align:center;padding:20px;max-width:320px;">
                <div style="font-size:48px;margin-bottom:8px;">🎉</div>
                <div style="font-size:22px;font-weight:bold;background:linear-gradient(90deg,#ffd700,#ff6b35);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">第${this.currentLevel.id}关 通过！</div>
                <div style="font-size:36px;margin:12px 0;">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:12px 0;">
                    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
                        <div style="font-size:18px;font-weight:bold;color:#ffd700;">${Math.floor(this.distance)}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);">距离(m)</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
                        <div style="font-size:18px;font-weight:bold;color:#ffd700;">${this.coinsCollected}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);">🪙 金币</div>
                    </div>
                    <div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:8px;">
                        <div style="font-size:18px;font-weight:bold;color:#ffd700;">${this.maxCombo}x</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);">🔥 连击</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px;">
                    ${this.currentLevel.id < RUNNER_LEVELS.length ? `
                        <button class="level-next-btn" style="background:linear-gradient(135deg,#ffd700,#ff6b35);color:#1a1a2e;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                            ▶ 下一关
                        </button>
                    ` : `
                        <div style="font-size:13px;color:#ffd700;font-weight:bold;margin-bottom:4px;">🏆 恭喜通关所有关卡！</div>
                    `}
                    <button class="level-retry-btn" style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;">🔄 重玩</button>
                    <button class="level-select-btn" style="background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.1);padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;">📋 关卡选择</button>
                </div>
            </div>
        `;
        this.container.appendChild(overlay);

        overlay.querySelector('.level-next-btn')?.addEventListener('click', () => {
            overlay.remove();
            this.cleanupThreeJS();
            this.startLevel(this.currentLevel.id + 1);
        });
        overlay.querySelector('.level-retry-btn')?.addEventListener('click', () => {
            overlay.remove();
            this.cleanupThreeJS();
            this.startLevel(this.currentLevel.id);
        });
        overlay.querySelector('.level-select-btn')?.addEventListener('click', () => {
            overlay.remove();
            this.cleanupThreeJS();
            this.showLevelSelect();
        });
    }

    // ==========================================
    //  清除 & 重置
    // ==========================================
    cleanupUI() {
        if (this.levelOverlay && this.levelOverlay.parentElement) this.levelOverlay.remove();
        this.levelOverlay = null;
        this.levelSelectShown = false;
    }

    cleanupGameUI() {
        if (this.autoLabel && this.autoLabel.parentElement) this.autoLabel.remove();
        if (this.autoHint && this.autoHint.parentElement) this.autoHint.remove();
        if (this.hudContainer && this.hudContainer.parentElement) this.hudContainer.remove();
        if (this.notifContainer && this.notifContainer.parentElement) this.notifContainer.remove();
        if (this.achievementContainer && this.achievementContainer.parentElement) this.achievementContainer.remove();
        if (this.progressBar && this.progressBar.parentElement) this.progressBar.remove();
        if (this.progressLabel && this.progressLabel.parentElement) this.progressLabel.remove();
    }

    cleanupThreeJS() {
        if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
        if (this.glCanvas && this.glCanvas.parentElement) this.glCanvas.remove();
        if (this.canvas) this.canvas.style.display = '';
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.obstacles = [];
        this.coins = [];
        this.powerUps = [];
        this.particles = [];
        this.trail = [];
        this.scene = null;
        this.camera = null;
    }

    backToLobby() {
        this.cleanupUI();
        this.cleanupGameUI();
        this.cleanupThreeJS();
        if (this.running) this.running = false;
        this.gameOver = true;
        // 返回大厅
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('gameContainer').style.display = 'none';
        gamesManager.currentGame = null;
        gamesManager.gameInstance = null;
    }

    // ==========================================
    //  重置游戏状态
    // ==========================================
    resetState() {
        this.score = 0; this.distance = 0; this.coinsCollected = 0;
        this.baseSpeed = 18; this.speed = this.baseSpeed;
        this.jumpsLeft = 2; this.maxJumps = 2; this.grounded = true;
        this.playerY = 0; this.playerVelY = 0; this.gravity = -40; this.jumpForce = 14;
        this.ducking = false; this.playerLane = 0; this.targetLane = 0; this.laneChangeSpeed = 0.15;
        this.obstacles = []; this.coins = []; this.powerUps = []; this.particles = []; this.trail = [];
        this.sceneryItems = [];
        this.spawnTimer = 0; this.spawnInterval = 1.8;
        this.coinSpawnTimer = 0; this.coinSpawnInterval = 0.6;
        this.powerUpSpawnTimer = 0; this.powerUpSpawnInterval = 8;
        this.gameOver = false; this.running = true; this.runPhase = 0; this.groundOffset = 0;
        this.doubleJumpEffect = false;
        this.shieldActive = false; this.shieldTimer = 0; this.shieldMaxTime = 10;
        this.magnetActive = false; this.magnetTimer = 0; this.magnetMaxTime = 8;
        this.speedEffect = 0; this.speedEffectTimer = 0;
        this.combo = 0; this.maxCombo = 0; this.comboMultiplier = 1; this.comboTimer = 0;
        this.screenShake = 0; this.achievementNotifs = [];
        this.levelSpeedCap = 25; this.levelTarget = Infinity;
        this.levelObstacles = ['tall', 'low', 'float', 'moving', 'wall'];
        this.levelHasCoins = true; this.levelHasPowers = true;
        if (this.playerGroup) {
            this.playerGroup.position.set(0, 0, 0);
            this.playerGroup.scale.set(1, 1, 1);
            this.playerGroup.children.forEach(c => { if (c.material) { c.material.color.setHex(this.currentSkin.body); c.material.emissive.setHex(this.currentSkin.emissive); c.material.emissiveIntensity = 0.15; } });
        }
    }

    // ==========================================
    //  场景构建 (保持原有)
    // ==========================================
    createLights() {
        this.scene.add(new THREE.AmbientLight(0x334466, 0.4));
        const dl = new THREE.DirectionalLight(0xffffff, 0.9);
        dl.position.set(8, 18, 5); dl.castShadow = true;
        dl.shadow.mapSize.set(1024, 1024);
        this.scene.add(dl);
        const rl = new THREE.DirectionalLight(0x4488ff, 0.3);
        rl.position.set(-5, 3, -10); this.scene.add(rl);
        this.bottomLight = new THREE.PointLight(0x00ff88, 0.2, 20);
        this.bottomLight.position.set(0, -1, 5); this.scene.add(this.bottomLight);
    }

    createGround() {
        const gm = new THREE.MeshStandardMaterial({ color: 0x1a1a3e, roughness: 0.9, metalness: 0.1 });
        this.ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 200), gm);
        this.ground.rotation.x = -Math.PI / 2; this.ground.position.set(0, -0.05, 30); this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        const lm = new THREE.MeshStandardMaterial({ color: 0x2a2a5e, emissive: 0x2222aa, emissiveIntensity: 0.15 });
        this.laneLines = [];
        for (let z = -5; z < 65; z += 3) for (let x = -1; x <= 1; x += 2) {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 1.5), lm);
            l.position.set(x * 1.8, 0, z); this.scene.add(l); this.laneLines.push(l);
        }
        const glowMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.3, transparent: true, opacity: 0.15 });
        this.glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 100), glowMat);
        this.glowStrip.position.set(0, 0, 30); this.scene.add(this.glowStrip);
        const dm = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.1, transparent: true, opacity: 0.2 });
        for (let z = 0; z < 60; z += 2) {
            const d = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), dm);
            d.rotation.x = -Math.PI / 2; d.position.set(0, 0, z); this.scene.add(d); this.laneLines.push(d);
        }
    }

    loadSkin() {
        try { const s = localStorage.getItem('runner_skin'); if (s !== null) this.skinIndex = parseInt(s) || 0; } catch {}
        this.currentSkin = this.skins[this.skinIndex % this.skins.length];
        if (this.playerGroup) this.rebuildPlayer(); else this.createPlayer();
    }

    rebuildPlayer() {
        while (this.playerGroup.children.length) { const c = this.playerGroup.children[0]; if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); this.playerGroup.remove(c); }
        this.createPlayerMeshes();
    }

    createPlayer() {
        this.playerGroup = new THREE.Group(); this.createPlayerMeshes();
        this.playerGroup.position.set(0, 0, 0); this.scene.add(this.playerGroup);
    }

    createPlayerMeshes() {
        const s = this.currentSkin;
        const bm = new THREE.MeshStandardMaterial({ color: s.body, emissive: s.emissive, emissiveIntensity: 0.15, metalness: 0.3, roughness: 0.4 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), bm); b.position.y = 0.9; b.castShadow = true; this.playerGroup.add(b);
        const hm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), hm); h.position.y = 1.6; h.castShadow = true; this.playerGroup.add(h);
        const em = new THREE.MeshStandardMaterial({ color: 0x222222 });
        for (const side of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), em); e.position.set(side * 0.15, 1.7, 0.25); this.playerGroup.add(e); }
        const hlm = new THREE.MeshStandardMaterial({ color: 0xffffff });
        for (const side of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), hlm); e.position.set(side * 0.12, 1.72, 0.3); this.playerGroup.add(e); }
        const legm = new THREE.MeshStandardMaterial({ color: s.body, roughness: 0.5 });
        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), legm); this.leftLeg.position.set(-0.2, 0.15, 0); this.leftLeg.castShadow = true; this.playerGroup.add(this.leftLeg);
        this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), legm); this.rightLeg.position.set(0.2, 0.15, 0); this.rightLeg.castShadow = true; this.playerGroup.add(this.rightLeg);
        const scm = new THREE.MeshStandardMaterial({ color: s.accent, emissive: s.accent, emissiveIntensity: 0.2 });
        const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.2), scm); sc.position.set(0, 1.2, -0.3); this.playerGroup.add(sc);
        const shm = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), shm);
        this.shieldMesh.visible = false; this.playerGroup.add(this.shieldMesh);
    }

    createBarriers() {
        const wm = new THREE.MeshStandardMaterial({ color: 0x2a2a5e, transparent: true, opacity: 0.4 });
        const wg = new THREE.BoxGeometry(0.3, 1.5, 100);
        this.leftWall = new THREE.Mesh(wg, wm); this.leftWall.position.set(-4.5, 0.75, 30); this.leftWall.receiveShadow = true; this.scene.add(this.leftWall);
        this.rightWall = new THREE.Mesh(wg, wm); this.rightWall.position.set(4.5, 0.75, 30); this.rightWall.receiveShadow = true; this.scene.add(this.rightWall);
        const nm = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x4488ff, emissiveIntensity: 0.8 });
        const ng = new THREE.BoxGeometry(0.05, 0.05, 100);
        this.scene.add(new THREE.Mesh(ng, nm).position.set(-4.35, 1.3, 30));
        this.scene.add(new THREE.Mesh(ng, nm).position.set(4.35, 1.3, 30));
    }

    createStars() {
        const g = new THREE.BufferGeometry(); const n = 400;
        const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            p[i*3] = (Math.random()-0.5)*150; p[i*3+1] = Math.random()*40+3; p[i*3+2] = (Math.random()-0.5)*150-20;
            const v = 0.5+Math.random()*0.5; c[i*3]=v; c[i*3+1]=v; c[i*3+2]=v+Math.random()*0.2;
        }
        g.setAttribute('position',new THREE.BufferAttribute(p,3)); g.setAttribute('color',new THREE.BufferAttribute(c,3));
        this.starField = new THREE.Points(g, new THREE.PointsMaterial({size:0.15,vertexColors:true,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending}));
        this.scene.add(this.starField);
    }

    createScenery() {
        this.sceneryItems = [];
        const bcs = [0x1a1a3e,0x2a2a5e,0x1e1e4a,0x252550,0x303060,0x1f1f45];
        const wm = new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xffa500,emissiveIntensity:0.3});
        for (let i=0;i<25;i++) {
            const side=Math.random()>0.5?-1:1,z=Math.random()*70-5;
            const h=2+Math.random()*4,w=0.8+Math.random()*0.6,d=0.8+Math.random()*0.6;
            const col=bcs[Math.floor(Math.random()*bcs.length)];
            const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:col,roughness:0.8,metalness:0.2,emissive:col,emissiveIntensity:0.05}));
            b.position.set(side*(4.8+w/2+Math.random()*1.5),h/2,z); b.castShadow=true;
            this.scene.add(b); this.sceneryItems.push(b);
            for (let j=0;j<Math.floor(Math.random()*4)+2;j++) {
                const win=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.02),wm);
                win.position.set(side>0?w/2+0.01:-w/2-0.01,0.4+Math.random()*(h-1),(Math.random()-0.5)*(d-0.2));
                b.add(win);
            }
        }
        const pm=new THREE.MeshStandardMaterial({color:0x555577,metalness:0.5,roughness:0.3});
        const lm=new THREE.MeshStandardMaterial({color:0x4488ff,emissive:0x4488ff,emissiveIntensity:0.8});
        for (let i=0;i<20;i++) for(const side of[-1,1]) {
            const z=i*3.5-5;
            const p=new THREE.Mesh(new THREE.BoxGeometry(0.08,1.8,0.08),pm); p.position.set(side*4.2,0.9,z); this.scene.add(p); this.sceneryItems.push(p);
            const l=new THREE.Mesh(new THREE.SphereGeometry(0.12,6,6),lm); l.position.set(side*4.2,1.85,z); this.scene.add(l); this.sceneryItems.push(l);
        }
    }

    initAudio() {
        this.audioCtx=null; this.audioEnabled=true;
        try{const s=localStorage.getItem('runner_audio');if(s!==null)this.audioEnabled=s==='true';}catch{}
    }
    getAudioCtx(){if(!this.audioCtx){try{this.audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch{return null;}}if(this.audioCtx.state==='suspended')this.audioCtx.resume();return this.audioCtx;}
    playSound(type){
        if(!this.audioEnabled)return;
        const ctx=this.getAudioCtx();if(!ctx)return;
        try{
            const t=ctx.currentTime;
            const osc=(freq,time,dur,vol=0.1,type='sine')=>{
                const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);
                o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(0.001,time+dur);
                o.start(time);o.stop(time+dur);
            };
            if(type==='jump'){osc(350,t,0.15,0.12);osc(700,t+0.05,0.1,0.08);}
            else if(type==='doubleJump'){osc(500,t,0.18,0.1);osc(1200,t+0.08,0.1,0.08);}
            else if(type==='coin'){osc(880,t,0.08,0.06);osc(1320,t+0.04,0.08,0.05);}
            else if(type==='powerUp'){osc(400,t,0.3,0.08);osc(800,t+0.1,0.25,0.06);osc(1200,t+0.15,0.2,0.05);}
            else if(type==='crash'){
                const bs=ctx.sampleRate*0.3,buf=ctx.createBuffer(1,bs,ctx.sampleRate),d=buf.getChannelData(0);
                for(let i=0;i<bs;i++)d[i]=(Math.random()*2-1)*(1-i/bs);
                const n=ctx.createBufferSource();n.buffer=buf;
                const g=ctx.createGain(),f=ctx.createBiquadFilter();
                f.type='lowpass';f.frequency.setValueAtTime(2000,t);f.frequency.exponentialRampToValueAtTime(200,t+0.2);
                n.connect(f);f.connect(g);g.connect(ctx.destination);
                g.gain.setValueAtTime(0.15,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);
                n.start(t);n.stop(t+0.3);
            }else if(type==='combo'){[523,659,784,1047].forEach((f,i)=>osc(f,t+i*0.06,0.15,0.05));}
            else if(type==='achievement'){[523,659,784,1047,1319].forEach((f,i)=>osc(f,t+i*0.08,0.2,0.06));}
        }catch{}
    }

    handleKeyDown(e) {
        if(this.gameOver)return;
        if(e.key==='l'||e.key==='L'){this.autoPlay=!this.autoPlay;if(this.autoLabel)this.autoLabel.style.display=this.autoPlay?'block':'none';return;}
        if(e.key==='c'||e.key==='C'){e.preventDefault();this.cycleSkin();return;}
        if(e.key==='m'||e.key==='M'){this.audioEnabled=!this.audioEnabled;try{localStorage.setItem('runner_audio',this.audioEnabled);}catch{}this.showNotification(this.audioEnabled?'🔊 音效开':'🔇 音效关','#666',1000);return;}
        if(this.autoPlay)return;
        if(e.key==='ArrowUp'||e.key===' '||e.key==='w'||e.key==='W'){e.preventDefault();this.doJump();}
        if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){e.preventDefault();this.ducking=true;}
        if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){e.preventDefault();this.targetLane=Math.min(1,this.targetLane+1);}
        if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){e.preventDefault();this.targetLane=Math.max(-1,this.targetLane-1);}
    }
    handleKeyUp(e){if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')this.ducking=false;}
    handleInput(dir){
        if(this.gameOver)return;
        if(dir==='up'||dir==='fire')this.doJump();if(dir==='down')this.ducking=true;
        if(dir==='left')this.targetLane=Math.min(1,this.targetLane+1);if(dir==='right')this.targetLane=Math.max(-1,this.targetLane-1);
    }
    cycleSkin(){
        this.skinIndex=(this.skinIndex+1)%this.skins.length;this.currentSkin=this.skins[this.skinIndex];
        try{localStorage.setItem('runner_skin',this.skinIndex);}catch{}
        this.rebuildPlayer();this.showNotification(`🎨 ${this.currentSkin.name}`,this.currentSkin.body,1200);
    }
    doJump(){
        if(this.jumpsLeft<=0)return;
        this.playerVelY=this.jumpForce*(this.jumpsLeft===1?0.88:1);this.jumpsLeft--;this.grounded=false;
        if(this.jumpsLeft===0){this.doubleJumpEffect=true;setTimeout(()=>{this.doubleJumpEffect=false;},300);this.playSound('doubleJump');}
        else this.playSound('jump');
        for(let i=0;i<10;i++)this.particles.push({x:(Math.random()-0.5)*2,y:0.1,z:(Math.random()-0.5)*2,vx:(Math.random()-0.5)*4,vy:Math.random()*3+1,vz:(Math.random()-0.5)*4,life:25+Math.random()*20,maxLife:45,color:this.jumpsLeft===0?0xffd700:this.currentSkin.accent});
    }
    spawnCoin(){
        const lane=Math.floor(Math.random()*3)-1,g=new THREE.Group();
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.08,16),new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xffa500,emissiveIntensity:0.3,metalness:0.8,roughness:0.2,side:THREE.DoubleSide})).rotateX(Math.PI/2));
        const gl=new THREE.Mesh(new THREE.CircleGeometry(0.35,12),new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xffd700,emissiveIntensity:0.5,transparent:true,opacity:0.2,side:THREE.DoubleSide}));gl.rotation.x=Math.PI/2;gl.position.z=-0.01;g.add(gl);
        g.position.set(lane*2,0.8,50+Math.random()*10);g.userData={lane,collected:false,bobPhase:Math.random()*Math.PI*2};
        this.scene.add(g);this.coins.push(g);
    }
    spawnPowerUp(){
        const lane=Math.floor(Math.random()*3)-1,type=['shield','magnet','speed'][Math.floor(Math.random()*3)],g=new THREE.Group();
        let col,em;switch(type){case'shield':col=0x00d4ff;em=0x00d4ff;break;case'magnet':col=0xffaa00;em=0xff8800;break;case'speed':col=0xff4444;em=0xff2222;break;}
        g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.3),new THREE.MeshStandardMaterial({color:col,emissive:em,emissiveIntensity:0.4,metalness:0.5,roughness:0.3,transparent:true,opacity:0.9})));
        const r=new THREE.Mesh(new THREE.RingGeometry(0.35,0.45,16),new THREE.MeshStandardMaterial({color:col,emissive:em,emissiveIntensity:0.3,transparent:true,opacity:0.2,side:THREE.DoubleSide}));r.rotation.x=Math.PI/2;g.add(r);
        g.position.set(lane*2,0.8,50+Math.random()*10);g.userData={lane,collected:false,type,bobPhase:Math.random()*Math.PI*2};
        this.scene.add(g);this.powerUps.push(g);
    }
    applyPowerUp(type){
        this.playSound('powerUp');
        switch(type){case'shield':this.shieldActive=true;this.shieldTimer=this.shieldMaxTime;this.showNotification('🛡️ 护盾激活！',0x00d4ff,1500);break;case'magnet':this.magnetActive=true;this.magnetTimer=this.magnetMaxTime;this.showNotification('🧲 磁铁激活！',0xffaa00,1500);break;case'speed':this.speedEffect=1;this.speedEffectTimer=5;this.showNotification('⚡ 加速！',0xff4444,1500);break;}
        this.checkAchievements('powerup');
    }
    spawnObstacle(){
        const lane=Math.floor(Math.random()*3)-1,r=Math.random();let mesh,type;
        // 根据关卡可用障碍类型过滤
        const allowed=this.levelObstacles||['tall','low','float','moving','wall'];
        // 重新映射随机数到允许的障碍类型
        const pick=allowed[Math.floor(Math.random()*allowed.length)];
        if(pick==='tall'||(pick==='low'&&r<0.5)||(pick==='float'&&r<0.3)){
            if(pick==='tall'||(!allowed.includes('tall')&&r<0.5)){
                type='tall';const h=0.8+Math.random()*0.6;
                const m=new THREE.MeshStandardMaterial({color:0xff6b6b,emissive:0xff4444,emissiveIntensity:0.15,roughness:0.5,metalness:0.3});
                mesh=new THREE.Mesh(new THREE.BoxGeometry(0.6,h,0.5),m);mesh.position.y=h/2;mesh.castShadow=true;
                const ring=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.08,0.55),new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xffa500,emissiveIntensity:0.3}));ring.position.y=h*0.6;mesh.add(ring);
            }else if(pick==='low'||r<0.7){
                type='low';const m=new THREE.MeshStandardMaterial({color:0xa855f7,emissive:0x7c3aed,emissiveIntensity:0.15,roughness:0.5});
                mesh=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.4,0.8),m);mesh.position.y=0.2;mesh.castShadow=true;
            }else{
                type='float';const m=new THREE.MeshStandardMaterial({color:0x38bdf8,emissive:0x0ea5e9,emissiveIntensity:0.2,roughness:0.3,metalness:0.4});
                mesh=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.4,0.6),m);mesh.position.y=1.3;mesh.castShadow=true;
                const glow=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.02,0.8),new THREE.MeshStandardMaterial({color:0x38bdf8,emissive:0x38bdf8,emissiveIntensity:0.5,transparent:true,opacity:0.3}));glow.position.y=-0.25;mesh.add(glow);
            }
        } else if (pick==='moving'||(pick==='wall'&&r<0.5)) {
            type='moving';const m=new THREE.MeshStandardMaterial({color:0xf97316,emissive:0xea580c,emissiveIntensity:0.2,roughness:0.4,metalness:0.3});
            mesh=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.8,0.5),m);mesh.position.y=0.4;mesh.castShadow=true;
            mesh.userData={lane,type:'moving',active:true,moveSpeed:2+Math.random()*2,moveRange:2,startX:lane*2,movePhase:0};mesh.position.x=lane*2;
        } else {
            const safeLane=Math.floor(Math.random()*3)-1;
            const wg=new THREE.Group();const wm=new THREE.MeshStandardMaterial({color:0x6366f1,emissive:0x4f46e5,emissiveIntensity:0.15,roughness:0.5});
            for(let l=-1;l<=1;l++){if(l===safeLane)continue;const b=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.2,0.4),wm);b.position.set(l*2,0.6,0);b.castShadow=true;wg.add(b);}
            const sm=new THREE.MeshStandardMaterial({color:0x22c55e,emissive:0x22c55e,emissiveIntensity:0.3,transparent:true,opacity:0.2});
            wg.add(new THREE.Mesh(new THREE.BoxGeometry(0.6,0.02,0.3),sm).position.set(safeLane*2,0.01,0));
            wg.position.set(0,0,50+Math.random()*10);wg.userData={lane:0,type:'wall',safeLane,active:true};
            this.scene.add(wg);this.obstacles.push(wg);return;
        }
        mesh.position.x=lane*2;mesh.position.z=50+Math.random()*10;
        mesh.userData={lane,type,active:true};this.scene.add(mesh);this.obstacles.push(mesh);
    }

    checkCollision(obs){
        if(obs.userData.type==='wall')return Math.abs(this.playerLane-obs.userData.safeLane)>0.3;
        const px=this.playerLane*2;if(Math.abs(obs.position.z)>1.2)return false;if(Math.abs(px-obs.position.x)>1.0)return false;
        const ph=this.ducking?0.6:1.8,pb=this.playerY,pt=pb+ph;
        if(obs.userData.type==='moving')return pt>(obs.position.y-0.4)&&pb<(obs.position.y+0.4);
        const oh=obs.geometry.parameters.height||0.5,oy=obs.position.y;
        return pt>(oy-oh/2)&&pb<(oy+oh/2);
    }
    checkCoinCollection(coin){
        const px=this.playerLane*2,dx=Math.abs(px-coin.position.x),dz=Math.abs(coin.position.z);
        if(this.magnetActive&&dz<8&&dx<6){const a=Math.atan2(-coin.position.z,px-coin.position.x);coin.position.x+=Math.cos(a)*0.3;coin.position.z+=Math.sin(a)*0.3;}
        if(dz<0.8&&dx<0.8){coin.userData.collected=true;this.collectCoin();return true;}return false;
    }
    collectCoin(){
        this.coinsCollected++;const bonus=Math.floor(10*this.comboMultiplier);this.distance+=bonus;this.playSound('coin');
        this.combo++;this.comboTimer=2.0;if(this.combo>this.maxCombo)this.maxCombo=this.combo;
        this.comboMultiplier=1+Math.floor(this.combo/5)*0.5;if(this.comboMultiplier>5)this.comboMultiplier=5;
        if(this.combo%5===0&&this.combo>0){this.playSound('combo');this.showNotification(`🔥 ${this.combo} 连击！ x${this.comboMultiplier}`,0xff6b35,1200);}
        for(let i=0;i<15;i++)this.particles.push({x:(Math.random()-0.5)*0.3,y:0.8+Math.random()*0.3,z:(Math.random()-0.5)*0.3,vx:(Math.random()-0.5)*3,vy:Math.random()*3+1,vz:(Math.random()-0.5)*3,life:20+Math.random()*15,maxLife:35,color:0xffd700});
        this.checkAchievements('coins');
    }
    checkPowerUpCollection(pu){
        const px=this.playerLane*2,dx=Math.abs(px-pu.position.x),dz=Math.abs(pu.position.z);
        if(dz<0.8&&dx<0.8){pu.userData.collected=true;this.applyPowerUp(pu.userData.type);const c=pu.userData.type==='shield'?0x00d4ff:pu.userData.type==='magnet'?0xffaa00:0xff4444;for(let i=0;i<20;i++)this.particles.push({x:(Math.random()-0.5)*0.3,y:0.8+Math.random()*0.3,z:(Math.random()-0.5)*0.3,vx:(Math.random()-0.5)*4,vy:Math.random()*4+1,vz:(Math.random()-0.5)*4,life:25+Math.random()*20,maxLife:45,color:c});return true;}return false;
    }

    createHUD(){
        this.hudContainer=document.createElement('div');this.hudContainer.style.cssText='position:absolute;top:0;left:0;right:0;padding:12px 16px;pointer-events:none;z-index:15;display:flex;justify-content:space-between;align-items:flex-start;';
        this.hudLeft=document.createElement('div');this.hudLeft.style.cssText='display:flex;flex-direction:column;gap:4px;';
        this.hudLeft.innerHTML='<div style="font-size:12px;color:rgba(255,255,255,0.5);">🏃 <span id="hudDist">0</span>m</div><div style="font-size:12px;color:rgba(255,255,255,0.5);">🪙 <span id="hudCoins">0</span></div>';
        this.hudRight=document.createElement('div');this.hudRight.style.cssText='text-align:right;';
        // 关卡标签
        const levelTag = this.gameMode==='level'&&this.currentLevel ? `<div style="font-size:10px;color:rgba(255,210,0,0.5);margin-bottom:2px;">第${this.currentLevel.id}关 · ${this.currentLevel.name}</div>` : '';
        this.hudRight.innerHTML=levelTag+'<div id="hudCombo" style="font-size:14px;font-weight:bold;color:rgba(255,255,255,0.4);min-height:20px;"></div><div id="hudPowerUp" style="font-size:11px;color:rgba(255,255,255,0.4);min-height:16px;"></div>';
        this.hudContainer.appendChild(this.hudLeft);this.hudContainer.appendChild(this.hudRight);
        this.container.appendChild(this.hudContainer);
        this.notifContainer=document.createElement('div');this.notifContainer.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:25;text-align:center;';this.container.appendChild(this.notifContainer);
        this.achievementContainer=document.createElement('div');this.achievementContainer.style.cssText='position:absolute;top:80px;left:50%;transform:translateX(-50%);pointer-events:none;z-index:25;text-align:center;';this.container.appendChild(this.achievementContainer);
    }

    updateHUD(){
        const de=document.getElementById('hudDist'),ce=document.getElementById('hudCoins');
        if(de)de.textContent=Math.floor(this.distance);if(ce)ce.textContent=this.coinsCollected;
        const co=document.getElementById('hudCombo');
        if(co){if(this.combo>=3){co.style.color='#ffd700';co.textContent=`🔥 ${this.combo}x (x${this.comboMultiplier.toFixed(1)})`;}else{co.style.color='rgba(255,255,255,0.4)';co.textContent='';}}
        const pu=document.getElementById('hudPowerUp');
        if(pu){const p=[];if(this.shieldActive)p.push(`🛡️ ${Math.ceil(this.shieldTimer)}s`);if(this.magnetActive)p.push(`🧲 ${Math.ceil(this.magnetTimer)}s`);if(this.speedEffect!==0)p.push(`${this.speedEffect>0?'⚡':'🐢'} ${Math.ceil(this.speedEffectTimer)}s`);pu.textContent=p.join(' · ');}
    }
    showNotification(text,color='#fff',duration=1000){
        const el=document.createElement('div');el.textContent=text;
        el.style.cssText=`font-size:22px;font-weight:bold;color:${typeof color==='number'?'#'+color.toString(16).padStart(6,'0'):color};text-shadow:0 2px 10px rgba(0,0,0,0.5);opacity:0;transform:translateY(10px);transition:all 0.3s ease;`;
        this.notifContainer.appendChild(el);
        requestAnimationFrame(()=>{el.style.opacity='1';el.style.transform='translateY(0)';});
        setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(-20px)';setTimeout(()=>el.remove(),300);},duration);
    }
    showAchievement(name,icon){
        if(this.achievementNotifs.includes(name))return;this.achievementNotifs.push(name);
        const el=document.createElement('div');el.style.cssText='background:linear-gradient(135deg,rgba(255,210,0,0.2),rgba(255,210,0,0.05));border:1px solid rgba(255,210,0,0.3);border-radius:12px;padding:10px 20px;margin-bottom:8px;backdrop-filter:blur(8px);opacity:0;transform:translateX(50px);transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1);white-space:nowrap;';
        el.innerHTML=`<span style="font-size:24px;margin-right:8px;">${icon}</span><span style="font-size:14px;color:#ffd700;font-weight:bold;">成就解锁!</span><span style="font-size:12px;color:#fff;margin-left:6px;">${name}</span>`;
        this.achievementContainer.appendChild(el);
        requestAnimationFrame(()=>{el.style.opacity='1';el.style.transform='translateX(0)';});
        this.playSound('achievement');
        setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(50px)';setTimeout(()=>el.remove(),500);},3000);
    }
    loadAchievements(){try{return JSON.parse(localStorage.getItem('runner_achievements_v2'))||{};}catch{return {};}}
    saveAchievements(d){try{localStorage.setItem('runner_achievements_v2',JSON.stringify(d));}catch{}}
    checkAchievements(trigger){
        let d=this.loadAchievements();
        if(trigger==='distance'){const dist=Math.floor(this.distance);for(const m of[{id:'dist_100',name:'初跑者',icon:'🏃',req:100},{id:'dist_500',name:'长跑健将',icon:'🏃‍♂️',req:500},{id:'dist_1000',name:'马拉松选手',icon:'🏆',req:1000},{id:'dist_2000',name:'极限跑者',icon:'🌟',req:2000}])if(!d[m.id]&&dist>=m.req){d[m.id]=true;this.showAchievement(m.name,m.icon);}}
        else if(trigger==='coins'){d.totalCoins=(d.totalCoins||0)+1;for(const m of[{id:'coin_50',name:'金币新手',icon:'🪙',req:50},{id:'coin_200',name:'金币收藏家',icon:'💰',req:200},{id:'coin_500',name:'金币大亨',icon:'👑',req:500}])if(!d[m.id]&&d.totalCoins>=m.req){d[m.id]=true;this.showAchievement(m.name,m.icon);}d.totalCoins=Math.max(d.totalCoins,this.coinsCollected);}
        else if(trigger==='combo'){if(!d.combo_20&&this.maxCombo>=20){d.combo_20=true;this.showAchievement('连击大师','🔥');}}
        else if(trigger==='death'){d.deathCount=(d.deathCount||0)+1;if(!d.death_1&&d.deathCount>=1){d.death_1=true;this.showAchievement('第一次碰撞','💥');}if(!d.death_50&&d.deathCount>=50){d.death_50=true;this.showAchievement('不屈不挠','💪');}}
        else if(trigger==='powerup'){d.powerUpCount=(d.powerUpCount||0)+1;if(!d.pu_1&&d.powerUpCount>=1){d.pu_1=true;this.showAchievement('能量满满','⚡');}if(!d.pu_50&&d.powerUpCount>=50){d.pu_50=true;this.showAchievement('能量大师','⚡');}}
        this.saveAchievements(d);
    }

    update(delta){
        if(this.gameOver)return;
        const dt=Math.min(delta/1000,0.05);
        this.distance+=this.speed*dt;this.score=Math.floor(this.distance);
        gamesManager.updateScore(this.score);

        let sm=1;if(this.speedEffect>0)sm=1.4;else if(this.speedEffect<0)sm=0.6;
        this.speed=Math.min((this.baseSpeed+(this.distance/100)*0.3)*sm,this.levelSpeedCap);
        this.spawnInterval=Math.max(0.4,1.8-this.distance*0.0003);

        if(this.shieldActive){this.shieldTimer-=dt;if(this.shieldTimer<=0){this.shieldActive=false;this.shieldTimer=0;}}
        if(this.magnetActive){this.magnetTimer-=dt;if(this.magnetTimer<=0){this.magnetActive=false;this.magnetTimer=0;}}
        if(this.speedEffect!==0){this.speedEffectTimer-=dt;if(this.speedEffectTimer<=0){this.speedEffect=0;this.speedEffectTimer=0;}}
        if(this.combo>0){this.comboTimer-=dt;if(this.comboTimer<=0){this.combo=0;this.comboMultiplier=1;}}

        if(!this.grounded){
            this.playerVelY+=this.gravity*dt;this.playerY+=this.playerVelY*dt;
            if(this.playerY<=0){this.playerY=0;this.playerVelY=0;this.grounded=true;this.jumpsLeft=this.maxJumps;for(let i=0;i<6;i++)this.particles.push({x:(Math.random()-0.5)*1.5,y:0.05,z:(Math.random()-0.5)*1.5,vx:(Math.random()-0.5)*2,vy:Math.random()*1.5,vz:(Math.random()-0.5)*2,life:15+Math.random()*15,maxLife:30,color:this.currentSkin.accent});}
        }
        this.playerGroup.scale.y+=((this.ducking&&this.grounded?0.55:1)-this.playerGroup.scale.y)*0.15;
        this.playerLane+=(this.targetLane-this.playerLane)*this.laneChangeSpeed;
        this.playerGroup.position.x=this.playerLane*2;this.playerGroup.position.y=this.playerY;

        this.runPhase+=this.speed*dt*2;
        if(this.grounded&&!this.ducking){this.leftLeg.rotation.x=Math.sin(this.runPhase)*0.5;this.rightLeg.rotation.x=Math.sin(this.runPhase+Math.PI)*0.5;}
        else{this.leftLeg.rotation.x=-0.3;this.rightLeg.rotation.x=-0.3;}

        this.playerGroup.children.forEach(c=>{if(c.material&&c.material.emissiveIntensity!==undefined)c.material.emissiveIntensity=this.doubleJumpEffect?0.6:(c.material.emissiveIntensity>0.2?0.15:c.material.emissiveIntensity);});
        if(this.shieldMesh){this.shieldMesh.visible=this.shieldActive;if(this.shieldActive){this.shieldMesh.rotation.x+=dt*1.5;this.shieldMesh.rotation.y+=dt*2;this.shieldMesh.material.opacity=0.15+Math.sin(performance.now()*0.005)*0.1;}}

        // 生成（根据关卡配置）
        this.coinSpawnTimer+=dt;
        if(this.levelHasCoins&&this.coinSpawnTimer>=this.coinSpawnInterval){this.coinSpawnTimer=0;this.spawnCoin();}
        this.powerUpSpawnTimer+=dt;
        if(this.levelHasPowers&&this.powerUpSpawnTimer>=this.powerUpSpawnInterval){this.powerUpSpawnTimer=0;if(Math.random()<0.5)this.spawnPowerUp();}
        this.spawnTimer+=dt;
        if(this.spawnTimer>=this.spawnInterval){this.spawnTimer=0;this.spawnObstacle();if(this.distance>200&&Math.random()<0.25)setTimeout(()=>{if(!this.gameOver)this.spawnObstacle();},300);}

        const mv=this.speed*dt;
        for(let i=this.obstacles.length-1;i>=0;i--){
            const o=this.obstacles[i];o.position.z-=mv;
            if(o.userData.type==='moving'){o.userData.movePhase=(o.userData.movePhase||0)+dt*o.userData.moveSpeed;o.position.x=o.userData.startX+Math.sin(o.userData.movePhase)*o.userData.moveRange;}
            if(o.position.z>-3&&o.position.z<3&&o.userData.active!==false){
                if(this.checkCollision(o)){
                    o.userData.active=false;
                    if(this.shieldActive){this.shieldActive=false;this.shieldTimer=0;this.playSound('powerUp');this.showNotification('🛡️ 护盾抵消！',0x00d4ff,1000);for(let i=0;i<25;i++)this.particles.push({x:o.position.x+(Math.random()-0.5)*1,y:0.5+Math.random()*0.5,z:(Math.random()-0.5)*1,vx:(Math.random()-0.5)*5,vy:Math.random()*4+1,vz:(Math.random()-0.5)*5,life:20+Math.random()*20,maxLife:40,color:0x00d4ff});continue;}
                    this.gameOver=true;this.screenShake=10;this.playSound('crash');
                    for(let i=0;i<30;i++)this.particles.push({x:o.position.x+(Math.random()-0.5)*1,y:0.5+Math.random()*0.5,z:(Math.random()-0.5)*1,vx:(Math.random()-0.5)*8,vy:Math.random()*6+2,vz:(Math.random()-0.5)*8,life:30+Math.random()*30,maxLife:60,color:0xff4444});
                    this.playerGroup.children.forEach(c=>{if(c.material&&c.material.color)c.material.color.setHex(0xff0000);});
                    this.checkAchievements('death');this.checkAchievements('combo');this.checkAchievements('distance');
                    setTimeout(()=>this.endGame(),400);return;
                }
            }
            if(o.position.z<-6){this.scene.remove(o);this.obstacles.splice(i,1);}
        }

        for(let i=this.coins.length-1;i>=0;i--){const c=this.coins[i];if(c.userData.collected){this.scene.remove(c);this.coins.splice(i,1);continue;}c.position.z-=mv;c.rotation.y+=dt*3;c.userData.bobPhase+=dt*3;c.position.y=0.8+Math.sin(c.userData.bobPhase)*0.15;if(c.position.z>-2&&c.position.z<2)this.checkCoinCollection(c);if(c.position.z<-5){if(this.combo>0){this.combo=0;this.comboMultiplier=1;}this.scene.remove(c);this.coins.splice(i,1);}}
        for(let i=this.powerUps.length-1;i>=0;i--){const p=this.powerUps[i];if(p.userData.collected){this.scene.remove(p);this.powerUps.splice(i,1);continue;}p.position.z-=mv;p.rotation.y+=dt*2;p.rotation.x+=dt*1.5;p.userData.bobPhase+=dt*2;p.position.y=0.8+Math.sin(p.userData.bobPhase)*0.2;if(p.position.z>-2&&p.position.z<2)this.checkPowerUpCollection(p);if(p.position.z<-5){this.scene.remove(p);this.powerUps.splice(i,1);}}
        if(this.autoPlay&&!this.gameOver)this.autoPlayAI(dt);

        for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=5*dt;p.life--;if(p.life<=0)this.particles.splice(i,1);}
        if(this.grounded&&!this.gameOver)this.trail.push({x:this.playerGroup.position.x,y:0.05,z:0,life:20,maxLife:20});
        for(let i=this.trail.length-1;i>=0;i--){this.trail[i].life--;if(this.trail[i].life<=0)this.trail.splice(i,1);}

        this.groundOffset=(this.groundOffset+this.speed*dt)%3;
        this.laneLines.forEach(l=>{l.position.z-=this.speed*dt;if(l.position.z<-5)l.position.z+=65;});
        this.sceneryItems.forEach(s=>{s.position.z-=this.speed*dt*0.3;if(s.position.z<-10)s.position.z+=65+Math.random()*10;});

        const tz=-9-Math.min(this.speed*0.05,0.5),ty=5+this.playerY*0.3;
        this.camera.position.z+=(tz-this.camera.position.z)*0.05;this.camera.position.y+=(ty-this.camera.position.y)*0.05;
        if(this.screenShake>0){this.camera.position.x=Math.sin(performance.now()*0.05)*this.screenShake*0.01;this.camera.position.y+=Math.cos(performance.now()*0.07)*this.screenShake*0.01;this.screenShake*=0.95;if(this.screenShake<0.1)this.screenShake=0;}

        this.updateHUD();

        // 关卡进度更新
        if (this.gameMode === 'level' && this.currentLevel) {
            this.updateLevelProgress();
        }
    }

    autoPlayAI(dt){
        let nearestObs=null,nearestDist=Infinity;
        for(const o of this.obstacles){const dz=o.position.z;if(dz<-2||dz>25)continue;const ld=o.userData.type==='wall'?0:Math.abs(o.position.x-this.playerLane*2);if(ld>1.5&&o.userData.type!=='wall')continue;if(dz<nearestDist){nearestDist=dz;nearestObs=o;}}
        if(nearestObs&&nearestDist<14){
            const t=nearestObs.userData.type||'';
            if(t==='wall'){this.targetLane=nearestObs.userData.safeLane;return;}
            if(nearestDist<12){let best=this.playerLane,bs=-Infinity;for(const l of[-1,0,1]){let s=3-Math.abs(l-this.playerLane),block=false;for(const o of this.obstacles){if(o.position.z>0&&o.position.z<16){if(o.userData.type==='wall'){if(o.userData.safeLane!==l)block=true;}else if(Math.abs(o.position.x-l*2)<1.2)block=true;}}if(block)s-=50;if(s>bs){bs=s;best=l;}}if(best!==this.playerLane){this.targetLane=best;return;}}
            if(nearestDist<6){const oy=nearestObs.position.y;if(oy>0.7||t==='float')this.ducking=true;else{this.doJump();if(nearestDist<3)this.doJump();}}
        }else{
            if(this.playerLane!==0&&Math.abs(this.targetLane)>0.5){let blocked=false;for(const o of this.obstacles){if(o.position.z>0&&o.position.z<15){if(o.userData.type==='wall'){if(o.userData.safeLane!==0){blocked=true;break;}}else if(Math.abs(o.position.x)<1){blocked=true;break;}}}if(!blocked)this.targetLane=0;}
            let nc=null,nd=Infinity;for(const c of this.coins){if(c.position.z>0&&c.position.z<10){const l=Math.round(c.position.x/2);if(Math.abs(l)<=1&&c.position.z<nd){nd=c.position.z;nc=c;}}}if(nc){const tl=Math.round(nc.position.x/2);if(tl>=-1&&tl<=1)this.targetLane=tl;}
        }
    }

    drawParticles(){
        while(this.particleMeshes&&this.particleMeshes.length>0)this.scene.remove(this.particleMeshes.pop());
        if(!this.particleMeshes)this.particleMeshes=[];
        const all=[...this.particles,...this.trail.map(t=>({...t,vx:0,vy:0,vz:0,color:this.currentSkin.accent}))];
        const vis=all.slice(0,60);
        if(vis.length>0){
            const pos=new Float32Array(vis.length*3),cols=new Float32Array(vis.length*3);
            for(let i=0;i<vis.length;i++){const p=vis[i];pos[i*3]=p.x;pos[i*3+1]=p.y;pos[i*3+2]=p.z;const c=new THREE.Color(p.color),f=Math.max(0,p.life/(p.maxLife||30));cols[i*3]=c.r*f;cols[i*3+1]=c.g*f;cols[i*3+2]=c.b*f;}
            if(this.particleSystem)this.scene.remove(this.particleSystem);
            const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(cols,3));
            this.particleSystem=new THREE.Points(g,new THREE.PointsMaterial({size:0.1,vertexColors:true,transparent:true,opacity:0.8,blending:THREE.AdditiveBlending,depthWrite:false}));this.scene.add(this.particleSystem);
        }
    }

    endGame(){
        this.running=false;
        window.removeEventListener('keydown',this._onKeyDown);window.removeEventListener('keyup',this._onKeyUp);
        if(this.glCanvas)this.glCanvas.removeEventListener('click',this._onClick);

        // 无尽模式保存最高分
        if (this.gameMode === 'endless') {
            const p = this.loadProgress();
            const best = p.endlessBest || 0;
            if (this.score > best) { p.endlessBest = this.score; this.saveProgress(p); }
        }

        gamesManager.gameOver();
    }

    stop(){
        this.running=false;
        window.removeEventListener('keydown',this._onKeyDown);window.removeEventListener('keyup',this._onKeyUp);
        if(this.autoLabel&&this.autoLabel.parentElement)this.autoLabel.remove();
        if(this.autoHint&&this.autoHint.parentElement)this.autoHint.remove();
        if(this.hudContainer&&this.hudContainer.parentElement)this.hudContainer.remove();
        if(this.notifContainer&&this.notifContainer.parentElement)this.notifContainer.remove();
        if(this.achievementContainer&&this.achievementContainer.parentElement)this.achievementContainer.remove();
        if(this.progressBar&&this.progressBar.parentElement)this.progressBar.remove();
        if(this.progressLabel&&this.progressLabel.parentElement)this.progressLabel.remove();
        if(this.renderer){this.renderer.dispose();this.renderer=null;}
        if(this.glCanvas&&this.glCanvas.parentElement)this.glCanvas.remove();
        if(this.canvas)this.canvas.style.display='';
        this.cleanupUI();
    }

    loop(time){
        const delta=time-this.lastTime;this.lastTime=time;
        if(!this.running&&!this.gameOver)return;
        if(!this.running){if(this.renderer&&this.scene&&this.camera)this.renderer.render(this.scene,this.camera);return;}
        if(gamesManager.checkPause()){if(this.renderer&&this.scene&&this.camera)this.renderer.render(this.scene,this.camera);gamesManager.animationId=requestAnimationFrame((t)=>this.loop(t));return;}
        this.update(delta);this.drawParticles();
        if(this.renderer&&this.scene&&this.camera)this.renderer.render(this.scene,this.camera);
        gamesManager.animationId=requestAnimationFrame((t)=>this.loop(t));
    }
}

gameInstances.runner = new RunnerGame();
