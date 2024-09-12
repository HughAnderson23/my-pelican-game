import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameWorld } from './public/classes/GameWorld.js'; // Make sure this path is correct

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/node_modules', express.static('node_modules'));

const gameWorld = new GameWorld();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    gameWorld.addPlayer(socket.id, 0x3498db);

    socket.emit('registerPlayer', {
        id: socket.id,
        position: { x: 0, z: 0 }
    });

    socket.on('move', (data) => {
        gameWorld.updatePlayerPosition(socket.id, data.x, data.z);
        io.emit('gameState', { players: gameWorld.getPlayers() });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        gameWorld.removePlayer(socket.id);
        io.emit('gameState', { players: gameWorld.getPlayers() });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
