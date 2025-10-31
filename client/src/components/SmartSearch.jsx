import { useState } from 'react';
import { Search, Sparkles, Loader2, TrendingUp, Target, BarChart3, Users, Trophy, Lightbulb } from 'lucide-react';
import PhaseAnalysis from './PhaseAnalysis';
import DismissalAnalysis from './DismissalAnalysis';
import PlayerStats from './PlayerStats';
import BatsmanVsBowler from './BatsmanVsBowler';
import MOTMAnalysis from './MOTMAnalysis';

function SmartSearch({ players, onPlayerSelect, onTabChange }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedQuery, setParsedQuery] = useState(null);
  const [error, setError] = useState('');

  // Example queries to show users
  const exampleQueries = [
    { text: "Show me Virat Kohli's phase performance", icon: TrendingUp },
    { text: "How does MS Dhoni get dismissed?", icon: Target },
    { text: "Rohit Sharma stats", icon: BarChart3 },
    { text: "AB de Villiers vs Jasprit Bumrah", icon: Users },
    { text: "Virat Kohli man of the match awards", icon: Trophy },
    { text: "MS Dhoni powerplay stats", icon: TrendingUp },
  ];

  // Keywords mapping to analysis types
  const keywords = {
    phase: ['phase', 'powerplay', 'middle', 'death', 'overs', 'period'],
    dismissal: ['dismissal', 'dismissed', 'out', 'wicket', 'caught', 'bowled', 'lbw', 'how', 'get out'],
    stats: ['stats', 'statistics', 'overall', 'total', 'runs', 'average', 'strike rate', 'performance'],
    matchup: ['vs', 'versus', 'against', 'bowler', 'bowling', 'face', 'facing'],
    motm: ['motm', 'man of the match', 'awards', 'mom', 'player of the match'],
  };

  // Parse natural language query
  const parseQuery = (queryText) => {
    const lowerQuery = queryText.toLowerCase().trim();

    // Extract player name - check against player list
    let detectedPlayer = null;
    for (const player of players) {
      if (lowerQuery.includes(player.toLowerCase())) {
        detectedPlayer = player;
        break;
      }
    }

    if (!detectedPlayer) {
      // Try to find partial matches
      for (const player of players) {
        const playerNames = player.toLowerCase().split(' ');
        const hasMatch = playerNames.some(name => lowerQuery.includes(name) && name.length > 3);
        if (hasMatch) {
          detectedPlayer = player;
          break;
        }
      }
    }

    // Detect analysis type
    let analysisType = 'stats'; // default
    let confidence = 0;

    for (const [type, words] of Object.entries(keywords)) {
      const matches = words.filter(word => lowerQuery.includes(word));
      if (matches.length > confidence) {
        confidence = matches.length;
        analysisType = type;
      }
    }

    // Extract second player for matchup
    let secondPlayer = null;
    if (analysisType === 'matchup') {
      const vsPattern = /(?:vs|versus|against|facing)\s+([a-z\s]+?)(?:\s|$)/i;
      const match = lowerQuery.match(vsPattern);
      if (match) {
        const potentialName = match[1].trim();
        // Find matching bowler
        for (const player of players) {
          if (player.toLowerCase().includes(potentialName) || potentialName.includes(player.toLowerCase().split(' ')[0])) {
            secondPlayer = player;
            break;
          }
        }
      }
    }

    return {
      player: detectedPlayer,
      analysisType,
      secondPlayer,
      confidence,
      originalQuery: queryText,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    // Simulate processing delay for better UX
    setTimeout(() => {
      const parsed = parseQuery(query);

      if (!parsed.player) {
        setError("I couldn't find a player name in your query. Please try again with a valid player name.");
        setLoading(false);
        return;
      }

      setParsedQuery(parsed);
      onPlayerSelect(parsed.player);
      onTabChange(parsed.analysisType);
      setLoading(false);
    }, 800);
  };

  const handleExampleClick = (exampleText) => {
    setQuery(exampleText);
    setParsedQuery(null);
    setError('');
  };

  const handleClear = () => {
    setQuery('');
    setParsedQuery(null);
    setError('');
  };

  const getAnalysisIcon = (type) => {
    const icons = {
      phase: TrendingUp,
      dismissal: Target,
      stats: BarChart3,
      matchup: Users,
      motm: Trophy,
    };
    return icons[type] || BarChart3;
  };

  const getAnalysisName = (type) => {
    const names = {
      phase: 'Phase Performance',
      dismissal: 'Dismissal Patterns',
      stats: 'Overall Statistics',
      matchup: 'Batsman vs Bowler',
      motm: 'Man of the Match Awards',
    };
    return names[type] || 'Analysis';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center animate-fade-in-down">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className="w-8 h-8 text-primary-600 animate-bounce-subtle" />
          <h2 className="text-3xl font-bold text-slate-800">Smart Search</h2>
        </div>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Ask questions in natural language and get instant cricket analytics
        </p>
      </div>

      {/* Search Bar */}
      <div className="card animate-scale-in">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything... e.g., 'Show Virat Kohli's dismissal patterns'"
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              disabled={loading}
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary flex items-center gap-2 flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in-down">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Parsed Query Display */}
        {parsedQuery && !error && (
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-lg animate-slide-in-right">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-primary-900 mb-2">I understood your query as:</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-primary-800">
                    <span className="font-medium">Player:</span> {parsedQuery.player}
                  </p>
                  <p className="text-primary-800">
                    <span className="font-medium">Analysis:</span> {getAnalysisName(parsedQuery.analysisType)}
                  </p>
                  {parsedQuery.secondPlayer && (
                    <p className="text-primary-800">
                      <span className="font-medium">Against:</span> {parsedQuery.secondPlayer}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Example Queries */}
      {!parsedQuery && (
        <div className="animate-fade-in-up">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Try these example queries:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exampleQueries.map((example, index) => {
              const Icon = example.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example.text)}
                  className="text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all hover-lift group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <p className="text-slate-700 group-hover:text-primary-700 transition-colors">
                      {example.text}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Display */}
      {parsedQuery && parsedQuery.player && !error && (
        <div className="animate-scale-in">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {(() => {
                const Icon = getAnalysisIcon(parsedQuery.analysisType);
                return <Icon className="w-6 h-6 text-primary-600" />;
              })()}
              Results for "{parsedQuery.originalQuery}"
            </h3>
            <button
              onClick={handleClear}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              New Search
            </button>
          </div>

          <div className="card">
            {parsedQuery.analysisType === 'phase' && (
              <PhaseAnalysis player={parsedQuery.player} />
            )}
            {parsedQuery.analysisType === 'dismissal' && (
              <DismissalAnalysis player={parsedQuery.player} />
            )}
            {parsedQuery.analysisType === 'stats' && (
              <PlayerStats player={parsedQuery.player} />
            )}
            {parsedQuery.analysisType === 'matchup' && (
              <BatsmanVsBowler player={parsedQuery.player} initialBowler={parsedQuery.secondPlayer} />
            )}
            {parsedQuery.analysisType === 'motm' && (
              <MOTMAnalysis player={parsedQuery.player} />
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      {!parsedQuery && (
        <div className="card bg-gradient-to-br from-slate-50 to-slate-100 animate-fade-in">
          <h4 className="font-semibold text-slate-800 mb-3">💡 Tips for better results:</h4>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Include the player's full name or last name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Mention what you want to see (stats, dismissals, phase, matchup, awards)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>For matchups, use "vs" or "against" followed by bowler name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 font-bold">•</span>
              <span>Be specific: "powerplay", "death overs", "caught", "bowled", etc.</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default SmartSearch;
