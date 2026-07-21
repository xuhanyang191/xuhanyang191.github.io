/**
 * 俄罗斯方块 🧩
 */
class TetrisGame {
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

        this.cols = 10;
        this.rows = 20;
        this.cellSize = canvas.width / (this.cols + 2); // 留边显示预览

        // 使用实际canvas宽度计算
        this.boardWidth = this.cols * this.cellSize;
        this.boardHeight = this.rows * this.cellSize;
        this.offsetX = (canvas.width - this.boardWidth) / 2;
        this.offsetY = (canvas.height - this.boardHeight) / 2;

        // 游戏板
        this.board = Array.from({length: this.rows}, () => Array(this.cols).fill(0));

        // 七种方块
        this.pieces = [
            // I
            { shape: [[1,1,1,1]], color: '#00d2ff' },
            // O
            { shape: [[1,1],[1,1]], color: '#ffd200' },
            // T
            { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
            // S
            { shape: [[0,1,1],[1,1,0]], color: '#2ed573' },
            // Z
            { shape: [[1,1,0],[0,1,1]], color: '#ff4757' },
            // L
            { shape: [[1,0,0],[1,1,1]], color: '#ffa502' },
            // J
            { shape: [[0,0,1],[1,1,1]], color: '#3498db' }
        ];

        this.dropInterval = 800; // 毫秒，随等级逐渐加快
        this.baseDropInterval = 800;
        this.lastDrop = performance.now();
        this.tickAccumulator = 0;

        this.spawnPiece();
        this.draw();

        this.keyHandler = (e) => {
            if (this.gameOver) return;
            switch (e.key) {
                case 'ArrowLeft': e.preventDefault(); this.movePiece(-1, 0); break;
                case 'ArrowRight': e.preventDefault(); this.movePiece(1, 0); break;
                case 'ArrowDown': e.preventDefault(); this.movePiece(0, 1); break;
                case 'ArrowUp': e.preventDefault(); this.rotatePiece(); break;
                case ' ': e.preventDefault(); this.hardDrop(); break;
            }
        };
        window.addEventListener('keydown', this.keyHandler);

        this.loop(performance.now());
    }

    handleInput(dir) {
        if (this.gameOver) return;
        switch (dir) {
            case 'left': this.movePiece(-1, 0); break;
            case 'right': this.movePiece(1, 0); break;
            case 'down': this.movePiece(0, 1); break;
            case 'up': case 'rotate': this.rotatePiece(); break;
            case 'drop': this.hardDrop(); break;
        }
    }

    spawnPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.randomPiece();
        }
        this.currentPiece = this.nextPiece;
        this.nextPiece = this.randomPiece();

        this.currentX = Math.floor((this.cols - this.currentPiece.shape[0].length) / 2);
        this.currentY = 0;

        if (this.collides(this.currentPiece.shape, this.currentX, this.currentY)) {
            this.endGame();
        }
    }

    randomPiece() {
        const idx = Math.floor(Math.random() * this.pieces.length);
        return { shape: this.pieces[idx].shape.map(r => [...r]), color: this.pieces[idx].color };
    }

    collides(shape, offX, offY) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardX = offX + c;
                    const boardY = offY + r;
                    if (boardX < 0 || boardX >= this.cols || boardY >= this.rows || boardY < 0) return true;
                    if (boardY >= 0 && this.board[boardY][boardX] !== 0) return true;
                }
            }
        }
        return false;
    }

    movePiece(dx, dy) {
        if (this.gameOver) return false;
        if (!this.currentPiece) return false;
        if (!this.collides(this.currentPiece.shape, this.currentX + dx, this.currentY + dy)) {
            this.currentX += dx;
            this.currentY += dy;
            this.draw();
            return true;
        }
        if (dy === 1) {
            this.lockPiece();
        }
        return false;
    }

    rotatePiece() {
        if (this.gameOver || !this.currentPiece) return;
        const shape = this.currentPiece.shape;
        const rotated = shape[0].map((_, idx) => shape.map(row => row[idx]).reverse());
        // 墙踢
        if (!this.collides(rotated, this.currentX, this.currentY)) {
            this.currentPiece.shape = rotated;
        } else if (!this.collides(rotated, this.currentX + 1, this.currentY)) {
            this.currentPiece.shape = rotated;
            this.currentX += 1;
        } else if (!this.collides(rotated, this.currentX - 1, this.currentY)) {
            this.currentPiece.shape = rotated;
            this.currentX -= 1;
        }
        this.draw();
    }

    hardDrop() {
        if (this.gameOver || !this.currentPiece) return;
        while (!this.collides(this.currentPiece.shape, this.currentX, this.currentY + 1)) {
            this.currentY++;
        }
        this.lockPiece();
    }

    lockPiece() {
        if (!this.currentPiece) return;
        const shape = this.currentPiece.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c]) {
                    const boardY = this.currentY + r;
                    const boardX = this.currentX + c;
                    if (boardY >= 0 && boardY < this.rows && boardX >= 0 && boardX < this.cols) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }

        // 消除满行
        let cleared = 0;
        for (let r = this.rows - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                this.board.splice(r, 1);
                this.board.unshift(Array(this.cols).fill(0));
                cleared++;
                r++; // 重新检查这一行
            }
        }

        if (cleared > 0) {
            const points = [0, 100, 300, 500, 800];
            this.score += points[Math.min(cleared, 4)];
            gamesManager.updateScore(this.score);
            // 每消 4 行加速一次（最快 200ms）
            this.totalLinesCleared = (this.totalLinesCleared || 0) + cleared;
            const level = Math.floor(this.totalLinesCleared / 4);
            this.dropInterval = Math.max(200, this.baseDropInterval - level * 60);
        }

        this.spawnPiece();
        this.tickAccumulator = 0; // 重置计时，新方块不会立刻下落
        this.draw();
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
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 游戏板背景
        ctx.fillStyle = '#0f0f1e';
        ctx.fillRect(this.offsetX, this.offsetY, this.boardWidth, this.boardHeight);

        // 已固定的方块
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c] !== 0) {
                    this.drawCell(this.offsetX + c * this.cellSize, this.offsetY + r * this.cellSize, this.board[r][c]);
                }
            }
        }

        // 当前方块
        if (this.currentPiece && !this.gameOver) {
            const shape = this.currentPiece.shape;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawCell(
                            this.offsetX + (this.currentX + c) * this.cellSize,
                            this.offsetY + (this.currentY + r) * this.cellSize,
                            this.currentPiece.color
                        );
                    }
                }
            }
        }

        // 网格线
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let r = 0; r <= this.rows; r++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX, this.offsetY + r * this.cellSize);
            ctx.lineTo(this.offsetX + this.boardWidth, this.offsetY + r * this.cellSize);
            ctx.stroke();
        }
        for (let c = 0; c <= this.cols; c++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX + c * this.cellSize, this.offsetY);
            ctx.lineTo(this.offsetX + c * this.cellSize, this.offsetY + this.boardHeight);
            ctx.stroke();
        }

        // 边框
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.offsetX, this.offsetY, this.boardWidth, this.boardHeight);

        // 预览下一个方块
        if (this.nextPiece) {
            const previewX = this.offsetX + this.boardWidth + 15;
            const previewY = this.offsetY + 10;
            const previewSize = this.cellSize * 0.6;

            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('下一个', previewX, previewY);

            const shape = this.nextPiece.shape;
            const color = this.nextPiece.color;
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (shape[r][c]) {
                        this.drawCell(
                            previewX + c * (previewSize + 2),
                            previewY + 20 + r * (previewSize + 2),
                            color,
                            previewSize
                        );
                    }
                }
            }
        }
    }

    drawCell(x, y, color, size) {
        const s = size || this.cellSize;
        const ctx = this.ctx;
        const margin = 1;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.roundRect(x + margin, y + margin, s - margin * 2, s - margin * 2, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(x + margin + 1, y + margin + 1, s - margin * 2 - 2, (s - margin * 2) * 0.3, 2);
        ctx.fill();
    }

    loop(timestamp) {
        if (!this.running && this.gameOver) return;
        if (!this.running) return;
        if (gamesManager.checkPause()) { gamesManager.animationId = requestAnimationFrame((t) => this.loop(t)); return; }

        if (!this.lastDrop) this.lastDrop = timestamp;
        const delta = timestamp - this.lastDrop;
        this.lastDrop = timestamp;
        this.tickAccumulator += delta;

        if (this.tickAccumulator >= this.dropInterval) {
            this.tickAccumulator -= this.dropInterval;
            if (!this.gameOver && this.currentPiece) {
                this.movePiece(0, 1);
            }
        }

        this.draw();
        gamesManager.animationId = requestAnimationFrame((t) => this.loop(t));
    }
}

gameInstances.tetris = new TetrisGame();
