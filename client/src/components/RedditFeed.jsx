import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, MessageCircle, ExternalLink, TrendingUp, Calendar, User, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';

function RedditFeed() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlair, setSelectedFlair] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchRedditPosts = async () => {
    try {
      setError(null);
      const response = await axios.get('/api/reddit/ipl');
      setPosts(response.data.posts);
      setFilteredPosts(response.data.posts);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching Reddit posts:', err);
      setError('Failed to load Reddit posts. Please try again later.');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRedditPosts();
  }, []);

  // Get unique flairs
  const flairs = ['All', ...new Set(posts.filter(p => p.linkFlairText).map(p => p.linkFlairText))];

  // Filter posts by flair
  useEffect(() => {
    if (selectedFlair === 'All') {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(p => p.linkFlairText === selectedFlair));
    }
  }, [selectedFlair, posts]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRedditPosts();
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getFlairColor = (backgroundColor) => {
    if (!backgroundColor || backgroundColor === '') return 'bg-slate-200 text-slate-700';
    return '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <MessageSquare className="w-16 h-16 text-primary-600 animate-pulse mb-4" />
        <p className="text-slate-600 text-lg">Loading IPL community posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="btn-primary inline-flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2">IPL Community</h2>
          <p className="text-white/80 drop-shadow-md">Latest discussions from r/IPL on Reddit</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/30 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Flair Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 text-white/80 drop-shadow-md">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-semibold">Filter:</span>
        </div>
        {flairs.map(flair => (
          <button
            key={flair}
            onClick={() => setSelectedFlair(flair)}
            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              selectedFlair === flair
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/30'
            }`}
          >
            {flair}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-white/70 text-lg">No posts found for this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className="rounded-xl p-6 border-2 border-white/20 hover:border-primary-400 transition-all hover:shadow-xl hover:shadow-primary-500/20"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              {/* Flair */}
              {post.linkFlairText && (
                <div className="mb-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getFlairColor(post.linkFlairBackgroundColor)}`}
                    style={
                      post.linkFlairBackgroundColor && post.linkFlairBackgroundColor !== ''
                        ? { backgroundColor: post.linkFlairBackgroundColor, color: '#fff' }
                        : {}
                    }
                  >
                    {post.linkFlairText}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-3 drop-shadow-md line-clamp-2">
                {post.title}
              </h3>

              {/* Thumbnail if available */}
              {post.thumbnail && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={post.thumbnail}
                    alt={post.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Self text preview */}
              {post.selftext && post.selftext.length > 0 && (
                <p className="text-white/80 text-sm mb-4 line-clamp-3 drop-shadow-md">
                  {post.selftext}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70 mb-4 drop-shadow-md">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>u/{post.author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatTimeAgo(post.created)}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-white/80 drop-shadow-md">
                    <ThumbsUp className="w-4 h-4 text-green-400" />
                    <span className="font-semibold">{post.score}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/80 drop-shadow-md">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold">{post.numComments}</span>
                  </div>
                </div>

                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all text-sm font-semibold"
                >
                  View on Reddit
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RedditFeed;
