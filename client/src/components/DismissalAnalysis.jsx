import { useState } from 'react';
import { Target, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

function DismissalAnalysis({ player, initialBallsPlayed }) {
  const [ballsPlayed, setBallsPlayed] = useState(initialBallsPlayed || 20);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/analyze/dismissal-patterns', {
        player,
        ballsPlayed: parseInt(ballsPlayed),
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze dismissals');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-slate-800">Dismissal Pattern Analysis</h2>
      </div>

      <form onSubmit={handleSubmit} className="mb-8" aria-label="Dismissal analysis form">
        <div className="max-w-md">
          <label htmlFor="ballsPlayed" className="label">Balls Played Threshold</label>
          <input
            id="ballsPlayed"
            type="number"
            value={ballsPlayed}
            onChange={(e) => setBallsPlayed(e.target.value)}
            className="input-field"
            min="1"
            required
            aria-describedby="ballsPlayed-help"
          />
          <p id="ballsPlayed-help" className="text-xs text-slate-500 mt-1">
            Analyze dismissals that occurred after playing at least this many balls
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary mt-4"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" aria-hidden="true" />
              Analyzing...
            </>
          ) : (
            'Analyze Dismissals'
          )}
        </button>
      </form>

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

      {result && result.totalDismissals > 0 && (
        <div className="space-y-6" role="region" aria-live="polite" aria-label="Dismissal analysis results">
          <div className="rounded-xl p-6 border-2 border-orange-400/40" style={{background: 'rgba(249, 115, 22, 0.1)', backdropFilter: 'blur(10px)'}}>
            <h3 className="text-lg font-semibold text-white mb-3">
              Where does {player} get out most after playing {ballsPlayed}+ balls?
            </h3>
            <div className="text-4xl font-extrabold text-white mt-4">
              {result.totalDismissals} dismissals analyzed
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Over Ranges */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Dismissals by Phase</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(result.overRanges).map(([name, value]) => ({
                      name,
                      value,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(result.overRanges).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {Object.entries(result.overRanges).map(([phase, count], index) => (
                  <div key={phase} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-700">{phase}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dismissal Types (wicket_type) */}
            {Object.keys(result.dismissalTypes).length > 0 && (
              <div className="bg-white rounded-lg p-6 border border-slate-200">
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Dismissal Types</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(result.dismissalTypes)
                      .map(([name, value]) => ({ name, value }))
                      .sort((a, b) => b.value - a.value)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Dismissal Kinds (wicket_kind) */}
          {result.dismissalKinds && Object.keys(result.dismissalKinds).length > 0 && (
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Dismissal Kinds (Fielding Method)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(result.dismissalKinds)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8b5cf6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(result.dismissalKinds)
                  .sort((a, b) => b[1] - a[1])
                  .map(([kind, count], index) => (
                    <div key={kind} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">{kind}</span>
                      <span className="text-lg font-bold text-purple-600">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800 mb-4">Key Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="text-sm text-blue-700 mb-1">Most Vulnerable Phase</div>
                <div className="text-xl font-bold text-blue-900">
                  {Object.entries(result.overRanges).sort((a, b) => b[1] - a[1])[0][0]}
                </div>
                <div className="text-sm text-blue-600 mt-1">
                  {Object.entries(result.overRanges).sort((a, b) => b[1] - a[1])[0][1]} dismissals
                </div>
              </div>
              
              {Object.keys(result.dismissalTypes).length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="text-sm text-purple-700 mb-1">Most Common Dismissal</div>
                  <div className="text-xl font-bold text-purple-900">
                    {Object.entries(result.dismissalTypes).sort((a, b) => b[1] - a[1])[0][0]}
                  </div>
                  <div className="text-sm text-purple-600 mt-1">
                    {Object.entries(result.dismissalTypes).sort((a, b) => b[1] - a[1])[0][1]} times
                  </div>
                </div>
              )}
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="text-sm text-green-700 mb-1">Safest Phase</div>
                <div className="text-xl font-bold text-green-900">
                  {Object.entries(result.overRanges).sort((a, b) => a[1] - b[1])[0][0]}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {Object.entries(result.overRanges).sort((a, b) => a[1] - b[1])[0][1]} dismissals
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && result.totalDismissals === 0 && (
        <div
          role="status"
          aria-live="polite"
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
        >
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" aria-hidden="true" />
          <h4 className="font-semibold text-yellow-800 mb-2">No Dismissals Found</h4>
          <p className="text-yellow-700">
            No dismissals found after playing {ballsPlayed}+ balls. Try a lower threshold.
          </p>
        </div>
      )}
    </div>
  );
}

export default DismissalAnalysis;
