import { useState, useEffect } from 'react';
import { Trophy, MapPin, Loader2, AlertCircle, Calendar, Award, X, Filter } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

function MOTMAnalysis({ player }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);

  useEffect(() => {
    fetchMOTMData();
  }, [player]);

  // Reset filter when player changes
  useEffect(() => {
    setSelectedVenue(null);
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

  // Handle venue click for filtering
  const handleVenueClick = (venueName) => {
    if (selectedVenue === venueName) {
      setSelectedVenue(null); // Deselect if clicking the same venue
    } else {
      setSelectedVenue(venueName);
    }
  };

  // Clear filter
  const clearFilter = () => {
    setSelectedVenue(null);
  };

  // Filter data based on selected venue
  const getFilteredData = () => {
    if (!selectedVenue || !data) return data;

    const venueData = data.venueDetails.find(v => v.venue === selectedVenue);
    if (!venueData) return data;

    return {
      ...data,
      totalMotm: venueData.count,
      totalVenues: 1,
      venueDetails: [venueData],
      venueDistribution: [{
        venue: venueData.venue,
        count: venueData.count,
        percentage: '100.0'
      }],
      seasonStats: data.seasonStats?.map(season => ({
        ...season,
        count: venueData.matches.filter(m => m.season === season.season).length
      })).filter(s => s.count > 0) || []
    };
  };

  const filteredData = getFilteredData();

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          <h2 className="text-2xl font-bold text-slate-800">Man of the Match Awards</h2>
        </div>
      </div>

      {/* Filter Banner */}
      {selectedVenue && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-300 rounded-lg p-4 flex items-center justify-between shadow-md animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-primary-600" />
            <div>
              <p className="text-sm text-primary-600 font-semibold">Filtered by Venue</p>
              <p className="text-lg font-bold text-primary-800">{selectedVenue}</p>
            </div>
          </div>
          <button
            onClick={clearFilter}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-300 rounded-lg transition-all shadow-sm hover:shadow"
            aria-label="Clear venue filter"
          >
            <X className="w-4 h-4" />
            <span className="font-medium">Clear Filter</span>
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-600" />
            <div className="text-sm text-yellow-700">Total MOTM Awards</div>
          </div>
          <div className="text-4xl font-bold text-yellow-900">{filteredData.totalMotm}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-8 h-8 text-blue-600" />
            <div className="text-sm text-blue-700">Unique Venues</div>
          </div>
          <div className="text-4xl font-bold text-blue-900">{filteredData.totalVenues}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-purple-600" />
            <div className="text-sm text-purple-700">Awards per Venue</div>
          </div>
          <div className="text-4xl font-bold text-purple-900">
            {(filteredData.totalMotm / filteredData.totalVenues).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Click Instruction */}
      {!selectedVenue && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Filter className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Tip:</span> Click on any venue in the charts or table below to filter all data for that specific venue
          </p>
        </div>
      )}

      {/* Venue-wise Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            MOTM Awards by Venue
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={filteredData.venueDistribution.slice(0, 10)}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  handleVenueClick(data.activePayload[0].payload.venue);
                }
              }}
            >
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
                    const isSelected = selectedVenue === payload[0].payload.venue;
                    return (
                      <div className={`p-3 border rounded shadow-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-primary-100 border-primary-400' : 'bg-white border-slate-200'
                      }`}>
                        <p className={`font-semibold ${isSelected ? 'text-primary-900' : 'text-slate-800'}`}>
                          {payload[0].payload.venue}
                        </p>
                        <p className="text-primary-600">Awards: {payload[0].value}</p>
                        <p className="text-slate-600 text-sm">{payload[0].payload.percentage}% of total</p>
                        <p className="text-xs text-primary-500 mt-1">💡 Click to filter</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                fill="#0ea5e9"
                cursor="pointer"
                opacity={selectedVenue ? 0.7 : 1}
              />
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
                onClick={(entry) => {
                  if (entry && entry.venue) {
                    handleVenueClick(entry.venue);
                  }
                }}
                cursor="pointer"
              >
                {data.venueDistribution.slice(0, 8).map((entry, index) => {
                  const isSelected = selectedVenue === entry.venue;
                  const opacity = selectedVenue ? (isSelected ? 1 : 0.3) : 1;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      opacity={opacity}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const isSelected = selectedVenue === payload[0].payload.venue;
                    return (
                      <div className={`p-3 border rounded shadow-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-primary-100 border-primary-400' : 'bg-white border-slate-200'
                      }`}>
                        <p className={`font-semibold ${isSelected ? 'text-primary-900' : 'text-slate-800'}`}>
                          {payload[0].payload.venue}
                        </p>
                        <p className="text-primary-600">Awards: {payload[0].value}</p>
                        <p className="text-slate-600 text-sm">{payload[0].payload.percentage}%</p>
                        <p className="text-xs text-primary-500 mt-1">💡 Click to filter</p>
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
                wrapperStyle={{ fontSize: '12px', cursor: 'pointer' }}
                onClick={(entry) => {
                  if (entry && entry.payload && entry.payload.venue) {
                    handleVenueClick(entry.payload.venue);
                  }
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Season-wise Trend */}
      {filteredData.seasonStats && filteredData.seasonStats.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            MOTM Awards by Season
            {selectedVenue && (
              <span className="text-xs text-primary-600 font-normal">
                (Filtered by {selectedVenue})
              </span>
            )}
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData.seasonStats}>
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
                        {selectedVenue && (
                          <p className="text-xs text-slate-500 mt-1">At {selectedVenue}</p>
                        )}
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
          {data.venueDetails.map((venue, index) => {
            const isSelected = selectedVenue === venue.venue;
            const isFiltered = selectedVenue && !isSelected;
            return (
              <div
                key={index}
                onClick={() => handleVenueClick(venue.venue)}
                className={`rounded-lg p-4 border transition-all cursor-pointer ${
                  isFiltered
                    ? 'bg-slate-50 border-slate-200 opacity-30'
                    : isSelected
                    ? 'bg-gradient-to-br from-primary-50 to-primary-100 border-primary-400 border-2 shadow-lg'
                    : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 hover:shadow-md hover:border-primary-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className={`font-semibold text-sm mb-1 ${
                      isSelected ? 'text-primary-900' : 'text-slate-800'
                    }`}>
                      {venue.venue}
                    </h5>
                    <div className="flex items-center gap-2">
                      <Trophy className={`w-4 h-4 ${isSelected ? 'text-yellow-500' : 'text-yellow-600'}`} />
                      <span className={`text-2xl font-bold ${
                        isSelected ? 'text-primary-700' : 'text-primary-600'
                      }`}>
                        {venue.count}
                      </span>
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
                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-primary-300">
                    <div className="text-xs text-primary-600 font-medium flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      Currently filtered
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="card">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">
          Key Insights
          {selectedVenue && (
            <span className="text-xs text-primary-600 font-normal ml-2">
              (Filtered by {selectedVenue})
            </span>
          )}
        </h4>
        <div className="space-y-3">
          {filteredData.venueDetails.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <Award className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Most Successful Venue</p>
                <p className="text-sm text-blue-700">
                  {filteredData.venueDetails[0].venue} with {filteredData.venueDetails[0].count} MOTM award{filteredData.venueDetails[0].count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
          {filteredData.seasonStats && filteredData.seasonStats.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-purple-900">Best Season</p>
                <p className="text-sm text-purple-700">
                  Season {[...filteredData.seasonStats].sort((a, b) => b.count - a.count)[0].season} with{' '}
                  {[...filteredData.seasonStats].sort((a, b) => b.count - a.count)[0].count} MOTM award{[...filteredData.seasonStats].sort((a, b) => b.count - a.count)[0].count !== 1 ? 's' : ''}
                  {selectedVenue && ` at ${selectedVenue}`}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Trophy className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-900">Venue Diversity</p>
              <p className="text-sm text-green-700">
                {selectedVenue ? (
                  <>Won {filteredData.totalMotm} MOTM award{filteredData.totalMotm !== 1 ? 's' : ''} at {selectedVenue}</>
                ) : (
                  <>Won MOTM awards at {filteredData.totalVenues} different venue{filteredData.totalVenues !== 1 ? 's' : ''}, showing consistent performance across locations</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MOTMAnalysis;
