import { useState, useEffect } from 'react';
import { Activity, TrendingUp, Target, BarChart3 } from 'lucide-react';
import PlayerSelector from './components/PlayerSelector';
import PhaseAnalysis from './components/PhaseAnalysis';
import DismissalAnalysis from './components/DismissalAnalysis';
import PlayerStats from './components/PlayerStats';
import axios from 'axios';

function App() {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [activeTab, setActiveTab] = useState('phase');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

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
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-primary-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              IPL Cricket Analytics
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
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

        {/* Tabs */}
        {selectedPlayer && (
          <>
            <div className="flex gap-4 mb-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
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

            {/* Content */}
            <div className="card">
              {activeTab === 'phase' && <PhaseAnalysis player={selectedPlayer} />}
              {activeTab === 'dismissal' && <DismissalAnalysis player={selectedPlayer} />}
              {activeTab === 'stats' && <PlayerStats player={selectedPlayer} />}
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
