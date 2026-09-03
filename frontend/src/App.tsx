import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Dashboard } from './pages/Dashboard';
import { User } from './types';

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '1092837465019-reachinboxsamplegoogleoauthclientid.apps.googleusercontent.com';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('reachinbox_theme');
    if (saved) return saved === 'dark';
    return false; // Default to crisp light theme matching Figma
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (darkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      body.style.backgroundColor = '#09090b';
      body.style.color = '#f4f4f5';
      localStorage.setItem('reachinbox_theme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      body.style.backgroundColor = '#ffffff';
      body.style.color = '#111827';
      localStorage.setItem('reachinbox_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('reachinbox_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('reachinbox_user');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className={darkMode ? 'dark bg-zinc-950 text-zinc-100 min-h-screen' : 'bg-white text-gray-900 min-h-screen'}>
        <Dashboard
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      </div>
    </GoogleOAuthProvider>
  );
};

export default App;
