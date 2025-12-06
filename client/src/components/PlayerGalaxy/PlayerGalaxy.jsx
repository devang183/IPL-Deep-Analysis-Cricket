import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import axios from 'axios';
import PlayerGalaxyCard from './PlayerGalaxyCard';
import MatrixLoader from '../MatrixLoader';

function PlayerGalaxy({ players, onPlayerSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playerMetadata, setPlayerMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [displayedPlayers, setDisplayedPlayers] = useState([]);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  const PLAYERS_PER_PAGE = 20;

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

  // Infinite scroll - load players in chunks
  useEffect(() => {
    setDisplayedPlayers(filteredPlayers.slice(0, PLAYERS_PER_PAGE));
    setPage(1);
  }, [filteredPlayers]);

  // Load more players when scrolling
  const lastPlayerRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && displayedPlayers.length < filteredPlayers.length) {
        setPage(prevPage => {
          const newPage = prevPage + 1;
          setDisplayedPlayers(filteredPlayers.slice(0, newPage * PLAYERS_PER_PAGE));
          return newPage;
        });
      }
    });

    if (node) observerRef.current.observe(node);
  }, [displayedPlayers.length, filteredPlayers]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MatrixLoader text="Loading player galaxy..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 drop-shadow-lg">Player Galaxy</h1>
            <p className="text-slate-300 text-xs md:text-sm drop-shadow-md">
              Browse {filteredPlayers.length} IPL players
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-full md:max-w-md">
          <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-10 md:pl-12 pr-10 md:pr-12 py-2.5 md:py-3 bg-slate-800/40 backdrop-blur-md border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm md:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-slate-400 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Player Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
          {displayedPlayers.map((player, index) => (
            <div
              key={player}
              ref={index === displayedPlayers.length - 1 ? lastPlayerRef : null}
            >
              <PlayerGalaxyCard
                player={player}
                metadata={playerMetadata}
                onSelect={onPlayerSelect}
              />
            </div>
          ))}
        </div>

        {displayedPlayers.length < filteredPlayers.length && (
          <div className="text-center py-8">
            <MatrixLoader text="Loading more players..." />
          </div>
        )}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 md:py-20">
            <div className="text-slate-400 text-base md:text-lg">No players found</div>
            <p className="text-slate-500 text-xs md:text-sm mt-2">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerGalaxy;
