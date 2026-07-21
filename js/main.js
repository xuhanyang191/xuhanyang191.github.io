/**
 * 主入口 - 绑定游戏大厅事件
 */
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.game-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const gameId = card.dataset.game;
            const gameInstance = gameInstances[gameId];
            if (gameInstance) {
                gamesManager.startGame(gameId, gameInstance);
            }
        });
    });

    // 键盘快捷键显示游戏大厅的标签
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gamesManager.currentGame) {
            gamesManager.backToLobby();
        }
    });
});

// gameInstances 已在 games.js 中声明
