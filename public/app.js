// Connect to Socket.IO (move this to the top to initialize the socket early)
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
let players = {}; // All players
let serverPlayers = {}; // Last known server positions
let scoops = []; // Store the scoops
let sharkPools = []; // Store the shark pools

// Latency tracking
let latency = 0;
let lastPingTime = 0;

// Create a sphere function
function createSphere(color, size, x, y, z) {
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
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
    // Update the camera aspect ratio and renderer size
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Create the local player's pelican after connection
socket.on('connect', () => {
    pelican = createSphere(0x3498db, 1, 0, 1, 0); // Create your pelican
});

// Mouse controls
const mouse = new THREE.Vector2();
const target = new THREE.Vector3(); // The target position for the pelican

document.addEventListener('mousemove', (event) => {
    if (!pelican) return; // Ensure pelican is initialized

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
    if (!pelican) return;  // Ensure pelican is initialized
    const offset = new THREE.Vector3(pelican.position.x, 50, pelican.position.z);
    camera.position.lerp(offset, 0.01);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (pelican) {
        pelican.position.lerp(target, 0.05);  // Smooth interpolation towards the target
    }

    // Smooth interpolation for other players
    Object.keys(players).forEach((id) => {
        if (id !== socket.id && players[id]) {
            const serverPos = serverPlayers[id];
            if (serverPos) {
                players[id].position.lerp(new THREE.Vector3(serverPos.x, 1, serverPos.z), 0.1); // Smooth interpolation
            }
        }
    });

    updateCamera();
    renderer.render(scene, camera);
}

animate();

// Handle latency (ping-pong)
setInterval(() => {
    lastPingTime = Date.now();
    socket.emit('ping');
}, 1000);

socket.on('pong', () => {
    latency = Date.now() - lastPingTime;
    console.log('Latency:', latency, 'ms');
});

// Listen for player updates
socket.on('updatePlayers', (data) => {
    serverPlayers = data.players;

    // Update or create other players
    Object.keys(serverPlayers).forEach((id) => {
        if (id !== socket.id) { // Skip local player
            if (!players[id]) {
                players[id] = createSphere(0x3498db, 1, serverPlayers[id].x, 1, serverPlayers[id].z); // Create if not present
            }
        }
    });

    // Remove disconnected players
    Object.keys(players).forEach((id) => {
        if (!serverPlayers[id]) {
            scene.remove(players[id]);
            delete players[id];
        }
    });
});

// Emit the player's new position to the server
let lastUpdateTime = 0;
const updateInterval = 50; // Send updates every 50ms (or adjust as needed)

document.addEventListener('mousemove', (event) => {
    if (!pelican) return; // Ensure pelican is initialized

    const now = Date.now();
    if (now - lastUpdateTime < updateInterval) {
        return;  // Skip update if within the interval
    }

    lastUpdateTime = now;

    const newPosition = {
        x: pelican.position.x,
        z: pelican.position.z,
    };

    // Send new position to the server
    socket.emit('move', newPosition);
});

// Sync scoops and shark pools from server
socket.on('objectPositions', (data) => {
    scoops.forEach(scoop => scene.remove(scoop));
    sharkPools.forEach(sharkPool => scene.remove(sharkPool));

    scoops = [];
    sharkPools = [];

    // Add scoops
    data.scoops.forEach((scoopData) => {
        const scoop = createSphere(0xffff00, 0.5, scoopData.x, 1, scoopData.z);
        scoops.push(scoop);
    });

    // Add shark pools
    data.sharkPools.forEach((sharkPoolData) => {
        const sharkPool = createSphere(0xff0000, 2, sharkPoolData.x, 1, sharkPoolData.z);
        sharkPools.push(sharkPool);
    });
});
