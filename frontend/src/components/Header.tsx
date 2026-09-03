import React from 'react';
import { User } from '../types';
import { LogOut, Sliders, Activity, Mail, Slack, Sparkles } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenCompose,
  onOpenSlackModal,
}) => {
  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Mail className="w-5 h-5 text-brand-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">ReachInbox</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-full">
                Scheduler Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">BullMQ Distributed Email Engine</p>
          </div>
        </div>

        {/* Action Controls & Auth State */}
        {user ? (
          <div className="flex items-center flex-wrap gap-3">
            {/* BullMQ Live Dashboard Link */}
            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors"
              title="Open Live BullMQ Queue Monitoring Dashboard"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>BullMQ Queue Board</span>
            </a>

            {/* Slack Connection Button */}
            <button
              onClick={onOpenSlackModal}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                user.slackWebhookUrl
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700/80'
              }`}
            >
              <Slack className="w-3.5 h-3.5 text-purple-400" />
              <span>{user.slackWebhookUrl ? 'Slack Alert Active' : 'Connect Slack'}</span>
            </button>

            {/* Compose Campaign Button */}
            <button
              onClick={onOpenCompose}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 rounded-lg shadow-md shadow-brand-500/25 transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-brand-200" />
              <span>Compose Campaign</span>
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="flex items-center gap-2.5">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-brand-500/40 object-cover shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center font-bold text-xs text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">{user.name}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{user.email}</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};
