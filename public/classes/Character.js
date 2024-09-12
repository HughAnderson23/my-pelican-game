// Character.js
import * as THREE from '/node_modules/three/build/three.module.js'; // Ensure Three.js is imported correctly

export class Character {
    constructor(color, x, z) {
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(x, 1, z); // Start position
    }

    checkCollision(target) {
        const box1 = new THREE.Box3().setFromObject(this.mesh);
        const box2 = new THREE.Box3().setFromObject(target.mesh);
        return box1.intersectsBox(box2);
    }
}
