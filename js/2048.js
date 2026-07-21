/**
 * 2048 🔢
 */
class Game2048 {
    constructor() {
        this.running = false;
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.score = 0;
        this.running = true;
        this.gameOver = false;
        this.won = false;

        this.size = 4;
        this.grid = Array.from({length: this.size}, () => Array(this.size).fill(0));
        this.tileSize = canvas.width / this.size - 8;
        this.animations = [];

        this.addRandomTile();
        this.addRandomTile();

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
                this.move(dir);
            }
        };
        window.addEventListener('keydown', this.keyHandler);

        // 触控滑动
        this.touchStart = null;
        this.touchHandler = (e) => {
            const touch = e.touches[0];
            if (e.type === 'touchstart') {
                this.touchStart = { x: touch.clientX, y: touch.clientY };
            } else if (e.type === 'touchend' && this.touchStart) {
                const dx = touch.clientX - this.touchStart.x;
                const dy = touch.clientY - this.touchStart.y;
                const absDx = Math.abs(dx);
                const absDy = Math.abs(dy);
                if (Math.max(absDx, absDy) > 30) {
                    if (absDx > absDy) {
                        this.move(dx > 0 ? 'right' : 'left');
                    } else {
                        this.move(dy > 0 ? 'down' : 'up');
                    }
                }
                this.touchStart = null;
            }
        };
        canvas.addEventListener('touchstart', this.touchHandler);
        canvas.addEventListener('touchend', this.touchHandler);

        this.draw();
    }

    handleInput(dir) {
        this.move(dir);
    }

    addRandomTile() {
        const empty = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) empty.push([r, c]);
            }
        }
        if (empty.length === 0) return;
        const [r, c] = empty[Math.floor(Math.random() * empty.length)];
        this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    slideRow(row) {
        // 去掉0
        let arr = row.filter(v => v !== 0);
        let merged = false;
        // 合并相邻相同
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                this.score += arr[i];
                gamesManager.updateScore(this.score);
                arr.splice(i + 1, 1);
                merged = true;
            }
        }
        // 补0
        while (arr.length < this.size) arr.push(0);
        return { arr, merged };
    }

    move(direction) {
        if (this.gameOver || this.won) return;

        const old = this.grid.map(r => [...r]);
        let moved = false;

        if (direction === 'left') {
            for (let r = 0; r < this.size; r++) {
                const { arr, merged } = this.slideRow(this.grid[r]);
                this.grid[r] = arr;
                if (merged) moved = true;
            }
        } else if (direction === 'right') {
            for (let r = 0; r < this.size; r++) {
                const reversed = [...this.grid[r]].reverse();
                const { arr, merged } = this.slideRow(reversed);
                this.grid[r] = arr.reverse();
                if (merged) moved = true;
            }
        } else if (direction === 'up') {
            for (let c = 0; c < this.size; c++) {
                const col = this.grid.map(row => row[c]);
                const { arr, merged } = this.slideRow(col);
                for (let r = 0; r < this.size; r++) {
                    this.grid[r][c] = arr[r];
                }
                if (merged) moved = true;
            }
        } else if (direction === 'down') {
            for (let c = 0; c < this.size; c++) {
                const col = this.grid.map(row => row[c]).reverse();
                const { arr, merged } = this.slideRow(col);
                const result = arr.reverse();
                for (let r = 0; r < this.size; r++) {
                    this.grid[r][c] = result[r];
                }
                if (merged) moved = true;
            }
        }

        // 检查是否真的有变化
        if (!moved) {
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    if (this.grid[r][c] !== old[r][c]) moved = true;
                }
            }
        }

        if (moved) {
            this.addRandomTile();
            this.draw();

            // 检查胜利
            for (let r = 0; r < this.size; r++) {
                for (let c = 0; c < this.size; c++) {
                    if (this.grid[r][c] >= 2048) {
                        this.won = true;
                    }
                }
            }

            if (this.won) {
                // 可以继续玩，但显示胜利
            }

            // 检查游戏结束
            if (this.isGameOver()) {
                this.endGame();
            }
        }
    }

    isGameOver() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.grid[r][c] === 0) return false;
                if (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1]) return false;
                if (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) return false;
            }
        }
        return true;
    }

    endGame() {
        this.gameOver = true;
        this.running = false;
        window.removeEventListener('keydown', this.keyHandler);
        this.canvas.removeEventListener('touchstart', this.touchHandler);
        this.canvas.removeEventListener('touchend', this.touchHandler);
        gamesManager.gameOver();
    }

    stop() {
        this.running = false;
        window.removeEventListener('keydown', this.keyHandler);
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this.touchHandler);
            this.canvas.removeEventListener('touchend', this.touchHandler);
        }
    }

    getTileColor(value) {
        const colors = {
            0: '#1a1a2e', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
            16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
            256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
            4096: '#3c3a3d', 8192: '#3c3a3d'
        };
        return colors[value] || '#1a1a2e';
    }

    getTextColor(value) {
        return value <= 4 ? '#776e65' : '#f9f6f2';
    }

    draw() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 网格背景
        const gap = 6;
        const size = (canvas.width - gap * 5) / this.size;

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const x = gap + c * (size + gap);
                const y = gap + r * (size + gap);
                const value = this.grid[r][c];

                // 格子背景
                ctx.fillStyle = this.getTileColor(value);
                ctx.shadowColor = value > 0 ? 'rgba(255,255,255,0.1)' : 'transparent';
                ctx.shadowBlur = value > 128 ? 8 : 0;
                ctx.beginPath();
                ctx.roundRect(x, y, size, size, 6);
                ctx.fill();
                ctx.shadowBlur = 0;

                // 数字
                if (value > 0) {
                    ctx.fillStyle = this.getTextColor(value);
                    ctx.font = `bold ${value >= 1000 ? size * 0.32 : size * 0.4}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value, x + size/2, y + size/2);
                }
            }
        }
    }

    loop() {
        // 2048 是事件驱动的，不需要循环
    }
}

gameInstances.game2048 = new Game2048();
