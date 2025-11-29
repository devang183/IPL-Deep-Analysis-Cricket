import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import axios from 'axios';

function PlayerGalaxy({ players, onPlayerSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerImages, setPlayerImages] = useState({});

  // Load player images
  useEffect(() => {
    if (!players || players.length === 0) return;

    // Load images for first 100 players initially
    const playersToLoad = players.slice(0, 100);

    playersToLoad.forEach(async (player) => {
      try {
        const response = await axios.get(`/api/player/${player}/image`);
        if (response.data.image_path) {
          setPlayerImages(prev => ({
            ...prev,
            [player]: response.data.image_path
          }));
        }
      } catch (error) {
        // Silently fail - will show initials
      }
    });
  }, [players]);

  const filteredPlayers = searchQuery
    ? players.filter(player => player.toLowerCase().includes(searchQuery.toLowerCase()))
    : players;

  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.substring(0, 2);
  };

  const teamColors = [
    'from-blue-500 to-blue-700',       // Mumbai Indians
    'from-yellow-400 to-yellow-600',   // Chennai Super Kings
    'from-red-500 to-red-700',         // Royal Challengers
    'from-purple-500 to-purple-700',   // Kolkata Knight Riders
    'from-blue-600 to-blue-800',       // Delhi Capitals
    'from-orange-500 to-orange-700',   // Sunrisers Hyderabad
    'from-pink-500 to-pink-700',       // Rajasthan Royals
    'from-red-600 to-red-800',         // Punjab Kings
    'from-teal-500 to-teal-700',       // Gujarat Titans
    'from-cyan-500 to-cyan-700',       // Lucknow Super Giants
  ];

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Player Galaxy</h1>
            <p className="text-slate-300 text-sm drop-shadow-md">
              Browse {filteredPlayers.length} IPL players
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-12 pr-12 py-3 bg-slate-800/40 backdrop-blur-md border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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

      {/* Player Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
          {filteredPlayers.map((player, index) => {
            const colorClass = teamColors[index % teamColors.length];
            const hasImage = playerImages[player];

            return (
              <button
                key={player}
                onClick={() => {
                  if (onPlayerSelect) {
                    onPlayerSelect(player);
                  }
                }}
                className="group relative overflow-hidden rounded-lg hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 hover:border-purple-500/50"
              >
                <div className="relative h-64">
                  {/* Player Image or Initials */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {hasImage ? (
                      <img
                        src={playerImages[player]}
                        alt={player}
                        className="w-full h-full object-contain"
                        style={{
                          imageRendering: '-webkit-optimize-contrast',
                          backfaceVisibility: 'hidden',
                          transform: 'translateZ(0)'
                        }}
                        onError={() => {
                          // Remove from playerImages if failed to load
                          setPlayerImages(prev => {
                            const newImages = { ...prev };
                            delete newImages[player];
                            return newImages;
                          });
                        }}
                      />
                    ) : (
                      <div className={`text-6xl font-bold bg-gradient-to-br ${colorClass} bg-clip-text text-transparent`}>
                        {getInitials(player).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Gradient Overlay - Only on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                  {/* Player Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white text-sm font-semibold text-center leading-tight drop-shadow-lg">
                      {player.split(' ').length > 2
                        ? `${player.split(' ')[0]} ${player.split(' ')[player.split(' ').length - 1]}`
                        : player
                      }
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-20">
            <div className="text-slate-400 text-lg">No players found</div>
            <p className="text-slate-500 text-sm mt-2">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerGalaxy;
