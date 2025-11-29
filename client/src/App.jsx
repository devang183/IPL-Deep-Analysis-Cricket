import { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, Target, BarChart3, Users, Trophy, LogOut, Shield, Sparkles, MessageSquare, Galaxy } from 'lucide-react';
import PlayerSelector from './components/PlayerSelector';
import PhaseAnalysis from './components/PhaseAnalysis';
import DismissalAnalysis from './components/DismissalAnalysis';
import PlayerStats from './components/PlayerStats';
import BowlerStats from './components/BowlerStats';
import BatsmanVsBowler from './components/BatsmanVsBowler';
import BatsmanVsTeam from './components/BatsmanVsTeam';
import BatsmanVsBowlingStyle from './components/BatsmanVsBowlingStyle';
import BatsmanVsBatsman from './components/BatsmanVsBatsman';
import MOTMAnalysis from './components/MOTMAnalysis';
import RedditFeed from './components/RedditFeed';
import AdminDashboard from './components/AdminDashboard';
import SmartSearch from './components/SmartSearch';
import PlayerGalaxy from './components/PlayerGalaxy';
import ExampleQueries from './components/ExampleQueries';
import HelpGuide from './components/HelpGuide';
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
  const [bowlers, setBowlers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exampleQuery, setExampleQuery] = useState('');
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const contentRef = useRef(null);

  // Define all tabs
  const allTabs = [
    { id: 'smart', name: 'Smart Search', icon: Sparkles },
    { id: 'galaxy', name: 'Player Galaxy', icon: Galaxy },
    { id: 'phase', name: 'Phase Performance', icon: TrendingUp },
    { id: 'dismissal', name: 'Dismissal Patterns', icon: Target },
    { id: 'stats', name: 'Batting Stats', icon: BarChart3 },
    { id: 'bowler', name: 'Bowling Stats', icon: Target },
    { id: 'matchup', name: 'Vs Bowler', icon: Users },
    { id: 'vsteam', name: 'Vs Team', icon: Shield },
    { id: 'vsbowlingstyle', name: 'Vs Bowling Style', icon: Activity },
    { id: 'vsbatsman', name: 'Batsman vs Batsman', icon: Users },
    { id: 'motm', name: 'MOTM', icon: Trophy },
    { id: 'community', name: 'Community', icon: MessageSquare },
    { id: 'admin', name: 'Admin', icon: Shield, adminOnly: true },
  ];

  // Filter tabs based on user role
  const tabs = allTabs.filter(tab => !tab.adminOnly || user?.isAdmin);

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

  const fetchBowlers = async () => {
    try {
      const response = await axios.get('/api/bowlers');
      setBowlers(response.data.bowlers);
    } catch (error) {
      console.error('Error fetching bowlers:', error);
    }
  };

  // Fetch players and bowlers only when authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchPlayers();
      fetchBowlers();
    }
  }, [isAuthenticated, authLoading]);

  // Scroll active tab into view when it changes
  useEffect(() => {
    // Small delay to ensure tab is rendered before scrolling
    const timeoutId = setTimeout(() => {
      const activeTabElement = document.getElementById(`tab-${activeTab}`);
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [activeTab]);

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


  // Handle example query click
  const handleExampleQueryClick = (queryText) => {
    // Reset to smart tab and clear any previous results
    setActiveTab('smart');
    setSelectedPlayer('');
    // Set the example query with a unique timestamp to trigger re-processing
    setExampleQuery(`${queryText}::${Date.now()}`);
  };

  return (
    <div className="min-h-screen py-3 md:py-6 lg:py-8 px-3 md:px-4 relative">
      <SpaceBackground />

      {/* Example Queries and Help - Fixed Position Top Right */}
      {activeTab === 'smart' && (
        <>
          <ExampleQueries
            onQueryClick={handleExampleQueryClick}
            mode="batting"
            isOpen={isExamplesOpen}
            setIsOpen={setIsExamplesOpen}
            onOpenChange={(open) => {
              setIsExamplesOpen(open);
              if (open) setIsHelpOpen(false); // Close help when examples open
            }}
            isBlurred={isHelpOpen}
          />
          <HelpGuide
            isOpen={isHelpOpen}
            setIsOpen={setIsHelpOpen}
            onOpenChange={(open) => {
              setIsHelpOpen(open);
              if (open) setIsExamplesOpen(false); // Close examples when help opens
            }}
            isBlurred={isExamplesOpen}
          />
        </>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Mobile-First Header */}
        <div className="mb-4 md:mb-8 lg:mb-12 animate-fade-in-down">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mb-3 md:mb-6">
            {/* Logo and Title - Mobile Optimized */}
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <Activity className="w-7 h-7 md:w-10 md:h-10 lg:w-12 lg:h-12 text-primary-600 animate-bounce-subtle flex-shrink-0" />
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent leading-tight text-center sm:text-left">
                IPL Cricket Analytics
              </h1>
            </div>

            {/* User Info and Logout - Mobile Optimized */}
            <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto justify-center sm:justify-end">
              <div className="text-center sm:text-right hidden md:block">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-xs md:text-sm text-slate-600">Welcome back,</p>
                  {user?.isAdmin && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg transition-all text-sm md:text-base font-medium touch-manipulation min-h-[44px]"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* <p className="text-slate-600 text-xs sm:text-sm md:text-base lg:text-lg text-center px-2">
            Analyze ball-by-ball IPL data from 2008 to 2025
          </p> */}
        </div>

        {/* Mobile-First Horizontal Scrollable Tabs */}
        <div className="mb-4 md:mb-6 lg:mb-8 animate-slide-in-right">
          {/* Tabs Container - Swipe to Scroll */}
          <div
            className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-label="Analysis options"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              scrollSnapType: 'x proximity'
            }}
          >
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
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    scrollSnapAlign: 'center'
                  }}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 sm:px-4 md:px-5 lg:px-6 py-2.5 md:py-3 rounded-lg font-semibold transition-all whitespace-nowrap animate-fade-in-up active:scale-95 flex-shrink-0 text-xs sm:text-sm md:text-base touch-manipulation min-h-[44px] ${
                    activeTab === tab.id
                      ? 'text-white border-2 border-primary-500 shadow-lg shadow-primary-500/50 scale-105'
                      : 'text-white/70 border border-white/20 hover:text-white hover:border-white/40 hover:scale-105'
                  }`}
                >
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${activeTab === tab.id ? 'animate-wiggle' : ''}`} />
                  <span className="font-semibold">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content - Mobile Optimized */}
        <div ref={contentRef} className="animate-scale-in" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'smart' && (
            <SmartSearch
              players={players}
              onPlayerSelect={setSelectedPlayer}
              onTabChange={setActiveTab}
              onBowlerSelect={setInitialBowler}
              exampleQuery={exampleQuery}
              showExamples={false}
            />
          )}

          {activeTab === 'galaxy' && (
            <PlayerGalaxy
              players={players}
              onPlayerSelect={(playerName) => {
                setSelectedPlayer(playerName);
                setActiveTab('stats');
              }}
            />
          )}

          {activeTab !== 'smart' && activeTab !== 'galaxy' && activeTab !== 'stats' && activeTab !== 'bowler' && activeTab !== 'admin' && activeTab !== 'community' && !selectedPlayer && (
            <div className="card text-center py-12 md:py-16">
              <Activity className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg lg:text-xl font-semibold text-slate-700 mb-2 px-2">
                Select a player to view {tabs.find(t => t.id === activeTab)?.name}
              </h3>
              <p className="text-sm md:text-base text-slate-500 mb-4 px-4">
                Use the Smart Search tab to ask questions in natural language
              </p>
              <button
                onClick={() => setActiveTab('smart')}
                className="btn-primary inline-flex items-center gap-2 text-sm md:text-base touch-manipulation min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
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

          {activeTab === 'stats' && (
            <>
              <SmartSearch
                players={players}
                onPlayerSelect={setSelectedPlayer}
                onTabChange={setActiveTab}
                onBowlerSelect={setInitialBowler}
                mode="batting"
                showExamples={false}
              />
              {selectedPlayer && (
                <div className="card mt-6">
                  <PlayerStats player={selectedPlayer} />
                </div>
              )}
            </>
          )}

          {activeTab === 'bowler' && (
            <>
              <SmartSearch
                players={bowlers}
                onPlayerSelect={setSelectedPlayer}
                onTabChange={setActiveTab}
                onBowlerSelect={setInitialBowler}
                mode="bowling"
                showExamples={false}
              />
              {selectedPlayer && (
                <div className="card mt-6">
                  <BowlerStats player={selectedPlayer} />
                </div>
              )}
            </>
          )}

          {activeTab === 'matchup' && selectedPlayer && (
            <div className="card">
              <BatsmanVsBowler player={selectedPlayer} initialBowler={initialBowler} />
            </div>
          )}

          {activeTab === 'vsteam' && selectedPlayer && (
            <div className="card">
              <BatsmanVsTeam player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'vsbowlingstyle' && selectedPlayer && (
            <div className="card">
              <BatsmanVsBowlingStyle player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'vsbatsman' && selectedPlayer && (
            <div className="card">
              <BatsmanVsBatsman player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'motm' && selectedPlayer && (
            <div className="card">
              <MOTMAnalysis player={selectedPlayer} />
            </div>
          )}

          {activeTab === 'community' && (
            <div className="card">
              <RedditFeed />
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
