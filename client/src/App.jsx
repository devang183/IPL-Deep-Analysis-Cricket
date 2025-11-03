import { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, Target, BarChart3, Users, Trophy, LogOut, Shield, Sparkles } from 'lucide-react';
import PlayerSelector from './components/PlayerSelector';
import PhaseAnalysis from './components/PhaseAnalysis';
import DismissalAnalysis from './components/DismissalAnalysis';
import PlayerStats from './components/PlayerStats';
import BowlerStats from './components/BowlerStats';
import BatsmanVsBowler from './components/BatsmanVsBowler';
import MOTMAnalysis from './components/MOTMAnalysis';
import AdminDashboard from './components/AdminDashboard';
import SmartSearch from './components/SmartSearch';
import ShareButton from './components/ShareButton';
import AuthPage from './components/AuthPage';
import SpaceBackground from './components/SpaceBackground';
import { useAuth } from './context/AuthContext';
import axios from 'axios';

function App() {
  const { isAuthenticated, user, logout, loading: authLoading } = useAuth();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [initialBowler, setInitialBowler] = useState('');
  const [activeTab, setActiveTab] = useState('smart');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);

  console.log('App render - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'user:', user);

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

  // Fetch players only when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPlayers();
    }
  }, [isAuthenticated, authLoading]);

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

  // Define all tabs
  const allTabs = [
    { id: 'smart', name: 'Smart Search', icon: Sparkles },
    { id: 'phase', name: 'Phase Performance', icon: TrendingUp },
    { id: 'dismissal', name: 'Dismissal Patterns', icon: Target },
    { id: 'stats', name: 'Batting Stats', icon: BarChart3 },
    { id: 'bowler', name: 'Bowling Stats', icon: Target },
    { id: 'matchup', name: 'Vs Bowler', icon: Users },
    { id: 'motm', name: 'MOTM', icon: Trophy },
    { id: 'admin', name: 'Admin', icon: Shield, adminOnly: true },
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter(tab => !tab.adminOnly || user?.isAdmin);

  return (
    <div className="min-h-screen py-8 px-4 relative">
      <SpaceBackground />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header with User Info and Logout */}
        <div className="mb-12 animate-fade-in-down">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-12 h-12 text-primary-600 animate-bounce-subtle" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                IPL Cricket Analytics
              </h1>
            </div>

            {/* User Info and Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm text-slate-600">Welcome back,</p>
                  {user?.isAdmin && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-800">{user?.name}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all hover:scale-105 active:scale-95"
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

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-slide-in-right">
          <div className="flex gap-4 overflow-x-auto" role="tablist" aria-label="Analysis options">
            {tabs.map((tab, index) => {
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
                  style={{ animationDelay: `${index * 0.1}s` }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap animate-fade-in-up hover:scale-105 active:scale-95 ${
                    activeTab === tab.id
                      ? 'text-white border-2 border-primary-500 shadow-lg shadow-primary-500/50 animate-pulse-glow'
                      : 'text-white/70 border border-white/20 hover:text-white hover:border-white/40'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'animate-wiggle' : ''}`} />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Share Button - only show when player is selected and not on smart/admin tab */}
          {selectedPlayer && activeTab !== 'smart' && activeTab !== 'admin' && (
            <ShareButton
              player={selectedPlayer}
              tabName={tabs.find(t => t.id === activeTab)?.name || 'Analysis'}
              contentRef={contentRef}
            />
          )}
        </div>

        {/* Content */}
        <div ref={contentRef} className="animate-scale-in" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'smart' && (
            <SmartSearch
              players={players}
              onPlayerSelect={setSelectedPlayer}
              onTabChange={setActiveTab}
              onBowlerSelect={setInitialBowler}
            />
          )}

          {activeTab !== 'smart' && activeTab !== 'admin' && !selectedPlayer && (
            <div className="card text-center py-16">
              <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                Select a player to view {tabs.find(t => t.id === activeTab)?.name}
              </h3>
              <p className="text-slate-500 mb-4">
                Use the Smart Search tab to ask questions in natural language
              </p>
              <button
                onClick={() => setActiveTab('smart')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Go to Smart Search
              </button>
            </div>
          )}

          {activeTab === 'phase' && selectedPlayer && (
            <div className="card">
              <PhaseAnalysis player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'dismissal' && selectedPlayer && (
            <div className="card">
              <DismissalAnalysis player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'stats' && selectedPlayer && (
            <div className="card">
              <PlayerStats player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'bowler' && selectedPlayer && (
            <div className="card">
              <BowlerStats player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'matchup' && selectedPlayer && (
            <div className="card">
              <BatsmanVsBowler player={selectedPlayer} initialBowler={initialBowler} />
            </div>
          )}

          {activeTab === 'motm' && selectedPlayer && (
            <div className="card">
              <MOTMAnalysis player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="card">
              <AdminDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
