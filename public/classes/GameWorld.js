export class GameWorld {
    constructor() {
        this.players = {};
    }

    addPlayer(id, color) {
        // Create a simple object to track player positions on the server
        this.players[id] = { id, color, x: 0, z: 0 };
    }

    removePlayer(id) {
        delete this.players[id];
    }

    updatePlayerPosition(id, x, z) {
        if (this.players[id]) {
            // Update the player's position without using THREE.Vector3
            this.players[id].x = x;
            this.players[id].z = z;
        }
    }

    getPlayers() {
        return this.players;
    }
}
