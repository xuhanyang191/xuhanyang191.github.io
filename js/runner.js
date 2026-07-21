/**
 * 3D 跑酷 🏃 - Three.js 无限奔跑，支持二连跳
 */
class RunnerGame {
    constructor() {
        this.running = false;
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.container = canvas.parentElement;

        // 隐藏 2D canvas，创建 WebGL canvas
        canvas.style.display = 'none';
        this.glCanvas = document.createElement('canvas');
        this.glCanvas.style.cssText = 'max-width:100%;max-height:100%;border-radius:12px;';
        this.glCanvas.width = canvas.width;
        this.glCanvas.height = canvas.height;
        this.container.insertBefore(this.glCanvas, canvas);

        // === Three.js 场景 ===
        this.renderer = new THREE.WebGLRenderer({ canvas: this.glCanvas, antialias: true });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0f0f23);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0f0f23, 40, 80);

        const aspect = canvas.width / canvas.height;
        this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 100);
        this.camera.position.set(0, 5, -9);
        this.camera.lookAt(0, 0.5, 6);

        // === 灯光 ===
        const ambient = new THREE.AmbientLight(0x334466, 0.4);
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(8, 18, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        this.scene.add(dirLight);

        const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        rimLight.position.set(-5, 3, -10);
        this.scene.add(rimLight);

        // === 地面 ===
        this.createGround();

        // === 玩家 ===
        this.createPlayer();

        // === 围栏/跑道边界 ===
        this.createBarriers();

        // === 星空 ===
        this.createStars();

        // === 状态 ===
        this.score = 0;
        this.distance = 0;
        this.baseSpeed = 18;
        this.speed = this.baseSpeed;
        this.jumpsLeft = 2;
        this.maxJumps = 2;
        this.grounded = true;
        this.playerY = 0;
        this.playerVelY = 0;
        this.gravity = -40;
        this.jumpForce = 14;
        this.ducking = false;
        this.playerLane = 0; // -1, 0, 1
        this.targetLane = 0;
        this.laneChangeSpeed = 0.15;
        this.obstacles = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1.8;
        this.gameOver = false;
        this.running = true;
        this.runPhase = 0;
        this.groundOffset = 0;
        this.doubleJumpEffect = false;

        // === 按键 ===
        this.keys = {};
        this.autoPlay = false;
        this._onKeyDown = (e) => {
            if (this.gameOver) return;
            if (e.key === 'l' || e.key === 'L') {
                this.autoPlay = !this.autoPlay;
                if (this.autoLabel) {
                    this.autoLabel.style.display = this.autoPlay ? 'block' : 'none';
                }
                return;
            }
            if (this.autoPlay) return; // 自动模式忽略手动操作
            if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                this.doJump();
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.ducking = true;
            }
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                this.targetLane = Math.min(1, this.targetLane + 1);
            }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                this.targetLane = Math.max(-1, this.targetLane - 1);
            }
        };
        this._onKeyUp = (e) => {
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.ducking = false;
        };
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);

        // 自动模式指示器
        this.autoLabel = document.createElement('div');
        this.autoLabel.textContent = '🤖 AUTO';
        this.autoLabel.style.cssText = `
            position:absolute; top:12px; left:50%; transform:translateX(-50%);
            background:rgba(0,200,100,0.85); color:#fff; padding:4px 14px;
            border-radius:20px; font-size:13px; font-weight:bold;
            display:none; z-index:20; pointer-events:none;
            box-shadow:0 2px 10px rgba(0,200,100,0.4);
            letter-spacing:1px;
        `;
        this.container.style.position = 'relative';
        this.container.appendChild(this.autoLabel);

        // 自动模式操作提示
        this.autoHint = document.createElement('div');
        this.autoHint.textContent = '按 L 切换自动模式';
        this.autoHint.style.cssText = `
            position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
            color:rgba(255,255,255,0.3); font-size:11px;
            z-index:20; pointer-events:none;
        `;
        this.container.appendChild(this.autoHint);

        // 点击/触控跳跃
        this._onClick = () => { if (!this.gameOver) this.doJump(); };
        this.glCanvas.addEventListener('click', this._onClick);
        this.glCanvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (!this.gameOver) this.doJump(); }, { passive: false });

        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    handleInput(dir) {
        if (dir === 'up' || dir === 'fire') this.doJump();
        if (dir === 'down') this.ducking = true;
        if (dir === 'left') this.targetLane = Math.min(1, this.targetLane + 1);
        if (dir === 'right') this.targetLane = Math.max(-1, this.targetLane - 1);
    }

    doJump() {
        if (this.jumpsLeft <= 0) return;
        this.playerVelY = this.jumpForce * (this.jumpsLeft === 1 ? 0.88 : 1);
        this.jumpsLeft--;
        this.grounded = false;

        // 二连跳特效：闪一下
        if (this.jumpsLeft === 0) {
            this.doubleJumpEffect = true;
            setTimeout(() => { this.doubleJumpEffect = false; }, 300);
        }

        // 跳跃粒子
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: (Math.random() - 0.5) * 2,
                y: 0.1,
                z: (Math.random() - 0.5) * 2,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 1,
                vz: (Math.random() - 0.5) * 4,
                life: 25 + Math.random() * 20,
                maxLife: 45,
                color: this.jumpsLeft === 0 ? 0xffd700 : 0x4488ff
            });
        }
    }

    createGround() {
        // 主地面
        const groundGeo = new THREE.PlaneGeometry(12, 200);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a3e,
            roughness: 0.9,
            metalness: 0.1,
        });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.set(0, -0.05, 30);
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // 跑道纹理线 (用小的细长盒子)
        const lineMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a5e,
            emissive: 0x2222aa,
            emissiveIntensity: 0.15
        });
        this.laneLines = [];
        for (let z = -5; z < 65; z += 3) {
            for (let x = -1; x <= 1; x += 2) {
                const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 1.5), lineMat);
                line.position.set(x * 1.8, 0, z);
                this.scene.add(line);
                this.laneLines.push(line);
            }
        }

        // 前进方向引导光条
        const glowMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x4488ff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.15
        });
        this.glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 100), glowMat);
        this.glowStrip.position.set(0, 0, 30);
        this.scene.add(this.glowStrip);
    }

    createPlayer() {
        this.playerGroup = new THREE.Group();

        // 身体
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x1e90ff,
            emissive: 0x1e90ff,
            emissiveIntensity: 0.15,
            metalness: 0.3,
            roughness: 0.4
        });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        this.playerGroup.add(body);

        // 头部
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1
        });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), headMat);
        head.position.y = 1.6;
        head.castShadow = true;
        this.playerGroup.add(head);

        // 眼睛
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        for (let side of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
            eye.position.set(side * 0.15, 1.7, 0.25);
            this.playerGroup.add(eye);
        }

        // 眼珠高光
        const highlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        for (let side of [-1, 1]) {
            const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), highlightMat);
            h.position.set(side * 0.12, 1.72, 0.3);
            this.playerGroup.add(h);
        }

        // 腿
        const legMat = new THREE.MeshStandardMaterial({
            color: 0x1e90ff,
            roughness: 0.5
        });
        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), legMat);
        this.leftLeg.position.set(-0.2, 0.15, 0);
        this.leftLeg.castShadow = true;
        this.playerGroup.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.2), legMat);
        this.rightLeg.position.set(0.2, 0.15, 0);
        this.rightLeg.castShadow = true;
        this.playerGroup.add(this.rightLeg);

        // 围巾/披风（装饰）
        const scarfMat = new THREE.MeshStandardMaterial({
            color: 0xff6b6b,
            emissive: 0xff6b6b,
            emissiveIntensity: 0.2
        });
        const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.2), scarfMat);
        scarf.position.set(0, 1.2, -0.3);
        this.playerGroup.add(scarf);

        this.playerGroup.position.set(0, 0, 0);
        this.scene.add(this.playerGroup);
    }

    createBarriers() {
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a5e,
            transparent: true,
            opacity: 0.4,
            roughness: 0.8,
            metalness: 0.2
        });
        const wallGeo = new THREE.BoxGeometry(0.3, 1.5, 100);

        this.leftWall = new THREE.Mesh(wallGeo, wallMat);
        this.leftWall.position.set(-4.5, 0.75, 30);
        this.leftWall.receiveShadow = true;
        this.scene.add(this.leftWall);

        this.rightWall = new THREE.Mesh(wallGeo, wallMat);
        this.rightWall.position.set(4.5, 0.75, 30);
        this.rightWall.receiveShadow = true;
        this.scene.add(this.rightWall);

        // 霓虹灯条
        const neonMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x4488ff,
            emissiveIntensity: 0.8
        });
        const neonGeo = new THREE.BoxGeometry(0.05, 0.05, 100);
        const leftNeon = new THREE.Mesh(neonGeo, neonMat);
        leftNeon.position.set(-4.35, 1.3, 30);
        this.scene.add(leftNeon);
        const rightNeon = new THREE.Mesh(neonGeo, neonMat);
        rightNeon.position.set(4.35, 1.3, 30);
        this.scene.add(rightNeon);
    }

    createStars() {
        const starsGeo = new THREE.BufferGeometry();
        const count = 300;
        const pos = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 120;
            pos[i * 3 + 1] = Math.random() * 40 + 3;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 120 - 20;
            const c = 0.5 + Math.random() * 0.5;
            colors[i * 3] = c;
            colors[i * 3 + 1] = c;
            colors[i * 3 + 2] = c + Math.random() * 0.2;
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const starsMat = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        const stars = new THREE.Points(starsGeo, starsMat);
        this.scene.add(stars);
        this.starField = stars;
    }

    spawnObstacle() {
        const lane = Math.floor(Math.random() * 3) - 1;
        const type = Math.random();
        let mesh;

        if (type < 0.5) {
            // 高障碍（需要跳跃）- 像仙人掌
            const h = 0.8 + Math.random() * 0.6;
            const mat = new THREE.MeshStandardMaterial({
                color: 0xff6b6b,
                emissive: 0xff4444,
                emissiveIntensity: 0.15,
                roughness: 0.5,
                metalness: 0.3
            });
            mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, h, 0.5), mat);
            mesh.position.y = h / 2;
            mesh.castShadow = true;
            // 装饰环
            const ringMat = new THREE.MeshStandardMaterial({
                color: 0xffd700,
                emissive: 0xffa500,
                emissiveIntensity: 0.3
            });
            const ring = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.55), ringMat);
            ring.position.y = h * 0.6;
            mesh.add(ring);
        } else if (type < 0.8) {
            // 宽低障碍（需要跳跃）
            const mat = new THREE.MeshStandardMaterial({
                color: 0xa855f7,
                emissive: 0x7c3aed,
                emissiveIntensity: 0.15,
                roughness: 0.5
            });
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.8), mat);
            mesh.position.y = 0.2;
            mesh.castShadow = true;
        } else {
            // 浮空障碍（需要下蹲或跳跃）
            const mat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0ea5e9,
                emissiveIntensity: 0.2,
                roughness: 0.3,
                metalness: 0.4
            });
            mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.6), mat);
            mesh.position.y = 1.2;
            mesh.castShadow = true;
            // 发光环
            const glowMat = new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x38bdf8,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.8), glowMat);
            glow.position.y = -0.25;
            mesh.add(glow);
        }

        mesh.position.x = lane * 2;
        mesh.position.z = 50 + Math.random() * 10;
        mesh.userData = { lane: lane, active: true };
        this.scene.add(mesh);
        this.obstacles.push(mesh);
    }

    checkCollision(obs) {
        const px = this.playerLane * 2;
        const pz = 0; // 玩家在 Z=0
        const py = this.playerY;

        const ox = obs.position.x;
        const oz = obs.position.z;
        const oy = obs.position.y;

        // 障碍物尺寸
        const box = obs.geometry.parameters;
        const ow = box.width || 0.6;
        const oh = box.height || 0.5;
        const od = box.depth || 0.5;

        // Z 轴距离检测（玩家在 Z=0 附近）
        const dz = Math.abs(oz - pz);
        if (dz > 1.0) return false;

        // X 轴距离检测
        const dx = Math.abs(px - ox);
        const xThreshold = (ow + 0.8) / 2;
        if (dx > xThreshold) return false;

        // Y 轴检测 - 玩家矩形 vs 障碍物矩形
        const playerH = this.ducking ? 0.6 : 1.8;
        const playerBottom = py;
        const playerTop = py + playerH;
        const obsBottom = oy - oh / 2;
        const obsTop = oy + oh / 2;

        if (playerTop > obsBottom && playerBottom < obsTop) {
            return true;
        }
        return false;
    }

    update(delta) {
        if (this.gameOver) return;
        const dt = Math.min(delta / 1000, 0.05);

        // 速度递增
        this.distance += this.speed * dt;
        this.score = Math.floor(this.distance);
        gamesManager.updateScore(this.score);
        this.speed = this.baseSpeed + (this.distance / 100) * 0.3;
        this.speed = Math.min(this.speed, 22);
        this.spawnInterval = Math.max(0.5, 1.8 - this.distance * 0.0003);

        // 玩家物理
        if (!this.grounded) {
            this.playerVelY += this.gravity * dt;
            this.playerY += this.playerVelY * dt;
            if (this.playerY <= 0) {
                this.playerY = 0;
                this.playerVelY = 0;
                this.grounded = true;
                this.jumpsLeft = this.maxJumps;
                // 落地粒子
                for (let i = 0; i < 5; i++) {
                    this.particles.push({
                        x: (Math.random() - 0.5) * 1.5,
                        y: 0.05,
                        z: (Math.random() - 0.5) * 1.5,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 1.5,
                        vz: (Math.random() - 0.5) * 2,
                        life: 15 + Math.random() * 15,
                        maxLife: 30,
                        color: 0x4488ff
                    });
                }
            }
        }

        // 下蹲状态
        const targetScaleY = this.ducking && this.grounded ? 0.55 : 1;
        const currentScale = this.playerGroup.scale.y;
        this.playerGroup.scale.y += (targetScaleY - currentScale) * 0.15;

        // 横向移动
        this.playerLane += (this.targetLane - this.playerLane) * this.laneChangeSpeed;
        this.playerGroup.position.x = this.playerLane * 2;

        // 玩家垂直位置
        this.playerGroup.position.y = this.playerY;

        // 跑步动画
        this.runPhase += this.speed * dt * 2;
        if (this.grounded && !this.ducking) {
            this.leftLeg.rotation.x = Math.sin(this.runPhase) * 0.5;
            this.rightLeg.rotation.x = Math.sin(this.runPhase + Math.PI) * 0.5;
        } else {
            // 空中收腿
            this.leftLeg.rotation.x = -0.3;
            this.rightLeg.rotation.x = -0.3;
        }

        // 二连跳发光效果
        if (this.doubleJumpEffect) {
            this.playerGroup.children.forEach(child => {
                if (child.material) {
                    child.material.emissiveIntensity = 0.6;
                }
            });
        } else {
            this.playerGroup.children.forEach(child => {
                if (child.material && child.material.emissiveIntensity > 0.2) {
                    child.material.emissiveIntensity = 0.15;
                }
            });
        }

        // === 生成障碍物 ===
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle();
            // 难度增加后偶尔一次出两个
            if (this.distance > 200 && Math.random() < 0.2) {
                setTimeout(() => { if (!this.gameOver) this.spawnObstacle(); }, 300);
            }
        }

        // === 障碍物移动 ===
        const moveAmount = this.speed * dt;
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.position.z -= moveAmount;

            // 浮动障碍物上下浮动
            if (obs.position.y > 0.8) {
                obs.position.y += Math.sin(performance.now() * 0.003) * 0.003;
            }

            // 旋转装饰环
            obs.children.forEach(child => {
                if (child.geometry && child.geometry.parameters && child.geometry.parameters.width > 0.6) {
                    child.rotation.z += dt * 2;
                }
            });

            // 碰撞检测
            if (obs.position.z > -3 && obs.position.z < 3 && obs.userData.active) {
                if (this.checkCollision(obs)) {
                    obs.userData.active = false;
                    this.gameOver = true;
                    // 碰撞特效
                    for (let i = 0; i < 20; i++) {
                        this.particles.push({
                            x: obs.position.x + (Math.random() - 0.5) * 1,
                            y: 0.5 + Math.random() * 0.5,
                            z: (Math.random() - 0.5) * 1,
                            vx: (Math.random() - 0.5) * 6,
                            vy: Math.random() * 5 + 2,
                            vz: (Math.random() - 0.5) * 6,
                            life: 30 + Math.random() * 30,
                            maxLife: 60,
                            color: 0xff4444
                        });
                    }
                    // 闪烁红色
                    this.playerGroup.children.forEach(child => {
                        if (child.material) {
                            child.material.color.setHex(0xff0000);
                        }
                    });
                    setTimeout(() => this.endGame(), 300);
                    return;
                }
            }

            // 移除超出范围的障碍物
            if (obs.position.z < -5) {
                this.scene.remove(obs);
                this.obstacles.splice(i, 1);
            }
        }

        // === 自动跑酷 AI (按 L 切换) ===
        if (this.autoPlay && !this.gameOver) {
            this.autoPlayAI(dt);
        }

        // === 粒子更新 ===
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
            p.vy -= 5 * dt;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // === 地面光条移动 ===
        this.groundOffset = (this.groundOffset + this.speed * dt) % 3;
        this.laneLines.forEach(line => {
            line.position.z -= this.speed * dt;
            if (line.position.z < -5) {
                line.position.z += 65;
            }
        });

        // === 相机跟随 ===
        const targetCamZ = -9 - this.speed * 0.05;
        this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.05;
    }

    // === 自动跑酷 AI ===
    autoPlayAI(dt) {
        // 找玩家当前车道上最近的障碍物
        let nearestObs = null;
        let nearestDist = Infinity;

        for (const obs of this.obstacles) {
            const dz = obs.position.z;
            if (dz < -2 || dz > 25) continue;
            // 是否在玩家车道
            const laneDiff = Math.abs(obs.position.x - this.playerLane * 2);
            if (laneDiff > 1.3) continue;
            if (dz < nearestDist) {
                nearestDist = dz;
                nearestObs = obs;
            }
        }

        if (!nearestObs) {
            // 没障碍时自动回中间车道
            if (this.playerLane !== 0 && Math.abs(this.targetLane - 0) > 0.5) {
                // 看看中间车道前方有没有障碍
                let centerBlocked = false;
                for (const obs of this.obstacles) {
                    if (obs.position.z > 0 && obs.position.z < 15 &&
                        Math.abs(obs.position.x) < 1) {
                        centerBlocked = true;
                        break;
                    }
                }
                if (!centerBlocked) this.targetLane = 0;
            }
            return;
        }

        const oh = nearestObs.geometry.parameters.height || 0.5;
        const obsBottom = nearestObs.position.y - oh / 2;
        const obsTop = nearestObs.position.y + oh / 2;

        // 判断障碍类型
        const isFloating = nearestObs.position.y > 0.7;    // 浮空的 → 下蹲
        const isTall = !isFloating && obsBottom > 0.1;     // 高柱子 → 跳跃或躲开
        const isLow = !isFloating && !isTall;              // 低矮的 → 跳跃

        // 策略：先找安全车道
        if (nearestDist < 12) {
            let bestLane = this.playerLane;
            let bestScore = -Infinity;
            for (const lane of [-1, 0, 1]) {
                let score = 0;
                const laneX = lane * 2;
                // 越靠近当前车道分越高（少换道）
                score += 3 - Math.abs(lane - this.playerLane);
                // 检查这条车道前方有没有障碍
                let blocked = false;
                for (const obs of this.obstacles) {
                    if (obs.position.z > 0 && obs.position.z < 16 &&
                        Math.abs(obs.position.x - laneX) < 1.2) {
                        blocked = true;
                        break;
                    }
                }
                if (blocked) score -= 50;
                if (score > bestScore) {
                    bestScore = score;
                    bestLane = lane;
                }
            }
            if (bestLane !== this.playerLane) {
                this.targetLane = bestLane;
                return; // 换道躲避，先不跳
            }
        }

        // 换不了道，硬躲
        if (isTall) {
            // 高障碍 → 跳
            if (nearestDist < 6) {
                this.doJump();
                if (nearestDist < 3) this.doJump(); // 太近了二连跳
            }
        } else if (isFloating) {
            // 浮空障碍 → 下蹲
            if (nearestDist < 6) {
                this.ducking = true;
            }
        } else {
            // 低障碍 → 跳
            if (nearestDist < 5) {
                this.doJump();
            }
        }
    }

    drawParticles() {
        // 用简单的 sprite 或 points 渲染粒子
        // 简化处理：用小球体（性能考虑只显示少量）
        // 这里我们用临时小球体
        while (this.particleMeshes && this.particleMeshes.length > 0) {
            this.scene.remove(this.particleMeshes.pop());
        }
        if (!this.particleMeshes) this.particleMeshes = [];

        // 限制粒子数量
        const visible = this.particles.slice(0, 30);

        // 为了性能，用 Points
        if (visible.length > 0) {
            const positions = new Float32Array(visible.length * 3);
            const colors = new Float32Array(visible.length * 3);
            const sizes = new Float32Array(visible.length);

            for (let i = 0; i < visible.length; i++) {
                const p = visible[i];
                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = p.z;
                const c = new THREE.Color(p.color);
                colors[i * 3] = c.r * (p.life / p.maxLife);
                colors[i * 3 + 1] = c.g * (p.life / p.maxLife);
                colors[i * 3 + 2] = c.b * (p.life / p.maxLife);
                sizes[i] = 0.08 * (p.life / p.maxLife);
            }

            if (this.particleSystem) {
                this.scene.remove(this.particleSystem);
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            const mat = new THREE.PointsMaterial({
                size: 0.1,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            this.particleSystem = new THREE.Points(geo, mat);
            this.scene.add(this.particleSystem);
        }
    }

    endGame() {
        this.running = false;
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        if (this.glCanvas) {
            this.glCanvas.removeEventListener('click', this._onClick);
        }
        gamesManager.gameOver();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);

        // 清理自动模式 UI
        if (this.autoLabel && this.autoLabel.parentElement) this.autoLabel.remove();
        if (this.autoHint && this.autoHint.parentElement) this.autoHint.remove();

        // 清理 Three.js
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }
        // 移除 WebGL canvas，恢复原 2D canvas
        if (this.glCanvas && this.glCanvas.parentElement) {
            this.glCanvas.remove();
        }
        if (this.canvas) {
            this.canvas.style.display = '';
        }
    }

    loop(time) {
        const delta = time - this.lastTime;
        this.lastTime = time;

        if (!this.running && !this.gameOver) return;
        if (!this.running) {
            // 游戏结束但还要渲染一帧显示碰撞效果
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            return;
        }

        if (gamesManager.checkPause()) {
            if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
            gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
            return;
        }

        this.update(delta);
        this.drawParticles();

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.runner = new RunnerGame();
