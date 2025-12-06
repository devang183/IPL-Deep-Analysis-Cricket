import { useState, useEffect } from 'react';
import { Calendar, Cake, Users, TrendingUp, X } from 'lucide-react';
import axios from 'axios';

function BirthdaySunburst() {
  const [birthdayData, setBirthdayData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [playerList, setPlayerList] = useState([]);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const months = [
    { name: 'January', short: 'Jan', days: 31, color: 'from-blue-500 to-blue-600' },
    { name: 'February', short: 'Feb', days: 29, color: 'from-purple-500 to-purple-600' },
    { name: 'March', short: 'Mar', days: 31, color: 'from-pink-500 to-pink-600' },
    { name: 'April', short: 'Apr', days: 30, color: 'from-red-500 to-red-600' },
    { name: 'May', short: 'May', days: 31, color: 'from-orange-500 to-orange-600' },
    { name: 'June', short: 'Jun', days: 30, color: 'from-yellow-500 to-yellow-600' },
    { name: 'July', short: 'Jul', days: 31, color: 'from-lime-500 to-lime-600' },
    { name: 'August', short: 'Aug', days: 31, color: 'from-green-500 to-green-600' },
    { name: 'September', short: 'Sep', days: 30, color: 'from-emerald-500 to-emerald-600' },
    { name: 'October', short: 'Oct', days: 31, color: 'from-teal-500 to-teal-600' },
    { name: 'November', short: 'Nov', days: 30, color: 'from-cyan-500 to-cyan-600' },
    { name: 'December', short: 'Dec', days: 31, color: 'from-indigo-500 to-indigo-600' }
  ];

  // Fetch birthday data from API
  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/players/birthdays');
        const processedData = processBirthdayData(response.data.players);
        setBirthdayData(processedData);
        calculateStats(processedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching birthday data:', err);
        setError('Failed to load birthday data');
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  const processBirthdayData = (players) => {
    const data = {};

    players.forEach(player => {
      if (!player.date_of_birth || typeof player.date_of_birth !== 'string' || player.date_of_birth.trim() === '') {
        return;
      }

      let day, month, year;

      if (player.date_of_birth.includes('/')) {
        const parts = player.date_of_birth.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
          year = parseInt(parts[2]);
        }
      } else if (player.date_of_birth.includes('-')) {
        const parts = player.date_of_birth.split('-');
        if (parts.length === 3) {
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        }
      }

      if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) return;
      if (month < 1 || month > 12 || day < 1 || day > 31) return;

      // Handle 2-digit years (e.g., 81 -> 1981, 05 -> 2005)
      if (year < 100) {
        // Assume years 00-30 are 2000s, 31-99 are 1900s
        year = year <= 30 ? 2000 + year : 1900 + year;
      }

      const key = `${month}-${day}`;
      if (!data[key]) {
        data[key] = [];
      }
      data[key].push({
        name: player.name,
        year: year,
        month: month,
        day: day
      });
    });

    return data;
  };

  const calculateStats = (data) => {
    const monthCounts = Array(12).fill(0);
    let totalPlayers = 0;
    let mostCommonDate = null;
    let maxCount = 0;

    Object.entries(data).forEach(([key, players]) => {
      const [month] = key.split('-').map(Number);
      monthCounts[month - 1] += players.length;
      totalPlayers += players.length;

      if (players.length > maxCount) {
        maxCount = players.length;
        mostCommonDate = key;
      }
    });

    setStats({
      totalPlayers,
      monthCounts,
      mostCommonDate,
      maxCount
    });
  };

  const getPlayerCountForDate = (month, day) => {
    const key = `${month}-${day}`;
    return birthdayData?.[key]?.length || 0;
  };

  const getIntensityClass = (count) => {
    if (count === 0) return 'bg-slate-800/30';
    if (count === 1) return 'bg-green-500/30';
    if (count === 2) return 'bg-green-500/50';
    if (count === 3) return 'bg-green-500/70';
    if (count <= 5) return 'bg-yellow-500/70';
    return 'bg-red-500/70';
  };

  const handleDateClick = (month, day) => {
    const key = `${month}-${day}`;
    const players = birthdayData?.[key] || [];

    if (players.length > 0) {
      setPlayerList({
        month: months[month - 1].name,
        day,
        players: players.sort((a, b) => b.year - a.year)
      });
      setShowPlayerModal(true);
      setSelectedDate({ month, day });
    }
  };

  const handleMonthClick = (monthIndex) => {
    setSelectedMonth(selectedMonth === monthIndex ? null : monthIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading birthday data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="text-xl">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg flex items-center gap-3">
          <Cake className="w-8 h-8 md:w-10 md:h-10" />
          IPL Players Birthday Calendar
        </h1>
        <p className="text-slate-300 drop-shadow-md text-sm md:text-base">
          Discover when your favorite IPL players celebrate their birthdays
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-md border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-slate-400 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-white">{stats.totalPlayers}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-slate-400 text-sm">Most Common Birthday</p>
                <p className="text-2xl font-bold text-white">
                  {stats.mostCommonDate && (() => {
                    const [m, d] = stats.mostCommonDate.split('-').map(Number);
                    return `${months[m - 1].short} ${d}`;
                  })()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-md border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-slate-400 text-sm">Players on That Date</p>
                <p className="text-2xl font-bold text-white">{stats.maxCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month Distribution Bar Chart */}
      {stats && (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-600/50 rounded-lg p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Birthdays by Month</h3>
          <div className="grid grid-cols-12 gap-2">
            {months.map((month, idx) => {
              const count = stats.monthCounts[idx];
              const maxMonthCount = Math.max(...stats.monthCounts);
              const heightPercent = (count / maxMonthCount) * 100;

              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="relative h-32 w-full bg-slate-700/30 rounded-t flex items-end">
                    <div
                      className={`w-full bg-gradient-to-t ${month.color} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                      style={{ height: `${heightPercent}%` }}
                      onClick={() => handleMonthClick(idx + 1)}
                    >
                      <div className="text-white text-xs font-bold text-center pt-1">
                        {count}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs font-medium">{month.short}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Calendar Grid */}
      <div className="space-y-6">
        {months.map((month, monthIdx) => {
          const monthNum = monthIdx + 1;
          const isExpanded = selectedMonth === null || selectedMonth === monthNum;

          if (!isExpanded) return null;

          return (
            <div
              key={monthIdx}
              className="bg-slate-800/40 backdrop-blur-md border border-slate-600/50 rounded-lg p-4 md:p-6 transition-all duration-300"
            >
              <div
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => handleMonthClick(monthNum)}
              >
                <h3 className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${month.color} bg-clip-text text-transparent`}>
                  {month.name}
                </h3>
                <div className="text-slate-400 text-sm">
                  {stats?.monthCounts[monthIdx] || 0} players
                </div>
              </div>

              <div className="grid grid-cols-7 md:grid-cols-10 lg:grid-cols-15 xl:grid-cols-20 gap-2">
                {Array.from({ length: month.days }, (_, i) => {
                  const day = i + 1;
                  const count = getPlayerCountForDate(monthNum, day);
                  const intensityClass = getIntensityClass(count);

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(monthNum, day)}
                      disabled={count === 0}
                      className={`
                        relative aspect-square rounded-lg transition-all duration-200
                        ${intensityClass}
                        ${count > 0 ? 'hover:scale-110 hover:shadow-lg cursor-pointer border-2 border-transparent hover:border-white/50' : 'cursor-not-allowed opacity-50'}
                        flex items-center justify-center
                      `}
                      title={count > 0 ? `${count} player${count > 1 ? 's' : ''} born on ${month.name} ${day}` : 'No birthdays'}
                    >
                      <span className="text-white text-xs md:text-sm font-semibold">{day}</span>
                      {count > 0 && (
                        <div className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center font-bold">
                          {count}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player List Modal */}
      {showPlayerModal && playerList && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-start">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
                  <Cake className="w-7 h-7 text-purple-400" />
                  Born on {playerList.month} {playerList.day}
                </h2>
                <p className="text-slate-400">
                  {playerList.players.length} player{playerList.players.length !== 1 ? 's' : ''} celebrate{playerList.players.length === 1 ? 's' : ''} their birthday on this date
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setSelectedDate(null);
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Player List */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playerList.players.map((player, index) => {
                  const age = new Date().getFullYear() - player.year;
                  return (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 hover:border-purple-500/50 transition-all hover:scale-105"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-white font-bold text-lg">{player.name}</p>
                        <span className="text-purple-400 text-xs bg-purple-500/20 px-2 py-1 rounded">
                          {age} yrs
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">
                        Born: {playerList.month} {playerList.day}, {player.year}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 bg-slate-800/40 backdrop-blur-md border border-slate-600/50 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 text-sm">Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-slate-800/30 rounded border border-slate-600"></div>
            <span className="text-slate-300">No birthdays</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/30 rounded"></div>
            <span className="text-slate-300">1 player</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/50 rounded"></div>
            <span className="text-slate-300">2 players</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/70 rounded"></div>
            <span className="text-slate-300">3 players</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500/70 rounded"></div>
            <span className="text-slate-300">4-5 players</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500/70 rounded"></div>
            <span className="text-slate-300">6+ players</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BirthdaySunburst;
