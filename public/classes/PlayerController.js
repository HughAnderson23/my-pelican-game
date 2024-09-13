import * as THREE from '/node_modules/three/build/three.module.js';
import { Character } from './Character.js';

export class PlayerController {
    constructor(playerId, color, startX, startZ) {
        this.id = playerId;
        this.character = new Character(color, startX, startZ);
        
        // Initialize camera closer to the player
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(
            -50 * aspect, 50 * aspect, // left, right based on aspect ratio
            50, -50,                   // top, bottom
            1, 1000                    // near, far
        );

        this.camera.position.set(0, 50, 0); // Adjust closer to the player
        this.camera.lookAt(this.character.mesh.position);
    }

    updatePosition(targetPosition) {
        this.character.mesh.position.lerp(targetPosition, 0.1);
        this.camera.position.set(
            this.character.mesh.position.x,
            this.camera.position.y,
            this.character.mesh.position.z
        );
    }
}

