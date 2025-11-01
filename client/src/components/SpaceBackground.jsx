import { useEffect, useRef } from 'react';

function SpaceBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star configuration
    const stars = [];
    const numStars = 200;
    const speed = 0.5;

    // Create stars with random properties
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * canvas.width,
        size: Math.random() * 2,
        opacity: Math.random() * 0.5 + 0.5
      });
    }

    // Animation function
    const animate = () => {
      // Create dark space background with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0e27');
      gradient.addColorStop(0.5, '#151a3f');
      gradient.addColorStop(1, '#0f1629');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw stars
      stars.forEach((star) => {
        // Move star towards viewer (decrease z)
        star.z -= speed;

        // Reset star if it goes past viewer
        if (star.z <= 0) {
          star.z = canvas.width;
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
        }

        // Calculate star position (3D projection)
        const k = 128.0 / star.z;
        const px = (star.x - canvas.width / 2) * k + canvas.width / 2;
        const py = (star.y - canvas.height / 2) * k + canvas.height / 2;

        // Calculate star size based on distance
        const size = (1 - star.z / canvas.width) * star.size * 2;

        // Draw star with glow effect
        if (px >= 0 && px <= canvas.width && py >= 0 && py <= canvas.height) {
          const brightness = 1 - star.z / canvas.width;

          // Outer glow
          const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, size * 3);
          glowGradient.addColorStop(0, `rgba(255, 255, 255, ${brightness * star.opacity * 0.8})`);
          glowGradient.addColorStop(0.5, `rgba(135, 206, 250, ${brightness * star.opacity * 0.3})`);
          glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = glowGradient;
          ctx.fillRect(px - size * 3, py - size * 3, size * 6, size * 6);

          // Inner star core
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();

          // Add motion trail for faster stars
          if (brightness > 0.7) {
            ctx.strokeStyle = `rgba(135, 206, 250, ${brightness * 0.3})`;
            ctx.lineWidth = size * 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            const trailLength = (1 - star.z / canvas.width) * 20;
            ctx.lineTo(
              (star.x - canvas.width / 2) * (128.0 / (star.z + speed * trailLength)) + canvas.width / 2,
              (star.y - canvas.height / 2) * (128.0 / (star.z + speed * trailLength)) + canvas.height / 2
            );
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ background: '#0a0e27' }}
    />
  );
}

export default SpaceBackground;
