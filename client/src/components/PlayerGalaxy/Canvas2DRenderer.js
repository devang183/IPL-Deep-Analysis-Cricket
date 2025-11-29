/**
 * Canvas 2D Renderer for Player Cards
 * Renders floating player cards with hover effects
 */

export class Canvas2DRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) {
      throw new Error('Canvas 2D not supported');
    }

    this.imageCache = new Map(); // Cache loaded images
    this.loadingImages = new Set(); // Track images being loaded
  }

  // Load player image
  loadPlayerImage(playerName) {
    if (this.imageCache.has(playerName)) {
      return this.imageCache.get(playerName);
    }

    if (this.loadingImages.has(playerName)) {
      return null;
    }

    this.loadingImages.add(playerName);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      this.imageCache.set(playerName, img);
      this.loadingImages.delete(playerName);
    };

    img.onerror = () => {
      this.imageCache.set(playerName, null); // Mark as failed
      this.loadingImages.delete(playerName);
    };

    // Fetch image path from API
    fetch(`/api/player/${encodeURIComponent(playerName)}/image`)
      .then(response => response.json())
      .then(data => {
        if (data.image_path) {
          img.src = data.image_path;
        } else {
          this.imageCache.set(playerName, null);
          this.loadingImages.delete(playerName);
        }
      })
      .catch(() => {
        this.imageCache.set(playerName, null);
        this.loadingImages.delete(playerName);
      });

    return null;
  }

  render(nodes, hoveredNode, selectedNode) {
    const ctx = this.ctx;
    const pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Set background
    ctx.fillStyle = '#020214';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render each card
    nodes.forEach(node => {
      const isHovered = hoveredNode && node.id === hoveredNode.id;
      const isSelected = selectedNode && node.id === selectedNode.id;

      // Card dimensions
      const cardWidth = node.cardWidth || 120;
      const cardHeight = node.cardHeight || 60;

      // Apply zoom effect
      const scale = isHovered ? 1.3 : 1.0;
      const scaledWidth = cardWidth * scale;
      const scaledHeight = cardHeight * scale;

      // Card position (centered)
      const x = node.x * pixelRatio - scaledWidth / 2;
      const y = node.y * pixelRatio - scaledHeight / 2;

      // Save context
      ctx.save();

      // Apply shadow for depth
      if (isHovered || isSelected) {
        ctx.shadowColor = isSelected ? 'rgba(250, 204, 21, 0.6)' : 'rgba(139, 92, 246, 0.6)';
        ctx.shadowBlur = 20 * pixelRatio;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4 * pixelRatio;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10 * pixelRatio;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2 * pixelRatio;
      }

      // Draw card background with gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + scaledHeight);

      if (isSelected) {
        gradient.addColorStop(0, 'rgba(250, 204, 21, 0.95)');
        gradient.addColorStop(1, 'rgba(251, 146, 60, 0.95)');
      } else if (isHovered) {
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.95)');
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.95)');
      } else {
        // Use team color
        const color = node.color || [0.58, 0.4, 0.93, 0.85];
        const r = Math.floor(color[0] * 255);
        const g = Math.floor(color[1] * 255);
        const b = Math.floor(color[2] * 255);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
        gradient.addColorStop(1, `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 0.9)`);
      }

      ctx.fillStyle = gradient;

      // Draw rounded rectangle
      const borderRadius = 8 * scale;
      this.roundRect(ctx, x, y, scaledWidth, scaledHeight, borderRadius);
      ctx.fill();

      // Draw border
      ctx.strokeStyle = isSelected ? 'rgba(250, 204, 21, 1)' :
                        isHovered ? 'rgba(167, 139, 250, 1)' :
                        'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = (isHovered || isSelected ? 2 : 1) * pixelRatio;
      this.roundRect(ctx, x, y, scaledWidth, scaledHeight, borderRadius);
      ctx.stroke();

      // Reset shadow for image/text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Load and draw player image
      const playerImage = this.loadPlayerImage(node.name);

      if (playerImage && playerImage.complete) {
        // Draw circular player image
        const imageSize = Math.min(scaledWidth, scaledHeight) * 0.85;
        const imageX = x + scaledWidth / 2;
        const imageY = y + scaledHeight / 2;

        // Clip to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(imageX, imageY, imageSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw image
        ctx.drawImage(
          playerImage,
          imageX - imageSize / 2,
          imageY - imageSize / 2,
          imageSize,
          imageSize
        );

        ctx.restore();

        // Draw name label below (small)
        if (isHovered) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.font = `bold ${7 * pixelRatio}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          // Truncate name
          let displayName = node.name || '';
          const nameParts = displayName.split(' ');
          if (nameParts.length > 1) {
            displayName = nameParts[0] + ' ' + nameParts[nameParts.length - 1][0] + '.';
          }

          ctx.fillText(displayName, x + scaledWidth / 2, y + scaledHeight - 5 * pixelRatio);
        }
      } else {
        // Fallback: Draw player initials if image not loaded
        ctx.fillStyle = 'white';
        ctx.font = `bold ${(isHovered ? 16 : 14) * pixelRatio}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Get initials
        const nameParts = (node.name || '').split(' ');
        const initials = nameParts.length > 1
          ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
          : nameParts[0].substring(0, 2);

        ctx.fillText(initials.toUpperCase(), x + scaledWidth / 2, y + scaledHeight / 2);
      }

      // Restore context
      ctx.restore();
    });
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  resize(width, height) {
    const pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  dispose() {
    // Canvas 2D doesn't need cleanup
  }
}
