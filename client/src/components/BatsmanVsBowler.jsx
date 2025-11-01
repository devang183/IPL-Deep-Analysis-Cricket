import { useState, useEffect, useRef } from 'react';
import { Target, Loader2, AlertCircle, TrendingUp, Users, Activity, Zap } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { findBestPlayerMatch } from '../utils/nameMatching';

function BatsmanVsBowler({ player, initialBowler }) {
  const [bowlers, setBowlers] = useState([]);
  const [selectedBowler, setSelectedBowler] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingBowlers, setLoadingBowlers] = useState(true);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchBowlers();
  }, []);

  // Set initial bowler if provided (with fuzzy matching)
  useEffect(() => {
    if (initialBowler && bowlers.length > 0) {
      console.log('Trying to match initialBowler:', initialBowler);
      console.log('Available bowlers:', bowlers.slice(0, 10)); // Log first 10 for debugging

      // Try exact match first
      const exactMatch = bowlers.find(b => b === initialBowler);
      if (exactMatch) {
        console.log('Exact match found:', exactMatch);
        setSelectedBowler(exactMatch);
        return;
      }

      // Try fuzzy matching
      const fuzzyMatch = findBestPlayerMatch(initialBowler, bowlers, 60);
      if (fuzzyMatch) {
        console.log('Fuzzy match found:', fuzzyMatch.player, 'with score:', fuzzyMatch.score);
        setSelectedBowler(fuzzyMatch.player);
      } else {
        console.log('No match found for:', initialBowler);
      }
    }
  }, [initialBowler, bowlers]);

  // Fetch stats when bowler is selected (either manually or via initialBowler)
  useEffect(() => {
    if (selectedBowler && player) {
      console.log('Auto-fetching matchup stats for:', player, 'vs', selectedBowler);
      fetchMatchupStats(selectedBowler);
    }
  }, [selectedBowler, player]);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const highlightedElement = document.getElementById(
        `bowler-option-${highlightedIndex}`
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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const fetchBowlers = async () => {
    try {
      const response = await axios.get('/api/bowlers');
      console.log('Bowlers response:', response.data);
      if (response.data && response.data.bowlers) {
        setBowlers(response.data.bowlers);
      } else {
        console.error('No bowlers data in response:', response.data);
      }
      setLoadingBowlers(false);
    } catch (err) {
      console.error('Error fetching bowlers:', err);
      setError('Failed to load bowlers. Please try again.');
      setLoadingBowlers(false);
    }
  };

  const fetchMatchupStats = async (bowler) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/analyze/batsman-vs-bowler', {
        batsman: player,
        bowler: bowler
      });
      setStats(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch matchup statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!isDropdownOpen || filteredBowlers.length === 0) {
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
        setIsDropdownOpen(false);
      }
      return;
    }

    const visibleBowlers = filteredBowlers.slice(0, 50);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          // Cycle to first item if at the end
          if (prev >= visibleBowlers.length - 1) {
            return 0;
          }
          return prev + 1;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          // Cycle to last item if at the beginning
          if (prev <= 0) {
            return visibleBowlers.length - 1;
          }
          return prev - 1;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visibleBowlers.length) {
          handleBowlerSelect(visibleBowlers[highlightedIndex]);
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
        setHighlightedIndex(visibleBowlers.length - 1);
        break;
      default:
        break;
    }
  };

  const handleBowlerSelect = (bowler) => {
    setSelectedBowler(bowler);
    setSearchTerm('');
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    // fetchMatchupStats will be called automatically by useEffect
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleClearSelection = () => {
    setSelectedBowler('');
    setStats(null);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const filteredBowlers = bowlers.filter(bowler =>
    bowler.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const COLORS = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-slate-800">Batsman vs Bowler Match-up Analysis</h2>
      </div>

      {/* Bowler Selector */}
      <div className="card mb-6" ref={dropdownRef}>
        <label htmlFor="bowler-search" className="label">
          <Target className="w-4 h-4 inline mr-2" />
          Select Bowler to Analyze Against {player}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="bowler-search"
            type="text"
            placeholder="Search for a bowler..."
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            className="input-field"
            aria-label="Search for a bowler"
            aria-autocomplete="list"
            aria-controls="bowler-listbox"
            aria-expanded={isDropdownOpen}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `bowler-option-${highlightedIndex}`
                : undefined
            }
            role="combobox"
          />
        </div>

        {isDropdownOpen && (
          <div
            id="bowler-listbox"
            role="listbox"
            className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg"
            aria-label="Bowler options"
          >
            {loadingBowlers ? (
              <div className="p-4 text-center text-slate-500">Loading bowlers...</div>
            ) : filteredBowlers.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-slate-500">No bowlers found{searchTerm ? ` matching "${searchTerm}"` : ''}</p>
                {bowlers.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">No bowlers loaded. Check console for errors.</p>
                )}
                {bowlers.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">Total bowlers available: {bowlers.length}</p>
                )}
              </div>
            ) : (
              filteredBowlers.slice(0, 50).map((bowler, index) => (
                <button
                  key={bowler}
                  id={`bowler-option-${index}`}
                  role="option"
                  aria-selected={selectedBowler === bowler}
                  onClick={() => handleBowlerSelect(bowler)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2 hover:bg-primary-50 transition-colors ${
                    selectedBowler === bowler ? 'bg-primary-100 font-semibold' : ''
                  } ${highlightedIndex === index ? 'bg-primary-50' : ''}`}
                >
                  {bowler}
                </button>
              ))
            )}
          </div>
        )}

        {selectedBowler && !searchTerm && !isDropdownOpen && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-600">Selected Bowler:</span>
            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-semibold">
              {selectedBowler}
            </span>
            <button
              onClick={handleClearSelection}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
              aria-label={`Clear selection: ${selectedBowler}`}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-3 text-slate-600">Analyzing matchup...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="font-semibold text-red-800">Error</h4>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedBowler && !loading && (
        <div className="card text-center py-16">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            Select a bowler to analyze
          </h3>
          <p className="text-slate-500">
            Choose a bowler from the dropdown above to see detailed head-to-head statistics
          </p>
        </div>
      )}

      {/* Statistics Display */}
      {stats && stats.totalBalls > 0 && !loading && (
        <div className="space-y-6" role="region" aria-live="polite" aria-label="Matchup statistics">
          {/* Summary Header */}
          <div className="rounded-lg p-6 border border-white/20" style={{background: 'transparent', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'}}>
            <h3 className="text-xl font-semibold text-white mb-4">
              {player} vs {selectedBowler}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center rounded-lg p-4 border border-blue-200/30" style={{background: 'rgba(59, 130, 246, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                <div className="text-3xl font-bold text-white">{stats.totalRuns}</div>
                <div className="text-sm text-blue-400 mt-1">Runs Scored</div>
              </div>
              <div className="text-center rounded-lg p-4 border border-green-200/30" style={{background: 'rgba(34, 197, 94, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                <div className="text-3xl font-bold text-white">{stats.totalBalls}</div>
                <div className="text-sm text-green-400 mt-1">Balls Faced</div>
              </div>
              <div className="text-center rounded-lg p-4 border border-purple-200/30" style={{background: 'rgba(168, 85, 247, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                <div className="text-3xl font-bold text-white">{stats.strikeRate}</div>
                <div className="text-sm text-purple-400 mt-1">Strike Rate</div>
              </div>
              <div className="text-center rounded-lg p-4 border border-red-200/30" style={{background: 'rgba(239, 68, 68, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                <div className="text-3xl font-bold text-white">{stats.dismissals}</div>
                <div className="text-sm text-red-400 mt-1">Dismissals</div>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Runs Breakdown */}
            <div className="card">
              <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                Runs Breakdown
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="font-medium text-slate-700">Fours</span>
                  <span className="text-xl font-bold text-blue-600">{stats.fours || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="font-medium text-slate-700">Sixes</span>
                  <span className="text-xl font-bold text-purple-600">{stats.sixes || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-slate-700">Boundaries</span>
                  <span className="text-xl font-bold text-green-600">{(stats.fours || 0) + (stats.sixes || 0)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium text-slate-700">Dot Balls</span>
                  <span className="text-xl font-bold text-slate-600">{stats.dots || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="font-medium text-slate-700">Average</span>
                  <span className="text-xl font-bold text-orange-600">{stats.average || 0}</span>
                </div>
              </div>
            </div>

            {/* Phase-wise Performance */}
            {stats.phaseStats && Object.keys(stats.phaseStats).length > 0 && (
              <div className="card">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" />
                  Performance by Phase
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(stats.phaseStats).map(([phase, data]) => ({
                    phase,
                    runs: data.runs,
                    balls: data.balls
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="phase" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="runs" fill="#0ea5e9" name="Runs" />
                    <Bar dataKey="balls" fill="#8b5cf6" name="Balls" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Dismissal Details */}
            {stats.dismissalDetails && stats.dismissalDetails.length > 0 && (
              <div className="card">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  Dismissal Information ({stats.dismissalDetails.length} dismissals)
                </h4>
                <div className="space-y-3">
                  {stats.dismissalDetails.map((dismissal, index) => {
                    const isRunOut = dismissal.wicketType === 'run out';
                    return (
                    <div key={index} className={`p-4 rounded-lg border-2 hover:shadow-md transition-all ${
                      isRunOut
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300'
                        : 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 hover:border-red-300'
                    }`}>
                      <div className="flex flex-col gap-2">
                        {/* Dismissal Type */}
                        <div className="flex justify-between items-start">
                          <div className={`font-bold text-base ${isRunOut ? 'text-blue-800' : 'text-red-800'}`}>
                            {dismissal.wicketType || 'Dismissed'}
                            {isRunOut && <span className="ml-2 text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded">Not credited to bowler</span>}
                          </div>
                          <div className={`px-2 py-1 text-xs font-semibold rounded ${
                            isRunOut ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'
                          }`}>
                            {dismissal.phase}
                          </div>
                        </div>

                        {/* Wicket Kind - Additional dismissal details */}
                        {dismissal.wicketKind && (
                          <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-2 rounded border border-slate-200">
                            <span className="font-medium text-amber-400">Wicket Kind:</span>
                            <span className="text-black">{dismissal.wicketKind}</span>
                          </div>
                        )}

                        {/* Match Fixture */}
                        {dismissal.battingTeam && dismissal.bowlingTeam && (
                          <div className="flex items-center gap-2 text-sm font-semibold bg-white/5 px-3 py-2 rounded border border-white/10">
                            <span className="text-black">{dismissal.battingTeam}</span>
                            <span className="text-black/60">vs</span>
                            <span className="text-black">{dismissal.bowlingTeam}</span>
                          </div>
                        )}

                        {/* Fielders Involved - For run outs and catches */}
                        {dismissal.fielders && (
                          <div className="flex items-start gap-2 text-xs bg-blue-50 px-3 py-2 rounded border border-blue-200">
                            <span className="font-medium text-blue-400">Fielders:</span>
                            <span className="text-black">
                              {Array.isArray(dismissal.fielders)
                                ? dismissal.fielders.join(', ')
                                : dismissal.fielders}
                            </span>
                          </div>
                        )}

                        {/* Match Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-cyan-400">Over:</span>
                            <span className="text-black">{dismissal.over}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-green-400">Runs:</span>
                            <span className="text-black">{dismissal.runsScored}</span>
                          </div>
                          {dismissal.venue && (
                            <div className="col-span-2 flex items-center gap-1">
                              <span className="font-medium text-purple-400">Venue:</span>
                              <span className="text-black">{dismissal.venue}</span>
                            </div>
                          )}
                          {dismissal.season && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-orange-400">Season:</span>
                              <span className="text-black">{dismissal.season}</span>
                            </div>
                          )}
                          {dismissal.date && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-pink-400">Date:</span>
                              <span className="text-black">{formatDate(dismissal.date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ball-by-Ball Distribution */}
            {stats.runsDistribution && (
              <div className="card">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary-600" />
                  Runs Distribution
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={stats.runsDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.runsDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Additional Insights */}
          <div className="card">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Key Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-sm text-blue-700 mb-1">Boundary Rate</div>
                <div className="text-2xl font-bold text-blue-900">
                  {stats.totalBalls > 0
                    ? (((stats.fours || 0) + (stats.sixes || 0)) / stats.totalBalls * 100).toFixed(1)
                    : 0}%
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  {(stats.fours || 0) + (stats.sixes || 0)} boundaries in {stats.totalBalls} balls
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="text-sm text-green-700 mb-1">Dot Ball %</div>
                <div className="text-2xl font-bold text-green-900">
                  {stats.totalBalls > 0
                    ? ((stats.dots || 0) / stats.totalBalls * 100).toFixed(1)
                    : 0}%
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {stats.dots || 0} dot balls
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="text-sm text-purple-700 mb-1">Runs per Dismissal</div>
                <div className="text-2xl font-bold text-purple-900">
                  {stats.average}
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {stats.dismissals} dismissal{stats.dismissals !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {stats && stats.totalBalls === 0 && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" aria-hidden="true" />
          <h4 className="font-semibold text-yellow-800 mb-2">No Data Available</h4>
          <p className="text-yellow-700">
            {player} has not faced {selectedBowler} in IPL matches with available data.
          </p>
        </div>
      )}
    </div>
  );
}

export default BatsmanVsBowler;
