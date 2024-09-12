// Connect to Socket.IO
const socket = io();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 0); // Position the camera above the scene
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Camera looks at the center of the scene
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('gameCanvas').appendChild(renderer.domElement);

// Lighting
const light = new THREE.AmbientLight(0x404040); // soft white light
scene.add(light);

// Global variables
let pelican; // The player's pelican
let pelicanBoundingBox; // Bounding box for pelican collision
let players = {}; // All players
let serverPlayers = {}; // Last known server positions
let scoops = []; // Store the scoops
let sharkPools = []; // Store the shark pools
let moveSpeed = 0.05; // Initial movement speed

// Function to properly remove a mesh and dispose of its resources
function removeObject(object) {
    if (object.geometry) object.geometry.dispose(); // Dispose of geometry
    if (object.material) {
        if (object.material.map) object.material.map.dispose(); // Dispose of texture (if any)
        object.material.dispose(); // Dispose of material
    }
    scene.remove(object); // Remove from scene
    object = null; // Set to null to ensure garbage collection
}

// Create a sphere function
function createSphere(color, size, x, y, z) {
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    sphere.scale.set(1, 1, 1); // Ensure scale starts at 1
    
    scene.add(sphere);
    return sphere;
}

// Ground plane (arena)
const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x87CEEB, side: THREE.DoubleSide });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = Math.PI / 2; // Rotate to make it horizontal
scene.add(ground);

// Window resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create the local player's pelican after connection
socket.on('connect', () => {
  pelican = createSphere(0x3498db, 1, 0, 1, 0); // Create pelican with default size
  pelicanBoundingBox = new THREE.Box3().setFromObject(pelican); // Create the pelican's bounding box
  // pelican.id = socket.id; // Associate the local pelican with the socket ID
  // players[socket.id] = pelican;  // Store local player in players object with the correct socket ID
  
  // Send the pelican's Three.js mesh ID to the server
  socket.emit('registerMesh', { meshId: pelican.id, meshUUID: pelican.uuid });
  
  console.log(`Local player created: Mesh UUID = ${pelican.uuid}, Socket ID = ${socket.id}`);
  console.log(`Local player's Three.js mesh ID: ${pelican.id}`);  // Should log the Three.js mesh id
  console.log(`Three.js internal ID for pelican mesh: ${pelican.id}, Socket ID: ${socket.id}`);
});


// Mouse controls
const mouse = new THREE.Vector2();
const target = new THREE.Vector3(); // The target position for the pelican

document.addEventListener('mousemove', (event) => {
    if (!pelican) return;

    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.y / dir.y;
    target.copy(camera.position).add(dir.multiplyScalar(distance));
});

// Camera follows the pelican smoothly
function updateCamera() {
    if (!pelican) return;
    const offset = new THREE.Vector3(pelican.position.x, 50, pelican.position.z);
    camera.position.lerp(offset, 0.01);
}

// Function to detect if a pelican is near a scoop and "consume" it
function checkScoopCollision() {
    pelicanBoundingBox.setFromObject(pelican); // Update pelican's bounding box after every move

    for (let i = scoops.length - 1; i >= 0; i--) {
        const scoop = scoops[i];
        const scoopBoundingBox = new THREE.Box3().setFromObject(scoop); // Get bounding box for each scoop

        if (pelicanBoundingBox.intersectsBox(scoopBoundingBox)) { // Detect collision using bounding boxes
            // Consume the scoop locally (remove from the scene)
            removeObject(scoop); // Properly dispose of the scoop
            scoops.splice(i, 1);

            // Notify the server that the scoop has been consumed
            socket.emit('consumeScoop', i);
        }
    }
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (pelican) {
      pelican.position.lerp(target, moveSpeed); // Adjust movement speed
      checkScoopCollision(); // Check for scoop consumption
  }

  // Smooth interpolation for other players
  Object.keys(players).forEach((id) => {
      if (id !== socket.id && players[id]) {
          const serverPos = serverPlayers[id];
          if (serverPos) {
              players[id].position.lerp(new THREE.Vector3(serverPos.x, 1, serverPos.z), 0.1); // Smooth interpolation
              updatePlayerScale(players[id], serverPos.size);  // Ensure scale is updated only once
          }
      }
  });

  updateCamera();
  renderer.render(scene, camera);
}

animate();


// Sync scoops and shark pools from server
socket.on('objectPositions', (data) => {
    scoops.forEach(scoop => removeObject(scoop)); // Properly remove old scoops
    sharkPools.forEach(sharkPool => removeObject(sharkPool)); // Properly remove old shark pools

    scoops = [];
    sharkPools = [];

    data.scoops.forEach((scoopData) => {
        const scoop = createSphere(0xffff00, 0.5, scoopData.x, 1, scoopData.z);
        scoops.push(scoop);
    });

    data.sharkPools.forEach((sharkPoolData) => {
        const sharkPool = createSphere(0xff0000, 2, sharkPoolData.x, 1, sharkPoolData.z);
        sharkPools.push(sharkPool);
    });
});

console.log('Before update - players object on client:', players);

// Listen for player updates from the server
socket.on('updatePlayers', (data) => {
  console.log('Received player data from server:', data.players); // Log the data received from the server
  
  // Set the serverPlayers object to hold the latest data from the server
  serverPlayers = data.players;

  // Log the current state of the client-side players object before processing
  console.log('Current players object on client (before update):', players);

  // Update or create other players' meshes using data from the server
  Object.keys(serverPlayers).forEach((id) => {
    if (id !== socket.id) {
        if (!players[id]) {
            console.log(`Creating new mesh for player ${id} because it doesn't exist on the client.`);
            // Use the data received from the server to create the player mesh
            players[id] = createSphere(0x3498db, serverPlayers[id].size, serverPlayers[id].x, 1, serverPlayers[id].z);
            players[id].id = id;  // Set the player's ID
            players[id].meshId = serverPlayers[id].meshId;  // Set the player's Mesh ID
            players[id].meshUUID = serverPlayers[id].meshUUID;  // Set the player's Mesh UUID
            
            // Log after setting players[id]
            console.log(`Created mesh for player ${id}, Mesh ID: ${players[id].meshId}, UUID: ${players[id].meshUUID}`);
            console.log('Current state of players[id]:', players[id]);
          } else {
            console.log(`Updating existing mesh for player ${id}.`);
            // Update existing player data using the server's data
            players[id].position.set(serverPlayers[id].x, 1, serverPlayers[id].z);
            updatePlayerScale(players[id], serverPlayers[id].size);
        }
    } else {
        // Handle local player update
        updatePlayerScale(pelican, serverPlayers[id].size);
    }
  });

  // After processing the update, log the players object again to ensure it was updated
  console.log('After update - players object on client:', players);

  // Remove disconnected players
  Object.keys(players).forEach((id) => {
      if (!serverPlayers[id]) {
          console.log(`Removing player ${id} since they are no longer connected.`);
          removeObject(players[id]);  // Properly dispose of player's pelican
          delete players[id];
      }
  });

  // Final state of players after update and removals
  console.log('Final players object after processing:', players);
});

// Function to ensure scale updates happen only once
function updatePlayerScale(player, serverSize) {
  if (player.scale.x !== serverSize) { // Only apply size update if it’s different
      player.scale.set(serverSize, serverSize, serverSize);
      // Differentiate between local pelican and other players
      if (player === pelican) {
        console.log(`Updated local player (Pelican) to size: ${serverSize}`)
      } else {
      console.log(`Updated player ${player.id} to size: ${serverSize}`); // Debugging log
      console.log(`Updated player:`, player); // Debugging log
      }
  }
}

// Emit the player's new position to the server
let lastUpdateTime = 0;
const updateInterval = 50; // Send updates every 50ms

document.addEventListener('mousemove', (event) => {
    if (!pelican) return;

    const now = Date.now();
    if (now - lastUpdateTime < updateInterval) return;

    lastUpdateTime = now;

    const newPosition = {
        x: pelican.position.x,
        z: pelican.position.z,
    };

    socket.emit('move', newPosition);
});

// Handle latency (ping-pong)
setInterval(() => {
    socket.emit('ping');
}, 1000);

socket.on('pong', () => {
    // console.log('Pong received.');
});

