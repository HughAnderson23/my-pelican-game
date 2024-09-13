import { GameWorld } from './classes/GameWorld.js';
import { PlayerController } from './classes/PlayerController.js';
import * as THREE from '/node_modules/three/build/three.module.js';
import { NetworkingManager } from './managers/NetworkingManager.js';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameCanvas').appendChild(renderer.domElement);

// Add a simple ground plane for raycasting
const groundGeometry = new THREE.PlaneGeometry(500, 500);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x336699, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2; // Rotate to make it horizontal
scene.add(ground);

// // Instantiate GameWorld and store the game state
// const gameWorld = new GameWorld(scene, socket);

let playerController; // The local player's controller
let players = {}; // Other players' controllers
let mouse = new THREE.Vector2(); // Mouse coordinates
let raycaster = new THREE.Raycaster(); // For raycasting the mouse position onto the game world

// Networking Manager
const networkingManager = new NetworkingManager();

// Update mouse position and convert it to a point in the game world
document.addEventListener('mousemove', (event) => {
    // Normalize mouse position to -1 to 1 range
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Register the player and create the PlayerController
networkingManager.onPlayerRegistered((data) => {
    playerController = new PlayerController(data.id, 0x3498db, data.position.x, data.position.z); // Create local player's controller
    scene.add(playerController.character.mesh); // Add local player's character mesh to the scene
    console.log("Player created and added to scene", playerController);
});

// Receive and process game state updates
networkingManager.onGameStateUpdate((data) => {
    Object.keys(data.players).forEach((id) => {
        if (id === playerController.id) return; // Skip the local player

        // If the player already exists, update their position
        if (players[id]) {
            players[id].character.mesh.position.set(data.players[id].x, 1, data.players[id].z);
        } else {
            // If the player doesn't exist, create a new PlayerController for them
            players[id] = new PlayerController(id, 0x3498db, data.players[id].x, data.players[id].z);
            scene.add(players[id].character.mesh); // Add the new player's mesh to the scene
            console.log(`Player ${id} added to scene`);
        }
    });

    // Handle player removals
    Object.keys(players).forEach((id) => {
        if (!data.players[id]) {
            scene.remove(players[id].character.mesh); // Remove the player's mesh from the scene
            delete players[id]; // Remove the player from the players object
            console.log(`Player ${id} removed from scene`);
        }
    });
});

// Handle window resizing to update the camera's aspect ratio without zooming out
window.addEventListener('resize', () => {
    if (playerController && playerController.camera) {
        const aspect = window.innerWidth / window.innerHeight;
        playerController.camera.left = -50 * aspect;  // Keep the zoom consistent
        playerController.camera.right = 50 * aspect;
        playerController.camera.top = 50;
        playerController.camera.bottom = -50;
        playerController.camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight); // Adjust renderer size
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (playerController) {
        // Use the raycaster to project the mouse position onto the game plane
        raycaster.setFromCamera(mouse, playerController.camera);
        const intersects = raycaster.intersectObject(ground); // Intersect with the ground plane

        if (intersects.length > 0) {
            const targetPosition = intersects[0].point; // Get the intersected point on the ground
            playerController.updatePosition(targetPosition);

            // Send the player's updated position to the server
            networkingManager.emitPlayerMove({ x: playerController.character.mesh.position.x, z: playerController.character.mesh.position.z });

            // Render the scene with the player's camera
            renderer.render(scene, playerController.camera);
        }
    }
}

animate();

// Log any raycasting issues or rendering issues
console.log("Raycaster setup complete");
console.log("Ground plane added");
