const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// MongoDB connection (optional)
mongoose.connect('mongodb://localhost:27017')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Track connected players
let players = {}; // Store player information
let scoops = []; // Store scoops
let sharkPools = []; // Store shark pools
const MAX_PLAYERS = 20; // Max players allowed in the game

// Function to generate scoops and shark pools
function generateObjects() {
    // Create 100 scoops
    for (let i = 0; i < 100; i++) {
        scoops.push({ x: Math.random() * 200 - 100, z: Math.random() * 200 - 100 }); // Random positions within -100 to 100
    }
    // Create 3 shark pools
    for (let i = 0; i < 3; i++) {
        sharkPools.push({ x: Math.random() * 100 - 50, z: Math.random() * 100 - 50 });
    }
}

// Generate scoops and shark pools once when the server starts
generateObjects();

io.on('connection', (socket) => {
    const numPlayers = Object.keys(players).length;

    if (numPlayers >= MAX_PLAYERS) {
        socket.emit('full'); // Inform the player that the server is full
        socket.disconnect();
        return;
    }

    console.log(`User connected: ${socket.id}`);

    // Initialize the new player
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 100 - 50, // Random start position
        z: Math.random() * 100 - 50,
        size: 1, // Default size
        meshId: null, // Store mesh ID here
        meshUUID: null // Store mesh UUID here
    };

    // Send current state of all players to the newly connected client
    // socket.emit('initialData', { players });

    // Send current state of all players to the newly connected client
    console.log(`Initial players object:`, players);

    // Wait for mesh registration from the client before sending player data
    socket.on('registerMesh', (data) => {
        if (players[socket.id]) {
            players[socket.id].meshId = data.meshId;
            players[socket.id].meshUUID = data.meshUUID;
            console.log(`Registered mesh for player ${socket.id}: Mesh ID: ${data.meshId}, UUID: ${data.meshUUID}`);
            
            // Now broadcast the updated player data to all clients
            io.emit('updatePlayers', { players });
            console.log('Broadcasting updated player data:', players);
        }
    });
   
    // Send the existing scoops and shark pools to the newly connected player
    socket.emit('objectPositions', { scoops, sharkPools });

    // Handle player movement updates
    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            io.emit('updatePlayers', { players }); // Broadcast the updated player positions to all clients
        }
    });

    // Handle pelican size updates
    socket.on('updateSize', (newSize) => {
        if (players[socket.id]) {
            players[socket.id].size = newSize;
            console.log(`Player ${socket.id} size updated to ${newSize}`);
            io.emit('updatePlayers', { players });
        }
    });

    // Handle scoop consumption
    socket.on('consumeScoop', (scoopIndex) => {
        if (scoops[scoopIndex]) {
            scoops.splice(scoopIndex, 1); // Remove the consumed scoop from the server
            io.emit('objectPositions', { scoops, sharkPools }); // Broadcast the updated scoops to all clients

            // Increase the player's size when they consume a scoop
            if (players[socket.id]) {
                players[socket.id].size += 0.1;
                console.log(`Player ${socket.id} grew to size ${players[socket.id].size}`);
                io.emit('updatePlayers', { players });
            }
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('updatePlayers', { players });
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
