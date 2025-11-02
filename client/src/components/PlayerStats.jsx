import { useState, useEffect } from 'react';
import { BarChart3, Loader2, AlertCircle, TrendingUp, Target, Activity, User } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

function PlayerStats({ player }) {
  const [stats, setStats] = useState(null);
  const [playerImage, setPlayerImage] = useState(null);
  const [playerInfo, setPlayerInfo] = useState({ battingstyle: null, bowlingstyle: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchPlayerImage();
  }, [player]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/stats/${player}`);
      setStats(response.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch statistics');
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

  const COLORS = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-slate-600">Loading statistics...</span>
      </div>
    );
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

  // Use ballDistribution from API if available, otherwise calculate
  const boundaryData = stats.ballDistribution || [
    { name: 'Dots', value: stats.dots || 0 },
    { name: 'Singles/Doubles', value: (stats.totalBalls || 0) - (stats.dots || 0) - (stats.boundaries || 0) },
    { name: 'Fours', value: stats.fours || 0 },
    { name: 'Sixes', value: stats.sixes || 0 },
  ];

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
            <BarChart3 className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-slate-800">Overall Statistics for {player}</h2>
          </div>

          {/* Batting and Bowling Styles */}
          {(playerInfo.battingstyle || playerInfo.bowlingstyle) && (
            <div className="flex flex-wrap gap-3 mt-3">
              {playerInfo.battingstyle && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-400/30" style={{background: 'rgba(59, 130, 246, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                  <Target className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Batting: </span>
                  <span className="text-sm font-semibold text-blue-300">{playerInfo.battingstyle}</span>
                </div>
              )}
              {playerInfo.bowlingstyle && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-purple-400/30" style={{background: 'rgba(168, 85, 247, 0.1)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'}}>
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Bowling: </span>
                  <span className="text-sm font-semibold text-purple-300">{playerInfo.bowlingstyle}</span>
                </div>
              )}
            </div>
          )}
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
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium text-slate-700">Boundary %</span>
              <span className="text-2xl font-bold text-slate-600">
                {stats.boundaries && stats.totalBalls
                  ? (((stats.boundaries / stats.totalBalls) * 100).toFixed(1))
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Ball Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={boundaryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
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
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">
              {stats.runsPerOver !== undefined && stats.runsPerOver !== null
                ? stats.runsPerOver
                : stats.totalRuns && stats.totalBalls
                ? ((stats.totalRuns / stats.totalBalls) * 6).toFixed(2)
                : 0}
            </div>
            <div className="text-sm text-slate-600 mt-1">Runs per Over</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-amber-700">{stats.fifties || 0}</div>
            <div className="text-sm text-amber-600 mt-1 font-semibold">Fifties (50s)</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-emerald-700">{stats.hundreds || 0}</div>
            <div className="text-sm text-emerald-600 mt-1 font-semibold">Hundreds (100s)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerStats;
