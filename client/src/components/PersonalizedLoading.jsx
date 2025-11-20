import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Personalized loading component with rotating messages
 * Shows engaging messages with user's name
 */
function PersonalizedLoading({ userName = 'honey', context = 'statistics' }) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Personalized loading messages
  const loadingMessages = [
    `Calculating for you, ${userName}...`,
    `Thinking about ${context}, ${userName}...`,
    `Considering the data, ${userName}...`,
    `Contemplating insights, ${userName}...`,
    `Crunching numbers for you, ${userName}...`,
    `Channelling cricket wisdom, ${userName}...`,
    `Processing analytics, ${userName}...`,
    `Booping the servers, ${userName}...`,
    `Spinning up magic, ${userName}...`,
    `Churning through data, ${userName}...`,
    `Cooking up stats, ${userName}...`,
    `Envisioning patterns, ${userName}...`,
    `Baking fresh insights, ${userName}...`,
  ];

  // Rotate messages every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* Animated loader */}
      <div className="relative">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 rounded-full border-4 border-primary-200 animate-ping opacity-25"></div>

        {/* Main spinning icon */}
        <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 rounded-full p-8 shadow-2xl">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>

        {/* Inner pulsing circle */}
        <div className="absolute inset-4 rounded-full bg-primary-400 animate-pulse opacity-30"></div>
      </div>

      {/* Personalized message */}
      <div className="mt-8 text-center">
        <p className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
          {loadingMessages[messageIndex]}
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Subtle hint */}
        <p className="text-sm text-slate-500 mt-6 animate-pulse">
          Fetching the best cricket analytics just for you
        </p>
      </div>
    </div>
  );
}

export default PersonalizedLoading;
