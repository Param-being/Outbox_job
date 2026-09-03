import React from 'react';
import { ScheduledEmail, EmailStatus } from '../types';
import { Mail, Clock, CheckCircle2, AlertTriangle, ExternalLink, RefreshCw, XCircle, Send } from 'lucide-react';
import { format } from 'date-fns';

interface EmailTableProps {
  emails: ScheduledEmail[];
  isLoading: boolean;
  type: 'scheduled' | 'sent';
}

export const EmailTable: React.FC<EmailTableProps> = ({
  emails,
  isLoading,
  type,
}) => {
  const getStatusBadge = (status: EmailStatus, reschedCount = 0) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 rounded-full">
            <Clock className="w-3 h-3" />
            Scheduled
          </span>
        );
      case 'DELAYED_RATE_LIMIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded-full" title="Rescheduled due to hourly rate limit capacity">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Delayed ({reschedCount > 0 ? `${reschedCount}x` : 'Rate Limit'})
          </span>
        );
      case 'SENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-sky-950/60 text-sky-300 border border-sky-800/60 rounded-full">
            <Send className="w-3 h-3 animate-pulse" />
            Sending...
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60 rounded-full">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy • hh:mm:ss a');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-slate-900/60 border border-slate-800/60 rounded-xl animate-pulse flex items-center justify-between px-4">
            <div className="w-1/4 h-4 bg-slate-800 rounded" />
            <div className="w-1/3 h-4 bg-slate-800 rounded" />
            <div className="w-1/6 h-4 bg-slate-800 rounded" />
            <div className="w-20 h-6 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <Mail className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-300">No {type === 'scheduled' ? 'Scheduled' : 'Sent'} Emails Found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {type === 'scheduled'
            ? 'Compose a new email campaign above to queue delayed jobs in BullMQ.'
            : 'Sent emails will appear here along with their live Ethereal test preview links.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <th className="py-3.5 px-6">Recipient Email</th>
            <th className="py-3.5 px-6">Subject</th>
            <th className="py-3.5 px-6">
              {type === 'scheduled' ? 'Target Scheduled Time' : 'Sent Timestamp'}
            </th>
            <th className="py-3.5 px-6">Status</th>
            <th className="py-3.5 px-6 text-right">Actions / Link</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-xs">
          {emails.map((email) => {
            const displaySubject = email.subject || email.campaign?.subject || 'No Subject';
            const displayTime = type === 'scheduled' ? email.scheduledAt : (email.sentAt || email.scheduledAt);

            return (
              <tr key={email.id} className="hover:bg-slate-900/40 transition-colors group">
                {/* Recipient */}
                <td className="py-4 px-6 font-semibold text-slate-100">
                  {email.recipientEmail}
                </td>

                {/* Subject */}
                <td className="py-4 px-6 text-slate-300 max-w-xs truncate" title={displaySubject}>
                  {displaySubject}
                </td>

                {/* Time */}
                <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                  {formatTimestamp(displayTime)}
                </td>

                {/* Status */}
                <td className="py-4 px-6 whitespace-nowrap">
                  {getStatusBadge(email.status, email.rescheduledCount)}
                </td>

                {/* Actions / Ethereal Preview Button */}
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  {email.etherealPreviewUrl ? (
                    <a
                      href={email.etherealPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-brand-300 bg-brand-950/60 hover:bg-brand-900/60 border border-brand-800/60 rounded-lg transition-colors shadow-sm"
                    >
                      <span>View Test Email</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : email.errorMessage ? (
                    <span className="text-rose-400 text-[11px]" title={email.errorMessage}>
                      {email.errorMessage}
                    </span>
                  ) : (
                    <span className="text-slate-600 text-[11px]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
