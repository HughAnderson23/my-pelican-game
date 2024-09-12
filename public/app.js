import { GameWorld } from './classes/GameWorld.js';
import { PlayerController } from './classes/PlayerController.js';

const socket = io();
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameCanvas').appendChild(renderer.domElement);

let playerController; // The local player's controller
let players = {}; // Other players' controllers
let mouse = { x: 0, y: 0 }; // Mouse coordinates

// Update mouse position
document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Register the player and create the PlayerController
socket.on('registerPlayer', (data) => {
    playerController = new PlayerController(data.id, 0x3498db, data.position.x, data.position.z); // Create local player's controller
    scene.add(playerController.character.mesh); // Add local player's character mesh to the scene
});

// Receive and process game state updates
socket.on('gameState', (data) => {
    Object.keys(data.players).forEach((id) => {
        if (id === socket.id) return; // Skip the local player

        // If the player already exists, update their position
        if (players[id]) {
            players[id].character.mesh.position.set(data.players[id].x, 1, data.players[id].z);
        } else {
            // If the player doesn't exist, create a new PlayerController for them
            players[id] = new PlayerController(id, 0x3498db, data.players[id].x, data.players[id].z);
            scene.add(players[id].character.mesh); // Add the new player's mesh to the scene
        }
    });

    // Handle player removals
    Object.keys(players).forEach((id) => {
        if (!data.players[id]) {
            scene.remove(players[id].character.mesh); // Remove the player's mesh from the scene
            delete players[id]; // Remove the player from the players object
        }
    });
});

// Handle window resizing to update the camera's aspect ratio
window.addEventListener('resize', () => {
    if (playerController && playerController.camera) {
        playerController.camera.left = window.innerWidth / -2;
        playerController.camera.right = window.innerWidth / 2;
        playerController.camera.top = window.innerHeight / 2;
        playerController.camera.bottom = window.innerHeight / -2;
        playerController.camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight); // Adjust renderer size
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (playerController) {
        // Smoothly move the player towards the mouse position
        const targetPosition = new THREE.Vector3(mouse.x * 50, 1, mouse.y * 50);
        playerController.updatePosition(targetPosition);

        // Send the player's updated position to the server
        socket.emit('move', { x: playerController.character.mesh.position.x, z: playerController.character.mesh.position.z });

        // Render the scene with the player's camera
        renderer.render(scene, playerController.camera);
    }
}

animate();
