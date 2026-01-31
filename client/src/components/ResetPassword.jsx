import { useState, useEffect } from 'react';
import { Activity, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import CricketBackground from './CricketBackground';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function ResetPassword({ onBackToLogin }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get token and email from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const emailParam = urlParams.get('email');

    if (tokenParam) setToken(tokenParam);
    if (emailParam) setEmail(decodeURIComponent(emailParam));

    if (!tokenParam || !emailParam) {
      setError('Invalid password reset link. Please request a new one.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidLink = token && email && !error.includes('Invalid password reset link');

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Cricket Background */}
      <CricketBackground />

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center animate-fade-in-down">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-yellow-400 animate-bounce-subtle drop-shadow-lg" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-xl">
              IPL Analytics
            </h1>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white drop-shadow-lg">
            {success ? 'Password Reset!' : 'Create New Password'}
          </h2>
          {!success && isValidLink && (
            <p className="mt-2 text-base text-blue-200 font-medium drop-shadow-md">
              Enter your new password for <span className="text-white font-semibold">{email}</span>
            </p>
          )}
        </div>

        {/* Card */}
        <div className="rounded-2xl shadow-2xl p-8 border-2 border-white/30 animate-scale-in hover:shadow-blue-500/50 hover:shadow-3xl transition-all duration-300"
             style={{background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'}}>

          {success ? (
            /* Success Message */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-scale-in">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Password Updated Successfully!</h3>
                <p className="text-blue-200">
                  Your password has been reset. You can now sign in with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all"
              >
                Sign In Now
              </button>
            </div>
          ) : !isValidLink ? (
            /* Invalid Link Message */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center animate-scale-in">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Invalid Reset Link</h3>
                <p className="text-blue-200">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>
              </div>
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-white/30 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          ) : (
            /* Form */
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && !error.includes('Invalid password reset link') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in-down">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-wiggle" />
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm">Error</h4>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-2 drop-shadow-lg">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-12 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-blue-300">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white mb-2 drop-shadow-lg">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-12 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Confirm new password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Reset Password</span>
                )}
              </button>

              {/* Back to Login */}
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-white/30 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
