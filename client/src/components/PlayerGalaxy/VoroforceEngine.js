/**
 * Voroforce Engine - Custom force-directed graph physics engine
 * Optimized for WebGL rendering with Voronoi diagram layout
 */

export class VoroforceEngine {
  constructor(width, height, nodes) {
    this.width = width;
    this.height = height;
    this.nodes = nodes;
    this.alpha = 0.3; // Reduced simulation strength for slower movement
    this.alphaDecay = 0.01; // Slower cooling rate
    this.velocityDecay = 0.8; // Higher friction for slower movement
    this.running = false;

    // Force parameters - minimal forces for gentle floating
    this.forceStrength = {
      center: 0.0001,  // Extremely weak center force
      collision: 0.5,  // Gentle collision
      charge: -5,      // Minimal repulsion
      link: 0.05
    };

    // Card dimensions
    this.cardWidth = 120;
    this.cardHeight = 60;

    this.initializeNodes();
  }

  initializeNodes() {
    // Calculate grid layout
    const cols = Math.ceil(Math.sqrt(this.nodes.length * (this.width / this.height)));
    const rows = Math.ceil(this.nodes.length / cols);
    const cellWidth = this.width / cols;
    const cellHeight = this.height / rows;

    this.nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Position in grid with some random offset for natural look
      node.x = col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 40;
      node.y = row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 40;
      node.vx = (Math.random() - 0.5) * 0.5;  // Minimal initial velocity
      node.vy = (Math.random() - 0.5) * 0.5;
      node.radius = node.radius || 5;
      node.baseRadius = node.radius;

      // Card-specific properties
      node.cardWidth = this.cardWidth;
      node.cardHeight = this.cardHeight;
      node.isCard = true;
    });
  }

  // Center force - pulls nodes toward center
  applyCenter() {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.nodes.forEach(node => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      node.vx += dx * this.forceStrength.center * this.alpha;
      node.vy += dy * this.forceStrength.center * this.alpha;
    });
  }

  // Collision force - prevents node overlap
  applyCollision() {
    const padding = 2;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = a.radius + b.radius + padding;

        if (distance < minDistance && distance > 0) {
          const strength = ((minDistance - distance) / distance) * this.forceStrength.collision * this.alpha;
          const fx = dx * strength;
          const fy = dy * strength;

          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }
  }

  // Charge force - repulsion between nodes
  applyCharge() {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared > 0) {
          const force = this.forceStrength.charge * this.alpha / distanceSquared;
          a.vx -= dx * force;
          a.vy -= dy * force;
          b.vx += dx * force;
          b.vy += dy * force;
        }
      }
    }
  }

  // Update positions
  tick() {
    if (!this.running) return true; // Keep animation running for floating effect

    // Apply gentle floating animation without forces
    this.nodes.forEach(node => {
      // Gentle sinusoidal floating effect
      if (!node.floatTime) {
        node.floatTime = Math.random() * Math.PI * 2;
        node.floatSpeedX = 0.3 + Math.random() * 0.2;
        node.floatSpeedY = 0.4 + Math.random() * 0.3;
        node.floatAmplitudeX = 8 + Math.random() * 6;
        node.floatAmplitudeY = 10 + Math.random() * 8;
        node.originalX = node.x;
        node.originalY = node.y;
      }

      node.floatTime += 0.01;

      // Apply gentle floating offset from original position
      const offsetX = Math.sin(node.floatTime * node.floatSpeedX) * node.floatAmplitudeX;
      const offsetY = Math.cos(node.floatTime * node.floatSpeedY) * node.floatAmplitudeY;

      node.x = node.originalX + offsetX;
      node.y = node.originalY + offsetY;
    });

    return true; // Always continue animation
  }

  start() {
    this.running = true;
    this.alpha = 0.3; // Gentle start for slower animation
  }

  stop() {
    this.running = false;
  }

  restart() {
    this.initializeNodes();
    this.start();
  }

  updateDimensions(width, height) {
    this.width = width;
    this.height = height;
  }
}
