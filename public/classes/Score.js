class Score {
    constructor() {
        this.scores = {};
    }

    updateScore(playerId, points) {
        if (!this.scores[playerId]) this.scores[playerId] = 0;
        this.scores[playerId] += points;
    }

    getScore(playerId) {
        return this.scores[playerId] || 0;
    }
}
