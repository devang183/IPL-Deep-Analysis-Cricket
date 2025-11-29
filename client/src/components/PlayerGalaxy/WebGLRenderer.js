/**
 * WebGL Renderer for Voronoi Force-Directed Graph
 * High-performance rendering with custom shaders
 */

export class WebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    this.program = null;
    this.buffers = {};
    this.initShaders();
  }

  initShaders() {
    const gl = this.gl;

    // Vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_size;

      uniform vec2 u_resolution;
      uniform float u_pixelRatio;

      varying vec4 v_color;

      void main() {
        vec2 clipSpace = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
        gl_Position = vec4(clipSpace, 0, 1);
        gl_PointSize = a_size * u_pixelRatio;
        v_color = a_color;
      }
    `;

    // Fragment shader with smooth circles
    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 v_color;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);

        if (dist > 0.5) {
          discard;
        }

        // Smooth edge
        float alpha = smoothstep(0.5, 0.45, dist);
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Create program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Program linking failed: ' + gl.getProgramInfoLog(this.program));
    }

    // Get attribute and uniform locations
    this.locations = {
      position: gl.getAttribLocation(this.program, 'a_position'),
      color: gl.getAttribLocation(this.program, 'a_color'),
      size: gl.getAttribLocation(this.program, 'a_size'),
      resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      pixelRatio: gl.getUniformLocation(this.program, 'u_pixelRatio')
    };
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error('Shader compilation failed: ' + info);
    }

    return shader;
  }

  render(nodes, hoveredNode, selectedNode) {
    const gl = this.gl;
    const pixelRatio = window.devicePixelRatio || 1;

    // Set viewport
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Clear canvas
    gl.clearColor(0.02, 0.02, 0.1, 1.0); // Dark blue background
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Use program
    gl.useProgram(this.program);

    // Set uniforms
    gl.uniform2f(this.locations.resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.locations.pixelRatio, pixelRatio);

    // Prepare data arrays
    const positions = [];
    const colors = [];
    const sizes = [];

    nodes.forEach(node => {
      positions.push(node.x * pixelRatio, node.y * pixelRatio);

      // Color based on state
      let color;
      if (selectedNode && node.id === selectedNode.id) {
        color = [1.0, 0.84, 0.0, 1.0]; // Gold for selected
      } else if (hoveredNode && node.id === hoveredNode.id) {
        color = [0.4, 0.8, 1.0, 1.0]; // Light blue for hover
      } else {
        // Team color or default
        color = node.color || [0.58, 0.4, 0.93, 0.9]; // Purple default
      }

      colors.push(...color);
      sizes.push(node.radius || 8);
    });

    // Create/update buffers
    this.updateBuffer('position', new Float32Array(positions), 2);
    this.updateBuffer('color', new Float32Array(colors), 4);
    this.updateBuffer('size', new Float32Array(sizes), 1);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, nodes.length);

    // Draw Voronoi edges (optional - can be expensive)
    if (nodes.length < 200) {
      this.drawVoronoiEdges(nodes, pixelRatio);
    }
  }

  updateBuffer(name, data, size) {
    const gl = this.gl;

    if (!this.buffers[name]) {
      this.buffers[name] = gl.createBuffer();
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[name]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.locations[name]);
    gl.vertexAttribPointer(this.locations[name], size, gl.FLOAT, false, 0, 0);
  }

  drawVoronoiEdges(nodes, pixelRatio) {
    const gl = this.gl;

    // Simple edge drawing between nearby nodes
    const edges = [];
    const maxDistance = 100 * pixelRatio;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) * pixelRatio;

        if (distance < maxDistance) {
          edges.push(
            nodes[i].x * pixelRatio, nodes[i].y * pixelRatio,
            nodes[j].x * pixelRatio, nodes[j].y * pixelRatio
          );
        }
      }
    }

    if (edges.length > 0) {
      // Draw lines with low opacity
      gl.lineWidth(1);

      const lineBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(edges), gl.STATIC_DRAW);
      gl.vertexAttribPointer(this.locations.position, 2, gl.FLOAT, false, 0, 0);

      // Set line color (very faint)
      const lineColors = new Array(edges.length / 2 * 4).fill(0);
      for (let i = 0; i < lineColors.length; i += 4) {
        lineColors[i] = 0.3;     // r
        lineColors[i + 1] = 0.3; // g
        lineColors[i + 2] = 0.5; // b
        lineColors[i + 3] = 0.1; // a (very transparent)
      }

      const colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineColors), gl.STATIC_DRAW);
      gl.vertexAttribPointer(this.locations.color, 4, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINES, 0, edges.length / 2);

      // Cleanup
      gl.deleteBuffer(lineBuffer);
      gl.deleteBuffer(colorBuffer);
    }
  }

  resize(width, height) {
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = width * pixelRatio;
    this.canvas.height = height * pixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  dispose() {
    const gl = this.gl;

    // Delete buffers
    Object.values(this.buffers).forEach(buffer => {
      gl.deleteBuffer(buffer);
    });

    // Delete program
    if (this.program) {
      gl.deleteProgram(this.program);
    }
  }
}
