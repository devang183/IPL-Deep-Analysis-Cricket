import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Trophy, Award, Sparkles } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import axios from 'axios';
import MatrixLoader from '../MatrixLoader';

function AuctionAnalysis() {
  const [auctionData, setAuctionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const fetchAuctionData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/auction');
        setAuctionData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching auction data:', error);
        setLoading(false);
      }
    };

    fetchAuctionData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MatrixLoader text="Loading auction data..." />
      </div>
    );
  }

  if (!auctionData || !auctionData.stats) {
    return (
      <div className="text-center py-20">
        <DollarSign className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500">No auction data available</p>
      </div>
    );
  }

  const { stats } = auctionData;

  // Format currency
  const formatCurrency = (amount) => {
    const crores = amount / 10000000;
    if (crores >= 1) {
      return `₹${crores.toFixed(2)} Cr`;
    }
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  };

  // Prepare data for charts
  const teamData = Object.entries(stats.byTeam).map(([team, data]) => ({
    team: team.substring(0, 15),
    fullTeam: team,
    totalSpent: data.totalSpent / 10000000,
    count: data.count,
    avgPrice: data.totalSpent / data.count / 10000000
  })).sort((a, b) => b.totalSpent - a.totalSpent);

  const yearData = Object.entries(stats.byYear).map(([year, data]) => ({
    year,
    totalSpent: data.totalSpent / 10000000,
    count: data.count
  })).sort((a, b) => a.year - b.year);

  const priceRangeData = Object.entries(stats.priceRanges).map(([range, count]) => ({
    range,
    count,
    percentage: ((count / stats.totalPlayers) * 100).toFixed(1)
  }));

  // IPL team colors
  const TEAM_COLORS = {
    'MI': '#004BA0',
    'CSK': '#FDB913',
    'RCB': '#EC1C24',
    'KKR': '#3A225D',
    'DC': '#282968',
    'SRH': '#FF822A',
    'RR': '#254AA5',
    'PBKS': '#DD1F2D',
    'GT': '#1C2E4A',
    'LSG': '#4CAAD3'
  };

  const getTeamColor = (teamName) => {
    const teamKey = Object.keys(TEAM_COLORS).find(key => teamName.includes(key));
    return teamKey ? TEAM_COLORS[teamKey] : '#8884d8';
  };

  const PRICE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-500" />
            <h1 className="text-2xl md:text-4xl font-bold text-white">IPL Auction Analysis</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base">
            Complete auction data and spending patterns across IPL teams
          </p>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="card p-4 md:p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-purple-400" />
              <div className="text-xs md:text-sm text-slate-400">Total Players</div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white">{stats.totalPlayers}</div>
          </div>

          <div className="card p-4 md:p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
              <div className="text-xs md:text-sm text-slate-400">Total Spent</div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(stats.totalSpent)}</div>
          </div>

          <div className="card p-4 md:p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
              <div className="text-xs md:text-sm text-slate-400">Avg Price</div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(stats.averagePrice)}</div>
          </div>

          <div className="card p-4 md:p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />
              <div className="text-xs md:text-sm text-slate-400">Highest Bid</div>
            </div>
            <div className="text-xl md:text-2xl font-bold text-white">{formatCurrency(stats.maxPrice)}</div>
            {stats.maxPricePlayer && (
              <div className="text-xs text-slate-400 mt-1 truncate">
                {stats.maxPricePlayer.player || stats.maxPricePlayer.name}
              </div>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Team Spending */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Team-wise Spending</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="team" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(value) => `₹${value.toFixed(2)} Cr`}
                />
                <Bar dataKey="totalSpent" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Price Distribution */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Price Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priceRangeData}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ range, percentage }) => `${range}: ${percentage}%`}
                  labelStyle={{ fill: '#fff', fontSize: '12px' }}
                >
                  {priceRangeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRICE_COLORS[index % PRICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Year-wise Trend */}
        {yearData.length > 1 && (
          <div className="card p-4 md:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Year-wise Spending Trend</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value, name) => {
                    if (name === "Total Spent (Cr)") return `₹${value.toFixed(2)} Cr`;
                    return `${value} players`;
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="totalSpent" stroke="#3b82f6" strokeWidth={2} name="Total Spent (Cr)" />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} name="Players Bought" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Purchases by Team */}
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Most Expensive Purchases by Team</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byTeam).map(([team, data]) => {
              const topPlayer = data.players.sort((a, b) => b.price - a.price)[0];
              return (
                <div
                  key={team}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-primary-500/50 transition-all cursor-pointer"
                  onClick={() => setSelectedTeam(team)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-white text-sm truncate">{team}</div>
                    <div className="text-xs text-slate-400">{data.count} players</div>
                  </div>
                  {topPlayer && (
                    <>
                      <div className="text-sm text-primary-400 font-semibold truncate">{topPlayer.name}</div>
                      <div className="text-lg font-bold text-green-400">{formatCurrency(topPlayer.price)}</div>
                      {topPlayer.year && <div className="text-xs text-slate-500">{topPlayer.year}</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionAnalysis;
