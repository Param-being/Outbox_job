import React, { useState } from 'react';
import { ScheduledEmail } from '../types';
import { Search, Filter, RefreshCw, Star, Clock, ExternalLink, Moon, Sun } from 'lucide-react';
import { format } from 'date-fns';

interface EmailListViewProps {
  emails: ScheduledEmail[];
  activeTab: 'scheduled' | 'sent';
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: ScheduledEmail) => void;
  searchSource?: string | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  emails,
  activeTab,
  isLoading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectEmail,
  searchSource,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatScheduledBadgeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Pending';
    try {
      return format(new Date(dateStr), 'EEE h:mm:ss a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-screen ${
        darkMode ? 'bg-zinc-950 text-gray-100' : 'bg-white text-gray-900'
      } overflow-hidden transition-colors duration-200`}
    >
      {/* Top Header Bar with Search */}
      <div
        className={`p-4 px-6 border-b ${
          darkMode ? 'border-zinc-800/80' : 'border-gray-100'
        } flex items-center justify-between gap-4`}
      >
        {/* Search Input Bar */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-16 py-2 ${
              darkMode
                ? 'bg-zinc-900 text-gray-100 placeholder-zinc-500 border-zinc-800'
                : 'bg-[#F3F4F6] text-gray-900 placeholder-gray-400 border-transparent'
            } text-xs rounded-full border focus:border-emerald-500 focus:outline-none transition-all`}
          />
          {searchSource && (
            <span
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                darkMode
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {searchSource}
            </span>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className={`p-2 rounded-lg border ${
                darkMode
                  ? 'border-zinc-800 text-amber-400 hover:bg-zinc-800'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100'
              } transition-colors cursor-pointer`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={onRefresh}
            className={`p-2 rounded-lg ${
              darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
            title="Filter"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className={`p-2 rounded-lg ${
              darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email List Content Area */}
      <div
        className={`flex-1 overflow-y-auto divide-y ${
          darkMode ? 'divide-zinc-800/60' : 'divide-gray-100'
        }`}
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-4 animate-pulse">
                <div className={`w-32 h-4 ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded`} />
                <div className={`w-24 h-5 ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full`} />
                <div className={`flex-1 h-4 ${darkMode ? 'bg-zinc-800/60' : 'bg-gray-100'} rounded`} />
                <div className={`w-4 h-4 ${darkMode ? 'bg-zinc-800' : 'bg-gray-200'} rounded-full`} />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="py-24 text-center">
            <div
              className={`w-12 h-12 mx-auto mb-3 rounded-full ${
                darkMode ? 'bg-zinc-900 text-zinc-500' : 'bg-gray-100 text-gray-400'
              } flex items-center justify-center`}
            >
              <Clock className="w-6 h-6" />
            </div>
            <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              No {activeTab === 'scheduled' ? 'Scheduled' : 'Sent'} Emails Found
            </h3>
            <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-gray-400'} mt-1 max-w-sm mx-auto`}>
              {activeTab === 'scheduled'
                ? 'Click the Compose button on the left to schedule a new campaign.'
                : 'Sent emails will appear here along with their live Ethereal test preview links.'}
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const isStarred = starredIds.has(email?.id);
            const subject = email?.subject || email?.campaign?.subject || 'No Subject';
            const body = email?.body || email?.campaign?.body || '';
            const cleanBody = (body || '').replace(/<[^>]*>?/gm, '').replace(/\n/g, ' ');
            const recipientEmail = email?.recipientEmail || 'lead@example.com';
            const recipientName =
              recipientEmail.split('@')[0]?.replace('.', ' ')?.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Recipient';

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`flex items-center justify-between px-6 py-3.5 ${
                  darkMode
                    ? 'hover:bg-zinc-900/70 text-gray-100'
                    : 'hover:bg-gray-50/90 text-gray-900'
                } cursor-pointer transition-colors group`}
              >
                {/* Left: Recipient Name */}
                <div
                  className={`w-44 text-xs font-semibold ${
                    darkMode ? 'text-gray-200' : 'text-gray-900'
                  } truncate shrink-0`}
                >
                  To: {recipientName}
                </div>

                {/* Middle: Badge + Subject + Snippet */}
                <div className="flex-1 flex items-center gap-2.5 min-w-0 pr-4">
                  {/* Status Badge */}
                  {email.status === 'FAILED' ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        darkMode
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-900'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      } shrink-0`}
                      title={email.errorMessage || 'Failed to send'}
                    >
                      <span>Failed</span>
                    </span>
                  ) : email.status === 'DELAYED_RATE_LIMIT' ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        darkMode
                          ? 'bg-amber-950/50 text-amber-300 border border-amber-800'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      } shrink-0`}
                      title="Rescheduled due to hourly rate limit"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Rate Limited ({formatScheduledBadgeTime(email.scheduledAt)})</span>
                    </span>
                  ) : activeTab === 'scheduled' ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        darkMode
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-800/60'
                          : 'bg-[#FFF4EC] text-[#D97706] border border-[#FED7AA]'
                      } shrink-0`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{formatScheduledBadgeTime(email.scheduledAt)}</span>
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        darkMode
                          ? 'bg-zinc-800 text-gray-300'
                          : 'bg-gray-200 text-gray-700'
                      } shrink-0`}
                    >
                      Sent
                    </span>
                  )}

                  {/* Subject and Snippet */}
                  <div className="text-xs truncate flex items-center gap-1.5">
                    <span className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      {subject}
                    </span>
                    <span className={darkMode ? 'text-zinc-600' : 'text-gray-400'}>-</span>
                    <span className={`truncate ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {cleanBody}
                    </span>
                  </div>
                </div>

                {/* Right: Ethereal Link + Star */}
                <div className="flex items-center gap-3 shrink-0">
                  {email.etherealPreviewUrl && (
                    <a
                      href={email.etherealPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`p-1 rounded transition-colors ${
                        darkMode
                          ? 'text-emerald-400 hover:bg-emerald-950/50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title="Open Live Ethereal Preview"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={(e) => toggleStar(e, email.id)}
                    className="p-1 text-gray-300 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isStarred
                          ? 'fill-amber-400 text-amber-400'
                          : darkMode
                          ? 'text-zinc-700'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
