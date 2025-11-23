import { HelpCircle, X, Sparkles, TrendingUp, Target, BarChart3, Users, Trophy, Shield, Activity, MessageSquare } from 'lucide-react';

function HelpGuide({ isOpen, onOpenChange, isBlurred }) {

  const helpSections = [
    {
      title: 'Smart Search',
      icon: Sparkles,
      tips: [
        'Include the player\'s full name or last name',
        'Mention what you want to see (stats, dismissals, phase, matchup, awards)',
        'For matchups, use "vs" or "against" followed by bowler name',
        //'Be specific: "powerplay", "death overs", "caught", "bowled", etc.',
      ]
    },
    {
      title: 'Available Analysis',
      icon: BarChart3,
      tips: [
        'Phase Performance - Analyze batting performance across different match phases',
        'Dismissal Patterns - Understand how a batsman gets out',
        'Batting Stats - Complete statistical overview of a batsman',
        'Bowling Stats - Comprehensive bowling statistics',
        'Vs Bowler - Head-to-head matchup analysis',
        'Vs Team - Performance against specific teams',
        'Vs Bowling Style - How batsmen fare against different bowling types',
        'MOTM Awards - Man of the Match achievements',
      ]
    },
    {
      title: 'Navigation',
      icon: Activity,
      tips: [
        'Use horizontal tabs to switch between different analysis types',
        'Swipe left/right on mobile to scroll through tabs',
        'Use keyboard arrows for tab navigation',
        'Click "Try Examples" for quick query templates',
      ]
    },
    {
      title: 'Community',
      icon: MessageSquare,
      tips: [
        'View latest cricket discussions from Reddit',
        'Stay updated with IPL news and insights',
        'Community tab updates in real-time',
      ]
    },
  ];

  return (
    <div className={`fixed top-16 md:top-20 right-12 md:right-16 z-50 transition-all duration-300 ${isBlurred ? 'opacity-30 pointer-events-none blur-sm' : ''}`}>
      {/* Toggle Button */}
      {!isOpen ? (
        <button
          onClick={() => onOpenChange(true)}
          className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
          aria-label="Show help guide"
        >
          <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-12 transition-transform" />
        </button>
      ) : (
        /* Expandable Panel */
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-in-right w-72 md:w-80">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-sm md:text-base">Help & Guide</h3>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
              aria-label="Close help guide"
            >
              <X className="w-5 h-5 text-white/70 hover:text-white" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-4">
              {helpSections.map((section, sectionIndex) => {
                const Icon = section.icon;
                return (
                  <div
                    key={sectionIndex}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                    style={{ animationDelay: `${sectionIndex * 0.1}s` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5 text-blue-400" />
                      <h4 className="font-bold text-white text-sm">{section.title}</h4>
                    </div>
                    <ul className="space-y-2">
                      {section.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2 text-xs text-white/80">
                          <span className="text-blue-400 font-bold mt-0.5">•</span>
                          <span className="leading-relaxed">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-white/5 border-t border-white/10">
            <p className="text-xs text-white/60 text-center">
              Explore IPL data from 2008 to 2025
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpGuide;
