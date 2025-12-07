import { useState, useEffect } from 'react';
import { TrendingUp, Users, Award, BarChart3, Activity, Zap } from 'lucide-react';
import { ScatterChart, Scatter, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import axios from 'axios';
import MatrixLoader from '../MatrixLoader';

function AuctionInsights({ onPlayerSelect }) {
  const [playerStats, setPlayerStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('ipl_sr');

  useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/auction/player-stats');
        setPlayerStats(response.data.players || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching player stats:', error);
        setLoading(false);
      }
    };

    fetchPlayerStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MatrixLoader text="Loading auction insights..." />
      </div>
    );
  }

  if (!playerStats.length) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500">No player stats available</p>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (amount) => {
    const crores = amount / 10000000;
    if (crores >= 1) return `₹${crores.toFixed(2)} Cr`;
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  };

  // Age vs Price analysis
  const ageVsPrice = playerStats
    .filter(p => p.age && p.price)
    .map(p => ({
      age: p.age,
      price: p.price / 10000000,
      name: p.name,
      year: p.year
    }));

  // Performance vs Price scatter plots
  const performanceMetrics = [
    { key: 'ipl_sr', label: 'IPL Strike Rate', color: '#3b82f6' },
    { key: 'ipl_avg', label: 'IPL Average', color: '#22c55e' },
    { key: 'ipl_runs', label: 'IPL Runs', color: '#f59e0b' },
    { key: 'ipl_wkts', label: 'IPL Wickets', color: '#ef4444' },
    { key: 'ipl_bowl_econ', label: 'IPL Economy', color: '#8b5cf6' }
  ];

  const performanceVsPrice = playerStats
    .filter(p => p[selectedMetric] && p.price && p[selectedMetric] > 0)
    .map(p => ({
      performance: parseFloat(p[selectedMetric]),
      price: p.price / 10000000,
      name: p.name,
      year: p.year
    }));

  // Role-wise price distribution
  const roleData = playerStats
    .filter(p => p.role && p.price)
    .reduce((acc, p) => {
      if (!acc[p.role]) {
        acc[p.role] = { role: p.role, totalPrice: 0, count: 0, avgPrice: 0 };
      }
      acc[p.role].totalPrice += p.price;
      acc[p.role].count++;
      return acc;
    }, {});

  const roleDistribution = Object.values(roleData)
    .map(r => ({
      role: r.role,
      avgPrice: (r.totalPrice / r.count) / 10000000,
      count: r.count
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice);

  // Country-wise analysis
  const countryData = playerStats
    .filter(p => p.country && p.price)
    .reduce((acc, p) => {
      if (!acc[p.country]) {
        acc[p.country] = { country: p.country, totalPrice: 0, count: 0, avgPrice: 0 };
      }
      acc[p.country].totalPrice += p.price;
      acc[p.country].count++;
      return acc;
    }, {});

  const countryDistribution = Object.values(countryData)
    .map(c => ({
      country: c.country.substring(0, 15),
      avgPrice: (c.totalPrice / c.count) / 10000000,
      count: c.count
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 10);

  // Top performers by IPL SR
  const topPerformers = playerStats
    .filter(p => p.ipl_runs && p.ipl_sr && p.ipl_runs > 500 && p.price)
    .sort((a, b) => b.ipl_sr - a.ipl_sr)
    .slice(0, 15)
    .map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
      fullName: p.name,
      sr: p.ipl_sr,
      avg: p.ipl_avg,
      runs: p.ipl_runs,
      price: p.price / 10000000
    }));

  // Experience (T20 matches) vs Price
  const experienceVsPrice = playerStats
    .filter(p => p.t20_no !== undefined && p.price && p.ipl_runs)
    .map(p => ({
      experience: p.t20_no + (p.ipl_no || 0),
      price: p.price / 10000000,
      name: p.name,
      year: p.year
    }));

  // Batting vs Bowling performance radar chart data for all-rounders
  const allRounders = playerStats
    .filter(p => p.role === 'All-Rounder' && p.ipl_runs > 200 && p.ipl_wkts > 5)
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map(p => ({
      name: p.name.length > 12 ? p.name.substring(0, 10) + '..' : p.name,
      fullName: p.name,
      batting: Math.min(p.ipl_sr || 0, 200) / 2,
      average: Math.min(p.ipl_avg || 0, 50) * 2,
      bowling: Math.max(0, 100 - (p.ipl_bowl_econ || 10) * 10),
      wickets: Math.min(p.ipl_wkts || 0, 50) * 2,
      price: (p.price / 10000000).toFixed(2)
    }));

  return (
    <div className="min-h-screen p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
            <h1 className="text-2xl md:text-4xl font-bold text-white">Auction Insights & Analytics</h1>
          </div>
          <p className="text-slate-300 text-sm md:text-base">
            Comprehensive performance and pricing analysis across IPL auctions (2013-2025)
          </p>
        </div>

        {/* Age vs Price Scatter */}
        <div className="card p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Age vs Auction Price</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">How player age influences auction valuations</p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="age"
                type="number"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Age (years)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis
                dataKey="price"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Price (Cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'price') return [`₹${value.toFixed(2)} Cr`, 'Price'];
                  if (name === 'age') return [value, 'Age'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.name} (${payload[0].payload.year})`;
                  }
                  return '';
                }}
              />
              <Scatter name="Players" data={ageVsPrice} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Performance vs Price */}
        <div className="card p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Performance vs Price</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {performanceMetrics.map(metric => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedMetric === metric.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="performance"
                type="number"
                stroke="#94a3b8"
                fontSize={12}
                label={{
                  value: performanceMetrics.find(m => m.key === selectedMetric)?.label,
                  position: 'insideBottom',
                  offset: -5,
                  fill: '#94a3b8'
                }}
              />
              <YAxis
                dataKey="price"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Price (Cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'price') return [`₹${value.toFixed(2)} Cr`, 'Price'];
                  if (name === 'performance') return [value.toFixed(2), performanceMetrics.find(m => m.key === selectedMetric)?.label];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.name} (${payload[0].payload.year})`;
                  }
                  return '';
                }}
              />
              <Scatter
                name="Players"
                data={performanceVsPrice}
                fill={performanceMetrics.find(m => m.key === selectedMetric)?.color || '#3b82f6'}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Role-wise and Country-wise Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Role-wise Price Distribution */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Price by Role</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roleDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="role" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => `₹${value.toFixed(2)} Cr`}
                />
                <Bar dataKey="avgPrice" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Country-wise Distribution */}
          <div className="card p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Top Countries by Avg Price</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="country" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  formatter={(value) => `₹${value.toFixed(2)} Cr`}
                />
                <Bar dataKey="avgPrice" fill="#22c55e" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers by Strike Rate */}
        <div className="card p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Top Performers (500+ IPL Runs)</h2>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topPerformers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-45} textAnchor="end" height={100} />
              <YAxis yAxisId="left" stroke="#3b82f6" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
                formatter={(value, name) => {
                  if (name === 'Strike Rate') return [value.toFixed(2), name];
                  if (name === 'Price') return [`₹${value.toFixed(2)} Cr`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="sr" fill="#3b82f6" name="Strike Rate" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="right" dataKey="price" fill="#22c55e" name="Price" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* All-Rounders Performance Radar */}
        {allRounders.length > 0 && (
          <div className="card p-4 md:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg md:text-xl font-bold text-white">Top All-Rounders Performance</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">Multi-dimensional performance comparison</p>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={allRounders.length > 0 ? [
                { subject: 'Strike Rate', ...Object.fromEntries(allRounders.map(p => [p.name, p.batting])) },
                { subject: 'Average', ...Object.fromEntries(allRounders.map(p => [p.name, p.average])) },
                { subject: 'Bowl Quality', ...Object.fromEntries(allRounders.map(p => [p.name, p.bowling])) },
                { subject: 'Wickets', ...Object.fromEntries(allRounders.map(p => [p.name, p.wickets])) }
              ] : []}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
                <PolarRadiusAxis stroke="#94a3b8" fontSize={10} />
                {allRounders.map((player, index) => (
                  <Radar
                    key={player.name}
                    name={`${player.name} (₹${player.price}Cr)`}
                    dataKey={player.name}
                    stroke={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index]}
                    fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index]}
                    fillOpacity={0.3}
                  />
                ))}
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Experience vs Price */}
        <div className="card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg md:text-xl font-bold text-white">Experience vs Price</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Total not-outs (T20 + IPL) vs auction valuation</p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="experience"
                type="number"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Not Outs (T20 + IPL)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              />
              <YAxis
                dataKey="price"
                stroke="#94a3b8"
                fontSize={12}
                label={{ value: 'Price (Cr)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                formatter={(value, name) => {
                  if (name === 'price') return [`₹${value.toFixed(2)} Cr`, 'Price'];
                  if (name === 'experience') return [value, 'Not Outs'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return `${payload[0].payload.name} (${payload[0].payload.year})`;
                  }
                  return '';
                }}
              />
              <Scatter name="Players" data={experienceVsPrice} fill="#f59e0b" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AuctionInsights;
