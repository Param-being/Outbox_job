import React, { useState } from 'react';
import { User } from '../types';
import { Clock, Send, ChevronDown, Moon, Sun, Slack, Activity, LogOut, Check } from 'lucide-react';

interface SidebarProps {
  user: User;
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  onLogout: () => void;
  scheduledCount: number;
  sentCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  onOpenSlackModal,
  onLogout,
  scheduledCount,
  sentCount,
  darkMode,
  onToggleDarkMode,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <aside
      className={`w-64 border-r ${
        darkMode
          ? 'border-zinc-800 bg-zinc-900 text-gray-100'
          : 'border-gray-100 bg-white text-gray-900'
      } flex flex-col h-screen shrink-0 transition-colors duration-200 select-none`}
    >
      {/* Top Logo: ONB */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <span className={`text-2xl font-black tracking-wider ${darkMode ? 'text-white' : 'text-black'} font-mono`}>
            ONB
          </span>
          <button
            onClick={onToggleDarkMode}
            className={`p-1.5 rounded-xl border ${
              darkMode
                ? 'border-zinc-700 bg-zinc-800 text-amber-400 hover:bg-zinc-700'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
      </div>

      {/* User Profile Card with Dropdown */}
      <div className="px-5 mb-5 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full flex items-center justify-between p-2 rounded-xl border ${
            darkMode
              ? 'bg-zinc-800/80 border-zinc-700 hover:bg-zinc-800'
              : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
          } transition-colors text-left cursor-pointer`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className={`text-xs font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'} truncate`}>
                {user.name || 'User'}
              </div>
              <div className="text-[10px] text-gray-400 truncate">
                {user.email}
              </div>
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div
            className={`absolute left-5 right-5 top-full mt-1.5 z-40 ${
              darkMode
                ? 'bg-zinc-800 border-zinc-700 text-gray-200'
                : 'bg-white border-gray-100 text-gray-700'
            } border rounded-xl shadow-xl py-1.5 text-xs animate-in fade-in duration-100`}
          >
            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2 px-3.5 py-2 ${
                darkMode ? 'hover:bg-zinc-700/60' : 'hover:bg-gray-50'
              } transition-colors`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>BullMQ Queue Board</span>
            </a>

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                onOpenSlackModal();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 ${
                darkMode ? 'hover:bg-zinc-700/60' : 'hover:bg-gray-50'
              } transition-colors text-left cursor-pointer`}
            >
              <div className="flex items-center gap-2">
                <Slack className="w-3.5 h-3.5 text-purple-500" />
                <span>Slack Integration</span>
              </div>
              {user.slackWebhookUrl && <Check className="w-3 h-3 text-emerald-500" />}
            </button>

            <div className={`border-t ${darkMode ? 'border-zinc-700' : 'border-gray-100'} my-1`} />

            <button
              onClick={() => {
                setIsDropdownOpen(false);
                onLogout();
              }}
              className={`w-full flex items-center gap-2 px-3.5 py-2 text-rose-500 ${
                darkMode ? 'hover:bg-rose-950/30' : 'hover:bg-rose-50'
              } transition-colors text-left font-medium cursor-pointer`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-5 mb-6">
        <button
          onClick={onOpenCompose}
          className={`w-full py-2.5 px-4 rounded-full border border-emerald-600 text-emerald-600 ${
            darkMode
              ? 'hover:bg-emerald-950/40 text-emerald-400 border-emerald-500'
              : 'hover:bg-emerald-50'
          } font-semibold text-xs tracking-wide transition-all flex items-center justify-center shadow-sm active:scale-95 cursor-pointer`}
        >
          <span>Compose</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 space-y-1">
        <div className={`text-[11px] font-bold ${darkMode ? 'text-zinc-500' : 'text-gray-400'} uppercase tracking-wider px-3 mb-2`}>
          CORE
        </div>

        {/* Scheduled Tab */}
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs transition-all cursor-pointer ${
            activeTab === 'scheduled'
              ? darkMode
                ? 'bg-emerald-950/50 text-emerald-300 font-semibold'
                : 'bg-emerald-50 text-emerald-800 font-semibold'
              : darkMode
              ? 'text-gray-300 hover:bg-zinc-800/60 font-medium'
              : 'text-gray-600 hover:bg-gray-50 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-emerald-500' : 'text-gray-400'}`} />
            <span>Scheduled</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'scheduled'
                ? darkMode
                  ? 'bg-emerald-900/60 text-emerald-200'
                  : 'bg-emerald-100/80 text-emerald-900'
                : darkMode
                ? 'text-zinc-500'
                : 'text-gray-400'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        {/* Sent Tab */}
        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs transition-all cursor-pointer ${
            activeTab === 'sent'
              ? darkMode
                ? 'bg-emerald-950/50 text-emerald-300 font-semibold'
                : 'bg-emerald-50 text-emerald-800 font-semibold'
              : darkMode
              ? 'text-gray-300 hover:bg-zinc-800/60 font-medium'
              : 'text-gray-600 hover:bg-gray-50 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-emerald-500' : 'text-gray-400'}`} />
            <span>Sent</span>
          </div>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              activeTab === 'sent'
                ? darkMode
                  ? 'bg-emerald-900/60 text-emerald-200'
                  : 'bg-emerald-100/80 text-emerald-900'
                : darkMode
                ? 'text-zinc-500'
                : 'text-gray-400'
            }`}
          >
            {sentCount}
          </span>
        </button>
      </nav>

      {/* Footer Info */}
      <div className={`p-4 border-t ${darkMode ? 'border-zinc-800/80' : 'border-gray-100'} text-center`}>
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
        >
          <Activity className="w-3 h-3 animate-pulse" />
          <span>BullMQ Engine Live</span>
        </a>
      </div>
    </aside>
  );
};
