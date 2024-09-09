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

// Sphere creation functions
let pelican; // Global reference to the pelican sphere
function createSphere(color, size, x, y, z, isPlayer = false) {
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    scene.add(sphere);
    if (isPlayer) pelican = sphere; // Store reference if it's the player
    return sphere;
}

// Populate the game with spheres
function populateGame() {
    // Create one pelican as the player
    createSphere(0x3498db, 1, 0, 1, 0, true); // isPlayer set to true

    // Create ice cream scoops
    for (let i = 0; i < 20; i++) {
        createSphere(0xffff00, 0.5, Math.random() * 100 - 50, 1, Math.random() * 100 - 50);
    }

    // Create shark pools
    for (let i = 0; i < 3; i++) {
        createSphere(0xff0000, 2, Math.random() * 100 - 50, 1, Math.random() * 100 - 50);
    }
}

populateGame();

// Mouse controls
const mouse = new THREE.Vector2();
const target = new THREE.Vector3(); // The target position for the pelican

function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Convert mouse coordinate to 3D space
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.y / dir.y;
    target.copy(camera.position).add(dir.multiplyScalar(distance));
}

document.addEventListener('mousemove', onDocumentMouseMove, false);

// Camera follows the pelican smoothly
function updateCamera() {
    const offset = new THREE.Vector3(pelican.position.x, 50, pelican.position.z);
    camera.position.lerp(offset, 0.01);
    // camera.lookAt(pelican.position);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    if (pelican) {
        // Smoothly move the pelican towards the target
        pelican.position.lerp(target, 0.005);
    }

    updateCamera();
    renderer.render(scene, camera);
}

animate();

// Connect to Socket.IO from the client side.
const socket = io();

socket.on('connect', () => {
    console.log('Connected to server');
});
