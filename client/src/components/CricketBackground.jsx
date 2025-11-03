import { useEffect, useRef } from 'react';

function CricketBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Cricket-themed particles
    const particles = [];
    const particleCount = 30;

    // Cricket ball, bat, and stump shapes
    const shapes = ['ball', 'bat', 'stump', 'wicket'];

    class Particle {
      constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
        this.opacity = Math.random() * 0.5 + 0.3;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -50;
        this.size = Math.random() * 30 + 20;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = Math.random() * 2 + 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.shape = shapes[Math.floor(Math.random() * shapes.length)];
        this.color = this.getColor();
      }

      getColor() {
        const colors = [
          '#0ea5e9', // Sky blue
          '#8b5cf6', // Purple
          '#ec4899', // Pink
          '#f59e0b', // Amber
          '#10b981', // Green
          '#ef4444', // Red
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Reset when out of bounds
        if (this.y > canvas.height + 50 || this.x < -50 || this.x > canvas.width + 50) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;

        switch (this.shape) {
          case 'ball':
            // Cricket ball
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#dc2626';
            ctx.fill();
            // Seam
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-this.size / 2, 0);
            ctx.lineTo(this.size / 2, 0);
            ctx.stroke();
            break;

          case 'bat':
            // Cricket bat
            ctx.fillStyle = '#d97706';
            // Handle
            ctx.fillRect(-this.size / 8, -this.size / 2, this.size / 4, this.size * 0.4);
            // Blade
            ctx.beginPath();
            ctx.moveTo(-this.size / 3, -this.size / 10);
            ctx.lineTo(this.size / 3, -this.size / 10);
            ctx.lineTo(this.size / 3, this.size / 2);
            ctx.lineTo(-this.size / 3, this.size / 2);
            ctx.closePath();
            ctx.fillStyle = '#f5deb3';
            ctx.fill();
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 1;
            ctx.stroke();
            break;

          case 'stump':
            // Stump
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(-this.size / 8, -this.size / 2, this.size / 4, this.size);
            // Bails
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(-this.size / 6, -this.size / 2 - 5, this.size / 3, 3);
            break;

          case 'wicket':
            // Three stumps
            ctx.fillStyle = '#fef3c7';
            for (let i = -1; i <= 1; i++) {
              ctx.fillRect(i * this.size / 6 - this.size / 16, -this.size / 2, this.size / 8, this.size);
            }
            // Bails
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(-this.size / 3, -this.size / 2 - 4, this.size * 0.66, 3);
            break;
        }

        ctx.restore();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Stadium lights effect
    const lights = [];
    for (let i = 0; i < 4; i++) {
      lights.push({
        x: (canvas.width / 5) * (i + 0.5),
        y: 50,
        radius: 100,
        brightness: Math.random(),
        speed: 0.02 + Math.random() * 0.02
      });
    }

    // Animation loop
    let animationId;
    const animate = () => {
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0c0a1f');
      gradient.addColorStop(0.5, '#1e1b4b');
      gradient.addColorStop(1, '#312e81');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stadium lights
      lights.forEach(light => {
        light.brightness += light.speed;
        if (light.brightness > 1 || light.brightness < 0.3) {
          light.speed *= -1;
        }

        const lightGradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, light.radius
        );
        lightGradient.addColorStop(0, `rgba(255, 255, 255, ${light.brightness * 0.3})`);
        lightGradient.addColorStop(0.5, `rgba(252, 211, 77, ${light.brightness * 0.2})`);
        lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = lightGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Draw cricket field lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);

      // Pitch
      ctx.strokeRect(canvas.width / 2 - 150, canvas.height / 2 - 300, 300, 600);

      // Boundary circle
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}

export default CricketBackground;
