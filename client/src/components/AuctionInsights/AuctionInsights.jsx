import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, Award, BarChart3, Activity, Zap, Search } from 'lucide-react';
import { ScatterChart, Scatter, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import axios from 'axios';
import MatrixLoader from '../MatrixLoader';

function AuctionInsights({ onPlayerSelect }) {
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('ipl_sr');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPlayer, setSearchedPlayer] = useState(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/auction/player-stats');
        setPlayerStats(response.data.players || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching player stats:', error);
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, []);

  // Memoize unique players list with lowercase names for efficient searching
  const uniquePlayersMap = useMemo(() => {
    const playerMap = new Map();
    playerStats.forEach(p => {
      if (p.name && !playerMap.has(p.name.toLowerCase())) {
        playerMap.set(p.name.toLowerCase(), p.name);
      }
    });
    return playerMap;
  }, [playerStats]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const queryLower = searchQuery.toLowerCase();
      const matches = [];

      // Prioritize exact matches and starts-with matches
      const startsWithMatches = [];
      const containsMatches = [];

      for (const [lowerName, originalName] of uniquePlayersMap) {
        if (lowerName.startsWith(queryLower)) {
          startsWithMatches.push(originalName);
        } else if (lowerName.includes(queryLower)) {
          containsMatches.push(originalName);
        }

        // Stop early if we have enough matches
        if (startsWithMatches.length + containsMatches.length >= 15) break;
      }

      // Combine results: starts-with first, then contains
      const allMatches = [...startsWithMatches, ...containsMatches].slice(0, 10);
      setSearchSuggestions(allMatches);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery, uniquePlayersMap]);

  const handlePlayerSearch = (playerName) => {
    setSearchedPlayer(playerName);
    setSearchQuery(playerName);
    setSearchSuggestions([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MatrixLoader text="Loading auction insights..." />
      </div>
    );
  }

  if (!playerStats.length) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500">No player stats available</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount) => {
    const crores = amount / 10000000;
    if (crores >= 1) return `₹${crores.toFixed(2)} Cr`;
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  };

  // Premium players (age 24-35, price > 14 cr)
  const premiumPlayers = playerStats
    .filter(p => p.age && p.price && p.age >= 24 && p.age <= 35 && p.price / 10000000 > 14)
    .map(p => ({
      name: p.name,
      age: p.age,
      price: p.price / 10000000,
      year: p.year,
      team: p.team
    }));

  // Age vs Price analysis
  const ageVsPrice = playerStats
    .filter(p => p.age && p.price)
    .map(p => ({
      age: p.age,
      price: p.price / 10000000,
      name: p.name,
      year: p.year,
      isPremium: p.age >= 24 && p.age <= 35 && p.price / 10000000 > 14
    }));

  // Player-specific data
  const playerSpecificData = searchedPlayer ? playerStats.filter(p => p.name === searchedPlayer) : [];

  // Player age progression (price over years)
  const playerAgeProgression = searchedPlayer
    ? playerSpecificData
        .filter(p => p.age && p.price && p.year)
        .sort((a, b) => a.year - b.year)
        .map(p => ({
          year: p.year,
          age: p.age,
          price: p.price / 10000000,
          team: p.team
        }))
    : [];

  // T20 stats for searched player
  const playerT20Stats = searchedPlayer && playerSpecificData.length > 0
    ? {
        runs: playerSpecificData[0].t20_runs || 0,
        avg: playerSpecificData[0].t20_avg || 0,
        sr: playerSpecificData[0].t20_sr || 0,
        fifties: playerSpecificData[0].t20_50 || 0,
        wickets: playerSpecificData[0].t20_wkts || 0,
        bowlEcon: playerSpecificData[0].t20_bowl_econ || 0,
        bowlAvg: playerSpecificData[0].t20_bowl_avg || 0
      }
    : null;

  // IPL stats for searched player
  const playerIPLStats = searchedPlayer && playerSpecificData.length > 0
    ? {
        runs: playerSpecificData[0].ipl_runs || 0,
        avg: playerSpecificData[0].ipl_avg || 0,
        sr: playerSpecificData[0].ipl_sr || 0,
        fifties: playerSpecificData[0].ipl_50 || 0,
        wickets: playerSpecificData[0].ipl_wkts || 0,
        bowlEcon: playerSpecificData[0].ipl_bowl_econ || 0,
        bowlAvg: playerSpecificData[0].ipl_bowl_avg || 0
      }
    : null;

  // Performance vs Price scatter plots
  const performanceMetrics = [
    { key: 'ipl_sr', label: 'IPL Strike Rate', color: '#3b82f6', threshold: 140 },
    { key: 'ipl_avg', label: 'IPL Average', color: '#22c55e', threshold: 40 },
    { key: 'ipl_runs', label: 'IPL Runs', color: '#f59e0b', threshold: 4000 },
    { key: 'ipl_wkts', label: 'IPL Wickets', color: '#ef4444', threshold: 100 },
    { key: 'ipl_bowl_econ', label: 'IPL Economy', color: '#8b5cf6', threshold: 7.5, inverse: true }
  ];

  const performanceVsPrice = playerStats
    .filter(p => p[selectedMetric] && p.price && p[selectedMetric] > 0)
    .map(p => {
      const currentMetric = performanceMetrics.find(m => m.key === selectedMetric);
      const performance = parseFloat(p[selectedMetric]);
      const price = p.price / 10000000;

      // Determine if player is "elite" based on current metric
      const isElite = currentMetric.inverse
        ? (performance <= currentMetric.threshold && price > 10) // For economy, lower is better
        : (performance >= currentMetric.threshold && price > 10);

      return {
        performance,
        price,
        name: p.name,
        year: p.year,
        isElite,
        ...p // Include all player stats for tooltip
      };
    });

  // Elite players for current metric
  const elitePlayers = performanceVsPrice
    .filter(p => p.isElite)
    .sort((a, b) => b.price - a.price);

  // Role-wise price distribution
  const roleData = playerStats
    .filter(p => p.role && p.price)
    .reduce((acc, p) => {
      if (!acc[p.role]) {
        acc[p.role] = { role: p.role, totalPrice: 0, count: 0, avgPrice: 0 };
      }
      acc[p.role].totalPrice += p.price;
      acc[p.role].count++;
      return acc;
    }, {});

  const roleDistribution = Object.values(roleData)
    .map(r => ({
      role: r.role,
      avgPrice: (r.totalPrice / r.count) / 10000000,
      count: r.count
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

  // Country-wise analysis
  const countryData = playerStats
    .filter(p => p.country && p.price)
    .reduce((acc, p) => {
      if (!acc[p.country]) {
        acc[p.country] = { country: p.country, totalPrice: 0, count: 0, avgPrice: 0 };
      }
      acc[p.country].totalPrice += p.price;
      acc[p.country].count++;
      return acc;
    }, {});

  const countryDistribution = Object.values(countryData)
    .map(c => ({
      country: c.country.substring(0, 15),
      avgPrice: (c.totalPrice / c.count) / 10000000,
      count: c.count
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 10);

  // Batting vs Bowling performance radar chart data for all-rounders
  const allRounders = playerStats
    .filter(p => p.role === 'All-Rounder' && p.ipl_runs > 200 && p.ipl_wkts > 5)
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name,
      fullName: p.name,
      batting: Math.min(p.ipl_sr || 0, 200) / 2,
      average: Math.min(p.ipl_avg || 0, 50) * 2,
      bowling: Math.max(0, 100 - (p.ipl_bowl_econ || 10) * 10),
      wickets: Math.min(p.ipl_wkts || 0, 50) * 2,
      price: (p.price / 10000000).toFixed(2)
    }));

  // Custom tooltip for age vs price showing premium players
  const CustomAgeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.isPremium) {
        return (
          <div className="bg-slate-900 border border-primary-500 rounded-lg p-3 max-w-xs">
            <div className="font-bold text-white mb-2">{data.name} ({data.year})</div>
            <div className="text-sm text-slate-300 mb-3">
              Age: {data.age} | Price: ₹{data.price.toFixed(2)} Cr
            </div>
            <div className="border-t border-slate-700 pt-2">
              <div className="text-xs font-semibold text-primary-400 mb-2">Premium Players (Age 24-35, ₹14+ Cr):</div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {premiumPlayers.slice(0, 8).map((p, idx) => (
                  <div key={idx} className="text-xs text-slate-300">
                    <span className="text-primary-300">{p.name}</span> - {p.age}y, ₹{p.price.toFixed(1)}Cr ({p.year})
                  </div>
                ))}
                {premiumPlayers.length > 8 && (
                  <div className="text-xs text-slate-500 italic">+{premiumPlayers.length - 8} more...</div>
                )}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2">
          <div className="font-bold text-white text-sm">{data.name} ({data.year})</div>
          <div className="text-xs text-slate-300">Age: {data.age} | Price: ₹{data.price.toFixed(2)} Cr</div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for performance vs price showing elite players
  const CustomPerformanceTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const currentMetric = performanceMetrics.find(m => m.key === selectedMetric);

      if (data.isElite && elitePlayers.length > 0) {
        return (
          <div className="bg-slate-900 border border-green-500 rounded-lg p-3 max-w-xs">
            <div className="font-bold text-white mb-2">{data.name} ({data.year})</div>
            <div className="text-sm text-slate-300 mb-1">
              {currentMetric.label}: {data.performance.toFixed(2)} | Price: ₹{data.price.toFixed(2)} Cr
            </div>
            {data.team && (
              <div className="text-xs text-slate-400 mb-2">Team: {data.team}</div>
            )}
            <div className="border-t border-slate-700 pt-2">
              <div className="text-xs font-semibold text-green-400 mb-2">
                Elite Players ({currentMetric.label} {currentMetric.inverse ? '≤' : '≥'} {currentMetric.threshold}, ₹10+ Cr):
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {elitePlayers.map((p, idx) => (
                  <div key={idx} className="text-xs text-slate-300">
                    <span className="text-green-300">{p.name}</span> - {currentMetric.label.includes('Runs') || currentMetric.label.includes('Wickets') ? p.performance.toFixed(0) : p.performance.toFixed(1)}, ₹{p.price.toFixed(1)} Cr
                    {p.team && <span className="text-slate-500"> ({p.team}, {p.year})</span>}
                    {!p.team && <span className="text-slate-500"> ({p.year})</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-2">
          <div className="font-bold text-white text-sm">{data.name} ({data.year})</div>
          <div className="text-xs text-slate-300">
            {currentMetric.label}: {currentMetric.label.includes('Runs') || currentMetric.label.includes('Wickets') ? data.performance.toFixed(0) : data.performance.toFixed(2)} | Price: ₹{data.price.toFixed(2)} Cr
          </div>
          {data.team && (
            <div className="text-xs text-slate-400 mt-1">Team: {data.team}</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
            <h1 className="text-2xl md:text-4xl font-bold text-white">Auction Insights & Analytics</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base">
            Comprehensive performance and pricing analysis across IPL auctions (2013-2025)
          </p>
        </div>

        {/* Player Search */}
        <div className="card p-4 md:p-6 mb-6 relative z-30 overflow-visible">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Player Analysis</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Search for a player to view their T20 vs IPL performance and price progression</p>
          <div className="relative z-40">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type player name (e.g., Virat Kohli, Rohit Sharma)..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
            {searchSuggestions.length > 0 && (
              <div className="absolute z-[9999] w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {searchSuggestions.map((name, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePlayerSearch(name)}
                    className="px-4 py-2 hover:bg-slate-700 cursor-pointer text-white text-sm border-b border-slate-700 last:border-b-0"
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
            {searchedPlayer && (
              <button
                onClick={() => {
                  setSearchedPlayer(null);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Player-Specific Visualizations */}
        {searchedPlayer && playerSpecificData.length > 0 && (
          <>
            {/* Player Price Progression */}
            {playerAgeProgression.length > 0 && (
              <div className="card p-4 md:p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <h2 className="text-lg md:text-xl font-bold text-white">{searchedPlayer} - Price Progression</h2>
                </div>
                <p className="text-slate-400 text-sm mb-4">How {searchedPlayer.split(' ')[0]}'s auction price evolved over the years</p>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={playerAgeProgression}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} label={{ value: 'Price (Cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value, name) => {
                        if (name === 'price') return [`₹${value.toFixed(2)} Cr`, 'Price'];
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return `${payload[0].payload.year} - Age ${payload[0].payload.age} (${payload[0].payload.team})`;
                        }
                        return label;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="#22c55e" strokeWidth={3} dot={{ r: 6, fill: '#22c55e' }} name="Price" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* T20 vs IPL Stats Comparison */}
            {playerT20Stats && playerIPLStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* T20 International Stats */}
                <div className="card p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <h2 className="text-lg md:text-xl font-bold text-white">T20 International Stats</h2>
                  </div>
                  <div className="space-y-4">
                    {playerT20Stats.runs > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">Batting</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Runs</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.runs}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Average</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.avg.toFixed(1)}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Strike Rate</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.sr.toFixed(1)}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Fifties</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.fifties}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {playerT20Stats.wickets > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">Bowling</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Wickets</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.wickets}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Economy</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.bowlEcon.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Average</div>
                            <div className="text-xl font-bold text-white">{playerT20Stats.bowlAvg.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* IPL Stats */}
                <div className="card p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg md:text-xl font-bold text-white">IPL Stats</h2>
                  </div>
                  <div className="space-y-4">
                    {playerIPLStats.runs > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">Batting</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Runs</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.runs}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Average</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.avg.toFixed(1)}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Strike Rate</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.sr.toFixed(1)}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Fifties</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.fifties}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {playerIPLStats.wickets > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">Bowling</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Wickets</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.wickets}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Economy</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.bowlEcon.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-800/50 p-3 rounded-lg">
                            <div className="text-xs text-slate-400">Average</div>
                            <div className="text-xl font-bold text-white">{playerIPLStats.bowlAvg.toFixed(1)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Age vs Price Scatter */}
        <div className="card p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Age vs Auction Price</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            How player age influences auction valuations.
            <span className="text-primary-400 font-semibold ml-2">Hover over premium players (age 24-35, ₹14+ Cr) to see the list!</span>
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="age"
                type="number"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Age (years)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis
                dataKey="price"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Price (Cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomAgeTooltip />} />
              <Scatter name="Players" data={ageVsPrice.filter(p => !p.isPremium)} fill="#3b82f6" />
              <Scatter name="Premium" data={ageVsPrice.filter(p => p.isPremium)} fill="#22c55e" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Regular Players</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Premium Players (24-35y, ₹14+ Cr)</span>
            </div>
          </div>
        </div>

        {/* Performance vs Price */}
        <div className="card p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Performance vs Price</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            How player performance correlates with auction prices.
            <span className="text-green-400 font-semibold ml-2">Hover over elite players (₹10+ Cr, high performance) to see the full list!</span>
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {performanceMetrics.map(metric => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedMetric === metric.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="performance"
                type="number"
                stroke="#94a3b8"
                fontSize={12}
                label={{
                  value: performanceMetrics.find(m => m.key === selectedMetric)?.label,
                  position: 'insideBottom',
                  offset: -5,
                  fill: '#94a3b8'
                }}
              />
              <YAxis
                dataKey="price"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Price (Cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip content={<CustomPerformanceTooltip />} />
              <Scatter name="Regular" data={performanceVsPrice.filter(p => !p.isElite)} fill={performanceMetrics.find(m => m.key === selectedMetric)?.color || '#3b82f6'} />
              <Scatter name="Elite" data={performanceVsPrice.filter(p => p.isElite)} fill="#22c55e" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: performanceMetrics.find(m => m.key === selectedMetric)?.color || '#3b82f6' }}></div>
              <span>Regular Players</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Elite Players (₹10+ Cr, High Performance)</span>
            </div>
          </div>
        </div>

        {/* Role-wise and Country-wise Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Role-wise Price Distribution */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Price by Role</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="role" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => `₹${value.toFixed(2)} Cr`}
                />
                <Bar dataKey="avgPrice" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Country-wise Distribution */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Top Countries by Avg Price</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="country" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => `₹${value.toFixed(2)} Cr`}
                />
                <Bar dataKey="avgPrice" fill="#22c55e" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* All-Rounders Performance Radar */}
        {allRounders.length > 0 && (
          <div className="card p-4 md:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Top All-Rounders Performance</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">Multi-dimensional performance comparison</p>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={allRounders.length > 0 ? [
                { subject: 'Strike Rate', ...Object.fromEntries(allRounders.map(p => [p.name, p.batting])) },
                { subject: 'Average', ...Object.fromEntries(allRounders.map(p => [p.name, p.average])) },
                { subject: 'Bowl Quality', ...Object.fromEntries(allRounders.map(p => [p.name, p.bowling])) },
                { subject: 'Wickets', ...Object.fromEntries(allRounders.map(p => [p.name, p.wickets])) }
              ] : []}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
                <PolarRadiusAxis stroke="#94a3b8" fontSize={10} />
                {allRounders.map((player, index) => (
                  <Radar
                    key={player.name}
                    name={`${player.name} (₹${player.price}Cr)`}
                    dataKey={player.name}
                    stroke={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index]}
                    fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index]}
                    fillOpacity={0.3}
                  />
                ))}
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuctionInsights;
