import React, { useState } from 'react';
import { X, Slack, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { updateSlackWebhook, testSlackWebhook } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  currentWebhookUrl?: string;
  onClose: () => void;
  onSuccess: (newWebhookUrl: string) => void;
  darkMode?: boolean;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  currentWebhookUrl = '',
  onClose,
  onSuccess,
  darkMode = false,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      setLoading(true);
      const res = await updateSlackWebhook(webhookUrl);
      setMessage({ type: 'success', text: 'Slack Webhook URL saved successfully!' });
      onSuccess(res.slackWebhookUrl);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Failed to save Slack webhook' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setMessage(null);
    try {
      setTesting(true);
      await testSlackWebhook();
      setMessage({ type: 'success', text: 'Live test notification dispatched to your Slack channel!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Slack test notification failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-lg ${
          darkMode ? 'bg-zinc-900 border-zinc-800 text-gray-100 shadow-2xl' : 'bg-white border-gray-200 text-gray-900 shadow-2xl'
        } border rounded-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-gray-100 bg-white'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Slack className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Connect Slack Integration</h2>
              <p className={`text-xs ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Receive live alerts when hourly rate limits are hit</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium border ${
                message.type === 'success'
                  ? darkMode
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : darkMode
                  ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-zinc-300' : 'text-gray-700'}`}>
              Slack Incoming Webhook URL
            </label>
            <input
              type="url"
              required
              placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-emerald-500 transition-colors ${
                darkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
            <p className={`text-[11px] mt-1.5 leading-relaxed ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
              Create an Incoming Webhook in your Slack workspace and paste the URL here.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 gap-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !webhookUrl}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer disabled:opacity-40 ${
                darkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-purple-500" />
              <span>{testing ? 'Sending Test...' : 'Test Notification'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                  darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-[#00AA4F] hover:bg-[#009243] text-white font-semibold text-xs rounded-xl shadow-sm transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Saving...' : 'Save Webhook'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
