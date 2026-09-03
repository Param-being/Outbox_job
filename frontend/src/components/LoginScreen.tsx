import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { loginWithGoogleToken } from '../services/api';
import { User } from '../types';
import { AlertCircle, Moon, Sun } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  darkMode,
  onToggleDarkMode,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }
      setLoading(true);
      const data = await loginWithGoogleToken(credentialResponse.credential);
      if (data.success && data.user) {
        onLogin(data.user);
      } else {
        throw new Error('Google authentication failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both Email ID and Password to sign in.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const userName = trimmedEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    try {
      setLoading(true);
      const data = await loginWithGoogleToken('mock_token', {
        email: trimmedEmail,
        name: userName || 'User',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      });
      if (data.success && data.user) {
        onLogin(data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      const data = await loginWithGoogleToken('mock_token', {
        email: 'oliver.brown@domain.io',
        name: 'Oliver Brown',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      });
      if (data.success && data.user) {
        onLogin(data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'bg-zinc-950 text-gray-100' : 'bg-white text-gray-900'
      } flex flex-col justify-center items-center px-4 relative transition-colors duration-200 select-none`}
    >
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={onToggleDarkMode}
          className={`flex items-center gap-2 p-2 px-3.5 rounded-xl border ${
            darkMode
              ? 'border-zinc-800 bg-zinc-900 text-gray-200 hover:bg-zinc-800'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
          } transition-all text-xs font-medium cursor-pointer`}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-gray-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Main Login Card - Exact Figma Match */}
      <div
        className={`w-full max-w-[420px] ${
          darkMode
            ? 'bg-zinc-900 border-zinc-800 text-gray-100 shadow-2xl'
            : 'bg-white border-gray-200/80 text-gray-900 shadow-sm'
        } border rounded-2xl p-8 sm:p-10 space-y-6 transition-colors duration-200`}
      >
        <h1 className="text-2xl font-bold text-center tracking-tight">
          Login
        </h1>

        {error && (
          <div
            className={`flex items-center gap-2 p-3 ${
              darkMode ? 'bg-rose-950/60 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-600'
            } border rounded-xl text-xs animate-in fade-in duration-150`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Google OAuth Button */}
          <div className="flex justify-center w-full">
            <div className="w-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in popup failed or was cancelled.')}
                theme={darkMode ? 'filled_black' : 'outline'}
                shape="rectangular"
                width="340"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`} />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className={`px-3 ${darkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-white text-gray-400'}`}>
                or sign up through email
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <div>
              <input
                type="email"
                required
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 ${
                  darkMode
                    ? 'bg-zinc-800 text-white placeholder-zinc-500 border-zinc-700/50'
                    : 'bg-[#F3F4F6] text-gray-900 placeholder-gray-400 border-transparent'
                } text-xs rounded-xl border focus:border-emerald-500 focus:outline-none transition-all`}
              />
            </div>

            <div>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 ${
                  darkMode
                    ? 'bg-zinc-800 text-white placeholder-zinc-500 border-zinc-700/50'
                    : 'bg-[#F3F4F6] text-gray-900 placeholder-gray-400 border-transparent'
                } text-xs rounded-xl border focus:border-emerald-500 focus:outline-none transition-all`}
              />
            </div>

            {/* Standard Login Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#00AA4F] hover:bg-[#009243] text-white font-semibold text-xs rounded-xl shadow-sm transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          {/* Separate Dedicated Demo Login Button */}
          <div className={`pt-2 border-t ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className={`w-full py-2.5 px-4 ${
                darkMode
                  ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
              } border font-semibold text-xs rounded-xl transition-all flex items-center justify-center shadow-xs active:scale-98 disabled:opacity-50 cursor-pointer`}
            >
              <span>Quick Demo Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
