import { Search, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

function PlayerSelector({ players, selectedPlayer, onSelectPlayer, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filteredPlayers = players.filter(player =>
    player.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const highlightedElement = document.getElementById(
        `player-option-${highlightedIndex}`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isDropdownOpen || filteredPlayers.length === 0) {
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
        setIsDropdownOpen(false);
      }
      return;
    }

    const visiblePlayers = filteredPlayers.slice(0, 50);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          // Cycle to first item if at the end, or move to next item
          if (prev >= visiblePlayers.length - 1) {
            return 0;
          }
          return prev + 1;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          // Cycle to last item if at the beginning, or move to previous item
          if (prev <= 0) {
            return visiblePlayers.length - 1;
          }
          return prev - 1;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visiblePlayers.length) {
          handleSelectPlayer(visiblePlayers[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setSearchTerm('');
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(visiblePlayers.length - 1);
        break;
      default:
        break;
    }
  };

  const handleSelectPlayer = (player) => {
    onSelectPlayer(player);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleClearSelection = () => {
    onSelectPlayer('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  return (
    <div ref={dropdownRef}>
      <label htmlFor="player-search" className="label">
        <User className="w-4 h-4 inline mr-2" />
        Select Player
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          id="player-search"
          type="text"
          placeholder="Search for a player..."
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          className="input-field pl-10"
          aria-label="Search for a player"
          aria-autocomplete="list"
          aria-controls="player-listbox"
          aria-expanded={isDropdownOpen}
          aria-activedescendant={
            highlightedIndex >= 0
              ? `player-option-${highlightedIndex}`
              : undefined
          }
          role="combobox"
        />
      </div>

      {isDropdownOpen && (
        <div
          id="player-listbox"
          role="listbox"
          className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg"
          aria-label="Player options"
        >
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
              ))}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-4 text-center text-slate-500 animate-fade-in">No players found</div>
          ) : (
            filteredPlayers.slice(0, 50).map((player, index) => (
              <button
                key={player}
                id={`player-option-${index}`}
                role="option"
                aria-selected={selectedPlayer === player}
                onClick={() => handleSelectPlayer(player)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left px-4 py-2 transition-all hover:scale-[1.02] hover:bg-primary-50 ${
                  selectedPlayer === player ? 'bg-primary-100 font-semibold' : ''
                } ${highlightedIndex === index ? 'bg-primary-50' : ''}`}
              >
                {player}
              </button>
            ))
          )}
        </div>
      )}

      {selectedPlayer && !searchTerm && !isDropdownOpen && (
        <div className="mt-3 flex items-center gap-2 animate-slide-in-right">
          <span className="text-sm text-slate-600">Selected:</span>
          <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-semibold animate-scale-in">
            {selectedPlayer}
          </span>
          <button
            onClick={handleClearSelection}
            className="text-sm text-slate-500 hover:text-slate-700 underline transition-all hover:scale-110"
            aria-label={`Clear selection: ${selectedPlayer}`}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayerSelector;
