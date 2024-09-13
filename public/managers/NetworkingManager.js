export class NetworkingManager {
    constructor() {
        this.socket = io();
    }

    onPlayerRegistered(callback) {
        this.socket.on('registerPlayer', callback);
    }

    onGameStateUpdate(callback) {
        this.socket.on('gameState', callback);
    }

    emitPlayerMove(position) {
        this.socket.emit('move', position);
    }
}
