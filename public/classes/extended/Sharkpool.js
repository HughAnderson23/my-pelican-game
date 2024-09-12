class SharkPool extends GameObject {
    constructor(id, x, z) {
        super(id, 0xff0000, 2, x, 1, z); // Example: large red spheres
    }

    penalize(player) {
        // Shrink or destroy the player if they collide
        player.character.mesh.scale.set(0.5, 0.5, 0.5); // Example: shrink the player
    }
}
