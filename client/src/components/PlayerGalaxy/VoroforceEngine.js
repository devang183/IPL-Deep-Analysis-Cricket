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

    // Force parameters - reduced center force for better spread
    this.forceStrength = {
      center: 0.001,  // Much weaker center force
      collision: 0.8,
      charge: -50,    // Stronger repulsion
      link: 0.1
    };

    this.initializeNodes();
  }

  initializeNodes() {
    this.nodes.forEach((node, i) => {
      // Random initial position spread across entire screen
      node.x = Math.random() * this.width;
      node.y = Math.random() * this.height;
      node.vx = (Math.random() - 0.5) * 2;  // Random initial velocity
      node.vy = (Math.random() - 0.5) * 2;
      node.radius = node.radius || 5;
      node.baseRadius = node.radius;  // Store original radius for zoom effect
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
