import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import axios from 'axios';
import PlayerGalaxyCard from './PlayerGalaxyCard';
import MatrixLoader from '../MatrixLoader';

function PlayerGalaxy({ players, onPlayerSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerMetadata, setPlayerMetadata] = useState({});
  const [loading, setLoading] = useState(true);

  // Load player metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/players/metadata');
        setPlayerMetadata(response.data.metadata || {});
        setLoading(false);
      } catch (error) {
        console.error('Error fetching player metadata:', error);
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  const filteredPlayers = searchQuery
    ? players.filter(player => player.toLowerCase().includes(searchQuery.toLowerCase()))
    : players;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MatrixLoader text="Loading player galaxy..." />
      </div>
    );
  }

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredPlayers.map((player) => (
            <PlayerGalaxyCard
              key={player}
              player={player}
              metadata={playerMetadata}
              onSelect={onPlayerSelect}
            />
          ))}
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
