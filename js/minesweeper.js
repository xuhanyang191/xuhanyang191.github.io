/**
 * 扫雷 💣
 * 左键: 揭开  |  右键/Shift+左键: 标旗  |  手机: 长按标旗
 */
class MinesweeperGame {
    constructor() {
        this.running = false;
    }

    start(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.score = 0;
        this.running = true;
        this.gameOver = false;

        this.rows = 10;
        this.cols = 10;
        this.mineCount = 15;
        this.cellSize = Math.floor(canvas.width / this.cols);
        this.firstClick = true;
        this.flagCount = 0;

        // 偏移让网格居中
        this.boardSize = this.cellSize * this.cols;
        this.offsetX = Math.floor((canvas.width - this.boardSize) / 2);
        this.offsetY = Math.floor((canvas.height - this.boardSize) / 2);

        // 格子数据
        this.grid = Array.from({length: this.rows}, () =>
            Array.from({length: this.cols}, () => ({
                mine: false, revealed: false, flagged: false, adjacent: 0
            }))
        );

        this.draw();

        // === 鼠标事件 ===
        this._clickHandler = (e) => {
            const [col, row] = this.getGridPos(e.clientX, e.clientY);
            if (col === -1 || row === -1) return;
            if (e.shiftKey) {
                this.toggleFlag(col, row);
            } else {
                this.reveal(col, row);
            }
        };

        this._contextHandler = (e) => {
            e.preventDefault();
            const [col, row] = this.getGridPos(e.clientX, e.clientY);
            if (col === -1 || row === -1) return;
            this.toggleFlag(col, row);
        };

        canvas.addEventListener('click', this._clickHandler);
        canvas.addEventListener('contextmenu', this._contextHandler);

        // === 触摸事件（长按标旗） ===
        this._touchTimeout = null;
        this._touchStartPos = null;

        this._touchStartHandler = (e) => {
            const touch = e.touches[0];
            this._touchStartPos = { x: touch.clientX, y: touch.clientY };
            this._touchTimeout = setTimeout(() => {
                // 长按 → 标旗
                if (this._touchStartPos) {
                    const [col, row] = this.getGridPos(this._touchStartPos.x, this._touchStartPos.y);
                    if (col !== -1 && row !== -1) {
                        this.toggleFlag(col, row);
                    }
                }
                this._touchStartPos = null;
            }, 500);
        };

        this._touchMoveHandler = (e) => {
            if (this._touchStartPos) {
                const touch = e.touches[0];
                const dx = touch.clientX - this._touchStartPos.x;
                const dy = touch.clientY - this._touchStartPos.y;
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    clearTimeout(this._touchTimeout);
                    this._touchStartPos = null;
                }
            }
        };

        this._touchEndHandler = (e) => {
            clearTimeout(this._touchTimeout);
            if (this._touchStartPos) {
                // 短按 → 揭开
                const [col, row] = this.getGridPos(this._touchStartPos.x, this._touchStartPos.y);
                if (col !== -1 && row !== -1) {
                    this.reveal(col, row);
                }
            }
            this._touchStartPos = null;
        };

        canvas.addEventListener('touchstart', this._touchStartHandler, { passive: true });
        canvas.addEventListener('touchmove', this._touchMoveHandler, { passive: true });
        canvas.addEventListener('touchend', this._touchEndHandler);
    }

    // 将鼠标/触摸坐标转换为网格位置
    getGridPos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (clientX - rect.left) * (this.canvas.width / rect.width);
        const my = (clientY - rect.top) * (this.canvas.height / rect.height);
        const col = Math.floor((mx - this.offsetX) / this.cellSize);
        const row = Math.floor((my - this.offsetY) / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return [-1, -1];
        return [col, row];
    }

    initMines(safeCol, safeRow) {
        let placed = 0;
        while (placed < this.mineCount) {
            const r = Math.floor(Math.random() * this.rows);
            const c = Math.floor(Math.random() * this.cols);
            if (this.grid[r][c].mine) continue;
            // 首次点击周围 3x3 范围不出雷
            if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue;
            this.grid[r][c].mine = true;
            placed++;
        }

        // 计算相邻雷数
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].mine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.grid[nr][nc].mine) {
                            count++;
                        }
                    }
                }
                this.grid[r][c].adjacent = count;
            }
        }
    }

    reveal(col, row) {
        if (this.gameOver) return;
        const cell = this.grid[row][col];
        if (cell.revealed || cell.flagged) return;

        if (this.firstClick) {
            this.initMines(col, row);
            this.firstClick = false;
        }

        if (cell.mine) {
            cell.revealed = true;
            this.draw();
            setTimeout(() => this.endGame(false), 200);
            return;
        }

        // BFS 展开
        const stack = [[col, row]];
        while (stack.length > 0) {
            const [c, r] = stack.pop();
            const cur = this.grid[r][c];
            if (cur.revealed || cur.flagged) continue;
            cur.revealed = true;
            this.score += 5;
            gamesManager.updateScore(this.score);

            if (cur.adjacent === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                            const neighbor = this.grid[nr][nc];
                            if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) {
                                stack.push([nc, nr]);
                            }
                        }
                    }
                }
            }
        }

        this.draw();
        this.checkWin();
    }

    toggleFlag(col, row) {
        if (this.gameOver) return;
        const cell = this.grid[row][col];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        this.flagCount += cell.flagged ? 1 : -1;
        this.draw();
    }

    checkWin() {
        let revealed = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c].revealed) revealed++;
            }
        }
        if (revealed === this.rows * this.cols - this.mineCount) {
            // 自动标旗所有雷
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c].mine) this.grid[r][c].flagged = true;
                }
            }
            this.draw();
            setTimeout(() => this.endGame(true), 300);
        }
    }

    endGame(win) {
        if (this.gameOver) return;
        this.gameOver = true;
        this.running = false;

        // 清理事件
        this.canvas.removeEventListener('click', this._clickHandler);
        this.canvas.removeEventListener('contextmenu', this._contextHandler);
        this.canvas.removeEventListener('touchstart', this._touchStartHandler);
        this.canvas.removeEventListener('touchmove', this._touchMoveHandler);
        this.canvas.removeEventListener('touchend', this._touchEndHandler);

        if (win) {
            this.score += 200;
            gamesManager.updateScore(this.score);
        } else {
            // 显示所有雷
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c].mine) this.grid[r][c].revealed = true;
                }
            }
        }
        this.draw();
        setTimeout(() => gamesManager.gameOver(), 100);
    }

    stop() {
        this.running = false;
        if (this.canvas) {
            this.canvas.removeEventListener('click', this._clickHandler);
            this.canvas.removeEventListener('contextmenu', this._contextHandler);
            this.canvas.removeEventListener('touchstart', this._touchStartHandler);
            this.canvas.removeEventListener('touchmove', this._touchMoveHandler);
            this.canvas.removeEventListener('touchend', this._touchEndHandler);
        }
    }

    draw() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cs = this.cellSize;
        const ox = this.offsetX;
        const oy = this.offsetY;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const x = ox + c * cs;
                const y = oy + r * cs;
                const cell = this.grid[r][c];

                if (cell.revealed) {
                    if (cell.mine) {
                        // 雷 - 红色背景
                        ctx.fillStyle = '#ff475788';
                        ctx.fillRect(x, y, cs, cs);
                        ctx.font = `${cs * 0.55}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('💣', x + cs/2, y + cs/2);
                    } else {
                        // 已揭开
                        ctx.fillStyle = '#2a2a4e';
                        ctx.fillRect(x, y, cs, cs);
                        if (cell.adjacent > 0) {
                            const colors = ['', '#3498db', '#2ed573', '#ff4757', '#a855f7', '#ffa502', '#1e90ff', '#fff', '#ffd200'];
                            ctx.fillStyle = colors[cell.adjacent] || '#fff';
                            ctx.font = `bold ${cs * 0.4}px sans-serif`;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(cell.adjacent, x + cs/2, y + cs/2);
                        }
                    }
                } else {
                    // 未揭开
                    ctx.fillStyle = '#3a3a5e';
                    ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
                    // 立体效果
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.beginPath();
                    ctx.moveTo(x + 1, y + 1);
                    ctx.lineTo(x + cs - 1, y + 1);
                    ctx.lineTo(x + 1, y + cs - 1);
                    ctx.closePath();
                    ctx.fill();

                    if (cell.flagged) {
                        ctx.font = `${cs * 0.5}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🚩', x + cs/2, y + cs/2);
                    }
                }

                // 网格线
                ctx.strokeStyle = 'rgba(255,255,255,0.08)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cs, cs);
            }
        }

        // 雷计数器
        const remaining = this.mineCount - this.flagCount;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`💣 ${remaining}`, ox, oy + this.boardSize + 8);
    }

    loop() {}
}

gameInstances.minesweeper = new MinesweeperGame();
