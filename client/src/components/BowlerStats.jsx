import { useState, useEffect } from 'react';
import { Target, AlertCircle, TrendingDown, Activity, Zap, User, Clock, Filter } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PersonalizedLoading from './PersonalizedLoading';
import { useAuth } from '../context/AuthContext';

function BowlerStats({ player }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [playerImage, setPlayerImage] = useState(null);
  const [playerInfo, setPlayerInfo] = useState({ battingstyle: null, bowlingstyle: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null); // For filtering phase stats

  useEffect(() => {
    fetchStats();
    fetchPlayerImage();
  }, [player]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/bowler-stats/${player}`);
      setStats(response.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch bowling statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerImage = async () => {
    try {
      const response = await axios.get(`/api/player/${player}/image`);
      if (response.data.image_path) {
        setPlayerImage(response.data.image_path);
      }
      // Store batting and bowling styles
      setPlayerInfo({
        battingstyle: response.data.battingstyle,
        bowlingstyle: response.data.bowlingstyle
      });
    } catch (err) {
      console.log('Player image not found, using placeholder');
      setPlayerImage(null);
    }
  };

  const handlePhaseClick = (phase) => {
    // Toggle selection: if clicking the same phase, deselect it
    setSelectedPhase(selectedPhase === phase ? null : phase);
  };

  if (loading) {
    return <PersonalizedLoading userName={user?.username || 'there'} context="bowling statistics" />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-800">Error</h4>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Get phase-specific stats or overall stats based on selection
  const getFilteredStats = () => {
    if (!selectedPhase || !stats.phaseBreakdown) {
      return stats; // Return overall stats if no filter
    }

    const phaseData = stats.phaseBreakdown[selectedPhase];
    const overs = Math.floor(phaseData.balls / 6) + ((phaseData.balls % 6) / 10);

    return {
      ...stats,
      // Phase-specific stats (available from backend)
      balls: phaseData.balls,
      overs: overs.toFixed(1),
      totalRuns: phaseData.runs,
      wickets: phaseData.wickets,
      economyRate: phaseData.economyRate,
      bowlingAverage: phaseData.bowlingAverage,
      bowlingStrikeRate: phaseData.bowlingStrikeRate,
      // These stats are not available per phase, so we keep overall stats
      maidens: stats.maidens,
      dotBalls: stats.dotBalls,
      threeWickets: stats.threeWickets,
      fourWickets: stats.fourWickets,
      fiveWickets: stats.fiveWickets,
      matches: stats.matches
    };
  };

  const displayStats = getFilteredStats();
  const isFiltered = selectedPhase !== null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {/* Player Image */}
        <div className="flex-shrink-0">
          {playerImage ? (
            <img
              src={playerImage}
              alt={player}
              className="w-16 h-16 rounded-full object-cover border-4 border-primary-500 shadow-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center border-4 border-primary-500 shadow-lg"
            style={{ display: playerImage ? 'none' : 'flex' }}
          >
            <User className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title and Player Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-slate-800">Bowling Statistics for {player}</h2>
          </div>

          {/* Batting and Bowling Styles */}
          {(playerInfo.battingstyle || playerInfo.bowlingstyle) && (
            <div className="flex flex-wrap gap-3 mt-3">
              {playerInfo.battingstyle && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-400/30" style={{background: 'rgba(59, 130, 246, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Batting: </span>
                  <span className="text-sm font-semibold text-blue-300">{playerInfo.battingstyle}</span>
                </div>
              )}
              {playerInfo.bowlingstyle && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-400/30" style={{background: 'rgba(168, 85, 247, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Bowling: </span>
                  <span className="text-sm font-semibold text-purple-300">{playerInfo.bowlingstyle}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Indicator */}
      {isFiltered && (
        <div className="mb-6 p-4 rounded-lg border-2 border-primary-400/50 shadow-lg" style={{background: 'rgba(14, 165, 233, 0.15)', backdropFilter: 'blur(10px)'}}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-lg">Filtered View Active</div>
                <div className="text-sm text-blue-200">
                  Showing stats for {selectedPhase === 'powerplay' ? 'Powerplay (Overs 1-6)' : selectedPhase === 'middle' ? 'Middle Overs (Overs 7-15)' : 'Death Overs (Overs 16-20)'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedPhase(null)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all duration-200 border border-white/30"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg relative ${isFiltered ? 'ring-4 ring-yellow-400/50' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5" />
            <div className="text-sm opacity-90">Wickets</div>
          </div>
          <div className="text-4xl font-bold">{displayStats.wickets}</div>
          {isFiltered && (
            <div className="mt-2 text-xs opacity-90 font-semibold">Phase-specific</div>
          )}
        </div>

        <div className={`bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg relative ${isFiltered ? 'ring-4 ring-yellow-400/50' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5" />
            <div className="text-sm opacity-90">Bowling Average</div>
          </div>
          <div className="text-4xl font-bold">{displayStats.bowlingAverage}</div>
          {isFiltered && (
            <div className="mt-2 text-xs opacity-90 font-semibold">Phase-specific</div>
          )}
        </div>

        <div className={`bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg relative ${isFiltered ? 'ring-4 ring-yellow-400/50' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5" />
            <div className="text-sm opacity-90">Economy Rate</div>
          </div>
          <div className="text-4xl font-bold">{displayStats.economyRate}</div>
          {isFiltered && (
            <div className="mt-2 text-xs opacity-90 font-semibold">Phase-specific</div>
          )}
        </div>

        <div className={`bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg relative ${isFiltered ? 'ring-4 ring-yellow-400/50' : ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <div className="text-sm opacity-90">Strike Rate</div>
          </div>
          <div className="text-4xl font-bold">{displayStats.bowlingStrikeRate}</div>
          {isFiltered && (
            <div className="mt-2 text-xs opacity-90 font-semibold">Phase-specific</div>
          )}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="card mb-8">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Additional Bowling Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className={`text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 relative ${isFiltered ? 'ring-2 ring-yellow-400' : ''}`}>
            <div className="text-2xl font-bold text-cyan-700">{displayStats.overs}</div>
            <div className="text-sm text-cyan-600 mt-1 font-semibold">Overs</div>
            {isFiltered && <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>}
          </div>

          <div className={`text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200 relative ${isFiltered ? 'ring-2 ring-yellow-400' : ''}`}>
            <div className="text-2xl font-bold text-indigo-700">{displayStats.balls}</div>
            <div className="text-sm text-indigo-600 mt-1 font-semibold">Balls</div>
            {isFiltered && <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>}
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 relative opacity-60">
            <div className="text-2xl font-bold text-emerald-700">{displayStats.maidens}</div>
            <div className="text-sm text-emerald-600 mt-1 font-semibold">Maidens</div>
            {isFiltered && <div className="absolute bottom-1 right-1 text-xs text-emerald-700 italic">Overall</div>}
          </div>

          <div className={`text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200 relative ${isFiltered ? 'ring-2 ring-yellow-400' : ''}`}>
            <div className="text-2xl font-bold text-rose-700">{displayStats.totalRuns}</div>
            <div className="text-sm text-rose-600 mt-1 font-semibold">Runs Conceded</div>
            {isFiltered && <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>}
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200 relative opacity-60">
            <div className="text-2xl font-bold text-violet-700">{displayStats.threeWickets}</div>
            <div className="text-sm text-violet-600 mt-1 font-semibold">3 Wicket Hauls</div>
            {isFiltered && <div className="absolute bottom-1 right-1 text-xs text-violet-700 italic">Overall</div>}
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-lg border border-pink-200 relative opacity-60">
            <div className="text-2xl font-bold text-fuchsia-700">{displayStats.fourWickets}</div>
            <div className="text-sm text-fuchsia-600 mt-1 font-semibold">4 Wicket Hauls</div>
            {isFiltered && <div className="absolute bottom-1 right-1 text-xs text-fuchsia-700 italic">Overall</div>}
          </div>
        </div>
      </div>

      {/* Five Wicket Hauls - Special Highlight */}
      {stats.fiveWickets > 0 && (
        <div className={`mb-8 rounded-2xl shadow-2xl p-8 bg-gradient-to-r from-amber-200 via-orange-200 to-amber-200 border-4 border-amber-500 transform hover:scale-105 transition-transform duration-300 relative ${isFiltered ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 via-orange-600 to-amber-500 flex items-center justify-center shadow-2xl animate-pulse">
              <Target className="w-12 h-12 text-white" />
            </div>
            <div>
              <h3 className="text-4xl font-extrabold text-orange-900 mb-2">{stats.fiveWickets} Five Wicket Hauls</h3>
              <p className="text-orange-900 font-bold text-xl">Outstanding bowling performances!</p>
              {isFiltered && (
                <p className="text-sm text-orange-800 italic mt-2">Overall career stat</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phase-wise Bowling Breakdown */}
      {stats.phaseBreakdown && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-6 h-6 text-primary-600" />
            <h3 className="text-2xl font-bold text-slate-800">Phase-wise Performance Breakdown</h3>
          </div>

          {/* Phase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Powerplay (1-6 overs) */}
            <div
              onClick={() => handlePhaseClick('powerplay')}
              className={`rounded-xl p-6 border-2 transition-all duration-300 shadow-lg cursor-pointer ${
                selectedPhase === null || selectedPhase === 'powerplay'
                  ? 'border-blue-400/40 transform hover:scale-105 opacity-100'
                  : 'opacity-30 border-blue-400/20'
              } ${
                selectedPhase === 'powerplay'
                  ? 'ring-4 ring-blue-400/50 shadow-2xl scale-105'
                  : ''
              }`}
              style={{background: 'rgba(59, 130, 246, 0.15)', backdropFilter: 'blur(10px)'}}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Powerplay</h4>
                  <p className="text-sm text-blue-200">Overs 1-6</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-blue-100">Wickets</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.powerplay.wickets}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-blue-100">Balls Bowled</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.powerplay.balls}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-blue-100">Runs Conceded</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.powerplay.runs}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-500/30 to-blue-600/30 rounded-lg backdrop-blur-sm border-2 border-blue-400/50">
                  <span className="text-sm font-semibold text-blue-100">Economy Rate</span>
                  <span className="text-2xl font-extrabold text-white">{stats.phaseBreakdown.powerplay.economyRate}</span>
                </div>
              </div>
              {selectedPhase === 'powerplay' && (
                <div className="mt-4 pt-4 border-t border-blue-300/30">
                  <div className="text-sm text-yellow-300 font-bold flex items-center gap-2 animate-pulse">
                    <Filter className="w-4 h-4" />
                    Currently filtered
                  </div>
                </div>
              )}
            </div>

            {/* Middle Overs (7-15) */}
            <div
              onClick={() => handlePhaseClick('middle')}
              className={`rounded-xl p-6 border-2 transition-all duration-300 shadow-lg cursor-pointer ${
                selectedPhase === null || selectedPhase === 'middle'
                  ? 'border-green-400/40 transform hover:scale-105 opacity-100'
                  : 'opacity-30 border-green-400/20'
              } ${
                selectedPhase === 'middle'
                  ? 'ring-4 ring-green-400/50 shadow-2xl scale-105'
                  : ''
              }`}
              style={{background: 'rgba(16, 185, 129, 0.15)', backdropFilter: 'blur(10px)'}}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Middle Overs</h4>
                  <p className="text-sm text-green-200">Overs 7-15</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-green-100">Wickets</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.middle.wickets}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-green-100">Balls Bowled</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.middle.balls}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-green-100">Runs Conceded</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.middle.runs}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-500/30 to-green-600/30 rounded-lg backdrop-blur-sm border-2 border-green-400/50">
                  <span className="text-sm font-semibold text-green-100">Economy Rate</span>
                  <span className="text-2xl font-extrabold text-white">{stats.phaseBreakdown.middle.economyRate}</span>
                </div>
              </div>
              {selectedPhase === 'middle' && (
                <div className="mt-4 pt-4 border-t border-green-300/30">
                  <div className="text-sm text-yellow-300 font-bold flex items-center gap-2 animate-pulse">
                    <Filter className="w-4 h-4" />
                    Currently filtered
                  </div>
                </div>
              )}
            </div>

            {/* Death Overs (16-20) */}
            <div
              onClick={() => handlePhaseClick('death')}
              className={`rounded-xl p-6 border-2 transition-all duration-300 shadow-lg cursor-pointer ${
                selectedPhase === null || selectedPhase === 'death'
                  ? 'border-red-400/40 transform hover:scale-105 opacity-100'
                  : 'opacity-30 border-red-400/20'
              } ${
                selectedPhase === 'death'
                  ? 'ring-4 ring-red-400/50 shadow-2xl scale-105'
                  : ''
              }`}
              style={{background: 'rgba(239, 68, 68, 0.15)', backdropFilter: 'blur(10px)'}}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Death Overs</h4>
                  <p className="text-sm text-red-200">Overs 16-20</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-red-100">Wickets</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.death.wickets}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-red-100">Balls Bowled</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.death.balls}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="text-sm font-medium text-red-100">Runs Conceded</span>
                  <span className="text-xl font-bold text-white">{stats.phaseBreakdown.death.runs}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-500/30 to-red-600/30 rounded-lg backdrop-blur-sm border-2 border-red-400/50">
                  <span className="text-sm font-semibold text-red-100">Economy Rate</span>
                  <span className="text-2xl font-extrabold text-white">{stats.phaseBreakdown.death.economyRate}</span>
                </div>
              </div>
              {selectedPhase === 'death' && (
                <div className="mt-4 pt-4 border-t border-red-300/30">
                  <div className="text-sm text-yellow-300 font-bold flex items-center gap-2 animate-pulse">
                    <Filter className="w-4 h-4" />
                    Currently filtered
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Chart Comparison */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg">
            <h4 className="text-lg font-semibold text-slate-800 mb-6">
              Economy Rate Comparison Across Phases
              {selectedPhase && (
                <span className="ml-3 text-sm text-primary-600 font-normal">
                  (Click on a bar or card to filter)
                </span>
              )}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    phase: 'Powerplay\n(1-6)',
                    phaseKey: 'powerplay',
                    'Economy Rate': stats.phaseBreakdown.powerplay.economyRate,
                    'Runs': stats.phaseBreakdown.powerplay.runs,
                    'Balls': stats.phaseBreakdown.powerplay.balls
                  },
                  {
                    phase: 'Middle\n(7-15)',
                    phaseKey: 'middle',
                    'Economy Rate': stats.phaseBreakdown.middle.economyRate,
                    'Runs': stats.phaseBreakdown.middle.runs,
                    'Balls': stats.phaseBreakdown.middle.balls
                  },
                  {
                    phase: 'Death\n(16-20)',
                    phaseKey: 'death',
                    'Economy Rate': stats.phaseBreakdown.death.economyRate,
                    'Runs': stats.phaseBreakdown.death.runs,
                    'Balls': stats.phaseBreakdown.death.balls
                  }
                ]}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    handlePhaseClick(data.activePayload[0].payload.phaseKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="phase"
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                  stroke="#94a3b8"
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  stroke="#94a3b8"
                  label={{ value: 'Economy Rate', angle: -90, position: 'insideLeft', fill: '#475569', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '2px solid #0ea5e9',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="Economy Rate"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  shape={(props) => {
                    const { fill, x, y, width, height, payload } = props;
                    const isSelected = selectedPhase === payload.phaseKey;
                    const isFiltered = selectedPhase && selectedPhase !== payload.phaseKey;

                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={isFiltered ? '#94a3b8' : fill}
                        opacity={isFiltered ? 0.3 : 1}
                        stroke={isSelected ? '#0ea5e9' : 'none'}
                        strokeWidth={isSelected ? 3 : 0}
                        rx={8}
                        ry={8}
                      />
                    );
                  }}
                  fill="#0ea5e9"
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Summary Insight */}
            <div className="mt-6 p-4 rounded-lg border-2 border-primary-400/40" style={{background: 'rgba(59, 130, 246, 0.15)', backdropFilter: 'blur(10px)'}}>
              <div className="flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-white mb-1">Performance Insight</h5>
                  <p className="text-sm text-blue-100">
                    {stats.phaseBreakdown.powerplay.economyRate <= stats.phaseBreakdown.middle.economyRate &&
                     stats.phaseBreakdown.powerplay.economyRate <= stats.phaseBreakdown.death.economyRate
                      ? `Most economical in the Powerplay phase (${stats.phaseBreakdown.powerplay.economyRate} economy). Great control in the field restrictions!`
                      : stats.phaseBreakdown.middle.economyRate <= stats.phaseBreakdown.powerplay.economyRate &&
                        stats.phaseBreakdown.middle.economyRate <= stats.phaseBreakdown.death.economyRate
                      ? `Most economical in the Middle overs (${stats.phaseBreakdown.middle.economyRate} economy). Excellent at containing runs during consolidation!`
                      : `Most economical in the Death overs (${stats.phaseBreakdown.death.economyRate} economy). Outstanding pressure bowling when it matters most!`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="card">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 relative opacity-60">
            <div className="text-sm text-blue-700 mb-1">Wickets per Match</div>
            <div className="text-2xl font-bold text-blue-900">
              {stats.matches > 0 ? (stats.wickets / stats.matches).toFixed(2) : 0}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Average wickets in {stats.matches} matches
            </div>
            {isFiltered && (
              <div className="absolute bottom-2 right-2 text-xs text-blue-800 italic">Overall</div>
            )}
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 relative opacity-60">
            <div className="text-sm text-green-700 mb-1">Dot Ball Percentage</div>
            <div className="text-2xl font-bold text-green-900">
              {stats.balls > 0 ? ((stats.dotBalls / stats.balls) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              {stats.dotBalls} dot balls in {stats.balls} deliveries
            </div>
            {isFiltered && (
              <div className="absolute bottom-2 right-2 text-xs text-green-800 italic">Overall</div>
            )}
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 relative opacity-60">
            <div className="text-sm text-purple-700 mb-1">Runs per Wicket</div>
            <div className="text-2xl font-bold text-purple-900">
              {stats.bowlingAverage}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              Bowling average
            </div>
            {isFiltered && (
              <div className="absolute bottom-2 right-2 text-xs text-purple-800 italic">Overall</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BowlerStats;
