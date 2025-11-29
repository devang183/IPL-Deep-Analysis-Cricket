/**
 * Voroforce Engine - Custom force-directed graph physics engine
 * Optimized for WebGL rendering with Voronoi diagram layout
 */

export class VoroforceEngine {
  constructor(width, height, nodes) {
    this.width = width;
    this.height = height;
    this.nodes = nodes;
    this.alpha = 1.0; // Simulation strength
    this.alphaDecay = 0.0228; // Cooling rate
    this.velocityDecay = 0.4; // Friction
    this.running = false;

    // Force parameters
    this.forceStrength = {
      center: 0.05,
      collision: 0.7,
      charge: -30,
      link: 0.1
    };

    this.initializeNodes();
  }

  initializeNodes() {
    this.nodes.forEach((node, i) => {
      // Random initial position in circle
      const angle = (i / this.nodes.length) * Math.PI * 2;
      const radius = Math.min(this.width, this.height) * 0.4;

      node.x = this.width / 2 + Math.cos(angle) * radius;
      node.y = this.height / 2 + Math.sin(angle) * radius;
      node.vx = 0;
      node.vy = 0;
      node.radius = node.radius || 5;
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
    if (!this.running) return;

    // Apply forces
    this.applyCenter();
    this.applyCollision();
    this.applyCharge();

    // Update positions with velocity
    this.nodes.forEach(node => {
      node.vx *= this.velocityDecay;
      node.vy *= this.velocityDecay;

      node.x += node.vx;
      node.y += node.vy;

      // Boundary constraints with soft bounce
      const margin = node.radius;
      if (node.x < margin) {
        node.x = margin;
        node.vx *= -0.5;
      } else if (node.x > this.width - margin) {
        node.x = this.width - margin;
        node.vx *= -0.5;
      }

      if (node.y < margin) {
        node.y = margin;
        node.vy *= -0.5;
      } else if (node.y > this.height - margin) {
        node.y = this.height - margin;
        node.vy *= -0.5;
      }
    });

    // Cool down simulation
    this.alpha += (0 - this.alpha) * this.alphaDecay;

    return this.alpha > 0.001;
  }

  start() {
    this.running = true;
    this.alpha = 1.0;
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
