import { useState, useEffect } from 'react';
import { Globe, BarChart3, Target, Users, Search, AlertCircle, TrendingUp, Activity, User, Info } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import PersonalizedLoading from '../PersonalizedLoading';
import { useAuth } from '../../context/AuthContext';

function T20International() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('batting');
  const [players, setPlayers] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedBowler, setSelectedBowler] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bowlerSearchQuery, setBowlerSearchQuery] = useState('');
  const [stats, setStats] = useState(null);
  const [matchupStats, setMatchupStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBowlerDropdown, setShowBowlerDropdown] = useState(false);

  const COLORS = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899'];

  const subTabs = [
    { id: 'batting', name: 'Batting Stats', icon: BarChart3 },
    { id: 'bowling', name: 'Bowling Stats', icon: Target },
    { id: 'matchup', name: 'Batsman vs Bowler', icon: Users },
  ];

  // Fetch T20I players and bowlers on mount
  useEffect(() => {
    const fetchPlayersAndBowlers = async () => {
      try {
        const [playersRes, bowlersRes] = await Promise.all([
          axios.get('/api/t20i/players'),
          axios.get('/api/t20i/bowlers')
        ]);
        setPlayers(playersRes.data.players || []);
        setBowlers(bowlersRes.data.bowlers || []);
      } catch (err) {
        console.error('Error fetching T20I players/bowlers:', err);
      } finally {
        setPlayersLoading(false);
      }
    };
    fetchPlayersAndBowlers();
  }, []);

  // Fetch stats when player is selected
  useEffect(() => {
    if (!selectedPlayer) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoint = activeSubTab === 'bowling'
          ? `/api/t20i/bowler-stats/${encodeURIComponent(selectedPlayer)}`
          : `/api/t20i/stats/${encodeURIComponent(selectedPlayer)}`;
        const response = await axios.get(endpoint);
        setStats(response.data.stats);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch statistics');
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    if (activeSubTab !== 'matchup') {
      fetchStats();
    }
  }, [selectedPlayer, activeSubTab]);

  // Fetch matchup stats when both batsman and bowler are selected
  useEffect(() => {
    if (activeSubTab !== 'matchup' || !selectedPlayer || !selectedBowler) {
      setMatchupStats(null);
      return;
    }

    const fetchMatchup = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.post('/api/t20i/batsman-vs-bowler', {
          batsman: selectedPlayer,
          bowler: selectedBowler
        });
        setMatchupStats(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch matchup data');
        setMatchupStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchup();
  }, [selectedPlayer, selectedBowler, activeSubTab]);

  // Filter players based on search
  const filteredPlayers = players.filter(p =>
    p.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const filteredBowlers = bowlers.filter(b =>
    b.toLowerCase().includes(bowlerSearchQuery.toLowerCase())
  ).slice(0, 10);

  const handlePlayerSelect = (player) => {
    setSelectedPlayer(player);
    setSearchQuery(player);
    setShowDropdown(false);
  };

  const handleBowlerSelect = (bowler) => {
    setSelectedBowler(bowler);
    setBowlerSearchQuery(bowler);
    setShowBowlerDropdown(false);
  };

  const handleTabChange = (tabId) => {
    setActiveSubTab(tabId);
    setStats(null);
    setMatchupStats(null);
    setError(null);
  };

  const renderBattingStats = () => {
    if (!stats) return null;

    const boundaryData = stats.ballDistribution || [
      { name: 'Dots', value: stats.dots || 0 },
      { name: 'Singles/Doubles', value: (stats.totalBalls || 0) - (stats.dots || 0) - (stats.fours || 0) - (stats.sixes || 0) },
      { name: 'Fours', value: stats.fours || 0 },
      { name: 'Sixes', value: stats.sixes || 0 },
    ];

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-4 border-blue-400 shadow-lg">
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedPlayer}</h2>
            <p className="text-blue-200 text-sm">T20 International Batting Statistics</p>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <div className="text-sm opacity-90">Total Runs</div>
            </div>
            <div className="text-4xl font-bold">{stats.totalRuns}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5" />
              <div className="text-sm opacity-90">Strike Rate</div>
            </div>
            <div className="text-4xl font-bold">{stats.strikeRate}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <div className="text-sm opacity-90">Average</div>
            </div>
            <div className="text-4xl font-bold">{stats.average}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5" />
              <div className="text-sm opacity-90">Balls Faced</div>
            </div>
            <div className="text-4xl font-bold">{stats.totalBalls}</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Boundary Stats</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-slate-700">Fours</span>
                <span className="text-2xl font-bold text-blue-600">{stats.fours}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-slate-700">Sixes</span>
                <span className="text-2xl font-bold text-purple-600">{stats.sixes}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-slate-700">Total Boundaries</span>
                <span className="text-2xl font-bold text-green-600">{stats.boundaries}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Ball Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={boundaryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {boundaryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Additional Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.matches || 0}</div>
              <div className="text-sm text-slate-600 mt-1">Matches</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.dots || 0}</div>
              <div className="text-sm text-slate-600 mt-1">Dot Balls</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.dotPercentage || 0}%</div>
              <div className="text-sm text-slate-600 mt-1">Dot %</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.dismissals || 0}</div>
              <div className="text-sm text-slate-600 mt-1">Dismissals</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-amber-700">{stats.fifties || 0}</div>
              <div className="text-sm text-amber-600 mt-1 font-semibold">Fifties</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-emerald-700">{stats.hundreds || 0}</div>
              <div className="text-sm text-emerald-600 mt-1 font-semibold">Hundreds</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBowlingStats = () => {
    if (!stats) return null;

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center border-4 border-red-400 shadow-lg">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{selectedPlayer}</h2>
            <p className="text-red-200 text-sm">T20 International Bowling Statistics</p>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <div className="text-sm opacity-90">Wickets</div>
            </div>
            <div className="text-4xl font-bold">{stats.wickets}</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5" />
              <div className="text-sm opacity-90">Average</div>
            </div>
            <div className="text-4xl font-bold">{stats.bowlingAverage}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5" />
              <div className="text-sm opacity-90">Economy</div>
            </div>
            <div className="text-4xl font-bold">{stats.economyRate}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5" />
              <div className="text-sm opacity-90">Strike Rate</div>
            </div>
            <div className="text-4xl font-bold">{stats.bowlingStrikeRate}</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Bowling Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.matches || 0}</div>
              <div className="text-sm text-slate-600 mt-1">Matches</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.overs}</div>
              <div className="text-sm text-slate-600 mt-1">Overs</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.totalRuns}</div>
              <div className="text-sm text-slate-600 mt-1">Runs Conceded</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">{stats.dotBalls}</div>
              <div className="text-sm text-slate-600 mt-1">Dot Balls</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-violet-700">{stats.threeWickets || 0}</div>
              <div className="text-sm text-violet-600 mt-1 font-semibold">3W Hauls</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{stats.fiveWickets || 0}</div>
              <div className="text-sm text-amber-600 mt-1 font-semibold">5W Hauls</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMatchupStats = () => {
    if (!matchupStats) return null;

    if (matchupStats.totalBalls === 0) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <Info className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-amber-800 mb-2">No Data Available</h4>
          <p className="text-amber-700">
            {matchupStats.batsman} and {matchupStats.bowler} have not faced each other in T20 International matches.
          </p>
        </div>
      );
    }

    const runsData = matchupStats.runsDistribution || [
      { name: 'Dots', value: matchupStats.dots || 0 },
      { name: 'Singles/Doubles', value: matchupStats.totalBalls - (matchupStats.dots || 0) - (matchupStats.fours || 0) - (matchupStats.sixes || 0) },
      { name: 'Fours', value: matchupStats.fours || 0 },
      { name: 'Sixes', value: matchupStats.sixes || 0 },
    ];

    return (
      <div>
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-4 border-blue-400 shadow-lg mx-auto mb-2">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">{matchupStats.batsman}</h3>
            <p className="text-blue-200 text-sm">Batsman</p>
          </div>
          <div className="text-4xl font-bold text-white">VS</div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center border-4 border-red-400 shadow-lg mx-auto mb-2">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">{matchupStats.bowler}</h3>
            <p className="text-red-200 text-sm">Bowler</p>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-2">Runs Scored</div>
            <div className="text-4xl font-bold">{matchupStats.totalRuns}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-2">Balls Faced</div>
            <div className="text-4xl font-bold">{matchupStats.totalBalls}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-2">Strike Rate</div>
            <div className="text-4xl font-bold">{matchupStats.strikeRate}</div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="text-sm opacity-90 mb-2">Dismissals</div>
            <div className="text-4xl font-bold">{matchupStats.dismissals}</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Scoring Breakdown</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="font-medium text-slate-700">Dots</span>
                <span className="text-xl font-bold text-slate-600">{matchupStats.dots}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="font-medium text-slate-700">Fours</span>
                <span className="text-xl font-bold text-blue-600">{matchupStats.fours}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="font-medium text-slate-700">Sixes</span>
                <span className="text-xl font-bold text-purple-600">{matchupStats.sixes}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium text-slate-700">Average</span>
                <span className="text-xl font-bold text-green-600">{matchupStats.average}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Runs Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={runsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {runsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-8 h-8 text-blue-400" />
        <h1 className="text-2xl md:text-3xl font-bold text-white">T20 International Analytics</h1>
      </div>

      {/* Data Source Note */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-400/30">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-200">
          Statistics are sourced from cricsheet.org. Data may not include all historical T20I matches.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Player Search */}
      <div className={`grid gap-4 ${activeSubTab === 'matchup' ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        <div className="relative">
          <label className="block text-sm font-medium text-white mb-2">
            {activeSubTab === 'matchup' ? 'Select Batsman' : activeSubTab === 'bowling' ? 'Select Bowler' : 'Select Player'}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder={`Search ${activeSubTab === 'bowling' ? 'bowler' : 'player'}...`}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {showDropdown && searchQuery && filteredPlayers.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-auto">
              {filteredPlayers.map((player) => (
                <button
                  key={player}
                  onClick={() => handlePlayerSelect(player)}
                  className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors"
                >
                  {player}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bowler Search (only for matchup tab) */}
        {activeSubTab === 'matchup' && (
          <div className="relative">
            <label className="block text-sm font-medium text-white mb-2">Select Bowler</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={bowlerSearchQuery}
                onChange={(e) => {
                  setBowlerSearchQuery(e.target.value);
                  setShowBowlerDropdown(true);
                }}
                onFocus={() => setShowBowlerDropdown(true)}
                placeholder="Search bowler..."
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {showBowlerDropdown && bowlerSearchQuery && filteredBowlers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-auto">
                {filteredBowlers.map((bowler) => (
                  <button
                    key={bowler}
                    onClick={() => handleBowlerSelect(bowler)}
                    className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 transition-colors"
                  >
                    {bowler}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="card">
        {playersLoading ? (
          <PersonalizedLoading userName={user?.name || 'there'} context="T20 International players" />
        ) : loading ? (
          <PersonalizedLoading userName={user?.name || 'there'} context="T20 International statistics" />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-800">Error</h4>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : activeSubTab === 'matchup' && (!selectedPlayer || !selectedBowler) ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Select Both Players</h3>
            <p className="text-slate-400">
              Choose a batsman and bowler to view their T20I head-to-head statistics
            </p>
          </div>
        ) : !selectedPlayer ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Search for a Player</h3>
            <p className="text-slate-400">
              Use the search above to find T20 International {activeSubTab === 'bowling' ? 'bowling' : 'batting'} statistics
            </p>
          </div>
        ) : (
          <>
            {activeSubTab === 'batting' && renderBattingStats()}
            {activeSubTab === 'bowling' && renderBowlingStats()}
            {activeSubTab === 'matchup' && renderMatchupStats()}
          </>
        )}
      </div>
    </div>
  );
}

export default T20International;
