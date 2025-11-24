import { useState } from 'react';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function PhaseAnalysis({ player }) {
  const [formData, setFormData] = useState({
    ballsPlayedBefore: 15,
    oversPlayedBefore: 7,
    nextOvers: 3,
    ballsInNextPhase: 10,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/api/analyze/phase-performance', {
        player,
        ...formData,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze performance');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: parseInt(e.target.value) || 0,
    });
  };

  const COLORS = ['#0ea5e9', '#06b6d4', '#8b5cf6', '#ec4899'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-6 h-6 text-primary-600" />
        <h2 className="text-2xl font-bold text-slate-800">Phase Performance Analysis</h2>
      </div>

      {/* Explanation Box */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 mb-6 border border-blue-200">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-blue-700">Query Format:</span> If a batsman has played <span className="font-semibold text-blue-600">a</span> balls by over <span className="font-semibold text-blue-600">b</span>, what happens in the next <span className="font-semibold text-blue-600">c</span> overs (minimum <span className="font-semibold text-blue-600">d</span> balls)?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mb-8" aria-label="Phase performance analysis form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="ballsPlayedBefore" className="label">Balls Played Before Phase</label>
            <input
              id="ballsPlayedBefore"
              type="number"
              name="ballsPlayedBefore"
              value={formData.ballsPlayedBefore}
              onChange={handleChange}
              className="input-field"
              min="0"
              required
              aria-describedby="ballsPlayedBefore-help"
            />
            <p id="ballsPlayedBefore-help" className="text-xs text-slate-500 mt-1">
              Minimum balls the player has faced before the analysis phase
            </p>
          </div>

          <div>
            <label htmlFor="oversPlayedBefore" className="label">Overs Played Before Phase</label>
            <input
              id="oversPlayedBefore"
              type="number"
              name="oversPlayedBefore"
              value={formData.oversPlayedBefore}
              onChange={handleChange}
              className="input-field"
              min="0"
              max="20"
              required
              aria-describedby="oversPlayedBefore-help"
            />
            <p id="oversPlayedBefore-help" className="text-xs text-slate-500 mt-1">
              The over number when the analysis phase begins
            </p>
          </div>

          <div>
            <label htmlFor="nextOvers" className="label">Next Overs to Analyze</label>
            <input
              id="nextOvers"
              type="number"
              name="nextOvers"
              value={formData.nextOvers}
              onChange={handleChange}
              className="input-field"
              min="1"
              max="20"
              required
              aria-describedby="nextOvers-help"
            />
            <p id="nextOvers-help" className="text-xs text-slate-500 mt-1">
              Number of overs in the analysis phase
            </p>
          </div>

          <div>
            <label htmlFor="ballsInNextPhase" className="label">Balls in Next Phase</label>
            <input
              id="ballsInNextPhase"
              type="number"
              name="ballsInNextPhase"
              value={formData.ballsInNextPhase}
              onChange={handleChange}
              className="input-field"
              min="1"
              required
              aria-describedby="ballsInNextPhase-help"
            />
            <p id="ballsInNextPhase-help" className="text-xs text-slate-500 mt-1">
              Minimum balls to face in the analysis phase
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary w-full md:w-auto"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" aria-hidden="true" />
              Analyzing...
            </>
          ) : (
            'Analyze Performance'
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

      {result && result.analysis && (
        <div className="space-y-6" role="region" aria-live="polite" aria-label="Analysis results">
          <div className="rounded-xl p-6 border-2 border-blue-400/40" style={{background: 'rgba(59, 130, 246, 0.1)', backdropFilter: 'blur(10px)'}}>
            <h3 className="text-lg font-semibold text-white mb-5">
              Query: If {player} has played {formData.ballsPlayedBefore} balls by over {formData.oversPlayedBefore},
              what happens in the next {formData.nextOvers} overs (minimum {formData.ballsInNextPhase} balls)?
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-xl border-2 border-blue-400 transform hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-extrabold text-white">
                  {result.analysis.averageRuns}
                </div>
                <div className="text-sm text-blue-100 mt-2 font-semibold">Average Runs</div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 shadow-xl border-2 border-green-400 transform hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-extrabold text-white">
                  {result.analysis.strikeRate}
                </div>
                <div className="text-sm text-green-100 mt-2 font-semibold">Strike Rate</div>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 shadow-xl border-2 border-orange-400 transform hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-extrabold text-white">
                  {result.analysis.dismissalRate}%
                </div>
                <div className="text-sm text-orange-100 mt-2 font-semibold">Dismissal Rate</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 shadow-xl border-2 border-purple-400 transform hover:scale-105 transition-transform duration-300">
                <div className="text-4xl font-extrabold text-white">
                  {result.matchingInnings}
                </div>
                <div className="text-sm text-purple-100 mt-2 font-semibold">Innings Analyzed</div>
              </div>
            </div>
          </div>

          {result.analysis.runsDistribution && result.analysis.runsDistribution.length > 0 && (
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <h4 className="text-lg font-semibold text-slate-800 mb-4">Runs Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={result.analysis.runsDistribution.reduce((acc, runs) => {
                    const bucket = Math.floor(runs / 5) * 5;
                    const existing = acc.find(item => item.range === `${bucket}-${bucket + 4}`);
                    if (existing) {
                      existing.count++;
                    } else {
                      acc.push({ range: `${bucket}-${bucket + 4}`, count: 1 });
                    }
                    return acc;
                  }, []).sort((a, b) => parseInt(a.range) - parseInt(b.range))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" label={{ value: 'Runs Range', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Total Runs Scored</div>
              <div className="text-2xl font-bold text-slate-800">{result.analysis.totalRuns}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Total Balls Faced</div>
              <div className="text-2xl font-bold text-slate-800">{result.analysis.totalBalls}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-sm text-slate-600 mb-1">Times Dismissed</div>
              <div className="text-2xl font-bold text-slate-800">{result.analysis.dismissals}</div>
            </div>
          </div>
        </div>
      )}

      {result && !result.analysis && (
        <div
          role="status"
          aria-live="polite"
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
        >
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" aria-hidden="true" />
          <h4 className="font-semibold text-yellow-800 mb-2">No Data Found</h4>
          <p className="text-yellow-700">
            No innings match the specified criteria. Try adjusting the parameters.
          </p>
        </div>
      )}
    </div>
  );
}

export default PhaseAnalysis;
