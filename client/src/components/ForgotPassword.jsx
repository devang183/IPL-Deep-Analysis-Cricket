import { useState } from 'react';
import { Activity, Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import CricketBackground from './CricketBackground';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Reset Password
          </h2>
          <p className="mt-2 text-base text-blue-200 font-medium drop-shadow-md">
            Enter your email to receive a password reset link
          </p>
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
                <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
                <p className="text-blue-200">
                  If an account exists for <span className="font-semibold text-white">{email}</span>, you will receive a password reset link shortly.
                </p>
              </div>
              <p className="text-sm text-blue-300">
                The link will expire in 1 hour. Check your spam folder if you don't see it.
              </p>
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
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in-down">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-wiggle" />
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm">Error</h4>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2 drop-shadow-lg">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-12 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                  />
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
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
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

export default ForgotPassword;
