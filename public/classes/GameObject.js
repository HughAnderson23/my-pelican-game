class GameObject {
    constructor(id, color, size, x, y, z) {
        this.id = id;
        this.mesh = this.createMesh(color, size, x, y, z);
    }

    createMesh(color, size, x, y, z) {
        const geometry = new THREE.SphereGeometry(size, 32, 32); // Basic shape, change as needed
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        return mesh;
    }

    // Move the object smoothly toward a target
    updatePosition(target) {
        this.mesh.position.lerp(target, 0.05); // Adjust speed factor as needed
    }

    // Function to check for collisions with other objects
    checkCollision(otherObject) {
        const distance = this.mesh.position.distanceTo(otherObject.mesh.position);
        const combinedRadius = this.mesh.geometry.parameters.radius + otherObject.mesh.geometry.parameters.radius;
        return distance < combinedRadius;
    }

    remove() {
        scene.remove(this.mesh);
    }
}
