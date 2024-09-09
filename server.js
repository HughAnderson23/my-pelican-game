const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// MongoDB connection (optional)
mongoose.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Track connected players
let players = {}; // Store player information
let scoops = []; // Store scoops
let sharkPools = []; // Store shark pools
const MAX_PLAYERS = 20; // Max players allowed in the game

// Function to generate scoops and shark pools
function generateObjects() {
    for (let i = 0; i < 20; i++) {
        scoops.push({ x: Math.random() * 100 - 50, z: Math.random() * 100 - 50 });
    }
    for (let i = 0; i < 3; i++) {
        sharkPools.push({ x: Math.random() * 100 - 50, z: Math.random() * 100 - 50 });
    }
}

// Generate scoops and shark pools once
generateObjects();

// Handle player connections
io.on('connection', (socket) => {
    const numPlayers = Object.keys(players).length;

    if (numPlayers >= MAX_PLAYERS) {
        socket.emit('full'); // Inform the player that the server is full
        socket.disconnect();
        return;
    }

    console.log(`User connected: ${socket.id}`);
  
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 100 - 50, // Random start position
        z: Math.random() * 100 - 50,
        size: 1, // Default size
    };

    // Send the existing scoops and shark pools to the newly connected player
    socket.emit('objectPositions', { scoops, sharkPools });

    // Notify all players of the updated player list
    io.emit('updatePlayers', { players });

    // Handle player movement updates
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            io.emit('updatePlayers', { players }); // Broadcast the updated player positions to all clients
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id]; // Remove player from the list
        io.emit('updatePlayers', { players }); // Update the player list for all clients
    });

    // Latency handling (ping-pong mechanism)
    socket.on('ping', () => {
        socket.emit('pong');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
