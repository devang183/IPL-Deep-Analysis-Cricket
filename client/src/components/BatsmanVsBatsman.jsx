import { useState, useEffect, useRef } from 'react';
import { Users, TrendingUp, Target, Zap, Award, BarChart3, Shield, Activity, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import MatrixLoader from './MatrixLoader';

function BatsmanVsBatsman({ player }) {
  const [batsmen, setBatsmen] = useState([]);
  const [selectedBatsman, setSelectedBatsman] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingBatsmen, setLoadingBatsmen] = useState(true);
  const [playerImage1, setPlayerImage1] = useState(null);
  const [playerImage2, setPlayerImage2] = useState(null);
  const [hiddenPlayers, setHiddenPlayers] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchBatsmen();
  }, []);

  // Fetch player images when player or selectedBatsman changes
  useEffect(() => {
    fetchPlayerImages();
  }, [player, selectedBatsman]);

  // Fetch stats when batsman is selected
  useEffect(() => {
    if (selectedBatsman && player) {
      fetchComparisonStats();
    }
  }, [selectedBatsman, player]);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const highlightedElement = document.getElementById(
        `batsman-option-${highlightedIndex}`
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

  const fetchBatsmen = async () => {
    try {
      const response = await axios.get('/api/players');
      setBatsmen(response.data.players || []);
    } catch (err) {
      console.error('Error fetching batsmen:', err);
    } finally {
      setLoadingBatsmen(false);
    }
  };

  const fetchPlayerImages = async () => {
    // Fetch batsman 1 image
    try {
      const batsman1Response = await axios.get(`/api/player/${player}/image`);
      if (batsman1Response.data.image_path) {
        setPlayerImage1(batsman1Response.data.image_path);
      } else {
        setPlayerImage1(null);
      }
    } catch (err) {
      console.log('Batsman 1 image not found');
      setPlayerImage1(null);
    }

    // Fetch batsman 2 image if selected
    if (selectedBatsman) {
      try {
        const batsman2Response = await axios.get(`/api/player/${selectedBatsman}/image`);
        if (batsman2Response.data.image_path) {
          setPlayerImage2(batsman2Response.data.image_path);
        } else {
          setPlayerImage2(null);
        }
      } catch (err) {
        console.log('Batsman 2 image not found');
        setPlayerImage2(null);
      }
    } else {
      setPlayerImage2(null);
    }
  };

  const fetchComparisonStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/compare/batsmen', {
        batsman1: player,
        batsman2: selectedBatsman,
      });
      setComparison(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to compare batsmen');
    } finally {
      setLoading(false);
    }
  };

  const filteredBatsmen = batsmen.filter(batsman =>
    batsman.toLowerCase().includes(searchTerm.toLowerCase()) && batsman !== player
  );

  const handleKeyDown = (e) => {
    if (!isDropdownOpen || filteredBatsmen.length === 0) {
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
        setIsDropdownOpen(false);
      }
      return;
    }

    const visibleBatsmen = filteredBatsmen.slice(0, 50);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (prev >= visibleBatsmen.length - 1) {
            return 0;
          }
          return prev + 1;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => {
          if (prev <= 0) {
            return visibleBatsmen.length - 1;
          }
          return prev - 1;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < visibleBatsmen.length) {
          handleSelectBatsman(visibleBatsmen[highlightedIndex]);
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
        setHighlightedIndex(visibleBatsmen.length - 1);
        break;
      default:
        break;
    }
  };

  const handleSelectBatsman = (batsman) => {
    setSelectedBatsman(batsman);
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
    setSelectedBatsman('');
    setSearchTerm('');
    setComparison(null);
    inputRef.current?.focus();
  };

  // Calculate winner for each metric
  const getWinner = (value1, value2) => {
    if (value1 > value2) return 'batsman1';
    if (value2 > value1) return 'batsman2';
    return 'tie';
  };

  // Handle legend click to toggle player visibility
  const handleLegendClick = (dataKey) => {
    setHiddenPlayers((prev) => {
      if (prev.includes(dataKey)) {
        return prev.filter((p) => p !== dataKey);
      } else {
        return [...prev, dataKey];
      }
    });
  };

  if (!player) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">Please select a batsman first to compare with another batsman</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-slate-800">Compare {player} vs Another Batsman</h2>
      </div>

      <div ref={dropdownRef} className="mb-8">
        <label htmlFor="batsman-search" className="label">
          <Users className="w-4 h-4 inline mr-2" />
          Select Batsman to Compare With
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="batsman-search"
            type="text"
            placeholder="Search for a batsman..."
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            className="input-field !text-white placeholder:!text-white/60"
            style={{ color: 'white' }}
            disabled={loadingBatsmen}
            aria-label="Search for a batsman"
            aria-autocomplete="list"
            aria-controls="batsman-listbox"
            aria-expanded={isDropdownOpen}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `batsman-option-${highlightedIndex}`
                : undefined
            }
            role="combobox"
          />
        </div>

        {isDropdownOpen && (
          <div
            id="batsman-listbox"
            role="listbox"
            className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg"
            aria-label="Batsman options"
          >
            {loadingBatsmen ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-slate-200 rounded animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
                ))}
              </div>
            ) : filteredBatsmen.length === 0 ? (
              <div className="p-4 text-center text-slate-500 animate-fade-in">No batsmen found</div>
            ) : (
              filteredBatsmen.slice(0, 50).map((batsman, index) => (
                <button
                  key={batsman}
                  id={`batsman-option-${index}`}
                  role="option"
                  aria-selected={selectedBatsman === batsman}
                  onClick={() => handleSelectBatsman(batsman)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-4 py-2 transition-all hover:scale-[1.02] hover:bg-primary-50 hover:text-slate-900 text-white ${
                    selectedBatsman === batsman ? 'bg-primary-100 font-semibold text-slate-900' : ''
                  } ${highlightedIndex === index ? 'bg-primary-50 text-slate-900' : ''}`}
                >
                  {batsman}
                </button>
              ))
            )}
          </div>
        )}

        {selectedBatsman && !searchTerm && !isDropdownOpen && (
          <div className="mt-3 flex items-center gap-2 animate-slide-in-right">
            <span className="text-sm text-slate-600">Selected:</span>
            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-semibold animate-scale-in">
              {selectedBatsman}
            </span>
            <button
              onClick={handleClearSelection}
              className="text-sm text-slate-500 hover:text-slate-700 underline transition-all hover:scale-110"
              aria-label={`Clear selection: ${selectedBatsman}`}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h4 className="font-semibold text-red-800">Error</h4>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <MatrixLoader text="Comparing batsmen..." />
        </div>
      )}

      {!loading && comparison && comparison.batsman1 && comparison.batsman2 && (
        <div className="space-y-8" role="region" aria-live="polite" aria-label="Comparison results">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border-2 ${getWinner(comparison.batsman1.totalRuns, comparison.batsman2.totalRuns) === 'batsman1' ? 'bg-green-50 border-green-200' : getWinner(comparison.batsman1.totalRuns, comparison.batsman2.totalRuns) === 'batsman2' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-sm text-white mb-1">Total Runs</div>
              <div className="text-2xl font-bold text-white">{comparison.batsman1.totalRuns}</div>
              <div className="text-xs text-white/80 mt-1">vs {comparison.batsman2.totalRuns}</div>
            </div>
            <div className={`p-4 rounded-xl border-2 ${getWinner(comparison.batsman1.strikeRate, comparison.batsman2.strikeRate) === 'batsman1' ? 'bg-green-50 border-green-200' : getWinner(comparison.batsman1.strikeRate, comparison.batsman2.strikeRate) === 'batsman2' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-sm text-white mb-1">Strike Rate</div>
              <div className="text-2xl font-bold text-white">{comparison.batsman1.strikeRate}</div>
              <div className="text-xs text-white/80 mt-1">vs {comparison.batsman2.strikeRate}</div>
            </div>
            <div className={`p-4 rounded-xl border-2 ${getWinner(comparison.batsman1.average, comparison.batsman2.average) === 'batsman1' ? 'bg-green-50 border-green-200' : getWinner(comparison.batsman1.average, comparison.batsman2.average) === 'batsman2' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-sm text-white mb-1">Average</div>
              <div className="text-2xl font-bold text-white">{comparison.batsman1.average}</div>
              <div className="text-xs text-white/80 mt-1">vs {comparison.batsman2.average}</div>
            </div>
            <div className={`p-4 rounded-xl border-2 ${getWinner(comparison.batsman1.sixes, comparison.batsman2.sixes) === 'batsman1' ? 'bg-green-50 border-green-200' : getWinner(comparison.batsman1.sixes, comparison.batsman2.sixes) === 'batsman2' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="text-sm text-white mb-1">Sixes</div>
              <div className="text-2xl font-bold text-white">{comparison.batsman1.sixes}</div>
              <div className="text-xs text-white/80 mt-1">vs {comparison.batsman2.sixes}</div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Batsman 1 */}
            <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-green-400/50">
              <div className="flex items-center gap-4 mb-4">
                {playerImage1 ? (
                  <img
                    src={playerImage1}
                    alt={player}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-green-600/30 flex items-center justify-center border-2 border-white shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                )}
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {player}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/80">Matches:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.matches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Balls Faced:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.ballsFaced}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Fours:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.fours}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Highest Score:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.highestScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Fifties:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.fifties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Hundreds:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.hundreds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Boundary %:</span>
                  <span className="font-semibold text-white">{comparison.batsman1.boundaryPercentage}%</span>
                </div>
              </div>
            </div>

            {/* Batsman 2 */}
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-400/50">
              <div className="flex items-center gap-4 mb-4">
                {playerImage2 ? (
                  <img
                    src={playerImage2}
                    alt={selectedBatsman}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600/30 flex items-center justify-center border-2 border-white shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                )}
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedBatsman}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/80">Matches:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.matches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Balls Faced:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.ballsFaced}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Fours:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.fours}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Highest Score:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.highestScore}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Fifties:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.fifties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Hundreds:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.hundreds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Boundary %:</span>
                  <span className="font-semibold text-white">{comparison.batsman2.boundaryPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Performance Comparison
            </h4>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-700">
                📏 <strong>How to read this chart:</strong> Values are shown as percentages relative to the best performer in each category among the selected players. The player with the highest value in each metric gets 100%, while the other is scaled proportionally. Hover over any point to see the relative percentage.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={(() => {
                // Normalize each metric to 0-100 scale based on max value between both players
                const maxStrikeRate = Math.max(comparison.batsman1.strikeRate, comparison.batsman2.strikeRate);
                const maxAverage = Math.max(comparison.batsman1.average, comparison.batsman2.average);
                const maxBoundary = Math.max(comparison.batsman1.boundaryPercentage, comparison.batsman2.boundaryPercentage);
                const maxMatches = Math.max(comparison.batsman1.matches, comparison.batsman2.matches);

                return [
                  {
                    metric: `Strike Rate\n(${comparison.batsman1.strikeRate.toFixed(1)} vs ${comparison.batsman2.strikeRate.toFixed(1)})`,
                    [player]: (comparison.batsman1.strikeRate / maxStrikeRate) * 100,
                    [selectedBatsman]: (comparison.batsman2.strikeRate / maxStrikeRate) * 100
                  },
                  {
                    metric: `Average\n(${comparison.batsman1.average.toFixed(1)} vs ${comparison.batsman2.average.toFixed(1)})`,
                    [player]: (comparison.batsman1.average / maxAverage) * 100,
                    [selectedBatsman]: (comparison.batsman2.average / maxAverage) * 100
                  },
                  {
                    metric: `Boundary %\n(${comparison.batsman1.boundaryPercentage.toFixed(1)} vs ${comparison.batsman2.boundaryPercentage.toFixed(1)})`,
                    [player]: (comparison.batsman1.boundaryPercentage / maxBoundary) * 100,
                    [selectedBatsman]: (comparison.batsman2.boundaryPercentage / maxBoundary) * 100
                  },
                  {
                    metric: `Matches\n(${comparison.batsman1.matches} vs ${comparison.batsman2.matches})`,
                    [player]: (comparison.batsman1.matches / maxMatches) * 100,
                    [selectedBatsman]: (comparison.batsman2.matches / maxMatches) * 100
                  }
                ];
              })()}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                {!hiddenPlayers.includes(player) && (
                  <Radar name={player} dataKey={player} stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                )}
                {!hiddenPlayers.includes(selectedBatsman) && (
                  <Radar name={selectedBatsman} dataKey={selectedBatsman} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                )}
                <Tooltip
                  formatter={(value) => `${value.toFixed(1)}%`}
                  labelFormatter={(label) => label}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Custom Legend with Strike-through */}
            <div className="flex justify-center gap-6 mt-4">
              <button
                onClick={() => handleLegendClick(player)}
                className={`flex items-center gap-2 cursor-pointer transition-opacity ${hiddenPlayers.includes(player) ? 'opacity-50' : 'opacity-100'}`}
              >
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className={`text-sm font-medium ${hiddenPlayers.includes(player) ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {player}
                </span>
              </button>
              <button
                onClick={() => handleLegendClick(selectedBatsman)}
                className={`flex items-center gap-2 cursor-pointer transition-opacity ${hiddenPlayers.includes(selectedBatsman) ? 'opacity-50' : 'opacity-100'}`}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className={`text-sm font-medium ${hiddenPlayers.includes(selectedBatsman) ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {selectedBatsman}
                </span>
              </button>
            </div>
          </div>

          {/* Bar Chart Comparison */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Key Stats Comparison
            </h4>
            <div className="mb-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-slate-600">
                <strong>Note:</strong> Total Runs uses the left Y-axis, while other metrics use the right Y-axis for better visualization.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={[
                {
                  stat: 'Total Runs',
                  [`${player}_runs`]: comparison.batsman1.totalRuns,
                  [`${selectedBatsman}_runs`]: comparison.batsman2.totalRuns,
                  [`${player}_other`]: null,
                  [`${selectedBatsman}_other`]: null
                },
                {
                  stat: 'Strike Rate',
                  [`${player}_runs`]: null,
                  [`${selectedBatsman}_runs`]: null,
                  [`${player}_other`]: comparison.batsman1.strikeRate,
                  [`${selectedBatsman}_other`]: comparison.batsman2.strikeRate
                },
                {
                  stat: 'Average',
                  [`${player}_runs`]: null,
                  [`${selectedBatsman}_runs`]: null,
                  [`${player}_other`]: comparison.batsman1.average,
                  [`${selectedBatsman}_other`]: comparison.batsman2.average
                },
                {
                  stat: 'Fours',
                  [`${player}_runs`]: null,
                  [`${selectedBatsman}_runs`]: null,
                  [`${player}_other`]: comparison.batsman1.fours,
                  [`${selectedBatsman}_other`]: comparison.batsman2.fours
                },
                {
                  stat: 'Sixes',
                  [`${player}_runs`]: null,
                  [`${selectedBatsman}_runs`]: null,
                  [`${player}_other`]: comparison.batsman1.sixes,
                  [`${selectedBatsman}_other`]: comparison.batsman2.sixes
                },
                {
                  stat: 'Fifties',
                  [`${player}_runs`]: null,
                  [`${selectedBatsman}_runs`]: null,
                  [`${player}_other`]: comparison.batsman1.fifties,
                  [`${selectedBatsman}_other`]: comparison.batsman2.fifties
                },
                {
                  stat: 'Hundreds',
                  [`${player}_runs`]: null,
                  [`${selectedBatsman}_runs`]: null,
                  [`${player}_other`]: comparison.batsman1.hundreds,
                  [`${selectedBatsman}_other`]: comparison.batsman2.hundreds
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stat" angle={-15} textAnchor="end" height={70} />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  label={{ value: 'Total Runs', angle: -90, position: 'insideLeft' }}
                  stroke="#8884d8"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Other Metrics', angle: 90, position: 'insideRight' }}
                  stroke="#82ca9d"
                />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey={`${player}_runs`} name={`${player} (Runs)`} fill="#10b981" />
                <Bar yAxisId="left" dataKey={`${selectedBatsman}_runs`} name={`${selectedBatsman} (Runs)`} fill="#3b82f6" />
                <Bar yAxisId="right" dataKey={`${player}_other`} name={`${player} (Other)`} fill="#10b981" fillOpacity={0.7} />
                <Bar yAxisId="right" dataKey={`${selectedBatsman}_other`} name={`${selectedBatsman} (Other)`} fill="#3b82f6" fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Key Insights */}
          <div className="bg-purple-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-400/50">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Key Insights
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-white/80 mb-1">More Aggressive</div>
                <div className="text-lg font-bold text-slate-300">
                  {comparison.batsman1.strikeRate > comparison.batsman2.strikeRate ? player : selectedBatsman}
                </div>
                <div className="text-xs text-white/70 mt-1">Higher strike rate</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-white/80 mb-1">More Consistent</div>
                <div className="text-lg font-bold text-slate-300">
                  {comparison.batsman1.average > comparison.batsman2.average ? player : selectedBatsman}
                </div>
                <div className="text-xs text-white/70 mt-1">Higher average</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-white/80 mb-1">More Boundaries</div>
                <div className="text-lg font-bold text-slate-300">
                  {comparison.batsman1.boundaryPercentage > comparison.batsman2.boundaryPercentage ? player : selectedBatsman}
                </div>
                <div className="text-xs text-white/70 mt-1">Higher boundary percentage</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-sm text-white/80 mb-1">More Experience</div>
                <div className="text-lg font-bold text-slate-300">
                  {comparison.batsman1.matches > comparison.batsman2.matches ? player : selectedBatsman}
                </div>
                <div className="text-xs text-white/70 mt-1">More matches played</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatsmanVsBatsman;
