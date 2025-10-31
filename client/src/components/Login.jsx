import { useState } from 'react';
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login({ onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.message);
    }
    // If successful, the AuthContext will handle the state update
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animated-gradient">
      {/* Cricket-themed background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute top-10 left-10 text-primary-300 animate-float">
          <Trophy className="w-32 h-32" />
        </div>
        <div className="absolute bottom-10 right-10 text-primary-300 animate-float" style={{animationDelay: '1s'}}>
          <Activity className="w-40 h-40" />
        </div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center animate-fade-in-down">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-12 h-12 text-primary-600 animate-bounce-subtle" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              IPL Analytics
            </h1>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-slate-800">
            Welcome Back!
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access advanced cricket analytics
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 animate-scale-in hover:shadow-3xl transition-shadow duration-300">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-fade-in-down">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-wiggle" />
                <div>
                  <h4 className="font-semibold text-red-800 text-sm">Login Failed</h4>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
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

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-12 py-3 border border-slate-300 rounded-lg placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
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
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="text-lg">🏏</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">New to IPL Analytics?</span>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full text-center py-3 px-4 border-2 border-primary-600 rounded-lg text-sm font-semibold text-primary-600 hover:bg-primary-50 transition-all"
            >
              Create New Account
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600">
          <p className="flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span>Unlock player insights, match predictions & more</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
