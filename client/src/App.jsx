import { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, Target, BarChart3, Users, Trophy, LogOut } from 'lucide-react';
import PlayerSelector from './components/PlayerSelector';
import PhaseAnalysis from './components/PhaseAnalysis';
import DismissalAnalysis from './components/DismissalAnalysis';
import PlayerStats from './components/PlayerStats';
import BatsmanVsBowler from './components/BatsmanVsBowler';
import MOTMAnalysis from './components/MOTMAnalysis';
import ShareButton from './components/ShareButton';
import AuthPage from './components/AuthPage';
import { useAuth } from './context/AuthContext';
import axios from 'axios';

function App() {
  const { isAuthenticated, user, logout, loading: authLoading } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [activeTab, setActiveTab] = useState('phase');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);

  console.log('App render - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'user:', user);

  // Show loading while checking authentication
  if (authLoading) {
    console.log('Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
        <div className="text-center">
          <Activity className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    console.log('Showing auth page');
    return <AuthPage />;
  }

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleTabKeyDown = (e, tabId) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === tabId);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    setActiveTab(tabs[newIndex].id);
    // Focus the newly selected tab
    setTimeout(() => {
      document.getElementById(`tab-${tabs[newIndex].id}`)?.focus();
    }, 0);
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get('/api/players');
      setPlayers(response.data.players);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching players:', error);
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'phase', name: 'Phase Performance', icon: TrendingUp },
    { id: 'dismissal', name: 'Dismissal Patterns', icon: Target },
    { id: 'stats', name: 'Overall Stats', icon: BarChart3 },
    { id: 'matchup', name: 'Vs Bowler', icon: Users },
    { id: 'motm', name: 'MOTM', icon: Trophy },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with User Info and Logout */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-12 h-12 text-primary-600" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                IPL Cricket Analytics
              </h1>
            </div>

            {/* User Info and Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm text-slate-600">Welcome back,</p>
                <p className="font-semibold text-slate-800">{user?.name}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          <p className="text-slate-600 text-lg text-center">
            Analyze ball-by-ball IPL data from 2008 to 2025
          </p>
        </div>

        {/* Player Selector */}
        <div className="card mb-8">
          <PlayerSelector
            players={players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelectedPlayer}
            loading={loading}
          />
        </div>

        {/* Tabs and Share Button */}
        {selectedPlayer && (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="flex gap-4 overflow-x-auto" role="tablist" aria-label="Analysis options">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-${tab.id}`}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`tabpanel-${tab.id}`}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      onClick={() => setActiveTab(tab.id)}
                      onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'bg-white text-slate-700 hover:bg-slate-50 shadow'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>

              {/* Share Button */}
              <ShareButton
                player={selectedPlayer}
                tabName={tabs.find(t => t.id === activeTab)?.name || 'Analysis'}
                contentRef={contentRef}
              />
            </div>

            {/* Content */}
            <div ref={contentRef} className="card" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
              {activeTab === 'phase' && <PhaseAnalysis player={selectedPlayer} />}
              {activeTab === 'dismissal' && <DismissalAnalysis player={selectedPlayer} />}
              {activeTab === 'stats' && <PlayerStats player={selectedPlayer} />}
              {activeTab === 'matchup' && <BatsmanVsBowler player={selectedPlayer} />}
              {activeTab === 'motm' && <MOTMAnalysis player={selectedPlayer} />}
            </div>
          </>
        )}

        {/* Empty State */}
        {!selectedPlayer && !loading && (
          <div className="card text-center py-16">
            <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Select a player to begin
            </h3>
            <p className="text-slate-500">
              Choose a player from the dropdown above to analyze their performance
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
