import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, MessageCircle, ExternalLink, TrendingUp, Calendar, User, Filter, RefreshCw, AlertCircle, X, Loader2, ChevronRight } from 'lucide-react';

function RedditFeed() {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFlair, setSelectedFlair] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState(null);

  const fetchRedditPosts = async () => {
    try {
      setError(null);
      const response = await fetch('https://www.reddit.com/r/IPL/hot/.json?limit=25');
      const data = await response.json();

      // Transform Reddit API response to match our component's expected format
      const transformedPosts = data.data.children.map(child => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        score: child.data.score,
        numComments: child.data.num_comments,
        created: child.data.created_utc,
        permalink: `https://www.reddit.com${child.data.permalink}`,
        linkFlairText: child.data.link_flair_text,
        linkFlairBackgroundColor: child.data.link_flair_background_color,
        thumbnail: child.data.thumbnail && child.data.thumbnail !== 'self' && child.data.thumbnail !== 'default' ? child.data.thumbnail : null,
        selftext: child.data.selftext
      }));

      setPosts(transformedPosts);
      setFilteredPosts(transformedPosts);
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

  const fetchPostComments = async (post) => {
    setLoadingComments(true);
    setCommentsError(null);
    setSelectedPost(post);

    try {
      // Fetch comments using Reddit's JSON API
      const postId = post.id;
      const response = await fetch(`https://www.reddit.com/r/IPL/comments/${postId}/.json`);
      const data = await response.json();

      // The response is an array with 2 elements: [0] is the post, [1] is the comments
      const commentsData = data[1].data.children;

      // Transform comments recursively
      const transformComment = (comment) => {
        if (comment.kind === 'more') {
          return null; // Skip "load more comments" placeholders
        }

        const commentData = comment.data;
        return {
          id: commentData.id,
          author: commentData.author,
          body: commentData.body,
          score: commentData.score,
          created: commentData.created_utc,
          replies: commentData.replies && commentData.replies.data
            ? commentData.replies.data.children
                .map(transformComment)
                .filter(c => c !== null)
            : []
        };
      };

      const transformedComments = commentsData
        .map(transformComment)
        .filter(c => c !== null);

      setPostComments(transformedComments);
      setLoadingComments(false);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setCommentsError('Failed to load comments');
      setLoadingComments(false);
    }
  };

  const closeModal = () => {
    setSelectedPost(null);
    setPostComments([]);
    setCommentsError(null);
  };

  const handlePostClick = (post) => {
    fetchPostComments(post);
  };

  // Recursive comment component
  const Comment = ({ comment, depth = 0 }) => {
    const [collapsed, setCollapsed] = useState(false);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <div className={`${depth > 0 ? 'ml-4 pl-4 border-l-2 border-white/20' : ''} mb-3`}>
        <div className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-3 h-3 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">u/{comment.author}</span>
            <span className="text-xs text-white/50">{formatTimeAgo(comment.created)}</span>
            <div className="flex items-center gap-1 ml-auto">
              <ThumbsUp className="w-3 h-3 text-green-400" />
              <span className="text-xs text-white/70 font-semibold">{comment.score}</span>
            </div>
          </div>
          <p className="text-sm text-white/90 whitespace-pre-wrap break-words">{comment.body}</p>
          {hasReplies && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mt-2 text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
              {collapsed ? 'Show' : 'Hide'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
        {hasReplies && !collapsed && (
          <div className="mt-2">
            {comment.replies.map(reply => (
              <Comment key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
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
              onClick={() => handlePostClick(post)}
              className="rounded-xl p-6 border-2 border-white/20 hover:border-primary-400 transition-all hover:shadow-xl hover:shadow-primary-500/20 cursor-pointer"
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
                  onClick={(e) => e.stopPropagation()}
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

      {/* Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-2 border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-white/20 p-6 flex items-start justify-between z-10">
              <div className="flex-1 pr-4">
                {selectedPost.linkFlairText && (
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${getFlairColor(selectedPost.linkFlairBackgroundColor)}`}
                    style={
                      selectedPost.linkFlairBackgroundColor && selectedPost.linkFlairBackgroundColor !== ''
                        ? { backgroundColor: selectedPost.linkFlairBackgroundColor, color: '#fff' }
                        : {}
                    }
                  >
                    {selectedPost.linkFlairText}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-white mb-3">{selectedPost.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>u/{selectedPost.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatTimeAgo(selectedPost.created)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4 text-green-400" />
                    <span className="font-semibold">{selectedPost.score}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold">{selectedPost.numComments}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-all"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
              {/* Post Content */}
              <div className="mb-8">
                {selectedPost.thumbnail && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={selectedPost.thumbnail}
                      alt={selectedPost.title}
                      className="w-full max-h-96 object-contain bg-slate-800"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                {selectedPost.selftext && selectedPost.selftext.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4 mb-6">
                    <p className="text-white/90 whitespace-pre-wrap break-words">{selectedPost.selftext}</p>
                  </div>
                )}
                <a
                  href={selectedPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all text-sm font-semibold"
                >
                  View Full Post on Reddit
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Comments Section */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  Comments ({selectedPost.numComments})
                </h3>

                {loadingComments ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                    <p className="text-white/70">Loading comments...</p>
                  </div>
                ) : commentsError ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                    <p className="text-red-400">{commentsError}</p>
                  </div>
                ) : postComments.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-white/50">No comments yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {postComments.map(comment => (
                      <Comment key={comment.id} comment={comment} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RedditFeed;
