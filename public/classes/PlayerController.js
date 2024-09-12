import * as THREE from '/node_modules/three/build/three.module.js';
import { Character } from './Character.js';

export class PlayerController {
    constructor(playerId, color, startX, startZ) {
        this.id = playerId;
        this.character = new Character(color, startX, startZ);

        // Handle the camera only on the client side
        if (typeof window !== 'undefined') {
            this.camera = new THREE.OrthographicCamera(
                window.innerWidth / -2, window.innerWidth / 2,
                window.innerHeight / 2, window.innerHeight / -2,
                1, 1000
            );
            this.camera.position.set(0, 100, 0);
            this.camera.lookAt(this.character.mesh.position);
        }
    }

    updatePosition(targetPosition) {
        // Update the player's position with Three.js objects
        this.character.mesh.position.lerp(targetPosition, 0.1);
        if (this.camera) {
            this.camera.position.set(
                this.character.mesh.position.x,
                this.camera.position.y,
                this.character.mesh.position.z
            );
        }
    }
}
