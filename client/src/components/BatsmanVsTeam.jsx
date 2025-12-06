import { useState, useEffect, useRef } from 'react';
import { Target, Loader2, AlertCircle, TrendingUp, Shield, Activity, Zap, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import MatrixLoader from './MatrixLoader';

function BatsmanVsTeam({ player }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [playerImage, setPlayerImage] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchTeams();
    fetchPlayerImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0) {
      const highlightedElement = document.getElementById(
        `team-option-${highlightedIndex}`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPlayerImage = async () => {
    try {
      const response = await axios.get(`/api/player/${encodeURIComponent(player)}/image`);
      if (response.data.imageUrl) {
        setPlayerImage(response.data.imageUrl);
      }
    } catch (error) {
      console.error('Error fetching player image:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      setTeams(response.data.teams);
      setLoadingTeams(false);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to fetch teams');
      setLoadingTeams(false);
    }
  };

  const fetchMatchupStats = async (team) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `/api/batsman-vs-team/${encodeURIComponent(player)}/${encodeURIComponent(team)}`
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching matchup stats:', error);
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setSearchTerm('');
    setIsDropdownOpen(false);
    fetchMatchupStats(team);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
    // Clear search term when focusing to show all teams
    if (selectedTeam) {
      setSearchTerm('');
    }
  };

  const handleKeyDown = (e) => {
    const filteredTeams = teams.filter((team) =>
      team.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredTeams.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredTeams.length) {
          handleTeamSelect(filteredTeams[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare data for phase breakdown chart
  const phaseData = stats?.stats?.phaseBreakdown ? [
    {
      phase: 'Powerplay (1-6)',
      runs: stats.stats.phaseBreakdown.powerplay.runs,
      strikeRate: stats.stats.phaseBreakdown.powerplay.strikeRate,
      balls: stats.stats.phaseBreakdown.powerplay.balls
    },
    {
      phase: 'Middle (7-15)',
      runs: stats.stats.phaseBreakdown.middle.runs,
      strikeRate: stats.stats.phaseBreakdown.middle.strikeRate,
      balls: stats.stats.phaseBreakdown.middle.balls
    },
    {
      phase: 'Death (16-20)',
      runs: stats.stats.phaseBreakdown.death.runs,
      strikeRate: stats.stats.phaseBreakdown.death.strikeRate,
      balls: stats.stats.phaseBreakdown.death.balls
    }
  ] : [];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {/* Player Image */}
        {playerImage && (
          <div className="flex-shrink-0">
            <img
              src={playerImage}
              alt={player}
              className="w-24 h-24 rounded-full object-cover border-4 border-primary-200 shadow-lg"
            />
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {player} vs Teams
          </h2>
          <p className="text-slate-600">
            Analyze performance against specific IPL teams
          </p>
        </div>
      </div>

      {/* Team Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-white mb-2 drop-shadow-lg">
          Select Opposition Team
        </label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              placeholder={selectedTeam || 'Search for a team...'}
              className="w-full pl-12 pr-4 py-3 border-2 border-white/30 rounded-lg focus:border-primary-400 focus:outline-none transition-all text-slate-900 placeholder-slate-400"
              style={{background: 'rgba(255, 255, 255, 0.9)'}}
              disabled={loadingTeams}
              aria-label="Search teams"
              aria-autocomplete="list"
              aria-controls="team-listbox"
              aria-expanded={isDropdownOpen}
            />
          </div>

          {isDropdownOpen && !loadingTeams && (
            <div
              id="team-listbox"
              role="listbox"
              className="absolute z-10 w-full mt-2 border-2 border-white/30 rounded-lg shadow-2xl max-h-64 overflow-y-auto"
              style={{background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)'}}
            >
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team, index) => (
                  <div
                    key={team}
                    id={`team-option-${index}`}
                    role="option"
                    aria-selected={selectedTeam === team}
                    onClick={() => handleTeamSelect(team)}
                    className={`px-4 py-3 cursor-pointer transition-all text-white font-medium ${
                      index === highlightedIndex
                        ? 'bg-white/30'
                        : 'hover:bg-white/20'
                    } ${selectedTeam === team ? 'bg-white/25 font-bold' : ''}`}
                  >
                    <div className="flex items-center gap-2 drop-shadow-md">
                      <Shield className="w-4 h-4 text-yellow-400" />
                      {team}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-white text-center font-medium drop-shadow-md">
                  No teams found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <MatrixLoader text="Loading matchup statistics..." />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-800 text-sm">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Display */}
      {stats && stats.stats && !loading && (
        <div className="space-y-6">
          {/* Key Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5" />
                <div className="text-sm opacity-90">Matches</div>
              </div>
              <div className="text-4xl font-bold">{stats.matches}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5" />
                <div className="text-sm opacity-90">Total Runs</div>
              </div>
              <div className="text-4xl font-bold">{stats.stats.totalRuns}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5" />
                <div className="text-sm opacity-90">Strike Rate</div>
              </div>
              <div className="text-4xl font-bold">{stats.stats.strikeRate}</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5" />
                <div className="text-sm opacity-90">Average</div>
              </div>
              <div className="text-4xl font-bold">{stats.stats.average}</div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="card">
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Performance Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-cyan-700">{stats.stats.totalBalls}</div>
                <div className="text-sm text-cyan-600 mt-1 font-semibold">Balls Faced</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-emerald-700">{stats.stats.fours}</div>
                <div className="text-sm text-emerald-600 mt-1 font-semibold">Fours</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                <div className="text-2xl font-bold text-violet-700">{stats.stats.sixes}</div>
                <div className="text-sm text-violet-600 mt-1 font-semibold">Sixes</div>
              </div>

              <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                <div className="text-2xl font-bold text-amber-700">{stats.stats.highestScore}</div>
                <div className="text-sm text-amber-600 mt-1 font-semibold">Highest Score</div>
              </div>
            </div>
          </div>

          {/* Milestones */}
          {(stats.stats.fifties > 0 || stats.stats.hundreds > 0) && (
            <div className="card">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Milestones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.stats.fifties > 0 && (
                  <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg p-6 border-2 border-orange-300">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                        <span className="text-3xl font-bold text-white">50</span>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-orange-900">{stats.stats.fifties}</div>
                        <div className="text-orange-700 font-semibold">Half Centuries</div>
                      </div>
                    </div>
                  </div>
                )}

                {stats.stats.hundreds > 0 && (
                  <div className="bg-gradient-to-br from-amber-200 to-yellow-200 rounded-lg p-6 border-2 border-amber-400">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">100</span>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-amber-900">{stats.stats.hundreds}</div>
                        <div className="text-amber-700 font-semibold">Centuries</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phase-wise Performance Chart */}
          {phaseData.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary-600" />
                Phase-wise Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={phaseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="runs" fill="#3b82f6" name="Runs" />
                  <Bar yAxisId="right" dataKey="strikeRate" fill="#10b981" name="Strike Rate" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Season-wise Performance */}
          {stats.stats.seasonStats && stats.stats.seasonStats.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Season-wise Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[...stats.stats.seasonStats].sort((a, b) => a.season - b.season)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="season" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="runs" stroke="#3b82f6" strokeWidth={2} name="Runs" />
                  <Line yAxisId="right" type="monotone" dataKey="strikeRate" stroke="#10b981" strokeWidth={2} name="Strike Rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* No Data State */}
      {stats && !stats.stats && !loading && (
        <div className="card text-center py-16">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Data Available</h3>
          <p className="text-slate-500">
            {player} has not played against {selectedTeam} in IPL matches with available data.
          </p>
        </div>
      )}
    </div>
  );
}

export default BatsmanVsTeam;
