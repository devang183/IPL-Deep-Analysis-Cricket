import { useState, useEffect } from 'react';
import { BarChart3, Loader2, AlertCircle, TrendingUp, Target, Activity } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

function PlayerStats({ player }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
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

  const boundaryData = [
    { name: 'Fours', value: stats.fours },
    { name: 'Sixes', value: stats.sixes },
    { name: 'Singles/Doubles', value: stats.totalBalls - stats.fours - stats.sixes - stats.dots },
    { name: 'Dots', value: stats.dots },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-slate-800">Overall Statistics for {player}</h2>
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
                {((stats.boundaries / stats.totalBalls) * 100).toFixed(1)}%
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{stats.dots}</div>
            <div className="text-sm text-slate-600 mt-1">Dot Balls</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{stats.dotPercentage}%</div>
            <div className="text-sm text-slate-600 mt-1">Dot %</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{stats.dismissals}</div>
            <div className="text-sm text-slate-600 mt-1">Dismissals</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">
              {((stats.totalRuns / stats.totalBalls) * 6).toFixed(2)}
            </div>
            <div className="text-sm text-slate-600 mt-1">Runs per Over</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerStats;
