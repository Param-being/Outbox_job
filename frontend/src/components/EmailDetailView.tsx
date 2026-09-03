import React from 'react';
import { ScheduledEmail, User } from '../types';
import { ArrowLeft, Star, Folder, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface EmailDetailViewProps {
  email: ScheduledEmail;
  user: User;
  onBack: () => void;
  darkMode?: boolean;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  user,
  onBack,
  darkMode = false,
}) => {
  const subject = email.subject || email.campaign?.subject || 'No Subject';
  const body = email.body || email.campaign?.body || '';
  const senderEmail = email.senderEmail || email.campaign?.senderEmail || user.email || 'sender@example.com';
  const senderName = senderEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const displayTime = email.sentAt || email.scheduledAt;

  const formattedDate = displayTime
    ? format(new Date(displayTime), 'MMM d, h:mm a')
    : format(new Date(), 'MMM d, h:mm a');

  return (
    <div
      className={`flex-1 flex flex-col h-screen ${
        darkMode ? 'bg-zinc-950 text-gray-100' : 'bg-white text-gray-900'
      } overflow-hidden transition-colors duration-200`}
    >
      {/* Top Header Bar */}
      <div
        className={`p-4 px-6 border-b ${
          darkMode ? 'border-zinc-800/80' : 'border-gray-100'
        } flex items-center justify-between gap-4`}
      >
        {/* Back Arrow & Subject */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode
                ? 'text-gray-400 hover:text-gray-100 hover:bg-zinc-800'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold truncate">
            {subject}
          </h2>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode ? 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800' : 'text-gray-400 hover:text-amber-400 hover:bg-gray-100'
            }`}
          >
            <Star className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode ? 'text-zinc-500 hover:text-gray-200 hover:bg-zinc-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Folder className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode ? 'text-zinc-500 hover:text-rose-400 hover:bg-zinc-800' : 'text-gray-400 hover:text-rose-500 hover:bg-gray-100'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* User Profile Avatar */}
          <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 dark:border-zinc-700 ml-1">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Email Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3.5">
            {/* Green Initial Avatar */}
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              {senderName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span>{senderName}</span>
                <span className={darkMode ? 'text-zinc-500 font-normal' : 'text-gray-400 font-normal'}>
                  &lt;{senderEmail}&gt;
                </span>
              </div>
              <div className={`text-[11px] ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                to <span className="font-medium text-gray-700 dark:text-gray-300">{email.recipientEmail}</span>
              </div>
            </div>
          </div>

          <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-gray-400'} shrink-0`}>
            {formattedDate}
          </div>
        </div>

        {/* Delivery Failure Error Banner */}
        {email.status === 'FAILED' && (
          <div
            className={`p-3.5 border rounded-xl flex items-start gap-3 text-xs ${
              darkMode
                ? 'bg-rose-950/60 border-rose-900 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <div className="font-semibold shrink-0">Delivery Failed:</div>
            <div className="leading-relaxed">
              {email.errorMessage || 'SMTP Mail Delivery Failed: 550 5.1.1 Recipient mailbox unavailable'}
            </div>
          </div>
        )}

        {/* Ethereal Live Test Preview Banner */}
        {email.etherealPreviewUrl && (
          <div
            className={`p-3 border rounded-xl flex items-center justify-between text-xs ${
              darkMode
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="font-medium">
              Live Ethereal SMTP rendered message is available for this email.
            </div>
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <span>View Test Email</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Formatted Actual Composed Body Only */}
        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {body || '(No body content provided)'}
        </div>
      </div>
    </div>
  );
};
