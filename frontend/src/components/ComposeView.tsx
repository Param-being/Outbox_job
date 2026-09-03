import React, { useState } from 'react';
import { ScheduleCampaignPayload, User } from '../types';
import { LeadUploader } from './LeadUploader';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Undo2,
  Redo2,
  AlertCircle,
  FileSpreadsheet,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Outdent,
  Indent,
  Quote,
  Code,
  Strikethrough,
} from 'lucide-react';

interface ComposeViewProps {
  user: User;
  onBack: () => void;
  onSchedule: (payload: ScheduleCampaignPayload) => Promise<void>;
  darkMode?: boolean;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  user,
  onBack,
  onSchedule,
  darkMode = false,
}) => {
  const [fromEmail, setFromEmail] = useState(user.email || 'oliver.brown@domain.io');
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [leads, setLeads] = useState<string[]>([]);
  const [showLeadDropzone, setShowLeadDropzone] = useState(false);

  // Send Later Popover State
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [isCustomScheduled, setIsCustomScheduled] = useState(false);
  const [scheduledStartTime, setScheduledStartTime] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper for preset times
  const setPresetTime = (hours: number, minutes = 0) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);
    setScheduledStartTime(tomorrow.toISOString().slice(0, 16));
    setIsCustomScheduled(true);
  };

  const handleSend = async () => {
    setError(null);

    // Collect recipient leads from To input field
    let combinedLeads = [...leads];
    if (toInput.trim()) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matched = toInput.match(emailRegex) || [];
      combinedLeads = Array.from(new Set([...combinedLeads, ...matched.map((m) => m.toLowerCase())]));
      if (matched.length === 0 && toInput.includes('@')) {
        combinedLeads.push(toInput.trim().toLowerCase());
      }
    }

    if (!subject.trim()) {
      setError('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setError('Please enter email body content.');
      return;
    }

    if (combinedLeads.length === 0) {
      setError('Please enter at least one recipient email or upload a leads file.');
      return;
    }

    try {
      setSubmitting(true);
      const targetStartTime = isCustomScheduled
        ? new Date(scheduledStartTime).toISOString()
        : new Date().toISOString(); // Instant send if user didn't explicitly schedule later

      await onSchedule({
        title: subject,
        senderEmail: fromEmail,
        subject,
        body,
        startTime: targetStartTime,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
        leads: combinedLeads,
      });
      onBack();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to schedule email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col h-screen ${
        darkMode ? 'bg-zinc-950 text-gray-100' : 'bg-white text-gray-900'
      } overflow-hidden relative transition-colors duration-200`}
    >
      {/* Top Header Bar */}
      <div
        className={`p-4 px-6 border-b ${
          darkMode ? 'border-zinc-800/80' : 'border-gray-100'
        } flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode
                ? 'text-gray-400 hover:text-gray-100 hover:bg-zinc-800'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold">
            Compose New Email
          </h2>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 relative">
          <button
            type="button"
            onClick={() => setShowLeadDropzone(!showLeadDropzone)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              showLeadDropzone
                ? darkMode
                  ? 'bg-emerald-950/60 text-emerald-400'
                  : 'bg-emerald-50 text-emerald-600'
                : darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Upload CSV / TXT Leads"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            type="button"
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Attach File"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Clock Icon: Toggles Send Later Popover */}
          <button
            type="button"
            onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isSendLaterOpen
                ? darkMode
                  ? 'bg-emerald-950/60 text-emerald-400'
                  : 'bg-emerald-50 text-emerald-600'
                : darkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-zinc-800'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Schedule / Send Later"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={submitting}
            className={`px-6 py-1.5 rounded-full border border-emerald-600 text-emerald-600 font-semibold text-xs tracking-wide ${
              darkMode
                ? 'hover:bg-emerald-950/40 text-emerald-400 border-emerald-500'
                : 'hover:bg-emerald-50'
            } transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer`}
          >
            {submitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Floating Send Later Popover (Figma Exact Match) */}
      {isSendLaterOpen && (
        <div
          className={`absolute top-16 right-6 z-50 w-72 border rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-zinc-900 border-zinc-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <h3 className="text-xs font-bold">
            Send Later
          </h3>

          {/* Date Picker Input */}
          <div className="relative">
            <input
              type="datetime-local"
              value={scheduledStartTime}
              onChange={(e) => {
                setScheduledStartTime(e.target.value);
                setIsCustomScheduled(true);
              }}
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-emerald-500 ${
                darkMode
                  ? 'bg-zinc-800 border-zinc-700 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>

          {/* Preset Buttons */}
          <div className={`space-y-1.5 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <button
              type="button"
              onClick={() => setPresetTime(9, 0)}
              className={`w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setPresetTime(10, 0)}
              className={`w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
              }`}
            >
              Tomorrow, 10:00 AM
            </button>
            <button
              type="button"
              onClick={() => setPresetTime(11, 0)}
              className={`w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
              }`}
            >
              Tomorrow, 11:00 AM
            </button>
            <button
              type="button"
              onClick={() => setPresetTime(15, 0)}
              className={`w-full text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
              }`}
            >
              Tomorrow, 3:00 PM
            </button>
          </div>

          {/* Popover Actions */}
          <div className={`flex items-center justify-end gap-3 pt-2 border-t ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(false)}
              className={`text-xs font-medium transition-colors cursor-pointer ${
                darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsSendLaterOpen(false)}
              className="px-4 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-600 dark:border-emerald-500 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Main Compose Form Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-4">
        {error && (
          <div
            className={`flex items-center gap-2 p-3 border rounded-xl text-xs ${
              darkMode ? 'bg-rose-950/60 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* From Field */}
        <div className={`flex items-center gap-4 py-1 border-b ${darkMode ? 'border-zinc-800/80' : 'border-gray-100'}`}>
          <span className={`text-xs font-medium w-16 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>From</span>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              darkMode ? 'bg-zinc-800 text-gray-200' : 'bg-gray-100 text-gray-800'
            }`}
          >
            <span>{fromEmail}</span>
            <span className={darkMode ? 'text-zinc-500' : 'text-gray-400'}>⌄</span>
          </div>
        </div>

        {/* To Field */}
        <div className={`flex items-center gap-4 py-1 border-b ${darkMode ? 'border-zinc-800/80' : 'border-gray-100'}`}>
          <span className={`text-xs font-medium w-16 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>To</span>
          <input
            type="text"
            placeholder="recipient@example.com (or multiple comma separated)"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className={`flex-1 py-1 bg-transparent text-xs ${
              darkMode ? 'text-white placeholder-zinc-500' : 'text-gray-900 placeholder-gray-400'
            } focus:outline-none`}
          />
        </div>

        {/* Lead Dropzone Option */}
        {showLeadDropzone && (
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
            <LeadUploader onLeadsParsed={(emails) => setLeads(emails)} parsedLeadsCount={leads.length} />
          </div>
        )}

        {/* Subject Field */}
        <div className={`flex items-center gap-4 py-1 border-b ${darkMode ? 'border-zinc-800/80' : 'border-gray-100'}`}>
          <span className={`text-xs font-medium w-16 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Subject</span>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={`flex-1 py-1 bg-transparent text-xs ${
              darkMode ? 'text-white placeholder-zinc-500' : 'text-gray-900 placeholder-gray-400'
            } focus:outline-none font-medium`}
          />
        </div>

        {/* Inline Delay & Hourly Limit Inputs (Figma Exact Match) */}
        <div className="flex items-center gap-6 py-2">
          <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <span>Delay between 2 emails</span>
            <input
              type="number"
              min="0"
              max="3600"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
              className={`w-16 px-2.5 py-1 text-center rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500 ${
                darkMode
                  ? 'bg-zinc-800 border border-zinc-700 text-white'
                  : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
            />
            <span className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>sec</span>
          </div>

          <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <span>Hourly Limit</span>
            <input
              type="number"
              min="1"
              max="10000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
              className={`w-16 px-2.5 py-1 text-center rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-500 ${
                darkMode
                  ? 'bg-zinc-800 border border-zinc-700 text-white'
                  : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
            />
            <span className={`text-[10px] ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>emails/hr</span>
          </div>
        </div>

        {/* Text Area & Formatting Bar */}
        <div className="pt-2">
          <textarea
            rows={10}
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`w-full p-2 bg-transparent text-xs ${
              darkMode ? 'text-white placeholder-zinc-500' : 'text-gray-900 placeholder-gray-400'
            } focus:outline-none resize-none leading-relaxed`}
          />

          {/* Formatting Toolbar (Figma Exact Match) */}
          <div
            className={`flex items-center flex-wrap gap-1 p-2 border-t text-xs ${
              darkMode ? 'border-zinc-800 text-zinc-400' : 'border-gray-100 text-gray-500'
            }`}
          >
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Undo2 className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Redo2 className="w-3.5 h-3.5" /></button>
            <span className={`w-px h-4 mx-1 ${darkMode ? 'bg-zinc-700' : 'bg-gray-200'}`} />
            <button type="button" className={`p-1.5 rounded font-serif font-bold text-xs cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}>Tt ⌄</button>
            <span className={`w-px h-4 mx-1 ${darkMode ? 'bg-zinc-700' : 'bg-gray-200'}`} />
            <button type="button" className={`p-1.5 rounded font-bold text-xs cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}>B</button>
            <button type="button" className={`p-1.5 rounded italic text-xs cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}>I</button>
            <button type="button" className={`p-1.5 rounded underline text-xs cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}>U</button>
            <span className={`w-px h-4 mx-1 ${darkMode ? 'bg-zinc-700' : 'bg-gray-200'}`} />
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><AlignLeft className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><AlignCenter className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><AlignRight className="w-3.5 h-3.5" /></button>
            <span className={`w-px h-4 mx-1 ${darkMode ? 'bg-zinc-700' : 'bg-gray-200'}`} />
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><List className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><ListOrdered className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Outdent className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Indent className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Quote className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Code className="w-3.5 h-3.5" /></button>
            <button type="button" className={`p-1.5 rounded cursor-pointer ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}><Strikethrough className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
