import { useState, useEffect } from 'react';
import { Target, Loader2, AlertCircle, TrendingUp, Activity, Zap, BarChart3, Award, Shield, X } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';

// Hover card component to display bowlers list
const BowlersHoverCard = ({ bowlers, styleName }) => {
  return (
    <div className="absolute left-0 top-full mt-2 bg-white shadow-2xl rounded-xl p-4 w-full md:w-96 z-50 border-2 border-primary-200 animate-fade-in">
      {/* Header */}
      <div className="mb-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">
              {styleName} Bowlers
            </h4>
            <p className="text-xs text-slate-500">
              {bowlers.length} bowler{bowlers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Bowlers Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
        {bowlers.map((bowler, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-2 hover:border-primary-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-primary-600 flex-shrink-0" />
              <span className="text-xs font-medium text-slate-700 truncate">
                {bowler}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function BatsmanVsBowlingStyle({ player }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerImage, setPlayerImage] = useState(null);
  const [hoveredStyle, setHoveredStyle] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchPlayerImage();
  }, [player]);

  const fetchPlayerImage = async () => {
    try {
      const response = await axios.get(`/api/player/${encodeURIComponent(player)}/image`);
      if (response.data.image_path) {
        setPlayerImage(response.data.image_path);
      }
    } catch (error) {
      console.error('Error fetching player image:', error);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/batsman-vs-bowling-style/${encodeURIComponent(player)}`);
      console.log('API Response:', response.data);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching bowling style stats:', err);
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  // Color schemes for different bowling styles
  const getColorForStyle = (style) => {
    const colorMap = {
      'right-arm-fast': '#ef4444',
      'right-arm-fast-medium': '#f97316',
      'right-arm-medium': '#f59e0b',
      'left-arm-fast': '#dc2626',
      'left-arm-medium': '#ea580c',
      'right-arm-offbreak': '#3b82f6',
      'right-arm-legbreak': '#8b5cf6',
      'left-arm-orthodox': '#06b6d4',
      'left-arm-chinaman': '#10b981',
      'left-arm-wrist-spin': '#14b8a6',
      'slow-left-arm-orthodox': '#0ea5e9',
      'Unknown': '#6b7280'
    };
    return colorMap[style] || '#8b5cf6';
  };

  const formatBowlingStyle = (style) => {
    if (!style || style === 'Unknown') return 'Unknown Style';
    return style.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getBowlingTypeCategory = (style) => {
    if (style.includes('fast') || style.includes('medium')) return 'Pace';
    if (style.includes('spin') || style.includes('break') || style.includes('orthodox') || style.includes('chinaman')) return 'Spin';
    return 'Other';
  };

  // Prepare data for radar chart (normalized metrics)
  const radarData = stats?.stats?.slice(0, 6).map(stat => ({
    style: formatBowlingStyle(stat.bowlingStyle).substring(0, 15),
    'Strike Rate': Math.min(stat.strikeRate, 200),
    'Average': Math.min(stat.average, 100),
    'Boundary %': stat.boundaryPercentage * 2, // Scale up for visibility
  })) || [];

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />
        <p className="text-slate-600">Loading bowling style statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-800 text-sm">Error</h4>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats || !stats.stats || stats.stats.length === 0) {
    return (
      <div className="card text-center py-16">
        <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Data Available</h3>
        <p className="text-slate-500">
          No bowling style statistics available for {player}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Player Info */}
      <div className="flex items-center gap-4 mb-6">
        {playerImage && (
          <div className="flex-shrink-0">
            <img
              src={playerImage}
              alt={player}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 shadow-lg"
            />
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {player} vs Bowling Styles
          </h2>
          <p className="text-slate-600">
            Performance analysis against {stats.totalBowlingStyles} different bowling styles
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" />
            <div className="text-sm opacity-90">Bowling Styles Faced</div>
          </div>
          <div className="text-4xl font-bold">{stats.totalBowlingStyles}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5" />
            <div className="text-sm opacity-90">Best Strike Rate</div>
          </div>
          <div className="text-4xl font-bold">
            {Math.max(...stats.stats.map(s => s.strikeRate)).toFixed(0)}
          </div>
          <div className="text-xs opacity-75 mt-1">
            vs {formatBowlingStyle(stats.stats.reduce((max, s) => s.strikeRate > max.strikeRate ? s : max).bowlingStyle)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5" />
            <div className="text-sm opacity-90">Best Average</div>
          </div>
          <div className="text-4xl font-bold">
            {Math.max(...stats.stats.map(s => s.average)).toFixed(0)}
          </div>
          <div className="text-xs opacity-75 mt-1">
            vs {formatBowlingStyle(stats.stats.reduce((max, s) => s.average > max.average ? s : max).bowlingStyle)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" />
            <div className="text-sm opacity-90">Most Boundaries %</div>
          </div>
          <div className="text-4xl font-bold">
            {Math.max(...stats.stats.map(s => s.boundaryPercentage)).toFixed(1)}%
          </div>
          <div className="text-xs opacity-75 mt-1">
            vs {formatBowlingStyle(stats.stats.reduce((max, s) => s.boundaryPercentage > max.boundaryPercentage ? s : max).bowlingStyle)}
          </div>
        </div>
      </div>

      {/* Detailed Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats.stats.map((stat, index) => (
          <div
            key={index}
            className="card hover:shadow-xl transition-all duration-300 border-2"
            style={{ borderColor: getColorForStyle(stat.bowlingStyle) + '40' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: getColorForStyle(stat.bowlingStyle) }}
                >
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {formatBowlingStyle(stat.bowlingStyle)}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {getBowlingTypeCategory(stat.bowlingStyle)} Bowling
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: getColorForStyle(stat.bowlingStyle) }}>
                  {stat.strikeRate}
                </div>
                <div className="text-xs text-slate-500">Strike Rate</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                <div className="text-2xl font-bold text-cyan-700">{stat.runs}</div>
                <div className="text-xs text-cyan-600 mt-1">Runs</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-700">{stat.balls}</div>
                <div className="text-xs text-emerald-600 mt-1">Balls</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-700">{stat.average}</div>
                <div className="text-xs text-amber-600 mt-1">Average</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="text-lg font-bold text-purple-700">{stat.fours}</div>
                <div className="text-xs text-purple-600">4s</div>
              </div>
              <div className="text-center p-2 bg-violet-50 rounded">
                <div className="text-lg font-bold text-violet-700">{stat.sixes}</div>
                <div className="text-xs text-violet-600">6s</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="text-lg font-bold text-orange-700">{stat.boundaryPercentage}%</div>
                <div className="text-xs text-orange-600">Boundary%</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="text-lg font-bold text-red-700">{stat.dismissals}</div>
                <div className="text-xs text-red-600">Outs</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <div className="text-xs text-slate-500">
                  Faced {stat.bowlersFaced} different bowler{stat.bowlersFaced !== 1 ? 's' : ''} of this style
                </div>
                {stat.bowlers && stat.bowlers.length > 0 ? (
                  <div className="relative group">
                    <button
                      onMouseEnter={() => setHoveredStyle(stat.bowlingStyle)}
                      onMouseLeave={() => setHoveredStyle(null)}
                      onClick={() => setHoveredStyle(hoveredStyle === stat.bowlingStyle ? null : stat.bowlingStyle)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                    >
                      View Bowlers ({stat.bowlers.length})
                    </button>

                    {/* Hover Card - Shows on hover (desktop) or click (mobile) */}
                    {hoveredStyle === stat.bowlingStyle && (
                      <BowlersHoverCard
                        bowlers={stat.bowlers}
                        styleName={formatBowlingStyle(stat.bowlingStyle)}
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No bowlers data</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strike Rate Comparison Chart */}
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Strike Rate by Bowling Style
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="bowlingStyle"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatBowlingStyle(value).substring(0, 15)}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => value.toFixed(2)}
                labelFormatter={(label) => formatBowlingStyle(label)}
              />
              <Legend />
              <Bar dataKey="strikeRate" fill="#3b82f6" name="Strike Rate" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-primary-600" />
            Performance Radar (Top 6 Styles)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="style" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 200]} />
              <Radar name="Strike Rate" dataKey="Strike Rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name="Average" dataKey="Average" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Radar name="Boundary %" dataKey="Boundary %" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Comparison */}
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Average by Bowling Style
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="bowlingStyle"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatBowlingStyle(value).substring(0, 15)}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => value.toFixed(2)}
                labelFormatter={(label) => formatBowlingStyle(label)}
              />
              <Legend />
              <Bar dataKey="average" fill="#10b981" name="Average" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Boundary Percentage */}
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary-600" />
            Boundary Percentage
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="bowlingStyle"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatBowlingStyle(value).substring(0, 15)}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => `${value.toFixed(1)}%`}
                labelFormatter={(label) => formatBowlingStyle(label)}
              />
              <Legend />
              <Bar dataKey="boundaryPercentage" fill="#f59e0b" name="Boundary %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default BatsmanVsBowlingStyle;
