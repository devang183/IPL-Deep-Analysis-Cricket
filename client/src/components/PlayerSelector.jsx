import { Search, User } from 'lucide-react';
import { useState } from 'react';

function PlayerSelector({ players, selectedPlayer, onSelectPlayer, loading }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlayers = players.filter(player =>
    player.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <label className="label">
        <User className="w-4 h-4 inline mr-2" />
        Select Player
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search for a player..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>
      
      {searchTerm && (
        <div className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-slate-500">Loading players...</div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No players found</div>
          ) : (
            filteredPlayers.slice(0, 50).map((player) => (
              <button
                key={player}
                onClick={() => {
                  onSelectPlayer(player);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-4 py-2 hover:bg-primary-50 transition-colors ${
                  selectedPlayer === player ? 'bg-primary-100 font-semibold' : ''
                }`}
              >
                {player}
              </button>
            ))
          )}
        </div>
      )}
      
      {selectedPlayer && !searchTerm && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-slate-600">Selected:</span>
          <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-semibold">
            {selectedPlayer}
          </span>
          <button
            onClick={() => onSelectPlayer('')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayerSelector;
