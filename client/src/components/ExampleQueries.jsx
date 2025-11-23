import { useState } from 'react';
import { Lightbulb, X, TrendingUp, Target, BarChart3, Users, Trophy, ChevronDown } from 'lucide-react';

function ExampleQueries({ onQueryClick, mode = 'batting' }) {
  const [isOpen, setIsOpen] = useState(false);

  // Example queries based on mode
  const exampleQueries = mode === 'bowling' ? [
    { text: "Jasprit Bumrah bowling stats", icon: BarChart3 },
    { text: "Rashid Khan stats", icon: TrendingUp },
    { text: "Yuzvendra Chahal bowling performance", icon: Target },
    { text: "Pathirana stats", icon: TrendingUp },
    { text: "Lasith Malinga bowling stats", icon: BarChart3 },
    { text: "Sunil Narine stats", icon: Target },
  ] : [
    { text: "Show me Virat Kohli's phase performance", icon: TrendingUp },
    { text: "How does MS Dhoni get dismissed?", icon: Target },
    { text: "Rohit Sharma stats", icon: BarChart3 },
    { text: "AB de Villiers vs Jasprit Bumrah", icon: Users },
    { text: "Virat Kohli man of the match awards", icon: Trophy },
    { text: "David Warner vs bowling styles", icon: TrendingUp },
    { text: "Rohit Sharma dismissal patterns", icon: Target },
    { text: "KL Rahul phase performance", icon: TrendingUp },
  ];

  return (
    <div className="fixed top-20 md:top-24 right-3 md:right-6 z-50">
      {/* Toggle Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group animate-pulse-slow"
          aria-label="Show example queries"
        >
          <Lightbulb className="w-5 h-5 group-hover:animate-wiggle" />
          {/* <span className="font-semibold text-sm hidden sm:inline">Try Examples</span> */}
          <ChevronDown className="w-4 h-4 sm:hidden" />
        </button>
      ) : (
        /* Expandable Panel */
        <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold text-white text-sm md:text-base">Try These Examples</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
              aria-label="Close example queries"
            >
              <X className="w-5 h-5 text-white/70 hover:text-white" />
            </button>
          </div>

          {/* Scrollable Content - Shows 3 queries then scrolls */}
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-3">
            <div className="space-y-2">
              {exampleQueries.map((example, index) => {
                const Icon = example.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      onQueryClick(example.text);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 group text-left border border-white/5 hover:border-white/20"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-white/90 group-hover:text-white text-xs md:text-sm font-medium leading-relaxed">
                      {example.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Hint */}
          <div className="p-3 bg-white/5 border-t border-white/10">
            <p className="text-xs text-white/60 text-center">
              Click any example to try it instantly!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExampleQueries;
