import { useState, useEffect } from 'react';
import { Trophy, MapPin, AlertCircle, Calendar, Award, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import PersonalizedLoading from './PersonalizedLoading';
import { useAuth } from '../context/AuthContext';

function MOTMAnalysis({ player }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [expandedVenues, setExpandedVenues] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [playerImage, setPlayerImage] = useState(null);

  useEffect(() => {
    fetchMOTMData();
    fetchPlayerImage();
  }, [player]);

  // Reset filter when player changes
  useEffect(() => {
    setSelectedVenue(null);
  }, [player]);

  // Handle window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const fetchPlayerImage = async () => {
    try {
      const response = await axios.get(`/api/player/${encodeURIComponent(player)}/image`);
      if (response.data.image_path) {
        setPlayerImage(response.data.image_path);
      }
    } catch (err) {
      console.log('Player image not found');
      setPlayerImage(null);
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

  // Toggle venue expansion for showing match fixtures
  const toggleVenueExpansion = (venueName, e) => {
    e.stopPropagation(); // Prevent filter click
    setExpandedVenues(prev => ({
      ...prev,
      [venueName]: !prev[venueName]
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Date N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
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
    return <PersonalizedLoading userName={user?.username || 'there'} context="MOTM awards" />;
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
      {/* Player Header with Image */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 p-1 animate-fade-in-down">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Player Image */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-1 animate-pulse-slow">
                <div className="w-full h-full rounded-full bg-slate-800 overflow-hidden flex items-center justify-center">
                  {playerImage ? (
                    <img
                      src={playerImage}
                      alt={player}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`${playerImage ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gradient-to-br from-yellow-600 to-orange-600`}>
                    <Trophy className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  </div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-yellow-400 opacity-20 blur-xl animate-pulse"></div>
            </div>

            {/* Player Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 animate-bounce-subtle" />
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                  {player}
                </h2>
              </div>
              <p className="text-yellow-200 text-sm md:text-base font-medium mb-1">Man of the Match Awards</p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold text-lg">{data.totalMotm}</span>
                  <span className="text-yellow-200 text-sm">Awards</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Banner */}
      {selectedVenue && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-300 rounded-lg p-4 flex items-center justify-between shadow-md animate-slide-in-right">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-primary-600 animate-pulse" />
            <div>
              <p className="text-sm text-primary-600 font-semibold">Filtered by Venue</p>
              <p className="text-lg font-bold text-primary-800">{selectedVenue}</p>
            </div>
          </div>
          <button
            onClick={clearFilter}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-300 rounded-lg transition-all shadow-sm hover:shadow hover:scale-105 active:scale-95"
            aria-label="Clear venue filter"
          >
            <X className="w-4 h-4" />
            <span className="font-medium">Clear Filter</span>
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200 hover-lift animate-fade-in-up cursor-pointer" style={{animationDelay: '0.1s'}}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-600 animate-float" />
            <div className="text-sm text-yellow-700">Total MOTM Awards</div>
          </div>
          <div className="text-4xl font-bold text-yellow-900">{filteredData.totalMotm}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200 hover-lift animate-fade-in-up cursor-pointer" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-8 h-8 text-blue-600 animate-float" style={{animationDelay: '0.5s'}} />
            <div className="text-sm text-blue-700">Unique Venues</div>
          </div>
          <div className="text-4xl font-bold text-blue-900">{filteredData.totalVenues}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200 hover-lift animate-fade-in-up cursor-pointer" style={{animationDelay: '0.3s'}}>
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-purple-600 animate-float" style={{animationDelay: '1s'}} />
            <div className="text-sm text-purple-700">Awards per Venue</div>
          </div>
          <div className="text-4xl font-bold text-purple-900">
            {(filteredData.totalMotm / filteredData.totalVenues).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Click Instruction */}
      {!selectedVenue && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
          <Filter className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0 animate-pulse" />
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
          <ResponsiveContainer width="100%" height={isMobile ? 400 : 300}>
            <PieChart>
              <Pie
                data={data.venueDistribution.slice(0, 8)}
                cx="50%"
                cy={isMobile ? "40%" : "50%"}
                labelLine={false}
                label={({ venue, percentage }) => `${percentage}%`}
                outerRadius={isMobile ? 60 : 80}
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
                layout={isMobile ? "horizontal" : "vertical"}
                align={isMobile ? "center" : "right"}
                verticalAlign={isMobile ? "bottom" : "middle"}
                formatter={(value, entry) => `${entry.payload.venue}`}
                wrapperStyle={{ fontSize: isMobile ? '10px' : '12px', cursor: 'pointer' }}
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
            const isExpanded = expandedVenues[venue.venue];
            return (
              <div
                key={index}
                className={`rounded-xl p-5 border-2 transition-all cursor-pointer ${
                  isFiltered
                    ? 'opacity-20'
                    : isSelected
                    ? 'border-primary-400 shadow-2xl animate-pulse-glow'
                    : 'border-blue-400/30 hover:shadow-lg hover:border-blue-400/50 hover:scale-105'
                }`}
                style={{
                  background: isSelected
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'rgba(59, 130, 246, 0.08)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {/* Venue Header - Clickable for filter */}
                <div
                  onClick={() => handleVenueClick(venue.venue)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className={`font-bold text-base mb-2 ${
                        isSelected ? 'text-white' : 'text-white'
                      }`}>
                        {venue.venue}
                      </h5>
                      <div className="flex items-center gap-2">
                        <Trophy className={`w-5 h-5 ${isSelected ? 'text-yellow-400 animate-pulse' : 'text-yellow-400'}`} />
                        <span className={`text-3xl font-extrabold ${
                          isSelected ? 'text-white' : 'text-white'
                        }`}>
                          {venue.count}
                        </span>
                        <span className="text-sm text-blue-100 font-medium">award{venue.count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-white mt-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Seasons:</span>
                    <span>{venue.seasons.sort().join(', ')}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-300/30">
                    <div className="text-sm text-white font-medium">
                      {venue.matches.length} match{venue.matches.length !== 1 ? 'es' : ''}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-primary-300/50">
                      <div className="text-sm text-yellow-300 font-bold flex items-center gap-2 animate-pulse">
                        <Filter className="w-4 h-4" />
                        Currently filtered
                      </div>
                    </div>
                  )}
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={(e) => toggleVenueExpansion(venue.venue, e)}
                  className={`w-full mt-4 py-2.5 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-semibold ${
                    isExpanded
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white border-primary-500 shadow-lg'
                      : 'text-white border-blue-300/50 hover:border-blue-300 hover:bg-blue-400/20 shadow-md'
                  }`}
                  style={!isExpanded ? {background: 'rgba(59, 130, 246, 0.15)', backdropFilter: 'blur(8px)'} : {}}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-sm">Hide Matches</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-sm">View Matches</span>
                    </>
                  )}
                </button>

                {/* Match Fixtures - Collapsible */}
                {isExpanded && venue.matches && venue.matches.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-600" />
                      MOTM Matches at {venue.venue}
                    </div>
                    {venue.matches
                      .sort((a, b) => {
                        // Sort by season desc, then by date desc
                        if (b.season !== a.season) return b.season - a.season;
                        if (a.date && b.date) return new Date(b.date) - new Date(a.date);
                        return 0;
                      })
                      .map((match, matchIdx) => (
                        <div
                          key={matchIdx}
                          className="p-3 bg-white rounded-lg border border-slate-200 hover:border-primary-300 transition-all shadow-sm hover:shadow"
                        >
                          {/* Teams */}
                          {match.teams && match.teams.length >= 2 && (
                            <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                              <span className="text-primary-600">{match.teams[0]}</span>
                              <span className="text-slate-400">vs</span>
                              <span className="text-purple-600">{match.teams[1]}</span>
                            </div>
                          )}

                          {/* Match Details */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">Season:</span>
                              <span>{match.season}</span>
                            </div>
                            {match.date && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Date:</span>
                                <span>{formatDate(match.date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredData.venueDetails.length > 0 && (
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Award className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <div className="text-sm text-blue-600 mb-2">Most Successful Venue</div>
              <div className="text-lg font-semibold text-white mb-1">{filteredData.venueDetails[0].venue}</div>
              <div className="text-2xl font-bold text-white">{filteredData.venueDetails[0].count}</div>
              <div className="text-xs text-blue-600 mt-1">MOTM awards</div>
            </div>
          )}
          {filteredData.seasonStats && filteredData.seasonStats.length > 0 && (
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <div className="text-sm text-purple-600 mb-2">Best Season</div>
              <div className="text-lg font-semibold text-white mb-1">Season {[...filteredData.seasonStats].sort((a, b) => b.count - a.count)[0].season}</div>
              <div className="text-2xl font-bold text-white">{[...filteredData.seasonStats].sort((a, b) => b.count - a.count)[0].count}</div>
              <div className="text-xs text-purple-600 mt-1">MOTM awards{selectedVenue && ` at ${selectedVenue}`}</div>
            </div>
          )}
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <Trophy className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <div className="text-sm text-green-600 mb-2">Venue Diversity</div>
            {selectedVenue ? (
              <>
                <div className="text-lg font-semibold text-white mb-1">{selectedVenue}</div>
                <div className="text-2xl font-bold text-white">{filteredData.totalMotm}</div>
                <div className="text-xs text-green-600 mt-1">MOTM awards</div>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-white mb-1">{filteredData.totalVenues} Venues</div>
                <div className="text-2xl font-bold text-white">{filteredData.totalMotm}</div>
                <div className="text-xs text-green-600 mt-1">Total awards</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MOTMAnalysis;
