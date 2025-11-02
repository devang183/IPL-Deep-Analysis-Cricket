import { useState, useEffect } from 'react';
import { Target, Loader2, AlertCircle, TrendingDown, Activity, Zap, User } from 'lucide-react';
import axios from 'axios';

function BowlerStats({ player }) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-slate-600">Loading bowling statistics...</span>
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
            <TrendingDown className="w-5 h-5" />
            <div className="text-sm opacity-90">Bowling Average</div>
          </div>
          <div className="text-4xl font-bold">{stats.bowlingAverage}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5" />
            <div className="text-sm opacity-90">Economy Rate</div>
          </div>
          <div className="text-4xl font-bold">{stats.economyRate}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <div className="text-sm opacity-90">Strike Rate</div>
          </div>
          <div className="text-4xl font-bold">{stats.bowlingStrikeRate}</div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="card mb-8">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Additional Bowling Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-cyan-700">{stats.overs}</div>
            <div className="text-sm text-cyan-600 mt-1 font-semibold">Overs</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
            <div className="text-2xl font-bold text-indigo-700">{stats.balls}</div>
            <div className="text-sm text-indigo-600 mt-1 font-semibold">Balls</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-emerald-700">{stats.maidens}</div>
            <div className="text-sm text-emerald-600 mt-1 font-semibold">Maidens</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-rose-700">{stats.totalRuns}</div>
            <div className="text-sm text-rose-600 mt-1 font-semibold">Runs Conceded</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-violet-700">{stats.threeWickets}</div>
            <div className="text-sm text-violet-600 mt-1 font-semibold">3 Wicket Hauls</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-lg border border-pink-200">
            <div className="text-2xl font-bold text-fuchsia-700">{stats.fourWickets}</div>
            <div className="text-sm text-fuchsia-600 mt-1 font-semibold">4 Wicket Hauls</div>
          </div>
        </div>
      </div>

      {/* Five Wicket Hauls - Special Highlight */}
      {stats.fiveWickets > 0 && (
        <div className="card mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-orange-900">{stats.fiveWickets} Five Wicket Hauls</h3>
              <p className="text-orange-700">Outstanding bowling performances!</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="card">
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Wickets per Match</div>
            <div className="text-2xl font-bold text-blue-900">
              {stats.matches > 0 ? (stats.wickets / stats.matches).toFixed(2) : 0}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Average wickets in {stats.matches} matches
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Dot Ball Percentage</div>
            <div className="text-2xl font-bold text-green-900">
              {stats.balls > 0 ? ((stats.dotBalls / stats.balls) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-green-600 mt-1">
              {stats.dotBalls} dot balls in {stats.balls} deliveries
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="text-sm text-purple-700 mb-1">Runs per Wicket</div>
            <div className="text-2xl font-bold text-purple-900">
              {stats.bowlingAverage}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              Bowling average
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BowlerStats;
