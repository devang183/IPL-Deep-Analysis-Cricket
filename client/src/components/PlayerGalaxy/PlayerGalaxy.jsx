import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, X, Maximize2, Minimize2, Play, Pause, RotateCcw } from 'lucide-react';

function PlayerGalaxy({ players, onPlayerSelect }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [modulesLoaded, setModulesLoaded] = useState(false);

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setMode] = useState('intro');
  const [nodes, setNodes] = useState([]);
  const [error, setError] = useState(null);

  // Dynamically load modules only on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;

    Promise.all([
      import('./VoroforceEngine'),
      import('./WebGLRenderer')
    ]).then(([voroforce, webgl]) => {
      engineRef.VoroforceEngine = voroforce.VoroforceEngine;
      rendererRef.WebGLRenderer = webgl.WebGLRenderer;
      setModulesLoaded(true);
    }).catch(err => {
      console.error('Failed to load modules:', err);
      setError('Failed to initialize visualization');
    });
  }, []);

  // Initialize nodes from players
  useEffect(() => {
    if (!players || players.length === 0) return;

    const maxPlayers = 500;
    const sampledPlayers = players.length > maxPlayers
      ? players.slice(0, maxPlayers)
      : players;

    const teamColors = {
      'Mumbai Indians': [0.0, 0.4, 0.8, 0.9],
      'Chennai Super Kings': [1.0, 0.8, 0.0, 0.9],
      'Royal Challengers Bangalore': [0.8, 0.0, 0.0, 0.9],
      'Kolkata Knight Riders': [0.4, 0.0, 0.6, 0.9],
      'Delhi Capitals': [0.0, 0.3, 0.7, 0.9],
      'Sunrisers Hyderabad': [1.0, 0.5, 0.0, 0.9],
      'Rajasthan Royals': [0.8, 0.0, 0.5, 0.9],
      'Punjab Kings': [0.7, 0.0, 0.0, 0.9],
      'Gujarat Titans': [0.0, 0.2, 0.4, 0.9],
      'Lucknow Super Giants': [0.2, 0.5, 0.8, 0.9],
    };

    const playerNodes = sampledPlayers.map((player, i) => ({
      id: player,
      name: player,
      radius: 6 + Math.random() * 4,
      color: Object.values(teamColors)[i % Object.keys(teamColors).length],
      x: 0,
      y: 0,
      vx: 0,
      vy: 0
    }));

    setNodes(playerNodes);
  }, [players]);

  // Initialize engine and renderer
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0 || !modulesLoaded) return;
    if (!engineRef.VoroforceEngine || !rendererRef.WebGLRenderer) return;

    const canvas = canvasRef.current;
    const { width, height } = dimensions;

    try {
      rendererRef.current = new rendererRef.WebGLRenderer(canvas);
      rendererRef.current.resize(width, height);

      engineRef.current = new engineRef.VoroforceEngine(width, height, nodes);
      engineRef.current.start();

      setMode('explore');
    } catch (error) {
      console.error('Failed to initialize WebGL:', error);
      setError('WebGL not supported on this device');
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, dimensions, modulesLoaded]);

  // Animation loop
  useEffect(() => {
    if (!engineRef.current || !rendererRef.current || !isPlaying) return;

    const animate = () => {
      const shouldContinue = engineRef.current.tick();

      rendererRef.current.render(
        engineRef.current.nodes,
        hoveredPlayer,
        selectedPlayer
      );

      if (shouldContinue || hoveredPlayer || selectedPlayer) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, hoveredPlayer, selectedPlayer]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });

      if (rendererRef.current) {
        rendererRef.current.resize(width, height);
      }
      if (engineRef.current) {
        engineRef.current.updateDimensions(width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse interaction
  const handleCanvasClick = useCallback((e) => {
    if (!canvasRef.current || !engineRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

    const clickedNode = engineRef.current.nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < (node.baseRadius || node.radius) * pixelRatio + 20;
    });

    if (clickedNode) {
      setSelectedPlayer(clickedNode);
      setMode('preview');
      if (onPlayerSelect) {
        onPlayerSelect(clickedNode.name);
      }
    } else {
      setSelectedPlayer(null);
      setMode('explore');
    }
  }, [onPlayerSelect]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!canvasRef.current || !engineRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

    // Reset all nodes to base radius first
    engineRef.current.nodes.forEach(node => {
      if (node.baseRadius) {
        node.radius = node.baseRadius;
      }
    });

    // Find hovered node and apply zoom effect
    const hoveredNode = engineRef.current.nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < node.radius * pixelRatio + 20; // Larger hover detection area
    });

    // Apply smooth zoom effect to hovered node
    if (hoveredNode && hoveredNode.baseRadius) {
      hoveredNode.radius = hoveredNode.baseRadius * 2.5; // 2.5x zoom on hover
    }

    setHoveredPlayer(hoveredNode || null);
  }, []);

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
      setIsPlaying(true);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const filteredNodes = searchQuery
    ? nodes.filter(node => node.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : nodes;

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center p-8 bg-red-900/20 border border-red-500/50 rounded-xl">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!modulesLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Player Galaxy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} bg-slate-950`}>
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Player Galaxy</h1>
              <p className="text-slate-400 text-sm">
                Explore {nodes.length} IPL players in an interactive force-directed universe
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                onClick={handleRestart}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition-all"
              >
                <RotateCcw className="w-5 h-5 text-white" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm border border-white/20 transition-all"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-white" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search players..."
              className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-full">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          className="cursor-pointer"
        />
      </div>

      {hoveredPlayer && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-lg border border-white/20">
            <p className="text-white font-semibold text-lg">{hoveredPlayer.name}</p>
          </div>
        </div>
      )}

      {selectedPlayer && mode === 'preview' && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent p-6">
          <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">{selectedPlayer.name}</h2>
              <button
                onClick={() => {
                  setSelectedPlayer(null);
                  setMode('explore');
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            <p className="text-slate-300">
              Click on the player name in the app to view detailed statistics and performance analysis.
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-24 right-6 z-20 bg-black/60 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
        <div className="text-white text-sm space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Players:</span>
            <span className="font-semibold">{filteredNodes.length}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Mode:</span>
            <span className="font-semibold capitalize">{mode}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">FPS:</span>
            <span className="font-semibold">60</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerGalaxy;
