import { useState, useEffect } from 'react';
import { Users, TrendingUp, Target, Zap, Award, BarChart3, Shield, Activity, Loader2, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';

function BatsmanVsBatsman() {
  const [batsman1, setBatsman1] = useState('');
  const [batsman2, setBatsman2] = useState('');
  const [searchTerm1, setSearchTerm1] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [showSuggestions1, setShowSuggestions1] = useState(false);
  const [showSuggestions2, setShowSuggestions2] = useState(false);

  // Fetch all players on component mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get('/api/players');
        setAllPlayers(response.data.players || []);
      } catch (err) {
        console.error('Error fetching players:', err);
      } finally {
        setPlayersLoading(false);
      }
    };
    fetchPlayers();
  }, []);

  // Filter players based on search term
  const getFilteredPlayers = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    return allPlayers
      .filter(player => player.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 10);
  };

  const suggestions1 = getFilteredPlayers(searchTerm1);
  const suggestions2 = getFilteredPlayers(searchTerm2);

  const handleCompare = async () => {
    if (!batsman1 || !batsman2) {
      setError('Please select both batsmen to compare');
      return;
    }

    if (batsman1 === batsman2) {
      setError('Please select two different batsmen');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/compare/batsmen', {
        batsman1,
        batsman2,
      });
      setComparison(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to compare batsmen');
    } finally {
      setLoading(false);
    }
  };

  // Calculate winner for each metric
  const getWinner = (value1, value2) => {
    if (value1 > value2) return 'batsman1';
    if (value2 > value1) return 'batsman2';
    return 'tie';
  };

  if (!comparison) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-slate-800">Batsman vs Batsman</h2>
        </div>

        {/* Explanation Box */}
        <div className="bg-purple-500/10 backdrop-blur-sm rounded-lg p-4 mb-6 border border-purple-300/50">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-purple-800">Compare Performance:</span> Select two batsmen to see comprehensive head-to-head comparison across all IPL seasons with detailed metrics, visualizations, and insights.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Batsman 1 */}
            <div className="relative">
              <label className="label">First Batsman</label>
              <input
                type="text"
                value={searchTerm1 || batsman1}
                onChange={(e) => {
                  setSearchTerm1(e.target.value);
                  setBatsman1('');
                  setShowSuggestions1(true);
                }}
                onFocus={() => setShowSuggestions1(true)}
                className="input-field"
                placeholder="Enter batsman name..."
                disabled={playersLoading}
              />
              {showSuggestions1 && suggestions1.length > 0 && (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setShowSuggestions1(false)} />
                  <div className="absolute top-full mt-1 w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-2xl border border-white/20 overflow-hidden z-[9999] max-h-60 overflow-y-auto custom-scrollbar">
                    {suggestions1.map((player, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setBatsman1(player);
                          setSearchTerm1('');
                          setShowSuggestions1(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
                      >
                        {player}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Batsman 2 */}
            <div className="relative">
              <label className="label">Second Batsman</label>
              <input
                type="text"
                value={searchTerm2 || batsman2}
                onChange={(e) => {
                  setSearchTerm2(e.target.value);
                  setBatsman2('');
                  setShowSuggestions2(true);
                }}
                onFocus={() => setShowSuggestions2(true)}
                className="input-field"
                placeholder="Enter batsman name..."
                disabled={playersLoading}
              />
              {showSuggestions2 && suggestions2.length > 0 && (
                <>
                  <div className="fixed inset-0 z-[9998]" onClick={() => setShowSuggestions2(false)} />
                  <div className="absolute top-full mt-1 w-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-2xl border border-white/20 overflow-hidden z-[9999] max-h-60 overflow-y-auto custom-scrollbar">
                    {suggestions2.map((player, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setBatsman2(player);
                          setSearchTerm2('');
                          setShowSuggestions2(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-white/90 hover:bg-white/10 transition-colors"
                      >
                        {player}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800">Error</h4>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={loading || !batsman1 || !batsman2}
            className="btn-primary w-full md:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Comparing...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 inline mr-2" />
                Compare Batsmen
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const { batsman1: b1Data, batsman2: b2Data } = comparison;

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'Strike Rate',
      [batsman1]: Math.min(b1Data.strikeRate, 200),
      [batsman2]: Math.min(b2Data.strikeRate, 200),
    },
    {
      metric: 'Average',
      [batsman1]: Math.min(b1Data.average, 100),
      [batsman2]: Math.min(b2Data.average, 100),
    },
    {
      metric: 'Boundary %',
      [batsman1]: b1Data.boundaryPercentage * 2,
      [batsman2]: b2Data.boundaryPercentage * 2,
    },
    {
      metric: 'Consistency',
      [batsman1]: (b1Data.fifties + b1Data.hundreds) * 5,
      [batsman2]: (b2Data.fifties + b2Data.hundreds) * 5,
    },
  ];

  // Bar chart data for key stats
  const statsComparison = [
    {
      metric: 'Runs',
      [batsman1]: b1Data.totalRuns,
      [batsman2]: b2Data.totalRuns,
    },
    {
      metric: 'Strike Rate',
      [batsman1]: b1Data.strikeRate,
      [batsman2]: b2Data.strikeRate,
    },
    {
      metric: 'Average',
      [batsman1]: b1Data.average,
      [batsman2]: b2Data.average,
    },
    {
      metric: 'Sixes',
      [batsman1]: b1Data.sixes,
      [batsman2]: b2Data.sixes,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-slate-800">Batsman vs Batsman</h2>
        </div>
        <button
          onClick={() => {
            setComparison(null);
            setBatsman1('');
            setBatsman2('');
          }}
          className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
        >
          <X className="w-4 h-4" />
          New Comparison
        </button>
      </div>

      {/* Player Names Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold">{batsman1}</h3>
            <p className="text-sm text-white/80 mt-1">{b1Data.matches} Matches</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <div className="text-center md:text-right">
            <h3 className="text-2xl md:text-3xl font-bold">{batsman2}</h3>
            <p className="text-sm text-white/80 mt-1">{b2Data.matches} Matches</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Runs"
          value1={b1Data.totalRuns}
          value2={b2Data.totalRuns}
          winner={getWinner(b1Data.totalRuns, b2Data.totalRuns)}
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Strike Rate"
          value1={b1Data.strikeRate}
          value2={b2Data.strikeRate}
          winner={getWinner(b1Data.strikeRate, b2Data.strikeRate)}
          icon={Zap}
          color="yellow"
        />
        <MetricCard
          title="Average"
          value1={b1Data.average}
          value2={b2Data.average}
          winner={getWinner(b1Data.average, b2Data.average)}
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Sixes"
          value1={b1Data.sixes}
          value2={b2Data.sixes}
          winner={getWinner(b1Data.sixes, b2Data.sixes)}
          icon={Award}
          color="purple"
        />
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batsman 1 Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            {batsman1}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Matches" value={b1Data.matches} />
            <StatItem label="Innings" value={b1Data.innings} />
            <StatItem label="Runs" value={b1Data.totalRuns} />
            <StatItem label="Average" value={b1Data.average} />
            <StatItem label="Strike Rate" value={b1Data.strikeRate} />
            <StatItem label="Highest Score" value={b1Data.highestScore} />
            <StatItem label="Fifties" value={b1Data.fifties} />
            <StatItem label="Hundreds" value={b1Data.hundreds} />
            <StatItem label="Fours" value={b1Data.fours} />
            <StatItem label="Sixes" value={b1Data.sixes} />
            <StatItem label="Boundary %" value={`${b1Data.boundaryPercentage}%`} />
            <StatItem label="Balls Faced" value={b1Data.ballsFaced} />
          </div>
        </div>

        {/* Batsman 2 Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            {batsman2}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <StatItem label="Matches" value={b2Data.matches} />
            <StatItem label="Innings" value={b2Data.innings} />
            <StatItem label="Runs" value={b2Data.totalRuns} />
            <StatItem label="Average" value={b2Data.average} />
            <StatItem label="Strike Rate" value={b2Data.strikeRate} />
            <StatItem label="Highest Score" value={b2Data.highestScore} />
            <StatItem label="Fifties" value={b2Data.fifties} />
            <StatItem label="Hundreds" value={b2Data.hundreds} />
            <StatItem label="Fours" value={b2Data.fours} />
            <StatItem label="Sixes" value={b2Data.sixes} />
            <StatItem label="Boundary %" value={`${b2Data.boundaryPercentage}%`} />
            <StatItem label="Balls Faced" value={b2Data.ballsFaced} />
          </div>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            Performance Radar
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 200]} />
              <Radar name={batsman1} dataKey={batsman1} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name={batsman2} dataKey={batsman2} stroke="#a855f7" fill="#a855f7" fillOpacity={0.6} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-600" />
            Key Stats Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statsComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={batsman1} fill="#3b82f6" />
              <Bar dataKey={batsman2} fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Insights */}
      <div className="card">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-primary-600" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightCard
            title="Experience"
            insight={`${batsman1} has played ${b1Data.matches} matches vs ${batsman2}'s ${b2Data.matches} matches`}
            winner={getWinner(b1Data.matches, b2Data.matches)}
            color="blue"
          />
          <InsightCard
            title="Power Hitting"
            insight={`${batsman1}: ${b1Data.sixes} sixes vs ${batsman2}: ${b2Data.sixes} sixes`}
            winner={getWinner(b1Data.sixes, b2Data.sixes)}
            color="purple"
          />
          <InsightCard
            title="Consistency"
            insight={`${batsman1}: ${b1Data.fifties + b1Data.hundreds} scores of 50+ vs ${batsman2}: ${b2Data.fifties + b2Data.hundreds}`}
            winner={getWinner(b1Data.fifties + b1Data.hundreds, b2Data.fifties + b2Data.hundreds)}
            color="green"
          />
          <InsightCard
            title="Aggression"
            insight={`${batsman1}: ${b1Data.strikeRate} SR vs ${batsman2}: ${b2Data.strikeRate} SR`}
            winner={getWinner(b1Data.strikeRate, b2Data.strikeRate)}
            color="orange"
          />
        </div>
      </div>
    </div>
  );
}

// Helper Components
const MetricCard = ({ title, value1, value2, winner, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-400',
    yellow: 'from-yellow-500 to-yellow-600 border-yellow-400',
    green: 'from-green-500 to-green-600 border-green-400',
    purple: 'from-purple-500 to-purple-600 border-purple-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 shadow-lg border-2 text-white`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <div className="text-xs opacity-90">{title}</div>
      </div>
      <div className="space-y-1">
        <div className={`text-lg font-bold ${winner === 'batsman1' ? 'text-white' : 'text-white/60'}`}>
          {value1}
        </div>
        <div className={`text-lg font-bold ${winner === 'batsman2' ? 'text-white' : 'text-white/60'}`}>
          {value2}
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value }) => (
  <div className="bg-white/50 rounded-lg p-3">
    <div className="text-xs text-slate-600 mb-1">{label}</div>
    <div className="text-lg font-bold text-slate-800">{value}</div>
  </div>
);

const InsightCard = ({ title, insight, winner, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 border`}>
      <h4 className="font-semibold text-slate-800 mb-2">{title}</h4>
      <p className="text-sm text-slate-700">{insight}</p>
    </div>
  );
};

export default BatsmanVsBatsman;
