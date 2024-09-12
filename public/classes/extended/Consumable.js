class Consumable extends GameObject {
    constructor(id, color, size, x, z) {
        super(id, color, size, x, 1, z); // y is fixed at 1
    }

    consume() {
        this.remove(); // Remove the object from the scene when consumed
    }
}
