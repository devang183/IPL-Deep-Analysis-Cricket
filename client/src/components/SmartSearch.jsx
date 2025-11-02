import { useState } from 'react';
import { Search, Sparkles, Loader2, TrendingUp, Target, BarChart3, Users, Trophy, Lightbulb, AlertCircle } from 'lucide-react';
import PhaseAnalysis from './PhaseAnalysis';
import DismissalAnalysis from './DismissalAnalysis';
import PlayerStats from './PlayerStats';
import BatsmanVsBowler from './BatsmanVsBowler';
import MOTMAnalysis from './MOTMAnalysis';
import { findBestPlayerMatch, findPlayerSuggestions, checkCommonNameMapping } from '../utils/nameMatching';

function SmartSearch({ players, onPlayerSelect, onTabChange }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedQuery, setParsedQuery] = useState(null);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);

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

  // Parse natural language query with fuzzy matching
  const parseQuery = (queryText) => {
    const lowerQuery = queryText.toLowerCase().trim();

    // Detect analysis type first
    let analysisType = 'stats'; // default
    let confidence = 0;

    for (const [type, words] of Object.entries(keywords)) {
      const matches = words.filter(word => lowerQuery.includes(word));
      if (matches.length > confidence) {
        confidence = matches.length;
        analysisType = type;
      }
    }

    // Extract player name using smart fuzzy matching
    let detectedPlayer = null;
    let matchScore = 0;

    // First, try common name mappings
    detectedPlayer = checkCommonNameMapping(lowerQuery, players);

    if (!detectedPlayer) {
      // Split query into potential player name parts
      // For queries like "virat kohli stats", we want to extract "virat kohli"
      const words = lowerQuery.split(/\s+/);

      // Try combinations of consecutive words as player names
      for (let i = 0; i < words.length; i++) {
        for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
          const potentialName = words.slice(i, j).join(' ');

          // Skip if it's a keyword
          const isKeyword = Object.values(keywords).flat().some(k => potentialName.includes(k));
          if (isKeyword) continue;

          // Find best match using fuzzy matching
          const match = findBestPlayerMatch(potentialName, players, 60);

          if (match && match.score > matchScore) {
            matchScore = match.score;
            detectedPlayer = match.player;
          }
        }
      }
    }

    // Extract second player for matchup using same fuzzy matching
    let secondPlayer = null;
    let secondPlayerScore = 0;

    if (analysisType === 'matchup') {
      const vsPattern = /(?:vs|versus|against|facing)\s+(.+?)(?:\s*$|\s+(?:stats|in|at|during))/i;
      const match = lowerQuery.match(vsPattern);

      if (match) {
        const potentialName = match[1].trim();

        // Try common mappings first
        const commonMatch = checkCommonNameMapping(potentialName, players);
        if (commonMatch) {
          secondPlayer = commonMatch;
          secondPlayerScore = 100;
        } else {
          // Use fuzzy matching
          const fuzzyMatch = findBestPlayerMatch(potentialName, players, 60);
          if (fuzzyMatch) {
            secondPlayer = fuzzyMatch.player;
            secondPlayerScore = fuzzyMatch.score;
          }
        }
      }
    }

    return {
      player: detectedPlayer,
      analysisType,
      secondPlayer,
      matchScore,
      secondPlayerScore,
      originalQuery: queryText,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSuggestions([]);

    // Simulate processing delay for better UX
    setTimeout(() => {
      const parsed = parseQuery(query);

      if (!parsed.player) {
        // Try to find suggestions - show ALL matching players
        const playerSuggestions = findPlayerSuggestions(query, players, 100, 40);

        if (playerSuggestions.length > 0) {
          setError(`Found ${playerSuggestions.length} matching player${playerSuggestions.length > 1 ? 's' : ''}. Please select:`);
          setSuggestions(playerSuggestions);
        } else {
          setError("I couldn't find a player name in your query. Please try again with a valid player name.");
        }
        setLoading(false);
        return;
      }

      // ALWAYS show ALL matching players for confirmation (unless 100% match)
      if (parsed.matchScore < 100) {
        const allSuggestions = findPlayerSuggestions(query, players, 100, 40);

        if (allSuggestions.length > 1) {
          // Show all matches including the selected one
          setError(`Found ${allSuggestions.length} matching player${allSuggestions.length > 1 ? 's' : ''}. Please select:`);
          setSuggestions(allSuggestions);
          setLoading(false);
          return;
        }
      }

      // Only auto-execute if 100% match or only one suggestion
      setParsedQuery(parsed);
      onPlayerSelect(parsed.player);
      onTabChange(parsed.analysisType);
      setLoading(false);
    }, 800);
  };

  const handleSuggestionClick = (playerName) => {
    // Replace the player name in the query
    const parsed = parseQuery(query);
    setParsedQuery({ ...parsed, player: playerName, matchScore: 100 });
    onPlayerSelect(playerName);
    onTabChange(parsed.analysisType);
    setSuggestions([]);
    setError('');
  };

  const handleExampleClick = (exampleText) => {
    setQuery(exampleText);
    setParsedQuery(null);
    setError('');
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery('');
    setParsedQuery(null);
    setError('');
    setSuggestions([]);
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
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask me anything... e.g., 'Show Virat Kohli's dismissal patterns'"
              className="w-full pl-14 pr-4 py-4 text-lg border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-black placeholder:text-slate-400"
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

        {/* Error/Info Message */}
        {error && (
          <div className={`mt-4 p-4 border rounded-lg animate-fade-in-down ${
            suggestions.length > 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {suggestions.length > 0 ? (
                <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm font-medium ${
                suggestions.length > 0 ? 'text-blue-700' : 'text-red-700'
              }`}>
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Player Suggestions - Scrollable Dropdown */}
        {suggestions.length > 0 && (
          <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-lg animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                <h4 className="font-bold text-blue-900 text-base">
                  Select the player you're looking for:
                </h4>
              </div>
              <div className="px-3 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded-full">
                {suggestions.length} players
              </div>
            </div>

            {/* Scrollable container */}
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.player)}
                  className="w-full text-left px-5 py-3 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:shadow-md transition-all group animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-slate-800 group-hover:text-blue-900 font-semibold text-base">
                        {suggestion.player}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500 group-hover:text-blue-700 font-medium">
                        {suggestion.score}% match
                      </span>
                      <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:animate-ping"></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-blue-700 text-center font-medium">
              {suggestions.length > 10 && '⬆️ Scroll to see all players • '}
              Click on a player to view their analysis
            </p>
          </div>
        )}

        {/* Parsed Query Display */}
        {parsedQuery && !error && (
          <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-lg animate-slide-in-right">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-primary-900 mb-2">
                  I understood your query as:
                  {parsedQuery.matchScore < 100 && parsedQuery.matchScore >= 60 && (
                    <span className="ml-2 text-xs font-normal text-primary-600">
                      ({parsedQuery.matchScore}% confidence)
                    </span>
                  )}
                </h4>
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
                      {parsedQuery.secondPlayerScore < 100 && parsedQuery.secondPlayerScore >= 60 && (
                        <span className="ml-1 text-xs text-primary-600">
                          ({parsedQuery.secondPlayerScore}% match)
                        </span>
                      )}
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
        <div className="card animate-fade-in">
          <h4 className="font-semibold text-white mb-3">💡 Tips for better results:</h4>
          <ul className="space-y-2 text-sm text-white">
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
