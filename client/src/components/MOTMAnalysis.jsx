import { useState, useEffect } from 'react';
import { Trophy, MapPin, Loader2, AlertCircle, Calendar, Award } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

function MOTMAnalysis({ player }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMOTMData();
  }, [player]);

  const fetchMOTMData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/motm/${player}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch MOTM statistics');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#a855f7'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-3 text-slate-600">Loading MOTM data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" aria-live="assertive" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-red-800">Error</h4>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.totalMotm === 0) {
    return (
      <div className="card text-center py-16">
        <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-slate-700 mb-2">
          No Man of the Match Awards
        </h3>
        <p className="text-slate-500">
          {player} has not won any Man of the Match awards in the available data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-600" />
        <h2 className="text-2xl font-bold text-slate-800">Man of the Match Awards</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <div className="text-sm text-yellow-700">Total MOTM Awards</div>
          </div>
          <div className="text-4xl font-bold text-yellow-900">{data.totalMotm}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <div className="text-sm text-blue-700">Unique Venues</div>
          </div>
          <div className="text-4xl font-bold text-blue-900">{data.totalVenues}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-purple-600" />
            <div className="text-sm text-purple-700">Awards per Venue</div>
          </div>
          <div className="text-4xl font-bold text-purple-900">
            {(data.totalMotm / data.totalVenues).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Venue-wise Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            MOTM Awards by Venue
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.venueDistribution.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="venue"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fontSize: 11 }}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                        <p className="font-semibold text-slate-800">{payload[0].payload.venue}</p>
                        <p className="text-primary-600">Awards: {payload[0].value}</p>
                        <p className="text-slate-600 text-sm">{payload[0].payload.percentage}% of total</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Top Venues Distribution
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.venueDistribution.slice(0, 8)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ venue, percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.venueDistribution.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                        <p className="font-semibold text-slate-800">{payload[0].payload.venue}</p>
                        <p className="text-primary-600">Awards: {payload[0].value}</p>
                        <p className="text-slate-600 text-sm">{payload[0].payload.percentage}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry) => `${entry.payload.venue}`}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Season-wise Trend */}
      {data.seasonStats && data.seasonStats.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            MOTM Awards by Season
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.seasonStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="season" />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                        <p className="font-semibold text-slate-800">Season {payload[0].payload.season}</p>
                        <p className="text-primary-600">Awards: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Venue List */}
      <div className="card">
        <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          Complete Venue Breakdown
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.venueDetails.map((venue, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h5 className="font-semibold text-slate-800 text-sm mb-1">{venue.venue}</h5>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-600" />
                    <span className="text-2xl font-bold text-primary-600">{venue.count}</span>
                    <span className="text-xs text-slate-500">award{venue.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-600 mt-2">
                <Calendar className="w-3 h-3 inline mr-1" />
                Seasons: {venue.seasons.sort().join(', ')}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  {venue.matches.length} match{venue.matches.length !== 1 ? 'es' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">Key Insights</h4>
        <div className="space-y-3">
          {data.venueDetails.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Award className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Most Successful Venue</p>
                <p className="text-sm text-blue-700">
                  {data.venueDetails[0].venue} with {data.venueDetails[0].count} MOTM award{data.venueDetails[0].count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
          {data.seasonStats && data.seasonStats.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900">Best Season</p>
                <p className="text-sm text-purple-700">
                  Season {[...data.seasonStats].sort((a, b) => b.count - a.count)[0].season} with{' '}
                  {[...data.seasonStats].sort((a, b) => b.count - a.count)[0].count} MOTM award{[...data.seasonStats].sort((a, b) => b.count - a.count)[0].count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Trophy className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">Venue Diversity</p>
              <p className="text-sm text-green-700">
                Won MOTM awards at {data.totalVenues} different venue{data.totalVenues !== 1 ? 's' : ''}, showing consistent performance across locations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MOTMAnalysis;
