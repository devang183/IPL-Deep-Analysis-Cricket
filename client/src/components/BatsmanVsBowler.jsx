import { useState, useEffect } from 'react';
import { Target, Loader2, AlertCircle, TrendingUp, Users, Activity, Zap } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

function BatsmanVsBowler({ player }) {
  const [bowlers, setBowlers] = useState([]);
  const [selectedBowler, setSelectedBowler] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingBowlers, setLoadingBowlers] = useState(true);

  useEffect(() => {
    fetchBowlers();
  }, []);

  const fetchBowlers = async () => {
    try {
      const response = await axios.get('/api/bowlers');
      setBowlers(response.data.bowlers);
      setLoadingBowlers(false);
    } catch (err) {
      console.error('Error fetching bowlers:', err);
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

  const handleBowlerSelect = (bowler) => {
    setSelectedBowler(bowler);
    setSearchTerm('');
    fetchMatchupStats(bowler);
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
      <div className="card mb-6">
        <label htmlFor="bowler-search" className="label">
          <Target className="w-4 h-4 inline mr-2" />
          Select Bowler to Analyze Against {player}
        </label>
        <div className="relative">
          <input
            id="bowler-search"
            type="text"
            placeholder="Search for a bowler..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            aria-label="Search for a bowler"
          />
        </div>

        {searchTerm && (
          <div className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-lg">
            {loadingBowlers ? (
              <div className="p-4 text-center text-slate-500">Loading bowlers...</div>
            ) : filteredBowlers.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No bowlers found</div>
            ) : (
              filteredBowlers.slice(0, 50).map((bowler) => (
                <button
                  key={bowler}
                  onClick={() => handleBowlerSelect(bowler)}
                  className={`w-full text-left px-4 py-2 hover:bg-primary-50 transition-colors ${
                    selectedBowler === bowler ? 'bg-primary-100 font-semibold' : ''
                  }`}
                >
                  {bowler}
                </button>
              ))
            )}
          </div>
        )}

        {selectedBowler && !searchTerm && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-600">Selected Bowler:</span>
            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-semibold">
              {selectedBowler}
            </span>
            <button
              onClick={() => {
                setSelectedBowler('');
                setStats(null);
              }}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
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
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">
              {player} vs {selectedBowler}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-3xl font-bold text-blue-600">{stats.totalRuns}</div>
                <div className="text-sm text-slate-600 mt-1">Runs Scored</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-3xl font-bold text-green-600">{stats.totalBalls}</div>
                <div className="text-sm text-slate-600 mt-1">Balls Faced</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-3xl font-bold text-purple-600">{stats.strikeRate}</div>
                <div className="text-sm text-slate-600 mt-1">Strike Rate</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-3xl font-bold text-red-600">{stats.dismissals}</div>
                <div className="text-sm text-slate-600 mt-1">Dismissals</div>
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
                  Dismissal Information
                </h4>
                <div className="space-y-3">
                  {stats.dismissalDetails.map((dismissal, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-red-800">
                            {dismissal.wicketType || 'Dismissed'}
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            Over: {dismissal.over} • Runs: {dismissal.runsScored}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          Phase: {dismissal.phase}
                        </div>
                      </div>
                    </div>
                  ))}
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
